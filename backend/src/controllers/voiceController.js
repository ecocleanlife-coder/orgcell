const db = require('../config/db');

exports.listRecordings = async (req, res) => {
    const { site_id } = req.query;
    if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });
    try {
        const result = await db.query(
            `SELECT vr.*, p.name as person_name
             FROM voice_recordings vr
             LEFT JOIN persons p ON vr.person_id = p.id
             WHERE vr.site_id = $1
             ORDER BY vr.created_at DESC`,
            [site_id]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('listRecordings error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.uploadRecording = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
    const { site_id, person_id, duration, description } = req.body;
    if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });
    try {
        const file_path = '/uploads/voice/' + req.file.filename;
        const recorder_id = req.user?.id || null;
        const result = await db.query(
            `INSERT INTO voice_recordings (site_id, person_id, recorder_id, file_path, duration, description)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [site_id, person_id || null, recorder_id, file_path, duration || 0, description || '']
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('uploadRecording error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteRecording = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            'DELETE FROM voice_recordings WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        // Delete file from disk
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(__dirname, '../../', result.rows[0].file_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (err) {
        console.error('deleteRecording error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
