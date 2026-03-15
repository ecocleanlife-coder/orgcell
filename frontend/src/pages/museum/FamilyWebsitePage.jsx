import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { Globe, Lock, Users, FolderTree, Shield, Star, ArrowRight, Crown, Image } from 'lucide-react';

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
                        온 가족이 언제 어디서나 접속할 수 있는 프라이빗 가족 박물관을 만드세요
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
                        {['Google Drive 사진 무제한', '가족 전용 서브도메인', '무료로 시작 가능'].map((stat, i) => (
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

            {/* ══ Early Access CTA Section ══ */}
            <section className="py-20 px-5" style={{ background: '#FAFAF7' }}>
                <div className="max-w-[680px] mx-auto text-center">
                    <span
                        className="inline-block px-4 py-1.5 rounded-full text-[12px] font-bold tracking-widest uppercase mb-6"
                        style={{ background: '#E8F5E8', color: '#4A7F4A' }}
                    >
                        사전 등록
                    </span>
                    <h2
                        className="mb-4"
                        style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            fontFamily: 'Georgia, serif',
                            color: '#1E2A0E',
                        }}
                    >
                        우리 가족 웹사이트,<br />가장 먼저 만들어보세요
                    </h2>
                    <p className="mb-10 leading-relaxed" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        가족 웹사이트 기능이 오픈되면 사전 등록하신 분께 가장 먼저 알려드립니다.<br />
                        이메일 하나로 충분합니다. 스팸은 없습니다.
                    </p>

                    {/* Email form */}
                    <div className="flex flex-col sm:flex-row gap-3 max-w-[480px] mx-auto mb-6">
                        <input
                            type="email"
                            placeholder="이메일 주소를 입력하세요"
                            className="flex-1 px-5 py-3.5 rounded-full text-[14px] outline-none"
                            style={{ border: '2px solid #C8E0C8', background: 'white', color: '#1E2A0E' }}
                            onFocus={e => { e.target.style.borderColor = '#5A9460'; }}
                            onBlur={e => { e.target.style.borderColor = '#C8E0C8'; }}
                        />
                        <button
                            className="px-7 py-3.5 rounded-full font-bold text-[14px] text-white transition-all hover:brightness-110 active:scale-95 whitespace-nowrap cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                            onClick={e => {
                                const input = e.currentTarget.previousElementSibling;
                                if (input.value) {
                                    input.value = '';
                                    input.placeholder = '감사합니다! 오픈 시 가장 먼저 알려드릴게요 🎉';
                                }
                            }}
                        >
                            사전 등록하기
                        </button>
                    </div>

                    {/* Benefits list */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5 text-[13px]" style={{ color: '#7A6E5E' }}>
                        {[
                            { icon: '✓', text: '무료로 시작 가능' },
                            { icon: '✓', text: '신용카드 불필요' },
                            { icon: '✓', text: '가족 전용 서브도메인 제공' },
                        ].map(item => (
                            <span key={item.text} className="flex items-center gap-1.5">
                                <span style={{ color: '#5A9460', fontWeight: '700' }}>{item.icon}</span>
                                {item.text}
                            </span>
                        ))}
                    </div>
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
