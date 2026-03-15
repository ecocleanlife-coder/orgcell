import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Globe, Lock, Users, FolderTree, Shield, Star, ArrowRight, Crown, Image } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const FamilyWebsitePage = () => {
    const navigate = useNavigate();
    const token = useAuthStore(s => s.token);
    const user = useAuthStore(s => s.user);
    const isAuthenticated = !!(token && user);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleCheckout = async () => {
        if (!isAuthenticated) {
            navigate('/auth/login?next=checkout');
            return;
        }
        if (checkoutLoading) return;
        setCheckoutLoading(true);
        try {
            const res = await axios.post('/api/payment/create-checkout-session', { email: user?.email });
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('결제 세션을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const scrollToLogin = () => {
        navigate('/');
        setTimeout(() => {
            document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div style={{ background: '#FAFAF7', color: '#1E2A0E' }}>
                <Helmet>
                <title>$10 Family Website — Orgcell</title>
                <meta name="description" content="연 $10에 나만의 가족 도메인(yourfamily.orgcell.com)을 만드세요. 4세대 가계도, 사진 갤러리, 가족 채팅 포함." />
                <meta property="og:title" content="$10 Family Website — Orgcell" />
                <meta property="og:description" content="연 $10으로 yourfamily.orgcell.com 도메인 개설. 가계도·앨범·라이브 공유 포함." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            {/* ══ Navbar ══ */}
            <Navbar onCtaClick={scrollToLogin} />

            {/* ══ Hero Section ══ */}
            <section
                style={{
                    background: 'linear-gradient(135deg, #F0F7F0 0%, #E8F5E8 100%)',
                    padding: '60px 20px',
                }}
                className="w-full"
            >
                <div className="max-w-[1040px] mx-auto">
                    {/* Breadcrumb */}
                    <div className="text-[13px] font-semibold mb-6" style={{ color: '#7A6E5E' }}>
                        Orgcell &gt; 가족 웹사이트
                    </div>

                    {/* Domain badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(90, 148, 96, 0.1)', border: '1px solid #5A9460' }}>
                        <Globe size={16} style={{ color: '#5A9460' }} />
                        <span style={{ color: '#5A9460', fontSize: '13px', fontWeight: '600' }}>
                            yourfamily.orgcell.com
                        </span>
                    </div>

                    {/* Headline */}
                    <h1
                        className="mb-4 leading-tight"
                        style={{
                            fontSize: 'clamp(28px, 6vw, 48px)',
                            fontWeight: '800',
                            fontFamily: 'Georgia, serif',
                            color: '#1E2A0E',
                        }}
                    >
                        가족만을 위한<br />나만의 디지털 공간
                    </h1>

                    {/* Subheading */}
                    <p
                        className="mb-8 max-w-2xl"
                        style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: '#5A6E4E',
                        }}
                    >
                        연 <strong style={{ color: '#1E2A0E' }}>$10</strong>으로 온 가족이 언제 어디서나 접속할 수 있는 프라이빗 가족 박물관을 만드세요
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <button
                            onClick={handleCheckout}
                            disabled={checkoutLoading}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 text-white disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                        >
                            {checkoutLoading ? '이동 중…' : '지금 시작하기 · 연 $10'}
                        </button>
                        <button
                            onClick={() => navigate('/family-website')}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all"
                            style={{ background: 'transparent', border: '2px solid #5A9460', color: '#5A9460' }}
                        >
                            예시 보기
                        </button>
                    </div>

                    {/* Referral hint */}
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/redeem')}
                            className="text-[13px] font-semibold transition-all cursor-pointer hover:underline"
                            style={{ color: '#4A7F4A' }}
                        >
                            ksarang.org에서 5명을 소개하면 무료로 이용할 수 있습니다 →
                        </button>
                    </div>

                    {/* Stat Pills */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        {['Google Drive 사진 무제한', '가족 전용 서브도메인', '연 $10 · 카드 등록 없음'].map((stat, i) => (
                            <div
                                key={i}
                                className="px-4 py-2 rounded-full text-[13px] font-semibold"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    color: '#3D2008',
                                    border: '1px solid rgba(90, 148, 96, 0.2)',
                                }}
                            >
                                ✓ {stat}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ Privacy First Section ══ */}
            <section className="py-20 px-5" style={{ background: '#FAFAF7' }}>
                <div className="max-w-[1040px] mx-auto">
                    <h2
                        className="text-center mb-4"
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            fontFamily: 'Georgia, serif',
                            color: '#1E2A0E',
                        }}
                    >
                        당신의 사진은 당신의 것입니다
                    </h2>
                    <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        프라이버시를 최우선으로 설계된 가족 박물관
                    </p>

                    {/* Privacy Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Lock,
                                title: 'BYOS 저장 방식',
                                desc: '사진은 100% 고객님의 Google Drive에 저장됩니다. Orgcell 서버에는 단 1픽셀도 없습니다',
                            },
                            {
                                icon: Users,
                                title: '개인 폴더 보호',
                                desc: '내 개인 폴더는 본인만 열 수 있습니다. 관리자도 동의 없이 접근 불가',
                            },
                            {
                                icon: Shield,
                                title: '가족 인증',
                                desc: '초대받은 가족만 입장 가능. QR코드 또는 링크로 안전하게 초대',
                            },
                        ].map((pillar, i) => {
                            const Icon = pillar.icon;
                            return (
                                <div key={i} className="text-center">
                                    <div className="flex justify-center mb-4">
                                        <Icon size={40} style={{ color: '#5A9460' }} />
                                    </div>
                                    <h3 className="font-bold text-[16px] mb-2" style={{ color: '#1E2A0E' }}>
                                        {pillar.title}
                                    </h3>
                                    <p style={{ color: '#7A6E5E', fontSize: '14px', lineHeight: '1.6' }}>
                                        {pillar.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quote */}
                    <div className="text-center mt-12">
                        <p
                            style={{
                                fontSize: '16px',
                                fontStyle: 'italic',
                                color: '#5A9460',
                                fontFamily: 'Georgia, serif',
                            }}
                        >
                            "우리는 사진을 소유하지 않고, 연결만 합니다."
                        </p>
                    </div>
                </div>
            </section>

            {/* ══ Features Section ══ */}
            <section className="py-20 px-5" style={{ background: '#F5FAF5' }}>
                <div className="max-w-[1040px] mx-auto">
                    <h2
                        className="text-center mb-4"
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            fontFamily: 'Georgia, serif',
                            color: '#1E2A0E',
                        }}
                    >
                        가족 박물관이 제공하는 것들
                    </h2>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                        {[
                            { icon: Globe, title: '전용 서브도메인', desc: 'yourfamily.orgcell.com 나만의 주소' },
                            { icon: FolderTree, title: '가족 트리', desc: '4세대 이상을 시각적으로 연결하는 가계도' },
                            { icon: Image, title: '그룹 앨범', desc: '가족 공통 사진 공간과 개인 갤러리를 분리 관리' },
                            { icon: Crown, title: 'Admin 관리', desc: '가족 관계 추가/삭제, 폴더 관리 권한' },
                            { icon: Star, title: '앱처럼 설치', desc: '클릭 한 번으로 모든 가족 기기에 앱 아이콘 설치' },
                            { icon: Users, title: '가족 채팅방', desc: '도메인 메인 화면에서 바로 소통' },
                        ].map((feature, i) => {
                            const Icon = feature.icon;
                            return (
                                <div key={i} className="p-6 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #E8E3D8' }}>
                                    <Icon size={32} style={{ color: '#5A9460', marginBottom: '12px' }} />
                                    <h3 className="font-bold text-[16px] mb-2" style={{ color: '#1E2A0E' }}>
                                        {feature.title}
                                    </h3>
                                    <p style={{ color: '#7A6E5E', fontSize: '14px' }}>{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ══ Pricing Section ══ */}
            <section className="py-20 px-5" style={{ background: '#FAFAF7' }}>
                <div className="max-w-[560px] mx-auto text-center">
                    <h2
                        className="mb-3"
                        style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#1E2A0E' }}
                    >
                        심플한 요금제
                    </h2>
                    <p className="mb-10" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        숨겨진 비용 없이, 딱 하나의 플랜만 있습니다
                    </p>

                    {/* Single pricing card */}
                    <div
                        className="rounded-2xl p-10 mb-6"
                        style={{
                            background: '#fff',
                            border: '2px solid #5A9460',
                            boxShadow: '0 8px 32px rgba(90,148,96,0.12)',
                        }}
                    >
                        {/* Price display */}
                        <div className="mb-2">
                            <span style={{ fontSize: '64px', fontWeight: '800', color: '#1E2A0E', fontFamily: 'Georgia, serif', lineHeight: 1 }}>$10</span>
                        </div>
                        <p className="mb-8" style={{ color: '#7A6E5E', fontSize: '14px' }}>/ 년 · yourfamily.orgcell.com</p>

                        {/* Features */}
                        <ul className="text-left space-y-3 mb-8 max-w-[300px] mx-auto">
                            {[
                                '가족 전용 서브도메인',
                                'Google Drive 사진 무제한 연결',
                                '4세대 가계도 + 그룹 앨범',
                                'Admin 관리 + 가족 초대',
                                '앱 아이콘 설치 링크',
                                '가족 채팅방',
                            ].map(f => (
                                <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: '#1E2A0E' }}>
                                    <span style={{ color: '#5A9460', fontWeight: '700', flexShrink: 0 }}>✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* Primary CTA */}
                        <button
                            onClick={handleCheckout}
                            disabled={checkoutLoading}
                            className="w-full py-4 rounded-full font-bold text-[15px] text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                        >
                            {checkoutLoading ? '이동 중…' : '지금 시작하기 · 연 $10'}
                        </button>
                    </div>

                    {/* Referral message */}
                    <button
                        onClick={() => navigate('/redeem')}
                        className="text-[13.5px] font-semibold transition-all cursor-pointer hover:underline"
                        style={{ color: '#4A7F4A' }}
                    >
                        ksarang.org에서 5명을 소개하면 무료로 이용할 수 있습니다 →
                    </button>
                </div>
            </section>

            {/* ══ Family Tree Preview Section ══ */}
            <section className="py-20 px-5" style={{ background: '#F5FAF5' }}>
                <div className="max-w-[1040px] mx-auto">
                    <h2
                        className="text-center mb-4"
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            fontFamily: 'Georgia, serif',
                            color: '#1E2A0E',
                        }}
                    >
                        가계도로 연결되는 우리 가족
                    </h2>
                    <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        증조부모부터 증손주까지, 4세대 이상의 가족 역사를 한눈에
                    </p>

                    {/* Family Tree Mockup */}
                    <div className="flex justify-center mb-12">
                        <div className="w-full max-w-[400px]">
                            {/* Grandparents */}
                            <div className="flex justify-around mb-8">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                    style={{ background: '#E0D5C8', border: '3px solid #C8B898' }}
                                >
                                    👴
                                </div>
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                    style={{ background: '#E0D5C8', border: '3px solid #C8B898' }}
                                >
                                    👵
                                </div>
                            </div>

                            {/* Connector Line */}
                            <div className="flex justify-center mb-4">
                                <div style={{ width: '2px', height: '24px', background: '#C8B898' }} />
                            </div>

                            {/* Parents */}
                            <div className="flex justify-around mb-8">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                    style={{ background: '#D8C8A8', border: '3px solid #B8A880' }}
                                >
                                    👨
                                </div>
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                    style={{ background: '#D8C8A8', border: '3px solid #B8A880' }}
                                >
                                    👩
                                </div>
                            </div>

                            {/* Connector Line */}
                            <div className="flex justify-center mb-4">
                                <div style={{ width: '2px', height: '24px', background: '#C8B898' }} />
                            </div>

                            {/* Children */}
                            <div className="flex justify-around gap-2">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                                    style={{ background: '#C8B898', border: '2px solid #A8986A' }}
                                >
                                    👧
                                </div>
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                                    style={{ background: '#C8B898', border: '2px solid #A8986A' }}
                                >
                                    👦
                                </div>
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                                    style={{ background: '#C8B898', border: '2px solid #A8986A' }}
                                >
                                    👶
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-center" style={{ color: '#7A6E5E', fontSize: '14px' }}>
                        각 구성원은 자신의 사진 폴더와 갤러리를 가집니다
                    </p>
                </div>
            </section>

            {/* ══ CTA Section ══ */}
            <section
                id="cta-section"
                className="py-20 px-5"
                style={{
                    background: 'linear-gradient(135deg, #1A2E1A 0%, #2A4A2A 100%)',
                }}
            >
                <div className="max-w-[1040px] mx-auto text-center">
                    <h2
                        className="mb-4"
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            fontFamily: 'Georgia, serif',
                            color: '#FAFAF7',
                        }}
                    >
                        가족의 역사를 지금 시작하세요
                    </h2>
                    <p className="mb-8 max-w-2xl mx-auto" style={{ color: '#C8B998', fontSize: '15px' }}>
                        가입 후 즉시 yourfamily.orgcell.com 도메인을 만들 수 있습니다
                    </p>

                    <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-[15px] transition-all hover:brightness-110 active:scale-95 text-white cursor-pointer disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                    >
                        {checkoutLoading ? '이동 중…' : '지금 시작하기 · 연 $10'}
                        {!checkoutLoading && <ArrowRight size={18} />}
                    </button>

                    <p className="mt-4" style={{ color: '#A89880', fontSize: '13px' }}>
                        Google 계정으로 시작 · 도메인 등록은 가입 후 진행
                    </p>

                    <div className="mt-4">
                        <button
                            onClick={() => navigate('/redeem')}
                            className="text-[13px] font-semibold transition-all cursor-pointer hover:underline"
                            style={{ color: '#8DC88D' }}
                        >
                            ksarang.org에서 5명을 소개하면 무료로 이용할 수 있습니다 →
                        </button>
                    </div>
                </div>
            </section>

            {/* ══ Footer ══ */}
            <Footer />
        </div>
    );
};

export default FamilyWebsitePage;
