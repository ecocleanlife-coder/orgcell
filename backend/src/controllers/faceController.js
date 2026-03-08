const db = require('../config/db');

// @desc    Register face descriptor (from client-side face-api.js)
// @route   POST /api/face/register
exports.registerFace = async (req, res) => {
    try {
        const userId = req.user.id;
        const { label, descriptor, photo_id, is_reference = false } = req.body;

        if (!label || !descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({
                success: false,
                message: 'label and descriptor (128-dim array) required'
            });
        }

        if (descriptor.length !== 128) {
            return res.status(400).json({
                success: false,
                message: 'descriptor must be 128-dimensional'
            });
        }

        // Auto-create person album if first registration for this label
        let albumResult = await db.query(
            `SELECT id FROM albums WHERE user_id = $1 AND name = $2 AND type = 'person'`,
            [userId, label]
        );

        let albumId;
        if (albumResult.rows.length === 0) {
            const newAlbum = await db.query(
                `INSERT INTO albums (user_id, name, type) VALUES ($1, $2, 'person') RETURNING id`,
                [userId, label]
            );
            albumId = newAlbum.rows[0].id;
        } else {
            albumId = albumResult.rows[0].id;
        }

        const { rows } = await db.query(
            `INSERT INTO face_descriptors (user_id, album_id, label, descriptor, photo_id, is_reference)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, label, album_id, is_reference`,
            [userId, albumId, label, descriptor, photo_id || null, is_reference]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('registerFace Error:', error);
        res.status(500).json({ success: false, message: 'Failed to register face' });
    }
};

// @desc    Get registered face labels (persons)
// @route   GET /api/face/labels
exports.getLabels = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.query(
            `SELECT label, album_id,
                    COUNT(*) as descriptor_count,
                    BOOL_OR(is_reference) as has_reference
             FROM face_descriptors
             WHERE user_id = $1
             GROUP BY label, album_id
             ORDER BY label`,
            [userId]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getLabels Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch labels' });
    }
};

// @desc    Get reference descriptors for matching (client downloads these to match locally)
// @route   GET /api/face/descriptors
exports.getDescriptors = async (req, res) => {
    try {
        const userId = req.user.id;

        const { rows } = await db.query(
            `SELECT id, label, descriptor, album_id
             FROM face_descriptors
             WHERE user_id = $1 AND is_reference = true
             ORDER BY label`,
            [userId]
        );

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getDescriptors Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch descriptors' });
    }
};

// @desc    Save face detection result (which faces found in a photo)
// @route   POST /api/face/detect-result
exports.saveDetectResult = async (req, res) => {
    try {
        const userId = req.user.id;
        const { photo_id, faces } = req.body;

        if (!photo_id || !faces || !Array.isArray(faces)) {
            return res.status(400).json({
                success: false,
                message: 'photo_id and faces[] required'
            });
        }

        // Verify photo ownership
        const photo = await db.query(
            `SELECT id FROM photos WHERE id = $1 AND user_id = $2`,
            [photo_id, userId]
        );
        if (photo.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Photo not found' });
        }

        const saved = [];
        for (const face of faces) {
            const { label, confidence, box, face_descriptor_id } = face;
            const { rows } = await db.query(
                `INSERT INTO photo_faces (photo_id, face_descriptor_id, label, confidence, box)
                 VALUES ($1, $2, $3, $4, $5) RETURNING id, label, confidence`,
                [photo_id, face_descriptor_id || null, label, confidence, JSON.stringify(box)]
            );
            saved.push(rows[0]);

            // Auto-add photo to person's album if matched
            if (face_descriptor_id) {
                const desc = await db.query(
                    `SELECT album_id FROM face_descriptors WHERE id = $1`,
                    [face_descriptor_id]
                );
                if (desc.rows.length > 0 && desc.rows[0].album_id) {
                    await db.query(
                        `INSERT INTO photo_albums (photo_id, album_id)
                         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [photo_id, desc.rows[0].album_id]
                    );
                    // Update album count
                    await db.query(
                        `UPDATE albums SET photo_count = (
                            SELECT COUNT(*) FROM photo_albums WHERE album_id = $1
                         ), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                        [desc.rows[0].album_id]
                    );
                }
            }
        }

        res.status(201).json({ success: true, data: saved });
    } catch (error) {
        console.error('saveDetectResult Error:', error);
        res.status(500).json({ success: false, message: 'Failed to save detection result' });
    }
};
