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
