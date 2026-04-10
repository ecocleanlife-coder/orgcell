/**
 * InviteModal.jsx — §17 초대 모달
 *
 * §17 규칙:
 *   - 이메일 / SMS / 링크 복사
 *   - 수락/거절 → 노출 선택 (이름 전체 / 성만 / 익명) — InvitePage에서 처리
 *   - 거절자 → RefusedPersonBox — InvitePage에서 처리
 *
 * Props:
 *   isOpen     — boolean
 *   onClose    — () => void
 *   siteId     — number
 *   subdomain  — string
 *   museumName — string
 *
 * API:
 *   POST /api/invite/send-email  { siteId, email }
 *   POST /api/invite/send-sms    { siteId, phone }
 *   POST /api/invite/create      { siteId }  → { token }
 */

import { useState, useEffect } from 'react';

// ── 전송 방법 탭 ──────────────────────────────────────────────────────────────
const METHOD = { EMAIL: 'email', SMS: 'sms', LINK: 'link' };

// ══════════════════════════════════════════════════════════════════════════════
export default function InviteModal({ isOpen, onClose, siteId, subdomain, museumName }) {
  const [method,  setMethod]  = useState(METHOD.EMAIL);
  const [status,  setStatus]  = useState('idle'); // idle | sending | done | error
  const [errMsg,  setErrMsg]  = useState('');

  // 탭 전환 시 상태 초기화
  useEffect(() => { setStatus('idle'); setErrMsg(''); }, [method]);
  // 닫을 때 초기화
  useEffect(() => { if (!isOpen) { setMethod(METHOD.EMAIL); setStatus('idle'); setErrMsg(''); } }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.panel} role="dialog" aria-modal="true">

        {/* 헤더 */}
        <div style={s.header}>
          <span style={s.headerIcon}>✉️</span>
          <h2 style={s.title}>가족 초대하기</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {museumName && (
          <p style={s.museumLabel}>
            <strong style={s.accent}>{museumName}</strong>에 초대합니다.
          </p>
        )}

        {/* 방법 탭 */}
        <div style={s.tabRow}>
          <TabBtn active={method === METHOD.EMAIL} onClick={() => setMethod(METHOD.EMAIL)}>📧 이메일</TabBtn>
          <TabBtn active={method === METHOD.SMS}   onClick={() => setMethod(METHOD.SMS)}>💬 SMS</TabBtn>
          <TabBtn active={method === METHOD.LINK}  onClick={() => setMethod(METHOD.LINK)}>🔗 링크 복사</TabBtn>
        </div>

        {/* 탭 콘텐츠 */}
        <div style={s.body}>
          {method === METHOD.EMAIL && (
            <EmailTab
              siteId={siteId}
              status={status} setStatus={setStatus}
              errMsg={errMsg} setErrMsg={setErrMsg}
            />
          )}
          {method === METHOD.SMS && (
            <SmsTab
              siteId={siteId}
              status={status} setStatus={setStatus}
              errMsg={errMsg} setErrMsg={setErrMsg}
            />
          )}
          {method === METHOD.LINK && (
            <LinkTab
              siteId={siteId}
              subdomain={subdomain}
              status={status} setStatus={setStatus}
              errMsg={errMsg} setErrMsg={setErrMsg}
            />
          )}
        </div>

        {/* 안내 */}
        <p style={s.footNote}>
          초대받은 분은 수락 시 노출 이름(전체/성만/익명)을 선택합니다.
        </p>

      </div>
    </>
  );
}

// ── 탭 버튼 ─────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button style={{ ...s.tabBtn, ...(active ? s.tabBtnActive : {}) }} onClick={onClick}>
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 이메일 탭
// ══════════════════════════════════════════════════════════════════════════════
function EmailTab({ siteId, status, setStatus, errMsg, setErrMsg }) {
  const [email, setEmail] = useState('');
  const [sent,  setSent]  = useState([]);

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) { setErrMsg('올바른 이메일을 입력하세요.'); return; }
    setStatus('sending'); setErrMsg('');
    try {
      const res = await fetch('/api/invite/send-email', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ siteId, email: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(prev => [...prev, trimmed]);
      setEmail('');
      setStatus('idle');
    } catch (err) {
      setErrMsg('발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setStatus('idle');
    }
  }

  return (
    <div style={s.tabBody}>
      <p style={s.desc}>초대 이메일을 발송합니다. 이메일 주소를 입력하세요.</p>

      <div style={s.inputRow}>
        <input
          style={s.input}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="family@email.com"
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          style={{ ...s.sendBtn, opacity: status === 'sending' ? 0.6 : 1 }}
          onClick={handleSend}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? '…' : '발송'}
        </button>
      </div>

      {errMsg && <div style={s.errorBox}>{errMsg}</div>}

      {/* 발송 완료 목록 */}
      {sent.length > 0 && (
        <div style={s.sentList}>
          <div style={s.sentHeader}>✓ 발송 완료</div>
          {sent.map((addr, i) => (
            <div key={i} style={s.sentItem}>{addr}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SMS 탭
// ══════════════════════════════════════════════════════════════════════════════
function SmsTab({ siteId, status, setStatus, errMsg, setErrMsg }) {
  const [phone, setPhone] = useState('');
  const [sent,  setSent]  = useState([]);

  function normalizePhone(v) {
    // 숫자만
    return v.replace(/[^0-9]/g, '');
  }

  async function handleSend() {
    const trimmed = phone.trim();
    if (trimmed.length < 10) { setErrMsg('올바른 전화번호를 입력하세요.'); return; }
    setStatus('sending'); setErrMsg('');
    try {
      const res = await fetch('/api/invite/send-sms', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ siteId, phone: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(prev => [...prev, trimmed]);
      setPhone('');
      setStatus('idle');
    } catch {
      setErrMsg('발송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setStatus('idle');
    }
  }

  return (
    <div style={s.tabBody}>
      <p style={s.desc}>문자 메시지로 초대 링크를 발송합니다.</p>

      <div style={s.inputRow}>
        <input
          style={s.input}
          type="tel"
          value={phone}
          onChange={e => setPhone(normalizePhone(e.target.value))}
          placeholder="01012345678"
          maxLength={11}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button
          style={{ ...s.sendBtn, opacity: status === 'sending' ? 0.6 : 1 }}
          onClick={handleSend}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? '…' : '발송'}
        </button>
      </div>

      {errMsg && <div style={s.errorBox}>{errMsg}</div>}

      {sent.length > 0 && (
        <div style={s.sentList}>
          <div style={s.sentHeader}>✓ 발송 완료</div>
          {sent.map((p, i) => <div key={i} style={s.sentItem}>{p}</div>)}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 링크 복사 탭
// ══════════════════════════════════════════════════════════════════════════════
function LinkTab({ siteId, subdomain, status, setStatus, errMsg, setErrMsg }) {
  const [link,    setLink]    = useState('');
  const [copied,  setCopied]  = useState(false);
  const [expires, setExpires] = useState('7'); // days

  async function handleGenerate() {
    setStatus('sending'); setErrMsg(''); setCopied(false);
    try {
      const res = await fetch('/api/invite/create', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ siteId, days: Number(expires) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url  = `${window.location.origin}/invite/${data.token}`;
      setLink(url);
      setStatus('idle');
    } catch {
      setErrMsg('링크 생성 중 오류가 발생했습니다.');
      setStatus('idle');
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 차단된 경우 fallback
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function shareKakao() {
    if (!link) return;
    if (window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '가족유산박물관 초대',
          description: '박물관에 가족으로 등록되어 있습니다. 초대를 수락해 주세요.',
          link: { mobileWebUrl: link, webUrl: link },
        },
      });
    } else {
      handleCopy();
      alert('카카오 SDK 미연결 — 링크가 복사되었습니다.');
    }
  }

  return (
    <div style={s.tabBody}>
      <p style={s.desc}>초대 링크를 생성하여 카카오톡, SNS 등으로 공유하세요.</p>

      {/* 만료기간 선택 */}
      <label style={s.fieldLabel}>링크 유효기간</label>
      <select style={s.select} value={expires} onChange={e => setExpires(e.target.value)}>
        <option value="1">1일</option>
        <option value="3">3일</option>
        <option value="7">7일</option>
        <option value="30">30일</option>
      </select>

      {!link ? (
        <button
          style={{ ...s.btn, ...s.btnPrimary, opacity: status === 'sending' ? 0.6 : 1 }}
          onClick={handleGenerate}
          disabled={status === 'sending'}
        >
          {status === 'sending' ? '생성 중…' : '초대 링크 생성'}
        </button>
      ) : (
        <>
          {/* 링크 표시 */}
          <div style={s.linkBox}>
            <span style={s.linkText}>{link}</span>
          </div>

          {/* 공유 버튼 */}
          <div style={s.shareRow}>
            <button style={{ ...s.shareBtn, background: copied ? '#E8F5E8' : '#FAF7F2' }} onClick={handleCopy}>
              <span style={{ fontSize: 18 }}>{copied ? '✓' : '📋'}</span>
              <span style={{ fontSize: 11 }}>{copied ? '복사됨' : '링크 복사'}</span>
            </button>
            <button style={s.shareBtn} onClick={shareKakao}>
              <span style={{ fontSize: 18 }}>💬</span>
              <span style={{ fontSize: 11 }}>카카오 공유</span>
            </button>
            <button
              style={{ ...s.shareBtn }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: '가족 박물관 초대', url: link });
                } else handleCopy();
              }}
            >
              <span style={{ fontSize: 18 }}>↗</span>
              <span style={{ fontSize: 11 }}>SNS 공유</span>
            </button>
          </div>

          {/* 재생성 */}
          <button
            style={{ ...s.btn, ...s.btnSecondary, marginTop: 8 }}
            onClick={() => { setLink(''); setCopied(false); }}
          >
            새 링크 생성
          </button>
        </>
      )}

      {errMsg && <div style={s.errorBox}>{errMsg}</div>}
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(40,30,20,0.5)', zIndex: 900, cursor: 'pointer',
  },
  panel: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    zIndex: 901,
    background: '#FDFBF7',
    border: '1px solid #C4A882',
    borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50',
    boxShadow: '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
    borderRadius: 10,
    width: 420, maxWidth: 'calc(100vw - 32px)',
    maxHeight: '85vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 24px 10px', borderBottom: '1px solid #E8DFD0', flexShrink: 0,
  },
  headerIcon: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: 700, color: '#3a2a1a', margin: 0, flex: 1 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#9a8a75', padding: '2px 4px',
  },
  museumLabel: {
    fontSize: 12, color: '#6a5a45', margin: '8px 24px 0',
    textAlign: 'center', lineHeight: 1.5, flexShrink: 0,
  },
  accent: { color: '#7a5a35', fontWeight: 700 },

  // ── 탭 ────────────────────────────────────────────────────────────────────
  tabRow: {
    display: 'flex', borderBottom: '1px solid #E8DFD0',
    padding: '0 24px', flexShrink: 0,
  },
  tabBtn: {
    flex: 1, padding: '10px 0', background: 'none', border: 'none',
    fontSize: 12, fontWeight: 600, color: '#9a8a75', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: { color: '#8B7355', borderBottomColor: '#8B7355' },

  // ── 탭 바디 ───────────────────────────────────────────────────────────────
  body:    { flex: 1, overflowY: 'auto' },
  tabBody: {
    padding: '16px 24px 16px',
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  desc: { fontSize: 12, color: '#7a6a55', lineHeight: 1.7, margin: '0 0 12px' },

  // ── 입력 ──────────────────────────────────────────────────────────────────
  inputRow: { display: 'flex', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, padding: '9px 12px', border: '1px solid #C4A882',
    borderRadius: 5, fontSize: 13, background: '#FDFBF7',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  },
  sendBtn: {
    padding: '9px 16px', background: '#8B7355', color: '#fff',
    border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', flexShrink: 0,
  },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#5a4a35', marginBottom: 4 },
  select: {
    width: '100%', padding: '9px 12px', border: '1px solid #C4A882',
    borderRadius: 5, fontSize: 13, background: '#FDFBF7',
    boxSizing: 'border-box', marginBottom: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#FFF0F0', border: '1px solid #E4A0A0', borderRadius: 5,
    padding: '8px 12px', fontSize: 12, color: '#8B2020', marginTop: 4,
  },

  // ── 발송 완료 목록 ─────────────────────────────────────────────────────────
  sentList: {
    background: '#F0F9F0', border: '1px solid #8BC48A', borderRadius: 5,
    padding: '10px 12px', marginTop: 8,
  },
  sentHeader: { fontSize: 11, fontWeight: 700, color: '#2d6b2d', marginBottom: 6 },
  sentItem:   { fontSize: 12, color: '#3a6a3a', padding: '2px 0' },

  // ── 링크 복사 ─────────────────────────────────────────────────────────────
  linkBox: {
    background: '#FAF7F2', border: '1px solid #C4A882', borderRadius: 5,
    padding: '10px 12px', marginBottom: 10, wordBreak: 'break-all',
  },
  linkText: { fontSize: 11, color: '#5a4a35', fontFamily: 'monospace' },
  shareRow: { display: 'flex', gap: 8, marginBottom: 6 },
  shareBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 0', border: '1px solid #C4A882', borderRadius: 6,
    background: '#FAF7F2', cursor: 'pointer', transition: 'background 0.15s',
  },

  // ── 공통 버튼 ─────────────────────────────────────────────────────────────
  btn: {
    padding: '11px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', width: '100%', boxSizing: 'border-box',
  },
  btnPrimary:   { background: '#8B7355', color: '#fff' },
  btnSecondary: { background: 'transparent', color: '#8B7355', border: '1px solid #C4A882' },

  // ── 하단 안내 ─────────────────────────────────────────────────────────────
  footNote: {
    fontSize: 11, color: '#9a8a75', textAlign: 'center',
    margin: '0', padding: '10px 24px 16px', flexShrink: 0,
    borderTop: '1px solid #E8DFD0',
  },
};
