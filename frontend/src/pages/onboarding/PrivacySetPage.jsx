import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const PRIVACY_OPTIONS = [
    {
        id: 'public',
        icon: '🌍',
        title: '일반공개',
        badge: '기본 권장',
        desc: '누구나 볼 수 있어요',
        detail: '박물관 방문자 전체',
    },
    {
        id: 'family',
        icon: '👨‍👩‍👧‍👦',
        title: '가족공개',
        badge: null,
        desc: '초대된 가족만 볼 수 있어요',
        detail: '가족 초대 필요',
    },
    {
        id: 'private',
        icon: '🔒',
        title: '본인보관',
        badge: null,
        desc: '나만 볼 수 있어요',
        detail: '완전한 프라이버시',
    },
];

export default function PrivacySetPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';

    const [selected, setSelected] = useState('public');
    const { setCurrentStep, completeStep } = useOnboardingStore();

    useEffect(() => { setCurrentStep('privacy'); }, []);

    const handleApply = () => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        localStorage.setItem('orgcell_family_setup', JSON.stringify({
            ...setup,
            defaultPrivacy: selected,
        }));
        completeStep('privacy');
        navigate(`/onboarding/invite?storage=${storage}&privacy=${selected}`);
    };

    const handleSkip = () => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        localStorage.setItem('orgcell_family_setup', JSON.stringify({
            ...setup,
            defaultPrivacy: 'public',
        }));
        completeStep('privacy');
        navigate(`/onboarding/invite?storage=${storage}&privacy=public`);
    };

    const onboardingType = localStorage.getItem('onboarding_type') || 'museum';
    const themeBg = { museum: '#F3EFFF', ai: '#EFF7E8', share: '#EFF5FF' }[onboardingType];

    return (
        <div className="min-h-screen flex flex-col" style={{ background: themeBg }}>
            {/* Header */}
            <OnboardingProgress current="privacy" />
            <div className="relative text-center pt-6 pb-6 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-[28px] font-bold text-gray-900 mb-2">공개 범위 설정</h1>
                <p className="text-[15px] text-gray-500">
                    사진 공개 범위를 설정하시겠어요?
                    <br />기본은 일반공개입니다.
                </p>
            </div>

            {/* Options */}
            <div className="flex-1 flex flex-col gap-3 px-5 pb-4 max-w-md mx-auto w-full">
                {PRIVACY_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setSelected(opt.id)}
                        className={`relative text-left rounded-2xl p-5 border-2 transition-all active:scale-[0.98] ${
                            selected === opt.id
                                ? 'border-emerald-500 bg-white shadow-md'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                    >
                        {opt.badge && (
                            <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                {opt.badge}
                            </span>
                        )}
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">{opt.icon}</span>
                            <div className="flex-1">
                                <h3 className="text-[18px] font-bold text-gray-900 mb-0.5">{opt.title}</h3>
                                <p className="text-[15px] text-gray-600">{opt.desc}</p>
                                <p className="text-[13px] text-gray-400 mt-1">{opt.detail}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 ${
                                selected === opt.id ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                            }`}>
                                {selected === opt.id && (
                                    <span className="text-white text-[10px] font-bold">✓</span>
                                )}
                            </div>
                        </div>
                    </button>
                ))}

                {/* 사진별 설정 안내 */}
                {selected === 'family' && (
                    <div className="bg-blue-50 rounded-xl p-4 mt-2">
                        <p className="text-xs text-blue-700">
                            💡 가족공개로 설정하면, 다음 단계에서 가족을 초대할 수 있습니다.
                            초대된 가족만 사진을 볼 수 있어요.
                        </p>
                    </div>
                )}
                {selected === 'private' && (
                    <div className="bg-amber-50 rounded-xl p-4 mt-2">
                        <p className="text-xs text-amber-700">
                            🔒 본인보관으로 설정하면, 다른 사람은 박물관을 방문해도 사진을 볼 수 없습니다.
                            나중에 공개로 변경할 수 있어요.
                        </p>
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className="px-5 pb-8 max-w-md mx-auto w-full space-y-3">
                <button
                    onClick={handleApply}
                    className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    지금 설정하기
                </button>
                <button
                    onClick={handleSkip}
                    className="w-full text-center text-sm text-gray-400 py-2"
                >
                    나중에 설정 (기본: 일반공개) →
                </button>
            </div>
        </div>
    );
}
