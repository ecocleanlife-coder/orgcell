import React, { useEffect, useState, useRef } from 'react';
import useSocketStore from '../../store/socketStore';
import useAuthStore from '../../store/authStore';

export default function RoomWorkspace({ workerRef, localPhotos }) {
    const { activeRoom, socket, popIncomingRequest, matchesReceived, newPhotos } = useSocketStore();
    const { user, registeredFaces } = useAuthStore();
    const [isScanning, setIsScanning] = useState(false);
    const canvasRef = useRef(null);

    // Auto-respond to incoming scan requests
    useEffect(() => {
        const processIncomingRequests = async () => {
            const req = popIncomingRequest();
            if (!req) return;

            console.log(`Scan requested by ${req.requesterName}`);
            if (!workerRef?.current || !localPhotos || localPhotos.length === 0) {
                // No local photos to scan
                socket?.emit('room:scan-results', {
                    roomCode: activeRoom.roomCode,
                    requesterId: req.requesterId,
                    matchedPhotos: []
                });
                return;
            }

            setIsScanning(true);

            // In a real app, the worker would scan all local photos against the req.descriptors
            // For this MVP, we mock the match to demonstrate the flow if we have local photos
            // using a timeout to simulate worker effort
            setTimeout(() => {
                const matched = localPhotos.slice(0, 2); // Pretend first two matched

                socket?.emit('room:scan-results', {
                    roomCode: activeRoom.roomCode,
                    requesterId: req.requesterId,
                    matchedPhotos: matched.map(p => ({
                        id: p.name,
                        thumbUrl: p.thumbUrl,
                        width: p.width,
                        height: p.height
                    }))
                });
                setIsScanning(false);
            }, 2000);
        };

        const interval = setInterval(processIncomingRequests, 1000);
        return () => clearInterval(interval);
    }, [activeRoom, localPhotos, workerRef, socket, popIncomingRequest]);

    const requestScanFromOthers = () => {
        if (!activeRoom || !socket) return;
        if (!registeredFaces || registeredFaces.length === 0) {
            alert("내 얼굴(기준점)이 먼저 AI Chronicle에 등록되어 있어야 합니다.");
            return;
        }

        // Request all other participants to scan their phones for my face
        socket.emit('room:request-scan', {
            roomCode: activeRoom.roomCode,
            // Target user ID isn't strictly necessary if broadcasting to room
            myDescriptors: registeredFaces[0].descriptor
        });
    };

    const applyWatermarkAndSend = (photoMetaData, receiverId, receiverName) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = photoMetaData.thumbUrl;
            img.crossOrigin = "anonymous";

            img.onload = () => {
                const canvas = canvasRef.current;
                if (!canvas) return resolve();

                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');

                // Draw Image
                ctx.drawImage(img, 0, 0);

                // Apply Watermark
                ctx.font = 'bold 24px sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // semi-transparent white
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Diagonal watermark
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(-Math.PI / 4);
                ctx.fillText(`Shared via Orgcell to ${receiverName}`, 0, 0);

                // Reset transform
                ctx.rotate(Math.PI / 4);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);

                // Convert back to Data URL
                const watermarkedData = canvas.toDataURL('image/jpeg', 0.85);

                socket?.emit('room:send-photo', {
                    roomCode: activeRoom.roomCode,
                    receiverId,
                    photoMeta: { width: canvas.width, height: canvas.height, name: photoMetaData.id },
                    photoData: watermarkedData
                });

                resolve();
            };
        });
    };

    if (!activeRoom) return null;

    return (
        <div className="w-full flex-1 border-t pt-4 mt-4 flex flex-col gap-4">
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded text-center">
                <p className="font-bold mb-1">상대방 폰 스캔하기</p>
                <p className="text-xs mb-3">상대방의 갤러리 속 내 사진을 가져옵니다.</p>
                <button
                    onClick={requestScanFromOthers}
                    className="w-full py-2 bg-blue-600 text-white rounded font-medium shadow hover:bg-blue-700"
                >
                    내 얼굴 찾아주세요!
                </button>
            </div>

            {isScanning && (
                <p className="text-xs text-center text-purple-600 animate-pulse border border-purple-200 p-2 rounded bg-purple-50">
                    🤖 내 갤러리 스캔 중... (상대방 보호)
                </p>
            )}

            {/* Matches we found for others that we need to approve and send */}
            {/* Note: omitted for brevity. Normally we'd list the matches and let the user click "Send" */}

            {/* Matches returned to us from others */}
            {matchesReceived.length > 0 && (
                <div className="border rounded p-3">
                    <p className="font-bold text-xs mb-2">상대방이 찾은 내 사진</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {matchesReceived.map((matchData, index) =>
                            matchData.matchedPhotos.map(p => (
                                <img key={`${index}-${p.id}`} src={p.thumbUrl} className="h-16 w-16 object-cover rounded shadow" alt="matched" />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Actual Photos Received (with Watermarks) */}
            <div className="flex-1 border rounded p-3 overflow-y-auto">
                <p className="font-bold text-xs mb-2 border-b pb-1">받은 갤러리 (워터마크 적용)</p>
                <div className="grid grid-cols-2 gap-2">
                    {newPhotos.map((item, idx) => (
                        <div key={idx} className="relative group">
                            <img src={item.photoData} alt={item.photoMeta.name} className="w-full h-auto rounded shadow-sm border" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-white text-[10px] p-2 text-center">
                                보낸 사람: {item.senderName}
                            </div>
                        </div>
                    ))}
                    {newPhotos.length === 0 && (
                        <p className="text-xs text-gray-400 col-span-2 text-center py-4">아직 수신된 사진이 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
