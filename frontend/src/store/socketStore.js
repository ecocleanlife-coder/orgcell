import { create } from 'zustand';
import { io } from 'socket.io-client';

import { sendPushNotification } from '../utils/notificationUtils';

const useSocketStore = create((set, get) => ({
    socket: null,
    isConnected: false,
    activeRoom: null, // { roomCode, participants: [] }
    incomingRequests: [], // queue mapping requesterId -> { requesterName, descriptors }
    matchesReceived: [], // list of photos matched from other users
    newPhotos: [], // Incoming actual photos received from `room:receive-photo`
    error: null,

    connect: () => {
        if (get().socket) return;

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
            withCredentials: true // Send httpOnly cookies
        });

        socket.on('connect', () => {
            set({ isConnected: true, error: null });
        });

        socket.on('disconnect', () => {
            set({ isConnected: false, activeRoom: null });
        });

        // Room Events
        socket.on('room:joined', (data) => {
            set({ activeRoom: { roomCode: data.roomCode, participants: data.participants || [] } });
        });

        socket.on('room:user-joined', (data) => {
            const { activeRoom } = get();
            if (activeRoom) {
                set({ activeRoom: { ...activeRoom, participants: [...activeRoom.participants, data] } });
            }
        });

        socket.on('room:user-left', (data) => {
            const { activeRoom } = get();
            if (activeRoom) {
                set({ activeRoom: { ...activeRoom, participants: activeRoom.participants.filter(p => p.userId !== data.userId) } });
            }
        });

        // Scan Events
        socket.on('room:scan-request', (data) => {
            set(state => ({
                incomingRequests: [...state.incomingRequests, data]
            }));
        });

        socket.on('room:matches-found', (data) => {
            // data: { fromUserId, fromUserName, matchedPhotos: [] }
            set(state => ({
                matchesReceived: [...state.matchesReceived, data]
            }));
        });

        socket.on('room:receive-photo', (data) => {
            // data: { senderId, senderName, photoMeta, photoData }
            set(state => ({
                newPhotos: [...state.newPhotos, data]
            }));

            // Trigger Desktop Push Notification
            sendPushNotification('📸 새로운 사진 도착!', {
                body: `${data.senderName || '친구'}님이 '${data.photoMeta?.name || '새 사진'}'을(를) 보냈습니다.`,
                tag: 'friend-call-receive'
            });
        });

        socket.on('room:error', (data) => {
            set({ error: data.message });
            console.error("Socket Room Error:", data.message);
        });

        set({ socket });
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.disconnect();
            set({ socket: null, isConnected: false, activeRoom: null });
        }
    },

    clearError: () => set({ error: null }),

    // UI Helpers to consume queues
    popIncomingRequest: () => {
        const reqs = get().incomingRequests;
        if (reqs.length === 0) return null;
        const first = reqs[0];
        set({ incomingRequests: reqs.slice(1) });
        return first;
    }
}));

export default useSocketStore;
