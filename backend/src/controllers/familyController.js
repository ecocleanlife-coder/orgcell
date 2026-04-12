const db = require("../config/db");
const crypto = require("crypto");

// @desc    Create a new family (대표자가 가족 생성)
// @route   POST /api/family
exports.createFamily = async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user.id;
        const {
            name, bon_gwan, bon_gwan_id,
            first_name, last_name, curator_gender, birth_date, birth_lunar,
            father_last_name, father_first_name,
            mother_last_name, mother_first_name,
            surname_en, name_en,
        } = req.body;

        // 1. 이미 박물관(family_sites)을 소유한 경우 체크
        const { rows: existingSite } = await client.query(
            "SELECT id, subdomain FROM family_sites WHERE user_id = $1 LIMIT 1", [userId]
        );
        if (existingSite.length > 0) {
            return res.status(400).json({
                success: false,
                message: "이미 박물관이 있습니다.",
                subdomain: existingSite[0].subdomain,
            });
        }

        // 2. subdomain 자동 생성 (§26-1-1: 성씨영문 + 순번)
        //    surname_en 또는 last_name 로마자 변환 기반
        const baseSlug = (surname_en || last_name || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 10) || 'user';

        // 충돌 없는 순번 찾기
        let finalSubdomain = null;
        for (let seq = 1; seq <= 999; seq++) {
            const candidate = `${baseSlug}-${seq}`;
            const { rows: check } = await client.query(
                "SELECT id FROM family_sites WHERE subdomain = $1", [candidate]
            );
            if (check.length === 0) { finalSubdomain = candidate; break; }
        }
        if (!finalSubdomain) throw new Error("subdomain 자동 생성 실패");

        // 3. families 레코드 생성 (bon_gwan 저장, status='active')
        const adminKey = "ORG-FM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const { rows: userRows } = await client.query(
            "SELECT google_drive_token FROM users WHERE id = $1", [userId]
        );
        const driveToken = userRows[0]?.google_drive_token || null;

        const { rows: familyRows } = await client.query(
            `INSERT INTO families (name, admin_user_id, admin_key, subdomain, google_drive_token, bon_gwan, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active')
             RETURNING id, name, admin_key, subdomain, bon_gwan`,
            [name || `${last_name}${first_name} 가족`, userId, adminKey, finalSubdomain, driveToken, bon_gwan?.trim() || null]
        );
        const family = familyRows[0];

        // 4. family_sites 레코드 생성 (bon_gwan 함께 저장)
        const { rows: siteRows } = await client.query(
            `INSERT INTO family_sites (user_id, subdomain, site_name, bon_gwan)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [userId, finalSubdomain, name || `${last_name}${first_name} 가족`, bon_gwan?.trim() || null]
        );
        const siteId = siteRows[0].id;

        // 5. 부모님 person 레코드 생성 (match_status='ghost' — 직접 계정 없음)
        let fatherPersonId = null;
        if (father_first_name && father_last_name) {
            const { rows: fatherRows } = await client.query(
                `INSERT INTO persons (site_id, name, first_name, last_name, gender, match_status)
                 VALUES ($1, $2, $3, $4, 'M', 'ghost')
                 RETURNING id`,
                [siteId, `${father_last_name.trim()}${father_first_name.trim()}`, father_first_name.trim(), father_last_name.trim()]
            );
            fatherPersonId = fatherRows[0].id;
        }

        let motherPersonId = null;
        if (mother_first_name && mother_last_name) {
            const { rows: motherRows } = await client.query(
                `INSERT INTO persons (site_id, name, first_name, last_name, gender, match_status)
                 VALUES ($1, $2, $3, $4, 'F', 'ghost')
                 RETURNING id`,
                [siteId, `${mother_last_name.trim()}${mother_first_name.trim()}`, mother_first_name.trim(), mother_last_name.trim()]
            );
            motherPersonId = motherRows[0].id;
        }

        // 6. 본인(관장) person 레코드 생성 (bon_gwan 포함)
        const { rows: curatorRows } = await client.query(
            `INSERT INTO persons
               (site_id, name, first_name, last_name, gender, birth_date, birth_lunar,
                user_id, parent1_id, parent2_id, match_status, bon_gwan, name_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'linked', $11, $12)
             RETURNING id`,
            [
                siteId, `${last_name.trim()}${first_name.trim()}`,
                first_name.trim(), last_name.trim(),
                curator_gender, birth_date || null, birth_lunar || false,
                userId, fatherPersonId, motherPersonId,
                bon_gwan?.trim() || null,
                name_en || null,
            ]
        );

        // 7. family_sites.user_id 자동 연결 (authController와 동기화)
        await client.query(
            "UPDATE users SET family_id = $1, role = 'admin' WHERE id = $2",
            [family.id, userId]
        );

        await client.query('COMMIT');

        // OnboardingPage가 navigate(`/${subdomain}`) 하도록 subdomain 반환
        res.json({
            success: true,
            subdomain: finalSubdomain,
            data: { ...family, subdomain: finalSubdomain, site_id: siteId },
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("createFamily Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create family" });
    } finally {
        client.release();
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

        const { rows: existing } = await db.pool.query(
            'SELECT family_id FROM users WHERE id = $1', [userId]
        );
        if (existing[0]?.family_id) {
            return res.status(400).json({ success: false, message: 'You already belong to a family' });
        }

        const { rows: familyRows } = await db.pool.query(
            'SELECT id, name, subdomain FROM families WHERE admin_key = $1 AND status = $2',
            [admin_key, 'active']
        );
        if (familyRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid or expired family key' });
        }

        const family = familyRows[0];

        await db.pool.query(
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

        const { rows: userRows } = await db.pool.query(
            'SELECT family_id, role FROM users WHERE id = $1', [userId]
        );

        if (!userRows[0]?.family_id) {
            return res.json({ success: true, data: null });
        }

        const familyId = userRows[0].family_id;
        const myRole = userRows[0].role;

        const { rows: familyRows } = await db.pool.query(
            `SELECT f.id, f.name, f.admin_key, f.subdomain, f.plan, f.status, f.created_at,
                    u.name as admin_name, u.email as admin_email
             FROM families f
             JOIN users u ON f.admin_user_id = u.id
             WHERE f.id = $1`,
            [familyId]
        );

        const { rows: members } = await db.pool.query(
            `SELECT id, name, email, avatar_url, role, created_at
             FROM users WHERE family_id = $1 ORDER BY role, name`,
            [familyId]
        );

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

        const { rows: adminRows } = await db.pool.query(
            `SELECT u.family_id FROM users u
             JOIN families f ON u.family_id = f.id AND f.admin_user_id = u.id
             WHERE u.id = $1`,
            [adminId]
        );
        if (adminRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admin can change roles' });
        }

        const familyId = adminRows[0].family_id;

        const { rows: targetRows } = await db.pool.query(
            'SELECT family_id FROM users WHERE id = $1', [targetUserId]
        );
        if (targetRows[0]?.family_id !== familyId) {
            return res.status(404).json({ success: false, message: 'User not in your family' });
        }

        await db.pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, targetUserId]);
        res.json({ success: true, message: 'Role updated' });
    } catch (error) {
        console.error('updateMemberRole Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};

// @desc    Sync admin's Drive token to family
// @route   POST /api/family/sync-drive
exports.syncDriveToken = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.pool.query(
            `SELECT f.id as family_id, u.google_drive_token
             FROM users u
             JOIN families f ON u.family_id = f.id AND f.admin_user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only admin can sync Drive token' });
        }

        await db.pool.query(
            'UPDATE families SET google_drive_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [rows[0].google_drive_token, rows[0].family_id]
        );

        res.json({ success: true, message: 'Drive token synced to family' });
    } catch (error) {
        console.error('syncDriveToken Error:', error);
        res.status(500).json({ success: false, message: 'Failed to sync Drive token' });
    }
};
