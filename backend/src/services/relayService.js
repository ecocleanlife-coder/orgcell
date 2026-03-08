const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

let io;
const roomTimers = new Map(); // roomCode → setTimeout handle

// Auto-expire room after timeout
function scheduleRoomExpiry(roomCode, minutes = 30) {
    if (roomTimers.has(roomCode)) clearTimeout(roomTimers.get(roomCode));
    const timer = setTimeout(async () => {
        try {
            await db.query(
                `UPDATE share_rooms SET status = 'expired' WHERE code = $1 AND status = 'active'`,
                [roomCode]
            );
            if (io) {
                io.to(`room:${roomCode}`).emit('room:expired', { roomCode });
                io.in(`room:${roomCode}`).socketsLeave(`room:${roomCode}`);
            }
            roomTimers.delete(roomCode);
            console.log(`Room ${roomCode} auto-expired`);
        } catch (err) {
            console.error('Room expiry error:', err);
        }
    }, minutes * 60 * 1000);
    roomTimers.set(roomCode, timer);
}

function initRelay(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
        },
        maxHttpBufferSize: 5 * 1024 * 1024, // 5MB per chunk
    });

    // JWT auth middleware for Socket.IO
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('No token'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded.user;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.user.email}`);

        // Create room via Socket (alternative to REST)
        socket.on('room:create', async (data) => {
            const { password, expiresMinutes = 30 } = data;
            try {
                const crypto = require('crypto');
                const bcrypt = require('bcryptjs');
                const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
                const passwordHash = await bcrypt.hash(password || code, 10);
                const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

                const { rows } = await db.query(
                    `INSERT INTO share_rooms (code, creator_id, password_hash, expires_at)
                     VALUES ($1, $2, $3, $4) RETURNING id, code, status, expires_at`,
                    [code, socket.user.id, passwordHash, expiresAt]
                );
                await db.query(
                    `INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)`,
                    [rows[0].id, socket.user.id]
                );

                socket.join(`room:${code}`);
                socket.roomCode = code;
                scheduleRoomExpiry(code, expiresMinutes);

                socket.emit('room:created', { roomCode: code, expiresAt: rows[0].expires_at });
            } catch (err) {
                console.error('room:create error:', err);
                socket.emit('room:error', { message: 'Failed to create room' });
            }
        });

        // Join a share room
        socket.on('room:join', async (data) => {
            const { roomCode, password } = data;
            try {
                const result = await db.query(
                    `SELECT sr.id, sr.code, sr.status, sr.expires_at, sr.password_hash
                     FROM share_rooms sr
                     WHERE sr.code = $1
                       AND sr.status = 'active' AND sr.expires_at > NOW()`,
                    [roomCode]
                );

                if (result.rows.length === 0) {
                    socket.emit('room:error', { message: 'Room not found or expired' });
                    return;
                }

                const room = result.rows[0];

                // Verify password if provided (skip for creator who's already a participant)
                const existing = await db.query(
                    `SELECT 1 FROM room_participants WHERE room_id = $1 AND user_id = $2`,
                    [room.id, socket.user.id]
                );

                if (existing.rows.length === 0) {
                    if (!password) {
                        socket.emit('room:error', { message: 'Password required' });
                        return;
                    }
                    const bcrypt = require('bcryptjs');
                    const isMatch = await bcrypt.compare(password, room.password_hash);
                    if (!isMatch) {
                        socket.emit('room:error', { message: 'Wrong password' });
                        return;
                    }
                    // Check max participants
                    const count = await db.query(
                        `SELECT COUNT(*) FROM room_participants WHERE room_id = $1`, [room.id]
                    );
                    if (parseInt(count.rows[0].count) >= 10) {
                        socket.emit('room:error', { message: 'Room is full' });
                        return;
                    }
                    await db.query(
                        `INSERT INTO room_participants (room_id, user_id) VALUES ($1, $2)
                         ON CONFLICT (room_id, user_id) DO NOTHING`,
                        [room.id, socket.user.id]
                    );
                }

                socket.join(`room:${roomCode}`);
                socket.roomCode = roomCode;

                // Notify others
                socket.to(`room:${roomCode}`).emit('room:user-joined', {
                    userId: socket.user.id,
                    name: socket.user.name,
                });

                // Check if both sides connected → emit ready
                const socketsInRoom = await io.in(`room:${roomCode}`).fetchSockets();
                const isReady = socketsInRoom.length >= 2;

                // Send current participants
                const participants = await db.query(
                    `SELECT u.id, u.name, u.avatar_url
                     FROM room_participants rp
                     JOIN users u ON rp.user_id = u.id
                     WHERE rp.room_id = $1`,
                    [room.id]
                );

                socket.emit('room:joined', {
                    roomCode,
                    participants: participants.rows,
                });

                if (isReady) {
                    io.to(`room:${roomCode}`).emit('room:ready', {
                        participants: participants.rows,
                    });
                }
            } catch (err) {
                console.error('room:join error:', err);
                socket.emit('room:error', { message: 'Failed to join room' });
            }
        });

        // Chunked photo transfer: send a chunk
        socket.on('photo:chunk', (data) => {
            const { roomCode, photoId, chunk, index, totalChunks, photoMeta } = data;
            // Relay chunk to all others in room
            socket.to(`room:${roomCode}`).emit('photo:chunk', {
                senderId: socket.user.id,
                senderName: socket.user.name,
                photoId,
                chunk,       // ArrayBuffer chunk
                index,
                totalChunks,
                photoMeta,   // { filename, width, height, mimeType } on first chunk
            });
        });

        // Photo transfer complete notification
        socket.on('photo:complete', async (data) => {
            const { roomCode, photoId } = data;
            try {
                await db.query(
                    `INSERT INTO room_exchanges (room_id, sender_id, receiver_id, photo_id)
                     SELECT sr.id, $1, rp.user_id, $2
                     FROM share_rooms sr
                     JOIN room_participants rp ON sr.id = rp.room_id
                     WHERE sr.code = $3 AND rp.user_id != $1`,
                    [socket.user.id, photoId, roomCode]
                );
            } catch (err) {
                console.error('photo:complete log error:', err);
            }
            socket.to(`room:${roomCode}`).emit('photo:complete', {
                senderId: socket.user.id,
                photoId,
            });
            socket.emit('room:photo-sent', { photoId });
        });

        // Legacy: Relay full photo data to receiver (kept for backward compat)
        socket.on('room:send-photo', async (data) => {
            const { roomCode, receiverId, photoMeta, photoData } = data;

            try {
                await db.query(
                    `INSERT INTO room_exchanges (room_id, sender_id, receiver_id, photo_id)
                     SELECT sr.id, $1, $2, $3
                     FROM share_rooms sr WHERE sr.code = $4`,
                    [socket.user.id, receiverId, photoMeta.id, roomCode]
                );

                const receiverSockets = await io.in(`room:${roomCode}`).fetchSockets();
                for (const rs of receiverSockets) {
                    if (rs.user.id === receiverId) {
                        rs.emit('room:receive-photo', {
                            senderId: socket.user.id,
                            senderName: socket.user.name,
                            photoMeta,
                            photoData,
                        });
                    }
                }

                socket.emit('room:photo-sent', { photoId: photoMeta.id, receiverId });
            } catch (err) {
                console.error('room:send-photo error:', err);
                socket.emit('room:error', { message: 'Failed to send photo' });
            }
        });

        // Request face scan from other user's photos
        socket.on('room:request-scan', (data) => {
            const { roomCode, myDescriptors } = data;
            socket.to(`room:${roomCode}`).emit('room:scan-request', {
                requesterId: socket.user.id,
                requesterName: socket.user.name,
                descriptors: myDescriptors,
            });
        });

        // Return scan results (photos containing requester's face)
        socket.on('room:scan-results', async (data) => {
            const { roomCode, requesterId, matchedPhotos } = data;
            const sockets = await io.in(`room:${roomCode}`).fetchSockets();
            for (const rs of sockets) {
                if (rs.user.id === requesterId) {
                    rs.emit('room:matches-found', {
                        fromUserId: socket.user.id,
                        fromUserName: socket.user.name,
                        matchedPhotos,
                    });
                }
            }
        });

        // Close room (creator only)
        socket.on('room:close', async (data) => {
            const { roomCode } = data || {};
            const code = roomCode || socket.roomCode;
            if (!code) return;
            try {
                await db.query(
                    `UPDATE share_rooms SET status = 'closed'
                     WHERE code = $1 AND creator_id = $2 AND status = 'active'`,
                    [code, socket.user.id]
                );
                io.to(`room:${code}`).emit('room:closed', { roomCode: code });
                io.in(`room:${code}`).socketsLeave(`room:${code}`);
                if (roomTimers.has(code)) {
                    clearTimeout(roomTimers.get(code));
                    roomTimers.delete(code);
                }
            } catch (err) {
                console.error('room:close error:', err);
            }
        });

        // Leave room
        socket.on('room:leave', () => {
            if (socket.roomCode) {
                socket.to(`room:${socket.roomCode}`).emit('room:user-left', {
                    userId: socket.user.id,
                    name: socket.user.name,
                });
                socket.leave(`room:${socket.roomCode}`);
                socket.roomCode = null;
            }
        });

        socket.on('disconnect', () => {
            if (socket.roomCode) {
                socket.to(`room:${socket.roomCode}`).emit('room:user-left', {
                    userId: socket.user.id,
                    name: socket.user.name,
                });
            }
            console.log(`Socket disconnected: ${socket.user.email}`);
        });
    });

    // Periodic cleanup: expire old rooms every 5 minutes
    setInterval(async () => {
        try {
            const { rowCount } = await db.query(
                `UPDATE share_rooms SET status = 'expired'
                 WHERE status = 'active' AND expires_at < NOW()`
            );
            if (rowCount > 0) console.log(`Auto-expired ${rowCount} rooms`);
        } catch (err) {
            console.error('Room cleanup error:', err);
        }
    }, 5 * 60 * 1000);

    return io;
}

module.exports = { initRelay };
