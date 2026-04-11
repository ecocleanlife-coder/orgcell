/**
 * panels/ArchivePanel.jsx — §8 우측 메뉴 / 자료실 관리
 *
 * §8 우측 메뉴 버튼 (§12 자판기 스타일):
 *  [사진자료실] [주요자료실] [주요약력] [자서전] [작품실] [육성녹음] [공유앨범]
 *  ─────────────────────────────────────────────────
 *  [초대하기] [입장권 발급] [접근요청관리]
 *
 * - 버튼 클릭 시 하단에 해당 내용 표시 (§8)
 * - 공개 시 메뉴 레이블 → 전시관 이름으로 변경 (§10)
 * - 공유앨범 생성 즉시 박물관 상단 메뉴에 노출 (§11)
 */

import { useState } from 'react';

// ── 메뉴 정의 ─────────────────────────────────────────────────────────────────
// publicLabel: §10 공개 시 전시관 이름
const MENU_BTNS = [
  { key: 'photo',   label: '사진자료실', publicLabel: '사진전시관'   },
  { key: 'main',    label: '주요자료실', publicLabel: '자료전시관'   },
  { key: 'career',  label: '주요약력',   publicLabel: '약력전시관'   },
  { key: 'memoir',  label: '자서전',     publicLabel: '자서전전시관' },
  { key: 'artwork', label: '작품실',     publicLabel: '작품전시관'   },
  { key: 'voice',   label: '육성녹음',   publicLabel: '음성전시관'   },
  { key: 'album',   label: '공유앨범',   publicLabel: null           }, // §11: 공유앨범은 별도 처리
];

const UTIL_BTNS = [
  { key: 'invite', label: '초대하기'     },
  { key: 'pass',   label: '입장권 발급'  },
  { key: 'access', label: '접근요청관리' },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function ArchivePanel({ siteId, subdomain }) {
  const [activeMenu, setActiveMenu] = useState(null);

  function toggleMenu(key) {
    setActiveMenu(prev => (prev === key ? null : key));
  }

  return (
    <div style={s.wrap}>
      {/* 자료실 메뉴 버튼 */}
      <nav style={s.nav}>
        {MENU_BTNS.map(btn => (
          <button
            key={btn.key}
            style={{ ...s.menuBtn, ...(activeMenu === btn.key ? s.menuOn : {}) }}
            onClick={() => toggleMenu(btn.key)}
          >
            {btn.key === 'album' ? '📷 ' : ''}{btn.label}
          </button>
        ))}

        {/* 구분선 */}
        <div style={s.sep} />

        {UTIL_BTNS.map(btn => (
          <button
            key={btn.key}
            style={{ ...s.menuBtn, ...(activeMenu === btn.key ? s.menuOn : {}) }}
            onClick={() => toggleMenu(btn.key)}
          >
            {btn.label}
          </button>
        ))}
      </nav>

      {/* 선택된 메뉴 컨텐츠 영역 — §8: 버튼 클릭 시 하단에 표시 */}
      {activeMenu && (
        <div style={s.content}>
          <MenuContent menuKey={activeMenu} siteId={siteId} subdomain={subdomain} />
        </div>
      )}
    </div>
  );
}

// ── 메뉴별 컨텐츠 (각 자료실 구현 시 교체) ────────────────────────────────────
function MenuContent({ menuKey, siteId, subdomain }) {
  const menuLabel = [...MENU_BTNS, ...UTIL_BTNS].find(b => b.key === menuKey)?.label ?? menuKey;

  // TODO: 각 자료실 컴포넌트로 교체
  // case 'photo':   return <PhotoArchive siteId={siteId} subdomain={subdomain} />;
  // case 'career':  return <CareerArchive siteId={siteId} />;
  // case 'memoir':  return <MemoirArchive siteId={siteId} />;
  // case 'album':   return <SharedAlbum siteId={siteId} subdomain={subdomain} />;
  // case 'invite':  return <InviteManager siteId={siteId} />;
  // case 'pass':    return <PassManager siteId={siteId} />;
  // case 'access':  return <AccessManager siteId={siteId} />;

  return (
    <div style={s.placeholder}>
      <p style={{ fontSize: 13, color: '#8B7355', margin: 0 }}>
        [{menuLabel}] 준비 중입니다.
      </p>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:        { display: 'flex', flexDirection: 'column', height: '100%' },

  // §12 자판기 스타일 내비
  nav:         { display: 'flex', flexDirection: 'column', gap: 4 },
  menuBtn:     {
    padding: '8px 12px',
    background: '#FAFAF5',
    border: '1px solid #C4A882',
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '1px 1px 0 #c4a87a',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    color: '#5a4a35',
  },
  menuOn:      { background: '#8B7355', color: '#fff', borderColor: '#8B7355', boxShadow: 'none' },
  sep:         { height: 1, background: '#C4A882', margin: '4px 0' },

  // 컨텐츠 영역
  content:     { marginTop: 16, flex: 1, overflowY: 'auto' },
  placeholder: { padding: 16, background: '#FDFBF7', border: '1px solid #E8DFD0', borderRadius: 6, textAlign: 'center' },
};
