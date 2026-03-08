import React, { useState } from 'react';
import useSocketStore from '../../../store/socketStore';
import { Loader2, Copy, CheckCircle } from 'lucide-react';

export default function RoomConnect() {
    const { socket, isConnected, error, clearError } = useSocketStore();
    const [tab, setTab] = useState('CREATE');
    const [joinCode, setJoinCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdCode, setCreatedCode] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreateRoom = () => {
        if (!socket || !isConnected) return;
        setIsProcessing(true);
        clearError();

        // Emit room:create directly to socket server
        socket.emit('room:create', (response) => {
            setIsProcessing(false);
            if (response && response.roomCode) {
                setCreatedCode(response.roomCode);
            } else {
                useSocketStore.setState({ error: '방을 생성하지 못했습니다.' });
            }
        });
    };

    const handleJoinRoom = () => {
        if (!socket || !isConnected || !joinCode.trim()) return;
        setIsProcessing(true);
        clearError();

        socket.emit('room:join', { roomCode: joinCode.toUpperCase().trim() });
        // The server will emit room:joined or room:error which is handled in socketStore

        // Timeout safeguard
        setTimeout(() => setIsProcessing(false), 3000);
    };

    const copyCode = () => {
        if (createdCode) {
            navigator.clipboard.writeText(createdCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex flex-col gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm transition-all duration-300">
            <h3 className="font-bold text-gray-700 text-center text-base">E2E 친구 초대 (Friend Call)</h3>

            {/* Socket Status */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-xs font-medium text-gray-600">
                    {isConnected ? '중계 서버 접속됨 (안전한 P2P)' : '서버 접속 대기 중...'}
                </span>
            </div>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden bg-white mb-2 shadow-sm">
                <button
                    className={`flex-1 py-2.5 font-bold transition-colors ${tab === 'CREATE' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => { setTab('CREATE'); clearError(); }}
                >방 만들기</button>
                <button
                    className={`flex-1 py-2.5 font-bold transition-colors ${tab === 'JOIN' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                    onClick={() => { setTab('JOIN'); clearError(); }}
                >입장하기</button>
            </div>

            {error && <p className="text-xs text-red-600 text-center bg-red-50 py-1.5 rounded animate-pulse font-medium">{error}</p>}

            {tab === 'CREATE' ? (
                <div className="flex flex-col gap-3">
                    {!createdCode ? (
                        <>
                            <button
                                onClick={handleCreateRoom}
                                disabled={isProcessing || !isConnected}
                                className="w-full py-3 bg-gray-800 text-white rounded-lg font-bold shadow hover:bg-gray-900 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                            >
                                {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                {isProcessing ? '생성 중...' : '1회용 방 만들기'}
                            </button>
                            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                                사진 분산을 막기 위해,<br />30분 뒤 자동 폭파되는 중계 방을 엽니다.
                            </p>
                        </>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-purple-300 p-4 rounded-xl text-center space-y-3">
                            <p className="text-xs text-gray-500 font-medium">연결 코드를 친구에게 전달하세요</p>
                            <div className="text-3xl font-black tracking-widest text-purple-700 bg-purple-50 py-2 rounded-lg">
                                {createdCode}
                            </div>
                            <button
                                onClick={copyCode}
                                className="w-full py-2 bg-purple-100 text-purple-700 font-bold rounded flex items-center justify-center gap-2 hover:bg-purple-200 transition-colors"
                            >
                                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                                {copied ? '복사 완료!' : '코드 복사하기'}
                            </button>
                            <p className="text-xs text-purple-600 animate-pulse mt-2">친구가 입장할 때까지 대기 중입니다...</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        placeholder="전달받은 접속 코드 6자리"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        maxLength={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 uppercase tracking-widest text-center font-black text-xl text-gray-700 transition-all"
                    />
                    <button
                        onClick={handleJoinRoom}
                        disabled={isProcessing || joinCode.trim().length < 6 || !isConnected}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold shadow hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                    >
                        {isProcessing && <Loader2 size={16} className="animate-spin" />}
                        {isProcessing ? '확인 중...' : '안전하게 입장하기'}
                    </button>
                </div>
            )}
        </div>
    );
}
