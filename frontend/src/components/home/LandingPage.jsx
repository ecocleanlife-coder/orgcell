import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import LoginButton from '../auth/LoginButton';
import MagicLinkAuth from '../auth/MagicLinkAuth';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';
import { getT } from '../../i18n/translations';
import { ShieldCheck } from 'lucide-react';

function LandingPage() {
    const devLogin = useAuthStore(state => state.devLogin);
    const isLoading = useAuthStore(state => state.isLoading);
    const lang = useUiStore(state => state.lang);
    const [name, setName] = useState('Test User');
    const [email, setEmail] = useState('test@orgcell.com');
    const navigate = useNavigate();
    const t = getT('landing', lang);

    const handleDevLogin = () => devLogin(name, email);

    const scrollToLogin = () => {
        const el = document.getElementById('login-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToAbout = () => {
        const el = document.getElementById('about-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#F5F2EC] font-sans text-slate-800 overflow-x-hidden">

            {/* ================================================================
                NAV BAR — 원본: 상단 12%, 좌(About Museum) 중앙(Orgcell) 우(Sort Sort Share English)
                ================================================================ */}
            <nav className="max-w-[1040px] mx-auto px-5 pt-4 pb-2 flex justify-between items-end">
                {/* 좌측: About, Museum */}
                <div className="flex items-end gap-7">
                    <button onClick={scrollToAbout} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 transition cursor-pointer">
                        <img src="https://i.pravatar.cc/150?u=family" className="w-[42px] h-[42px] rounded-full object-cover border border-slate-200 shadow-sm" alt="About" />
                        About
                    </button>
                    <button onClick={() => navigate('/family-website')} className="flex flex-col items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-green-600 transition cursor-pointer">
                        <div className="w-[42px] h-[42px] rounded-full bg-[#eee9dd] border border-[#e0dace] shadow-sm flex items-center justify-center text-[20px]">🌳</div>
                        Museum
                    </button>
                </div>

                {/* 중앙: Orgcell + 태그라인 */}
                <div className="flex flex-col items-center select-none -mb-1">
                    <span className="text-[46px] font-black text-[#5C3D1E] tracking-tight leading-none" style={{ fontFamily: 'Georgia, \"Times New Roman\", serif' }}>Orgcell</span>
                    <span className="text-[13px] text-[#8a7e6e] italic tracking-wide leading-none mt-1" style={{ fontFamily: 'Georgia, serif' }}>{t.subtitle}</span>
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
                                <span className="block whitespace-nowrap text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.15]">{t.heroLine1}</span>
                                <span className="block whitespace-nowrap text-[clamp(2.4rem,5vw,3.6rem)] leading-[1.15]">{t.heroLine2}</span>
                            </h1>

                            {/* 서브텍스트 — 원본: 제목 아래 ~15px */}
                            <p className="text-[#6b5d4d] text-[17px] mt-4 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                                {t.heroSub}
                            </p>

                            {/* CTA 버튼 2개 — 원본: 초록 둥근 + 흰색 테두리 둥근 */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={scrollToLogin}
                                    className="px-6 py-3 rounded-full font-bold text-[15px] shadow-md cursor-pointer transition-all hover:brightness-105 active:scale-95 whitespace-nowrap"
                                    style={{ background: '#8DB86B', color: '#fff' }}
                                >
                                    {t.ctaCreate}
                                </button>
                                <button
                                    onClick={() => navigate('/family-website')}
                                    className="px-6 py-3 rounded-full font-bold text-[15px] cursor-pointer transition-all hover:bg-white whitespace-nowrap"
                                    style={{ background: '#fff', border: '1.5px solid #c5bfb3', color: '#4a4031' }}
                                >
                                    {t.ctaExplore}
                                </button>
                            </div>
                        </div>

                        {/* ── 우측: 가계도 액자 ──
                            원본: 히어로 우측 62%, 액자가 히어로 아래로 ~40px 돌출
                            액자에 우하단 그림자 */}
                        <div className="relative flex justify-center lg:justify-end items-start pt-4 lg:pt-6 pr-4 lg:pr-6">
                            <img
                                src="/images/landing/hero-family-tree.png"
                                alt="Family Tree"
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
                                    alt=""
                                    className="w-[62%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#2d2435] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t.card1Title}</h3>
                            <p className="text-[#5a5066] text-[12.5px] leading-[1.6]">{t.card1Desc}</p>
                        </div>
                    </button>

                    {/* ─ 초록 카드: $10 Family Website ─
                        원본: 다른 카드보다 위에 위치 (살짝 올라감) */}
                    <button
                        onClick={() => navigate('/family-website')}
                        className="relative group focus:outline-none cursor-pointer md:-mt-6"
                    >
                        <div
                            className="rounded-[18px] pt-5 pb-7 px-5 text-center overflow-visible relative"
                            style={{
                                background: 'linear-gradient(160deg, #d6e8d8 0%, #c8ddc9 100%)',
                                boxShadow: '4px 8px 24px rgba(60, 110, 60, 0.18), 0 2px 6px rgba(0,0,0,0.06)',
                            }}
                        >
                            {/* 박물관 — 지붕이 더 높이 돌출 */}
                            <div className="relative -mt-[120px] mb-3 flex justify-center pointer-events-none">
                                <img
                                    src="/images/landing/card-museum.png"
                                    alt=""
                                    className="w-[55%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#1e3020] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t.card2Title}</h3>
                            <p className="text-[#485a49] text-[12.5px] leading-[1.6]">{t.card2Desc}</p>
                        </div>
                    </button>

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
                                    alt=""
                                    className="w-[72%] group-hover:scale-105 transition-transform duration-300"
                                    style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.13))' }}
                                />
                            </div>
                            <h3 className="text-[15px] font-extrabold text-[#1e2a38] mb-1" style={{ fontFamily: 'Georgia, serif' }}>{t.card3Title}</h3>
                            <p className="text-[#4a5868] text-[12.5px] leading-[1.6]">{t.card3Desc}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* ================================================================
                ABOUT SECTION
                ================================================================ */}
            <section id="about-section" className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
                <div className="text-center mb-10">
                    <h2 className="text-[28px] font-bold text-[#3D2008] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>About Orgcell</h2>
                    <p className="text-[#8a7e6e] mt-2 text-sm">A digital home for your family's memories</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">🌳</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">Family Tree</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">Build a visual family tree connecting grandparents, parents, and children across 4+ generations.</p>
                    </div>
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">📸</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">Photo Archive</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">AI-powered photo sorting organizes your family photos by date, person, and event automatically.</p>
                    </div>
                    <div className="bg-white/80 rounded-2xl p-6 shadow-sm border border-[#e8e2d6] text-center">
                        <div className="text-3xl mb-3">🔒</div>
                        <h3 className="font-bold text-[#3D2008] mb-2 text-[15px]">Your Data, Your Drive</h3>
                        <p className="text-[#6b5d4d] text-[13px] leading-relaxed">All photos stay in your Google Drive. We never store your files — you own everything.</p>
                    </div>
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
                            {t.getStarted}
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
