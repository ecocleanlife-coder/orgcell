/**
 * InviteModal.jsx — §17 초대하기 3단계 모달
 *
 * Step 1: 관계 선택 — 가족 / 친구·지인 / 기타·처음 뵙는 분
 * Step 2: 전송 방법 — 이메일 / 링크복사 / SMS(링크 복사)
 * Step 3: 메시지 편집 + 미리보기 + 전송
 * + 하단 초대 이력 목록 (재초대 / 취소)
 */

import { useState, useEffect } from 'react';
import { toast }               from 'react-hot-toast';

// ── 상수 ──────────────────────────────────────────────────────────────────────
const RELATIONS = [
  {
    key:     'family',
    label:   '가족',
    icon:    '👨‍👩‍👧',
    desc:    '직계·방계 가족 구성원',
    btnText: '내 기록 확인하기',
  },
  {
    key:     'friend',
    label:   '친구·지인',
    icon:    '🤝',
    desc:    '친구, 지인, 동료',
    btnText: '초대 수락하기',
  },
  {
    key:     'other',
    label:   '기타·처음 뵙는 분',
    icon:    '🙋',
    desc:    '그 외 모든 분',
    btnText: '초대 수락하기',
  },
];

const DEFAULT_MSG = {
  family: '안녕하세요, 저희 가족 박물관에 당신의 소중한 기록을 남겨드리고 싶어 초대합니다.',
  friend: '안녕하세요, 저희 가족 박물관을 방문하고 기록을 남겨주시면 감사하겠습니다.',
  other:  '안녕하세요, 처음 뵙겠습니다. 저희 가족 박물관에 초대합니다.',
};

const STATUS_LABEL = {
  pending:   { text: '대기 중', color: '#8B7355' },
  accepted:  { text: '수락됨',  color: '#3a9a3a' },
  declined:  { text: '거절됨',  color: '#c44a3a' },
  expired:   { text: '만료됨',  color: '#aaa'    },
  cancelled: { text: '취소됨',  color: '#aaa'    },
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function InviteModal({ siteId, onClose }) {
  const [step,     setStep]     = useState(1);
  const [relation, setRelation] = useState(null);
  const [method,   setMethod]   = useState('email');
  const [email,    setEmail]    = useState('');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [history,  setHistory]  = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // ── 이력 로드 ────────────────────────────────────────────────────────────
  async function loadHistory() {
    if (!siteId) return;
    setHistLoading(true);
    try {
      const res  = await fetch(`/api/invitations/${siteId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setHistory(data.data || []);
    } catch {
      // 이력 로드 실패는 조용히 무시
    } finally {
      setHistLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, [siteId]);

  // ── 관계 선택 후 기본 메시지 설정 ────────────────────────────────────────
  function selectRelation(key) {
    setRelation(key);
    setMessage(DEFAULT_MSG[key] || '');
    setStep(2);
  }

  // ── 전송 ─────────────────────────────────────────────────────────────────
  async function handleSend() {
    if (method === 'link') {
      const token = await createInvitation({ method: 'link' });
      if (token) {
        const url = `https://orgcell.com/invite/${token}`;
        try { await navigator.clipboard.writeText(url); } catch {}
        toast.success('초대 링크가 클립보드에 복사되었습니다');
        loadHistory();
        setStep(1);
        setRelation(null);
      }
      return;
    }
    if (method === 'email' && !email.trim()) {
      toast.error('이메일 주소를 입력하세요');
      return;
    }
    setSending(true);
    await createInvitation({ method, email: email.trim() });
    setSending(false);
    loadHistory();
    setStep(1);
    setRelation(null);
    setEmail('');
  }

  async function createInvitation({ method: m, email: e }) {
    try {
      const body = { method: m, relation, message, email: e };
      const res  = await fetch(`/api/invitations/${siteId}`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message || '전송 실패'); return null; }
      if (m === 'email') toast.success('초대 이메일을 발송했습니다');
      return data.data?.token;
    } catch {
      toast.error('네트워크 오류');
      return null;
    }
  }

  // ── 취소 ─────────────────────────────────────────────────────────────────
  async function handleCancel(id) {
    try {
      const res  = await fetch(`/api/invitations/${siteId}/${id}`, {
        method: 'DELETE', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) { toast.success('초대를 취소했습니다'); loadHistory(); }
      else toast.error(data.message || '취소 실패');
    } catch { toast.error('네트워크 오류'); }
  }

  // ── 재초대 ─────────────────────────────────────────────────────────────
  async function handleResend(id) {
    try {
      const res  = await fetch(`/api/invitations/${siteId}/${id}/resend`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.success) { toast.success('재초대했습니다'); loadHistory(); }
      else toast.error(data.message || '재초대 실패');
    } catch { toast.error('네트워크 오류'); }
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>

        {/* 헤더 */}
        <div style={s.header}>
          <span style={s.headerTitle}>초대하기</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* 진행 표시기 */}
        <div style={s.stepper}>
          {[1, 2, 3].map(n => (
            <div key={n} style={s.stepItem}>
              <div style={{ ...s.stepDot, ...(step >= n ? s.stepDotActive : {}) }}>{n}</div>
              <span style={{ ...s.stepLabel, ...(step >= n ? s.stepLabelActive : {}) }}>
                {n === 1 ? '관계 선택' : n === 2 ? '전송 방법' : '메시지 발송'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: 관계 선택 */}
        {step === 1 && (
          <div style={s.body}>
            <p style={s.stepGuide}>초대할 분과의 관계를 선택하세요</p>
            <div style={s.relGrid}>
              {RELATIONS.map(r => (
                <button key={r.key} style={s.relCard} onClick={() => selectRelation(r.key)}>
                  <span style={s.relIcon}>{r.icon}</span>
                  <span style={s.relLabel}>{r.label}</span>
                  <span style={s.relDesc}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 전송 방법 */}
        {step === 2 && (
          <div style={s.body}>
            <p style={s.stepGuide}>전송 방법을 선택하세요</p>
            <div style={s.methodTabs}>
              {['email', 'link', 'sms'].map(m => (
                <button
                  key={m}
                  style={{ ...s.methodTab, ...(method === m ? s.methodTabOn : {}) }}
                  onClick={() => setMethod(m)}
                >
                  {m === 'email' ? '📧 이메일' : m === 'link' ? '🔗 링크복사' : '📱 SMS'}
                </button>
              ))}
            </div>

            {method === 'email' && (
              <input
                style={s.input}
                placeholder="이메일 주소"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
              />
            )}
            {method === 'link' && (
              <p style={s.methodNote}>초대 링크를 생성해 클립보드에 복사합니다</p>
            )}
            {method === 'sms' && (
              <p style={s.methodNote}>SMS 발송은 지원되지 않습니다. 링크 복사 후 직접 전송하세요.</p>
            )}

            <div style={s.btnRow}>
              <button style={s.btnSecondary} onClick={() => setStep(1)}>← 이전</button>
              <button style={s.btnPrimary} onClick={() => setStep(3)}>다음 →</button>
            </div>
          </div>
        )}

        {/* Step 3: 메시지 + 전송 */}
        {step === 3 && (
          <div style={s.body}>
            <p style={s.stepGuide}>메시지를 확인하고 전송하세요</p>

            {/* 이메일 미리보기 */}
            <div style={s.preview}>
              <div style={s.previewHeader}>✉ 이메일 미리보기</div>
              <div style={s.previewBody}>
                <strong>초대장</strong>
                <p style={{ fontSize: 13, color: '#6a5040', margin: '6px 0 0', lineHeight: 1.7 }}>{message}</p>
                <div style={s.previewBtn}>
                  {RELATIONS.find(r => r.key === relation)?.btnText ?? '초대 수락하기'} →
                </div>
              </div>
            </div>

            <textarea
              style={s.textarea}
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="메시지를 입력하세요"
            />

            <div style={s.btnRow}>
              <button style={s.btnSecondary} onClick={() => setStep(2)}>← 이전</button>
              <button style={{ ...s.btnPrimary, opacity: sending ? 0.6 : 1 }} onClick={handleSend} disabled={sending}>
                {sending ? '전송 중…' : method === 'link' ? '링크 복사' : '전송하기'}
              </button>
            </div>
          </div>
        )}

        {/* 초대 이력 */}
        <div style={s.histSection}>
          <div style={s.histTitle}>초대 이력</div>
          {histLoading && <p style={s.histEmpty}>불러오는 중…</p>}
          {!histLoading && history.length === 0 && (
            <p style={s.histEmpty}>아직 초대 이력이 없습니다</p>
          )}
          {!histLoading && history.map(inv => {
            const st = STATUS_LABEL[inv.status] || { text: inv.status, color: '#aaa' };
            return (
              <div key={inv.id} style={s.histRow}>
                <div style={s.histLeft}>
                  <span style={s.histTarget}>{inv.email || inv.phone || '링크'}</span>
                  <span style={s.histMeta}>{inv.relation} · {new Date(inv.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <span style={{ ...s.histStatus, color: st.color }}>{st.text}</span>
                {inv.status === 'pending' && (
                  <div style={s.histActions}>
                    <button style={s.histBtn} onClick={() => handleResend(inv.id)}>재초대</button>
                    <button style={{ ...s.histBtn, color: '#c44a3a' }} onClick={() => handleCancel(inv.id)}>취소</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position:       'fixed', inset: 0, zIndex: 1000,
    background:     'rgba(0,0,0,0.45)',
    display:        'flex', alignItems: 'center', justifyContent: 'center',
    padding:        '16px',
  },
  modal: {
    background:     '#FDFBF7',
    border:         '1px solid #C4A882',
    borderRadius:   10,
    width:          520,
    maxWidth:       '100%',
    maxHeight:      '90vh',
    overflowY:      'auto',
    boxShadow:      '0 8px 32px rgba(0,0,0,0.18)',
  },
  header: {
    display:        'flex', alignItems: 'center', justifyContent: 'space-between',
    padding:        '14px 20px',
    borderBottom:   '1px solid #E8DFD0',
  },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#3a2a1a' },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#9a8a75', padding: '2px 6px',
  },

  // 진행 표시기
  stepper: {
    display:     'flex', justifyContent: 'center', gap: 32,
    padding:     '14px 20px', borderBottom: '1px solid #EDE8E0',
  },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepDot: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#E8DFD0', color: '#9a8a75',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
  },
  stepDotActive: { background: '#8B7355', color: '#fff' },
  stepLabel:       { fontSize: 11, color: '#9a8a75' },
  stepLabelActive: { color: '#5a3e1b', fontWeight: 600 },

  // 바디
  body:      { padding: '20px 20px 8px' },
  stepGuide: { fontSize: 13, color: '#5a4a35', margin: '0 0 16px' },

  // 관계 카드
  relGrid: { display: 'flex', gap: 10 },
  relCard: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '16px 10px',
    background: '#FFF9F0', border: '1px solid #D4BFA0', borderRadius: 8,
    cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
  },
  relIcon:  { fontSize: 28 },
  relLabel: { fontSize: 13, fontWeight: 700, color: '#3a2a1a' },
  relDesc:  { fontSize: 11, color: '#9a8070', textAlign: 'center' },

  // 전송 방법
  methodTabs: { display: 'flex', gap: 8, marginBottom: 14 },
  methodTab: {
    flex: 1, padding: '8px 0', background: 'none',
    border: '1px solid #C4A882', borderRadius: 6,
    fontSize: 12, color: '#8B7355', cursor: 'pointer',
  },
  methodTabOn: { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  methodNote: { fontSize: 12, color: '#9a8070', margin: '0 0 14px' },

  input: {
    width: '100%', padding: '9px 12px',
    border: '1px solid #C4A882', borderRadius: 6,
    fontSize: 13, color: '#3a2a1a', background: '#fff',
    boxSizing: 'border-box', marginBottom: 14, outline: 'none',
  },

  // 미리보기
  preview: {
    border: '1px solid #D4BFA0', borderRadius: 8,
    overflow: 'hidden', marginBottom: 14,
  },
  previewHeader: {
    background: '#F0EBE0', padding: '6px 14px',
    fontSize: 11, color: '#8B7355', fontWeight: 600,
  },
  previewBody: { padding: '12px 14px' },
  previewBtn: {
    display: 'inline-block', marginTop: 10,
    background: '#8B7355', color: '#fff',
    padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600,
  },

  textarea: {
    width: '100%', padding: '9px 12px',
    border: '1px solid #C4A882', borderRadius: 6,
    fontSize: 13, color: '#3a2a1a', background: '#fff',
    boxSizing: 'border-box', resize: 'vertical', outline: 'none',
    marginBottom: 14,
  },

  // 버튼 행
  btnRow: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 8 },
  btnPrimary: {
    padding: '9px 22px', background: '#8B7355', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    padding: '9px 18px', background: 'transparent', color: '#8B7355',
    border: '1px solid #C4A882', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },

  // 이력
  histSection: {
    borderTop: '1px solid #EDE8E0',
    padding: '14px 20px 20px',
  },
  histTitle:  { fontSize: 12, fontWeight: 700, color: '#9a8070', marginBottom: 10 },
  histEmpty:  { fontSize: 12, color: '#B09060', margin: 0 },
  histRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 0', borderBottom: '1px solid #F0EBE0',
  },
  histLeft: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  histTarget: { fontSize: 13, color: '#3a2a1a' },
  histMeta:   { fontSize: 11, color: '#9a8070' },
  histStatus: { fontSize: 12, fontWeight: 600, flexShrink: 0 },
  histActions: { display: 'flex', gap: 6 },
  histBtn: {
    background: 'none', border: 'none',
    fontSize: 11, color: '#8B7355', cursor: 'pointer',
    padding: '2px 6px', textDecoration: 'underline',
  },
};
