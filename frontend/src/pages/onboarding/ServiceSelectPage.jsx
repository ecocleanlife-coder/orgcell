import React from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

const services = [
    {
        icon: '🏛️',
        title: '가족 박물관',
        desc: '가계도 · 사진 앨범 · 가족 채팅',
        sub: 'yourfamily.orgcell.com 도메인 무료',
        gradient: 'from-emerald-500 to-teal-600',
    },
    {
        icon: '🤖',
        title: 'AI 스마트 정리',
        desc: '얼굴 인식 · 자동 분류 · 중복 제거',
        sub: '수만 장의 사진을 자동으로 정리',
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        icon: '📤',
        title: '실시간 공유',
        desc: 'Friend Call · 라이브 앨범 · 가족 방송',
        sub: '어디서나 실시간으로 사진 공유',
        gradient: 'from-purple-500 to-pink-600',
    },
];

export default function ServiceSelectPage() {
    const navigate = useNavigate();

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{
                background: 'linear-gradient(135deg, #FAFAF7 0%, #F0EDE6 100%)',
            }}
        >
            {/* Header */}
            <OnboardingProgress current="service" />
            <div className="text-center pt-6 pb-6 px-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Orgcell로 무엇을 하시겠습니까?
                </h1>
                <p className="text-sm text-gray-500">모든 서비스를 함께 사용할 수 있습니다</p>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-4 px-5 pb-8 max-w-md mx-auto w-full">
                {services.map((svc) => (
                    <button
                        key={svc.title}
                        onClick={() => navigate('/onboarding/storage')}
                        className="text-left rounded-2xl p-5 bg-white border border-gray-200 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-start gap-4">
                            <span className="text-4xl">{svc.icon}</span>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{svc.title}</h3>
                                <p className="text-sm text-gray-600 mb-2">{svc.desc}</p>
                                <span className="text-xs text-emerald-600 font-medium">{svc.sub}</span>
                            </div>
                            <span className="text-gray-400 text-xl mt-1">&rsaquo;</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="text-center pb-8 px-4">
                <p className="text-xs text-gray-400">위성폰 포함 모든 기기 지원</p>
            </div>
        </div>
    );
}
