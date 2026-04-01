import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function InvitePage() {
    const [params] = useSearchParams();
    const code = (params.get('code') || '').toUpperCase();
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const lang = useUiStore((s) => s.lang);
    const t = getT('invite', lang);
    const pt = getT('pwa', lang);

    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expired, setExpired] = useState(false);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        if (!code) { setError('no_code'); setLoading(false); return; }
        axios.get(`/api/invite/info?code=${code}`)
            .then(r => { if (r.data?.success) setInfo(r.data.data); else setError('invalid'); })
            .catch(err => {
                if (err.response?.status === 410) {
                    setExpired(true);
                } else {
                    setError('invalid');
                }
            })
            .finally(() => setLoading(false));
    }, [code]);

    const doAccept = async () => {
        setAccepting(true);
        try {
            const acceptRes = await axios.post('/api/invite/accept', { code });
            const subdomain = acceptRes.data?.data?.subdomain || info?.subdomain;
            navigate(subdomain ? `/${subdomain}` : '/museum');
        } catch (err) {
            if (err.response?.status === 410) {
                setExpired(true);
            } else {
                setError('accept_failed');
            }
        } finally {
            setAccepting(false);
        }
    };

    const handleJoin = () => {
        if (!token) {
            sessionStorage.setItem('invite_code', code);
            navigate('/auth/login');
            return;
        }
        doAccept();
    };

    // Auto-accept after returning from login
    useEffect(() => {
        const saved = sessionStorage.getItem('invite_code');
        if (saved && saved === code && token && user && info && !accepting) {
            sessionStorage.removeItem('invite_code');
            doAccept();
        }
    }, [token, user, info]); // eslint-disable-line

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f7e8 0%, #e8f5e8 100%)',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    };

    if (loading) return (
        <div style={containerStyle}>
            <div style={{ width: 32, height: 32, border: '4px solid #c8d8a8', borderTopColor: '#5a8a4a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );

    if (expired) return (
        <div style={containerStyle}>
            <div style={{
                maxWidth: 440, width: '100%', background: '#fff', borderRadius: 24,
                padding: '48px 36px', textAlign: 'center',
                boxShadow: '0 8px 40px rgba(74,127,74,0.12)', border: '1px solid #e8d8c0',
            }}>
                <p style={{ fontSize: 52, marginBottom: 20 }}>⏰</p>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#3a3a2a', marginBottom: 8 }}>
                    이 초대는 만료되었습니다
                </h2>
                <p style={{ color: '#7a7a6a', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                    초대 링크의 유효기간(30일)이 지났습니다.<br />
                    박물관 주인에게 새로운 초대를 요청해주세요.
                </p>
                <div style={{
                    background: '#FFF8F0', border: '1px solid #F0DCC0', borderRadius: 14,
                    padding: '16px 20px', marginBottom: 28, textAlign: 'left',
                }}>
                    <p style={{ fontSize: 13, color: '#8A6E40', lineHeight: 1.6 }}>
                        <strong>방법 1:</strong> 초대해준 분에게 연락하여 새 초대를 요청<br />
                        <strong>방법 2:</strong> 직접 Orgcell에 가입 후 박물관 방문
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            flex: 1, padding: '13px 20px', borderRadius: 12,
                            background: '#f0ece4', color: '#5a5040', fontWeight: 700,
                            border: 'none', cursor: 'pointer', fontSize: 14,
                        }}
                    >
                        홈으로
                    </button>
                    <button
                        onClick={() => navigate('/onboarding/service')}
                        style={{
                            flex: 1, padding: '13px 20px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #5A9460, #4A7F4A)', color: '#fff',
                            fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14,
                        }}
                    >
                        회원가입
                    </button>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div style={containerStyle}>
            <div style={{ maxWidth: 400, textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>🔗</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#3a3a2a', marginBottom: 8 }}>{t.errorTitle}</h2>
                <p style={{ color: '#7a7a6a', marginBottom: 28, lineHeight: 1.6 }}>{t.errorDesc}</p>
                <button
                    onClick={() => navigate('/')}
                    style={{ padding: '12px 28px', borderRadius: 12, background: '#5a8a4a', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}
                >
                    {t.goHome}
                </button>
            </div>
        </div>
    );

    return (
        <div style={containerStyle}>
            <div style={{
                maxWidth: 440,
                width: '100%',
                background: '#fff',
                borderRadius: 24,
                padding: '48px 36px',
                textAlign: 'center',
                boxShadow: '0 8px 40px rgba(74,127,74,0.12)',
                border: '1px solid #d0e8c8',
            }}>
                <p style={{ fontSize: 52, marginBottom: 20 }}>🏛️</p>

                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e2a0e', marginBottom: 8, lineHeight: 1.4 }}>
                    {info?.inviter_name
                        ? t.titleWithName.replace('{name}', info.inviter_name)
                        : t.title}
                </h1>

                {info?.subdomain && (
                    <p style={{ color: '#5a8a4a', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                        orgcell.com/{info.subdomain}
                    </p>
                )}

                <p style={{ color: '#7a7a6a', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                    {t.desc}
                </p>

                {info?.expires_at && (
                    <p style={{ color: '#A89880', fontSize: 12, marginBottom: 28 }}>
                        유효기간: {new Date(info.expires_at).toLocaleDateString('ko-KR')}까지
                    </p>
                )}

                <button
                    onClick={handleJoin}
                    disabled={accepting}
                    style={{
                        width: '100%',
                        padding: '15px 24px',
                        borderRadius: 14,
                        background: accepting ? '#a8c8a0' : 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 15,
                        border: 'none',
                        cursor: accepting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {accepting ? t.accepting : (!token ? t.loginToJoin : t.joinBtn)}
                </button>

                {!token && (
                    <p style={{ color: '#9a9a8a', fontSize: 12, marginTop: 12 }}>{t.loginHint}</p>
                )}

                {/* PWA install hint */}
                <div style={{
                    marginTop: 24,
                    padding: '12px 16px',
                    background: '#f0f7e8',
                    borderRadius: 12,
                    border: '1px solid #d0e8c0',
                    textAlign: 'left',
                }}>
                    <p style={{ fontSize: 12, color: '#5a7a4a', lineHeight: 1.6, margin: 0 }}>
                        📱 {pt.installHint}
                    </p>
                </div>
            </div>
        </div>
    );
}
