import React, { useState } from 'react';
import useCryptoStore from '../../store/cryptoStore';
import useAuthStore from '../../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function KeyManager() {
    const { masterKey, exportMasterKey, importMasterKey, clearKey } = useCryptoStore();
    const driveConnected = useAuthStore(state => state.driveConnected);
    const disconnectDrive = useAuthStore(state => state.disconnectDrive);
    const [importStr, setImportStr] = useState('');
    const [status, setStatus] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);

    const handleExport = async () => {
        try {
            const b64 = await exportMasterKey();
            navigator.clipboard.writeText(b64);
            setStatus('마스터 키가 클립보드에 복사되었습니다. 안전한 곳에 보관하세요!');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            alert('키 내보내기 실패');
        }
    };

    const handleImport = async () => {
        if (!importStr) return;
        const success = await importMasterKey(importStr.trim());
        if (success) {
            setStatus('새 마스터 키가 성공적으로 등록되었습니다.');
            setImportStr('');
            setTimeout(() => setStatus(''), 3000);
        } else {
            alert('잘못된 형태의 키입니다.');
        }
    };

    const handleReset = async () => {
        if (window.confirm("경고: 마스터 키를 삭제하면 기존에 암호화된 기밀 사진들을 다시는 복구할 수 없습니다! 진행하시겠습니까?")) {
            await clearKey();
            setStatus('마스터 키가 삭제되었습니다. 새로고침 시 새 키가 발급됩니다.');
        }
    };

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm text-sm">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <span>🔐</span> E2E 종단간 암호화 설정
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                서버 관리자조차 사용자의 사진을 볼 수 없도록 기기 내부에서 암호화합니다.
                <br />이 기기(브라우저)를 분실하거나 캐시를 지우면 사진 복구가 불가능하므로 반드시 <b>키를 백업</b>해두세요.
            </p>

            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded border">
                <span className="font-medium w-24">상태:</span>
                {masterKey ? (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> 키 활성화됨
                    </span>
                ) : (
                    <span className="text-red-500">키 없음</span>
                )}
            </div>

            {status && <div className="mb-4 p-2 bg-blue-50 text-blue-700 rounded text-xs">{status}</div>}

            <div className="flex flex-col gap-3">
                <button
                    onClick={handleExport}
                    className="py-2 bg-gray-800 text-white rounded font-medium hover:bg-gray-900"
                >
                    현재 마스터 키 백업 (클립보드 복사)
                </button>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={importStr}
                        onChange={(e) => setImportStr(e.target.value)}
                        placeholder="백업해둔 텍스트 키 붙여넣기"
                        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-xs"
                    />
                    <button
                        onClick={handleImport}
                        className="px-4 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 whitespace-nowrap"
                    >
                        키 복원
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed">
                    <button
                        onClick={handleReset}
                        className="text-xs text-red-500 underline"
                    >
                        기존 키 강제 삭제 (위험)
                    </button>
                </div>
            </div>

            {/* Google Drive Integration Section */}
            <h3 className="font-bold text-gray-800 mt-8 mb-2 flex items-center gap-2">
                <span>☁️</span> Google Drive 백업 연동 (BYOS)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                사진 원본을 서버가 아닌 회원님의 Google Drive에 직접 안전하게 보관합니다.
                <br />연동하지 않아도 로컬 브라우저에서 사용할 수 있지만 백업을 권장합니다.
            </p>

            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded border">
                <span className="font-medium w-24">Drive 상태:</span>
                {driveConnected ? (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> 연동됨 ✓
                    </span>
                ) : (
                    <span className="text-gray-500">연결되지 않음</span>
                )}
            </div>

            <div className="flex flex-col gap-3">
                {driveConnected ? (
                    <button
                        onClick={() => disconnectDrive()}
                        className="py-2 px-4 bg-gray-600 text-white rounded font-medium hover:bg-gray-700 transition"
                    >
                        Google Drive 연결 해제
                    </button>
                ) : (
                    <button
                        onClick={async () => {
                            setIsConnecting(true);
                            try {
                                const res = await axios.get('/api/drive/auth');
                                if (res.data?.success && res.data?.authUrl) {
                                    window.location.href = res.data.authUrl;
                                } else {
                                    throw new Error('인증 URL을 가져오지 못했습니다.');
                                }
                            } catch (err) {
                                toast.error('연결 초기화 실패');
                                setIsConnecting(false);
                            }
                        }}
                        disabled={isConnecting}
                        className="py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded font-bold hover:shadow-lg hover:to-indigo-500 transition disabled:opacity-50"
                    >
                        {isConnecting ? '연결 중...' : 'Google 로그인 및 권한 허용'}
                    </button>
                )}
            </div>

            {/* Notification Settings Section */}
            <h3 className="font-bold text-gray-800 mt-8 mb-2 flex items-center gap-2">
                <span>🔔</span> 푸시 알림 설정
            </h3>
            <p className="text-xs text-gray-500 mb-4">
                앱이 백그라운드에 있을 때 상대방이 보낸 사진을 수신하면 알림을 받습니다.
            </p>

            <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded border">
                <span className="font-medium w-32">현재 권한 상태:</span>
                <span className={`font-bold ${getNotificationPermission() === 'granted' ? 'text-green-600' : 'text-gray-500'}`}>
                    {getNotificationPermission() === 'granted' ? '허용됨 ✓' : (getNotificationPermission() === 'denied' ? '차단됨' : '요청 전')}
                </span>
            </div>

            <div className="flex flex-col gap-3">
                <button
                    onClick={async () => {
                        const perm = await requestNotificationPermission();
                        if (perm === 'granted') {
                            toast.success('푸시 알림이 허용되었습니다!');
                            // Refresh component by triggering a fake state update
                            setStatus('푸시 알림 권한 갱신됨');
                            setTimeout(() => setStatus(''), 2000);
                        } else {
                            toast.error('푸시 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
                        }
                    }}
                    className="py-2 px-4 bg-gray-800 text-white rounded font-medium hover:bg-gray-900 transition"
                >
                    알림 권한 다시 요청하기
                </button>
            </div>
        </div>
    );
}
