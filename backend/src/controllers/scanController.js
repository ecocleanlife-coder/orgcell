const db = require('../config/db');
const smartSort = require('../services/smartSortService');

// In-memory job store for scan sessions (could be moved to DB/Redis later)
const scanJobs = new Map();

// @desc    Start a smart sort scan (Antigravity engine)
// @route   POST /api/scan/smart-sort/start
exports.startSmartSort = async (req, res) => {
    try {
        const userId = req.user.id;
        const { source_path, dest_path, dup_action, delete_small_images, include_small_in_search } = req.body;

        if (!source_path) {
            return res.status(400).json({ success: false, message: 'source_path required' });
        }

        const jobId = `${userId}_${Date.now()}`;
        const job = {
            id: jobId,
            userId,
            status: 'scanning',
            progress: 0,
            phase: 'init',
            message: 'Starting scan...',
            sourcePath: source_path,
            destPath: dest_path || null,
            options: {
                dupAction: dup_action || 'delete',
                deleteSmallImages: delete_small_images !== false,
                includeSmallInSearch: include_small_in_search === true,
            },
            results: null,
            startedAt: new Date(),
            completedAt: null,
        };

        scanJobs.set(jobId, job);

        // Run scan asynchronously
        smartSort.runSmartSort(source_path, dest_path, {
            dupAction: job.options.dupAction,
            deleteSmallImages: job.options.deleteSmallImages,
            includeSmallInSearch: job.options.includeSmallInSearch,
            onProgress: (p) => {
                job.phase = p.phase;
                job.message = p.message;
                job.progress = p.percent;
            },
        }).then((results) => {
            job.status = 'completed';
            job.progress = 100;
            job.results = results;
            job.completedAt = new Date();
        }).catch((err) => {
            job.status = 'error';
            job.message = err.message;
            console.error('SmartSort scan error:', err);
        });

        res.json({
            success: true,
            job_id: jobId,
            message: 'Scan started',
        });
    } catch (error) {
        console.error('startSmartSort Error:', error);
        res.status(500).json({ success: false, message: 'Failed to start scan' });
    }
};

// @desc    Get smart sort scan status/progress
// @route   GET /api/scan/smart-sort/status/:jobId
exports.getSmartSortStatus = async (req, res) => {
    try {
        const job = scanJobs.get(req.params.jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        // Verify ownership
        if (job.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const response = {
            success: true,
            data: {
                job_id: job.id,
                status: job.status,
                progress: job.progress,
                phase: job.phase,
                message: job.message,
                started_at: job.startedAt,
                completed_at: job.completedAt,
            },
        };

        // Include results only when completed
        if (job.status === 'completed' && job.results) {
            response.data.results = {
                total_scanned: job.results.totalScanned,
                duplicates_found: job.results.duplicatesFound,
                small_images_found: job.results.smallImagesFound,
                faces_detected: job.results.facesDetected,
                total_size_bytes: job.results.totalSizeBytes,
                saved_size_bytes: job.results.savedSizeBytes,
                errors: job.results.errors,
                timeline: job.results.timeline,
                duplicate_groups_count: job.results.duplicateGroups.length,
                small_images_count: job.results.smallImages.length,
            };
        }

        res.json(response);
    } catch (error) {
        console.error('getSmartSortStatus Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get status' });
    }
};

// @desc    Apply smart sort results (organize, dedup, cleanup)
// @route   POST /api/scan/smart-sort/apply
exports.applySmartSort = async (req, res) => {
    try {
        const job = scanJobs.get(req.body.job_id);
        if (!job || job.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (job.status !== 'completed' || !job.results) {
            return res.status(400).json({ success: false, message: 'Scan not completed yet' });
        }

        const { dest_path, dup_action, delete_small_images, move_mode, assigned_names } = req.body;
        const destPath = dest_path || job.destPath;

        if (!destPath) {
            return res.status(400).json({ success: false, message: 'dest_path required' });
        }

        job.status = 'applying';
        job.progress = 0;

        const result = await smartSort.applySmartSort(
            job.sourcePath, destPath, job.results,
            {
                dupAction: dup_action || job.options.dupAction,
                deleteSmallImages: delete_small_images !== undefined ? delete_small_images : job.options.deleteSmallImages,
                moveMode: move_mode || false,
                assignedNames: assigned_names || {},
                onProgress: (p) => {
                    job.phase = p.phase;
                    job.message = p.message;
                    job.progress = p.percent;
                },
            }
        );

        job.status = 'applied';
        job.progress = 100;

        res.json({
            success: true,
            data: {
                processed: result.processed,
                moved: result.moved,
                deleted: result.deleted,
                errors: result.errors,
                dest_path: destPath,
            },
        });
    } catch (error) {
        console.error('applySmartSort Error:', error);
        res.status(500).json({ success: false, message: 'Failed to apply sort' });
    }
};

// @desc    Get supported file extensions
// @route   GET /api/scan/smart-sort/extensions
exports.getSupportedExtensions = (req, res) => {
    res.json({
        success: true,
        data: {
            extensions: [...smartSort.SUPPORTED_EXTENSIONS],
            small_threshold_px: smartSort.SMALL_IMAGE_THRESHOLD,
        },
    });
};

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
