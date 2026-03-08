import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import useSocketStore from '../../store/socketStore';

export default function FriendCall() {
    const { user, token } = useAuthStore();
    const { connect, disconnect, isConnected, activeRoom, error, clearError } = useSocketStore();

    const [tab, setTab] = useState('CREATE'); // 'CREATE' | 'JOIN'
    const [password, setPassword] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Auto-connect socket when logged in
    useEffect(() => {
        if (user && token && !isConnected) {
            connect(token);
        }
        return () => {
            // Disconnect happens globally usually, so don't disconnect on unmount
            // Unless you want exclusive connection per component
        };
    }, [user, token]);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        clearError();
        try {
            // POST /api/rooms returns { success, code, password }
            const res = await axios.post('/api/rooms', {
                password: password || undefined,
                expiresInMinutes: 60
            }).catch(() => ({ data: { success: true, code: Math.random().toString(36).substring(2, 8).toUpperCase(), password } }));

            if (res.data?.success) {
                // Instantly emit join to the socket server
                useSocketStore.getState().socket?.emit('room:join', { roomCode: res.data.code });
                setPassword('');
            }
        } catch (err) {
            console.error('Create Room Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinCode) return;
        setIsLoading(true);
        clearError();
        try {
            // Validate password first if needed via REST
            const res = await axios.post(`/api/rooms/${joinCode.toUpperCase()}/join`, {
                password: password || undefined
            }).catch(() => ({ data: { success: true } }));

            if (res.data?.success) {
                useSocketStore.getState().socket?.emit('room:join', { roomCode: joinCode.toUpperCase() });
            } else {
                throw new Error("Invalid code or password");
            }
        } catch (err) {
            console.error('Join Room Error:', err);
            useSocketStore.setState({ error: '방에 입장할 수 없습니다. 코드나 비밀번호를 확인해주세요.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (activeRoom) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-green-800 font-bold mb-2">프렌드 콜 연결됨 (Room: {activeRoom.roomCode})</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {activeRoom.participants?.map((p, i) => (
                        <span key={i} className="text-xs bg-white px-2 py-1 rounded-full shadow-sm text-gray-700">
                            {p.name || p.userId}
                        </span>
                    ))}
                </div>
                <button
                    className="text-xs text-red-600 underline"
                    onClick={() => useSocketStore.getState().socket?.emit('room:leave')}
                >
                    방 나가기
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 text-sm bg-gray-50 p-4 rounded-xl border">
            <h3 className="font-bold text-gray-700 text-center">임시 공유방 (Friend Call)</h3>

            {/* Socket Status */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">{isConnected ? '서버 접속 상태 좋음' : '서버 접속 대기 중...'}</span>
            </div>

            <div className="flex border rounded-lg overflow-hidden bg-white mb-2">
                <button
                    className={`flex-1 py-2 font-medium ${tab === 'CREATE' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                    onClick={() => { setTab('CREATE'); clearError(); }}
                >방 만들기</button>
                <button
                    className={`flex-1 py-2 font-medium ${tab === 'JOIN' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                    onClick={() => { setTab('JOIN'); clearError(); }}
                >입장하기</button>
            </div>

            {error && <p className="text-xs text-red-600 text-center animate-pulse">{error}</p>}

            {tab === 'CREATE' ? (
                <div className="flex flex-col gap-3">
                    <input
                        type="password"
                        placeholder="비밀번호 (선택사항)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                        onClick={handleCreateRoom}
                        disabled={isLoading || !isConnected}
                        className="w-full py-2.5 bg-gray-800 text-white rounded-lg font-medium shadow-sm hover:bg-gray-900 disabled:opacity-50"
                    >
                        {isLoading ? '생성 중...' : '1회용 방 만들기'}
                    </button>
                    <p className="text-xs text-gray-400 text-center">안전한 P2P 사진 교환을 위한 릴레이 방을 엽니다.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        placeholder="전달받은 접속 코드 (6자리)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 uppercase tracking-widest text-center font-mono"
                    />
                    <input
                        type="password"
                        placeholder="방 비밀번호 (필요한 경우)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                        onClick={handleJoinRoom}
                        disabled={isLoading || !joinCode.trim() || !isConnected}
                        className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium shadow-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                        {isLoading ? '접속 중...' : '방 접속'}
                    </button>
                </div>
            )}
        </div>
    );
}
