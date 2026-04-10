/**
 * LoginPage.jsx — 로그인 (Google OAuth + Magic Link 이메일)
 *
 * 로그인 방식:
 *   1. Google 계정으로 로그인 → POST /api/auth/google (redirect 방식)
 *   2. 이메일 매직링크 → POST /api/auth/magic-link/request
 */

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LoginPage() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const redirectTo     = params.get('redirect') || '/';

  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Google OAuth ──────────────────────────────────────────────────────────
  function handleGoogle() {
    // 백엔드가 OAuth redirect를 처리; state 파라미터로 redirect 경로 전달
    const state = encodeURIComponent(redirectTo);
    window.location.href = `/api/auth/google?state=${state}`;
  }

  // ── Magic Link ────────────────────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), redirect: redirectTo }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `오류 ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {/* 로고 */}
        <div style={styles.logo}>Orgcell</div>
        <p style={styles.subtitle}>가족유산박물관</p>
        <p style={styles.tagline}>Family Heritage Museum</p>

        <hr style={styles.divider} />

        {/* Google 로그인 */}
        <button style={styles.googleBtn} onClick={handleGoogle}>
          <GoogleIcon />
          Google 계정으로 로그인
        </button>

        <div style={styles.orRow}>
          <span style={styles.orLine} />
          <span style={styles.orText}>또는</span>
          <span style={styles.orLine} />
        </div>

        {/* Magic Link */}
        {sent ? (
          <div style={styles.sentBox}>
            <p style={styles.sentText}>
              <strong>{email}</strong> 으로<br />
              로그인 링크를 보냈습니다.
            </p>
            <p style={styles.sentSub}>이메일을 확인하고 링크를 클릭하세요.</p>
            <button style={styles.resendBtn} onClick={() => setSent(false)}>
              다시 보내기
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} style={styles.form}>
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              autoComplete="email"
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              type="submit"
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? '전송 중…' : '이메일로 로그인 링크 받기'}
            </button>
          </form>
        )}

        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>
      </div>
    </div>
  );
}

// ─── Google 아이콘 (인라인 SVG) ──────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// ─── 인라인 스타일 (§5 금색톤) ───────────────────────────────────────────────
const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F0E8',
    padding: 16,
  },
  card: {
    background: '#FDFBF7',
    border: '1px solid #C4A882',
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '2px 2px 0 #c4a87a',
    borderRadius: 4,
    padding: '48px 40px 40px',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: 700,
    color: '#8B7355',
    letterSpacing: 2,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 15,
    color: '#8B7355',
    fontWeight: 600,
  },
  tagline: {
    margin: '4px 0 0',
    fontSize: 12,
    color: '#B09060',
    letterSpacing: 1,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #E0D5C5',
    margin: '24px 0',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #C4A882',
    borderRadius: 4,
    background: '#fff',
    fontSize: 14,
    color: '#444',
    cursor: 'pointer',
    fontWeight: 500,
  },
  orRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '20px 0',
  },
  orLine: {
    flex: 1,
    height: 1,
    background: '#E0D5C5',
    display: 'block',
  },
  orText: {
    fontSize: 12,
    color: '#B09060',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #C4A882',
    borderRadius: 4,
    fontSize: 14,
    color: '#333',
    outline: 'none',
    background: '#FAFAF5',
  },
  error: {
    margin: 0,
    fontSize: 12,
    color: '#C0392B',
    textAlign: 'left',
  },
  submitBtn: {
    padding: '10px 16px',
    background: '#8B7355',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
  sentBox: {
    padding: '20px',
    background: '#F0EAE0',
    borderRadius: 4,
    border: '1px solid #C4A882',
  },
  sentText: {
    fontSize: 14,
    color: '#5a4a35',
    lineHeight: 1.6,
    margin: '0 0 8px',
  },
  sentSub: {
    fontSize: 12,
    color: '#8B7355',
    margin: '0 0 12px',
  },
  resendBtn: {
    background: 'none',
    border: '1px solid #C4A882',
    borderRadius: 4,
    padding: '6px 14px',
    fontSize: 13,
    color: '#8B7355',
    cursor: 'pointer',
  },
  backBtn: {
    marginTop: 20,
    background: 'none',
    border: 'none',
    color: '#B09060',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
