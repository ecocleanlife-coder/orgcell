/**
 * ExhibitStandardModal.jsx — §25 전시 기준 안내 모달
 *
 * §25 규칙:
 *   - 첫 방문 시 자동 표시 (1회) — localStorage 키: "orgcell_exhibit_guide_seen"
 *   - [?] 버튼으로 언제든 재확인 가능
 *   - z=1 인물 생성 시 "본인 박물관에서 표시되지 않습니다" 안내
 *
 * 사용 방법:
 *   1. MuseumPage 등에서 마운트 시 localStorage 체크 → isOpen=true 자동
 *   2. [?] 버튼 클릭 → isOpen=true 수동 트리거
 *   3. z1Warning prop: z=1 인물 생성 직후 안내용 경고 문구 추가
 *
 * Props:
 *   isOpen     — boolean
 *   onClose    — () => void
 *   z1Warning  — boolean (z=1 인물 안내 강조 표시, 기본 false)
 */

const SEEN_KEY = 'orgcell_exhibit_guide_seen';

export default function ExhibitStandardModal({ isOpen, onClose, z1Warning = false }) {
  if (!isOpen) return null;

  function handleClose() {
    localStorage.setItem(SEEN_KEY, '1');
    onClose();
  }

  return (
    <>
      {/* 오버레이 */}
      <div style={s.overlay} onClick={handleClose} />

      {/* 모달 패널 */}
      <div style={s.panel} role="dialog" aria-modal="true" aria-label="전시 기준 안내">

        {/* 제목 */}
        <div style={s.header}>
          <span style={s.headerIcon}>📋</span>
          <h2 style={s.title}>전시 기준 안내</h2>
        </div>

        {/* z=1 경고 (선택적 강조) */}
        {z1Warning && (
          <div style={s.warningBox}>
            <span style={s.warningIcon}>⚠️</span>
            이 인물은 <strong>배우자 측 가문</strong>에 속하며,<br />
            <strong>본인 박물관(z=0 트리)에는 표시되지 않습니다.</strong><br />
            해당 인물의 박물관에서만 볼 수 있습니다.
          </div>
        )}

        {/* 안내 섹션 목록 */}
        <div style={s.body}>

          <Section icon="🌳" title="가족 트리 표시 기준">
            <Item>관장 부부를 중심으로 직계 가족만 z=0(현재 트리)에 표시됩니다.</Item>
            <Item>배우자 측 가문(z=1)은 해당 인물의 박물관에서 별도 표시됩니다.</Item>
            <Item>깊이 3 이상(증손주·)은 30% 투명도로 흐리게 표시됩니다.</Item>
          </Section>

          <Section icon="📁" title="자료실 공개 범위">
            <Item>관장만 자료를 업로드·수정할 수 있습니다.</Item>
            <Item>각 자료는 개별적으로 <em>공개/비공개</em>를 설정할 수 있습니다.</Item>
            <Item>비공개 자료는 관장 및 초대된 가족만 열람 가능합니다.</Item>
          </Section>

          <Section icon="🎫" title="입장권 안내">
            <Item>가족(Linked): 연결 시 Legacy Pass 자동 발급, 평생 유효.</Item>
            <Item>손님(Visitor): 관장이 유효기간을 설정한 Visitor Pass.</Item>
            <Item>미입장자는 박물관 문패(이름)만 볼 수 있습니다.</Item>
          </Section>

          <Section icon="🖼️" title="전시 콘텐츠 종류">
            <Item>사진자료실 / 주요문서 / 약력 / 자서전 / 작품 / 육성녹음 / 공유앨범</Item>
            <Item>공유앨범은 로그인 없이도 링크로 업로드·다운로드가 가능합니다.</Item>
          </Section>

        </div>

        {/* 하단 버튼 */}
        <button style={s.closeBtn} onClick={handleClose}>
          확인했습니다
        </button>

        {/* 재확인 안내 */}
        <p style={s.reopen}>
          언제든 화면 우측 하단의 <strong>[?]</strong> 버튼으로 다시 볼 수 있습니다.
        </p>

      </div>
    </>
  );
}

// ── 내부 컴포넌트 ─────────────────────────────────────────────────────────────
function Section({ icon, title, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>
        <span style={s.sectionIcon}>{icon}</span>
        {title}
      </div>
      <ul style={s.list}>{children}</ul>
    </div>
  );
}

function Item({ children }) {
  return <li style={s.listItem}>{children}</li>;
}

// ── 유틸: 첫 방문 여부 ─────────────────────────────────────────────────────────
export function isFirstVisit() {
  return !localStorage.getItem(SEEN_KEY);
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position:   'fixed',
    inset:       0,
    background: 'rgba(40,30,20,0.5)',
    zIndex:      900,
    cursor:      'pointer',
  },
  panel: {
    position:       'fixed',
    top:            '50%',
    left:           '50%',
    transform:      'translate(-50%,-50%)',
    zIndex:          901,
    background:     '#FDFBF7',
    border:         '1px solid #C4A882',
    borderRadius:    10,
    boxShadow:      '0 8px 40px rgba(0,0,0,0.18)',
    padding:        '28px 32px 20px',
    width:           480,
    maxWidth:       'calc(100vw - 32px)',
    maxHeight:      '85vh',
    overflowY:      'auto',
    display:        'flex',
    flexDirection:  'column',
    gap:             0,
  },
  header: {
    display:        'flex',
    alignItems:     'center',
    gap:             10,
    marginBottom:   16,
  },
  headerIcon: {
    fontSize: 22,
  },
  title: {
    fontSize:   18,
    fontWeight: 700,
    color:      '#3a2a1a',
    margin:      0,
  },
  warningBox: {
    background:   '#FFF8E1',
    border:       '1px solid #D4A832',
    borderRadius:  6,
    padding:      '12px 14px',
    fontSize:      13,
    color:        '#7a5a10',
    lineHeight:   1.7,
    marginBottom: 14,
  },
  warningIcon: {
    marginRight: 6,
  },
  body: {
    display:       'flex',
    flexDirection: 'column',
    gap:            14,
    marginBottom:  18,
  },
  section: {
    background:   '#FAF7F2',
    border:       '1px solid #E8DFD0',
    borderRadius:  6,
    padding:      '12px 14px',
  },
  sectionTitle: {
    fontSize:      13,
    fontWeight:    700,
    color:         '#5a4a35',
    marginBottom:   7,
    display:       'flex',
    alignItems:    'center',
    gap:            6,
  },
  sectionIcon: {
    fontSize: 14,
  },
  list: {
    margin:       0,
    paddingLeft:  18,
    display:      'flex',
    flexDirection:'column',
    gap:           4,
  },
  listItem: {
    fontSize:   12,
    color:      '#6a5a45',
    lineHeight: 1.6,
  },
  closeBtn: {
    background:   '#8B7355',
    color:        '#fff',
    border:       'none',
    borderRadius:  6,
    padding:      '11px 0',
    fontSize:      14,
    fontWeight:    600,
    cursor:        'pointer',
    width:        '100%',
    marginBottom:  10,
  },
  reopen: {
    fontSize:  11,
    color:     '#9a8a75',
    textAlign: 'center',
    margin:     0,
    lineHeight: 1.5,
  },
};
