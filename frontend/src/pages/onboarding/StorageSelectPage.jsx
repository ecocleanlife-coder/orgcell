import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';

const storageOptions = [
    {
        id: 'google',
        icon: '☁️',
        title: 'Google Drive',
        price: '무제한 무료',
        lines: ['아이폰/안드로이드/위성폰 모두 지원', '폰 바꿔도 사진 안전'],
        recommended: true,
        enabled: true,
    },
    {
        id: 'onedrive',
        icon: '☁️',
        title: 'OneDrive',
        price: '무제한 무료',
        lines: ['Windows 사용자 추천', 'Microsoft 365 연동'],
        recommended: false,
        enabled: true,
    },
    {
        id: 'orgcell',
        icon: '🏠',
        title: 'Orgcell 서버',
        price: '1,000장 $5/년 · 무제한 $10/년',
        lines: ['별도 클라우드 불필요', '바로 시작 가능'],
        recommended: false,
        enabled: true,
    },
    {
        id: 'icloud',
        icon: '🔒',
        title: 'iCloud',
        price: 'iOS 앱 출시 후 지원 예정',
        lines: ['iPhone/iPad 사용자 최적화'],
        recommended: false,
        enabled: false,
    },
];

export default function StorageSelectPage() {
    const navigate = useNavigate();
    const token = useAuthStore(s => s.token);
    const [selected, setSelected] = useState(null);
    const [showWhy, setShowWhy] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [connectError, setConnectError] = useState(null);
    // iCloud 대기자
    const [showICloudModal, setShowICloudModal] = useState(false);
    const [icloudEmail, setIcloudEmail] = useState('');
    const [icloudStatus, setIcloudStatus] = useState(null); // null | 'sending' | 'done' | 'error'

    const { setCurrentStep, completeStep, setStorage } = useOnboardingStore();

    useEffect(() => { setCurrentStep('storage'); }, []);

    const handleSelect = (option) => {
        if (!option.enabled) {
            if (option.id === 'icloud') setShowICloudModal(true);
            return;
        }
        setSelected(option.id);
    };

    // OAuth 팝업 연결
    const connectOAuth = async (storageType) => {
        setConnecting(true);
        setConnectError(null);

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const endpoint = storageType === 'google' ? '/api/drive/auth' : '/api/onedrive/auth';
            const res = await axios.get(endpoint, { headers });

            if (res.data?.success && res.data.authUrl) {
                // OAuth 팝업
                const popup = window.open(res.data.authUrl, 'oauth', 'width=500,height=600,scrollbars=yes');

                // 팝업 완료 감지
                const checkClosed = setInterval(() => {
                    if (!popup || popup.closed) {
                        clearInterval(checkClosed);
                        verifyConnection(storageType);
                    }
                }, 500);
            } else {
                setConnectError('인증 URL을 가져올 수 없습니다');
                setConnecting(false);
            }
        } catch {
            setConnectError('연결에 실패했습니다. 다시 시도해주세요.');
            setConnecting(false);
        }
    };

    // OAuth 연결 완료 확인
    const verifyConnection = async (storageType) => {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const endpoint = storageType === 'google' ? '/api/drive/status' : '/api/onedrive/status';
            const res = await axios.get(endpoint, { headers });

            if (res.data?.success && res.data.connected) {
                // 연결 성공 → 폴더 구조 설정
                const setupEndpoint = storageType === 'google' ? '/api/drive/setup' : '/api/onedrive/setup';
                await axios.post(setupEndpoint, {}, { headers }).catch(() => null);

                proceedToNext(storageType);
            } else {
                setConnectError('연결이 완료되지 않았습니다. 다시 시도해주세요.');
                setConnecting(false);
            }
        } catch {
            // 팝업 닫혔지만 연결 실패 — 재시도 안내
            setConnectError('연결 확인에 실패했습니다. 다시 시도해주세요.');
            setConnecting(false);
        }
    };

    const proceedToNext = (storageId) => {
        const storageTypeMap = { google: 'google_drive', onedrive: 'onedrive', orgcell: 'orgcell' };
        localStorage.setItem('orgcell_storage_type', storageTypeMap[storageId] || 'google_drive');
        setStorage(storageId);
        completeStep('storage');
        setConnecting(false);
        navigate(`/onboarding/photos?storage=${storageId}`);
    };

    const handleNext = () => {
        const choice = selected || 'google';

        if (choice === 'orgcell') {
            // Orgcell 서버는 OAuth 불필요
            proceedToNext('orgcell');
            return;
        }

        // Google Drive / OneDrive → OAuth 연결
        if (token) {
            connectOAuth(choice);
        } else {
            // 비로그인 상태 → 일단 다음으로 (OAuth는 로그인 후)
            proceedToNext(choice);
        }
    };

    // iCloud 대기자 등록
    const handleICloudWaitlist = async () => {
        if (!icloudEmail || !icloudEmail.includes('@')) return;
        setIcloudStatus('sending');
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.post('/api/sites/waitlist/icloud', { email: icloudEmail }, { headers });
            setIcloudStatus('done');
        } catch {
            setIcloudStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            <OnboardingProgress current="storage" />
            <div className="relative text-center pt-6 pb-4 px-4">
                <button onClick={() => navigate('/onboarding/service')} className="absolute left-4 top-4 text-[#A09882] text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-[#3D2008] mb-2">사진 저장소 선택</h1>
                <p className="text-sm text-[#7A6E5E]">사진은 본인의 클라우드에 안전하게 저장됩니다</p>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-3 px-5 pb-4 max-w-md mx-auto w-full overflow-y-auto">
                {storageOptions.map((opt) => {
                    const isSelected = selected === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => handleSelect(opt)}
                            disabled={connecting}
                            className={`relative text-left rounded-2xl p-5 transition-all active:scale-[0.98] ${
                                opt.enabled
                                    ? isSelected ? 'bg-white shadow-md' : 'bg-white shadow-sm hover:shadow-md'
                                    : 'bg-[#F5F0E8] opacity-60'
                            }`}
                            style={{ border: isSelected ? '2px solid #5A9460' : '0.5px solid #E8E3D8' }}
                        >
                            {opt.recommended && (
                                <span className="absolute -top-2.5 right-4 bg-[#5A9460] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                    추천
                                </span>
                            )}
                            <div className="flex items-start gap-4">
                                <span className="text-3xl">{opt.icon}</span>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-[#3D2008] mb-0.5">{opt.title}</h3>
                                    <p className={`text-sm font-semibold mb-2 ${opt.enabled ? 'text-[#5A9460]' : 'text-[#A09882]'}`}>
                                        {opt.price}
                                    </p>
                                    {opt.lines.map((line) => (
                                        <p key={line} className="text-xs text-[#7A6E5E] leading-relaxed">{line}</p>
                                    ))}
                                </div>
                                {opt.enabled && (
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                                        isSelected ? 'border-[#5A9460] bg-[#5A9460]' : 'border-[#D4CFBF]'
                                    }`}>
                                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}

                {/* 왜 추천? */}
                <button
                    onClick={() => setShowWhy(!showWhy)}
                    className="text-sm text-[#7A6E5E] font-medium py-2 flex items-center justify-center gap-1"
                >
                    왜 Google Drive를 추천하나요?
                    <span className={`transition-transform ${showWhy ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {showWhy && (
                    <div className="bg-white rounded-2xl p-4 border border-[#E8E3D8] text-left -mt-1">
                        <ul className="space-y-2 text-xs text-[#7A6E5E]">
                            <li className="flex gap-2"><span className="text-[#5A9460]">✓</span> 사진이 본인 계정에 저장 (우리 서버 미저장)</li>
                            <li className="flex gap-2"><span className="text-[#5A9460]">✓</span> 무제한 용량, 추가 비용 없음</li>
                            <li className="flex gap-2"><span className="text-[#5A9460]">✓</span> 기기 변경 시에도 사진 유지</li>
                            <li className="flex gap-2"><span className="text-[#5A9460]">✓</span> Google 보안 인프라 적용</li>
                        </ul>
                    </div>
                )}

                {/* 연결 에러 */}
                {connectError && (
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-red-600">{connectError}</p>
                    </div>
                )}
            </div>

            {/* 하단 고정 */}
            <div className="px-5 pb-8 max-w-md mx-auto w-full">
                <div className="bg-[#F0EDE6] rounded-xl p-3 mb-4 text-center">
                    <p className="text-xs text-[#5A9460] font-medium">
                        🔒 우리 서버에는 사진이 저장되지 않습니다 (특허 기술)
                    </p>
                </div>
                <button
                    onClick={handleNext}
                    disabled={connecting}
                    className={`w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all ${connecting ? 'opacity-60' : ''}`}
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    {connecting ? '연결 중...' : selected === 'orgcell' ? '다음' : '연결하고 다음'}
                </button>
            </div>

            {/* iCloud 대기자 모달 */}
            {showICloudModal && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowICloudModal(false)} />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-5 pb-8 pt-4 max-w-md mx-auto"
                         style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
                        <div className="w-10 h-1 bg-[#E8E3D8] rounded-full mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-[#3D2008] mb-2 text-center">iCloud 출시 알림 받기</h3>
                        <p className="text-sm text-[#7A6E5E] mb-4 text-center">
                            iOS 앱 출시 시 가장 먼저 알려드립니다
                        </p>

                        {icloudStatus === 'done' ? (
                            <div className="text-center py-4">
                                <span className="text-4xl block mb-2">✅</span>
                                <p className="text-sm font-bold text-[#5A9460]">등록 완료!</p>
                                <p className="text-xs text-[#7A6E5E] mt-1">출시 시 이메일로 알려드립니다</p>
                                <button
                                    onClick={() => setShowICloudModal(false)}
                                    className="mt-4 text-sm text-[#7A6E5E]"
                                >
                                    닫기
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="email"
                                    value={icloudEmail}
                                    onChange={(e) => setIcloudEmail(e.target.value)}
                                    placeholder="이메일 주소"
                                    className="w-full px-4 py-3 rounded-xl border border-[#E8E3D8] text-sm focus:outline-none focus:border-[#5A9460] mb-3"
                                />
                                <p className="text-[10px] text-[#A09882] mb-4">
                                    입력하신 이메일은 iCloud 연동 출시 알림 목적으로만 사용됩니다.
                                </p>
                                {icloudStatus === 'error' && (
                                    <p className="text-xs text-red-500 mb-2">등록에 실패했습니다. 다시 시도해주세요.</p>
                                )}
                                <button
                                    onClick={handleICloudWaitlist}
                                    disabled={!icloudEmail.includes('@') || icloudStatus === 'sending'}
                                    className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all disabled:opacity-40"
                                    style={{ height: 48, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                                >
                                    {icloudStatus === 'sending' ? '등록 중...' : '알림 등록'}
                                </button>
                                <button
                                    onClick={() => setShowICloudModal(false)}
                                    className="w-full mt-2 text-sm text-[#A09882] py-2"
                                >
                                    취소
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
