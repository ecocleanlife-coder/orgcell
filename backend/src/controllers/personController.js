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
exports.listPersons = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { rows } = await db.query(
            `SELECT id, site_id, name, birth_year, death_year, gender,
                    privacy_level, parent1_id, parent2_id, spouse_id,
                    generation, photo_url, birth_date, death_date,
                    is_deceased, birth_lunar, death_lunar,
                    fs_person_id, photo_position, biography, created_at
             FROM persons WHERE site_id = $1
             ORDER BY generation ASC, id ASC`,
            [siteId]
        );
        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.json({ success: true, data: rows });
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

        const { rows } = await db.query(
            `INSERT INTO persons (site_id, name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar, photo_position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             RETURNING *`,
            [siteId, name, birth_year || null, death_year || null, gender || null, privacy_level || 'family', parent1_id || null, parent2_id || null, spouse_id || null, generation || 0, photo_url || null, birth_date || null, death_date || null, is_deceased ?? false, birth_lunar ?? false, death_lunar ?? false, photo_position ? JSON.stringify(photo_position) : '{"x":50,"y":50}']
        );

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

        // 배우자 양방향 자동 연결: spouse_id 설정 시 상대방도 동기화
        if ('spouse_id' in req.body) {
            const newSpouseId = req.body.spouse_id;
            if (newSpouseId) {
                // 상대방의 spouse_id도 나를 가리키도록 설정
                await db.query(
                    `UPDATE persons SET spouse_id = $1 WHERE id = $2 AND site_id = $3 AND (spouse_id IS NULL OR spouse_id != $1)`,
                    [personId, newSpouseId, siteId]
                );
            }
            // spouse_id를 null로 설정한 경우 → 이전 배우자의 spouse_id도 해제
            if (!newSpouseId) {
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

        // spouse_id 참조 해제
        await db.query(
            `UPDATE persons SET spouse_id = NULL WHERE spouse_id = $1 AND site_id = $2`,
            [personId, siteId]
        );

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
            `SELECT ep.id, ep.photo_url AS url, ep.caption, ep.created_at
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
