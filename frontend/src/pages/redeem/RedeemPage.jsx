import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

const BENEFITS = [
    { icon: '🏛️', title: '가족 도메인', desc: 'yourfamily.orgcell.com 전용 주소' },
    { icon: '🌳', title: '4세대 가계도', desc: '조부모부터 자녀까지 시각적 연결' },
    { icon: '📸', title: '사진 2,000장', desc: '구글 드라이브에 원본 그대로 보관' },
    { icon: '💬', title: '가족 채팅', desc: '가족만을 위한 프라이빗 채널' },
    { icon: '📡', title: '라이브 공유 포함', desc: '모임·여행 사진 실시간 공유' },
    { icon: '🔒', title: '원본 유출 없음', desc: 'Orgcell 서버에 사진 저장 안 함' },
];

export default function RedeemPage() {
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
            setMessage('이용권 코드를 입력해 주세요.');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setStatus('error');
            setMessage('이메일 주소를 정확히 입력해 주세요.');
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
                                ksarang.org에서 오셨군요! 환영합니다 👋
                            </p>
                            <p style={{ fontSize: 14, color: '#4a7a4a', lineHeight: 1.6 }}>
                                추천인 5명을 소개하면 <strong>1년 무료</strong> 혜택이 적용됩니다.
                                아래에 받은 이용권 코드를 입력하거나, 지금 바로 $10 플랜으로 시작해 보세요.
                            </p>
                        </div>
                    </div>
                )}

                {/* 타이틀 */}
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                    이용권 등록
                </h1>
                <p style={{ fontSize: 15, color: '#5a6a3e', marginBottom: 40 }}>
                    추천 코드 또는 이용권 코드를 입력해 Family Website를 시작하세요.
                </p>

                {/* 코드 입력 폼 */}
                <form onSubmit={handleRedeem} style={{ marginBottom: 40 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#3a4a2a', marginBottom: 8 }}>
                        이용권 코드
                    </label>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => { setCode(e.target.value.toUpperCase()); setStatus(null); }}
                            placeholder="예: KSA-ABCD12"
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
                        이메일 주소
                    </label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
                            placeholder="구독을 적용할 이메일"
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
                            {status === 'loading' ? '확인 중…' : '코드 적용'}
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
                            Family Website 만들기 →
                        </button>
                    )}
                </form>

                {/* 구분선 */}
                <div style={{ borderTop: '1px solid #d8e4c8', marginBottom: 40 }} />

                {/* 혜택 요약 */}
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                    포함된 혜택
                </h2>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 16,
                    }}
                >
                    {BENEFITS.map((b) => (
                        <div
                            key={b.title}
                            style={{
                                background: 'white',
                                border: '1px solid #e0eccc',
                                borderRadius: 14,
                                padding: '18px 16px',
                            }}
                        >
                            <span style={{ fontSize: 26 }}>{b.icon}</span>
                            <p style={{ fontWeight: 700, fontSize: 14, marginTop: 8, marginBottom: 4 }}>{b.title}</p>
                            <p style={{ fontSize: 13, color: '#6a7a5a' }}>{b.desc}</p>
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
                        이용권이 없어도 바로 시작할 수 있어요
                    </p>
                    <p style={{ fontSize: 14, color: '#5a6a4a', marginBottom: 24 }}>
                        연 $10 · yourfamily.orgcell.com · 언제든 해지 가능
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
                        $10으로 시작하기 →
                    </button>
                </div>
            </main>

            <Footer />
        </div>
    );
}
