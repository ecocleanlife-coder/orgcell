const db = require('../config/db');

// GET /api/exhibitions?site_id=X&visibility=public|family&hall_type=general|ancestor
exports.listExhibitions = async (req, res) => {
    try {
        const { site_id, visibility, hall_type } = req.query;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        let query = `
            SELECT e.*,
                   COALESCE(gb.cnt, 0) AS guestbook_count,
                   u.name AS creator_name
            FROM exhibitions e
            LEFT JOIN (
                SELECT exhibition_id, COUNT(*) AS cnt FROM guestbooks GROUP BY exhibition_id
            ) gb ON gb.exhibition_id = e.id
            LEFT JOIN users u ON u.id = e.created_by
            WHERE e.site_id = $1
        `;
        const params = [site_id];

        if (visibility) {
            query += ` AND e.visibility = $${params.length + 1}`;
            params.push(visibility);
        }
        if (hall_type) {
            query += ` AND COALESCE(e.hall_type, 'general') = $${params.length + 1}`;
            params.push(hall_type);
        }
        query += ` ORDER BY e.created_at DESC`;

        const { rows } = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listExhibitions error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/exhibitions
exports.createExhibition = async (req, res) => {
    try {
        const {
            site_id, title, description, visibility,
            hall_type, birth_year, death_year, memoir, relation,
            person_id, featured_photos, biography
        } = req.body;
        if (!site_id || !title) return res.status(400).json({ success: false, message: 'site_id and title required' });

        const vis = ['public', 'family'].includes(visibility) ? visibility : 'family';
        const hType = ['general', 'ancestor'].includes(hall_type) ? hall_type : 'general';
        const photos = Array.isArray(featured_photos) ? JSON.stringify(featured_photos.slice(0, 3)) : '[]';

        const { rows } = await db.query(
            `INSERT INTO exhibitions
               (site_id, title, description, visibility, created_by,
                hall_type, birth_year, death_year, memoir, relation,
                person_id, featured_photos, biography)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [site_id, title, description || '', vis, req.user?.id || null,
             hType, birth_year || null, death_year || null, memoir || null, relation || null,
             person_id || null, photos, biography || null]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createExhibition error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/exhibitions/:id
exports.getExhibition = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            `SELECT e.*, COALESCE(gb.cnt, 0) AS guestbook_count
             FROM exhibitions e
             LEFT JOIN (
                 SELECT exhibition_id, COUNT(*) AS cnt FROM guestbooks GROUP BY exhibition_id
             ) gb ON gb.exhibition_id = e.id
             WHERE e.id = $1`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('getExhibition error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// PUT /api/exhibitions/:id
exports.updateExhibition = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, visibility,
            birth_year, death_year, memoir, relation,
            person_id, featured_photos, biography
        } = req.body;

        const photos = Array.isArray(featured_photos) ? JSON.stringify(featured_photos.slice(0, 3)) : undefined;

        const sets = [];
        const params = [];
        let idx = 1;

        const maybeSet = (col, val) => {
            if (val !== undefined) {
                sets.push(`${col} = $${idx++}`);
                params.push(val);
            }
        };

        maybeSet('title', title);
        maybeSet('description', description);
        maybeSet('visibility', visibility);
        maybeSet('birth_year', birth_year ?? null);
        maybeSet('death_year', death_year ?? null);
        maybeSet('memoir', memoir);
        maybeSet('relation', relation);
        maybeSet('person_id', person_id);
        maybeSet('featured_photos', photos);
        maybeSet('biography', biography);

        if (sets.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

        sets.push(`updated_at = NOW()`);
        params.push(id);

        const { rows } = await db.query(
            `UPDATE exhibitions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
            params
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('updateExhibition error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/exhibitions/:id
exports.deleteExhibition = async (req, res) => {
    try {
        const { id } = req.params;
        const { rows } = await db.query(
            `DELETE FROM exhibitions WHERE id = $1 RETURNING id`,
            [id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('deleteExhibition error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/exhibitions/:id/guestbook
exports.listGuestbook = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT * FROM guestbooks WHERE exhibition_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listGuestbook error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/exhibitions/:id/guestbook
exports.addGuestbook = async (req, res) => {
    try {
        const { name, message } = req.body;
        if (!name || !message) return res.status(400).json({ success: false, message: 'name and message required' });

        const { rows } = await db.query(
            `INSERT INTO guestbooks (exhibition_id, name, message) VALUES ($1, $2, $3) RETURNING *`,
            [req.params.id, name, message]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('addGuestbook error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
