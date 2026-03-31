import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import CalendarPreview from './CalendarPreview';
import HeroSlideshow from './HeroSlideshow';
import FamilyTreePreview from './FamilyTreePreview';

// 스크롤 등장 애니메이션 훅
function useScrollReveal() {
    const refs = useRef([]);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translate(0, 0)';
                    }
                });
            },
            { threshold: 0.12 }
        );
        refs.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);
    return refs;
}

function LandingPage() {
    const navigate = useNavigate();
    const sectionRefs = useScrollReveal();

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7', overflowX: 'hidden', maxWidth: '100vw' }}>
            <Helmet>
                <title>Orgcell — 자손들에게 물려줄 우리 가족만의 박물관</title>
                <meta name="description" content="소중한 사진과 이야기를 가족과 함께 영원히 보존하세요. 가족행사 달력, 전시관, 가족트리를 한곳에." />
                <meta property="og:title" content="Orgcell — 우리 가족만의 박물관" />
                <meta property="og:description" content="자손들에게 물려줄 가족 디지털 박물관. 사진, 이야기, 가족트리를 영원히 보존합니다." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            {/* ══════════════════════════════════════════════
                SECTION 0: 히어로 (첫 화면)
               ══════════════════════════════════════════════ */}
            <section
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: '100vh', padding: '48px 20px 32px', background: '#FFFFFF' }}
            >
                {/* 로고 */}
                <span style={{
                    fontSize: 20, fontWeight: 900, color: '#3D2008',
                    fontFamily: 'Georgia, serif', letterSpacing: '-0.02em',
                    marginBottom: 32,
                }}>
                    Orgcell<span style={{ color: '#5A9460' }}>.com</span>
                </span>

                {/* 메인 문구 */}
                <h1 style={{
                    fontSize: 'clamp(26px, 6vw, 44px)',
                    fontWeight: 800,
                    fontFamily: 'Georgia, serif',
                    color: '#1E2A0E',
                    lineHeight: 1.25,
                    marginBottom: 16,
                    maxWidth: 440,
                }}>
                    자손들에게 물려줄<br />우리 가족만의 박물관
                </h1>

                {/* 서브 문구 */}
                <p style={{
                    fontSize: 16, color: '#7A6E5E', lineHeight: 1.6,
                    marginBottom: 40, maxWidth: 360,
                }}>
                    소중한 사진과 이야기를<br />
                    가족과 함께 영원히 보존하세요
                </p>

                {/* CTA 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
                    <button
                        onClick={() => navigate('/onboarding/start')}
                        className="active:scale-[0.98]"
                        style={{
                            width: '100%', height: 56, borderRadius: 16,
                            background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                            color: '#fff', fontSize: 18, fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(76,175,80,0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        무료로 시작하기
                    </button>
                    <button
                        onClick={() => navigate('/auth/login')}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 15, color: '#7A6E5E', fontWeight: 500,
                            padding: '8px 0',
                        }}
                    >
                        이미 계정이 있으신가요? <span style={{ color: '#3D2008', fontWeight: 700 }}>로그인</span>
                    </button>
                </div>

                {/* 스크롤 힌트 */}
                <div style={{ marginTop: 48, opacity: 0.4 }}>
                    <div style={{
                        width: 24, height: 40, borderRadius: 12,
                        border: '2px solid #3D2008', margin: '0 auto',
                        position: 'relative',
                    }}>
                        <div style={{
                            width: 4, height: 8, borderRadius: 2,
                            background: '#3D2008',
                            position: 'absolute', top: 6, left: '50%',
                            transform: 'translateX(-50%)',
                            animation: 'scrollBounce 1.5s ease-in-out infinite',
                        }} />
                    </div>
                </div>
                <style>{`
                    @keyframes scrollBounce {
                        0%, 100% { top: 6px; opacity: 1; }
                        50% { top: 18px; opacity: 0.3; }
                    }
                `}</style>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 1: 가족행사 달력 미리보기
               ══════════════════════════════════════════════ */}
            <section
                ref={(el) => { sectionRefs.current[0] = el; }}
                style={{
                    padding: '80px 20px',
                    background: '#FFF9F0',
                    opacity: 0,
                    transform: 'translateX(-40px)',
                    transition: 'opacity 0.7s ease, transform 0.7s ease',
                }}
            >
                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <h2 style={{
                        fontSize: 'clamp(22px, 5vw, 32px)',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        color: '#3D2008',
                        textAlign: 'center',
                        marginBottom: 12,
                    }}>
                        우리 가족의 소중한 날들
                    </h2>
                    <p style={{
                        fontSize: 15, color: '#7A6E5E', textAlign: 'center',
                        marginBottom: 32, lineHeight: 1.6,
                    }}>
                        생일, 기일, 가족행사를 한눈에.<br />
                        다가오는 날을 미리 알려드립니다.
                    </p>
                    <CalendarPreview />
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 2: 전시관 슬라이드쇼 미리보기
               ══════════════════════════════════════════════ */}
            <section
                ref={(el) => { sectionRefs.current[1] = el; }}
                style={{
                    padding: '80px 20px',
                    background: '#F5F3EE',
                    opacity: 0,
                    transform: 'translateX(40px)',
                    transition: 'opacity 0.7s ease, transform 0.7s ease',
                }}
            >
                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <h2 style={{
                        fontSize: 'clamp(22px, 5vw, 32px)',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        color: '#3D2008',
                        textAlign: 'center',
                        marginBottom: 12,
                    }}>
                        우리 가족만의 전시관
                    </h2>
                    <p style={{
                        fontSize: 15, color: '#7A6E5E', textAlign: 'center',
                        marginBottom: 32, lineHeight: 1.6,
                    }}>
                        소중한 추억을 전시관처럼 꾸미고<br />
                        공개 범위를 자유롭게 설정하세요.
                    </p>
                    <HeroSlideshow />

                    {/* 사진 요청 문구 */}
                    <div style={{
                        marginTop: 28, textAlign: 'center',
                        background: '#FFFDF7', borderRadius: 16,
                        padding: '20px 16px',
                        border: '1px solid #E8E3D8',
                    }}>
                        <p style={{
                            fontSize: 14, color: '#5A5A4A', lineHeight: 1.7,
                            marginBottom: 14,
                        }}>
                            가족과 친구들에게 사진을 요청하면<br />
                            박물관을 둘러보고 추억 사진을 올려줄 수 있어요.<br />
                            그리고 자연스럽게 자신의 박물관도 만들게 됩니다 😊
                        </p>
                        <button
                            onClick={() => navigate('/onboarding/start')}
                            style={{
                                background: 'transparent',
                                border: '1.5px solid #3D2008',
                                borderRadius: 12, padding: '8px 20px',
                                fontSize: 13, fontWeight: 600,
                                color: '#3D2008', cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            가족에게 사진 요청하기
                        </button>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 3: 가족트리 폴더
               ══════════════════════════════════════════════ */}
            <section
                ref={(el) => { sectionRefs.current[2] = el; }}
                style={{
                    padding: '80px 20px',
                    background: '#FAFAF7',
                    opacity: 0,
                    transform: 'translateY(40px)',
                    transition: 'opacity 0.7s ease, transform 0.7s ease',
                }}
            >
                <div style={{ maxWidth: 500, margin: '0 auto', overflowX: 'hidden' }}>
                    <h2 style={{
                        fontSize: 'clamp(22px, 5vw, 32px)',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        color: '#3D2008',
                        textAlign: 'center',
                        marginBottom: 12,
                    }}>
                        우리 가족의 뿌리
                    </h2>
                    <p style={{
                        fontSize: 15, color: '#7A6E5E', textAlign: 'center',
                        marginBottom: 32, lineHeight: 1.6,
                    }}>
                        세대를 잇는 가족트리.<br />
                        각 폴더에는 그 분의 사진과 이야기가 담겨있습니다.
                    </p>
                    <FamilyTreePreview />
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 4: 서비스 특징 3가지
               ══════════════════════════════════════════════ */}
            <section
                ref={(el) => { sectionRefs.current[3] = el; }}
                style={{
                    padding: '80px 20px',
                    background: '#F9F7F4',
                    opacity: 0,
                    transform: 'translateY(30px)',
                    transition: 'opacity 0.7s ease, transform 0.7s ease',
                }}
            >
                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <h2 style={{
                        fontSize: 'clamp(22px, 5vw, 32px)',
                        fontWeight: 700,
                        fontFamily: 'Georgia, serif',
                        color: '#3D2008',
                        textAlign: 'center',
                        marginBottom: 40,
                    }}>
                        왜 Orgcell인가요?
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            {
                                icon: '🔒',
                                title: '내 저장공간 선택',
                                desc: 'Google Drive, OneDrive 또는 Orgcell 서버. 원본 사진은 내가 선택한 곳에만 저장됩니다.',
                            },
                            {
                                icon: '🌏',
                                title: '가족과 함께',
                                desc: '초대 링크 하나로 가족 누구나 참여. 멀리 있는 가족도 하나의 박물관에서 만납니다.',
                            },
                            {
                                icon: '📜',
                                title: '영원히 보존',
                                desc: '한국 특허 출원 기술로 안전하게. 세대를 넘어 자손들에게 전해지는 디지털 유산.',
                            },
                        ].map((card) => (
                            <div key={card.title} style={{
                                background: '#FFFFFF',
                                borderRadius: 16,
                                padding: '24px 20px',
                                border: '1px solid #E8E3D8',
                                display: 'flex', gap: 16, alignItems: 'flex-start',
                            }}>
                                <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{card.icon}</span>
                                <div>
                                    <h3 style={{
                                        fontSize: 16, fontWeight: 700, color: '#3D2008',
                                        marginBottom: 6, fontFamily: 'Georgia, serif',
                                    }}>
                                        {card.title}
                                    </h3>
                                    <p style={{ fontSize: 14, color: '#7A6E5E', lineHeight: 1.6 }}>
                                        {card.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 5: 푸터
               ══════════════════════════════════════════════ */}
            <footer style={{ padding: '40px 20px 24px', background: '#FAFAF7', textAlign: 'center' }}>
                <span
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium"
                    style={{ background: '#F0F0EC', color: '#7A6E5E', border: '1px solid #E0DCD4', marginBottom: 20, display: 'inline-flex' }}
                >
                    🔬 한국 특허 출원 기술 적용 (Patented Technology Applied)
                </span>

                <div style={{ marginTop: 16, fontSize: 13, color: '#999' }}>
                    <a href="/privacy" style={{ color: '#999', textDecoration: 'none' }}>개인정보처리방침</a>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <a href="/terms" style={{ color: '#999', textDecoration: 'none' }}>이용약관</a>
                    <span style={{ margin: '0 8px' }}>|</span>
                    <a href="mailto:ecocleanlife@gmail.com" style={{ color: '#999', textDecoration: 'none' }}>문의: ecocleanlife@gmail.com</a>
                </div>

                <p style={{ marginTop: 12, fontSize: 11, color: '#bbb' }}>
                    © 2026 Orgcell. All rights reserved.
                </p>
            </footer>
        </div>
    );
}

export default LandingPage;
