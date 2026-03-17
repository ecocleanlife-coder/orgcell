import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('paymentSuccess', lang);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                <meta name="description" content={t.desc || '결제가 완료되었습니다. 가족 박물관을 시작해 보세요!'} />
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

                {/* CTA 버튼들 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={() => navigate('/family-setup')}
                        style={{
                            padding: '15px 24px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: 15,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {t.ctaMuseum}
                    </button>

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
