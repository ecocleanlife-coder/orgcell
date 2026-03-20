const db = require('../config/db');

// GET /api/calendar?site_id=X&year=Y&month=M
// 월별 일정 조회 (반복 일정 포함)
exports.listEvents = async (req, res) => {
    try {
        const { site_id, year, month } = req.query;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        // 해당 월 일정 + 반복 일정(매년 반복이므로 month/day 기준)
        const { rows } = await db.query(
            `SELECT * FROM family_calendar
             WHERE site_id = $1
               AND (
                 (is_recurring = false AND EXTRACT(YEAR FROM event_date) = $2 AND EXTRACT(MONTH FROM event_date) = $3)
                 OR
                 (is_recurring = true AND EXTRACT(MONTH FROM event_date) = $3)
               )
             ORDER BY
               EXTRACT(DAY FROM event_date) ASC,
               created_at ASC`,
            [site_id, y, m]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listEvents error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/calendar
exports.createEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { site_id, title, event_date, event_type, description, is_recurring, person_name } = req.body;
        if (!site_id || !title || !event_date) {
            return res.status(400).json({ success: false, message: 'site_id, title, event_date required' });
        }

        // 해당 site의 owner 또는 member인지 확인
        const { rows: access } = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2
             UNION
             SELECT site_id FROM site_members WHERE site_id = $1 AND user_id = $2`,
            [site_id, userId]
        );
        if (!access.length) return res.status(403).json({ success: false, message: 'Forbidden' });

        const validTypes = ['birthday', 'anniversary', 'event', 'memorial'];
        const eType = validTypes.includes(event_type) ? event_type : 'event';

        const { rows } = await db.query(
            `INSERT INTO family_calendar
               (site_id, title, event_date, event_type, description, is_recurring, person_name, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [site_id, title, event_date, eType, description || null,
             is_recurring ?? false, person_name || null, userId]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createEvent error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// PUT /api/calendar/:id
exports.updateEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id } = req.params;
        const { title, event_date, event_type, description, is_recurring, person_name } = req.body;

        // 소유자만 수정 가능 (생성자 또는 site owner)
        const { rows: existing } = await db.query(
            `SELECT fc.*, fs.user_id AS site_owner
             FROM family_calendar fc
             JOIN family_sites fs ON fs.id = fc.site_id
             WHERE fc.id = $1`,
            [id]
        );
        if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });

        const ev = existing[0];
        if (ev.created_by !== userId && ev.site_owner !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const validTypes = ['birthday', 'anniversary', 'event', 'memorial'];
        const eType = validTypes.includes(event_type) ? event_type : ev.event_type;

        const { rows } = await db.query(
            `UPDATE family_calendar SET
               title = COALESCE($1, title),
               event_date = COALESCE($2, event_date),
               event_type = $3,
               description = COALESCE($4, description),
               is_recurring = COALESCE($5, is_recurring),
               person_name = COALESCE($6, person_name),
               updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [title, event_date, eType, description, is_recurring, person_name, id]
        );

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('updateEvent error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/calendar/:id
exports.deleteEvent = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { id } = req.params;

        const { rows: existing } = await db.query(
            `SELECT fc.*, fs.user_id AS site_owner
             FROM family_calendar fc
             JOIN family_sites fs ON fs.id = fc.site_id
             WHERE fc.id = $1`,
            [id]
        );
        if (!existing.length) return res.status(404).json({ success: false, message: 'Not found' });

        const ev = existing[0];
        if (ev.created_by !== userId && ev.site_owner !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await db.query('DELETE FROM family_calendar WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('deleteEvent error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
