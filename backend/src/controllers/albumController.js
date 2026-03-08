const db = require('../config/db');

// @desc    Get user's albums
// @route   GET /api/albums
exports.getAlbums = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.query(
            `SELECT a.*,
                    (SELECT thumbnail_url FROM photos p
                     JOIN photo_albums pa ON p.id = pa.photo_id
                     WHERE pa.album_id = a.id
                     ORDER BY p.taken_at DESC NULLS LAST LIMIT 1) as cover_thumbnail
             FROM albums a
             WHERE a.user_id = $1
             ORDER BY a.updated_at DESC`,
            [userId]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getAlbums Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch albums' });
    }
};

// @desc    Get photos in album
// @route   GET /api/albums/:id/photos
exports.getAlbumPhotos = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Verify album ownership
        const album = await db.query(
            `SELECT id, name FROM albums WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        if (album.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Album not found' });
        }

        const { rows } = await db.query(
            `SELECT p.id, p.filename, p.original_name, p.thumbnail_url,
                    p.taken_at, p.width, p.height, p.created_at
             FROM photos p
             JOIN photo_albums pa ON p.id = pa.photo_id
             WHERE pa.album_id = $1 AND p.user_id = $2
             ORDER BY p.taken_at DESC NULLS LAST
             LIMIT $3 OFFSET $4`,
            [id, userId, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            album: album.rows[0],
            data: rows,
        });
    } catch (error) {
        console.error('getAlbumPhotos Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch album photos' });
    }
};

// @desc    Create album
// @route   POST /api/albums
exports.createAlbum = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type = 'manual' } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Album name required' });
        }

        const { rows } = await db.query(
            `INSERT INTO albums (user_id, name, type) VALUES ($1, $2, $3) RETURNING *`,
            [userId, name, type]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('createAlbum Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create album' });
    }
};

// @desc    Add photos to album
// @route   POST /api/albums/:id/photos
exports.addPhotosToAlbum = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { photo_ids } = req.body;

        if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'photo_ids[] required' });
        }

        // Verify album ownership
        const album = await db.query(
            `SELECT id FROM albums WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        if (album.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Album not found' });
        }

        let added = 0;
        for (const photoId of photo_ids) {
            try {
                await db.query(
                    `INSERT INTO photo_albums (photo_id, album_id) VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [photoId, id]
                );
                added++;
            } catch (e) {
                // skip invalid photo_ids
            }
        }

        // Update photo_count
        await db.query(
            `UPDATE albums SET photo_count = (
                SELECT COUNT(*) FROM photo_albums WHERE album_id = $1
             ), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );

        res.json({ success: true, message: `${added} photos added to album` });
    } catch (error) {
        console.error('addPhotosToAlbum Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add photos' });
    }
};
