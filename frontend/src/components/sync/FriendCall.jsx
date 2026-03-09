import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';
import RoomConnect from '../friend-call/RoomConnect';
import PhotoSelector from '../friend-call/PhotoSelector';
import TransferProgress from '../friend-call/TransferProgress';
import { LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import useCryptoStore from '../../store/cryptoStore';
import { decryptBlob } from '../../utils/cryptoUtils';
import { addWatermarkToImage } from '../../utils/watermarkUtils';

export default function FriendCall({ localPhotos = [] }) {
    const { user, token } = useAuthStore();
    const { connect, disconnect, isConnected, activeRoom, socket } = useSocketStore();

    // Fake transfer states for UI testing (these would sync with socket events)
    const [sendProgress, setSendProgress] = useState(0);
    const [sendTotal, setSendTotal] = useState(0);

    // Auto-connect socket when logged in
    useEffect(() => {
        if (user && token && !isConnected) {
            connect(token);
        }
    }, [user, token, isConnected, connect]);

    const handleSendPhotos = async (selectedPhotos) => {
        if (!socket || !activeRoom) {
            toast.error("연결된 방이 없습니다.");
            return;
        }

        const masterKey = useCryptoStore.getState().masterKey;
        if (!masterKey) {
            toast.error("마스터 키가 없습니다.");
            return;
        }

        setSendTotal(selectedPhotos.length);
        setSendProgress(0);

        let current = 0;

        for (const photo of selectedPhotos) {
            try {
                // 1. Fetch from Drive
                const res = await axios.get(`/api/drive/download/${photo.drive_file_id}`, { responseType: 'blob' });

                // 2. Decrypt Blob
                const decryptedBlob = await decryptBlob(res.data, masterKey);
                const objectUrl = URL.createObjectURL(decryptedBlob);

                // 3. Add Watermark
                const watermarkedBlob = await addWatermarkToImage(objectUrl, "Orgcell Protected");
                URL.revokeObjectURL(objectUrl);

                // 4. Send via Socket (In a real app, this should be chunked and re-encrypted. 
                // For this MVP test scenario, we'll send the blob directly)
                const reader = new FileReader();
                reader.readAsArrayBuffer(watermarkedBlob);
                await new Promise((resolve, reject) => {
                    reader.onloadend = () => {
                        socket.emit('photo:send', {
                            roomCode: activeRoom.roomCode,
                            photoMeta: {
                                id: photo.id,
                                name: photo.original_name || photo.name,
                                mime_type: 'image/jpeg'
                            },
                            photoData: reader.result // ArrayBuffer
                        }, () => resolve());
                    };
                    reader.onerror = reject;
                });

                current++;
                setSendProgress(current);

            } catch (err) {
                console.error("Failed to process and send photo:", err);
                toast.error(`'${photo.original_name || photo.name}' 전송 실패`);
            }
        }

        if (current > 0) {
            toast.success(`총 ${current}장의 사진 P2P 전송 완료!`);
        }

        setTimeout(() => {
            setSendTotal(0);
            setSendProgress(0);
        }, 3000);
    };

    const handleLeaveRoom = () => {
        if (socket) {
            socket.emit('room:leave');
            useSocketStore.setState({ activeRoom: null });
        }
    };

    if (!activeRoom) {
        return <RoomConnect />;
    }

    return (
        <div className="flex flex-col h-full gap-4 text-sm w-full bg-white">
            {/* Active Room Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-sm relative">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-purple-900 font-bold text-lg flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                        </span>
                        보안 룸 연결됨
                    </p>
                    <button
                        className="text-xs bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-sm transition-all"
                        onClick={handleLeaveRoom}
                    >
                        <LogOut size={12} />
                        방 나가기
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-purple-700 font-medium">참여자:</span>
                    <div className="flex flex-wrap gap-2">
                        {/* Always show ourselves */}
                        <span className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-bold shadow-sm ring-2 ring-purple-200">
                            나 ({user?.name})
                        </span>

                        {activeRoom.participants?.filter(p => p.userId !== user?.id).map((p, i) => (
                            <span key={i} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full font-bold shadow-sm text-gray-700">
                                {p.name || p.userId}
                            </span>
                        ))}

                        {(!activeRoom.participants || activeRoom.participants.length <= 1) && (
                            <span className="text-[10px] bg-white/50 text-gray-400 px-2 py-1 rounded-full border border-dashed border-gray-300 animate-pulse">
                                친구 대기 중...
                            </span>
                        )}
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 mt-3 absolute bottom-2 right-4">Room. {activeRoom.roomCode}</p>
            </div>

            {/* Transfer Progress Bar (only shows when sending) */}
            {sendTotal > 0 && (
                <TransferProgress
                    total={sendTotal}
                    current={sendProgress}
                    type="send"
                    bytesSent={sendProgress * 1024 * 1024 * 2.5}
                    bytesTotal={sendTotal * 1024 * 1024 * 2.5}
                />
            )}

            {/* Photo Selector Grid */}
            <div className="flex-1 min-h-[400px]">
                <PhotoSelector
                    localPhotos={localPhotos}
                    onSend={handleSendPhotos}
                    disabled={!activeRoom || !activeRoom.participants || activeRoom.participants.length <= 1 || sendTotal > 0}
                />
            </div>

            <p className="text-[10px] text-gray-400 text-center pb-2">방을 나가면 즉시 파기되며 데이터는 복원할 수 없습니다.</p>
        </div>
    );
}
