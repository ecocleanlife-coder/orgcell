const db = require('../config/db');

// ── 헬퍼: 사용자의 사이트 ID 가져오기 ──
async function getUserSiteId(userId) {
    const { rows } = await db.query(
        'SELECT id, subdomain FROM family_sites WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return rows[0] || null;
}

// ════════════════════════════════════════
// POST /api/friends/request
// 친구 요청 보내기
// ════════════════════════════════════════
exports.sendRequest = async (req, res) => {
    try {
        const { friendSiteId } = req.body;
        if (!friendSiteId) {
            return res.status(400).json({ success: false, message: 'friendSiteId is required' });
        }

        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.status(400).json({ success: false, message: '먼저 박물관을 만들어주세요' });
        }

        if (mySite.id === friendSiteId) {
            return res.status(400).json({ success: false, message: '자기 자신에게 요청할 수 없습니다' });
        }

        // 대상 사이트 존재 확인
        const { rows: targetRows } = await db.query(
            'SELECT id FROM family_sites WHERE id = $1', [friendSiteId]
        );
        if (!targetRows.length) {
            return res.status(404).json({ success: false, message: '대상 박물관을 찾을 수 없습니다' });
        }

        // 이미 존재하는 관계 확인 (양방향)
        const { rows: existing } = await db.query(
            `SELECT id, status FROM friendships
             WHERE (site_id = $1 AND friend_site_id = $2)
                OR (site_id = $2 AND friend_site_id = $1)`,
            [mySite.id, friendSiteId]
        );

        if (existing.length > 0) {
            const f = existing[0];
            if (f.status === 'accepted') {
                return res.status(400).json({ success: false, message: '이미 친구입니다' });
            }
            if (f.status === 'pending') {
                return res.status(400).json({ success: false, message: '이미 요청이 진행 중입니다' });
            }
            // rejected → 재요청 허용: 기존 레코드 업데이트
            await db.query(
                `UPDATE friendships SET site_id = $1, friend_site_id = $2, status = 'pending', updated_at = NOW()
                 WHERE id = $3`,
                [mySite.id, friendSiteId, f.id]
            );
            return res.json({ success: true, message: '친구 요청을 보냈습니다' });
        }

        await db.query(
            `INSERT INTO friendships (site_id, friend_site_id, status)
             VALUES ($1, $2, 'pending')`,
            [mySite.id, friendSiteId]
        );

        res.json({ success: true, message: '친구 요청을 보냈습니다' });
    } catch (err) {
        console.error('friend.sendRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/friends/accept
// 친구 요청 수락 + 자동 federation 생성
// ════════════════════════════════════════
exports.acceptRequest = async (req, res) => {
    try {
        const { friendshipId } = req.body;
        if (!friendshipId) {
            return res.status(400).json({ success: false, message: 'friendshipId is required' });
        }

        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.status(400).json({ success: false, message: '박물관이 없습니다' });
        }

        // 나에게 온 요청인지 확인
        const { rows } = await db.query(
            `SELECT * FROM friendships WHERE id = $1 AND friend_site_id = $2 AND status = 'pending'`,
            [friendshipId, mySite.id]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: '요청을 찾을 수 없습니다' });
        }

        await db.query(
            `UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE id = $1`,
            [friendshipId]
        );

        res.json({ success: true, message: '친구가 되었습니다!' });
    } catch (err) {
        console.error('friend.acceptRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/friends/reject
// 친구 요청 거절
// ════════════════════════════════════════
exports.rejectRequest = async (req, res) => {
    try {
        const { friendshipId } = req.body;
        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.status(400).json({ success: false, message: '박물관이 없습니다' });
        }

        const { rowCount } = await db.query(
            `UPDATE friendships SET status = 'rejected', updated_at = NOW()
             WHERE id = $1 AND friend_site_id = $2 AND status = 'pending'`,
            [friendshipId, mySite.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ success: false, message: '요청을 찾을 수 없습니다' });
        }

        res.json({ success: true, message: '요청을 거절했습니다' });
    } catch (err) {
        console.error('friend.rejectRequest error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// GET /api/friends/list
// 내 친구 목록 (accepted)
// ════════════════════════════════════════
exports.listFriends = async (req, res) => {
    try {
        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.json({ success: true, data: [] });
        }

        const { rows } = await db.query(
            `SELECT f.id AS friendship_id, f.created_at,
                    fs.id AS site_id, fs.subdomain, fs.theme,
                    u.name AS owner_name, u.picture AS owner_picture
             FROM friendships f
             JOIN family_sites fs ON fs.id = CASE
                 WHEN f.site_id = $1 THEN f.friend_site_id
                 ELSE f.site_id
             END
             JOIN users u ON u.id = fs.user_id
             WHERE (f.site_id = $1 OR f.friend_site_id = $1)
               AND f.status = 'accepted'
             ORDER BY f.updated_at DESC`,
            [mySite.id]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('friend.listFriends error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// GET /api/friends/pending
// 받은 친구 요청 목록
// ════════════════════════════════════════
exports.listPending = async (req, res) => {
    try {
        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.json({ success: true, data: [] });
        }

        const { rows } = await db.query(
            `SELECT f.id AS friendship_id, f.created_at,
                    fs.id AS site_id, fs.subdomain,
                    u.name AS requester_name, u.picture AS requester_picture
             FROM friendships f
             JOIN family_sites fs ON fs.id = f.site_id
             JOIN users u ON u.id = fs.user_id
             WHERE f.friend_site_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [mySite.id]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('friend.listPending error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// POST /api/friends/visit
// 박물관 방문 기록
// ════════════════════════════════════════
exports.recordVisit = async (req, res) => {
    try {
        const { siteId } = req.body;
        if (!siteId) {
            return res.status(400).json({ success: false, message: 'siteId is required' });
        }

        // 자기 사이트 방문은 기록 안 함
        const mySite = await getUserSiteId(req.user.id);
        if (mySite && mySite.id === siteId) {
            return res.json({ success: true, message: 'own site' });
        }

        // 최근 1시간 내 중복 방문 방지
        const { rows: recent } = await db.query(
            `SELECT id FROM museum_visitors
             WHERE site_id = $1 AND visitor_user_id = $2 AND visited_at > NOW() - INTERVAL '1 hour'`,
            [siteId, req.user.id]
        );

        if (recent.length === 0) {
            await db.query(
                'INSERT INTO museum_visitors (site_id, visitor_user_id) VALUES ($1, $2)',
                [siteId, req.user.id]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('friend.recordVisit error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ════════════════════════════════════════
// GET /api/friends/visitors
// 최근 방문자 목록
// ════════════════════════════════════════
exports.listVisitors = async (req, res) => {
    try {
        const mySite = await getUserSiteId(req.user.id);
        if (!mySite) {
            return res.json({ success: true, data: [] });
        }

        const { rows } = await db.query(
            `SELECT DISTINCT ON (mv.visitor_user_id)
                    mv.visited_at, u.id AS user_id, u.name, u.picture,
                    fs.subdomain AS visitor_subdomain
             FROM museum_visitors mv
             JOIN users u ON u.id = mv.visitor_user_id
             LEFT JOIN family_sites fs ON fs.user_id = u.id
             WHERE mv.site_id = $1
             ORDER BY mv.visitor_user_id, mv.visited_at DESC
             LIMIT 20`,
            [mySite.id]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('friend.listVisitors error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
