const db = require('../config/db');
const crypto = require('crypto');

// @desc    Create a new family (대표자가 가족 생성)
// @route   POST /api/family
exports.createFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, subdomain } = req.body;

        // 이미 가족에 소속된 경우 체크
        const { rows: existing } = await db.query(
            'SELECT family_id FROM users WHERE id = $1', [userId]
        );
        if (existing[0]?.family_id) {
            return res.status(400).json({ success: false, message: 'You already belong to a family' });
        }

        // subdomain 중복 체크
        if (subdomain) {
            const { rows: domainCheck } = await db.query(
                'SELECT id FROM families WHERE subdomain = $1', [subdomain]
            );
            if (domainCheck.length > 0) {
                return res.status(400).json({ success: false, message: 'Subdomain already taken' });
            }
        }

        // admin_key 생성
        const adminKey = 'ORG-FM-' + crypto.randomBytes(3).toString('hex').toUpperCase();

        // 대표자의 drive token 가져오기
        const { rows: userRows } = await db.query(
            'SELECT google_drive_token FROM users WHERE id = $1', [userId]
        );
        const driveToken = userRows[0]?.google_drive_token || null;

        // families 생성
        const { rows } = await db.query(
            `INSERT INTO families (name, admin_user_id, admin_key, subdomain, google_drive_token)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, admin_key, subdomain, created_at`,
            [name || 'My Family', userId, adminKey, subdomain || null, driveToken]
        );

        const family = rows[0];

        // 대표자를 admin으로 연결
        await db.query(
            'UPDATE users SET family_id = $1, role = $2 WHERE id = $3',
            [family.id, 'admin', userId]
        );

        res.json({ success: true, data: family });
    } catch (error) {
        console.error('createFamily Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create family' });
    }
};

// @desc    Join a family via admin_key (게스트/멤버 가입)
// @route   POST /api/family/join
exports.joinFamily = async (req, res) => {
    try {
        const userId = req.user.id;
        const { admin_key } = req.body;

        if (!admin_key) {
            return res.status(400).json({ success: false, message: 'Admin key required' });
        }

        // 이미 가족에 소속된 경우
        const { rows: existing } = await db.query(
            'SELECT family_id FROM users WHERE id = $1', [userId]
        );
        if (existing[0]?.family_id) {
            return res.status(400).json({ success: false, message: 'You already belong to a family' });
        }

        // admin_key로 가족 찾기
        const { rows: familyRows } = await db.query(
            'SELECT id, name, subdomain FROM families WHERE admin_key = $1 AND status = $2',
            [admin_key, 'active']
        );
        if (familyRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired family key' });
        }

        const family = familyRows[0];

        // member로 연결
        await db.query(
            'UPDATE users SET family_id = $1, role = $2 WHERE id = $3',
            [family.id, 'member', userId]
        );

        res.json({
            success: true,
            data: { family_id: family.id, family_name: family.name, subdomain: family.subdomain }
        });
    } catch (error) {
        console.error('joinFamily Error:', error);
        res.status(500).json({ success: false, message: 'Failed to join family' });
    }
};

// @desc    Get my family info
// @route   GET /api/family/me
exports.getMyFamily = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows: userRows } = await db.query(
            'SELECT family_id, role FROM users WHERE id = $1', [userId]
        );

        if (!userRows[0]?.family_id) {
            return res.json({ success: true, data: null });
        }

        const familyId = userRows[0].family_id;
        const myRole = userRows[0].role;

        // 가족 정보
        const { rows: familyRows } = await db.query(
            `SELECT f.id, f.name, f.admin_key, f.subdomain, f.plan, f.status, f.created_at,
                    u.name as admin_name, u.email as admin_email
             FROM families f
             JOIN users u ON f.admin_user_id = u.id
             WHERE f.id = $1`,
            [familyId]
        );

        // 가족 구성원 목록
        const { rows: members } = await db.query(
            `SELECT id, name, email, avatar_url, role, created_at
             FROM users WHERE family_id = $1 ORDER BY role, name`,
            [familyId]
        );

        // admin이 아니면 admin_key 숨기기
        const family = familyRows[0];
        if (myRole !== 'admin') {
            delete family.admin_key;
        }

        res.json({
            success: true,
            data: { ...family, my_role: myRole, members }
        });
    } catch (error) {
        console.error('getMyFamily Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get family info' });
    }
};

// @desc    Update member role (admin only)
// @route   PUT /api/family/members/:userId/role
exports.updateMemberRole = async (req, res) => {
    try {
        const adminId = req.user.id;
        const targetUserId = req.params.userId;
        const { role } = req.body;

        if (!['member', 'guest'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be member or guest' });
        }

        // 요청자가 admin인지 확인
        const { rows: adminRows } = await db.query(
            `SELECT u.family_id FROM users u
             JOIN families f ON u.family_id = f.id AND f.admin_user_id = u.id
             WHERE u.id = $1`,
            [adminId]
        );
        if (adminRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admin can change roles' });
        }

        const familyId = adminRows[0].family_id;

        // 대상이 같은 가족인지 확인
        const { rows: targetRows } = await db.query(
            'SELECT family_id FROM users WHERE id = $1', [targetUserId]
        );
        if (targetRows[0]?.family_id !== familyId) {
            return res.status(404).json({ success: false, message: 'User not in your family' });
        }

        await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, targetUserId]);
        res.json({ success: true, message: 'Role updated' });
    } catch (error) {
        console.error('updateMemberRole Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};

// @desc    Sync admin's Drive token to family (Drive 연결/갱신 시 호출)
// @route   POST /api/family/sync-drive
exports.syncDriveToken = async (req, res) => {
    try {
        const userId = req.user.id;

        // admin인지 확인
        const { rows } = await db.query(
            `SELECT f.id as family_id, u.google_drive_token
             FROM users u
             JOIN families f ON u.family_id = f.id AND f.admin_user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admin can sync Drive token' });
        }

        // 대표자의 최신 drive token을 families에 복사
        await db.query(
            'UPDATE families SET google_drive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [rows[0].google_drive_token, rows[0].family_id]
        );

        res.json({ success: true, message: 'Drive token synced to family' });
    } catch (error) {
        console.error('syncDriveToken Error:', error);
        res.status(500).json({ success: false, message: 'Failed to sync Drive token' });
    }
};
