const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

let io;

function initRelay(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            credentials: true,
        },
        maxHttpBufferSize: 25 * 1024 * 1024, // 25MB for photo relay
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

        // Join a share room
        socket.on('room:join', async (data) => {
            const { roomCode } = data;
            try {
                // Verify user is a participant
                const result = await db.query(
                    `SELECT sr.id, sr.code, sr.status, sr.expires_at
                     FROM share_rooms sr
                     JOIN room_participants rp ON sr.id = rp.room_id
                     WHERE sr.code = $1 AND rp.user_id = $2
                       AND sr.status = 'active' AND sr.expires_at > NOW()`,
                    [roomCode, socket.user.id]
                );

                if (result.rows.length === 0) {
                    socket.emit('room:error', { message: 'Room not found or not authorized' });
                    return;
                }

                socket.join(`room:${roomCode}`);
                socket.roomCode = roomCode;

                // Notify others
                socket.to(`room:${roomCode}`).emit('room:user-joined', {
                    userId: socket.user.id,
                    name: socket.user.name,
                });

                // Send current participants
                const participants = await db.query(
                    `SELECT u.id, u.name, u.avatar_url
                     FROM room_participants rp
                     JOIN users u ON rp.user_id = u.id
                     JOIN share_rooms sr ON rp.room_id = sr.id
                     WHERE sr.code = $1`,
                    [roomCode]
                );

                socket.emit('room:joined', {
                    roomCode,
                    participants: participants.rows,
                });
            } catch (err) {
                console.error('room:join error:', err);
                socket.emit('room:error', { message: 'Failed to join room' });
            }
        });

        // Relay photo data to receiver (server relay instead of P2P)
        socket.on('room:send-photo', async (data) => {
            const { roomCode, receiverId, photoMeta, photoData } = data;
            // photoMeta: { id, filename, width, height, thumbnail }
            // photoData: base64 encoded photo (watermarked)

            try {
                // Save exchange record
                await db.query(
                    `INSERT INTO room_exchanges (room_id, sender_id, receiver_id, photo_id)
                     SELECT sr.id, $1, $2, $3
                     FROM share_rooms sr WHERE sr.code = $4`,
                    [socket.user.id, receiverId, photoMeta.id, roomCode]
                );

                // Relay to specific receiver in room
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
            const { roomCode, targetUserId, myDescriptors } = data;
            // Ask the other user's client to scan their local photos
            // for faces matching myDescriptors

            const room = `room:${roomCode}`;
            socket.to(room).emit('room:scan-request', {
                requesterId: socket.user.id,
                requesterName: socket.user.name,
                descriptors: myDescriptors,
            });
        });

        // Return scan results (photos containing requester's face)
        socket.on('room:scan-results', (data) => {
            const { roomCode, requesterId, matchedPhotos } = data;
            // matchedPhotos: [{ id, thumbnail, confidence }]

            const receiverSockets = io.in(`room:${roomCode}`).fetchSockets();
            receiverSockets.then(sockets => {
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

    return io;
}

module.exports = { initRelay };
