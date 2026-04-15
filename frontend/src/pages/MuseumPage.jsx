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
import MuseumBreadcrumb            from '../components/MuseumBreadcrumb';
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
  const { fetchTree, setSiteId, setDisplayName, navKey, isLoading: treeLoading, error: treeError } = useTreeStore();

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
      const m = data.data ?? data.museum ?? data;
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

      // 접근 권한 결정 — fetchMe 완료 후 fresh하게 체크 (stale closure 방지: getState())
      const { isAuthenticated: authed, user: freshUser, isCuratorOf: isCur } = useAuthStore.getState();
      if (isCur(subdomain)) { setAccess(true); return; }
      // 관장이 아닌 경우: 비로그인이면 false, 로그인이면 입장권 체크
      if (!authed) { setAccess(false); return; }
      // 입장권 체크 (§16)
      const siteId   = m?.siteId ?? m?.site_id;
      const personId = freshUser?.personId ?? freshUser?.person_id;
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

  // 버그 B 수정: curatorSites가 채워진 후 isCurator가 바뀌면 access를 재평가한다.
  // fetchMyCuration() 완료 → curatorSites 갱신 → 이 effect 재실행 → access=true 확정.
  useEffect(() => {
    if (!subdomain) return;
    const { isCuratorOf: isCur } = useAuthStore.getState();
    if (isCur(subdomain)) {
      setAccess(true);
    }
  }, [isCurator, subdomain]); // isCurator는 curatorSites 변경 시 재계산됨

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

  const museumName = formatMuseumName(museum?.curator_name) ?? `${subdomain} 가족유산박물관`;

  // §24-5: 박물관 표시명을 treeStore에 저장 (MuseumBreadcrumb + navigateTo 기록용)
  useEffect(() => {
    if (museum) setDisplayName(museumName);
  }, [museum, museumName]);

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

      {/* §24-5 네비게이션 히스토리 — 웜홀 이동 후에만 표시 */}
      <BreadcrumbBar museumName={museumName} />

      <MenuBar exhibitions={exhibitions} subdomain={subdomain} navigate={navigate} />

      <SlideBanner subdomain={subdomain} isCurator={isCurator} navigate={navigate} museum={museum} />

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
// BreadcrumbBar — §24-5: 웜홀 이동 시 경로 표시 (navHistory 있을 때만)
// ══════════════════════════════════════════════════════════════════════════════
function BreadcrumbBar({ museumName }) {
  const { navHistory } = useTreeStore();
  if (!navHistory.length) return null;
  return (
    <div style={s.breadcrumbBar}>
      <MuseumBreadcrumb currentLabel={museumName} />
    </div>
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

function SlideBanner({ subdomain, isCurator, navigate, museum }) {
  const [slides,      setSlides]      = useState([]);
  const [idx,         setIdx]         = useState(0);
  const [msgIdx,      setMsgIdx]      = useState(0);
  const [fadeIn,      setFadeIn]      = useState(true);
  const [interval,    setInterval2]   = useState(BANNER_INTERVAL_DEFAULT);
  const [showSetting, setShowSetting] = useState(false);
  const timerRef  = useRef(null);
  const msgTimer  = useRef(null);

  // CSS 애니메이션 삽입
  useEffect(() => {
    if (!document.getElementById('banner-style')) {
      const el = document.createElement('style');
      el.id = 'banner-style';
      el.textContent = `
        @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeOutUp { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-12px); } }
        @keyframes logoPulse { 0%,100%{ opacity:1; } 50%{ opacity:0.75; } }
      `;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => {
    apiFetch(`/api/museum/${subdomain}`).then((data) => {
      const banner = data?.museum?.banner_slides ?? data?.banner_slides ?? [];
      setSlides(banner.length ? banner : [{ photoUrl: null }]);
    }).catch(() => setSlides([{ photoUrl: null }]));
  }, [subdomain]);

  // 사진 슬라이드 자동 전환
  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % slides.length), interval);
    return () => clearInterval(timerRef.current);
  }, [slides, interval]);

  // 문구 페이드 전환 (4초마다)
  const curatorName = museum?.curator_name ?? museum?.curatorName ?? subdomain;
  const messages = [
    `🏛️  ${curatorName} 가족유산박물관에 오신것을 환영합니다`,
    '사진들이 전시되는 공간입니다',
  ];

  useEffect(() => {
    msgTimer.current = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setFadeIn(true);
      }, 500);
    }, 4000);
    return () => clearInterval(msgTimer.current);
  }, [messages.length]);

  const slide = slides[idx] || {};
  const hasPhoto = !!slide.photoUrl;

  return (
    <div style={s.banner}>
      {/* 배경 */}
      <div style={{
        ...s.bannerBg,
        backgroundImage: hasPhoto ? `url(${slide.photoUrl})` : 'none',
        background: hasPhoto ? undefined : 'linear-gradient(160deg, #3a2a1a 0%, #5a4a35 50%, #3a2a1a 100%)',
      }} />

      {/* 사진 없을 때: 로고 + 문구 */}
      {!hasPhoto && (
        <div style={s.bannerCenter}>
          {/* 로고 */}
          <div style={s.bannerLogo}>
            <span style={s.bannerLogoIcon}>🏛️</span>
            <span style={s.bannerLogoText}>Orgcell</span>
          </div>
          {/* 문구 페이드인/아웃 */}
          <div style={{
            ...s.bannerMsg,
            animation: fadeIn ? 'fadeInUp 0.5s ease forwards' : 'fadeOutUp 0.4s ease forwards',
          }}>
            {messages[msgIdx]}
          </div>
        </div>
      )}

      {/* 사진 있을 때: 오버레이 텍스트 */}
      {hasPhoto && (
        <div style={s.bannerOverlay}>
          {slide.name && <span style={s.bannerName}>{slide.name}</span>}
        </div>
      )}

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
  headerLogo:  { fontFamily: 'serif', fontSize: 18, fontWeight: 700, color: '#8B7355', letterSpacing: 2, cursor: 'pointer', flexShrink: 0 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#5a4a35', letterSpacing: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  langSelect:  { padding: '4px 8px', border: '1px solid #C4A882', borderRadius: 4, background: '#FAFAF5', fontSize: 18, color: '#8B7355', cursor: 'pointer' },
  logoutBtn:   { padding: '5px 12px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 18, color: '#8B7355', cursor: 'pointer' },

  // §24-5 빵부스러기 바
  breadcrumbBar: { display: 'flex', alignItems: 'center', padding: '5px 20px', background: '#FDFBF7', borderBottom: '1px solid #EDE8E0', minHeight: 30 },

  // MenuBar §12
  menuBar:     { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 20px', background: '#FDFBF7', borderBottom: '1px solid #E8DFD0' },
  vendingBtn:  {
    padding: '7px 16px', fontSize: 18, fontWeight: 600, cursor: 'pointer',
    background: '#FDF8F0', border: '1px solid #C4A882',
    borderBottom: '2px solid #9a7a50', borderRight: '2px solid #b09060',
    borderRadius: 6, color: '#7a5c38', transition: 'transform 0.05s',
    boxShadow: '1px 1px 0 #c4a87a',
  },
  vendingAlbum:{
    padding: '7px 16px', fontSize: 18, fontWeight: 600, cursor: 'pointer',
    background: '#F0F5FD', border: '1px solid #8BA5C4',
    borderBottom: '2px solid #6080A0', borderRight: '2px solid #7090B0',
    borderRadius: 6, color: '#3060A0', transition: 'transform 0.05s',
    boxShadow: '1px 1px 0 #8BA5C4',
  },

  // Banner §31
  banner:         { position: 'relative', height: 'clamp(180px, 28vh, 300px)', overflow: 'hidden', flexShrink: 0 },
  bannerBg:       { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'opacity 0.5s' },
  bannerOverlay:  { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px 24px' },
  bannerName:     { color: '#fff', fontSize: 18, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.6)' },
  bannerDesc:     { color: 'rgba(255,255,255,0.9)', fontSize: 18, textShadow: '0 1px 3px rgba(0,0,0,0.5)' },
  bannerControls: { position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 },
  bannerDot:      { width: 7, height: 7, borderRadius: '50%', background: '#fff', cursor: 'pointer', display: 'inline-block' },
  bannerClickArea:{ position: 'absolute', inset: 0, cursor: 'pointer' },
  bannerCenter:   { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 },
  bannerLogo:     { display: 'flex', alignItems: 'center', gap: 10 },
  bannerLogoIcon: { fontSize: 36, animation: 'logoPulse 3s ease-in-out infinite' },
  bannerLogoText: { fontSize: 28, fontWeight: 800, color: '#C4A882', letterSpacing: 4, fontFamily: 'serif', textShadow: '0 2px 12px rgba(196,168,130,0.4)' },
  bannerMsg:      { fontSize: 18, color: '#FDFBF7', letterSpacing: 1, textAlign: 'center', padding: '0 24px', lineHeight: 1.6, fontWeight: 500 },
  settingBtn:     { position: 'absolute', top: 10, right: 12, padding: '4px 10px', fontSize: 18, background: 'rgba(255,255,255,0.85)', border: '1px solid #C4A882', borderRadius: 4, cursor: 'pointer', color: '#5a4a35', zIndex: 10 },
  settingPanel:   { position: 'absolute', top: 40, right: 12, background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 6, padding: '14px 16px', zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 180 },
  settingRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  settingLabel:   { fontSize: 18, color: '#5a4a35' },
  settingSelect:  { padding: '4px 8px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 18, background: '#FAFAF5' },
  settingClose:   { width: '100%', padding: '5px 0', fontSize: 18, background: 'none', border: '1px solid #C4A882', borderRadius: 4, color: '#8B7355', cursor: 'pointer' },

  // Tree
  treeArea:    { flex: 1, position: 'relative', overflow: 'hidden', minHeight: 400 },
  treeLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8B7355', fontSize: 18 },
  treeError:   { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#C0392B', fontSize: 18 },

  // Access gate §16
  gateWrap:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  gateCard:  { background: '#FDFBF7', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '2px 2px 0 #c4a87a', borderRadius: 4, padding: '48px 40px', textAlign: 'center', maxWidth: 360 },
  gateTitle: { fontSize: 18, fontWeight: 700, color: '#5a4a35', margin: '0 0 12px', fontFamily: 'serif' },
  gateHint:  { fontSize: 18, color: '#8B7355', margin: '0 0 24px', lineHeight: 1.6 },
  reqBtn:    { display: 'block', width: '100%', padding: '11px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 18, fontWeight: 600, cursor: 'pointer', marginBottom: 10 },
  loginBtn:  { display: 'block', width: '100%', padding: '9px 0', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 18, color: '#8B7355', cursor: 'pointer' },
};

// ── §31 헤더 박물관명 포맷 ──────────────────────────────────────────────────────
// 한글/한자 포함 → 전체 이름. 영문만 & 10자 초과 → "F. LastName"
function formatMuseumName(name) {
  if (!name) return null;
  const isAsian = /[\u3040-\u9FFF\uAC00-\uD7AF]/.test(name);
  if (isAsian) return `${name} 가족유산박물관`;
  if (name.length > 10) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const initial = parts[0][0].toUpperCase();
      const last    = parts[parts.length - 1];
      return `${initial}. ${last} 가족유산박물관`;
    }
  }
  return `${name} 가족유산박물관`;
}
