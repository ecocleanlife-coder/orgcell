const db = require('../config/db');

// GET /api/museum/mine  (protect)
// 로그인 유저가 소유하거나 멤버인 박물관 목록 반환
exports.getMyMuseums = async (req, res) => {
    try {
        const userId = req.user.id;
        const { rows } = await db.query(
            `SELECT fs.id, fs.user_id, fs.subdomain, fs.theme, fs.status, fs.created_at,
                    COALESCE(fs.title, fs.subdomain) AS title,
                    fs.description, fs.thumbnail_url,
                    CASE WHEN fs.user_id = $1 THEN 'owner' ELSE 'member' END AS role,
                    CASE WHEN fs.status = 'public' THEN 'public' ELSE 'family' END AS type
             FROM family_sites fs
             WHERE fs.user_id = $1
             UNION
             SELECT fs.id, fs.user_id, fs.subdomain, fs.theme, fs.status, fs.created_at,
                    COALESCE(fs.title, fs.subdomain) AS title,
                    fs.description, fs.thumbnail_url,
                    'member' AS role,
                    CASE WHEN fs.status = 'public' THEN 'public' ELSE 'family' END AS type
             FROM family_sites fs
             JOIN site_members sm ON sm.site_id = fs.id
             WHERE sm.user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getMyMuseums error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

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
