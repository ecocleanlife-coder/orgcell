import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
    {
        bg: '#F3EFFF',
        image: '/images/landing/card-museum.png',
        imageAlt: '가족유산박물관 - 가족 유산 공간',
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

function useFadeInOnScroll() {
    const refs = useRef([]);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            },
            { threshold: 0.15 }
        );
        refs.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);
    return refs;
}

function LandingPage() {
    const navigate = useNavigate();
    const sectionRefs = useFadeInOnScroll();

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            <Helmet>
                <title>Orgcell — AI 가족 사진 자동 정리 · Family Heritage Museum</title>
                <meta name="description" content="AI Smart Sort로 중복 사진 정리, 가족 도메인 개설, Live Sharing으로 실시간 공유. 가족 사진의 모든 것을 Orgcell에서." />
                <meta property="og:title" content="Orgcell — AI 가족 사진 자동 정리" />
                <meta property="og:description" content="AI가 사진을 정리하고 나만의 가족유산박물관을 만들어보세요. 원본은 내 구글 드라이브에 안전하게." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            {/* ══ Hero Section ══ */}
            <section
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: '100vh', padding: '32px 16px 24px', background: '#FFFFFF' }}
            >
                <span
                    className="text-[24px] sm:text-[32px] font-black text-[#3D2008] mb-2 sm:mb-4"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                    Orgcell
                </span>

                <h1
                    className="mb-2 sm:mb-4"
                    style={{
                        fontSize: 'clamp(24px, 5vw, 48px)',
                        fontWeight: '800',
                        fontFamily: 'Georgia, serif',
                        color: '#1E2A0E',
                        lineHeight: 1.15,
                    }}
                >
                    흩어진 가족의 시간을<br />영원한 기록으로
                </h1>

                <p className="text-[16px] sm:text-[18px] leading-snug mb-3 sm:mb-6 max-w-[400px]" style={{ color: '#7A6E5E' }}>
                    사진은 쌓여가는데 정리는 막막하고,<br />
                    가족과 나누기도 번거로우셨죠?
                </p>

                {/* 약속 한 줄 */}
                <p
                    className="text-[15px] sm:text-[18px] mb-5 sm:mb-8 max-w-[440px]"
                    style={{ color: '#6B5E4E', fontStyle: 'italic', fontFamily: 'Georgia, serif', lineHeight: 1.4 }}
                >
                    박물관처럼 영원하게, AI처럼 스마트하게, 가족처럼 가깝게
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-[600px] mb-5 sm:mb-10">
                    {[
                        { image: '/images/landing/card-museum.png', text: '영원히 기록될 우리 가족만의 박물관', bg: '#F3EFFF' },
                        { image: '/images/landing/card-ai-sort.png', text: 'AI가 지워주는 중복, 찾아주는 추억', bg: '#EFF7E8' },
                        { image: '/images/landing/card-live-share.png', text: '부모님도 클릭 한 번이면 끝', bg: '#EFF5FF' },
                    ].map((card) => (
                        <div
                            key={card.text}
                            className="rounded-xl sm:rounded-2xl p-2 sm:p-5 text-center"
                            style={{ background: card.bg, border: '1px solid #E8E3D8' }}
                        >
                            <img
                                src={card.image}
                                alt={card.text}
                                className="mx-auto mb-1 sm:mb-2"
                                style={{ width: 60, height: 60, objectFit: 'contain' }}
                            />
                            <p className="text-[14px] sm:text-[15px] font-medium leading-tight" style={{ color: '#3D2008' }}>{card.text}</p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/onboarding/start')}
                    className="w-full max-w-[320px] rounded-2xl font-bold text-white text-[18px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    지금 시작하기
                </button>
            </section>

            {SECTIONS.map((section, idx) => (
                <section
                    key={idx}
                    ref={(el) => { sectionRefs.current[idx] = el; }}
                    className="flex flex-col items-center justify-center text-center"
                    style={{
                        minHeight: '100vh',
                        padding: '40px 24px',
                        background: section.bg,
                        opacity: 0,
                        transform: 'translateY(30px)',
                        transition: 'opacity 0.6s ease, transform 0.6s ease',
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
                        className="text-[28px] font-extrabold text-[#1E2A0E] mb-4"
                        style={{ fontFamily: 'Georgia, serif', lineHeight: 1.3 }}
                    >
                        {section.title}
                    </h2>

                    {/* 설명 */}
                    <p
                        className="text-[16px] leading-relaxed mb-8 max-w-[340px]"
                        style={{ color: '#5A5A4A', whiteSpace: 'pre-line' }}
                    >
                        {section.desc}
                    </p>

                    {/* 버튼 */}
                    <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
                        <button
                            onClick={() => navigate(`/onboarding/start?type=${section.type}`)}
                            className="w-full rounded-2xl font-bold text-white text-[18px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
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
                                className="w-full rounded-2xl font-bold text-[18px] cursor-pointer transition-all hover:brightness-105 active:scale-[0.98]"
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

            {/* ══ 왜 Orgcell인가요? ══ */}
            <section
                ref={(el) => { sectionRefs.current[3] = el; }}
                className="py-16 px-5 text-center"
                style={{
                    background: '#F9F7F4',
                    opacity: 0,
                    transform: 'translateY(30px)',
                    transition: 'opacity 0.6s ease, transform 0.6s ease',
                }}
            >
                <div className="max-w-[600px] mx-auto">
                    <h2
                        className="mb-6"
                        style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#1E2A0E' }}
                    >
                        왜 Orgcell인가요?
                    </h2>
                    <p className="text-[16px] leading-relaxed mb-8" style={{ color: '#5A5A4A' }}>
                        Orgcell은 <strong>Organize</strong>(정리)와 <strong>Cell</strong>(세포/가족단위)의 합성어입니다.<br />
                        마치 세포가 생명의 기본 단위이듯,<br />
                        가족 한 명 한 명의 소중한 기록이<br />
                        영원히 보존되어야 한다는 믿음으로 만들었습니다.
                    </p>
                    <span
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium"
                        style={{ background: '#F0F0EC', color: '#7A6E5E', border: '1px solid #E0DCD4' }}
                    >
                        🔬 본 서비스는 한국 특허 출원된 독자 기술을 적용합니다
                        <span style={{ color: '#A09882' }}>Patented Technology Applied (KR)</span>
                    </span>
                </div>
            </section>

            {/* 하단 — 로그인 링크 + 법률 문서 */}
            <div
                className="text-center"
                style={{ padding: '32px 24px 20px', background: '#FAFAF7' }}
            >
                <p className="text-[16px] text-[#7A6E5E]">
                    이미 계정이 있으신가요?{' '}
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="font-bold text-[#5A9460] hover:underline cursor-pointer"
                    >
                        로그인
                    </button>
                </p>
                <div style={{ marginTop: 20, fontSize: 13, color: '#999' }}>
                    <a href="/privacy" style={{ color: '#999', textDecoration: 'none' }} className="hover:underline">개인정보처리방침</a>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <a href="/terms" style={{ color: '#999', textDecoration: 'none' }} className="hover:underline">이용약관</a>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <a href="mailto:ecocleanlife@gmail.com" style={{ color: '#999', textDecoration: 'none' }} className="hover:underline">문의: ecocleanlife@gmail.com</a>
                </div>
                <p style={{ marginTop: 12, fontSize: 11, color: '#bbb' }}>
                    © 2026 Orgcell. All rights reserved.
                </p>
            </div>
        </div>
    );
}

export default LandingPage;
