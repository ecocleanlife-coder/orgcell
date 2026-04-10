/**
 * AccessDeniedModal.jsx — §14 접근 권한 없음 모달
 *
 * §14: "외부인 클릭 → AccessDeniedModal → 관장에게 요청"
 *
 * Props:
 *   isOpen      — boolean
 *   onClose     — () => void
 *   museumName  — 박물관 이름 (표시용)
 *   siteId      — 숫자 (접근 요청 API용)
 *   personId    — 문자열 (접근 요청 API용, 선택)
 */

import { useState } from 'react';

export default function AccessDeniedModal({ isOpen, onClose, museumName, siteId, personId }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'

  if (!isOpen) return null;

  async function handleRequest() {
    if (!siteId) return;
    setStatus('sending');
    try {
      const url = personId
        ? `/api/access/${siteId}/${personId}/request`
        : `/api/access/${siteId}/request`;
      const res = await fetch(url, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('request failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  function handleClose() {
    setStatus('idle');
    onClose();
  }

  return (
    <>
      {/* 오버레이 */}
      <div style={s.overlay} onClick={handleClose} />

      {/* 모달 패널 */}
      <div style={s.panel} role="dialog" aria-modal="true">

        {/* 아이콘 */}
        <div style={s.iconWrap}>
          <span style={s.icon}>🔒</span>
        </div>

        {/* 제목 */}
        <h2 style={s.title}>접근 권한이 없습니다</h2>

        {/* 설명 */}
        <p style={s.desc}>
          {museumName
            ? <><strong style={s.accent}>{museumName}</strong>은 비공개 박물관입니다.<br /></>
            : null
          }
          입장권이 있어야 내부를 열람할 수 있습니다.
        </p>

        {/* 상태별 본문 */}
        {status === 'sent' ? (
          <div style={s.successBox}>
            <span style={s.successIcon}>✓</span>
            관장에게 입장권 요청을 보냈습니다.
            <br />
            <span style={s.successSub}>관장이 승인하면 입장권이 자동으로 발급됩니다.</span>
          </div>
        ) : status === 'error' ? (
          <div style={s.errorBox}>
            요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : null}

        {/* 버튼 영역 */}
        <div style={s.btnRow}>
          {status !== 'sent' && (
            <button
              style={{ ...s.btn, ...s.btnPrimary, opacity: status === 'sending' ? 0.6 : 1 }}
              onClick={handleRequest}
              disabled={status === 'sending' || !siteId}
            >
              {status === 'sending' ? '요청 중…' : '관장에게 입장권 요청하기'}
            </button>
          )}
          <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleClose}>
            {status === 'sent' ? '닫기' : '취소'}
          </button>
        </div>

      </div>
    </>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position:   'fixed',
    inset:       0,
    background: 'rgba(40,30,20,0.55)',
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
    borderRadius:    8,
    boxShadow:      '0 8px 32px rgba(0,0,0,0.18)',
    padding:        '36px 40px 28px',
    width:           380,
    maxWidth:       'calc(100vw - 32px)',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    textAlign:      'center',
  },
  iconWrap: {
    width:          60,
    height:         60,
    borderRadius:   '50%',
    background:     '#F5EDD8',
    border:         '1.5px solid #C4A882',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  icon: {
    fontSize: 26,
  },
  title: {
    fontSize:   18,
    fontWeight: 700,
    color:      '#3a2a1a',
    margin:     '0 0 10px',
  },
  desc: {
    fontSize:   13,
    color:      '#6a5a45',
    lineHeight: 1.65,
    margin:     '0 0 18px',
  },
  accent: {
    color:      '#7a5a35',
    fontWeight: 600,
  },
  successBox: {
    background:   '#F0F9F0',
    border:       '1px solid #8BC48A',
    borderRadius:  6,
    padding:      '12px 16px',
    fontSize:      13,
    color:        '#2d6b2d',
    lineHeight:   1.6,
    marginBottom: 16,
    width:        '100%',
    boxSizing:    'border-box',
  },
  successIcon: {
    marginRight: 6,
    fontWeight:  700,
  },
  successSub: {
    fontSize: 11,
    color:    '#4a8a4a',
  },
  errorBox: {
    background:   '#FFF0F0',
    border:       '1px solid #E4A0A0',
    borderRadius:  6,
    padding:      '10px 14px',
    fontSize:      12,
    color:        '#8B2020',
    marginBottom: 16,
    width:        '100%',
    boxSizing:    'border-box',
  },
  btnRow: {
    display:        'flex',
    flexDirection:  'column',
    gap:             10,
    width:          '100%',
  },
  btn: {
    width:         '100%',
    padding:       '11px 0',
    borderRadius:   6,
    fontSize:       13,
    fontWeight:     600,
    cursor:         'pointer',
    border:         'none',
    transition:     'opacity 0.15s',
  },
  btnPrimary: {
    background: '#8B7355',
    color:      '#fff',
  },
  btnSecondary: {
    background: 'transparent',
    color:      '#8B7355',
    border:     '1px solid #C4A882',
  },
};
