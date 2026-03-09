const path = require('path');
const fs = require('fs');
const db = require('../config/db');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/sharing');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// @desc    Upload photos to a sharing room group album
// @route   POST /api/sharing/upload
exports.uploadPhotos = async (req, res) => {
    try {
        const userId = req.user.id;
        const roomCode = req.body.room_code || 'default';

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const results = [];
        for (const file of req.files) {
            const { rows } = await db.query(
                `INSERT INTO sharing_photos (room_code, uploader_id, filename, original_name, mime_type, file_size)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, filename, original_name, mime_type, file_size, created_at`,
                [roomCode, userId, file.filename, file.originalname, file.mimetype, file.size]
            );
            results.push({
                ...rows[0],
                url: `/api/sharing/files/${file.filename}`,
            });
        }

        res.json({
            success: true,
            message: `${results.length} photo(s) uploaded`,
            data: results,
        });
    } catch (error) {
        console.error('sharingUpload Error:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};

// @desc    Get photos for a sharing room
// @route   GET /api/sharing/:roomCode/photos
exports.getRoomPhotos = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { rows } = await db.query(
            `SELECT sp.id, sp.filename, sp.original_name, sp.mime_type, sp.file_size,
                    sp.created_at, u.name AS uploader_name
             FROM sharing_photos sp
             JOIN users u ON sp.uploader_id = u.id
             WHERE sp.room_code = $1
             ORDER BY sp.created_at DESC`,
            [roomCode]
        );

        res.json({
            success: true,
            data: rows.map(r => ({
                ...r,
                url: `/api/sharing/files/${r.filename}`,
            })),
        });
    } catch (error) {
        console.error('getRoomPhotos Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch photos' });
    }
};

// @desc    Serve a sharing photo file
// @route   GET /api/sharing/files/:filename
exports.serveFile = (req, res) => {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.sendFile(filePath);
};
