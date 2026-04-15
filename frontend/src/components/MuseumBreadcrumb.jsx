/**
 * MuseumBreadcrumb.jsx — §24-5 네비게이션 히스토리 빵부스러기
 *
 * Props:
 *   currentLabel  {string}  — 현재 위치 텍스트 (클릭 불가)
 *   backItem      {{ label, subdomain }}? — 현재 위치 바로 앞 클릭 가능 항목
 *                   ArchivePage: { label: museumName, subdomain }
 *                   MuseumPage: 전달하지 않음 (currentLabel이 박물관명)
 *
 * 표시 규칙 (§24-5):
 *   ≤2 history items: 전체 표시
 *   ≥3 history items: 🏠 ← ... ← 최근 2개
 *   모바일 (<600px): 🏠 + 직전 1개만
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useTreeStore }        from '../store/treeStore';
import { useAuthStore }        from '../store/authStore';

// ─── 반응형 훅 ────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 600);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function MuseumBreadcrumb({ currentLabel, backItem }) {
  const navigate     = useNavigate();
  const isMobile     = useIsMobile();
  const { navHistory, navigateBack, resetHistory } = useTreeStore();
  const { curatorSites } = useAuthStore();
  const mySubdomain  = curatorSites[0] ?? null;

  // ── 🏠 버튼 ─────────────────────────────────────────────────────────────────
  function handleHome() {
    resetHistory();
    if (mySubdomain) navigate(`/${mySubdomain}`);
    else             navigate('/');
  }

  // ── 히스토리 항목 클릭 ────────────────────────────────────────────────────────
  async function handleCrumb(subdomain) {
    await navigateBack(subdomain);
    navigate(`/${subdomain}`);
  }

  // ── 표시할 항목 계산 ──────────────────────────────────────────────────────────
  // fullItems = navHistory 항목들 + (backItem이 있으면 추가)
  const fullItems = backItem
    ? [...navHistory, { subdomain: backItem.subdomain, displayName: backItem.label }]
    : navHistory;

  let visibleItems;
  let showEllipsis = false;

  if (isMobile) {
    // 모바일: 직전 1개만
    visibleItems = fullItems.slice(-1);
    showEllipsis = fullItems.length > 1;
  } else if (fullItems.length >= 3) {
    // 데스크톱 3개 이상: 최근 2개 + ...
    visibleItems = fullItems.slice(-2);
    showEllipsis = true;
  } else {
    visibleItems = fullItems;
  }

  // ── 렌더링 ───────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      {/* 🏠 홈 버튼 */}
      <button style={s.homeBtn} onClick={handleHome} title="내 박물관으로">
        🏠
      </button>

      {/* ... 생략 표시 */}
      {showEllipsis && (
        <>
          <span style={s.arrow}>←</span>
          <span style={s.ellipsis}>...</span>
        </>
      )}

      {/* 히스토리 항목들 */}
      {visibleItems.map((item) => (
        <span key={item.subdomain} style={s.crumbGroup}>
          <span style={s.arrow}>←</span>
          <button
            style={s.crumbBtn}
            onClick={() => handleCrumb(item.subdomain)}
          >
            {item.displayName}
          </button>
        </span>
      ))}

      {/* 현재 위치 (클릭 불가) */}
      {currentLabel && (
        <span style={s.crumbGroup}>
          <span style={s.arrow}>←</span>
          <span style={s.current}>{currentLabel}</span>
        </span>
      )}
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap: {
    display:    'flex',
    alignItems: 'center',
    gap:        4,
    flexWrap:   'nowrap',
    overflow:   'hidden',
    flexShrink: 1,
    minWidth:   0,
  },
  homeBtn: {
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    fontSize:   16,
    padding:    '2px 4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  arrow: {
    fontSize:   12,
    color:      '#C4A882',
    margin:     '0 2px',
    flexShrink: 0,
  },
  ellipsis: {
    fontSize: 12,
    color:    '#B09060',
  },
  crumbGroup: {
    display:    'flex',
    alignItems: 'center',
    minWidth:   0,
    overflow:   'hidden',
  },
  crumbBtn: {
    background:    'none',
    border:        'none',
    cursor:        'pointer',
    fontSize:      12,
    color:         '#8B7355',
    fontWeight:    500,
    padding:       '2px 4px',
    whiteSpace:    'nowrap',
    overflow:      'hidden',
    textOverflow:  'ellipsis',
    maxWidth:      120,
    textDecoration:'underline',
    textDecorationColor: 'rgba(139,115,85,0.4)',
  },
  current: {
    fontSize:   12,
    color:      '#5A3E1B',
    fontWeight: 600,
    padding:    '2px 4px',
    whiteSpace: 'nowrap',
    overflow:   'hidden',
    textOverflow: 'ellipsis',
    maxWidth:   140,
  },
};
