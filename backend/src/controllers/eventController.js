const crypto = require('crypto');
const db = require('../config/db');

function generateEventCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
}

// @desc    Create event album (가족모임, 단체여행 etc.)
// @route   POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, subdomain, expires_in_hours = 24 } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Event name required' });
        }

        const code = generateEventCode();
        const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

        const { rows } = await db.query(
            `INSERT INTO event_rooms (code, name, creator_id, subdomain, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [code, name, userId, subdomain || null, expiresAt]
        );

        // Auto-join creator
        await db.query(
            `INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)`,
            [rows[0].id, userId]
        );

        res.status(201).json({
            success: true,
            data: {
                ...rows[0],
                qr_url: `/api/events/${code}/qr`,
                share_link: subdomain
                    ? `https://${subdomain}.orgcell.com`
                    : `/event/${code}`,
            },
        });
    } catch (error) {
        console.error('createEvent Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

// @desc    Join event by code
// @route   POST /api/events/:code/join
exports.joinEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;

        const event = await db.query(
            `SELECT * FROM event_rooms WHERE code = $1 AND expires_at > NOW()`,
            [code]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or expired' });
        }

        await db.query(
            `INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)
             ON CONFLICT (event_id, user_id) DO NOTHING`,
            [event.rows[0].id, userId]
        );

        res.json({ success: true, data: event.rows[0] });
    } catch (error) {
        console.error('joinEvent Error:', error);
        res.status(500).json({ success: false, message: 'Failed to join event' });
    }
};

// @desc    Upload photo to event feed
// @route   POST /api/events/:code/photos
exports.addEventPhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;
        const { photo_id, caption } = req.body;

        const event = await db.query(
            `SELECT e.id FROM event_rooms e
             JOIN event_participants ep ON e.id = ep.event_id
             WHERE e.code = $1 AND ep.user_id = $2 AND e.expires_at > NOW()`,
            [code, userId]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found or not a member' });
        }

        const { rows } = await db.query(
            `INSERT INTO event_photos (event_id, user_id, photo_id, caption)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [event.rows[0].id, userId, photo_id, caption || null]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('addEventPhoto Error:', error);
        res.status(500).json({ success: false, message: 'Failed to add photo' });
    }
};

// @desc    Get event feed (live photos)
// @route   GET /api/events/:code/feed
exports.getEventFeed = async (req, res) => {
    try {
        const { code } = req.params;
        const { since } = req.query; // for polling new photos

        const event = await db.query(
            `SELECT id, name, code, expires_at FROM event_rooms WHERE code = $1`, [code]
        );

        if (event.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        let query = `SELECT ep.*, u.name AS user_name, u.avatar_url,
                            p.filename, p.thumbnail_url, p.drive_thumbnail_id
                     FROM event_photos ep
                     JOIN users u ON ep.user_id = u.id
                     LEFT JOIN photos p ON ep.photo_id = p.id
                     WHERE ep.event_id = $1`;
        const params = [event.rows[0].id];

        if (since) {
            query += ` AND ep.created_at > $2`;
            params.push(since);
        }

        query += ` ORDER BY ep.created_at DESC LIMIT 100`;

        const { rows } = await db.query(query, params);

        res.json({ success: true, event: event.rows[0], data: rows });
    } catch (error) {
        console.error('getEventFeed Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get feed' });
    }
};

// @desc    React to event photo (heart, emoji)
// @route   POST /api/events/:code/photos/:photoId/react
exports.reactToPhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code, photoId } = req.params;
        const { reaction = 'heart' } = req.body;

        const { rows } = await db.query(
            `INSERT INTO event_reactions (event_photo_id, user_id, reaction)
             VALUES ($1, $2, $3)
             ON CONFLICT (event_photo_id, user_id) DO UPDATE SET reaction = $3
             RETURNING *`,
            [photoId, userId, reaction]
        );

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('reactToPhoto Error:', error);
        res.status(500).json({ success: false, message: 'Failed to react' });
    }
};

// @desc    Generate QR code for event
// @route   GET /api/events/:code/qr
exports.getEventQR = async (req, res) => {
    try {
        const { code } = req.params;
        const joinUrl = `${process.env.FRONTEND_URL || 'https://orgcell.com'}/event/${code}`;

        // Simple SVG QR placeholder (real QR needs qrcode library)
        // For MVP, return the URL for client-side QR generation
        res.json({
            success: true,
            data: {
                code,
                join_url: joinUrl,
            },
        });
    } catch (error) {
        console.error('getEventQR Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate QR' });
    }
};
