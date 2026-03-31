const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// GET /api/inbox?site_id=X
exports.listInbox = async (req, res) => {
    try {
        const { site_id } = req.query;
        if (!site_id) return res.status(400).json({ success: false, message: 'site_id required' });

        const { rows } = await db.query(
            `SELECT * FROM photo_inbox WHERE site_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
            [site_id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('listInbox error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/inbox/send (multipart — photos[] + site_id)
exports.sendPhotos = async (req, res) => {
    try {
        const { site_id } = req.body;
        const files = req.files;
        const userId = req.user?.id || null;
        const senderName = req.user?.name || req.user?.email || 'Unknown';

        if (!site_id || !files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'site_id and photos required' });
        }

        const inserted = [];
        for (const file of files) {
            const url = `/uploads/exhibitions/${file.filename}`;
            const { rows } = await db.query(
                `INSERT INTO photo_inbox (site_id, sender_id, sender_name, filename, original_name, mime_type, file_size, url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [site_id, userId, senderName, file.filename, file.originalname, file.mimetype, file.size, url]
            );
            inserted.push(rows[0]);
        }

        res.status(201).json({ success: true, data: inserted });
    } catch (err) {
        console.error('sendPhotos error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/inbox/accept  { photo_ids: [...], exhibition_id: X }
exports.acceptPhotos = async (req, res) => {
    try {
        const { photo_ids, exhibition_id } = req.body;
        if (!photo_ids?.length || !exhibition_id) {
            return res.status(400).json({ success: false, message: 'photo_ids and exhibition_id required' });
        }

        const userId = req.user?.id || null;

        for (const pid of photo_ids) {
            const { rows } = await db.query(
                `SELECT * FROM photo_inbox WHERE id = $1 AND status = 'pending'`,
                [pid]
            );
            if (!rows.length) continue;
            const photo = rows[0];

            // 전시관에 사진 추가
            await db.query(
                `INSERT INTO exhibition_photos
                 (exhibition_id, uploaded_by, filename, original_name, mime_type, file_size, visibility, is_cover, url)
                 VALUES ($1, $2, $3, $4, $5, $6, 'family', FALSE, $7)`,
                [exhibition_id, userId, photo.filename, photo.original_name, photo.mime_type, photo.file_size, photo.url]
            );

            // 상태 업데이트
            await db.query(`UPDATE photo_inbox SET status = 'accepted' WHERE id = $1`, [pid]);
        }

        // 전시관 photo_count 업데이트
        await db.query(
            `UPDATE exhibitions SET photo_count = (
                SELECT COUNT(*) FROM exhibition_photos WHERE exhibition_id = $1
            ), updated_at = NOW() WHERE id = $1`,
            [exhibition_id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('acceptPhotos error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/inbox/:id
exports.deleteInboxPhoto = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT * FROM photo_inbox WHERE id = $1`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

        const photo = rows[0];
        const filePath = path.join(__dirname, '../../uploads/exhibitions', photo.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await db.query(`DELETE FROM photo_inbox WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('deleteInboxPhoto error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
