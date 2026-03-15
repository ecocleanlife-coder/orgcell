import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function PaymentSuccessPage() {
    const navigate = useNavigate();

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
                <title>결제 완료 — Orgcell</title>
                <meta name="description" content="결제가 완료되었습니다. 가족 박물관을 시작해 보세요!" />
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
                    결제가 완료되었습니다! 🎉
                </h1>

                <p
                    style={{
                        fontSize: 16,
                        color: '#4a6a3a',
                        lineHeight: 1.7,
                        marginBottom: 32,
                    }}
                >
                    가족 박물관을 시작해 보세요.<br />
                    <strong>yourfamily.orgcell.com</strong> 도메인을 지금 바로 만들 수 있습니다.
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
                        📧 결제 확인 이메일이 곧 발송됩니다.<br />
                        📌 구독 관리는 이메일의 Stripe 링크에서 가능합니다.
                    </p>
                </div>

                {/* CTA 버튼들 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={() => navigate('/family-website')}
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
                        가족 박물관 만들기 →
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
                        홈으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}
