const db = require('../config/db');
const { generateOcId, resolveCountryCode } = require('../utils/ocIdGenerator');
const { assignCuratorPath } = require('../services/pathAssigner');
const { assignSubdomain, rollbackSeqCounter } = require('../services/subdomainAssigner');

// @desc    Create family site + 관장 person 자동 생성 (OPS §26)
// @route   POST /api/sites
// body: { surname_ko, bon_gwan_ko?, given_name, nationality?, surname_en?,
//         curator_gender?, birth_date?, birth_lunar?, bio1?, bio2?, bio3?,
//         name_other?: [{name,type},...], subdomain? (레거시 — 미전달 시 자동배정) }
exports.createSite = async (req, res) => {
    const { surname_ko, bon_gwan_ko, given_name, nationality = 'KR', surname_en,
            theme = 'modern', curator_gender, birth_date, birth_lunar,
            bio1, bio2, bio3, name_other, name_en } = req.body;
    let { subdomain } = req.body;
    const userId = req.user.id;

    // 이름 기반 자동배정 (§26-1-1)
    if (!subdomain) {
        if (!surname_ko && !surname_en) {
            return res.status(400).json({ success: false, message: 'surname_ko 또는 surname_en 필수' });
        }
        try {
            subdomain = await assignSubdomain({ surnameKo: surname_ko, bonGwanKo: bon_gwan_ko || null, surnameEn: surname_en || null, nationality });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Subdomain 배정 실패: ' + err.message });
        }
    }

    // 서브도메인 형식 검증 (자동배정 포함: LEE006-1 허용)
    const subdomainRegex = /^[a-zA-Z0-9-]{2,40}$/;
    if (!subdomainRegex.test(subdomain)) {
        return res.status(400).json({ success: false, message: 'Invalid subdomain format' });
    }
    subdomain = subdomain.toLowerCase();

    // 예약어 차단
    const reserved = ['admin', 'api', 'www', 'demo', 'test', 'orgcell', 'mail', 'ftp', 'smtp', 'pop', 'imap'];
    if (reserved.includes(subdomain)) {
        return res.status(400).json({ success: false, message: 'This subdomain is reserved' });
    }

    // 관장 이름 조합 (§27: 성/이름 분리 저장)
    const curator_name = surname_ko && given_name
        ? `${surname_ko}${given_name}`
        : given_name || surname_ko || subdomain;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 중복 체크: 다른 유저 사이트 → 409, 같은 유저 사이트 → upsert
        const dup = await client.query(
            `SELECT id, user_id FROM family_sites WHERE subdomain = $1`,
            [subdomain.toLowerCase()]
        );
        if (dup.rows.length > 0 && dup.rows[0].user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Subdomain already taken' });
        }

        // 1. family_sites 저장 (같은 유저면 status만 active 업데이트)
        let site;
        if (dup.rows.length > 0) {
            const { rows: siteRows } = await client.query(
                `UPDATE family_sites SET status = 'active', theme = $1 WHERE id = $2 RETURNING *`,
                [theme, dup.rows[0].id]
            );
            site = siteRows[0];
        } else {
            const { rows: siteRows } = await client.query(
                `INSERT INTO family_sites (user_id, subdomain, theme, status)
                 VALUES ($1, $2, $3, 'active')
                 RETURNING *`,
                [userId, subdomain.toLowerCase(), theme]
            );
            site = siteRows[0];
        }

        // 2. 관장 person 생성 (OPS §26-2) — 기존 persons 스키마 호환
        //    같은 유저 재시도 시 기존 관장 person이 있으면 스킵
        const existingCurator = await client.query(
            `SELECT id, person_id FROM persons WHERE site_id = $1 AND match_status = 'linked' LIMIT 1`,
            [site.id]
        );

        let curatorIntId, curatorPersonId;

        if (existingCurator.rows.length > 0) {
            curatorIntId    = existingCurator.rows[0].id;
            curatorPersonId = existingCurator.rows[0].person_id;
        } else {
            const lang = req.headers['accept-language'] || 'ko';
            const geo  = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'KR';
            const countryCode = resolveCountryCode(lang, geo);
            curatorPersonId = await generateOcId(client, countryCode);

            const nameOtherJson = Array.isArray(name_other) ? JSON.stringify(name_other) : '[]';
            const { rows: personRows } = await client.query(
                `INSERT INTO persons
                   (site_id, name, name_en, gender, oc_id, person_id, nationality, match_status, user_id,
                    birth_date, birth_lunar, bio1, bio2, bio3,
                    name_legal_last, name_legal_first, name_other)
                 VALUES ($1, $2, $3, $4, $5, $5, $6, 'linked', $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 RETURNING id`,
                [site.id, curator_name, name_en || null, curator_gender || null,
                 curatorPersonId, countryCode, userId,
                 birth_date || null, !!birth_lunar,
                 bio1 || null, bio2 || null, bio3 || null,
                 surname_ko || null, given_name || null, nameOtherJson]
            );
            curatorIntId = personRows[0]?.id;

            // 3. 관장 canonical path 배정: {subdomain}
            await assignCuratorPath(client, curatorPersonId, subdomain.toLowerCase());
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            data: {
                ...site,
                url: `https://orgcell.com/${subdomain.toLowerCase()}`,
                curator_person_id: curatorPersonId,
                curator_int_id: curatorIntId,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        // seq_counter 원복 — assignSubdomain은 별도 트랜잭션이므로 수동 롤백
        if (subdomain) await rollbackSeqCounter(subdomain);
        console.error('createSite Error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create site: ' + error.message });
    } finally {
        client.release();
    }
};

// @desc    Get user's family site
// @route   GET /api/sites/mine
exports.getMySite = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.query(
            `SELECT * FROM family_sites WHERE user_id = $1`, [userId]
        );

        // If no owned site, check if user is a member of someone else's site
        if (rows.length === 0) {
            const joined = await db.query(
                `SELECT fs.* FROM family_sites fs
                 JOIN site_members sm ON sm.site_id = fs.id
                 WHERE sm.user_id = $1 LIMIT 1`,
                [userId]
            );
            if (!joined.rows.length) return res.json({ success: true, data: null });
            const joinedSite = joined.rows[0];
            return res.json({
                success: true,
                data: { ...joinedSite, url: `https://orgcell.com/${joinedSite.subdomain}`, folders: [], role: 'member' },
            });
        }

        const site = rows[0];

        // Get folder structure (graceful if table not yet created)
        let folders = [];
        try {
            const fResult = await db.query(
                `SELECT * FROM site_folders WHERE site_id = $1 ORDER BY sort_order`, [site.id]
            );
            folders = fResult.rows;
        } catch {
            // site_folders table may not exist yet
        }

        res.set({ 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' });
        res.json({
            success: true,
            data: {
                ...site,
                url: `https://orgcell.com/${site.subdomain}`,
                folders,
            },
        });
    } catch (error) {
        console.error('getMySite Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get site' });
    }
};

// @desc    Create folder in family site (family tree structure)
// @route   POST /api/sites/:siteId/folders
exports.createFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const { name, label, parent_id, is_shared = false, password } = req.body;

        // Verify site ownership
        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (site.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        const { rows } = await db.query(
            `INSERT INTO site_folders (site_id, name, label, parent_id, is_shared, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [siteId, name, label || name, parent_id || null, is_shared,
             password ? require('bcryptjs').hashSync(password, 10) : null]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createFolder Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
};

// @desc    Get folder contents (photos, videos, audio)
// @route   GET /api/sites/:siteId/folders/:folderId/media
exports.getFolderMedia = async (req, res) => {
    try {
        const { siteId, folderId } = req.params;
        const { password } = req.query;

        // Check folder access
        const folder = await db.query(
            `SELECT f.*, s.user_id FROM site_folders f
             JOIN family_sites s ON f.site_id = s.id
             WHERE f.id = $1 AND f.site_id = $2`,
            [folderId, siteId]
        );

        if (folder.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Folder not found' });
        }

        const folderData = folder.rows[0];

        // If not shared, check ownership
        if (!folderData.is_shared) {
            if (!req.user || req.user.id !== folderData.user_id) {
                return res.status(403).json({ success: false, message: 'Private folder' });
            }
        }

        // If password protected, verify
        if (folderData.password_hash && password) {
            const match = require('bcryptjs').compareSync(password, folderData.password_hash);
            if (!match) {
                return res.status(401).json({ success: false, message: 'Wrong password' });
            }
        }

        const { rows } = await db.query(
            `SELECT * FROM site_media
             WHERE folder_id = $1
             ORDER BY sort_order, created_at DESC`,
            [folderId]
        );

        res.json({ success: true, folder: folderData, data: rows });
    } catch (error) {
        console.error('getFolderMedia Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get folder media' });
    }
};

// @desc    Upload media to folder (photo, video, audio, artwork)
// @route   POST /api/sites/:siteId/folders/:folderId/media
exports.addMedia = async (req, res) => {
    try {
        const userId = req.user.id;
        const { siteId, folderId } = req.params;
        const { filename, media_type, file_size, drive_file_id, thumbnail_url, title } = req.body;

        // Verify ownership
        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (site.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        // Check photo limit
        const countResult = await db.query(
            `SELECT COUNT(*) FROM site_media sm
             JOIN site_folders sf ON sm.folder_id = sf.id
             WHERE sf.site_id = $1`,
            [siteId]
        );
        const currentCount = parseInt(countResult.rows[0].count);
        const siteData = await db.query(`SELECT photo_limit FROM family_sites WHERE id = $1`, [siteId]);
        const limit = siteData.rows[0]?.photo_limit || 2000;

        if (currentCount >= limit) {
            return res.status(403).json({
                success: false,
                message: `Photo limit reached (${limit}). Purchase additional storage.`,
            });
        }

        const { rows } = await db.query(
            `INSERT INTO site_media (folder_id, filename, media_type, file_size, drive_file_id, thumbnail_url, title)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [folderId, filename, media_type || 'photo', file_size, drive_file_id, thumbnail_url, title]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('addMedia Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to add media' });
    }
};

// @desc    List site members
// @route   GET /api/sites/:siteId/members
exports.listMembers = async (req, res) => {
    try {
        const { siteId } = req.params;
        const userId = req.user.id;

        // 오너 확인 — 404로 통일하여 사이트 존재 여부 노출 방지 (CWE-200)
        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (!site.rows.length) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const { rows } = await db.query(
            `SELECT sm.id, sm.user_id, sm.role, sm.joined_at, u.name, u.email
             FROM site_members sm
             JOIN users u ON u.id = sm.user_id
             WHERE sm.site_id = $1
             ORDER BY sm.joined_at ASC`,
            [siteId]
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listMembers error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to list members' });
    }
};

// @desc    Update member role
// @route   PUT /api/sites/:siteId/members/:memberId
exports.updateMemberRole = async (req, res) => {
    try {
        const { siteId, memberId } = req.params;
        const { role } = req.body;
        const userId = req.user.id;

        if (!['member', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (!site.rows.length) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        // memberId가 실제 이 siteId에 속하는지 사전 검증 (CWE-862)
        const member = await db.query(
            `SELECT id FROM site_members WHERE id = $1 AND site_id = $2`, [memberId, siteId]
        );
        if (!member.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        const { rows } = await db.query(
            `UPDATE site_members SET role = $1 WHERE id = $2 AND site_id = $3 RETURNING *`,
            [role, memberId, siteId]
        );
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('updateMemberRole error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};

// @desc    Remove member
// @route   DELETE /api/sites/:siteId/members/:memberId
exports.removeMember = async (req, res) => {
    try {
        const { siteId, memberId } = req.params;
        const userId = req.user.id;

        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (!site.rows.length) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        const { rowCount } = await db.query(
            `DELETE FROM site_members WHERE id = $1 AND site_id = $2`,
            [memberId, siteId]
        );
        if (rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        res.json({ success: true, message: 'Member removed' });
    } catch (err) {
        console.error('removeMember error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
};

// @desc    Update site settings (storage_type, etc.)
// @route   PATCH /api/sites/:siteId
exports.updateSite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { siteId } = req.params;
        const { storage_type } = req.body;

        // 소유자 확인
        const site = await db.query(
            `SELECT id FROM family_sites WHERE id = $1 AND user_id = $2`, [siteId, userId]
        );
        if (!site.rows.length) {
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        const allowed = ['google_drive', 'onedrive', 'orgcell'];
        if (storage_type && !allowed.includes(storage_type)) {
            return res.status(400).json({ success: false, message: 'Invalid storage type' });
        }

        const { rows } = await db.query(
            `UPDATE family_sites SET storage_type = COALESCE($1, storage_type), updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [storage_type, siteId]
        );

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('updateSite Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to update site' });
    }
};

// @desc    Register iCloud waitlist
// @route   POST /api/waitlist/icloud
exports.joinICloudWaitlist = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes('@')) {
            return res.status(400).json({ success: false, message: 'Valid email required' });
        }

        // 중복 체크
        const existing = await db.query(
            `SELECT id FROM icloud_waitlist WHERE email = $1`, [email.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.json({ success: true, message: 'Already registered' });
        }

        await db.query(
            `INSERT INTO icloud_waitlist (email) VALUES ($1)`, [email.toLowerCase()]
        );

        res.status(201).json({ success: true, message: 'Registered for iCloud waitlist' });
    } catch (error) {
        console.error('joinICloudWaitlist Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to join waitlist' });
    }
};

// @desc    Get pricing info
// @route   GET /api/sites/pricing
exports.getPricing = async (req, res) => {
    res.json({
        success: true,
        data: {
            plans: [
                { name: 'Cloud Free', photos: 'unlimited', price_per_year: 0, currency: 'USD', storage: 'Google Drive / OneDrive', recommended: true },
                { name: 'Server 1000', photos: 1000, price_per_year: 5, currency: 'USD', storage: 'Orgcell Server' },
                { name: 'Server Unlimited', photos: 'unlimited', price_per_year: 10, currency: 'USD', storage: 'Orgcell Server' },
            ],
            features: [
                'orgcell.com/yourfamily 주소',
                'Family tree folder structure',
                'Photo, video, audio, artwork storage',
                'Private & shared folders with password',
                'Slideshow per folder',
            ],
        },
    });
};

// @desc    Get public family site by subdomain
// @route   GET /api/sites/public/:subdomain
exports.getPublicSite = async (req, res) => {
    try {
        const { subdomain } = req.params;

        const site = await db.query(
            `SELECT id, subdomain, theme, created_at FROM family_sites
             WHERE subdomain = $1 AND status = 'active'`,
            [subdomain.toLowerCase()]
        );

        if (site.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Site not found' });
        }

        // Get only shared folders
        const folders = await db.query(
            `SELECT id, name, label, parent_id, is_shared FROM site_folders
             WHERE site_id = $1 AND is_shared = true
             ORDER BY sort_order`,
            [site.rows[0].id]
        );

        res.json({
            success: true,
            data: {
                ...site.rows[0],
                folders: folders.rows,
            },
        });
    } catch (error) {
        console.error('getPublicSite Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get site' });
    }
};
