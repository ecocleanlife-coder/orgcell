/**
 * MagicVerifyPage.jsx — 매직링크 토큰 검증
 *
 * URL: /auth/verify?token=xxxx
 * POST /api/auth/magic-link/verify → { success, hasMuseum, subdomain, user }
 *   - 박물관 있음 → /{subdomain} 이동
 *   - 박물관 없음 → /onboarding 이동
 *   - 실패 → /login?error=... 이동
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function MagicVerifyPage() {
  const navigate           = useNavigate();
  const [params]           = useSearchParams();
  const [message, setMessage] = useState('로그인 확인 중...');
  const [error,   setError]   = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setMessage('유효하지 않은 링크입니다.');
      setError(true);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    fetch('/api/auth/magic-link/verify', {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `오류 ${res.status}`);
        return data;
      })
      .then((data) => {
        if (data.hasMuseum && data.subdomain) {
          navigate(`/${data.subdomain}`, { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch((err) => {
        setMessage(err.message || '로그인 링크가 만료되었습니다.');
        setError(true);
        setTimeout(() => navigate('/login?error=verify_failed'), 2500);
      });
  }, []);

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>Orgcell</div>
        {error ? (
          <>
            <p style={s.errorMsg}>{message}</p>
            <p style={s.sub}>잠시 후 로그인 페이지로 이동합니다.</p>
          </>
        ) : (
          <>
            <div style={s.spinner} />
            <p style={s.msg}>{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8' },
  card:     { background: '#FDFBF7', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '2px 2px 0 #c4a87a', borderRadius: 4, padding: '48px 40px', textAlign: 'center', minWidth: 280 },
  logo:     { fontFamily: 'serif', fontSize: 28, fontWeight: 700, color: '#8B7355', letterSpacing: 2, marginBottom: 24 },
  spinner:  { width: 32, height: 32, border: '3px solid #E0D5C5', borderTop: '3px solid #8B7355', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
  msg:      { fontSize: 14, color: '#8B7355', margin: 0 },
  errorMsg: { fontSize: 14, color: '#C0392B', margin: '0 0 8px', fontWeight: 600 },
  sub:      { fontSize: 12, color: '#B09060', margin: 0 },
};
