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
                    fs_person_id, created_at
             FROM persons WHERE site_id = $1
             ORDER BY generation ASC, id ASC`,
            [siteId]
        );
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

        const { name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'name is required' });
        }

        const { rows } = await db.query(
            `INSERT INTO persons (site_id, name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             RETURNING *`,
            [siteId, name, birth_year || null, death_year || null, gender || null, privacy_level || 'family', parent1_id || null, parent2_id || null, spouse_id || null, generation || 0, photo_url || null, birth_date || null, death_date || null, is_deceased ?? false, birth_lunar ?? false, death_lunar ?? false]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createPerson error:', err);
        res.status(500).json({ success: false, message: 'Failed to create person' });
    }
};

// PUT /api/persons/:siteId/:personId
exports.updatePerson = async (req, res) => {
    try {
        const { siteId, personId } = req.params;
        const userId = req.user?.id;
        if (!await checkSiteAccess(userId, siteId)) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const { name, birth_year, death_year, gender, privacy_level, parent1_id, parent2_id, spouse_id, generation, photo_url, birth_date, death_date, is_deceased, birth_lunar, death_lunar } = req.body;

        const { rows } = await db.query(
            `UPDATE persons SET
                name = COALESCE($1, name),
                birth_year = $2,
                death_year = $3,
                gender = COALESCE($4, gender),
                privacy_level = COALESCE($5, privacy_level),
                parent1_id = $6,
                parent2_id = $7,
                spouse_id = $8,
                generation = COALESCE($9, generation),
                photo_url = $10,
                birth_date = $11,
                death_date = $12,
                is_deceased = COALESCE($15, is_deceased),
                birth_lunar = COALESCE($16, birth_lunar),
                death_lunar = COALESCE($17, death_lunar)
             WHERE id = $13 AND site_id = $14
             RETURNING *`,
            [name, birth_year, death_year, gender, privacy_level, parent1_id || null, parent2_id || null, spouse_id || null, generation, photo_url, birth_date || null, death_date || null, personId, siteId, is_deceased, birth_lunar, death_lunar]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Person not found' });
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
