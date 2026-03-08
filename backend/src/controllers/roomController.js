const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Generate short unique room code
function generateRoomCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
}

// @desc    Create share room (Friend Call)
// @route   POST /api/rooms
exports.createRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, expires_in_minutes = 60 } = req.body;

        if (!password || password.length < 4) {
            return res.status(400).json({
                success: false,
                message: 'Password required (min 4 characters)'
            });
        }

        const code = generateRoomCode();
        const passwordHash = await bcrypt.hash(password, 10);
        const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000);

        const { rows } = await db.query(
            `INSERT INTO share_rooms (code, creator_id, password_hash, expires_at)
             VALUES ($1, $2, $3, $4) RETURNING id, code, status, expires_at, created_at`,
            [code, userId, passwordHash, expiresAt]
        );

        // Auto-join creator
        await db.query(
            `INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)`,
            [rows[0].id, userId]
        );

        res.status(201).json({
            success: true,
            data: {
                ...rows[0],
                share_link: `/room/${code}`,
            },
        });
    } catch (error) {
        console.error('createRoom Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create room' });
    }
};

// @desc    Join share room
// @route   POST /api/rooms/:code/join
exports.joinRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;
        const { password } = req.body;

        // Find active room
        const room = await db.query(
            `SELECT * FROM share_rooms
             WHERE code = $1 AND status = 'active' AND expires_at > NOW()`,
            [code]
        );

        if (room.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Room not found or expired'
            });
        }

        const roomData = room.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, roomData.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Wrong password' });
        }

        // Check participant limit
        const participants = await db.query(
            `SELECT COUNT(*) FROM room_participants WHERE room_id = $1`,
            [roomData.id]
        );
        if (parseInt(participants.rows[0].count) >= roomData.max_participants) {
            return res.status(403).json({ success: false, message: 'Room is full' });
        }

        // Join room
        await db.query(
            `INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)
             ON CONFLICT (room_id, user_id) DO NOTHING`,
            [roomData.id, userId]
        );

        res.json({
            success: true,
            data: {
                room_id: roomData.id,
                code: roomData.code,
                expires_at: roomData.expires_at,
            },
        });
    } catch (error) {
        console.error('joinRoom Error:', error);
        res.status(500).json({ success: false, message: 'Failed to join room' });
    }
};

// @desc    Get room info
// @route   GET /api/rooms/:code
exports.getRoom = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;

        const room = await db.query(
            `SELECT sr.id, sr.code, sr.status, sr.expires_at, sr.creator_id, sr.created_at
             FROM share_rooms sr
             JOIN room_participants rp ON sr.id = rp.room_id
             WHERE sr.code = $1 AND rp.user_id = $2`,
            [code, userId]
        );

        if (room.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        // Get participants
        const participants = await db.query(
            `SELECT u.id, u.name, u.avatar_url
             FROM room_participants rp
             JOIN users u ON rp.user_id = u.id
             WHERE rp.room_id = $1`,
            [room.rows[0].id]
        );

        res.json({
            success: true,
            data: {
                ...room.rows[0],
                participants: participants.rows,
            },
        });
    } catch (error) {
        console.error('getRoom Error:', error);
        res.status(500).json({ success: false, message: 'Failed to get room' });
    }
};

// @desc    Exchange photo via server relay
// @route   POST /api/rooms/:code/exchange
exports.exchangePhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.params;
        const { receiver_id, photo_id } = req.body;

        // Verify room and membership
        const room = await db.query(
            `SELECT sr.id FROM share_rooms sr
             JOIN room_participants rp ON sr.id = rp.room_id
             WHERE sr.code = $1 AND rp.user_id = $2
               AND sr.status = 'active' AND sr.expires_at > NOW()`,
            [code, userId]
        );

        if (room.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found or expired' });
        }

        // Verify receiver is in room
        const receiver = await db.query(
            `SELECT user_id FROM room_participants
             WHERE room_id = $1 AND user_id = $2`,
            [room.rows[0].id, receiver_id]
        );

        if (receiver.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Receiver not in room' });
        }

        const { rows } = await db.query(
            `INSERT INTO room_exchanges (room_id, sender_id, receiver_id, photo_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [room.rows[0].id, userId, receiver_id, photo_id]
        );

        res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('exchangePhoto Error:', error);
        res.status(500).json({ success: false, message: 'Failed to exchange photo' });
    }
};
