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

        if (!first_name || !last_name) {
            return res.status(400).json({ success: false, message: '성과 이름을 입력해주세요.' });
        }

        // 1. 이미 family_sites를 소유한 경우 체크
        const { rows: existingSite } = await client.query(
            'SELECT id, subdomain FROM family_sites WHERE user_id = $1 LIMIT 1', [userId]
        );
        if (existingSite.length > 0) {
            return res.status(400).json({
                success: false,
                message: '이미 박물관이 있습니다.',
                subdomain: existingSite[0].subdomain,
            });
        }

        // 2. subdomain 자동 생성 (§26-1-1: 성씨영문 + 순번)
        const baseSlug = (surname_en || last_name || 'user')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 10) || 'user';

        let finalSubdomain = null;
        for (let seq = 1; seq <= 999; seq++) {
            const candidate = `${baseSlug}-${seq}`;
            const { rows: check } = await client.query(
                'SELECT id FROM family_sites WHERE subdomain = $1', [candidate]
            );
            if (check.length === 0) { finalSubdomain = candidate; break; }
        }
        if (!finalSubdomain) throw new Error('subdomain 자동 생성 실패');

        // 3. families 레코드 생성
        const adminKey = 'ORG-FM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
        const familyName = name || `${last_name}${first_name} 가족`;

        const { rows: familyRows } = await client.query(
            `INSERT INTO families (name, admin_user_id, admin_key, subdomain, bon_gwan, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             RETURNING id, name, admin_key, subdomain, bon_gwan`,
            [familyName, userId, adminKey, finalSubdomain, bon_gwan?.trim() || null]
        );
        const family = familyRows[0];

        // 4. family_sites 레코드 생성
        const { rows: siteRows } = await client.query(
            `INSERT INTO family_sites (user_id, subdomain, title, bon_gwan)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [userId, finalSubdomain, familyName, bon_gwan?.trim() || null]
        );
        const siteId = siteRows[0].id;

        // 5. 부(父) person 생성 (ghost)
        let fatherPersonId = null;
        if (father_first_name?.trim() && father_last_name?.trim()) {
            const fName = `${father_last_name.trim()}${father_first_name.trim()}`;
            const { rows: fRows } = await client.query(
                `INSERT INTO persons (site_id, name, first_name, last_name, gender, match_status)
                 VALUES ($1, $2, $3, $4, 'M', 'ghost') RETURNING id`,
                [siteId, fName, father_first_name.trim(), father_last_name.trim()]
            );
            fatherPersonId = fRows[0].id;
        }

        // 6. 모(母) person 생성 (ghost)
        let motherPersonId = null;
        if (mother_first_name?.trim() && mother_last_name?.trim()) {
            const mName = `${mother_last_name.trim()}${mother_first_name.trim()}`;
            const { rows: mRows } = await client.query(
                `INSERT INTO persons (site_id, name, first_name, last_name, gender, match_status)
                 VALUES ($1, $2, $3, $4, 'F', 'ghost') RETURNING id`,
                [siteId, mName, mother_first_name.trim(), mother_last_name.trim()]
            );
            motherPersonId = mRows[0].id;
        }

        // 7. 관장(본인) person 생성 (linked)
        const curatorName = `${last_name.trim()}${first_name.trim()}`;
        await client.query(
            `INSERT INTO persons
               (site_id, name, first_name, last_name, gender, birth_date, birth_lunar,
                user_id, parent1_id, parent2_id, match_status, bon_gwan, name_en,
                father_first_name, father_last_name, mother_first_name, mother_last_name)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'linked',$11,$12,$13,$14,$15,$16)`,
            [
                siteId, curatorName, first_name.trim(), last_name.trim(),
                curator_gender || null, birth_date || null, birth_lunar || false,
                userId, fatherPersonId, motherPersonId,
                bon_gwan?.trim() || null, name_en || null,
                father_first_name?.trim() || null, father_last_name?.trim() || null,
                mother_first_name?.trim() || null, mother_last_name?.trim() || null,
            ]
        );

        // 8. users 테이블 업데이트
        await client.query(
            "UPDATE users SET family_id = $1, role = 'admin' WHERE id = $2",
            [family.id, userId]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            subdomain: finalSubdomain,
            data: { ...family, subdomain: finalSubdomain, site_id: siteId },
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('createFamily Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create family' });
    } finally {
        client.release();
    }
};

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
