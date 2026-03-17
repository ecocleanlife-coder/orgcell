const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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
