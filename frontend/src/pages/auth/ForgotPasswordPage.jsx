import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import MagicLinkAuth from '../../components/auth/MagicLinkAuth';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <Helmet>
                <title>비밀번호 찾기 — Orgcell</title>
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
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E2A0E', marginBottom: 8 }}>
                        비밀번호가 필요 없어요
                    </h1>
                    <p style={{ fontSize: 14, color: '#6a7a5a', lineHeight: 1.7 }}>
                        Orgcell은 <strong>비밀번호 없는 로그인</strong>을 사용합니다.<br />
                        이메일 주소를 입력하면 로그인 링크를 바로 보내드려요.
                    </p>
                </div>

                <div style={{
                    background: '#f0f7e8',
                    border: '1px solid #c8e0a8',
                    borderRadius: 12,
                    padding: '16px 18px',
                    marginBottom: 28,
                    fontSize: 13,
                    color: '#4a7a4a',
                    lineHeight: 1.7,
                }}>
                    <strong>사용 방법:</strong><br />
                    1. 아래에 이메일을 입력하세요<br />
                    2. 받은 링크를 클릭하면 자동 로그인됩니다<br />
                    3. 링크는 15분간 유효합니다
                </div>

                <MagicLinkAuth />

                <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#bbb' }}>
                    <button
                        onClick={() => navigate('/auth/login')}
                        style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                    >
                        ← 로그인 페이지로
                    </button>
                </p>
            </div>
        </div>
    );
}
