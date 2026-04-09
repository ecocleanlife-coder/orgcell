/**
 * LandingPage.jsx — stub
 * 추후 구현: 서비스 소개, 로그인 유도, §31 미입장자 흐름
 */
export default function LandingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1 style={{ fontSize: 28, color: '#8B7355' }}>가족유산박물관</h1>
      <p style={{ color: '#666' }}>Family Heritage Museum</p>
      <a href="/login" style={{ padding: '10px 24px', border: '2px solid #C4A882', borderRadius: 8, color: '#8B7355', fontWeight: 600 }}>
        로그인
      </a>
    </div>
  );
}
