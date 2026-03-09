const db = require('../config/db');

// @desc    Scan for duplicate photos by dHash
// @route   POST /api/scan/duplicates
exports.scanDuplicates = async (req, res) => {
    try {
        const userId = req.user.id;
        const { source_folder } = req.body; // client-side folder path (for reference)

        // Find all photos with matching dHash (groups of 2+)
        const { rows } = await db.query(
            `SELECT dhash, json_agg(
                json_build_object(
                    'id', id, 'filename', filename, 'original_name', original_name,
                    'file_size', file_size, 'taken_at', taken_at,
                    'drive_file_id', drive_file_id, 'drive_thumbnail_id', drive_thumbnail_id
                ) ORDER BY file_size DESC
             ) AS photos, COUNT(*) AS count
             FROM photos
             WHERE user_id = $1 AND dhash IS NOT NULL
             GROUP BY dhash
             HAVING COUNT(*) > 1
             ORDER BY count DESC`,
            [userId]
        );

        const totalDuplicates = rows.reduce((sum, g) => sum + (g.count - 1), 0);

        res.json({
            success: true,
            data: {
                groups: rows,
                total_groups: rows.length,
                total_duplicates: totalDuplicates,
                source_folder: source_folder || null,
            },
        });
    } catch (error) {
        console.error('scanDuplicates Error:', error);
        res.status(500).json({ success: false, message: 'Failed to scan duplicates' });
    }
};

// @desc    Bulk delete duplicate photos
// @route   POST /api/scan/duplicates/delete
exports.deleteDuplicates = async (req, res) => {
    try {
        const userId = req.user.id;
        const { photo_ids } = req.body;

        if (!photo_ids || !Array.isArray(photo_ids) || photo_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'photo_ids[] required' });
        }

        const { rowCount } = await db.query(
            `DELETE FROM photos WHERE id = ANY($1) AND user_id = $2`,
            [photo_ids, userId]
        );

        res.json({
            success: true,
            message: `${rowCount} duplicate photos deleted`,
            deleted: rowCount,
        });
    } catch (error) {
        console.error('deleteDuplicates Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete duplicates' });
    }
};

// @desc    Copy selected photos to a target folder/album
// @route   POST /api/scan/duplicates/copy
exports.copyToFolder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { photo_ids, target_album_name } = req.body;

        if (!photo_ids || !target_album_name) {
            return res.status(400).json({ success: false, message: 'photo_ids[] and target_album_name required' });
        }

        // Create or find target album
        let album = await db.query(
            `SELECT id FROM albums WHERE user_id = $1 AND name = $2`,
            [userId, target_album_name]
        );

        if (album.rows.length === 0) {
            album = await db.query(
                `INSERT INTO albums (user_id, name, type) VALUES ($1, $2, 'duplicate_copy') RETURNING id`,
                [userId, target_album_name]
            );
        }

        const albumId = album.rows[0].id;
        let added = 0;
        for (const photoId of photo_ids) {
            try {
                await db.query(
                    `INSERT INTO photo_albums (photo_id, album_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [photoId, albumId]
                );
                added++;
            } catch (e) { /* skip */ }
        }

        await db.query(
            `UPDATE albums SET photo_count = (SELECT COUNT(*) FROM photo_albums WHERE album_id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [albumId]
        );

        res.json({ success: true, album_id: albumId, copied: added });
    } catch (error) {
        console.error('copyToFolder Error:', error);
        res.status(500).json({ success: false, message: 'Failed to copy photos' });
    }
};

// @desc    Get scan report (summary stats)
// @route   GET /api/scan/report
exports.getScanReport = async (req, res) => {
    try {
        const userId = req.user.id;

        const totalResult = await db.query(
            `SELECT COUNT(*) AS total FROM photos WHERE user_id = $1`, [userId]
        );

        const dupResult = await db.query(
            `SELECT COUNT(*) AS dup_count FROM (
                SELECT dhash FROM photos WHERE user_id = $1 AND dhash IS NOT NULL
                GROUP BY dhash HAVING COUNT(*) > 1
             ) sub`, [userId]
        );

        const faceResult = await db.query(
            `SELECT COUNT(DISTINCT name) AS face_count FROM albums WHERE user_id = $1 AND type = 'face'`, [userId]
        );

        const sizeResult = await db.query(
            `SELECT COALESCE(SUM(file_size), 0) AS total_size FROM photos WHERE user_id = $1`, [userId]
        );

        res.json({
            success: true,
            data: {
                total_photos: parseInt(totalResult.rows[0].total),
                duplicate_groups: parseInt(dupResult.rows[0].dup_count),
                faces_classified: parseInt(faceResult.rows[0].face_count),
                total_size_bytes: parseInt(sizeResult.rows[0].total_size),
            },
        });
    } catch (error) {
        console.error('getScanReport Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get report' });
    }
};

// @desc    Classify photos by face to a named folder
// @route   POST /api/scan/face-classify
exports.faceClassify = async (req, res) => {
    try {
        const userId = req.user.id;
        const { photo_ids, folder_name } = req.body;

        if (!photo_ids || !folder_name) {
            return res.status(400).json({ success: false, message: 'photo_ids[] and folder_name required' });
        }

        // Create or find face album
        let album = await db.query(
            `SELECT id FROM albums WHERE user_id = $1 AND name = $2 AND type = 'face'`,
            [userId, folder_name]
        );

        if (album.rows.length === 0) {
            album = await db.query(
                `INSERT INTO albums (user_id, name, type) VALUES ($1, $2, 'face') RETURNING id`,
                [userId, folder_name]
            );
        }

        const albumId = album.rows[0].id;
        let added = 0;
        for (const photoId of photo_ids) {
            try {
                await db.query(
                    `INSERT INTO photo_albums (photo_id, album_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [photoId, albumId]
                );
                added++;
            } catch (e) { /* skip */ }
        }

        await db.query(
            `UPDATE albums SET photo_count = (SELECT COUNT(*) FROM photo_albums WHERE album_id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [albumId]
        );

        res.json({ success: true, album_id: albumId, folder_name: folder_name, classified: added });
    } catch (error) {
        console.error('faceClassify Error:', error);
        res.status(500).json({ success: false, message: 'Failed to classify photos' });
    }
};
