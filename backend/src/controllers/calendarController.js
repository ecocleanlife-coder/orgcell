const db = require('../config/db');

// GET /api/calendar?site_id=X&year=Y&month=M
// 월별 일정 조회 (반복 일정 포함)
exports.listEvents = async (req, res) => {
    try {
        const { site_id, year, month } = req.query;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || new Date().getMonth() + 1;

        // 해당 월 일정 + 반복 일정 + 기간 걸친 일정
        const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
        const monthEnd = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
        const { rows } = await db.query(
            `SELECT * FROM family_calendar
             WHERE site_id = $1
               AND (
                 (is_recurring = false AND EXTRACT(YEAR FROM event_date) = $2 AND EXTRACT(MONTH FROM event_date) = $3)
                 OR
                 (is_recurring = false AND end_date IS NOT NULL AND event_date <= $5::date AND end_date >= $4::date)
                 OR
                 (is_recurring = true AND EXTRACT(MONTH FROM event_date) = $3)
               )
             ORDER BY
               EXTRACT(DAY FROM event_date) ASC,
               created_at ASC`,
            [site_id, y, m, monthStart, monthEnd]
        );

        // persons 테이블에서 생일/기일 자동 생성 (birth_date, death_date 컬럼)
        const { rows: persons } = await db.query(
            `SELECT id, name, birth_date, death_date FROM persons
             WHERE site_id = $1 AND (birth_date IS NOT NULL OR death_date IS NOT NULL)`,
            [site_id]
        );

        const autoEvents = [];
        for (const p of persons) {
            if (p.birth_date) {
                const bd = new Date(p.birth_date);
                if (bd.getUTCMonth() + 1 === m) {
                    autoEvents.push({
                        id: `auto-birth-${p.id}`,
                        site_id: parseInt(site_id),
                        title: `${p.name} 🎂`,
                        event_date: p.birth_date,
                        event_type: 'birthday',
                        is_recurring: true,
                        person_name: p.name,
                        description: null,
                        auto_generated: true,
                    });
                }
            }
            if (p.death_date) {
                const dd = new Date(p.death_date);
                if (dd.getUTCMonth() + 1 === m) {
                    autoEvents.push({
                        id: `auto-memorial-${p.id}`,
                        site_id: parseInt(site_id),
                        title: `${p.name} 🕯️`,
                        event_date: p.death_date,
                        event_type: 'memorial',
                        is_recurring: true,
                        person_name: p.name,
                        description: null,
                        auto_generated: true,
                    });
                }
            }
        }

        res.json({ success: true, data: [...rows, ...autoEvents] });
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

        const validTypes = ['birthday', 'anniversary', 'event', 'memorial', 'trip'];
        const eType = validTypes.includes(event_type) ? event_type : 'event';

        // end_date 유효성 검사
        const { end_date } = req.body;
        if (end_date && new Date(end_date) < new Date(event_date)) {
            return res.status(400).json({ success: false, message: 'end_date must be after event_date' });
        }

        const { rows } = await db.query(
            `INSERT INTO family_calendar
               (site_id, title, event_date, end_date, event_type, description, is_recurring, person_name, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [site_id, title, event_date, end_date || null, eType, description || null,
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

        const validTypes = ['birthday', 'anniversary', 'event', 'memorial', 'trip'];
        const eType = validTypes.includes(event_type) ? event_type : ev.event_type;

        const { end_date } = req.body;
        if (end_date && event_date && new Date(end_date) < new Date(event_date)) {
            return res.status(400).json({ success: false, message: 'end_date must be after event_date' });
        }

        const { rows } = await db.query(
            `UPDATE family_calendar SET
               title = COALESCE($1, title),
               event_date = COALESCE($2, event_date),
               end_date = $3,
               event_type = $4,
               description = COALESCE($5, description),
               is_recurring = COALESCE($6, is_recurring),
               person_name = COALESCE($7, person_name),
               updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [title, event_date, end_date !== undefined ? end_date : ev.end_date, eType, description, is_recurring, person_name, id]
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
