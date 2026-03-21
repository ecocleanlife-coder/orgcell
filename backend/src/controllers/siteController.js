const db = require('../config/db');

// @desc    Create family site
// @route   POST /api/sites
exports.createSite = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subdomain, theme = 'modern' } = req.body;

        if (!subdomain || subdomain.length < 3) {
            return res.status(400).json({ success: false, message: 'Subdomain required (min 3 chars)' });
        }

        // 서브도메인 형식 검증 (CWE-20)
        const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,29}[a-z0-9]$/;
        if (!subdomainRegex.test(subdomain.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Invalid subdomain format' });
        }

        // 예약어 차단
        const reserved = ['admin', 'api', 'www', 'demo', 'test', 'orgcell', 'mail', 'ftp', 'smtp', 'pop', 'imap'];
        if (reserved.includes(subdomain.toLowerCase())) {
            return res.status(400).json({ success: false, message: 'This subdomain is reserved' });
        }

        // Check subdomain availability
        const existing = await db.query(
            `SELECT id FROM family_sites WHERE subdomain = $1`, [subdomain.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Subdomain already taken' });
        }

        const { rows } = await db.query(
            `INSERT INTO family_sites (user_id, subdomain, theme, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [userId, subdomain.toLowerCase(), theme]
        );

        res.status(201).json({
            success: true,
            data: {
                ...rows[0],
                url: `https://${subdomain.toLowerCase()}.orgcell.com`,
            },
        });
    } catch (error) {
        console.error('createSite Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to create site' });
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
                data: { ...joinedSite, url: `https://${joinedSite.subdomain}.orgcell.com`, folders: [], role: 'member' },
            });
        }

        const site = rows[0];

        // Get folder structure
        const folders = await db.query(
            `SELECT * FROM site_folders WHERE site_id = $1 ORDER BY sort_order`, [site.id]
        );

        res.json({
            success: true,
            data: {
                ...site,
                url: `https://${site.subdomain}.orgcell.com`,
                folders: folders.rows,
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

// @desc    Get pricing info
// @route   GET /api/sites/pricing
exports.getPricing = async (req, res) => {
    res.json({
        success: true,
        data: {
            plans: [
                { name: 'Basic', photos: 2000, price_per_year: 10, currency: 'USD' },
                { name: 'Extra 2000', photos: 2000, price: 10, type: 'addon', currency: 'USD' },
                { name: '10-Year Bundle', photos: 10000, price: 100, years: 10, currency: 'USD' },
            ],
            features: [
                'yourfamily.orgcell.com subdomain',
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
