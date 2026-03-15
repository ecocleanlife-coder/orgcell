import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Globe, Lock, Users, FolderTree, Shield, Star, CheckCircle2, ArrowRight, Crown, Image } from 'lucide-react';

const FamilyWebsitePage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const scrollToLogin = () => {
        navigate('/');
        setTimeout(() => {
            document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div style={{ background: '#FAFAF7', color: '#1E2A0E' }}>
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
                        연 $10로 온 가족이 언제 어디서나 접속할 수 있는 프라이빗 가족 박물관을 만드세요
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-10">
                        <button
                            onClick={scrollToLogin}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 text-white"
                            style={{
                                background: 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                            }}
                        >
                            지금 만들기
                        </button>
                        <button
                            onClick={() => navigate('/family-website')}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all hover:bg-opacity-80"
                            style={{
                                background: 'transparent',
                                border: '2px solid #5A9460',
                                color: '#5A9460',
                            }}
                        >
                            예시 보기
                        </button>
                    </div>

                    {/* Stat Pills */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        {['2,000장 사진 포함', '가족 전용 서브도메인', '평생 보존 라이선스'].map((stat, i) => (
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
                        합리적인 가격, 무제한 추억
                    </h2>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 max-w-3xl mx-auto">
                        {/* Basic Plan */}
                        <div
                            className="p-8 rounded-2xl relative"
                            style={{
                                background: '#FFFFFF',
                                border: '2px solid #5A9460',
                                boxShadow: '0 8px 24px rgba(90, 148, 96, 0.15)',
                            }}
                        >
                            <div
                                className="absolute -top-4 left-6 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                                style={{ background: '#5A9460' }}
                            >
                                가장 인기
                            </div>
                            <h3 className="font-bold text-[20px] mb-2" style={{ color: '#1E2A0E', marginTop: '12px' }}>
                                기본 플랜
                            </h3>
                            <div className="mb-6">
                                <span
                                    className="text-[36px] font-bold"
                                    style={{ color: '#5A9460', fontFamily: 'Georgia, serif' }}
                                >
                                    $10
                                </span>
                                <span style={{ color: '#7A6E5E', fontSize: '14px' }}> / 년</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {['2,000장 사진', 'yourfamily.orgcell.com', '가족 트리', '그룹 앨범', '앱 설치 링크'].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[14px]" style={{ color: '#1E2A0E' }}>
                                        <CheckCircle2 size={18} style={{ color: '#5A9460', flexShrink: 0 }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={scrollToLogin}
                                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:brightness-110"
                                style={{ background: '#5A9460' }}
                            >
                                선택하기
                            </button>
                        </div>

                        {/* Lifetime Plan */}
                        <div
                            className="p-8 rounded-2xl relative"
                            style={{
                                background: '#FAFAF7',
                                border: '2px solid #3D2008',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <div
                                className="absolute -top-4 left-6 px-3 py-1 rounded-full text-[12px] font-bold text-white"
                                style={{ background: '#3D2008' }}
                            >
                                최고 가성비
                            </div>
                            <h3 className="font-bold text-[20px] mb-2" style={{ color: '#1E2A0E', marginTop: '12px' }}>
                                10년 플랜
                            </h3>
                            <div className="mb-6">
                                <span
                                    className="text-[36px] font-bold"
                                    style={{ color: '#3D2008', fontFamily: 'Georgia, serif' }}
                                >
                                    $100
                                </span>
                                <span style={{ color: '#7A6E5E', fontSize: '14px' }}> / 10년 ($10/년)</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {['Basic 포함', '10,000장 사진', '우선 지원', '신규 기능 우선 적용'].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[14px]" style={{ color: '#1E2A0E' }}>
                                        <CheckCircle2 size={18} style={{ color: '#3D2008', flexShrink: 0 }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={scrollToLogin}
                                className="w-full py-3 rounded-xl font-bold text-white transition-all hover:brightness-110"
                                style={{ background: '#3D2008' }}
                            >
                                선택하기
                            </button>
                        </div>
                    </div>

                    <p className="text-center mt-8 text-[13px]" style={{ color: '#7A6E5E' }}>
                        가격은 연간 구독입니다. 언제든 취소 가능.
                    </p>
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
                        onClick={scrollToLogin}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-[15px] transition-all hover:brightness-110 active:scale-95 text-white"
                        style={{
                            background: 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                        }}
                    >
                        Google로 무료 시작
                        <ArrowRight size={18} />
                    </button>

                    <p className="mt-6" style={{ color: '#A89880', fontSize: '12px' }}>
                        도메인 등록은 회원가입 후 진행됩니다
                    </p>
                </div>
            </section>

            {/* ══ Footer ══ */}
            <Footer />
        </div>
    );
};

export default FamilyWebsitePage;
