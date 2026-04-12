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
            name, subdomain, bon_gwan,
            first_name, last_name, curator_gender, birth_date, birth_lunar,
            father_last_name, father_first_name,
            mother_last_name, mother_first_name
        } = req.body;

        // 1. 이미 가족에 소속된 경우 체크
        const { rows: existing } = await client.query(
            "SELECT family_id FROM users WHERE id = $1", [userId]
        );
        if (existing[0]?.family_id) {
            return res.status(400).json({ success: false, message: "You already belong to a family" });
        }

        // 2. 가족(families) 레코드 생성 또는 기존 본관 가족에 연결
        let familyIdToUse = null;
        let familyToReturn = null;
        let createdNewFamily = false;

        if (bon_gwan && bon_gwan.trim()) {
            const { rows: existingBonGwanFamilies } = await client.query(
                "SELECT id, name, subdomain, bon_gwan FROM families WHERE bon_gwan ILIKE $1",
                [bon_gwan.trim()]
            );

            if (existingBonGwanFamilies.length > 0) {
                familyIdToUse = existingBonGwanFamilies[0].id;
                familyToReturn = existingBonGwanFamilies[0];
            } else {
                createdNewFamily = true;
            }
        } else {
            createdNewFamily = true;
        }

        if (createdNewFamily) {
            if (subdomain) {
                const { rows: domainCheck } = await client.query(
                    "SELECT id FROM families WHERE subdomain = $1", [subdomain]
                );
                if (domainCheck.length > 0) {
                    throw new Error("Subdomain already taken");
                }
            }
            const adminKey = "ORG-FM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
            const { rows: userRows } = await client.query(
                "SELECT google_drive_token FROM users WHERE id = $1", [userId]
            );
            const driveToken = userRows[0]?.google_drive_token || null;

            const { rows } = await client.query(
                `INSERT INTO families (name, admin_user_id, admin_key, subdomain, google_drive_token, bon_gwan)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, name, admin_key, subdomain, created_at, bon_gwan`,
                [name || "My Family", userId, adminKey, subdomain || null, driveToken, bon_gwan || null]
            );
            familyIdToUse = rows[0].id;
            familyToReturn = rows[0];
        }

        // 3. family_sites 레코드 생성
        const { rows: siteRows } = await client.query(
            `INSERT INTO family_sites (user_id, subdomain, site_name) 
             VALUES ($1, $2, $3)
             ON CONFLICT (subdomain) DO UPDATE SET site_name = EXCLUDED.site_name
             RETURNING id`,
            [userId, familyToReturn.subdomain, name]
        );
        const siteId = siteRows[0].id;

        // 4. 부모님 person 레코드 생성 (있을 경우)
        let fatherPersonId = null;
        if (father_first_name && father_last_name) {
            const { rows: fatherRows } = await client.query(
                `INSERT INTO persons (site_id, first_name, last_name, gender)
                 VALUES ($1, $2, $3, 'M')
                 RETURNING id`,
                [siteId, father_first_name, father_last_name]
            );
            fatherPersonId = fatherRows[0].id;
        }

        let motherPersonId = null;
        if (mother_first_name && mother_last_name) {
            const { rows: motherRows } = await client.query(
                `INSERT INTO persons (site_id, first_name, last_name, gender)
                 VALUES ($1, $2, $3, 'F')
                 RETURNING id`,
                [siteId, mother_first_name, mother_last_name]
            );
            motherPersonId = motherRows[0].id;
        }

        // 5. 본인(관장) person 레코드 생성
        const { rows: curatorRows } = await client.query(
            `INSERT INTO persons (site_id, first_name, last_name, gender, birth_date, birth_lunar, user_id, parent1_id, parent2_id, match_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'linked')
             RETURNING id`,
            [siteId, first_name, last_name, curator_gender, birth_date || null, birth_lunar || false, userId, fatherPersonId, motherPersonId]
        );
        const curatorPersonId = curatorRows[0].id;

        // 6. 대표자를 admin으로 연결
        await client.query(
            "UPDATE users SET family_id = $1, role = $2 WHERE id = $3",
            [familyIdToUse, "admin", userId]
        );
        
        await client.query('COMMIT');
        res.json({ success: true, data: familyToReturn });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("createFamily Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to create/join family" });
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
