import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useOnboardingStore from '../../store/onboardingStore';

const THEME = {
    museum: { bg: '#F3EFFF', color: '#7C5CFC', hover: '#6A4AE0' },
    ai: { bg: '#EFF7E8', color: '#5A9460', hover: '#4A8450' },
    share: { bg: '#EFF5FF', color: '#4A7FB5', hover: '#3A6FA5' },
};

export default function OnboardingWelcomePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { startOnboarding, setCurrentStep } = useOnboardingStore();

    const typeParam = searchParams.get('type') || 'museum';
    const theme = THEME[typeParam] || THEME.museum;

    useEffect(() => {
        localStorage.setItem('onboarding_type', typeParam);
        startOnboarding();
        setCurrentStep('start');
    }, []);

    const handleStart = () => {
        navigate('/onboarding/storage');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: theme.bg }}>
            {/* AI 이미지 */}
            <div className="mb-8">
                <img
                    src="/images/landing/card-ai-sort.png"
                    alt="AI 사진 정리"
                    className="mx-auto"
                    style={{ width: 180, height: 180, objectFit: 'contain' }}
                />
            </div>

            {/* 제목 */}
            <h1
                className="text-center mb-4"
                style={{
                    fontSize: 'clamp(26px, 5vw, 36px)',
                    fontWeight: '800',
                    fontFamily: 'Georgia, serif',
                    color: '#1E2A0E',
                    lineHeight: 1.3,
                }}
            >
                먼저 사진을 정리해드릴게요!
            </h1>

            {/* 설명 */}
            <p
                className="text-center text-[16px] sm:text-[17px] leading-relaxed max-w-[340px] mb-10"
                style={{ color: '#5A5A4A', whiteSpace: 'pre-line' }}
            >
                {'흩어진 사진들을 AI가 자동으로\n날짜별, 인물별로 정리해드립니다.\n정리된 사진으로 바로 박물관을 만들 수 있어요.'}
            </p>

            {/* 버튼 영역 */}
            <div className="w-full max-w-[320px] flex flex-col gap-3">
                <button
                    onClick={handleStart}
                    className="w-full rounded-2xl font-bold text-white text-[18px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{
                        height: 56,
                        background: `linear-gradient(135deg, ${theme.color}, ${theme.hover})`,
                    }}
                >
                    시작하기
                </button>
            </div>

            {/* 바로가기 */}
            <div className="w-full max-w-[320px] mt-10 flex flex-col items-center">
                <p className="text-[14px] mb-3" style={{ color: '#A09882' }}>
                    사진 정리가 필요 없으신가요?
                </p>
                <div className="flex gap-2 w-full">
                    <button
                        onClick={() => navigate('/onboarding/service?type=museum')}
                        className="flex-1 rounded-xl text-[15px] font-semibold cursor-pointer transition-all hover:brightness-105 active:scale-[0.98]"
                        style={{
                            height: 42,
                            background: 'transparent',
                            border: '1.5px solid #D4CFBF',
                            color: '#7A6E5E',
                        }}
                    >
                        🏛️ 가족유산박물관
                    </button>
                    <button
                        onClick={() => navigate('/onboarding/service?type=share')}
                        className="flex-1 rounded-xl text-[15px] font-semibold cursor-pointer transition-all hover:brightness-105 active:scale-[0.98]"
                        style={{
                            height: 42,
                            background: 'transparent',
                            border: '1.5px solid #D4CFBF',
                            color: '#7A6E5E',
                        }}
                    >
                        📤 실시간 공유
                    </button>
                </div>
            </div>
        </div>
    );
}
