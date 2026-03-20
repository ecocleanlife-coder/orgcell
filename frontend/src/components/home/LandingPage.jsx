import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import LoginButton from '../auth/LoginButton';
import MagicLinkAuth from '../auth/MagicLinkAuth';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

function LandingPage() {
    const { t } = useTranslation();
    const devLogin = useAuthStore(state => state.devLogin);
    const isLoading = useAuthStore(state => state.isLoading);
    const token = useAuthStore(state => state.token);
    const user = useAuthStore(state => state.user);
    const [name, setName] = useState('Test User');
    const [email, setEmail] = useState('test@orgcell.com');
    const navigate = useNavigate();

    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [newsletterStatus, setNewsletterStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [newsletterMsg, setNewsletterMsg] = useState('');

    const handleDevLogin = () => devLogin(name, email);

    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const isAuthenticated = !!(token && user);

    const handleCheckout = useCallback(async (e) => {
        if (e) e.stopPropagation();
        // 비로그인 시 로그인 페이지로 이동 → 로그인 후 자동 결제 진행
        if (!isAuthenticated) {
            navigate('/auth/login?next=checkout');
            return;
        }
        if (checkoutLoading) return;
        setCheckoutLoading(true);
        try {
            const res = await axios.post('/api/payment/create-checkout-session', { email: user?.email });
            if (res.data?.url) window.location.href = res.data.url;
        } catch (err) {
            console.error('Checkout error:', err);
            alert('결제 세션을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setCheckoutLoading(false);
        }
    }, [checkoutLoading, isAuthenticated, navigate, user]);

    const handleNewsletterSubmit = async (e) => {
        e.preventDefault();
        if (!newsletterEmail) return;
        setNewsletterStatus('loading');
        try {
            const res = await axios.post('/api/newsletter', { email: newsletterEmail });
            setNewsletterStatus('success');
            setNewsletterMsg(res.data.message || '감사합니다! 곧 소식 전해드릴게요 🎉');
            setNewsletterEmail('');
        } catch (err) {
            setNewsletterStatus('error');
            setNewsletterMsg(err.response?.data?.message || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    const scrollToLogin = () => {
        const el = document.getElementById('login-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToAbout = () => {
        const el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToQA = () => {
        const el = document.getElementById('qa-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#F5F2EC] font-sans text-slate-800 overflow-x-hidden">
            <Helmet>
                <title>Orgcell — AI 가족 사진 자동 정리 · Digital Family Museum</title>
                <meta name="description" content="AI Smart Sort로 중복 사진 정리, $10 Family Website로 가족 도메인 개설, Live Sharing으로 실시간 공유. 가족 사진의 모든 것을 Orgcell에서." />
                <meta property="og:title" content="Orgcell — AI 가족 사진 자동 정리" />
                <meta property="og:description" content="AI가 사진을 정리하고, $10으로 나만의 가족 웹사이트를 만드세요. 원본은 구글 드라이브에 안전하게." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            {/* ================================================================
                NAV BAR — 원본: 상단 12%, 좌(About Museum) 중앙(Orgcell) 우(Sort Sort Share English)
                ================================================================ */}
            <div className="sticky top-0 z-50 bg-[#F5F2EC]/95 backdrop-blur-sm border-b border-[#e8e2d6]/50">
            <nav className="max-w-[1040px] mx-auto px-5 pt-4 pb-2 flex justify-between items-end">
                {/* 좌측: About, Museum */}
                <div className="flex items-end gap-7">
                    <button onClick={scrollToAbout} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 transition cursor-pointer">
                        <img src="https://i.pravatar.cc/150?u=family" className="w-[42px] h-[42px] rounded-full object-cover border border-slate-200 shadow-sm" alt="About" />
                        About
                    </button>
                    <button onClick={scrollToQA} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-green-600 transition cursor-pointer">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#eee9dd] border border-[#e0dace] shadow-sm flex items-center justify-center text-[20px]">💡</div>
                        Q&A
                    </button>
                </div>

                {/* 중앙: Orgcell + 태그라인 */}
                <div className="flex flex-col items-center select-none -mb-1">
                    <span className="text-[46px] font-black text-[#5C3D1E] tracking-tight leading-none" style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}>Orgcell<span className="text-[32px] text-[#8a7040]">.com</span></span>
                    <span className="text-[13px] text-[#8a7e6e] italic tracking-wide leading-none mt-1" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.subtitle')}</span>
                </div>

                {/* 우측: Sort, Sort, Share + Language */}
                <div className="flex items-end gap-6">
                    <button onClick={() => navigate('/smart-sort')} className="hidden sm:flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition cursor-pointer">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#eee9dd] border border-[#e0dace] shadow-sm flex items-center justify-center text-[20px]">🖼️</div>
                        Sort
                    </button>
                    <button onClick={() => navigate('/family-website')} className="hidden sm:flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-purple-600 transition cursor-pointer">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#eee9dd] border border-[#e0dace] shadow-sm flex items-center justify-center text-[20px]">🏛️</div>
                        Museum
                    </button>
                    <button onClick={() => navigate('/live-sharing')} className="hidden sm:flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-pink-600 transition cursor-pointer">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#eee9dd] border border-[#e0dace] shadow-sm flex items-center justify-center text-[20px]">💬</div>
                        Share
                    </button>
                    <div className="mb-1"><LanguageSwitcher /></div>
                </div>
            </nav>
            </div>

            {/* ================================================================
                HERO + CARDS wrapper — relative로 겹침 구현
                원본: 히어로가 전체의 ~49%, 카드가 히어로 하단 ~30px 겹침
                ================================================================ */}
            <div className="relative max-w-[1040px] mx-auto px-5 mt-3">

                {/* ──── HERO CARD ──── */}
                <div
                    className="relative z-0 rounded-[22px] overflow-visible"
                    style={{
                        background: 'linear-gradient(135deg, #f0ebe0 0%, #ede7da 50%, #e8e1d3 100%)',
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)',
                        minHeight: '400px',
                    }}
                >
                    {/* 히어로 내부 — 38% 텍스트 / 62% 액자 */}
                    <div className="grid lg:grid-cols-[38%_62%] items-start" style={{ minHeight: '400px' }}>

                        {/* ── 좌측: 텍스트 영역 ── */}
                        {/* 원본: 상단에서 ~25% 지점 시작, 좌측 패딩 ~7% */}
                        <div className="pt-12 lg:pt-16 pl-8 lg:pl-10 pb-10 flex flex-col justify-center">
                            <h1 className="text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, \"Times New Roman\", serif', fontWeight: 800 }}>
                                <span className="block whitespace-nowrap text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.15]">{t('landing.heroLine1')}</span>
                                <span className="block whitespace-nowrap text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.15]">{t('landing.heroLine2')}</span>
                            </h1>

                            {/* 서브텍스트 — 원본: 제목 아래 ~15px */}
                            <p className="text-[#6b5d4d] text-[17px] mt-4 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                                {t('landing.heroSub')}
                            </p>

                            {/* CTA 버튼 2개 — 원본: 초록 둥근 + 흰색 테두리 둥근 */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={scrollToLogin}
                                    className="px-6 py-3 rounded-full font-bold text-[15px] shadow-md cursor-pointer transition-all hover:brightness-105 active:scale-95 whitespace-nowrap"
                                    style={{ background: '#8DB86B', color: '#fff' }}
                                >
                                    {t('landing.ctaCreate')}
                                </button>
                                <button
                                    onClick={() => navigate('/family-website')}
                                    className="px-6 py-3 rounded-full font-bold text-[15px] cursor-pointer transition-all hover:bg-white whitespace-nowrap"
                                    style={{ background: '#fff', border: '1.5px solid #c5bfb3', color: '#4a4031' }}
                                >
                                    {t('landing.ctaExplore')}
                                </button>
                            </div>
                            {/* 플랜 안내 */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                                <span className="text-[12px] text-[#7a6e5e]">🆓 {t('landing.freePlanNote')}</span>
                                <span className="text-[12px] text-[#3a7a3a] font-semibold">🔒 {t('landing.privacyBadge')}</span>
                            </div>
                        </div>

                        {/* ── 우측: 가계도 액자 ──
                            원본: 히어로 우측 62%, 액자가 히어로 아래로 ~40px 돌출
                            액자에 우하단 그림자 */}
                        <div className="relative flex justify-center lg:justify-end items-start pt-4 lg:pt-6 pr-4 lg:pr-6">
                            <img
                                src="/images/landing/hero-family-tree.png"
                                alt="Orgcell 가족 박물관 - 가계도 시각화"
                                width="480"
                                height="400"
                                className="relative z-10 w-full max-w-[480px]"
                                style={{
                                    filter: 'drop-shadow(8px 12px 24px rgba(50, 30, 10, 0.30))',
                                    marginBottom: '-50px',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ──── FEATURE CARDS ────
                    원본: 히어로 하단과 겹침, 3등분
                    좌: 보라(-3도), 중앙: 초록(높게, 0도), 우: 파랑(+3도)
                    각 카드 상단에 일러스트가 카드 밖으로 돌출
                    카드는 종이 느낌 — 둥근 모서리, 미세 그림자, 살짝 접힌 느낌 */}
                <div className="relative z-20 -mt-3 grid md:grid-cols-3 gap-5 lg:gap-7 px-1">

                    {/* ─ 보라 카드: AI Smart Sort ─ */}
                    <button
                        onClick={() => navigate('/smart-sort')}
                        className="relative group focus:outline-none cursor-pointer"
                        style={{ transform: 'rotate(-2.5deg)' }}
                    >
                        <div
                            className="rounded-[18px] pt-5 pb-7 px-5 text-center overflow-visible relative"
                            style={{
                                background: 'linear-gradient(160deg, #e8ddf5 0%, #ddd0ee 100%)',
                                boxShadow: '4px 8px 24px rgba(100, 60, 140, 0.18), 0 2px 6px rgba(0,0,0,0.06)',
                            }}
                        >
                            {/* 일러스트 — 카드 위로 돌출, 원본: 일러스트 ~60% 너비 */}
                            <div className="relative -mt-[110px] mb-3 flex justify-center pointer-events-none">
                                <img
                                    src="/images/landing/card-ai-sort.png"
                                    alt="AI Smart Sort - 사진 자동 분류"
                                    loading="lazy"
                                    className="w-[62%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#2d2435] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.card1Title')}</h3>
                            <p className="text-[#5a5066] text-[12.5px] leading-[1.6]">{t('landing.card1Desc')}</p>
                        </div>
                    </button>

                    {/* ─ 초록 카드: $10 Family Website ─
                        원본: 다른 카드보다 위에 위치 (살짝 올라감) */}
                    <div className="relative group md:-mt-6">
                        <div
                            className="rounded-[18px] pt-5 pb-6 px-5 text-center overflow-visible relative"
                            style={{
                                background: 'linear-gradient(160deg, #d6e8d8 0%, #c8ddc9 100%)',
                                boxShadow: '4px 8px 24px rgba(60, 110, 60, 0.18), 0 2px 6px rgba(0,0,0,0.06)',
                            }}
                        >
                            {/* 박물관 — 지붕이 더 높이 돌출 */}
                            <div className="relative -mt-[120px] mb-3 flex justify-center pointer-events-none">
                                <img
                                    src="/images/landing/card-museum.png"
                                    alt="가족 박물관 - 디지털 가족 공간"
                                    loading="lazy"
                                    className="w-[55%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#1e3020] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.card2Title')}</h3>
                            <p className="text-[#485a49] text-[12.5px] leading-[1.6] mb-3">{t('landing.card2Desc')}</p>

                            {/* 가격 + CTA */}
                            <button
                                onClick={handleCheckout}
                                disabled={checkoutLoading}
                                className="w-full py-2.5 rounded-full font-bold text-[13px] text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer mb-2 disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #4A7F4A, #3a6e3a)' }}
                            >
                                {checkoutLoading ? t('landing.checkoutLoading') : t('landing.checkoutCta')}
                            </button>

                            {/* 소개 무료 링크 */}
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/redeem'); }}
                                className="text-[11px] font-semibold leading-snug transition-all cursor-pointer hover:underline"
                                style={{ color: '#3a6e3a' }}
                            >
                                {t('landing.referralCta')}
                            </button>
                        </div>
                    </div>

                    {/* ─ 파랑 카드: Live Photo Sharing ─ */}
                    <button
                        onClick={() => navigate('/live-sharing')}
                        className="relative group focus:outline-none cursor-pointer"
                        style={{ transform: 'rotate(2.5deg)' }}
                    >
                        <div
                            className="rounded-[18px] pt-5 pb-7 px-5 text-center overflow-visible relative"
                            style={{
                                background: 'linear-gradient(160deg, #cee0f2 0%, #c0d5ea 100%)',
                                boxShadow: '4px 8px 24px rgba(60, 90, 140, 0.18), 0 2px 6px rgba(0,0,0,0.06)',
                            }}
                        >
                            <div className="relative -mt-[95px] mb-3 flex justify-center pointer-events-none">
                                <img
                                    src="/images/landing/card-live-share.png"
                                    alt="Live Photo Sharing - 실시간 사진 공유"
                                    loading="lazy"
                                    className="w-[72%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#1e2a38] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.card3Title')}</h3>
                            <p className="text-[#4a5868] text-[12.5px] leading-[1.6]">{t('landing.card3Desc')}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ================================================================
                STATS BANNER
                ================================================================ */}
            <div className="max-w-[960px] mx-auto px-6 py-6">
                <div className="grid grid-cols-3 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #4a7f4a 0%, #3d6b3d 100%)' }}>
                    <div className="text-center py-7 px-4">
                        <div className="text-[34px] font-black text-white leading-none">0</div>
                        <div className="text-[11px] text-green-200 mt-2 leading-tight">{t('landing.statServerLabel')}</div>
                    </div>
                    <div className="text-center py-7 px-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                        <div className="text-[34px] font-black text-white leading-none">∞</div>
                        <div className="text-[11px] text-green-200 mt-2 leading-tight">{t('landing.statStorageLabel')}</div>
                    </div>
                    <div className="text-center py-7 px-4">
                        <div className="text-[34px] font-black text-white leading-none">100</div>
                        <div className="text-[11px] text-green-200 mt-2 leading-tight">{t('landing.statFreeLabel')}</div>
                    </div>
                </div>
            </div>

            {/* ================================================================
                PROBLEM SECTION — 이런 경험 있으신가요?
                ================================================================ */}
            <section className="max-w-[960px] mx-auto px-6 pt-24 pb-10">
                <div className="text-center mb-10">
                    <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-bold tracking-widest uppercase mb-4"
                        style={{ background: '#EDE7D9', color: '#8a7040' }}>
                        {t('landing.problemLabel')}
                    </span>
                    <h2 className="text-[28px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                        {t('landing.problemTitle')}
                    </h2>
                    <p className="text-[#8a7e6e] mt-2 text-sm">{t('landing.problemSubtitle')}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-5">
                    {[
                        { emoji: '📸', title: t('landing.problem1Title'), desc: t('landing.problem1Desc') },
                        { emoji: '📅', title: t('landing.problem2Title'), desc: t('landing.problem2Desc') },
                        { emoji: '👨‍👩‍👧', title: t('landing.problem3Title'), desc: t('landing.problem3Desc') },
                    ].map(({ emoji, title, desc }) => (
                        <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center hover:shadow-md transition-shadow">
                            <div className="text-4xl mb-3">{emoji}</div>
                            <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">{title}</h3>
                            <p className="text-[#6b5d4d] text-[13px] leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-8">
                    <p className="text-[15px] font-semibold text-[#5C3D1E]" style={{ fontFamily: 'Georgia, serif' }}>
                        {t('landing.problemSolution')}
                    </p>
                </div>
            </section>

            {/* ================================================================
                ABOUT SECTION
                ================================================================ */}
            <section id="about-section" className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
                <div className="text-center mb-10">
                    <h2 className="text-[28px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.aboutTitle')}</h2>
                    <p className="text-[#8a7e6e] mt-2 text-sm">{t('landing.aboutSubtitle')}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">🌳</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">{t('landing.about1Title')}</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">{t('landing.about1Desc')}</p>
                    </div>
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">📸</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">{t('landing.about2Title')}</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">{t('landing.about2Desc')}</p>
                    </div>
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">🔒</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">{t('landing.about3Title')}</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">{t('landing.about3Desc')}</p>
                    </div>
                </div>
            </section>

            {/* ================================================================
                HOW IT WORKS
                ================================================================ */}
            <section className="max-w-[960px] mx-auto px-6 pt-16 pb-4">
                <div className="text-center mb-12">
                    <h2 className="text-[28px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                        {t('landing.howTitle')}
                    </h2>
                    <p className="text-[#8a7e6e] mt-2 text-sm">{t('landing.howSubtitle')}</p>
                </div>
                <div className="relative">
                    {/* Connecting line (desktop) */}
                    <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-0.5" style={{ background: 'linear-gradient(90deg, #d4a834, #8DB86B, #5b8fcd)' }} />
                    <div className="grid md:grid-cols-3 gap-8 relative z-10">
                        {[
                            { step: '01', color: '#d4a834', bg: '#FFF8E8', emoji: '🔑', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
                            { step: '02', color: '#8DB86B', bg: '#F0F8F0', emoji: '🤖', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
                            { step: '03', color: '#5b8fcd', bg: '#EEF4FF', emoji: '🎉', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
                        ].map(({ step, color, bg, emoji, title, desc }) => (
                            <div key={step} className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm"
                                    style={{ background: bg, border: `2px solid ${color}30` }}>
                                    {emoji}
                                </div>
                                <span className="text-[11px] font-black tracking-widest mb-1" style={{ color }}>{step}</span>
                                <h3 className="text-[16px] font-bold text-[#3D2008] mb-2">{title}</h3>
                                <p className="text-[#6b5d4d] text-[13px] leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================================================================
                EMAIL CTA SECTION
                ================================================================ */}
            <section className="max-w-[720px] mx-auto px-6 pt-14 pb-4">
                <div className="rounded-[22px] p-8 text-center"
                    style={{ background: 'linear-gradient(135deg, #f0ebe0 0%, #ede7da 100%)', border: '1px solid #e3ddd0' }}>
                    <h2 className="text-[22px] font-bold text-[#2a1c08] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                        {t('landing.newsletterTitle')}
                    </h2>
                    <p className="text-[#7a6e5e] text-[13px] mb-6 leading-relaxed">
                        {t('landing.newsletterSubtitle').split('\n').map((line, i) => (
                            <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
                        ))}
                    </p>
                    <form
                        onSubmit={handleNewsletterSubmit}
                        className="flex flex-col sm:flex-row gap-2 max-w-[420px] mx-auto"
                    >
                        <input
                            type="email"
                            value={newsletterEmail}
                            onChange={(e) => { setNewsletterEmail(e.target.value); setNewsletterStatus(null); }}
                            placeholder={t('landing.newsletterPlaceholder')}
                            required
                            disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                            className="flex-1 px-4 py-3 rounded-full text-[14px] outline-none border focus:ring-2"
                            style={{ border: '1.5px solid #c5bfb3', background: 'white' }}
                        />
                        <button
                            type="submit"
                            disabled={newsletterStatus === 'loading' || newsletterStatus === 'success'}
                            className="px-6 py-3 rounded-full font-bold text-[14px] text-white cursor-pointer transition-all hover:brightness-105 active:scale-95 whitespace-nowrap disabled:opacity-60"
                            style={{ background: '#8DB86B' }}
                        >
                            {newsletterStatus === 'loading' ? t('landing.newsletterLoading') : t('landing.newsletterBtn')}
                        </button>
                    </form>
                    {newsletterStatus && (
                        <p className={`text-[13px] mt-2 font-medium ${newsletterStatus === 'success' ? 'text-[#2a6a2a]' : 'text-[#c0392b]'}`}>
                            {newsletterMsg}
                        </p>
                    )}
                    <p className="text-[11px] text-[#a09080] mt-3">{t('landing.newsletterPrivacy')}</p>
                </div>
            </section>

            {/* ================================================================
                TESTIMONIALS SECTION
                ================================================================ */}
            <section className="max-w-[960px] mx-auto px-6 pt-4 pb-10">
                <div className="text-center mb-8">
                    <h2 className="text-[22px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.testimonialsTitle')}</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {[
                        { nameKey: 'review1Name', roleKey: 'review1Role', textKey: 'review1Text' },
                        { nameKey: 'review2Name', roleKey: 'review2Role', textKey: 'review2Text' },
                        { nameKey: 'review3Name', roleKey: 'review3Role', textKey: 'review3Text' },
                    ].map(({ nameKey, roleKey, textKey }) => (
                        <div key={nameKey} className="bg-white/80 rounded-2xl p-5 shadow-sm border border-[#e8e2d6] flex flex-col">
                            <div className="flex gap-0.5 mb-3">
                                {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-sm">★</span>)}
                            </div>
                            <p className="text-[13px] text-[#6b5d4d] leading-relaxed flex-1 mb-4">"{t(`landing.${textKey}`)}"</p>
                            <div>
                                <p className="text-[12px] font-bold text-[#3D2008]">{t(`landing.${nameKey}`)}</p>
                                <p className="text-[11px] text-[#a09080]">{t(`landing.${roleKey}`)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ================================================================
                FAQ / Q&A SECTION
                ================================================================ */}
            <section id="qa-section" className="max-w-[800px] mx-auto px-6 pt-12 pb-16">
                <div className="text-center mb-10">
                    <h2 className="text-[28px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>{t('landing.faqTitle')}</h2>
                    <p className="text-[#8a7e6e] mt-2 text-sm">{t('landing.faqSubtitle')}</p>
                </div>
                <div className="space-y-4">
                    {/* Q1 */}
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                        <h3 className="font-bold text-[#3D2008] text-[15px] mb-2 flex gap-2 items-start"><span className="text-amber-600">Q.</span> {t('landing.faq1Q')}</h3>
                        <div className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                            <span className="font-bold text-[#3D2008]">A. {t('landing.faq1AHead')}</span> {t('landing.faq1A')}
                        </div>
                    </div>
                    {/* Q2 */}
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                        <h3 className="font-bold text-[#3D2008] text-[15px] mb-2 flex gap-2 items-start"><span className="text-amber-600">Q.</span> {t('landing.faq2Q')}</h3>
                        <div className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                            <span className="font-bold text-[#3D2008]">A. {t('landing.faq2AHead')}</span> {t('landing.faq2A')}
                        </div>
                    </div>
                    {/* Q3 */}
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                        <h3 className="font-bold text-[#3D2008] text-[15px] mb-2 flex gap-2 items-start"><span className="text-amber-600">Q.</span> {t('landing.faq3Q')}</h3>
                        <div className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                            <span className="font-bold text-[#3D2008]">A. {t('landing.faq3AHead')}</span> {t('landing.faq3A')}
                        </div>
                    </div>
                    {/* Q4-Q8 */}
                    {[4, 5, 6, 7, 8].map(n => (
                        <div key={n} className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                            <h3 className="font-bold text-[#3D2008] text-[15px] mb-2 flex gap-2 items-start"><span className="text-amber-600">Q.</span> {t(`landing.faq${n}Q`)}</h3>
                            <div className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                                <span className="font-bold text-[#3D2008]">A. {t(`landing.faq${n}AHead`)}</span> {t(`landing.faq${n}A`)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ================================================================
                SECURITY & LOGIN — 원본: 베이지 카드, 좌측 골든 인장, 우측 텍스트+로그인
                ================================================================ */}
            <section id="login-section" className="px-5 pt-6 pb-24 max-w-[720px] mx-auto w-full">
                <div
                    className="w-full py-8 px-7 rounded-[22px] relative overflow-visible flex flex-col md:flex-row items-center gap-6"
                    style={{
                        background: 'linear-gradient(135deg, #f5f0e4 0%, #ede7d9 100%)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.05), inset 0 1px 3px rgba(255,255,255,0.5)',
                        border: '1px solid #e3ddd0',
                    }}
                >
                    {/* 골든 인장 뱃지 — 원본: 좌측, 큰 원형 */}
                    <div className="flex-shrink-0">
                        <div
                            className="w-[76px] h-[76px] rounded-full flex flex-col items-center justify-center"
                            style={{
                                background: 'radial-gradient(circle at 35% 35%, #f5e6a3, #d4a834 60%, #b8912a)',
                                boxShadow: '0 4px 14px rgba(180, 140, 40, 0.35), inset 0 1px 2px rgba(255,255,255,0.4)',
                                border: '2.5px solid #c9a22e',
                            }}
                        >
                            <ShieldCheck className="text-[#5c4310]" size={22} strokeWidth={2.5} />
                            <span className="text-[#5c4310] font-black text-[7.5px] uppercase tracking-[0.12em] mt-0.5 leading-none">Security</span>
                            <span className="text-[#5c4310] font-black text-[7.5px] uppercase tracking-[0.12em] leading-none">First</span>
                        </div>
                    </div>

                    {/* 우측 텍스트 + 로그인 */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-[22px] font-bold text-[#2a1c08] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                            {t('landing.getStarted')}
                        </h2>
                        <p className="text-[#7a6e5e] text-[13px] mt-1 mb-4 leading-relaxed">
                            Google Drive integrate with a secure Google{' '}
                            <strong className="text-[#4a3e2e]">"Sign in with Google"</strong> or{' '}
                            <span className="underline decoration-[#c5bfb3] cursor-pointer hover:text-amber-700 transition" onClick={handleDevLogin}>Developer Test Area</span>
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <LoginButton />
                            <MagicLinkAuth />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
