import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
    {
        bg: '#F3EFFF',
        image: '/images/landing/card-museum.png',
        imageAlt: '가족 박물관 - 디지털 가족 공간',
        title: '사라지지 않는 가족의 역사',
        desc: '나와 우리 가족의 소중한 기록이\n영원히 보관되는 디지털 박물관을 만들어보세요.',
        btnText: '박물관 만들기',
        btnColor: '#7C5CFC',
        btnHover: '#6A4AE0',
        type: 'museum',
    },
    {
        bg: '#EFF7E8',
        image: '/images/landing/card-ai-sort.png',
        imageAlt: 'AI 스마트 분류',
        title: '중복 사진은 지우고, 추억만 남기고',
        desc: 'AI가 수만 장의 사진 속 중복을 찾아내고\n날짜별로 깔끔하게 정리해 드립니다.',
        btnText: '시작하기',
        btnColor: '#5A9460',
        btnHover: '#4A8450',
        type: 'ai',
    },
    {
        bg: '#EFF5FF',
        image: '/images/landing/card-live-share.png',
        imageAlt: '실시간 사진 공유',
        title: '설명 없이도 쉬운 실시간 공유',
        desc: 'IT가 낯선 부모님도, 바쁜 자녀도\n클릭 한 번으로 가족의 오늘을 함께 나눕니다.',
        btnText: '시작하기',
        btnColor: '#4A7FB5',
        btnHover: '#3A6FA5',
        type: 'share',
    },
];

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            <Helmet>
                <title>Orgcell — AI 가족 사진 자동 정리 · Digital Family Museum</title>
                <meta name="description" content="AI Smart Sort로 중복 사진 정리, 가족 도메인 개설, Live Sharing으로 실시간 공유. 가족 사진의 모든 것을 Orgcell에서." />
                <meta property="og:title" content="Orgcell — AI 가족 사진 자동 정리" />
                <meta property="og:description" content="AI가 사진을 정리하고 나만의 가족 박물관을 만들어보세요. 원본은 내 구글 드라이브에 안전하게." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            {/* ══ Hero Section ══ */}
            <section
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: '100vh', padding: '60px 24px', background: '#FFFFFF' }}
            >
                <span
                    className="text-[32px] font-black text-[#3D2008] mb-4"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                    Orgcell
                </span>

                <h1
                    className="mb-4"
                    style={{
                        fontSize: 'clamp(32px, 6vw, 52px)',
                        fontWeight: '800',
                        fontFamily: 'Georgia, serif',
                        color: '#1E2A0E',
                        lineHeight: 1.2,
                    }}
                >
                    흩어진 가족의 시간을<br />영원한 기록으로
                </h1>

                <p className="text-[16px] leading-relaxed mb-10 max-w-[400px]" style={{ color: '#7A6E5E' }}>
                    사진은 쌓여가는데 정리는 막막하고,<br />
                    가족과 나누기도 번거로우셨죠?
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[600px] mb-10">
                    {[
                        { icon: '🏛️', text: '영원히 보관될 우리만의 박물관' },
                        { icon: '🤖', text: '뒤죽박죽 중복 사진 자동 정리' },
                        { icon: '📤', text: '누구나 쉬운 실시간 공유' },
                    ].map((card) => (
                        <div
                            key={card.icon}
                            className="flex-1 rounded-2xl p-5 text-center"
                            style={{ background: '#FAFAF7', border: '1px solid #E8E3D8' }}
                        >
                            <span className="text-3xl block mb-2">{card.icon}</span>
                            <p className="text-[13px] font-medium" style={{ color: '#3D2008' }}>{card.text}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/onboarding/service')}
                    className="w-full max-w-[320px] rounded-2xl font-bold text-white text-[15px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    지금 시작하기
                </button>
            </section>

            {SECTIONS.map((section, idx) => (
                <section
                    key={idx}
                    className="flex flex-col items-center justify-center text-center"
                    style={{
                        minHeight: '100vh',
                        padding: '40px 24px',
                        background: section.bg,
                    }}
                >
                    {/* 이미지 */}
                    <div className="w-full flex justify-center mb-8" style={{ maxWidth: 260 }}>
                        <img
                            src={section.image}
                            alt={section.imageAlt}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            className="w-full"
                            style={{ objectFit: 'contain', maxHeight: 240 }}
                        />
                    </div>

                    {/* 제목 */}
                    <h2
                        className="text-[26px] font-extrabold text-[#1E2A0E] mb-4"
                        style={{ fontFamily: 'Georgia, serif', lineHeight: 1.3 }}
                    >
                        {section.title}
                    </h2>

                    {/* 설명 */}
                    <p
                        className="text-[15px] leading-relaxed mb-8 max-w-[320px]"
                        style={{ color: '#5A5A4A', whiteSpace: 'pre-line' }}
                    >
                        {section.desc}
                    </p>

                    {/* 버튼 */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
                        <button
                            onClick={() => navigate(`/onboarding/service?type=${section.type}`)}
                            className="w-full rounded-2xl font-bold text-white text-[15px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{
                                height: 56,
                                background: `linear-gradient(135deg, ${section.btnColor}, ${section.btnHover})`,
                            }}
                        >
                            {section.btnText}
                        </button>
                        {idx === 0 && (
                            <button
                                onClick={() => navigate('/lee')}
                                className="w-full rounded-2xl font-bold text-[15px] cursor-pointer transition-all hover:brightness-105 active:scale-[0.98]"
                                style={{
                                    height: 48,
                                    background: 'transparent',
                                    border: `2px solid ${section.btnColor}`,
                                    color: section.btnColor,
                                }}
                            >
                                예시 보기 →
                            </button>
                        )}
                    </div>
                </section>
            ))}

            {/* 특허 출원 배지 */}
            <div className="text-center" style={{ padding: '16px 24px 0', background: '#FAFAF7' }}>
                <span
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: '#F0F0EC', color: '#7A6E5E', border: '1px solid #E0DCD4' }}
                >
                    🔬 본 서비스는 한국 특허 출원된 독자 기술을 적용합니다
                    <span style={{ color: '#A09882' }}>Patented Technology Applied (KR)</span>
                </span>
            </div>

            {/* 하단 — 로그인 링크 */}
            <div
                className="text-center"
                style={{ padding: '32px 24px', background: '#FAFAF7' }}
            >
                <p className="text-[14px] text-[#7A6E5E]">
                    이미 계정이 있으신가요?{' '}
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="font-bold text-[#5A9460] hover:underline cursor-pointer"
                    >
                        로그인
                    </button>
                </p>
            </div>
        </div>
    );
}

export default LandingPage;
