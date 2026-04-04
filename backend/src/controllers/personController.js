const db = require('../config/db');

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
// person_relations를 정본으로 사용하되, 과도기에 persons 컬럼도 함께 반환
exports.listPersons = async (req, res) => {
    try {
        const { siteId } = req.params;

        // 인물 목록 조회 (persons 컬럼은 과도기 호환용으로 유지)
        const { rows: persons } = await db.query(
            `SELECT id, site_id, name, birth_year, death_year, gender,
                    privacy_level, parent1_id, parent2_id, spouse_id,
                    generation, photo_url, birth_date, death_date,
                    is_deceased, birth_lunar, death_lunar,
                    fs_person_id, photo_position, biography, created_at
             FROM persons WHERE site_id = $1
             ORDER BY generation ASC, id ASC`,
            [siteId]
        );

        // person_relations에서 parent/spouse 관계 조회하여 persons 컬럼 덮어쓰기
        const { rows: relations } = await db.query(
            `SELECT person1_id, person2_id, relation_type
             FROM person_relations
             WHERE site_id = $1 AND relation_type IN ('parent', 'spouse')`,
            [siteId]
        );

        // 관계 데이터로 persons 컬럼 값 재구성 (person_relations가 정본)
        if (relations.length > 0) {
            const personMap = new Map(persons.map(p => [p.id, p]));

            for (const person of persons) {
                // parent 관계: person1_id=부모, person2_id=자녀
                const parents = relations
                    .filter(r => r.relation_type === 'parent' && r.person2_id === person.id)
                    .map(r => {
                        const parent = personMap.get(r.person1_id);
                        return { id: r.person1_id, gender: parent?.gender };
                    });

                // 부모를 gender 기준 정렬: M → parent1, F → parent2
                parents.sort((a, b) => {
                    if (a.gender === 'M' && b.gender !== 'M') return -1;
                    if (a.gender !== 'M' && b.gender === 'M') return 1;
                    return a.id - b.id;
                });

                person.parent1_id = parents[0]?.id || null;
                person.parent2_id = parents[1]?.id || null;

                // spouse 관계: LEAST/GREATEST 정규화
                const spouseRel = relations.find(r =>
                    r.relation_type === 'spouse' &&
                    (r.person1_id === person.id || r.person2_id === person.id)
                );
                person.spouse_id = spouseRel
                    ? (spouseRel.person1_id === person.id ? spouseRel.person2_id : spouseRel.person1_id)
                    : null;
            }
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

        const newPersonId = rows[0].id;

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

        res.status(201).json({ success: true, data: rows[0] });
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
            'name', 'birth_year', 'death_year', 'gender', 'privacy_level',
            'parent1_id', 'parent2_id', 'spouse_id', 'generation',
            'photo_url', 'birth_date', 'death_date',
            'is_deceased', 'birth_lunar', 'death_lunar', 'photo_position', 'biography',
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

        const photo_url = `/uploads/persons/${req.file.filename}`;

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
