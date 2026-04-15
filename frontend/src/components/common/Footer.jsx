/**
 * Footer.jsx — §20 저작권 경고 + 이용약관
 *
 * §20 규칙:
 *   - 모든 콘텐츠 무단 복제/배포 금지
 *   - footer 경고 상시 표시
 *   - 이용약관 포함
 *
 * 사용:
 *   - MuseumPage, ExhibitionPage, ArchivePage 등 모든 페이지 하단에 마운트
 *   - variant="minimal" → 1줄 압축형 (전시관 등 전체화면)
 *   - variant="full"    → 2단 전체형 (기본값)
 */

import { useState } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
export default function Footer({ variant = 'full' }) {
  const [termsOpen, setTermsOpen] = useState(false);
  const year = new Date().getFullYear();

  if (variant === 'minimal') {
    return (
      <footer style={s.minimal}>
        <span style={s.minimalText}>
          © {year} 가족유산박물관 — 모든 콘텐츠 무단 복제·배포 금지 (§20)
        </span>
        <button style={s.minimalLink} onClick={() => setTermsOpen(true)}>이용약관</button>
        {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
      </footer>
    );
  }

  return (
    <footer style={s.footer}>

      {/* §20 저작권 경고 배너 */}
      <div style={s.warningBanner}>
        <span style={s.warningIcon}>⚠️</span>
        <span style={s.warningText}>
          이 박물관의 모든 콘텐츠(사진, 문서, 음성, 영상 등)는 저작권법의 보호를 받습니다.
          무단 복제·배포·전송을 금지합니다.
        </span>
      </div>

      {/* 하단 정보 */}
      <div style={s.bottomRow}>
        <div style={s.leftCol}>
          <span style={s.logo}>🏛️ 가족유산박물관</span>
          <span style={s.copy}>© {year} Orgcell. All rights reserved.</span>
        </div>

        <div style={s.links}>
          <button style={s.linkBtn} onClick={() => setTermsOpen(true)}>이용약관</button>
          <span style={s.sep}>·</span>
          <button style={s.linkBtn} onClick={() => setTermsOpen(true)}>개인정보처리방침</button>
          <span style={s.sep}>·</span>
          <a href="mailto:support@orgcell.com" style={s.linkA}>문의하기</a>
        </div>
      </div>

      {/* 이용약관 모달 */}
      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 이용약관 모달 (§20)
// ══════════════════════════════════════════════════════════════════════════════
function TermsModal({ onClose }) {
  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.modal} role="dialog" aria-modal="true" aria-label="이용약관">

        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>이용약관 및 저작권 정책</h2>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.modalBody}>

          <Section title="제1조 (목적)">
            본 약관은 가족유산박물관(이하 "서비스")의 이용 조건과 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정합니다.
          </Section>

          <Section title="제2조 (저작권 — §20)">
            서비스에 등록된 모든 콘텐츠(사진, 문서, 약력, 자서전, 음성·영상 녹음, 작품 등)의 저작권은 해당 콘텐츠를 등록한 관장 및 가족 구성원에게 있습니다.
            <br /><br />
            <strong>무단 복제·배포·전송·전시는 엄격히 금지됩니다.</strong> 위반 시 저작권법 및 관련 법령에 따라 민·형사상 책임을 질 수 있습니다.
          </Section>

          <Section title="제3조 (서비스 이용)">
            <ul style={s.termsList}>
              <li>박물관 입장은 관장이 발급한 입장권(Legacy Pass 또는 Visitor Pass)이 필요합니다.</li>
              <li>공유앨범은 링크를 보유한 경우 로그인 없이 접근할 수 있습니다.</li>
              <li>초대를 거절한 경우 해당 박물관의 가족 트리에 표시되지 않습니다.</li>
              <li>서비스는 가족 유산 보존 목적으로만 이용해야 하며, 상업적 이용을 금지합니다.</li>
            </ul>
          </Section>

          <Section title="제4조 (개인정보 처리)">
            수집하는 개인정보: 이름, 이메일, 생년월일, 사진 등 가족 유산 기록에 필요한 정보.
            <br />
            수집 목적: 가족 박물관 서비스 제공, 입장권 발급, 초대 시스템 운영.
            <br />
            보관 기간: 서비스 탈퇴 시까지, 법령에 따른 의무 보관 기간 준수.
          </Section>

          <Section title="제5조 (BYOS 원칙)">
            서비스는 BYOS(Bring Your Own Storage) 원칙을 채택합니다. 서버에 일시적으로 업로드된 파일은 처리 후 즉시 삭제되며, 원본은 사용자의 지정 저장소에 보관됩니다.
          </Section>

          <Section title="제6조 (면책)">
            서비스는 사용자가 등록한 콘텐츠의 정확성, 합법성에 대해 책임지지 않습니다. 타인의 저작물을 무단으로 등록한 경우 그 책임은 등록자에게 있습니다.
          </Section>

          <Section title="부칙">
            본 약관은 서비스 시행일부터 적용됩니다. 약관 변경 시 공지사항을 통해 안내합니다.
          </Section>

        </div>

        <div style={s.modalFooter}>
          <button style={s.confirmBtn} onClick={onClose}>확인</button>
        </div>

      </div>
    </>
  );
}

// ── 약관 섹션 ──────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={s.termSection}>
      <h3 style={s.termSectionTitle}>{title}</h3>
      <p style={s.termSectionBody}>{children}</p>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  // ── full 버전 ─────────────────────────────────────────────────────────────
  footer: {
    background:   '#2A2018',
    borderTop:    '1px solid #3a3028',
    marginTop:    'auto',
    flexShrink:    0,
  },
  warningBanner: {
    display:     'flex',
    alignItems:  'center',
    gap:          10,
    padding:     '10px 24px',
    background:  'rgba(196,168,130,0.08)',
    borderBottom:'1px solid rgba(196,168,130,0.15)',
  },
  warningIcon: { fontSize: 22, flexShrink: 0 },
  warningText: {
    fontSize:   22,
    color:      '#C4A882',
    lineHeight: 1.5,
    opacity:    0.85,
  },
  bottomRow: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 24px',
    flexWrap:       'wrap',
    gap:             8,
  },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 3 },
  logo:    { fontSize: 22, fontWeight: 700, color: '#C4A882' },
  copy:    { fontSize: 22, color: '#7a6a55' },
  links:   { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  linkBtn: {
    background:  'none',
    border:      'none',
    color:       '#9a8a75',
    fontSize:    22,
    cursor:      'pointer',
    padding:      0,
    textDecoration:'underline',
  },
  linkA: { color: '#9a8a75', fontSize: 22, textDecoration: 'underline' },
  sep:   { color: '#5a4a35', fontSize: 22 },

  // ── minimal 버전 ──────────────────────────────────────────────────────────
  minimal: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             8,
    padding:        '6px 24px',
    background:     'rgba(42,32,24,0.85)',
    borderTop:      '1px solid rgba(196,168,130,0.2)',
    flexShrink:      0,
  },
  minimalText: { fontSize: 22, color: '#9a8a75' },
  minimalLink: {
    background:    'none',
    border:        'none',
    color:         '#C4A882',
    fontSize:      22,
    cursor:        'pointer',
    textDecoration:'underline',
    padding:        0,
  },

  // ── 이용약관 모달 ─────────────────────────────────────────────────────────
  overlay: {
    position:   'fixed',
    inset:       0,
    background: 'rgba(40,30,20,0.55)',
    zIndex:      900,
    cursor:      'pointer',
  },
  modal: {
    position:      'fixed',
    top:           '50%',
    left:          '50%',
    transform:     'translate(-50%,-50%)',
    zIndex:         901,
    background:    '#FDFBF7',
    border:        '1px solid #C4A882',
    borderRight:   '2px solid #b09060',
    borderBottom:  '2px solid #9a7a50',
    boxShadow:     '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
    borderRadius:   10,
    width:          560,
    maxWidth:      'calc(100vw - 32px)',
    maxHeight:     '80vh',
    display:       'flex',
    flexDirection: 'column',
    overflow:      'hidden',
  },
  modalHeader: {
    display:     'flex',
    alignItems:  'center',
    padding:     '16px 24px 12px',
    borderBottom:'1px solid #E8DFD0',
    flexShrink:   0,
  },
  modalTitle: { fontSize: 22, fontWeight: 700, color: '#3a2a1a', margin: 0, flex: 1 },
  modalClose: {
    background: 'none', border: 'none',
    fontSize: 22, color: '#9a8a75', cursor: 'pointer', padding: '2px 4px',
  },
  modalBody: {
    flex:      1,
    overflowY: 'auto',
    padding:   '16px 24px',
    display:   'flex',
    flexDirection: 'column',
    gap:        12,
  },
  modalFooter: {
    padding:     '12px 24px',
    borderTop:   '1px solid #E8DFD0',
    flexShrink:   0,
  },
  confirmBtn: {
    width:        '100%',
    padding:      '10px 0',
    background:   '#8B7355',
    color:        '#fff',
    border:       'none',
    borderRadius:  6,
    fontSize:      22,
    fontWeight:    700,
    cursor:        'pointer',
  },

  // ── 약관 섹션 ─────────────────────────────────────────────────────────────
  termSection: {
    borderBottom: '1px solid #F0EAE0',
    paddingBottom: 10,
  },
  termSectionTitle: {
    fontSize:   22,
    fontWeight: 700,
    color:      '#5a4a35',
    margin:     '0 0 6px',
  },
  termSectionBody: {
    fontSize:   22,
    color:      '#6a5a45',
    lineHeight: 1.7,
    margin:      0,
  },
  termsList: {
    margin:     '4px 0 0',
    paddingLeft: 16,
    fontSize:   22,
    color:      '#6a5a45',
    lineHeight: 1.8,
  },
};
