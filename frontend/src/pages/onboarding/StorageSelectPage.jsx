import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const storageOptions = [
    {
        id: 'google',
        icon: '☁️',
        title: 'Google Drive',
        price: '무제한 무료',
        lines: [
            '아이폰/안드로이드/위성폰 모두 지원',
            '폰 바꿔도 사진 안전',
        ],
        recommended: true,
        enabled: true,
    },
    {
        id: 'onedrive',
        icon: '☁️',
        title: 'OneDrive',
        price: '무제한 무료',
        lines: [
            'Windows 사용자 추천',
            'Microsoft 365 연동',
        ],
        recommended: false,
        enabled: true,
    },
    {
        id: 'orgcell',
        icon: '🏠',
        title: 'Orgcell 서버',
        price: '1,000장 $5/년 · 무제한 $10/년',
        lines: [
            '별도 클라우드 불필요',
            '바로 시작 가능',
        ],
        recommended: false,
        enabled: true,
    },
    {
        id: 'icloud',
        icon: '🔒',
        title: 'iCloud',
        price: 'iOS 앱 출시 후 지원 예정',
        lines: [
            'iPhone/iPad 사용자 최적화',
        ],
        recommended: false,
        enabled: false,
    },
];

export default function StorageSelectPage() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);
    const [interestSent, setInterestSent] = useState(false);
    const [showWhy, setShowWhy] = useState(false);
    const { setCurrentStep, completeStep, setStorage } = useOnboardingStore();

    useEffect(() => { setCurrentStep('storage'); }, []);

    const handleSelect = (option) => {
        if (!option.enabled) return;
        setSelected(option.id);
    };

    const handleNext = () => {
        const choice = selected || 'google';
        setStorage(choice);
        completeStep('storage');
        navigate(`/onboarding/photos?storage=${choice}`);
    };

    const handleInterest = (e) => {
        e.stopPropagation();
        setInterestSent(true);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            <OnboardingProgress current="storage" />
            <div className="relative text-center pt-6 pb-4 px-4">
                <button
                    onClick={() => navigate('/onboarding/service')}
                    className="absolute left-4 top-4 text-[#A09882] text-2xl"
                >
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-[#3D2008] mb-2">
                    사진 저장소 선택
                </h1>
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
                            disabled={!opt.enabled}
                            className={`relative text-left rounded-2xl p-5 transition-all active:scale-[0.98] ${
                                opt.enabled
                                    ? isSelected
                                        ? 'bg-white shadow-md'
                                        : 'bg-white shadow-sm hover:shadow-md'
                                    : 'bg-[#F5F0E8] opacity-60'
                            }`}
                            style={{
                                border: isSelected
                                    ? '2px solid #5A9460'
                                    : '0.5px solid #E8E3D8',
                            }}
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
                                    {opt.id === 'icloud' && (
                                        <button
                                            onClick={handleInterest}
                                            className={`mt-2 text-xs font-medium px-3 py-1 rounded-full transition-all ${
                                                interestSent
                                                    ? 'bg-[#E8E3D8] text-[#7A6E5E]'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }`}
                                        >
                                            {interestSent ? '등록 완료!' : '관심 등록하기'}
                                        </button>
                                    )}
                                </div>
                                {opt.enabled && (
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                                        isSelected ? 'border-[#5A9460] bg-[#5A9460]' : 'border-[#D4CFBF]'
                                    }`}>
                                        {isSelected && (
                                            <span className="text-white text-[10px] font-bold">✓</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}

                {/* 왜 추천하나요? 토글 */}
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
                    className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    다음
                </button>
            </div>
        </div>
    );
}
