const db = require('../config/db');
const crypto = require('crypto');
const { sendInviteEmail } = require('../services/emailService');

// POST /api/invite/create
exports.createInvite = async (req, res) => {
    try {
        const { site_id } = req.body;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10-char hex
        const { rows } = await db.query(
            `INSERT INTO family_invites (site_id, inviter_id, code)
             VALUES ($1, $2, $3) RETURNING code`,
            [site_id, req.user.id, code]
        );
        const finalCode = rows[0].code;
        res.json({ success: true, data: { code: finalCode, url: `https://orgcell.com/invite?code=${finalCode}` } });
    } catch (err) {
        console.error('createInvite error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/invite/info?code=...
exports.getInviteInfo = async (req, res) => {
    try {
        const code = (req.query.code || '').toUpperCase();
        if (!code) return res.status(400).json({ success: false, message: 'code required' });

        const { rows } = await db.query(
            `SELECT fi.code, fi.site_id, fi.status, fs.subdomain, u.name AS inviter_name
             FROM family_invites fi
             JOIN family_sites fs ON fs.id = fi.site_id
             LEFT JOIN users u ON u.id = fi.inviter_id
             WHERE fi.code = $1 AND fi.expires_at > CURRENT_TIMESTAMP`,
            [code]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Invalid or expired code' });
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('getInviteInfo error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/invite/accept
exports.acceptInvite = async (req, res) => {
    try {
        const code = (req.body.code || '').toUpperCase();
        if (!code) return res.status(400).json({ success: false, message: 'code required' });

        const { rows } = await db.query(
            `SELECT fi.site_id FROM family_invites fi
             WHERE fi.code = $1 AND fi.expires_at > CURRENT_TIMESTAMP AND fi.status = 'pending'`,
            [code]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Invalid or expired code' });

        const siteId = rows[0].site_id;
        const userId = req.user.id;

        await db.query(
            `INSERT INTO site_members (site_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (site_id, user_id) DO NOTHING`,
            [siteId, userId]
        );
        await db.query(
            `UPDATE family_invites SET status = 'accepted' WHERE code = $1`,
            [code]
        );

        res.json({ success: true, data: { site_id: siteId } });
    } catch (err) {
        console.error('acceptInvite error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/invite/send-email
exports.sendInviteEmailHandler = async (req, res) => {
    try {
        const { email, code, subdomain } = req.body;
        if (!email || !code) return res.status(400).json({ success: false, message: 'email and code required' });

        await sendInviteEmail({ to: email, code, inviterName: req.user?.name || 'Someone', subdomain });
        res.json({ success: true });
    } catch (err) {
        console.error('sendInviteEmailHandler error:', err);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
};
