const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { generateOcId, resolveCountryCode } = require("../utils/ocIdGenerator");
const { assignPath, assignCuratorPath, getAnchorPath } = require("../services/pathAssigner");
const { matchAndMerge } = require("../services/personMatcher");

const PERSON_UPLOADS_DIR = path.join(__dirname, "../../uploads/persons");

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
            `SELECT p.id, p.person_id, p.oc_id, p.first_name, p.last_name, p.name_en, p.name_suffix, p.gender,
                    p.birth_date, p.birth_year, p.death_date, p.death_year,
                    p.is_deceased, p.birth_lunar, p.death_lunar,
                    p.bio1, p.bio2, p.bio3, p.biography,
                    p.photo_url, p.photo_position, p.match_status,
                    p.parent1_id, p.parent2_id, p.spouse_id,
                    p.privacy_level, p.generation, p.created_at,
                    p.father_first_name, p.father_last_name, p.mother_first_name, p.mother_last_name
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
                r => (r.relation_type === 'parent' || r.relation_type === 'parent-child') && r.person2_id === intId
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

        const { first_name, last_name, name_en, name_suffix, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar, photo_position, father_first_name, father_last_name, mother_first_name, mother_last_name } = req.body;

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'first_name and last_name are required' });
        }

        // ── 중복 이름 체크 ──────────────────────────────────────
        // 1. 성 + 이름 + 생년월일 완전 일치 → 400
        if (birth_date) {
            const { rows: exact } = await db.query(
                `SELECT id, first_name, last_name FROM persons WHERE site_id = $1 AND first_name = $2 AND last_name = $3 AND birth_date = $4 LIMIT 1`,
                [siteId, first_name.trim(), last_name.trim(), birth_date]
            );
            if (exact.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '이미 등록된 분입니다',
                    code: 'EXACT_DUPLICATE',
                    existingId: exact[0].id,
                });
            }
        }

        // 2. 성 + 이름만 일치 → 409 (프론트가 확인 모달 표시)
        const { rows: nameOnly } = await db.query(
            `SELECT id, first_name, last_name, birth_date, gender FROM persons WHERE site_id = $1 AND first_name = $2 AND last_name = $3 LIMIT 1`,
            [siteId, first_name.trim(), last_name.trim()]
        );
        if (nameOnly.length > 0 && !req.body.force_create) {
            return res.status(409).json({
                success: false,
                message: `${last_name.trim()}${first_name.trim()}님이 이미 등록되어 있습니다. 같은 분인가요?`,
                code: 'NAME_DUPLICATE',
                existingPerson: nameOnly[0],
            });
        }
        // ────────────────────────────────────────────────────────

        // persons 테이블에 INSERT
        const { rows } = await db.query(
            `INSERT INTO persons (site_id, first_name, last_name, name_en, name_suffix, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar, photo_position, father_first_name, father_last_name, mother_first_name, mother_last_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
             RETURNING *`,
            [siteId, first_name.trim(), last_name.trim(), name_en || null, name_suffix || null, birth_year || null, death_year || null, gender || null, privacy_level || 'family', parent1_id || null, parent2_id || null, spouse_id || null, generation || 0, photo_url || null, birth_date || null, death_date || null, is_deceased ?? false, birth_lunar ?? false, death_lunar ?? false, photo_position ? JSON.stringify(photo_position) : '{"x":50,"y":50}', father_first_name || null, father_last_name || null, mother_first_name || null, mother_last_name || null]
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
            await db.query('UPDATE persons SET oc_id = $1, person_id = $1 WHERE id = $2', [ocId, newPersonId]);
            newPerson.oc_id = ocId;
            newPerson.person_id = ocId;
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
            'first_name', 'last_name', 'name_en', 'name_suffix',
            'maiden_name', 'former_name', 'birth_year', 'death_year', 'gender', 'privacy_level',
            'parent1_id', 'parent2_id', 'spouse_id', 'generation',
            'photo_url', 'birth_date', 'death_date',
            'is_deceased', 'birth_lunar', 'death_lunar', 'photo_position', 'biography',
            'bio1', 'bio2', 'bio3',
            'father_first_name', 'father_last_name', 'mother_first_name', 'mother_last_name',
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
                    [siteId, Math.min(newPersonId, spouse_id), Math.max(newPersonId, spouse_id)]
                );
                // 과도기: 상대방 persons.spouse_id도 동기화
                await db.query(
                    `UPDATE persons SET spouse_id = $1 WHERE id = $2 AND site_id = $3`,
                    [personId, newSpouseId, siteId]
                );
            }
        } else {
            // 과도기: 이전 배우자의 persons.spouse_id 해제
            await db.query(
                `UPDATE persons SET spouse_id = NULL WHERE spouse_id = $1 AND site_id = $2`,
                [personId, siteId]
            );
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
  father:          { type: 'parent',       id1: 'new',    id2: 'anchor' }, // 부→자(anchor)
  mother:          { type: 'parent',       id1: 'new',    id2: 'anchor' },
  'birth-father':  { type: 'birth-parent', id1: 'new',    id2: 'anchor' },
  'birth-mother':  { type: 'birth-parent', id1: 'new',    id2: 'anchor' },
  son:             { type: 'parent',       id1: 'anchor', id2: 'new'    }, // anchor→자(new)
  daughter:        { type: 'parent',       id1: 'anchor', id2: 'new'    },
  hyeong:          { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  je:              { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  sister:          { type: 'sibling',       id1: 'anchor', id2: 'new'    },
  spouse_wife:     { type: 'spouse',        id1: 'anchor', id2: 'new'    },
  spouse_husband:  { type: 'spouse',        id1: 'anchor', id2: 'new'    },
};

exports.createPersonOPS = async (req, res) => {
  const { first_name, last_name, gender, birth_date, death_date, bio1, bio2, bio3,
          birth_lunar, is_deceased, death_lunar, privacy_level, generation,
          site_subdomain, anchor_person_id, relation_key } = req.body;

  // ── 입력 검증 ──
  if (!first_name?.trim() || !last_name?.trim()) return res.status(400).json({ success: false, message: 'first_name, last_name 필수' });
  if (!anchor_person_id)      return res.status(400).json({ success: false, message: 'anchor_person_id 필수' });
  if (!relation_key)          return res.status(400).json({ success: false, message: 'relation_key 필수' });
  if (!site_subdomain)        return res.status(400).json({ success: false, message: 'site_subdomain 필수' });
  if (!RELATION_RULES[relation_key]) {
    return res.status(400).json({ success: false, message: `지원하지 않는 relation_key: ${relation_key}` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. anchor 인물 조회 (person_id/oc_id 문자열 또는 정수 id 모두 허용)
    let anchorRows;
    if (!isNaN(anchor_person_id)) {
      // 정수 id로 조회
      ({ rows: anchorRows } = await client.query(
        `SELECT id, site_id, person_id, oc_id, nationality, birth_country
         FROM persons WHERE id = $1 LIMIT 1`,
        [parseInt(anchor_person_id)]
      ));
    }
    // varchar 조회 (fallback 또는 문자열인 경우)
    if (!anchorRows?.length) {
      ({ rows: anchorRows } = await client.query(
        `SELECT id, site_id, person_id, oc_id, nationality, birth_country
         FROM persons
         WHERE person_id = $1 OR oc_id = $1
         LIMIT 1`,
        [String(anchor_person_id)]
      ));
    }
    if (!anchorRows?.[0]) {
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
         (site_id, first_name, last_name, gender, birth_date, death_date,
          bio1, bio2, bio3, nationality, oc_id, person_id, match_status,
          birth_lunar, is_deceased, death_lunar, privacy_level, generation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ghost', $13, $14, $15, $16, $17)
       RETURNING *`,
      [anchor.site_id, first_name.trim(), last_name.trim(), gender || null,
       birth_date || null, death_date || null,
       bio1 || null, bio2 || null, bio3 || null,
       cc, newPersonId, newPersonId,
       birth_lunar ?? false, is_deceased ?? false, death_lunar ?? false,
       privacy_level || 'family', generation || null]
    );
    const newPerson = personRows[0];

    // 개인 폴더 자동 생성 (§19) — 정수 id 기준
    try {
      const personDir = path.join(PERSON_UPLOADS_DIR, String(newPerson.id));
      fs.mkdirSync(personDir, { recursive: true });
    } catch (e) {
      console.error('OPS person folder creation failed:', e.message);
    }

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

    // 5. OPS path 배정 (VARCHAR person_id 기반, 없으면 정수 id 문자열로 폴백)
    const anchorVarId = anchor.person_id || anchor.oc_id || String(anchor.id);
    // anchor path 없으면 subdomain으로 자동 배정 (기존 인물 대응)
    const existingAnchorPath = await getAnchorPath(client, anchorVarId);
    if (!existingAnchorPath) {
      await assignCuratorPath(client, anchorVarId, site_subdomain);
    }
    const assignedPath = await assignPath(client, newPersonId, anchorVarId, relation_key, anchorVarId);

    await client.query('COMMIT');

    // 6. personMatcher (트랜잭션 외부 — 실패해도 생성은 유지)
    try {
      await matchAndMerge({
        person_id: newPersonId,
        first_name: newPerson.first_name,
        last_name: newPerson.last_name,
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

// GET /api/persons/path/*
exports.getPersonByPath = async (req, res) => {
  try {
    const opsPath = req.params[0];
    if (!opsPath) return res.status(400).json({ success: false, message: 'path 필수' });

    const { rows: pathRows } = await db.query(
      `SELECT person_id FROM person_paths WHERE path = $1 AND is_canonical = TRUE LIMIT 1`,
      [opsPath]
    );
    if (!pathRows[0]) {
      return res.status(404).json({ success: false, message: '경로를 찾을 수 없습니다' });
    }
    const varId = pathRows[0].person_id;

    const { rows } = await db.query(
      `SELECT p.*, pp.path AS ops_path
       FROM persons p
       LEFT JOIN person_paths pp ON (p.person_id = pp.person_id OR p.oc_id = pp.person_id)
         AND pp.is_canonical = TRUE
       WHERE p.person_id = $1 OR p.oc_id = $1
       LIMIT 1`,
      [varId]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: '인물을 찾을 수 없습니다' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('getPersonByPath error:', err);
    return res.status(500).json({ success: false, message: '조회 실패' });
  }
};


// ── §26-3 인물 검색 (온보딩 본인 확인용) ─────────────────────────────
// POST /api/persons/search
// 이름 + 생년월일 기준으로 전체 사이트에서 후보 조회
// Ghost(외부 노출 금지) 제외, linked 인물만 반환
exports.searchPersons = async (req, res) => {
    try {
        const {
            first_name, last_name, birth_date, birth_lunar,
            bon_gwan, name_other,
            // 부모 필드 — OnboardingPage 전송 필드명과 일치
            father_last_name, father_first_name,
            mother_last_name, mother_first_name,
        } = req.body;

        if (!last_name || typeof last_name !== 'string' || last_name.trim().length > 50) {
            return res.status(400).json({ success: false, message: '성(last_name) 필수 (50자 이내)' });
        }
        if (!first_name || typeof first_name !== 'string' || first_name.trim().length > 50) {
            return res.status(400).json({ success: false, message: '이름(first_name) 필수 (50자 이내)' });
        }

        const lastName  = last_name.trim();
        const firstName = first_name.trim();
        const birthDate = birth_date || null;
        const isLunar   = !!birth_lunar;

        // §26-3: 이름 + 생년월일 매칭 (linked 인물만)
        // - families JOIN 제거: persons.bon_gwan, family_sites.bon_gwan 직접 사용
        // - name_legal_first/last 제거: 컬럼 미존재 가능성
        // - name_other jsonb 조건: 컬럼 없을 경우 에러 방지를 위해 try/catch 대신 IS NOT NULL 체크
        // - birthDate null 시 ::date cast 에러 방지: $4 조건에 IS NOT NULL 추가
        const { rows } = await db.query(
            `SELECT
               p.id, p.first_name, p.last_name,
               p.birth_date, p.birth_lunar, p.gender, p.oc_id, p.match_status,
               fs.subdomain, fs.id AS site_id,
               COALESCE(p.bon_gwan, fs.bon_gwan) AS bon_gwan
             FROM persons p
             JOIN family_sites fs ON fs.id = p.site_id
             WHERE p.match_status = 'linked'
               AND p.first_name ILIKE $1
               AND p.last_name  ILIKE $2
               AND ($3::VARCHAR IS NULL
                    OR p.bon_gwan  ILIKE $3
                    OR fs.bon_gwan ILIKE $3)
               AND ($4::DATE IS NULL OR p.birth_date::date = $4::date)
             ORDER BY
               CASE WHEN $4::DATE IS NOT NULL AND p.birth_date IS NOT NULL
                         AND p.birth_date::date = $4::date THEN 0 ELSE 1 END,
               p.created_at ASC
             LIMIT 10`,
            [
                `%${firstName}%`,
                `%${lastName}%`,
                bon_gwan?.trim() || null,
                birthDate,
            ]
        );

        // 매칭 강도 계산 (§26-3)
        const candidates = rows.map(row => {
            let strength = 'weak';
            if (row.birth_date && birthDate) {
                const dbDate   = new Date(row.birth_date).toISOString().slice(0, 10);
                const sameDate = dbDate === birthDate;
                const sameLunar = row.birth_lunar === isLunar;
                if (sameDate && sameLunar) strength = 'strong';
                else if (sameDate)         strength = 'medium';
            }

            return {
                person_id:      row.oc_id,
                name:           `${row.last_name}${row.first_name}`,
                first_name:     row.first_name,
                last_name:      row.last_name,
                birth_date:     row.birth_date,
                birth_lunar:    row.birth_lunar,
                gender:         row.gender,
                subdomain:      row.subdomain,
                site_id:        row.site_id,
                bon_gwan:       row.bon_gwan,
                match_strength: strength,
            };
        });

        return res.json({ success: true, candidates });
    } catch (err) {
        console.error('searchPersons error:', err);
        return res.status(500).json({ success: false, message: '검색 실패' });
    }
};

// POST /api/persons/link-account
// 온보딩 시 기존 인물(ghost)에 현재 로그인 계정 연결 (§26-4)
exports.linkAccount = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: '인증 필요' });

    const { site_id, person_id } = req.body; // person_id = oc_id
    if (!site_id || !person_id) {
        return res.status(400).json({ success: false, message: 'site_id, person_id 필수' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const personRes = await client.query(
            `SELECT id, match_status, user_id FROM persons
             WHERE oc_id = $1 AND site_id = $2 FOR UPDATE`,
            [person_id, site_id]
        );
        if (personRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: '인물을 찾을 수 없습니다.' });
        }
        const person = personRes.rows[0];

        if (person.user_id && person.user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: '이미 다른 계정과 연결된 인물입니다.' });
        }

        await client.query(
            `UPDATE persons SET user_id = $1, match_status = 'linked' WHERE id = $2`,
            [userId, person.id]
        );

        const { rows: siteRows } = await client.query(
            `SELECT subdomain FROM family_sites WHERE id = $1`, [site_id]
        );
        await client.query('COMMIT');

        return res.json({ success: true, subdomain: siteRows[0]?.subdomain });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('linkAccount error:', err);
        return res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};
