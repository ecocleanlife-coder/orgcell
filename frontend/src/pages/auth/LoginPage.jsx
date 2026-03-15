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
    const token = useAuthStore(s => s.token);
    const user = useAuthStore(s => s.user);

    // Store next param so MagicLinkVerify can pick it up after email link click
    useEffect(() => {
        if (next && next !== '/') {
            sessionStorage.setItem('orgcell_post_login_next', next);
        }
    }, [next]);

    // If already authenticated, redirect
    useEffect(() => {
        if (token && user) {
            sessionStorage.removeItem('orgcell_post_login_next');
            if (next === 'checkout') {
                handleCheckoutRedirect();
            } else {
                navigate(next === '/' ? '/' : `/${next}`, { replace: true });
            }
        }
    }, [token, user]);

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
                border: '1px solid #eee',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#1E2A0E', letterSpacing: '-0.02em' }}>
                        Orgcell<span style={{ color: '#8DB86B' }}>.com</span>
                    </div>
                    <p style={{ marginTop: 8, fontSize: 14, color: '#6a7a5a' }}>
                        {next === 'checkout'
                            ? '결제를 진행하려면 먼저 로그인해 주세요.'
                            : '가족 디지털 박물관에 오신 것을 환영합니다.'}
                    </p>
                </div>

                {/* Google Login */}
                <LoginButton />

                {/* Magic Link */}
                <MagicLinkAuth />

                {/* Forgot link */}
                <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#aaa' }}>
                    비밀번호를 잊으셨나요?{' '}
                    <button
                        onClick={() => navigate('/auth/forgot-password')}
                        style={{ color: '#4A7F4A', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                    >
                        이메일로 로그인하기
                    </button>
                </p>

                {/* Back */}
                <p style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: '#bbb' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                    >
                        ← 돌아가기
                    </button>
                </p>
            </div>
        </div>
    );
}
