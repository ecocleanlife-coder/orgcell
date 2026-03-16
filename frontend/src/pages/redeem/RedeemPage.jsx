import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

export default function RedeemPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const ref = searchParams.get('ref') || '';
    const isKsarang = ref.toLowerCase().includes('ksarang');

    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleRedeem = async (e) => {
        e.preventDefault();
        if (!code.trim()) {
            setStatus('error');
            setMessage(t('redeem.errorCode'));
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setStatus('error');
            setMessage(t('redeem.errorEmail'));
            return;
        }
        setStatus('loading');
        try {
            const res = await axios.post('/api/referral/apply', { code: code.trim(), email: email.trim() });
            setStatus('success');
            setMessage(res.data.message || '🎉 이용권이 확인되었습니다!');
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    return (
        <div style={{ background: '#FAFAF7', minHeight: '100vh', color: '#1E2A0E' }}>
            <Helmet>
                <title>이용권 등록 — Orgcell</title>
                <meta name="description" content="ksarang.org 추천 코드 또는 이용권을 입력해 Family Website를 무료로 시작하세요." />
                <meta property="og:title" content="이용권 등록 — Orgcell" />
                <meta property="og:description" content="추천 코드를 입력하고 $10 Family Website를 바로 시작하세요." />
                <meta property="og:image" content="/pwa-512x512.png" />
            </Helmet>

            <Navbar onCtaClick={() => navigate('/')} />

            <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px 80px' }}>

                {/* ksarang 추천 환영 배너 */}
                {isKsarang && (
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%)',
                            border: '1.5px solid #8DB86B',
                            borderRadius: 18,
                            padding: '20px 24px',
                            marginBottom: 32,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 14,
                        }}
                    >
                        <span style={{ fontSize: 32 }}>🌿</span>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 16, color: '#2a5a2a', marginBottom: 4 }}>
                                {t('redeem.ksarangTitle')}
                            </p>
                            <p style={{ fontSize: 14, color: '#4a7a4a', lineHeight: 1.6 }}>
                                {t('redeem.ksarangDesc')}
                            </p>
                        </div>
                    </div>
                )}

                {/* 타이틀 */}
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                    {t('redeem.pageTitle')}
                </h1>
                <p style={{ fontSize: 15, color: '#5a6a3e', marginBottom: 40 }}>
                    {t('redeem.pageSubtitle')}
                </p>

                {/* 코드 입력 폼 */}
                <form onSubmit={handleRedeem} style={{ marginBottom: 40 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4a2a', marginBottom: 8 }}>
                        {t('redeem.codeLabel')}
                    </label>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus(null); }}
                            placeholder={t('redeem.codePlaceholder')}
                            style={{
                                flex: 1,
                                padding: '14px 18px',
                                borderRadius: 12,
                                border: '1.5px solid #c8d8b0',
                                fontSize: 15,
                                background: 'white',
                                outline: 'none',
                                letterSpacing: '0.08em',
                            }}
                        />
                    </div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4a2a', marginBottom: 8 }}>
                        {t('redeem.emailLabel')}
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
                            placeholder={t('redeem.emailPlaceholder')}
                            style={{
                                flex: 1,
                                padding: '14px 18px',
                                borderRadius: 12,
                                border: '1.5px solid #c8d8b0',
                                fontSize: 15,
                                background: 'white',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            style={{
                                padding: '14px 28px',
                                borderRadius: 12,
                                background: status === 'loading' ? '#8aaa8a' : '#4A7F4A',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: 15,
                                border: 'none',
                                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {status === 'loading' ? t('redeem.loading') : t('redeem.submitBtn')}
                        </button>
                    </div>

                    {status && (
                        <p
                            style={{
                                marginTop: 10,
                                fontSize: 14,
                                color: status === 'success' ? '#2a6a2a' : '#c0392b',
                                fontWeight: 500,
                            }}
                        >
                            {message}
                        </p>
                    )}

                    {status === 'success' && (
                        <button
                            type="button"
                            onClick={() => navigate('/family-website')}
                            style={{
                                marginTop: 16,
                                padding: '12px 24px',
                                borderRadius: 12,
                                background: '#8DB86B',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: 14,
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {t('redeem.successBtn')}
                        </button>
                    )}
                </form>

                {/* 구분선 */}
                <div style={{ borderTop: '1px solid #d8e4c8', marginBottom: 40 }} />

                {/* 혜택 요약 */}
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                    {t('redeem.benefitsTitle')}
                </h2>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 16,
                    }}
                >
                    {[
                        { icon: '🏛️', titleKey: 'benefit1Title', descKey: 'benefit1Desc' },
                        { icon: '🌳', titleKey: 'benefit2Title', descKey: 'benefit2Desc' },
                        { icon: '📸', titleKey: 'benefit3Title', descKey: 'benefit3Desc' },
                        { icon: '💬', titleKey: 'benefit4Title', descKey: 'benefit4Desc' },
                        { icon: '📡', titleKey: 'benefit5Title', descKey: 'benefit5Desc' },
                        { icon: '🔒', titleKey: 'benefit6Title', descKey: 'benefit6Desc' },
                    ].map((b) => (
                        <div
                            key={b.titleKey}
                            style={{
                                background: 'white',
                                border: '1px solid #e0eccc',
                                borderRadius: 14,
                                padding: '18px 16px',
                            }}
                        >
                            <span style={{ fontSize: 26 }}>{b.icon}</span>
                            <p style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 4 }}>{t(`redeem.${b.titleKey}`)}</p>
                            <p style={{ fontSize: 13, color: '#6a7a5a' }}>{t(`redeem.${b.descKey}`)}</p>
                        </div>
                    ))}
                </div>

                {/* 바로 시작 CTA */}
                <div
                    style={{
                        marginTop: 48,
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, #f0f7e8 0%, #e8f0d8 100%)',
                        border: '1px solid #c8d8a8',
                        borderRadius: 20,
                        padding: '36px 24px',
                    }}
                >
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                        {t('redeem.noVoucherTitle')}
                    </p>
                    <p style={{ fontSize: 14, color: '#5a6a4a', marginBottom: 24 }}>
                        {t('redeem.noVoucherPrice')}
                    </p>
                    <button
                        onClick={() => navigate('/family-website')}
                        style={{
                            padding: '14px 36px',
                            borderRadius: 14,
                            background: '#4A7F4A',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {t('redeem.noVoucherBtn')}
                    </button>
                </div>
            </main>

            <Footer />
        </div>
    );
}
