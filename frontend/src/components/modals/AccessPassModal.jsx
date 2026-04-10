/**
 * AccessPassModal.jsx — §16/§26-5 입장권 발급/관리 모달
 *
 * §26-5 규칙:
 *   - Legacy Pass: Linked 시 자동 발급, 평생 유효, 복제 불가
 *   - Visitor Pass: 유효기간 설정, QR코드, 관장이 무효화 가능
 *   - 미입장자: 문패만 노출, [입장권 요청하기] 버튼
 *   - 초대카드: QR코드 포함, 카카오/문자/SNS 전송
 *
 * Props:
 *   isOpen      — boolean
 *   onClose     — () => void
 *   isCurator   — boolean (관장 모드 / 방문자 모드 분기)
 *   siteId      — number
 *   subdomain   — string
 *   museumName  — string
 *
 * API:
 *   [관장] GET  /api/access/:siteId/passes           → 발급된 입장권 목록
 *   [관장] POST /api/access/passes/issue             → Visitor Pass 발급
 *   [관장] PUT  /api/access/passes/:passId/revoke    → 무효화
 *   [방문] GET  /api/access/:siteId/my-pass          → 내 입장권 조회
 */

import { useState, useEffect, useCallback } from 'react';

// ── 유효기간 옵션 ─────────────────────────────────────────────────────────────
const EXPIRY_OPTIONS = [
  { value: '7',   label: '7일' },
  { value: '30',  label: '30일' },
  { value: '90',  label: '90일' },
  { value: '180', label: '6개월' },
  { value: '365', label: '1년' },
  { value: '0',   label: '무기한' },
];

// ── 탭 ───────────────────────────────────────────────────────────────────────
const TAB = { ISSUE: 'issue', MANAGE: 'manage' };

// ══════════════════════════════════════════════════════════════════════════════
export default function AccessPassModal({ isOpen, onClose, isCurator, siteId, subdomain, museumName }) {
  const [tab, setTab] = useState(TAB.ISSUE);

  if (!isOpen) return null;

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.panel} role="dialog" aria-modal="true">

        {/* 헤더 */}
        <div style={s.header}>
          <span style={s.headerIcon}>🎫</span>
          <h2 style={s.title}>입장권 {isCurator ? '발급·관리' : '확인'}</h2>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {museumName && <p style={s.museumLabel}>{museumName}</p>}

        {/* 관장 탭 / 방문자 단일 뷰 */}
        {isCurator ? (
          <>
            <div style={s.tabRow}>
              <TabBtn active={tab === TAB.ISSUE}  onClick={() => setTab(TAB.ISSUE)}>발급하기</TabBtn>
              <TabBtn active={tab === TAB.MANAGE} onClick={() => setTab(TAB.MANAGE)}>발급 목록</TabBtn>
            </div>
            {tab === TAB.ISSUE  && <IssueTab  siteId={siteId} subdomain={subdomain} />}
            {tab === TAB.MANAGE && <ManageTab siteId={siteId} />}
          </>
        ) : (
          <MyPassView siteId={siteId} subdomain={subdomain} />
        )}

      </div>
    </>
  );
}

// ── 탭 버튼 ─────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button
      style={{ ...s.tabBtn, ...(active ? s.tabBtnActive : {}) }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// [관장] Visitor Pass 발급
// ══════════════════════════════════════════════════════════════════════════════
function IssueTab({ siteId, subdomain }) {
  const [email,   setEmail]   = useState('');
  const [days,    setDays]    = useState('30');
  const [note,    setNote]    = useState('');
  const [status,  setStatus]  = useState('idle'); // idle | sending | done | error
  const [result,  setResult]  = useState(null);   // { passId, qrUrl, expiresAt }

  async function handleIssue() {
    if (!email.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/access/passes/issue', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ siteId, email: email.trim(), days: Number(days), note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  function handleReset() {
    setEmail(''); setDays('30'); setNote('');
    setStatus('idle'); setResult(null);
  }

  if (status === 'done' && result) {
    return (
      <div style={s.doneWrap}>
        <div style={s.successBadge}>✓ 입장권 발급 완료</div>
        <div style={s.passCard}>
          <div style={s.passRow}><span style={s.passKey}>수신자</span><span>{email}</span></div>
          <div style={s.passRow}>
            <span style={s.passKey}>유효기간</span>
            <span>{days === '0' ? '무기한' : `${result.expiresAt ?? `${days}일 후`}`}</span>
          </div>
          <div style={s.passRow}><span style={s.passKey}>종류</span><span>Visitor Pass</span></div>
        </div>

        {/* QR코드 (백엔드가 URL 제공 시 표시) */}
        {result.qrUrl && (
          <div style={s.qrWrap}>
            <img src={result.qrUrl} alt="QR코드" style={s.qrImg} />
            <p style={s.qrHint}>이 QR코드를 초대카드에 포함하거나 공유하세요.</p>
          </div>
        )}

        {/* 공유 버튼 */}
        <div style={s.shareRow}>
          <ShareBtn icon="📋" label="링크 복사" onClick={() => copyInviteLink(subdomain, result.passId)} />
          <ShareBtn icon="💬" label="카카오 공유" onClick={() => shareKakao(subdomain, result.passId)} />
        </div>

        <button style={{ ...s.btn, ...s.btnSecondary, marginTop: 10 }} onClick={handleReset}>
          추가 발급하기
        </button>
      </div>
    );
  }

  return (
    <div style={s.tabBody}>
      <p style={s.sectionDesc}>
        방문자에게 <strong>Visitor Pass</strong>를 발급합니다.<br />
        가족(Linked)은 자동으로 Legacy Pass가 발급됩니다.
      </p>

      <label style={s.fieldLabel}>수신자 이메일</label>
      <input
        style={s.input}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="visitor@email.com"
      />

      <label style={s.fieldLabel}>유효기간</label>
      <select style={s.select} value={days} onChange={e => setDays(e.target.value)}>
        {EXPIRY_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <label style={s.fieldLabel}>메모 (선택)</label>
      <input
        style={s.input}
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="예: 친구 홍길동"
        maxLength={50}
      />

      {status === 'error' && (
        <div style={s.errorBox}>발급 중 오류가 발생했습니다. 다시 시도해 주세요.</div>
      )}

      <button
        style={{ ...s.btn, ...s.btnPrimary, marginTop: 14, opacity: status === 'sending' ? 0.6 : 1 }}
        onClick={handleIssue}
        disabled={status === 'sending' || !email.trim()}
      >
        {status === 'sending' ? '발급 중…' : '입장권 발급'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// [관장] 발급 목록 + 무효화
// ══════════════════════════════════════════════════════════════════════════════
function ManageTab({ siteId }) {
  const [passes,  setPasses]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/access/${siteId}/passes`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPasses(Array.isArray(data) ? data : (data.passes ?? []));
    } catch {
      setError('목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(passId) {
    if (!window.confirm('이 입장권을 무효화하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/access/passes/${passId}/revoke`, {
        method: 'PUT', credentials: 'include',
      });
      if (!res.ok) throw new Error();
      setPasses(prev => prev.filter(p => p.id !== passId));
    } catch {
      alert('무효화 중 오류가 발생했습니다.');
    }
  }

  if (loading) return <div style={s.tabBody}><p style={s.sectionDesc}>불러오는 중…</p></div>;
  if (error)   return <div style={s.tabBody}><p style={s.errorBox}>{error}</p></div>;

  return (
    <div style={s.tabBody}>
      {passes.length === 0 ? (
        <p style={s.emptyMsg}>발급된 입장권이 없습니다.</p>
      ) : (
        <div style={s.passList}>
          {passes.map(pass => (
            <PassRow key={pass.id} pass={pass} onRevoke={handleRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}

function PassRow({ pass, onRevoke }) {
  const isLegacy  = pass.type === 'legacy';
  const isExpired = pass.expiresAt && new Date(pass.expiresAt) < new Date();

  return (
    <div style={{ ...s.passRowItem, opacity: isExpired ? 0.5 : 1 }}>
      <div style={s.passRowLeft}>
        <span style={{ ...s.passBadge, background: isLegacy ? '#E8F5E8' : '#EEF3FF', color: isLegacy ? '#2d6b2d' : '#3a5a9a' }}>
          {isLegacy ? 'Legacy' : 'Visitor'}
        </span>
        <div>
          <div style={s.passName}>{pass.holderName ?? pass.holderEmail ?? '—'}</div>
          <div style={s.passExpiry}>
            {isLegacy ? '평생 유효' : pass.expiresAt
              ? (isExpired ? '만료됨' : `~${new Date(pass.expiresAt).toLocaleDateString('ko-KR')}`)
              : '무기한'
            }
          </div>
        </div>
      </div>
      {!isLegacy && !isExpired && (
        <button style={s.revokeBtn} onClick={() => onRevoke(pass.id)}>무효화</button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// [방문자] 내 입장권 확인
// ══════════════════════════════════════════════════════════════════════════════
function MyPassView({ siteId, subdomain }) {
  const [pass,    setPass]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`/api/access/${siteId}/my-pass`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPass(data.pass ?? data);
      } catch {
        setError('입장권 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId]);

  if (loading) return <div style={s.tabBody}><p style={s.sectionDesc}>불러오는 중…</p></div>;
  if (error)   return <div style={s.tabBody}><p style={s.errorBox}>{error}</p></div>;
  if (!pass)   return (
    <div style={s.tabBody}>
      <p style={s.emptyMsg}>발급된 입장권이 없습니다.</p>
      <p style={s.sectionDesc}>관장에게 입장권을 요청하거나 초대 링크를 통해 입장하세요.</p>
    </div>
  );

  const isLegacy  = pass.type === 'legacy';
  const isExpired = pass.expiresAt && new Date(pass.expiresAt) < new Date();

  return (
    <div style={s.tabBody}>
      <div style={s.myPassCard}>
        <div style={{ ...s.passBadge, ...s.myPassBadge, background: isLegacy ? '#E8F5E8' : '#EEF3FF', color: isLegacy ? '#2d6b2d' : '#3a5a9a' }}>
          {isLegacy ? '🌿 Legacy Pass (가족)' : '🎫 Visitor Pass'}
        </div>
        <div style={s.passRow}>
          <span style={s.passKey}>유효기간</span>
          <span style={isExpired ? { color: '#c00' } : {}}>
            {isLegacy ? '평생 유효'
              : pass.expiresAt
                ? (isExpired ? '만료됨' : new Date(pass.expiresAt).toLocaleDateString('ko-KR'))
                : '무기한'
            }
          </span>
        </div>
        {pass.issuedAt && (
          <div style={s.passRow}>
            <span style={s.passKey}>발급일</span>
            <span>{new Date(pass.issuedAt).toLocaleDateString('ko-KR')}</span>
          </div>
        )}
      </div>

      {/* QR코드 */}
      {pass.qrUrl && (
        <div style={s.qrWrap}>
          <img src={pass.qrUrl} alt="입장 QR코드" style={s.qrImg} />
          <p style={s.qrHint}>이 QR코드로 박물관에 입장할 수 있습니다.</p>
        </div>
      )}

      {isExpired && (
        <div style={s.errorBox}>입장권이 만료되었습니다. 관장에게 재발급을 요청하세요.</div>
      )}
    </div>
  );
}

// ── 공유 유틸 ─────────────────────────────────────────────────────────────────
function copyInviteLink(subdomain, passId) {
  const url = `${window.location.origin}/${subdomain}?pass=${passId}`;
  navigator.clipboard?.writeText(url).then(() => alert('링크가 복사되었습니다.'));
}

function shareKakao(subdomain, passId) {
  const url = `${window.location.origin}/${subdomain}?pass=${passId}`;
  // Kakao SDK 미로드 시 fallback
  if (window.Kakao?.Share) {
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: '가족유산박물관 입장권',
        description: '박물관 초대를 수락하고 입장하세요.',
        link: { mobileWebUrl: url, webUrl: url },
      },
    });
  } else {
    navigator.clipboard?.writeText(url).then(() => alert('카카오 SDK 미연결 — 링크가 복사되었습니다.'));
  }
}

function ShareBtn({ icon, label, onClick }) {
  return (
    <button style={s.shareBtn} onClick={onClick}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
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
    padding: '20px 24px 12px', borderBottom: '1px solid #E8DFD0',
  },
  headerIcon: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: 700, color: '#3a2a1a', margin: 0, flex: 1 },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: '#9a8a75', padding: '2px 4px',
  },
  museumLabel: {
    fontSize: 12, color: '#9a8a75', margin: '0 24px 4px',
    textAlign: 'center',
  },

  // ── 탭 ────────────────────────────────────────────────────────────────────
  tabRow: {
    display: 'flex', borderBottom: '1px solid #E8DFD0',
    padding: '0 24px',
  },
  tabBtn: {
    flex: 1, padding: '10px 0', background: 'none', border: 'none',
    fontSize: 13, fontWeight: 600, color: '#9a8a75', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: -1,
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: { color: '#8B7355', borderBottomColor: '#8B7355' },

  // ── 탭 바디 ───────────────────────────────────────────────────────────────
  tabBody: {
    padding: '18px 24px 20px',
    display: 'flex', flexDirection: 'column',
  },
  sectionDesc: { fontSize: 12, color: '#7a6a55', lineHeight: 1.7, margin: '0 0 14px' },
  emptyMsg:    { fontSize: 13, color: '#9a8a75', textAlign: 'center', margin: '20px 0' },

  // ── 입력 ──────────────────────────────────────────────────────────────────
  fieldLabel: { fontSize: 12, fontWeight: 600, color: '#5a4a35', marginBottom: 4 },
  input: {
    width: '100%', padding: '9px 12px', border: '1px solid #C4A882',
    borderRadius: 5, fontSize: 13, background: '#FDFBF7',
    boxSizing: 'border-box', marginBottom: 12, outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%', padding: '9px 12px', border: '1px solid #C4A882',
    borderRadius: 5, fontSize: 13, background: '#FDFBF7',
    boxSizing: 'border-box', marginBottom: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#FFF0F0', border: '1px solid #E4A0A0', borderRadius: 5,
    padding: '8px 12px', fontSize: 12, color: '#8B2020', marginBottom: 10,
  },

  // ── 발급 완료 ─────────────────────────────────────────────────────────────
  doneWrap: { padding: '18px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  successBadge: {
    background: '#E8F5E8', border: '1px solid #8BC48A', borderRadius: 20,
    padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#2d6b2d', marginBottom: 14,
  },
  passCard: {
    background: '#FAF7F2', border: '1px solid #C4A882', borderRadius: 6,
    padding: '12px 16px', width: '100%', boxSizing: 'border-box', marginBottom: 14,
  },
  passRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 12, color: '#5a4a35', padding: '3px 0',
  },
  passKey: { color: '#9a8a75', fontWeight: 600 },

  // ── 패스 목록 ─────────────────────────────────────────────────────────────
  passList: { display: 'flex', flexDirection: 'column', gap: 8 },
  passRowItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', border: '1px solid #E8DFD0', borderRadius: 6,
    background: '#FAF7F2',
  },
  passRowLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  passBadge: {
    fontSize: 10, fontWeight: 700, padding: '2px 8px',
    borderRadius: 10, flexShrink: 0,
  },
  passName:   { fontSize: 13, fontWeight: 600, color: '#3a2a1a' },
  passExpiry: { fontSize: 11, color: '#9a8a75', marginTop: 2 },
  revokeBtn: {
    background: 'none', border: '1px solid #E4A0A0', borderRadius: 4,
    fontSize: 11, color: '#8B2020', cursor: 'pointer', padding: '3px 8px',
  },

  // ── 내 입장권 ─────────────────────────────────────────────────────────────
  myPassCard: {
    background: '#FAF7F2', border: '1px solid #C4A882', borderRadius: 8,
    padding: '16px', width: '100%', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14,
  },
  myPassBadge: { fontSize: 13, padding: '6px 14px', borderRadius: 6, textAlign: 'center' },

  // ── QR ────────────────────────────────────────────────────────────────────
  qrWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  qrImg: { width: 140, height: 140, border: '1px solid #C4A882', borderRadius: 4 },
  qrHint: { fontSize: 11, color: '#9a8a75', margin: 0, textAlign: 'center' },

  // ── 공유 버튼 ─────────────────────────────────────────────────────────────
  shareRow: { display: 'flex', gap: 8, width: '100%', marginBottom: 4 },
  shareBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 0', border: '1px solid #C4A882', borderRadius: 6,
    background: '#FAF7F2', cursor: 'pointer',
    fontSize: 12, color: '#7a5a35',
  },

  // ── 공통 버튼 ─────────────────────────────────────────────────────────────
  btn: {
    padding: '11px 0', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', width: '100%', boxSizing: 'border-box',
  },
  btnPrimary:   { background: '#8B7355', color: '#fff' },
  btnSecondary: { background: 'transparent', color: '#8B7355', border: '1px solid #C4A882' },
};
