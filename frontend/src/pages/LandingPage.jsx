/**
 * LandingPage.jsx — 서비스 문패 (비로그인 방문자)
 *
 * §16: 입장권 없는 사람은 박물관 내부를 볼 수 없다. 문패만 공개.
 *
 * 역할:
 *   - "/" 루트 방문 시 보이는 서비스 진입 화면
 *   - 비로그인: 서비스 소개 + 구글 로그인 / 이메일 로그인 유도
 *   - 로그인 상태: 내 박물관으로 자동 이동, 박물관 없으면 온보딩
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Footer from '../components/common/Footer';

export default function LandingPage() {
  const { isAuthenticated, isLoading, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMe().then(() => {
      const { isAuthenticated: authed, curatorSites } = useAuthStore.getState();
      if (authed && curatorSites?.length > 0) {
        navigate(`/${curatorSites[0]}`, { replace: true });
      } else if (authed) {
        navigate('/onboarding', { replace: true });
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.loadingDot} />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.bgPattern} />

      <div style={s.plaque}>
        {/* 장식 상단 */}
        <Decor />

        {/* 로고 */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>🏛️</div>
          <h1 style={s.title}>가족유산박물관</h1>
          <p style={s.subtitle}>Family Heritage Museum</p>
        </div>

        {/* 헤드라인 */}
        <p style={s.headline}>
          FamilySearch가 과거를 기록하는 도서관이라면,<br />
          <strong>Orgcell은 우리 가족의 현재를 전시하는<br />살아있는 박물관입니다.</strong>
        </p>

        {/* 주요 기능 */}
        <div style={s.features}>
          {[
            { icon: '🌳', label: '가족 트리',    desc: '3대를 한눈에, 웜홀로 연결' },
            { icon: '🖼️', label: '7대 전시관',   desc: '사진·약력·자서전·육성녹음' },
            { icon: '🔐', label: '입장권 시스템', desc: '초대받은 가족만 입장 가능' },
          ].map(f => (
            <div key={f.label} style={s.featureItem}>
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <span style={s.featureLabel}>{f.label}</span>
              <span style={s.featureDesc}>{f.desc}</span>
            </div>
          ))}
        </div>

        <div style={s.divider} />

        {/* 로그인 버튼 */}
        <div style={s.btnGroup}>
          <a href="/api/auth/google" style={{ ...s.btn, ...s.btnGoogle }}>
            <GoogleIcon />
            구글로 시작하기
          </a>
          <button style={{ ...s.btn, ...s.btnEmail }} onClick={() => navigate('/login')}>
            이메일로 시작하기
          </button>
        </div>

        <p style={s.passHint}>
          입장권이 있으신가요?{' '}
          <button style={s.linkBtn} onClick={() => navigate('/login')}>로그인</button>
          {' '}후 바로 입장하실 수 있습니다.
        </p>

        {/* 장식 하단 */}
        <Decor />
      </div>

      <Footer variant="minimal" />
    </div>
  );
}

function Decor() {
  return (
    <div style={s.decorTop}>
      <span style={s.decorLine} />
      <span style={s.decorDot}>◆</span>
      <span style={s.decorLine} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const s = {
  page:        { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box', background: '#F5F0E8', position: 'relative', overflow: 'hidden' },
  bgPattern:   { position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(196,168,130,0.04) 40px, rgba(196,168,130,0.04) 80px)', pointerEvents: 'none' },
  loadingWrap: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8' },
  loadingDot:  { width: 12, height: 12, borderRadius: '50%', background: '#C4A882', animation: 'pulse 1s ease-in-out infinite' },

  plaque: {
    position: 'relative', zIndex: 1,
    background: '#FDFBF7', border: '1px solid #C4A882',
    borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50',
    boxShadow: '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
    borderRadius: 10, padding: '32px 48px 28px',
    width: 440, maxWidth: 'calc(100vw - 32px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },

  decorTop:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, width: '100%' },
  decorLine: { flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #C4A882, transparent)' },
  decorDot:  { fontSize: 10, color: '#C4A882' },

  logoWrap:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 },
  logoIcon:  { fontSize: 44, lineHeight: 1, marginBottom: 4 },
  title:     { fontSize: 28, fontWeight: 800, color: '#3a2a1a', margin: 0, letterSpacing: 1 },
  subtitle:  { fontSize: 13, color: '#9a8a75', margin: 0, letterSpacing: 2, fontStyle: 'italic' },

  headline:  { fontSize: 13, color: '#6a5a45', lineHeight: 1.8, margin: '0 0 18px' },

  features:      { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, width: '100%', marginBottom: 18 },
  featureItem:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 6px', background: '#F5F0E8', borderRadius: 6, border: '1px solid #E8DFD0' },
  featureLabel:  { fontSize: 11, fontWeight: 700, color: '#5a4a35' },
  featureDesc:   { fontSize: 10, color: '#9a8a75', textAlign: 'center', lineHeight: 1.4 },

  divider:   { width: '70%', height: 1, background: 'repeating-linear-gradient(to right, #C4A882 0, #C4A882 4px, transparent 4px, transparent 8px)', marginBottom: 18, opacity: 0.5 },

  btnGroup:  { display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 14 },
  btn:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '12px 0', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', border: 'none', boxSizing: 'border-box' },
  btnGoogle: { background: '#fff', color: '#3a2a1a', border: '1px solid #C4A882', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  btnEmail:  { background: '#8B7355', color: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' },

  passHint:  { fontSize: 12, color: '#9a8a75', margin: '0 0 20px', lineHeight: 1.6 },
  linkBtn:   { background: 'none', border: 'none', color: '#8B7355', fontWeight: 600, cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' },
};
