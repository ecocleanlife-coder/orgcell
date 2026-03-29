import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

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
        icon: '🍎',
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
    const [interestSent, setInterestSent] = useState(false);

    const handleSelect = (option) => {
        if (!option.enabled) return;
        navigate(`/onboarding/photos?storage=${option.id}`);
    };

    const handleInterest = (e) => {
        e.stopPropagation();
        setInterestSent(true);
    };

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{
                background: 'linear-gradient(135deg, #FAFAF7 0%, #F0EDE6 100%)',
            }}
        >
            {/* Header */}
            <OnboardingProgress current="storage" />
            <div className="relative text-center pt-6 pb-6 px-4">
                <button
                    onClick={() => navigate('/onboarding/service')}
                    className="absolute left-4 top-4 text-gray-400 text-2xl"
                >
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    사진 저장소 선택
                </h1>
                <p className="text-sm text-gray-500">사진은 본인의 클라우드에 안전하게 저장됩니다</p>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-4 px-5 pb-4 max-w-md mx-auto w-full">
                {storageOptions.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => handleSelect(opt)}
                        disabled={!opt.enabled}
                        className={`relative text-left rounded-2xl p-5 border transition-all ${
                            opt.enabled
                                ? 'bg-white border-gray-200 shadow-sm hover:shadow-md active:scale-[0.98]'
                                : 'bg-gray-50 border-gray-100 opacity-70'
                        }`}
                    >
                        {opt.recommended && (
                            <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                추천
                            </span>
                        )}
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">{opt.icon}</span>
                            <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-900 mb-0.5">{opt.title}</h3>
                                <p className={`text-sm font-semibold mb-2 ${opt.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    {opt.price}
                                </p>
                                {opt.lines.map((line) => (
                                    <p key={line} className="text-xs text-gray-500 leading-relaxed">{line}</p>
                                ))}
                                {opt.id === 'icloud' && (
                                    <button
                                        onClick={handleInterest}
                                        className={`mt-2 text-xs font-medium px-3 py-1 rounded-full transition-all ${
                                            interestSent
                                                ? 'bg-gray-200 text-gray-500'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                        }`}
                                    >
                                        {interestSent ? '등록 완료!' : '관심 등록하기'}
                                    </button>
                                )}
                            </div>
                            {opt.enabled && <span className="text-gray-400 text-xl mt-1">&rsaquo;</span>}
                        </div>
                    </button>
                ))}
            </div>

            {/* Bottom info */}
            <div className="text-center pb-8 px-6">
                <div className="bg-emerald-50 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-xs text-emerald-700 font-medium mb-1">
                        🔒 우리 서버에는 사진이 저장되지 않습니다 (특허 기술)
                    </p>
                    <p className="text-xs text-emerald-600">
                        위성폰 포함 모든 기기 지원
                    </p>
                </div>
            </div>
        </div>
    );
}
