const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { generateOcId, resolveCountryCode } = require('../utils/ocIdGenerator');
const { assignPath } = require('../services/pathAssigner');
const { matchAndMerge } = require('../services/personMatcher');

const PERSON_UPLOADS_DIR = path.join(__dirname, '../../uploads/persons');

// 사이트 접근 권한 확인 (owner 또는 member)
async function checkSiteAccess(userId, siteId) {
    const { rows } = await db.query(
        `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2
         UNION
         SELECT site_id AS id FROM site_members WHERE site_id = $1 AND user_id = $2`,
        [siteId, userId]
    );
    return rows.length > 0;
}

// GET /api/persons/:siteId
// siteId = family_sites.id(정수) 또는 subdomain(문자열) 모두 수용
exports.listPersons = async (req, res) => {
    try {
        const { siteId } = req.params;

        // siteId 정수 or subdomain 문자열 → site 레코드 확정
        let siteIntId, subdomain;
        if (!isNaN(siteId)) {
            const { rows } = await db.query(
                `SELECT id, subdomain FROM family_sites WHERE id = $1`, [siteId]
            );
            if (!rows[0]) return res.status(404).json({ success: false, message: 'Site not found' });
            siteIntId = rows[0].id;
            subdomain = rows[0].subdomain;
        } else {
            const { rows } = await db.query(
                `SELECT id, subdomain FROM family_sites WHERE subdomain = $1`, [siteId]
            );
            if (!rows[0]) return res.status(404).json({ success: false, message: 'Site not found' });
            siteIntId = rows[0].id;
            subdomain = rows[0].subdomain;
        }

        // 인물 조회 (site_id 기반 — 기존 스키마 호환)
        const { rows: persons } = await db.query(
            `SELECT p.id, p.person_id, p.oc_id, p.name, p.gender,
                    p.birth_date, p.birth_year, p.death_date, p.death_year,
                    p.is_deceased, p.birth_lunar, p.death_lunar,
                    p.bio1, p.bio2, p.bio3, p.biography,
                    p.photo_url, p.photo_position, p.match_status,
                    p.parent1_id, p.parent2_id, p.spouse_id,
                    p.privacy_level, p.generation, p.created_at
             FROM persons p
             WHERE p.site_id = $1
             ORDER BY p.id ASC`,
            [siteIntId]
        );

        // person_relations에서 최신 관계 조회 (정규화 테이블 우선)
        const personIntIds = persons.map(p => p.id);
        let relations = [];
        if (personIntIds.length > 0) {
            const { rows } = await db.query(
                `SELECT person1_id, person2_id, relation_type
                 FROM person_relations
                 WHERE site_id = $1
                   AND (person1_id = ANY($2) OR person2_id = ANY($2))
                   AND is_active = TRUE`,
                [siteIntId, personIntIds]
            );
            relations = rows;
        }

        // OPS path 조회 (person_paths 테이블이 있는 경우)
        let pathMap = new Map();
        try {
            const personVarIds = persons.map(p => p.person_id || p.oc_id).filter(Boolean);
            if (personVarIds.length > 0) {
                const { rows: pathRows } = await db.query(
                    `SELECT person_id, path FROM person_paths WHERE person_id = ANY($1) AND is_canonical = TRUE`,
                    [personVarIds]
                );
                pathRows.forEach(r => pathMap.set(r.person_id, r.path));
            }
        } catch { /* person_paths 없으면 무시 */ }

        // 프론트엔드 호환 필드 파생
        const idMap = new Map(persons.map(p => [p.id, p]));
        for (const person of persons) {
            const intId = person.id;
            const varId = person.person_id || person.oc_id;

            // person_relations에서 부모/배우자 보완 (persons 직접 컬럼과 병합)
            const parentRels = relations.filter(
                r => r.relation_type === 'parent' && r.person2_id === intId
            );
            if (parentRels.length > 0) {
                const sortedParents = parentRels.map(r => ({
                    id: r.person1_id,
                    gender: idMap.get(r.person1_id)?.gender,
                })).sort((a, b) => {
                    if (a.gender === 'male' && b.gender !== 'male') return -1;
                    if (a.gender !== 'male' && b.gender === 'male') return 1;
                    return 0;
                });
                person.parent1_id = person.parent1_id || sortedParents[0]?.id || null;
                person.parent2_id = person.parent2_id || sortedParents[1]?.id || null;
            }

            const spouseRel = relations.find(r =>
                r.relation_type === 'spouse' && (r.person1_id === intId || r.person2_id === intId)
            );
            if (spouseRel) {
                person.spouse_id = person.spouse_id ||
                    (spouseRel.person1_id === intId ? spouseRel.person2_id : spouseRel.person1_id);
            }

            // OPS path
            if (varId) person.ops_path = pathMap.get(varId) || null;

            // 프론트엔드 호환 alias (oc_id / person_id 통일)
            person.oc_id      = varId || String(intId);
            person.person_id  = varId || String(intId);
        }

        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.json({ success: true, data: persons });
    } catch (err) {
        console.error('listPersons error:', err);
        res.status(500).json({ success: false, message: 'Failed to list persons' });
    }
};

// POST /api/persons/:siteId
exports.createPerson = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar, photo_position } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        // persons 테이블에 INSERT (과도기: 컬럼도 유지)
        const { rows } = await db.query(
            `INSERT INTO persons (site_id, name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar, photo_position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING *`,
            [siteId, name, birth_year || null, death_year || null, gender || null, privacy_level || 'family', parent1_id || null, parent2_id || null, spouse_id || null, generation || 0, photo_url || null, birth_date || null, death_date || null, is_deceased ?? false, birth_lunar ?? false, death_lunar ?? false, photo_position ? JSON.stringify(photo_position) : '{"x":50,"y":50}']
        );

        const newPerson = rows[0];
        const newPersonId = newPerson.id;

        // 개인 폴더 자동 생성 (§19)
        try {
            const personDir = path.join(PERSON_UPLOADS_DIR, String(newPersonId));
            fs.mkdirSync(personDir, { recursive: true });
        } catch (e) {
            console.error('person folder creation failed:', e.message);
        }

        // oc_id 자동 부여
        try {
            const lang = req.headers['accept-language'] || '';
            const geo = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '';
            const countryCode = resolveCountryCode(lang, geo);
            const ocId = await generateOcId(db, countryCode);
            await db.query('UPDATE persons SET oc_id = $1 WHERE id = $2', [ocId, newPersonId]);
            newPerson.oc_id = ocId;
        } catch (err) {
            console.error('oc_id generation failed:', err.message);
        }

        // person_relations에 parent 관계 기록 (정본)
        if (parent1_id) {
            await db.query(
                `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                 VALUES ($1, $2, $3, 'parent', true)
                 ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                [siteId, parent1_id, newPersonId]
            );
        }
        if (parent2_id) {
            await db.query(
                `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                 VALUES ($1, $2, $3, 'parent', true)
                 ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                [siteId, parent2_id, newPersonId]
            );
        }

        // person_relations에 spouse 관계 기록 (정본, LEAST/GREATEST 정규화)
        if (spouse_id) {
            await db.query(
                `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                 VALUES ($1, $2, $3, 'spouse', true)
                 ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                [siteId, Math.min(newPersonId, spouse_id), Math.max(newPersonId, spouse_id)]
            );
        }

        res.status(201).json({ success: true, data: newPerson });
    } catch (err) {
        console.error('createPerson error:', err);
        res.status(500).json({ success: false, message: 'Failed to create person' });
    }
};

// PUT /api/persons/:siteId/:personId
// Dynamic SET: 요청에 포함된 필드만 업데이트 (미포함 필드는 기존 값 유지)
exports.updatePerson = async (req, res) => {
    try {
        const { siteId, personId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const ALLOWED = [
            'name', 'maiden_name', 'former_name', 'birth_year', 'death_year', 'gender', 'privacy_level',
            'parent1_id', 'parent2_id', 'spouse_id', 'generation',
            'photo_url', 'birth_date', 'death_date',
            'is_deceased', 'birth_lunar', 'death_lunar', 'photo_position', 'biography',
            'bio1', 'bio2', 'bio3',
        ];

        const setClauses = [];
        const values = [];
        let idx = 1;

        for (const key of ALLOWED) {
            if (key in req.body) {
                setClauses.push(`${key} = $${idx}`);
                values.push(req.body[key] ?? null);
                idx++;
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(personId, siteId);

        const { rows } = await db.query(
            `UPDATE persons SET ${setClauses.join(', ')}
             WHERE id = $${idx} AND site_id = $${idx + 1}
             RETURNING *`,
            values
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Person not found' });
        }

        // person_relations 동기화: parent 변경
        if ('parent1_id' in req.body) {
            // 기존 parent 관계 중 하나를 교체 (person2_id=자녀)
            await db.query(
                `DELETE FROM person_relations
                 WHERE site_id = $1 AND person2_id = $2 AND relation_type = 'parent'
                   AND person1_id NOT IN (
                     SELECT COALESCE($3::int, 0)
                     UNION SELECT COALESCE((SELECT parent2_id FROM persons WHERE id = $2), 0)
                   )`,
                [siteId, personId, req.body.parent1_id]
            );
            if (req.body.parent1_id) {
                await db.query(
                    `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                     VALUES ($1, $2, $3, 'parent', true)
                     ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                    [siteId, req.body.parent1_id, personId]
                );
            }
        }
        if ('parent2_id' in req.body) {
            if (req.body.parent2_id) {
                await db.query(
                    `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                     VALUES ($1, $2, $3, 'parent', true)
                     ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                    [siteId, req.body.parent2_id, personId]
                );
            }
        }

        // person_relations 동기화: spouse 변경
        if ('spouse_id' in req.body) {
            const newSpouseId = req.body.spouse_id;

            // 기존 spouse 관계 삭제 (이 인물이 포함된 모든 spouse)
            await db.query(
                `DELETE FROM person_relations
                 WHERE site_id = $1 AND relation_type = 'spouse'
                   AND (person1_id = $2 OR person2_id = $2)`,
                [siteId, personId]
            );

            if (newSpouseId) {
                // 새 spouse 관계 추가 (LEAST/GREATEST 정규화)
                await db.query(
                    `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
                     VALUES ($1, $2, $3, 'spouse', true)
                     ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
                    [siteId, Math.min(parseInt(personId), newSpouseId), Math.max(parseInt(personId), newSpouseId)]
                );
                // 과도기: 상대방 persons.spouse_id도 동기화
                await db.query(
                    `UPDATE persons SET spouse_id = $1 WHERE id = $2 AND site_id = $3`,
                    [personId, newSpouseId, siteId]
                );
            } else {
                // 과도기: 이전 배우자의 persons.spouse_id 해제
                await db.query(
                    `UPDATE persons SET spouse_id = NULL WHERE spouse_id = $1 AND site_id = $2`,
                    [personId, siteId]
                );
            }
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('updatePerson error:', err);
        res.status(500).json({ success: false, message: 'Failed to update person' });
    }
};

// DELETE /api/persons/:siteId/:personId
exports.deletePerson = async (req, res) => {
    try {
        const { siteId, personId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // 과도기: spouse_id 참조 해제
        await db.query(
            `UPDATE persons SET spouse_id = NULL WHERE spouse_id = $1 AND site_id = $2`,
            [personId, siteId]
        );

        // person_relations는 ON DELETE CASCADE로 자동 정리됨
        const { rowCount } = await db.query(
            `DELETE FROM persons WHERE id = $1 AND site_id = $2`,
            [personId, siteId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Person not found' });
        }

        // 개인 폴더 삭제 (§19)
        const personDir = path.join(PERSON_UPLOADS_DIR, String(personId));
        if (fs.existsSync(personDir)) {
            fs.rmSync(personDir, { recursive: true, force: true });
        }

        res.json({ success: true, message: 'Person deleted' });
    } catch (err) {
        console.error('deletePerson error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete person' });
    }
};

// GET /api/persons/:siteId/:personId/photos — 인물 관련 사진 조회
exports.listPersonPhotos = async (req, res) => {
    try {
        const { siteId, personId } = req.params;
        // exhibitions에서 person_id로 연결된 전시관의 사진 + 인물 프로필 사진
        const { rows } = await db.query(
            `SELECT ep.id, ep.url, ep.original_name AS caption, ep.created_at
             FROM exhibition_photos ep
             JOIN exhibitions e ON e.id = ep.exhibition_id
             WHERE e.site_id = $1 AND e.person_id = $2
             ORDER BY ep.created_at DESC`,
            [siteId, personId]
        );

        // 프로필 사진도 포함
        const { rows: personRows } = await db.query(
            `SELECT photo_url FROM persons WHERE id = $1 AND site_id = $2 AND photo_url IS NOT NULL`,
            [personId, siteId]
        );
        const photos = [...rows];
        if (personRows.length > 0 && personRows[0].photo_url) {
            photos.unshift({ id: 0, url: personRows[0].photo_url, caption: '프로필 사진', created_at: null });
        }

        res.json({ success: true, data: photos });
    } catch (err) {
        console.error('listPersonPhotos error:', err);
        res.status(500).json({ success: false, data: [] });
    }
};

// POST /api/persons/:siteId/backfill-oc-ids — 기존 인물에 oc_id 일괄 부여
exports.backfillOcIds = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { backfillOcIds: backfill } = require('../utils/ocIdGenerator');
        const count = await backfill(db, 'KR');
        res.json({ success: true, message: `${count}명에게 oc_id 부여 완료` });
    } catch (err) {
        console.error('backfillOcIds error:', err);
        res.status(500).json({ success: false, message: 'Failed to backfill oc_ids' });
    }
};

// POST /api/persons/:siteId/:personId/photo
exports.uploadPhoto = async (req, res) => {
    try {
        const { siteId, personId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // 개인 폴더에 profile.jpg로 저장 (§19)
        const personDir = path.join(PERSON_UPLOADS_DIR, String(personId));
        fs.mkdirSync(personDir, { recursive: true });
        const profilePath = path.join(personDir, 'profile.jpg');

        // 업로드된 파일을 profile.jpg로 이동
        fs.renameSync(req.file.path, profilePath);

        const photo_url = `/uploads/persons/${personId}/profile.jpg`;

        const { rows } = await db.query(
            `UPDATE persons SET photo_url = $1 WHERE id = $2 AND site_id = $3 RETURNING *`,
            [photo_url, personId, siteId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Person not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('uploadPhoto error:', err);
        res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// OPS 파이프라인 (§26 신규 스키마 기반)
// POST /api/persons
// Body: { name, gender, birth_date?, site_subdomain, anchor_person_id, relation_key }
//
// relation_key 목록:
//   father | mother | birth-father | birth-mother
//   son | daughter | hyeong | je | sister
//   spouse_wife | spouse_husband
// ─────────────────────────────────────────────────────────────────────────────

// relation_key → person_relations 저장 방식
// [relation_type, id_1_role, id_2_role]
// id_1_role: 'new'=신규인물, 'anchor'=기준인물
const RELATION_RULES = {
  father:          { type: 'parent-child',  id1: 'new',    id2: 'anchor' }, // 부→자(anchor)
  mother:          { type: 'parent-child',  id1: 'new',    id2: 'anchor' },
  'birth-father':  { type: 'birth-parent', id1: 'new',    id2: 'anchor' },
  'birth-mother':  { type: 'birth-parent', id1: 'new',    id2: 'anchor' },
  son:             { type: 'parent-child',  id1: 'anchor', id2: 'new'    }, // anchor→자(new)
  daughter:        { type: 'parent-child',  id1: 'anchor', id2: 'new'    },
  hyeong:          { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  je:              { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  sister:          { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  spouse_wife:     { type: 'spouse',        id1: 'anchor', id2: 'new'    },
  spouse_husband:  { type: 'spouse',        id1: 'anchor', id2: 'new'    },
};

exports.createPersonOPS = async (req, res) => {
  const { name, gender, birth_date, death_date, bio1, bio2, bio3,
          site_subdomain, anchor_person_id, relation_key } = req.body;

  // ── 입력 검증 ──
  if (!name?.trim())          return res.status(400).json({ success: false, message: 'name 필수' });
  if (!anchor_person_id)      return res.status(400).json({ success: false, message: 'anchor_person_id 필수' });
  if (!relation_key)          return res.status(400).json({ success: false, message: 'relation_key 필수' });
  if (!site_subdomain)        return res.status(400).json({ success: false, message: 'site_subdomain 필수' });
  if (!RELATION_RULES[relation_key]) {
    return res.status(400).json({ success: false, message: `지원하지 않는 relation_key: ${relation_key}` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. anchor 인물 조회 (person_id/oc_id 문자열 → INTEGER id + site_id 확정)
    const { rows: anchorRows } = await client.query(
      `SELECT id, site_id, person_id, oc_id, nationality, birth_country
       FROM persons
       WHERE person_id = $1 OR oc_id = $1
       LIMIT 1`,
      [anchor_person_id]
    );
    if (!anchorRows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'anchor_person_id를 찾을 수 없습니다' });
    }
    const anchor = anchorRows[0];
    const countryCode = anchor.nationality || anchor.birth_country || 'KR';

    // 2. 새 VARCHAR person_id (= oc_id) 생성
    const lang = req.headers['accept-language'] || '';
    const geo  = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '';
    const cc = resolveCountryCode(lang, geo) || countryCode;
    const newPersonId = await generateOcId(client, cc);

    // 3. persons 테이블에 인물 저장 (기존 스키마 호환)
    const { rows: personRows } = await client.query(
      `INSERT INTO persons
         (site_id, name, gender, birth_date, death_date,
          bio1, bio2, bio3, nationality, oc_id, person_id, match_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'ghost')
       RETURNING *`,
      [anchor.site_id, name.trim(), gender || null,
       birth_date || null, death_date || null,
       bio1 || null, bio2 || null, bio3 || null,
       cc, newPersonId]
    );
    const newPerson = personRows[0];

    // 4. person_relations에 관계 저장 (INTEGER ids + site_id)
    const rule = RELATION_RULES[relation_key];
    const [intId1, intId2] = rule.id1 === 'new'
      ? [newPerson.id, anchor.id]
      : [anchor.id, newPerson.id];

    await client.query(
      `INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING`,
      [anchor.site_id, intId1, intId2, rule.type]
    );

    // 5. OPS path 배정 (VARCHAR person_id 기반)
    const anchorVarId = anchor.person_id || anchor.oc_id;
    const assignedPath = await assignPath(client, newPersonId, anchorVarId, relation_key, anchorVarId);

    await client.query('COMMIT');

    // 6. personMatcher (트랜잭션 외부 — 실패해도 생성은 유지)
    try {
      await matchAndMerge({
        person_id: newPersonId,
        name: newPerson.name,
        birth_date: newPerson.birth_date,
        gender: newPerson.gender,
        new_path: assignedPath,
        created_by: anchorVarId,
      });
    } catch (matchErr) {
      console.error('personMatcher 오류 (무시):', matchErr.message);
    }

    return res.status(201).json({
      success: true,
      data: {
        ...newPerson,
        person_id:     newPersonId,
        oc_id:         newPersonId,
        assigned_path: assignedPath,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createPersonOPS error:', err);
    return res.status(500).json({ success: false, message: '인물 생성에 실패했습니다' });
  } finally {
    client.release();
  }
};
