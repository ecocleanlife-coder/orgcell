const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { CLOUD_STORAGE_UNLIMITED } = require('../config/constants');

// GET /api/exhibitions/:id/photos
exports.listPhotos = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT * FROM exhibition_photos WHERE exhibition_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listPhotos error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/exhibitions/:id/photos  (multipart/form-data, field: photos[])
exports.uploadPhotos = async (req, res) => {
    try {
        const exhibitionId = req.params.id;
        const { visibility = 'private', set_cover = 'false' } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        // 무료 플랜 사진 수 제한 체크
        const { rows: subRows } = await db.query(
            `SELECT id FROM subscriptions WHERE email = $1 AND status = 'active' LIMIT 1`,
            [(req.user?.email || '').toLowerCase()]
        );
        const hasSubscription = subRows.length > 0;

        // 클라우드 저장소(Google Drive/OneDrive) 사용자는 무료
        // Orgcell 서버 사용자는 $10/년 유료 플랜 (결제 연동 별도 구현 예정)
        // 장수 제한 체크 비활성화 — 유료 전환 후 구독 상태로 관리
        /*
        const userStorageType = req.user?.storage_type;
        const isCloudStorage = ['google', 'onedrive'].includes(userStorageType);

        if (!hasSubscription && !isCloudStorage) {
            const { rows: countRows } = await db.query(
                `SELECT COUNT(*) AS total FROM exhibition_photos WHERE uploaded_by = $1`,
                [userId]
            );
            const currentCount = parseInt(countRows[0].total, 10);
            if (currentCount + files.length > FREE_PHOTO_LIMIT) {
                files.forEach(f => {
                    const fp = path.join(__dirname, '../../uploads/exhibitions', f.filename);
                    if (fs.existsSync(fp)) fs.unlinkSync(fp);
                });
                return res.status(403).json({
                    error: 'FREE_LIMIT_EXCEEDED',
                    message: 'Orgcell 서버는 유료입니다. $10/년으로 업그레이드하세요.',
                    upgradeUrl: '/onboarding/storage',
                });
            }
        }
        */

        const vis = ['public', 'family', 'private'].includes(visibility) ? visibility : 'private';
        const isCover = set_cover === 'true';
        const userId = req.user?.id || null;

        // If setting cover, unset existing cover first
        if (isCover) {
            await db.query(
                `UPDATE exhibition_photos SET is_cover = FALSE WHERE exhibition_id = $1`,
                [exhibitionId]
            );
        }

        const inserted = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const url = `/uploads/exhibitions/${file.filename}`;
            const shouldBeCover = isCover && i === 0;

            const { rows } = await db.query(
                `INSERT INTO exhibition_photos
                 (exhibition_id, uploaded_by, filename, original_name, mime_type, file_size, visibility, is_cover, url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [exhibitionId, userId, file.filename, file.originalname, file.mimetype,
                 file.size, vis, shouldBeCover, url]
            );
            inserted.push(rows[0]);
        }

        // Update photo_count on exhibitions table
        await db.query(
            `UPDATE exhibitions SET photo_count = (
                SELECT COUNT(*) FROM exhibition_photos WHERE exhibition_id = $1
            ), updated_at = NOW()
            WHERE id = $1`,
            [exhibitionId]
        );

        // Set cover_photo URL on exhibitions if requested
        if (isCover && inserted.length > 0) {
            await db.query(
                `UPDATE exhibitions SET cover_photo = $1 WHERE id = $2`,
                [inserted[0].url, exhibitionId]
            );
        }

        res.status(201).json({ success: true, data: inserted });
    } catch (err) {
        console.error('uploadPhotos error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/exhibitions/:id/photos/move  { photo_ids: [...], target_exhibition_id: X }
exports.movePhotos = async (req, res) => {
    try {
        const sourceId = req.params.id;
        const { photo_ids, target_exhibition_id } = req.body;

        if (!photo_ids?.length || !target_exhibition_id) {
            return res.status(400).json({ success: false, message: 'photo_ids and target_exhibition_id required' });
        }

        // 대상 전시관 존재 확인
        const { rows: targetRows } = await db.query(`SELECT id FROM exhibitions WHERE id = $1`, [target_exhibition_id]);
        if (!targetRows.length) {
            return res.status(404).json({ success: false, message: 'Target exhibition not found' });
        }

        // 사진 이동
        await db.query(
            `UPDATE exhibition_photos SET exhibition_id = $1, is_cover = FALSE WHERE id = ANY($2::int[]) AND exhibition_id = $3`,
            [target_exhibition_id, photo_ids, sourceId]
        );

        // 양쪽 photo_count 업데이트
        await db.query(
            `UPDATE exhibitions SET photo_count = (SELECT COUNT(*) FROM exhibition_photos WHERE exhibition_id = $1), updated_at = NOW() WHERE id = $1`,
            [sourceId]
        );
        await db.query(
            `UPDATE exhibitions SET photo_count = (SELECT COUNT(*) FROM exhibition_photos WHERE exhibition_id = $1), updated_at = NOW() WHERE id = $1`,
            [target_exhibition_id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('movePhotos error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/exhibitions/:id/photos/:photoId
exports.deletePhoto = async (req, res) => {
    try {
        const { id: exhibitionId, photoId } = req.params;

        const { rows } = await db.query(
            `SELECT * FROM exhibition_photos WHERE id = $1 AND exhibition_id = $2`,
            [photoId, exhibitionId]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Photo not found' });

        const photo = rows[0];

        // Delete file from disk
        const filePath = path.join(__dirname, '../../uploads/exhibitions', photo.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await db.query(`DELETE FROM exhibition_photos WHERE id = $1`, [photoId]);

        // Update photo_count
        await db.query(
            `UPDATE exhibitions SET photo_count = (
                SELECT COUNT(*) FROM exhibition_photos WHERE exhibition_id = $1
            ), updated_at = NOW() WHERE id = $1`,
            [exhibitionId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('deletePhoto error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
