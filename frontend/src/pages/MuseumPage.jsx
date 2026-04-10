/**
 * MuseumPage.jsx — §31 박물관 메인화면
 *
 * 레이아웃 (§31):
 *   1. Header  — 로고 | 박물관명 | 언어선택 + 로그아웃
 *   2. MenuBar — §12 자판기 버튼 (공개 전시관만)
 *   3. SlideBanner — 자동 슬라이드, 오버레이, 관장 ⚙️
 *   4. FamilyTreeCanvas — §22/§23/§24
 *
 * 접근 제한 (§16): 입장권 없으면 문패(박물관명)만 + [입장권 요청하기]
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate }  from 'react-router-dom';
import { useAuthStore }            from '../store/authStore';
import { useTreeStore }            from '../store/treeStore';
import FamilyTreeCanvas            from '../components/tree/FamilyTreeCanvas';
import WormholeModal               from '../components/modals/WormholeModal';
import PersonEditModal             from '../components/modals/PersonEditModal';
import Footer                      from '../components/common/Footer';
import toast                       from 'react-hot-toast';

// ─── 전시관 타입 정의 (§8 기준) ───────────────────────────────────────────────
const EXHIBITION_TYPES = [
  { type: 'photo',        label: '사진전시관',   album: false },
  { type: 'document',     label: '자료전시관',   album: false },
  { type: 'biography',    label: '약력전시관',   album: false },
  { type: 'autobiography',label: '자서전전시관', album: false },
  { type: 'works',        label: '작품전시관',   album: false },
  { type: 'voice',        label: '음성전시관',   album: false },
  { type: 'shared-album', label: '공유앨범',     album: true  },
];

// ─── API 헬퍼 ─────────────────────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(path, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.message || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return json;
}

// ══════════════════════════════════════════════════════════════════════════════
// MuseumPage
// ══════════════════════════════════════════════════════════════════════════════
export default function MuseumPage() {
  const { subdomain } = useParams();
  const navigate      = useNavigate();

  const { user, isAuthenticated, isCuratorOf, logout, lang, setLang, fetchMe } = useAuthStore();
  const { fetchTree, setSiteId, navKey, isLoading: treeLoading, error: treeError } = useTreeStore();

  const [museum,       setMuseum]       = useState(null);   // GET /api/museum/:subdomain
  const [exhibitions,  setExhibitions]  = useState([]);     // 공개 전시관 목록
  const [access,       setAccess]       = useState(null);   // null=checking, true/false
  const [requesting,   setRequesting]   = useState(false);  // 입장권 요청 중

  const isCurator = isCuratorOf(subdomain);

  // ── 초기 로드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (!subdomain) return;
    loadMuseum();
  }, [subdomain]);

  async function loadMuseum() {
    try {
      // fetchMe 완료 후 curatorSites 확정 (레이스 컨디션 방지)
      await fetchMe();
      const data = await apiFetch(`/api/museum/${subdomain}`);
      const m = data.museum ?? data;
      setMuseum(m);

      // siteId를 treeStore에 저장 (PersonEditModal PUT API에 필요)
      const numericSiteId = m?.siteId ?? m?.site_id ?? m?.id ?? null;
      if (numericSiteId) setSiteId(numericSiteId);

      // 공개 전시관 조회
      if (m?.siteId || m?.site_id) {
        const sid = m.siteId ?? m.site_id;
        try {
          const exData = await apiFetch(`/api/exhibitions?siteId=${sid}`);
          const list = Array.isArray(exData) ? exData : (exData.exhibitions ?? []);
          const publicTypes = list.filter(e => e.is_public).map(e => e.type);
          setExhibitions(EXHIBITION_TYPES.filter(t => publicTypes.includes(t.type) || t.type === 'shared-album'));
        } catch (_) {
          setExhibitions([]);
        }
      }

      // 접근 권한 결정 — fetchMe 완료 후 fresh하게 체크
      if (isCuratorOf(subdomain)) { setAccess(true); return; }
      // 관장이 아닌 경우: 비로그인이면 false, 로그인이면 입장권 체크
      if (!isAuthenticated) { setAccess(false); return; }
      // 입장권 체크 (§16)
      const siteId   = m?.siteId ?? m?.site_id;
      const personId = user?.personId ?? user?.person_id;
      if (siteId && personId) {
        const { allowed } = await apiFetch(`/api/access/${siteId}/${personId}/check`).catch(() => ({ allowed: false }));
        setAccess(!!allowed);
      } else {
        setAccess(false);
      }
    } catch (err) {
      if (err.status === 404) { toast.error('박물관을 찾을 수 없습니다.'); navigate('/'); }
      else toast.error(err.message);
    }
  }

  // 트리 로드 (접근 허용 후)
  useEffect(() => {
    if (access === true) fetchTree(subdomain);
  }, [access, subdomain]);

  // ── 로그아웃 ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    await logout();
    navigate('/');
  }

  // ── 입장권 요청 ─────────────────────────────────────────────────────────────
  async function handleRequestAccess() {
    if (!isAuthenticated) { navigate(`/login?redirect=/${subdomain}`); return; }
    setRequesting(true);
    try {
      const siteId   = museum?.siteId ?? museum?.site_id;
      const personId = user?.personId ?? user?.person_id;
      await apiFetch(`/api/access/${siteId}/${personId}/request`, { method: 'POST' });
      toast.success('입장권을 요청했습니다. 관장 승인 후 입장 가능합니다.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRequesting(false);
    }
  }

  const museumName = museum?.museum_name ?? museum?.name ?? `${subdomain} 가족유산박물관`;

  // ── 접근 불가 화면 (§16 문패만) ─────────────────────────────────────────────
  if (access === false) {
    return (
      <div style={s.wrap}>
        <MuseumHeader
          museumName={museumName} lang={lang} setLang={setLang}
          isAuthenticated={isAuthenticated} onLogout={handleLogout}
          isCurator={false}
        />
        <div style={s.gateWrap}>
          <div style={s.gateCard}>
            <p style={s.gateTitle}>{museumName}</p>
            <p style={s.gateHint}>이 박물관을 관람하려면 입장권이 필요합니다.</p>
            <button
              style={{ ...s.reqBtn, opacity: requesting ? 0.7 : 1 }}
              onClick={handleRequestAccess}
              disabled={requesting}
            >
              {requesting ? '요청 중…' : '입장권 요청하기'}
            </button>
            {!isAuthenticated && (
              <button style={s.loginBtn} onClick={() => navigate(`/login?redirect=/${subdomain}`)}>
                로그인하기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 로딩 중 (access=null) ───────────────────────────────────────────────────
  if (access === null) {
    return <div style={s.loadingWrap}><span style={s.spinner} /></div>;
  }

  // ── 박물관 본체 ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <MuseumHeader
        museumName={museumName} lang={lang} setLang={setLang}
        isAuthenticated={isAuthenticated} onLogout={handleLogout}
        isCurator={isCurator}
      />

      <MenuBar exhibitions={exhibitions} subdomain={subdomain} navigate={navigate} />

      <SlideBanner subdomain={subdomain} isCurator={isCurator} navigate={navigate} />

      <div style={s.treeArea}>
        {treeLoading && <div style={s.treeLoading}>트리 불러오는 중…</div>}
        {treeError   && <div style={s.treeError}>{treeError}</div>}
        {!treeLoading && !treeError && <FamilyTreeCanvas key={navKey} />}
      </div>

      {/* 웜홀 이동 모달 (§6) — treeStore.wormholeTarget 세팅 시 표시 */}
      <WormholeModal />
      {/* 인물 정보 수정 모달 (§6) — treeStore.selectedPersonId 세팅 시 표시 */}
      <PersonEditModal />

      {/* §20 Footer */}
      <Footer />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Header (§31)
// ══════════════════════════════════════════════════════════════════════════════
function MuseumHeader({ museumName, lang, setLang, isAuthenticated, onLogout, isCurator }) {
  const navigate = useNavigate();
  return (
    <header style={s.header}>
      <div style={s.headerLogo} onClick={() => navigate('/')}>Orgcell</div>
      <div style={s.headerTitle}>{museumName}</div>
      <div style={s.headerRight}>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={s.langSelect}
          aria-label="언어 선택"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
        {isAuthenticated
          ? <button style={s.logoutBtn} onClick={onLogout}>로그아웃</button>
          : <button style={s.logoutBtn} onClick={() => navigate('/login')}>로그인</button>
        }
      </div>
    </header>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MenuBar (§12 자판기 스타일)
// ══════════════════════════════════════════════════════════════════════════════
function MenuBar({ exhibitions, subdomain, navigate }) {
  if (!exhibitions.length) return null;
  return (
    <nav style={s.menuBar}>
      {exhibitions.map((ex) => (
        <button
          key={ex.type}
          style={ex.album ? s.vendingAlbum : s.vendingBtn}
          onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
          onMouseUp={(e)   => e.currentTarget.style.transform = 'translateY(0)'}
          onMouseLeave={(e)=> e.currentTarget.style.transform = 'translateY(0)'}
          onClick={() => navigate(`/${subdomain}/exhibition/${ex.type}`)}
        >
          {ex.album && <span style={{ marginRight: 4 }}>📷</span>}
          {ex.label}
        </button>
      ))}
    </nav>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SlideBanner (§31: 자동 큐레이션, 3~5초, 오버레이, ⚙️ 관장만)
// ══════════════════════════════════════════════════════════════════════════════
const BANNER_INTERVAL_DEFAULT = 4000; // ms

function SlideBanner({ subdomain, isCurator, navigate }) {
  const [slides,   setSlides]   = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [interval, setInterval2]= useState(BANNER_INTERVAL_DEFAULT);
  const [showSetting, setShowSetting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // 슬라이드 소스: 최근 공개 사진 조회 (없으면 placeholder)
    apiFetch(`/api/museum/${subdomain}`).then((data) => {
      const banner = data?.museum?.banner_slides ?? data?.banner_slides ?? [];
      setSlides(banner.length ? banner : [{ photoUrl: null, name: '', description: subdomain + ' 가족유산박물관', exhibitionType: null }]);
    }).catch(() => {
      setSlides([{ photoUrl: null, name: '', description: subdomain + ' 가족유산박물관', exhibitionType: null }]);
    });
  }, [subdomain]);

  // 자동 전환
  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % slides.length), interval);
    return () => clearInterval(timerRef.current);
  }, [slides, interval]);

  const slide = slides[idx] || {};

  return (
    <div style={s.banner}>
      {/* 배경 사진 */}
      <div style={{
        ...s.bannerBg,
        backgroundImage: slide.photoUrl ? `url(${slide.photoUrl})` : 'none',
        background: slide.photoUrl ? undefined : 'linear-gradient(135deg, #C4A882 0%, #8B7355 100%)',
      }} />

      {/* 오버레이 텍스트 */}
      <div style={s.bannerOverlay}>
        {slide.name && <span style={s.bannerName}>{slide.name}</span>}
        {slide.description && <span style={s.bannerDesc}>{slide.description}</span>}
      </div>

      {/* 하단 컨트롤 */}
      <div style={s.bannerControls}>
        {slides.map((_, i) => (
          <span key={i} style={{ ...s.bannerDot, opacity: i === idx ? 1 : 0.4 }}
            onClick={() => setIdx(i)} />
        ))}
      </div>

      {/* ⚙️ 관장 설정 버튼 */}
      {isCurator && (
        <button style={s.settingBtn} onClick={() => setShowSetting(v => !v)}>⚙️ Setting</button>
      )}

      {/* 관장 설정 패널 */}
      {isCurator && showSetting && (
        <BannerSettingPanel
          interval={interval}
          onIntervalChange={setInterval2}
          onClose={() => setShowSetting(false)}
        />
      )}

      {/* 클릭 → 전시관 이동 */}
      {slide.exhibitionType && (
        <div style={s.bannerClickArea}
          onClick={() => navigate(`/${subdomain}/exhibition/${slide.exhibitionType}`)}
        />
      )}
    </div>
  );
}

function BannerSettingPanel({ interval, onIntervalChange, onClose }) {
  return (
    <div style={s.settingPanel}>
      <div style={s.settingRow}>
        <span style={s.settingLabel}>전환 속도</span>
        <select
          style={s.settingSelect}
          value={interval}
          onChange={e => onIntervalChange(Number(e.target.value))}
        >
          <option value={3000}>3초</option>
          <option value={4000}>4초</option>
          <option value={5000}>5초</option>
        </select>
      </div>
      <button style={s.settingClose} onClick={onClose}>닫기</button>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  wrap:        { minHeight: '100vh', background: '#F5F0E8', display: 'flex', flexDirection: 'column' },
  loadingWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner:     { display: 'inline-block', width: 32, height: 32, border: '3px solid #C4A882', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

  // Header
  header:      { display: 'flex', alignItems: 'center', padding: '0 24px', height: 56, background: '#FDFBF7', borderBottom: '1px solid #C4A882', position: 'sticky', top: 0, zIndex: 100 },
  headerLogo:  { fontFamily: 'serif', fontSize: 20, fontWeight: 700, color: '#8B7355', letterSpacing: 2, cursor: 'pointer', flexShrink: 0 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#5a4a35', letterSpacing: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  langSelect:  { padding: '4px 8px', border: '1px solid #C4A882', borderRadius: 4, background: '#FAFAF5', fontSize: 13, color: '#8B7355', cursor: 'pointer' },
  logoutBtn:   { padding: '5px 12px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer' },

  // MenuBar §12
  menuBar:     { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 20px', background: '#FDFBF7', borderBottom: '1px solid #E8DFD0' },
  vendingBtn:  {
    padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: '#FDF8F0', border: '1px solid #C4A882',
    borderBottom: '2px solid #9a7a50', borderRight: '2px solid #b09060',
    borderRadius: 6, color: '#7a5c38', transition: 'transform 0.05s',
    boxShadow: '1px 1px 0 #c4a87a',
  },
  vendingAlbum:{
    padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: '#F0F5FD', border: '1px solid #8BA5C4',
    borderBottom: '2px solid #6080A0', borderRight: '2px solid #7090B0',
    borderRadius: 6, color: '#3060A0', transition: 'transform 0.05s',
    boxShadow: '1px 1px 0 #8BA5C4',
  },

  // Banner §31
  banner:         { position: 'relative', height: 'clamp(180px, 28vh, 300px)', overflow: 'hidden', flexShrink: 0 },
  bannerBg:       { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'opacity 0.5s' },
  bannerOverlay:  { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px 24px' },
  bannerName:     { color: '#fff', fontSize: 15, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
  bannerDesc:     { color: 'rgba(255,255,255,0.9)', fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.5)' },
  bannerControls: { position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 },
  bannerDot:      { width: 7, height: 7, borderRadius: '50%', background: '#fff', cursor: 'pointer', display: 'inline-block' },
  bannerClickArea:{ position: 'absolute', inset: 0, cursor: 'pointer' },
  settingBtn:     { position: 'absolute', top: 10, right: 12, padding: '4px 10px', fontSize: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid #C4A882', borderRadius: 4, cursor: 'pointer', color: '#5a4a35', zIndex: 10 },
  settingPanel:   { position: 'absolute', top: 40, right: 12, background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 6, padding: '14px 16px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 180 },
  settingRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  settingLabel:   { fontSize: 13, color: '#5a4a35' },
  settingSelect:  { padding: '4px 8px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, background: '#FAFAF5' },
  settingClose:   { width: '100%', padding: '5px 0', fontSize: 12, background: 'none', border: '1px solid #C4A882', borderRadius: 4, color: '#8B7355', cursor: 'pointer' },

  // Tree
  treeArea:    { flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 },
  treeLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8B7355', fontSize: 14 },
  treeError:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#C0392B', fontSize: 14 },

  // Access gate §16
  gateWrap:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  gateCard:  { background: '#FDFBF7', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '2px 2px 0 #c4a87a', borderRadius: 4, padding: '48px 40px', textAlign: 'center', maxWidth: 360 },
  gateTitle: { fontSize: 22, fontWeight: 700, color: '#5a4a35', margin: '0 0 12px', fontFamily: 'serif' },
  gateHint:  { fontSize: 14, color: '#8B7355', margin: '0 0 24px', lineHeight: 1.6 },
  reqBtn:    { display: 'block', width: '100%', padding: '11px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 },
  loginBtn:  { display: 'block', width: '100%', padding: '9px 0', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 14, color: '#8B7355', cursor: 'pointer' },
};
