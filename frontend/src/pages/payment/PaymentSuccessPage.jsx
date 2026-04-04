import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 2000;

export default function PaymentSuccessPage() {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('paymentSuccess', lang);

    const [checking, setChecking] = useState(false);
    const [retryFailed, setRetryFailed] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleGoSetup = useCallback(async () => {
        if (checking) return;
        setChecking(true);
        setRetryFailed(false);

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const res = await axios.get('/api/subscriptions/status');
                if (res.data?.hasSubscription) {
                    navigate('/family-setup', { replace: true });
                    return;
                }
            } catch {
                // 네트워크 오류는 무시하고 재시도
            }
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
            }
        }

        setChecking(false);
        setRetryFailed(true);
    }, [checking, navigate]);

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f0f7e8 0%, #e8f5e8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                fontFamily: '-apple-system, sans-serif',
            }}
        >
            <Helmet>
                <title>{t.title || '결제 완료'} — Orgcell</title>
                <meta name="description" content={t.desc || '결제가 완료되었습니다. 가족유산박물관을 시작해 보세요!'} />
            </Helmet>

            <div
                style={{
                    maxWidth: 480,
                    width: '100%',
                    background: 'white',
                    borderRadius: 24,
                    padding: '48px 36px',
                    textAlign: 'center',
                    boxShadow: '0 8px 40px rgba(74,127,74,0.12)',
                    border: '1px solid #d0e8c8',
                }}
            >
                {/* 성공 아이콘 */}
                <div
                    style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        fontSize: 32,
                        color: 'white',
                    }}
                >
                    ✓
                </div>

                <h1
                    style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: '#1E2A0E',
                        marginBottom: 12,
                    }}
                >
                    {t.title}
                </h1>

                <p
                    style={{
                        fontSize: 16,
                        color: '#4a6a3a',
                        lineHeight: 1.7,
                        marginBottom: 32,
                    }}
                >
                    {(t.desc || '').split('\n').map((line, i, arr) => (
                        <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
                    ))}
                </p>

                {/* 안내 박스 */}
                <div
                    style={{
                        background: '#f0f7e8',
                        border: '1px solid #c8d8a8',
                        borderRadius: 14,
                        padding: '16px 20px',
                        marginBottom: 32,
                        textAlign: 'left',
                    }}
                >
                    <p style={{ fontSize: 13, color: '#3a5a2a', margin: 0, lineHeight: 1.7 }}>
                        {t.infoEmail}<br />
                        {t.infoManage}
                    </p>
                </div>

                {/* 다음 접속 방법 */}
                <div
                    style={{
                        background: '#f0f7e8',
                        border: '1px solid #c8d8a8',
                        borderRadius: 14,
                        padding: '16px 20px',
                        marginBottom: 16,
                        textAlign: 'left',
                    }}
                >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#3a5a2a', margin: '0 0 8px' }}>
                        📌 {t.accessTitle}
                    </p>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#4a6a3a', fontSize: 13, lineHeight: 2 }}>
                        <li>{t.accessStep1}</li>
                        <li>{t.accessStep2}</li>
                        <li>{t.accessStep3}</li>
                    </ol>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6a8a5a' }}>{t.accessBookmark}</p>
                </div>

                {/* 가족 초대 방법 */}
                <div
                    style={{
                        background: '#f8f4ec',
                        border: '1px solid #d8cca8',
                        borderRadius: 14,
                        padding: '14px 20px',
                        marginBottom: 24,
                        textAlign: 'left',
                    }}
                >
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#5a4a2a', margin: '0 0 6px' }}>
                        👨‍👩‍👧 {t.inviteTitle}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6a5a3a', lineHeight: 1.7 }}>{t.inviteDesc}</p>
                </div>

                {/* CTA 버튼들 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={handleGoSetup}
                        disabled={checking}
                        style={{
                            padding: '15px 24px',
                            borderRadius: 14,
                            background: checking ? '#8DB86B' : 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: checking ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: checking ? 0.8 : 1,
                        }}
                    >
                        {checking && (
                            <span style={{
                                width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
                                borderTopColor: '#fff', borderRadius: '50%',
                                display: 'inline-block', animation: 'spin 0.8s linear infinite',
                            }} />
                        )}
                        {checking ? '구독 확인 중...' : t.ctaMuseum}
                    </button>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

                    {retryFailed && (
                        <div style={{
                            padding: '12px 16px', borderRadius: 12,
                            background: '#fff8e8', border: '1px solid #f0d888',
                            fontSize: 13, color: '#7a5a10', lineHeight: 1.6,
                        }}>
                            구독 확인이 지연되고 있습니다. 잠시 후 다시 시도해주세요.
                            <br />
                            <button
                                onClick={handleGoSetup}
                                style={{
                                    marginTop: 8, padding: '6px 14px', borderRadius: 8,
                                    background: '#f0d888', border: 'none',
                                    fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#5a4010',
                                }}
                            >
                                다시 시도
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '13px 24px',
                            borderRadius: 14,
                            background: 'transparent',
                            color: '#4A7F4A',
                            fontWeight: 600,
                            fontSize: 14,
                            border: '1.5px solid #8DB86B',
                            cursor: 'pointer',
                        }}
                    >
                        {t.ctaHome}
                    </button>
                </div>
            </div>
        </div>
    );
}
