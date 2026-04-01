import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const services = [
    {
        icon: '🏛️',
        title: '가족 박물관',
        desc: '가계도 · 사진 앨범 · 가족 채팅',
        sub: 'orgcell.com/yourfamily 주소 무료',
        color: '#7C5CFC',
        bg: '#F3EFFF',
        type: 'museum',
    },
    {
        icon: '🤖',
        title: 'AI 스마트 정리',
        desc: '얼굴 인식 · 자동 분류 · 중복 제거',
        sub: '수만 장의 사진을 자동으로 정리',
        color: '#5A9460',
        bg: '#EFF7E8',
        type: 'ai',
    },
    {
        icon: '📤',
        title: '실시간 공유',
        desc: 'Friend Call · 라이브 앨범 · 가족 방송',
        sub: '어디서나 실시간으로 사진 공유',
        color: '#4A7FB5',
        bg: '#EFF5FF',
        type: 'share',
    },
];

const TYPE_INDEX_MAP = { museum: 0, ai: 1, share: 2 };

export default function ServiceSelectPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { startOnboarding, setCurrentStep, completeStep } = useOnboardingStore();
    const typeParam = searchParams.get('type');
    const [current, setCurrent] = useState(() => TYPE_INDEX_MAP[typeParam] ?? 0);
    const containerRef = useRef(null);
    const touchStartX = useRef(0);
    const touchDeltaX = useRef(0);
    const isDragging = useRef(false);

    useEffect(() => {
        startOnboarding();
        setCurrentStep('service');
    }, []);

    const handleNext = () => {
        localStorage.setItem('onboarding_type', services[current].type);
        completeStep('service');
        navigate('/onboarding/storage');
    };

    // 스와이프
    const onTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        touchDeltaX.current = 0;
        isDragging.current = true;
    }, []);

    const onTouchMove = useCallback((e) => {
        if (!isDragging.current) return;
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
        if (containerRef.current) {
            const offset = -current * 100 + (touchDeltaX.current / window.innerWidth) * 100;
            containerRef.current.style.transition = 'none';
            containerRef.current.style.transform = `translateX(${offset}%)`;
        }
    }, [current]);

    const onTouchEnd = useCallback(() => {
        isDragging.current = false;
        const threshold = 50;
        if (touchDeltaX.current < -threshold && current < services.length - 1) {
            setCurrent(current + 1);
        } else if (touchDeltaX.current > threshold && current > 0) {
            setCurrent(current - 1);
        }
        if (containerRef.current) {
            containerRef.current.style.transition = 'transform 0.3s ease-out';
            containerRef.current.style.transform = `translateX(-${current + (touchDeltaX.current < -threshold && current < services.length - 1 ? 1 : touchDeltaX.current > threshold && current > 0 ? -1 : 0)}00%)`;
        }
    }, [current]);

    // current 변경 시 위치 보정
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.style.transition = 'transform 0.3s ease-out';
            containerRef.current.style.transform = `translateX(-${current * 100}%)`;
        }
    }, [current]);

    const svc = services[current];

    return (
        <div className="min-h-screen flex flex-col" style={{ background: services[current].bg }}>
            <OnboardingProgress current="service" />
            <div className="text-center pt-6 pb-4 px-4">
                <h1 className="text-[28px] font-bold text-[#3D2008] mb-2">
                    어떤 서비스를 먼저 시작할까요?
                </h1>
                <p className="text-[15px] text-[#7A6E5E]">스와이프하여 서비스를 살펴보세요</p>
            </div>

            {/* 스와이프 카드 영역 */}
            <div className="flex-1 flex flex-col justify-center px-5 max-w-md mx-auto w-full overflow-hidden">
                <div
                    className="flex w-full"
                    ref={containerRef}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{ transform: 'translateX(0%)' }}
                >
                    {services.map((svc, idx) => (
                        <div
                            key={svc.title}
                            className="w-full flex-shrink-0 px-2"
                        >
                            <div
                                className="rounded-3xl p-8 border border-[#E8E3D8] text-center"
                                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', background: idx === current ? '#FFFFFF' : svc.bg }}
                            >
                                <div
                                    className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6"
                                    style={{ background: svc.color + '15' }}
                                >
                                    <span className="text-5xl">{svc.icon}</span>
                                </div>
                                <h3 className="text-[22px] font-bold text-[#3D2008] mb-3">{svc.title}</h3>
                                <p className="text-[15px] text-[#7A6E5E] mb-3 leading-relaxed">{svc.desc}</p>
                                <span
                                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full"
                                    style={{ background: svc.color + '15', color: svc.color }}
                                >
                                    {svc.sub}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 점 인디케이터 */}
                <div className="flex justify-center gap-2.5 mt-6">
                    {services.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            className={`rounded-full transition-all duration-300 ${
                                idx === current
                                    ? 'w-6 h-2.5 bg-[#5A9460]'
                                    : 'w-2.5 h-2.5 bg-[#D4CFBF]'
                            }`}
                        />
                    ))}
                </div>

                <p className="text-center text-xs text-[#A09882] mt-4">
                    모든 서비스를 함께 사용할 수 있습니다
                </p>
            </div>

            {/* 하단 고정 버튼 */}
            <div className="px-5 pb-8 max-w-md mx-auto w-full">
                <button
                    onClick={handleNext}
                    className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    다음
                </button>
                <p className="text-center text-xs text-[#A09882] mt-3">
                    위성폰 포함 모든 기기 지원
                </p>
            </div>
        </div>
    );
}
