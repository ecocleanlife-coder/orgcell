const db = require('../config/db');

// GET /api/museum/:subdomain  (optionalAuth)
// Returns site info + caller's role: 'public' | 'member' | 'owner'
exports.getMuseumBySubdomain = async (req, res) => {
    try {
        const subdomain = req.params.subdomain.toLowerCase();
        const { rows } = await db.query(
            'SELECT id, user_id, subdomain, theme, status, created_at FROM family_sites WHERE subdomain = $1',
            [subdomain]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Museum not found' });

        const site = rows[0];
        let role = 'public';

        if (req.user) {
            if (req.user.id === site.user_id) {
                role = 'owner';
            } else {
                const { rows: mem } = await db.query(
                    'SELECT id FROM site_members WHERE site_id = $1 AND user_id = $2',
                    [site.id, req.user.id]
                );
                if (mem.length) role = 'member';
            }
        }

        res.json({ success: true, data: { ...site, role } });
    } catch (err) {
        console.error('getMuseumBySubdomain error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
