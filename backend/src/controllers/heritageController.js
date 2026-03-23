const db = require('../config/db');

// 사이트 오너 확인 헬퍼
async function checkSiteOwner(userId, siteId) {
    const { rows } = await db.query(
        `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`,
        [siteId, userId]
    );
    return rows.length > 0;
}

// GET /api/heritage/:siteId
exports.listHeritage = async (req, res) => {
    try {
        const { siteId } = req.params;
        if (!await checkSiteOwner(req.user.id, siteId)) {
            return res.status(403).json({ success: false, message: 'Owner only' });
        }
        const { rows } = await db.query(
            `SELECT * FROM digital_heritage WHERE site_id = $1 ORDER BY created_at DESC`,
            [siteId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listHeritage error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/heritage/:siteId
exports.createHeritage = async (req, res) => {
    try {
        const { siteId } = req.params;
        if (!await checkSiteOwner(req.user.id, siteId)) {
            return res.status(403).json({ success: false, message: 'Owner only' });
        }

        const { beneficiary_name, beneficiary_email, beneficiary_relation, activation_condition } = req.body;
        if (!beneficiary_name || !beneficiary_email) {
            return res.status(400).json({ success: false, message: 'beneficiary_name and beneficiary_email required' });
        }

        const cond = ['inactivity_1year', 'inactivity_2year', 'manual'].includes(activation_condition)
            ? activation_condition : 'inactivity_1year';

        const { rows } = await db.query(
            `INSERT INTO digital_heritage (site_id, beneficiary_name, beneficiary_email, beneficiary_relation, activation_condition, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [siteId, beneficiary_name, beneficiary_email, beneficiary_relation || null, cond, req.user.id]
        );
        res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('createHeritage error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// PUT /api/heritage/:siteId/:id
exports.updateHeritage = async (req, res) => {
    try {
        const { siteId, id } = req.params;
        if (!await checkSiteOwner(req.user.id, siteId)) {
            return res.status(403).json({ success: false, message: 'Owner only' });
        }

        const { beneficiary_name, beneficiary_email, beneficiary_relation, activation_condition } = req.body;
        const cond = ['inactivity_1year', 'inactivity_2year', 'manual'].includes(activation_condition)
            ? activation_condition : undefined;

        const { rows } = await db.query(
            `UPDATE digital_heritage
             SET beneficiary_name = COALESCE($1, beneficiary_name),
                 beneficiary_email = COALESCE($2, beneficiary_email),
                 beneficiary_relation = COALESCE($3, beneficiary_relation),
                 activation_condition = COALESCE($4, activation_condition),
                 updated_at = NOW()
             WHERE id = $5 AND site_id = $6 RETURNING *`,
            [beneficiary_name || null, beneficiary_email || null, beneficiary_relation || null, cond || null, id, siteId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('updateHeritage error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/heritage/:siteId/:id
exports.deleteHeritage = async (req, res) => {
    try {
        const { siteId, id } = req.params;
        if (!await checkSiteOwner(req.user.id, siteId)) {
            return res.status(403).json({ success: false, message: 'Owner only' });
        }
        const { rows } = await db.query(
            `DELETE FROM digital_heritage WHERE id = $1 AND site_id = $2 RETURNING id`,
            [id, siteId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('deleteHeritage error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
