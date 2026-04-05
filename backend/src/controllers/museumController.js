const db = require('../config/db');

// GET /api/museum/search?q=name  (no auth — public persons only)
exports.searchMuseums = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) {
            return res.json({ success: true, data: [] });
        }
        const like = `%${q}%`;
        const { rows } = await db.query(
            `SELECT p.id, p.name, p.maiden_name, p.former_name, p.gender,
                    p.birth_date, p.death_date, p.is_deceased,
                    p.photo_url, p.oc_id,
                    fs.subdomain, fs.title AS museum_title, fs.id AS site_id
             FROM persons p
             JOIN family_sites fs ON fs.id = p.site_id
             WHERE fs.status = 'public'
               AND p.privacy_level = 'public'
               AND (
                 p.name ILIKE $1
                 OR p.maiden_name ILIKE $1
                 OR p.former_name ILIKE $1
                 OR p.oc_id ILIKE $1
               )
             ORDER BY p.name
             LIMIT 20`,
            [like]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('searchMuseums error:', err);
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

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
