import React, { useState } from 'react';
import useSocketStore from '../../store/socketStore';
import { Loader2, Copy, CheckCircle, SmartphoneNfc, QrCode } from 'lucide-react';

export default function RoomConnect() {
    const { socket, isConnected, error, clearError } = useSocketStore();
    const [action, setAction] = useState(null); // 'CREATE' | 'JOIN' | null
    const [joinCode, setJoinCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [createdCode, setCreatedCode] = useState(null);
    const [copied, setCopied] = useState(false);

    const handleCreateRoom = () => {
        if (!socket || !isConnected) return;
        setIsProcessing(true);
        clearError();

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
        setTimeout(() => setIsProcessing(false), 3000);
    };

    const copyCode = () => {
        if (createdCode) {
            navigator.clipboard.writeText(createdCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // View: Main Action Selection
    if (!action) {
        return (
            <div className="flex flex-col h-full pt-4">
                <div className="mb-8 px-4 text-center md:text-left">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                        사진 교환 (Friend Call)
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        에어드랍처럼 쉽고, E2E 암호화로 안전하게 사진을 맞바꿉니다.
                    </p>
                </div>

                {/* Connection Status Indicator */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {isConnected ? '보안 서버 접속 완료 (준비됨)' : '네트워크 연결 대기 중...'}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 w-full max-w-2xl mx-auto">
                    {/* Host Button */}
                    <button
                        onClick={() => { setAction('CREATE'); handleCreateRoom(); }}
                        disabled={!isConnected}
                        className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-left text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
                            <QrCode size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6">
                                <QrCode size={32} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">방 만들기</h3>
                            <p className="text-indigo-100 font-medium">코드를 생성하여 친구를 초대합니다</p>
                        </div>
                    </button>

                    {/* Join Button */}
                    <button
                        onClick={() => { setAction('JOIN'); clearError(); }}
                        disabled={!isConnected}
                        className="group relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 rounded-3xl p-8 text-left text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                            <SmartphoneNfc size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6">
                                <SmartphoneNfc size={32} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">입장하기</h3>
                            <p className="text-gray-300 font-medium">친구가 알려준 코드로 접속합니다</p>
                        </div>
                    </button>
                </div>

                {error && <p className="mt-8 mx-auto text-sm text-red-500 font-bold bg-red-50 dark:bg-red-900/30 px-6 py-3 rounded-full">{error}</p>}
            </div>
        );
    }

    // View: Hosting a Room (Showing Code)
    if (action === 'CREATE') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-4">
                <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-purple-100 dark:border-gray-700 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">친구 초대하기</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">아래 6자리 코드를 친구에게 알려주세요</p>

                    {!createdCode ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <Loader2 size={40} className="animate-spin text-purple-600" />
                            <p className="font-semibold text-purple-600">안전한 P2P 방을 생성하는 중...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-5xl font-black tracking-widest text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 py-6 rounded-2xl border-2 border-dashed border-purple-200 dark:border-purple-800">
                                {createdCode}
                            </div>

                            <button
                                onClick={copyCode}
                                className="w-full py-4 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                            >
                                {copied ? <CheckCircle size={24} /> : <Copy size={24} />}
                                {copied ? '복사 완료!' : '접속 코드 복사하기'}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 animate-pulse font-medium">
                                <Loader2 size={16} className="animate-spin" />
                                <span>친구가 코드를 입력할 때까지 대기 중...</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => { setAction(null); setCreatedCode(null); }}
                        className="mt-8 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white underline font-medium"
                    >
                        취소하고 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    // View: Joining a Room (Entering Code)
    if (action === 'JOIN') {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto px-4">
                <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-600"></div>

                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <SmartphoneNfc size={32} className="text-gray-700 dark:text-gray-300" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">방 입장하기</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">친구가 공유해준 6자리 코드를 입력하세요</p>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="초대 코드 입력"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            maxLength={6}
                            className="w-full px-4 py-5 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 uppercase tracking-[0.5em] text-center font-black text-3xl text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-normal placeholder:font-medium placeholder:text-lg"
                        />

                        {error && <p className="text-sm text-red-500 font-bold animate-shake">{error}</p>}

                        <button
                            onClick={handleJoinRoom}
                            disabled={isProcessing || joinCode.trim().length < 6 || !isConnected}
                            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                        >
                            {isProcessing && <Loader2 size={24} className="animate-spin" />}
                            {isProcessing ? '연결 중...' : '입장하기'}
                        </button>
                    </div>

                    <button
                        onClick={() => { setAction(null); setJoinCode(''); clearError(); }}
                        className="mt-6 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white underline font-medium"
                    >
                        취소하고 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
