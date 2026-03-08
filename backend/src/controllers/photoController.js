const db = require('../config/db');

// @desc    Get user's photos (metadata)
// @route   GET /api/photos
exports.getPhotos = async (req, res) => {
    try {
        const userId = req.user.id;
        const { album_id, limit = 50, offset = 0 } = req.query;

        let query = `SELECT id, filename, original_name, mime_type, file_size,
                            width, height, thumbnail_url, drive_file_id, drive_thumbnail_id,
                            taken_at, location, dhash, created_at
                     FROM photos WHERE user_id = $1`;
        const params = [userId];
        let idx = 2;

        if (album_id) {
            query = `SELECT p.id, p.filename, p.original_name, p.mime_type, p.file_size,
                            p.width, p.height, p.thumbnail_url, p.drive_file_id, p.drive_thumbnail_id,
                            p.taken_at, p.location, p.dhash, p.created_at
                     FROM photos p
                     JOIN photo_albums pa ON p.id = pa.photo_id
                     WHERE p.user_id = $1 AND pa.album_id = $${idx++}`;
            params.push(album_id);
        }

        query += ` ORDER BY taken_at DESC NULLS LAST, created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
        params.push(parseInt(limit), parseInt(offset));

        const { rows } = await db.query(query, params);

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM photos WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            data: rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset),
        });
    } catch (error) {
        console.error('getPhotos Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch photos' });
    }
};

// @desc    Upload photo metadata (actual file goes to Google Drive via BYOS)
// @route   POST /api/photos/upload
exports.uploadPhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            filename, original_name, mime_type, file_size,
            width, height, thumbnail_url,
            drive_file_id, drive_thumbnail_id,
            taken_at, location, dhash, metadata
        } = req.body;

        if (!filename || !drive_file_id) {
            return res.status(400).json({
                success: false,
                message: 'filename and drive_file_id are required'
            });
        }

        // Check duplicate by dhash
        if (dhash) {
            const existing = await db.query(
                `SELECT id, filename FROM photos WHERE user_id = $1 AND dhash = $2`,
                [userId, dhash]
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate photo detected',
                    duplicate_of: existing.rows[0].id,
                });
            }
        }

        const { rows } = await db.query(
            `INSERT INTO photos (user_id, filename, original_name, mime_type, file_size,
                                 width, height, thumbnail_url, drive_file_id, drive_thumbnail_id,
                                 taken_at, location, dhash, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             RETURNING *`,
            [userId, filename, original_name, mime_type, file_size,
             width, height, thumbnail_url, drive_file_id, drive_thumbnail_id,
             taken_at || null, location ? JSON.stringify(location) : null,
             dhash || null, metadata ? JSON.stringify(metadata) : null]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('uploadPhoto Error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }
};

// @desc    Delete photo
// @route   DELETE /api/photos/:id
exports.deletePhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const { rowCount } = await db.query(
            `DELETE FROM photos WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Photo not found' });
        }

        res.json({ success: true, message: 'Photo deleted' });
    } catch (error) {
        console.error('deletePhoto Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete photo' });
    }
};
