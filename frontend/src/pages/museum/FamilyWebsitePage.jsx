import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import useAuthStore from '../../store/authStore';
import { Globe, Lock, Users, FolderTree, Shield, Star, ArrowRight, Crown, Image } from 'lucide-react';

const FamilyWebsitePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token);
    const [startLoading, setStartLoading] = useState(false);
    const [mySite, setMySite] = useState(null);

    // 로그인 상태면 내 사이트 조회
    useEffect(() => {
        if (!token) return;
        axios.get('/api/sites/mine', { headers: { Authorization: `Bearer ${token}` } })
            .then(({ data }) => { if (data.data?.subdomain) setMySite(data.data); })
            .catch(() => {});
    }, [token]);

    const handleStartFree = async () => {
        if (!token) {
            navigate('/onboarding/service');
            return;
        }
        setStartLoading(true);
        try {
            const { data } = await axios.get('/api/sites/mine', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.data?.subdomain) {
                navigate(`/${data.data.subdomain}`);
            } else {
                navigate('/onboarding/service');
            }
        } catch {
            navigate('/onboarding/service');
        } finally {
            setStartLoading(false);
        }
    };

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
                <Helmet>
                <title>Family Museum — Orgcell</title>
                <meta name="description" content="나만의 가족 도메인(yourfamily.orgcell.com)을 무료로 시작하세요. Google Drive 연결 시 무제한 무료. 4세대 가계도, 사진 갤러리, 가족 채팅 포함." />
                <meta property="og:title" content="Family Museum — Orgcell" />
                <meta property="og:description" content="yourfamily.orgcell.com 도메인 개설. Google Drive/OneDrive 연결 무제한 무료. 가계도·앨범·라이브 공유 포함." />
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
                    <div className="text-[13px] mb-6 flex items-center gap-2" style={{ color: '#7A6E5E' }}>
                        <button onClick={() => navigate('/')} className="hover:underline cursor-pointer font-semibold" style={{ color: '#5A9460' }}>← Orgcell.com</button>
                        <span>›</span>
                        <span>{t('familyWebsite.breadcrumb')}</span>
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
                        {t('familyWebsite.headline').split('\n').map((line, i, arr) => (
                            <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                        ))}
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
                        {t('familyWebsite.subheadline')}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <button
                            onClick={handleStartFree}
                            disabled={startLoading}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all hover:brightness-110 active:scale-95 text-white disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                        >
                            {startLoading ? '...' : (t('familyWebsite.ctaStart') || '무료로 시작하기')}
                        </button>
                        <button
                            onClick={handleStartFree}
                            disabled={startLoading}
                            className="px-8 py-3 rounded-full font-bold text-[14px] transition-all hover:brightness-[0.97] active:scale-95 disabled:opacity-60"
                            style={{ background: '#FFFFFF', border: '2px solid #5A9460', color: '#5A9460' }}
                        >
                            {startLoading ? '...' : (t('familyWebsite.goToMuseum') || '내 박물관 들어가기')}
                        </button>
                    </div>

                    {/* Hero Image */}
                    <img
                        src="/images/landing/card-museum.png"
                        alt="Family Website"
                        style={{ maxWidth: '320px', width: '100%', margin: '0 auto 32px', display: 'block', cursor: 'pointer' }}
                        onClick={handleStartFree}
                    />

                    {/* Stat Pills */}
                    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                        {[t('familyWebsite.stat1'), t('familyWebsite.stat2'), t('familyWebsite.stat3')].map((stat, i) => (
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
                        {t('familyWebsite.privacyTitle')}
                    </h2>
                    <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        {t('familyWebsite.privacySubtitle')}
                    </p>

                    {/* Privacy Pillars */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: Lock,
                                title: t('familyWebsite.byosTitle'),
                                desc: t('familyWebsite.byosDesc'),
                            },
                            {
                                icon: Users,
                                title: t('familyWebsite.privateFoldersTitle'),
                                desc: t('familyWebsite.privateFoldersDesc'),
                            },
                            {
                                icon: Shield,
                                title: t('familyWebsite.familyAuthTitle'),
                                desc: t('familyWebsite.familyAuthDesc'),
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
                            {t('familyWebsite.quote')}
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
                        {t('familyWebsite.featuresTitle')}
                    </h2>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                        {[
                            { icon: Globe, title: t('familyWebsite.feature1Title'), desc: t('familyWebsite.feature1Desc') },
                            { icon: FolderTree, title: t('familyWebsite.feature2Title'), desc: t('familyWebsite.feature2Desc') },
                            { icon: Image, title: t('familyWebsite.feature3Title'), desc: t('familyWebsite.feature3Desc') },
                            { icon: Crown, title: t('familyWebsite.feature4Title'), desc: t('familyWebsite.feature4Desc') },
                            { icon: Star, title: t('familyWebsite.feature5Title'), desc: t('familyWebsite.feature5Desc') },
                            { icon: Users, title: t('familyWebsite.feature6Title'), desc: t('familyWebsite.feature6Desc') },
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
                        {t('familyWebsite.pricingTitle')}
                    </h2>
                    <p className="mb-10" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        {t('familyWebsite.pricingSubtitle')}
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
                            <span style={{ fontSize: '64px', fontWeight: '800', color: '#5A9460', fontFamily: 'Georgia, serif', lineHeight: 1 }}>Free</span>
                        </div>
                        <p className="mb-8" style={{ color: '#7A6E5E', fontSize: '14px' }}>{t('familyWebsite.priceYearLabel')}</p>

                        {/* Features */}
                        <ul className="text-left space-y-3 mb-8 max-w-[300px] mx-auto">
                            {[
                                t('familyWebsite.priceFeature1'),
                                t('familyWebsite.priceFeature2'),
                                t('familyWebsite.priceFeature3'),
                                t('familyWebsite.priceFeature4'),
                                t('familyWebsite.priceFeature5'),
                                t('familyWebsite.priceFeature6'),
                            ].map(f => (
                                <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: '#1E2A0E' }}>
                                    <span style={{ color: '#5A9460', fontWeight: '700', flexShrink: 0 }}>✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* Primary CTA */}
                        <button
                            onClick={handleStartFree}
                            className="w-full py-4 rounded-full font-bold text-[15px] text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                        >
                            {t('familyWebsite.ctaStart')}
                        </button>
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
                        {t('familyWebsite.treeTitle')}
                    </h2>
                    <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: '#7A6E5E', fontSize: '15px' }}>
                        {t('familyWebsite.treeSubtitle')}
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
                        {t('familyWebsite.memberDesc')}
                    </p>
                </div>
            </section>

            {/* ══ FAQ Section ══ */}
            <section className="py-12 px-5" style={{ background: '#FAFAF7' }}>
                <div className="max-w-[800px] mx-auto">
                    <h2 className="text-center mb-8" style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'Georgia, serif', color: '#1E2A0E' }}>
                        {t('landing.faqTitle')}
                    </h2>
                    <div className="space-y-4">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-[#e8e2d6]">
                                <h3 className="font-bold text-[#1E2A0E] text-[15px] mb-2 flex gap-2 items-start">
                                    <span style={{ color: '#5A9460' }}>Q.</span> {t(`familyWebsite.faq${n}Q`)}
                                </h3>
                                <p className="text-[#6b5d4d] text-[13.5px] leading-relaxed pl-6">
                                    <span className="font-bold text-[#1E2A0E]">A. </span>{t(`familyWebsite.faq${n}A`)}
                                </p>
                            </div>
                        ))}
                    </div>
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
                        {t('familyWebsite.finalCtaTitle')}
                    </h2>
                    <p className="mb-8 max-w-2xl mx-auto" style={{ color: '#C8B998', fontSize: '15px' }}>
                        {t('familyWebsite.finalCtaSubtitle')}
                    </p>

                    <button
                        onClick={handleStartFree}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-[15px] transition-all hover:brightness-110 active:scale-95 text-white cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #5A9460, #4A7F4A)' }}
                    >
                        {t('familyWebsite.googleStart')}
                        <ArrowRight size={18} />
                    </button>

                </div>
            </section>

            {/* ══ Family Tree Sample Image ══ */}
            <section className="py-12 px-5" style={{ background: '#FAFAF7' }}>
                <div className="max-w-[1040px] mx-auto">
                    <img
                        src="/images/landing/familytree-sample.png"
                        alt="Digital Family Museum - Family Tree"
                        style={{
                            maxWidth: '100%',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            margin: '2rem auto',
                            display: 'block',
                        }}
                    />
                </div>
            </section>

            {/* ══ Footer ══ */}
            <Footer />
        </div>
    );
};

export default FamilyWebsitePage;
