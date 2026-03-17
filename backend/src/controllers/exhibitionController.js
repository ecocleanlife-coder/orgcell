const db = require('../config/db');

// GET /api/exhibitions?site_id=X&visibility=public|family
exports.listExhibitions = async (req, res) => {
    try {
        const { site_id, visibility } = req.query;
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
            query += ` AND e.visibility = $2`;
            params.push(visibility);
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
        const { site_id, title, description, visibility } = req.body;
        if (!site_id || !title) return res.status(400).json({ success: false, message: 'site_id and title required' });

        const vis = ['public', 'family'].includes(visibility) ? visibility : 'family';
        const { rows } = await db.query(
            `INSERT INTO exhibitions (site_id, title, description, visibility, created_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [site_id, title, description || '', vis, req.user?.id || null]
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
