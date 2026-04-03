import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import LoginButton from '../../components/auth/LoginButton';
import MagicLinkAuth from '../../components/auth/MagicLinkAuth';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const next = searchParams.get('next') || '/';
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    const user = useAuthStore(s => s.user);
    const [termsAgreed, setTermsAgreed] = React.useState(false);

    // Store next param so MagicLinkVerify can pick it up after email link click
    useEffect(() => {
        if (next && next !== '/') {
            sessionStorage.setItem('orgcell_post_login_next', next);
        }
    }, [next]);

    // If already authenticated, redirect
    useEffect(() => {
        if (isAuthenticated && user) {
            sessionStorage.removeItem('orgcell_post_login_next');
            if (next === 'checkout') {
                handleCheckoutRedirect();
            } else {
                navigate(next === '/' ? '/' : `/${next}`, { replace: true });
            }
        }
    }, [isAuthenticated, user]);

    const handleCheckoutRedirect = async () => {
        try {
            const res = await axios.post('/api/payment/create-checkout-session', {
                email: user?.email,
            });
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch {
            navigate('/family-website', { replace: true });
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Helmet>
                <title>로그인 — Orgcell</title>
            </Helmet>

            <div style={{
                width: '100%',
                maxWidth: 440,
                background: 'white',
                borderRadius: 24,
                padding: '48px 40px',
                boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
                border: '1px solid #E8E3D8',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#3D2008', letterSpacing: '-0.02em', fontFamily: 'Georgia, serif' }}>
                        Orgcell<span style={{ color: '#5A9460' }}>.com</span>
                    </div>
                    <p style={{ marginTop: 10, fontSize: 15, color: '#7A6E5E', lineHeight: 1.6 }}>
                        {next === 'checkout'
                            ? '결제를 진행하려면 먼저 로그인해 주세요.'
                            : '가족 디지털 박물관에 오신 것을 환영합니다.'}
                    </p>
                </div>

                {/* Terms consent checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    marginBottom: 20, cursor: 'pointer', fontSize: 13, color: '#5A5A4A', lineHeight: 1.5,
                }}>
                    <input
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        style={{ marginTop: 3, accentColor: '#5A9460', width: 16, height: 16 }}
                    />
                    <span>
                        <a href="/terms" style={{ color: '#3D2008', textDecoration: 'underline', fontWeight: 600 }}>이용약관</a>
                        {' '}및{' '}
                        <a href="/privacy" style={{ color: '#3D2008', textDecoration: 'underline', fontWeight: 600 }}>개인정보처리방침</a>
                        에 동의합니다.
                        <br />
                        <span style={{ fontSize: 11, color: '#8A8070' }}>
                            박물관 콘텐츠의 등록 및 공개 책임은 관장에게 있음을 이해합니다.
                        </span>
                    </span>
                </label>

                {/* Google Login */}
                <div style={{ opacity: termsAgreed ? 1 : 0.4, pointerEvents: termsAgreed ? 'auto' : 'none' }}>
                    <LoginButton />
                </div>

                {/* Magic Link */}
                <div style={{ opacity: termsAgreed ? 1 : 0.4, pointerEvents: termsAgreed ? 'auto' : 'none' }}>
                    <MagicLinkAuth />
                </div>

                {!termsAgreed && (
                    <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#C4956A' }}>
                        로그인하려면 위 약관에 동의해 주세요.
                    </p>
                )}

                {/* Back */}
                <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: '#A09882' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ color: '#7A6E5E', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
                    >
                        ← 돌아가기
                    </button>
                </p>
            </div>
        </div>
    );
}
