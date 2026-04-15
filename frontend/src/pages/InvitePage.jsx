/**
 * InvitePage.jsx — §17 초대 수락/거절
 *
 * 경로: /invite/:token
 *
 * §17 규칙:
 *   - 이메일 / SMS / 링크 복사로 전달된 토큰 처리
 *   - 수락/거절 → 노출 선택 (이름 전체 / 성만 / 익명)
 *   - 거절자 → RefusedPersonBox (거절 완료 안내)
 *
 * 흐름:
 *   1. GET /api/invite/:token → 초대 정보 로드
 *   2. 비로그인 → 로그인 후 이 페이지로 복귀
 *   3. 수락 → 노출 이름 선택 → POST /api/invite/:token/respond
 *   4. 거절 → POST /api/invite/:token/respond { action:'reject' } → RefusedPersonBox
 *   5. 수락 완료 → 해당 박물관으로 이동
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// ── 단계 ─────────────────────────────────────────────────────────────────────
const STEP = {
  LOADING:    'loading',
  ERROR:      'error',
  INVITE:     'invite',     // 초대 카드 표시
  DISPLAY:    'display',    // 수락 시 노출 이름 선택
  SUBMITTING: 'submitting',
  ACCEPTED:   'accepted',
  REFUSED:    'refused',    // RefusedPersonBox
};

// ── 노출 이름 옵션 ────────────────────────────────────────────────────────────
const DISPLAY_OPTIONS = [
  { value: 'full',      label: '이름 전체 공개', desc: '예: 홍길동' },
  { value: 'surname',   label: '성만 공개',      desc: '예: 홍○○' },
  { value: 'anonymous', label: '익명',           desc: '예: 가족 구성원' },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function InvitePage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const { isAuthenticated, fetchMe } = useAuthStore();

  const [step,        setStep]        = useState(STEP.LOADING);
  const [invite,      setInvite]      = useState(null); // 초대 정보
  const [displayName, setDisplayName] = useState('full');
  const [errorMsg,    setErrorMsg]    = useState('');

  // ── 1. 초기 로드 ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      // 로그인 상태 확인
      await fetchMe();
      const { isAuthenticated: authed } = useAuthStore.getState();
      if (!authed) {
        // 비로그인 → 로그인 후 복귀
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
        return;
      }

      // 초대 정보 로드 — §17 invitations 테이블 우선, 없으면 기존 family_invites
      try {
        const res  = await fetch(`/api/invitations/verify/${token}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) { setInvite(data.data); setStep(STEP.INVITE); return; }
        }
        if (res.status === 410) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || '이미 처리된 초대입니다.');
        }
        // fallback: 기존 family_invites
        const res2 = await fetch(`/api/invite/${token}`, { credentials: 'include' });
        if (!res2.ok) {
          if (res2.status === 404) throw new Error('초대 링크를 찾을 수 없습니다. 만료되었거나 이미 처리된 초대입니다.');
          if (res2.status === 410) throw new Error('이미 처리된 초대입니다.');
          throw new Error(`오류 (${res2.status})`);
        }
        const data2 = await res2.json();
        setInvite(data2);
        setStep(STEP.INVITE);
      } catch (err) {
        setErrorMsg(err.message);
        setStep(STEP.ERROR);
      }
    }
    init();
  }, [token]);

  // ── 2. 수락 처리 ──────────────────────────────────────────────────────────
  async function handleAccept() {
    setStep(STEP.SUBMITTING);
    try {
      // §17 신규 엔드포인트 우선 시도
      const res = await fetch(`/api/invitations/accept/${token}`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ displayPref: displayName }),
      });
      if (res.ok) {
        const data = await res.json();
        setStep(STEP.ACCEPTED);
        const subdomain = data.subdomain || invite?.subdomain;
        setTimeout(() => {
          if (subdomain) navigate(`/${subdomain}`, { replace: true });
          else navigate('/', { replace: true });
        }, 2000);
        return;
      }
      // fallback: 기존 엔드포인트
      const res2 = await fetch(`/api/invite/${token}/respond`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ action: 'accept', displayName }),
      });
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      setStep(STEP.ACCEPTED);
      setTimeout(() => {
        if (invite?.subdomain) navigate(`/${invite.subdomain}`, { replace: true });
        else navigate('/', { replace: true });
      }, 2000);
    } catch {
      setErrorMsg('수락 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setStep(STEP.INVITE);
    }
  }

  // ── 3. 거절 처리 ──────────────────────────────────────────────────────────
  async function handleReject() {
    setStep(STEP.SUBMITTING);
    try {
      // §17 신규 엔드포인트 우선 시도
      const res = await fetch(`/api/invitations/decline/${token}`, {
        method: 'POST', credentials: 'include',
      });
      if (res.ok) { setStep(STEP.REFUSED); return; }
      // fallback
      const res2 = await fetch(`/api/invite/${token}/respond`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ action: 'reject' }),
      });
      if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
      setStep(STEP.REFUSED);
    } catch {
      setErrorMsg('거절 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setStep(STEP.INVITE);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.bgPattern} />

      <div style={s.card}>
        {step === STEP.LOADING    && <LoadingView />}
        {step === STEP.ERROR      && <ErrorView msg={errorMsg} onHome={() => navigate('/')} />}
        {step === STEP.INVITE     && (
          <InviteView
            invite={invite}
            errorMsg={errorMsg}
            onAccept={() => setStep(STEP.DISPLAY)}
            onReject={handleReject}
          />
        )}
        {step === STEP.DISPLAY    && (
          <DisplayView
            invite={invite}
            displayName={displayName}
            onChange={setDisplayName}
            onConfirm={handleAccept}
            onBack={() => setStep(STEP.INVITE)}
          />
        )}
        {step === STEP.SUBMITTING && <LoadingView label="처리 중…" />}
        {step === STEP.ACCEPTED   && <AcceptedView invite={invite} />}
        {step === STEP.REFUSED    && <RefusedPersonBox invite={invite} onHome={() => navigate('/')} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 로딩
function LoadingView({ label = '초대 정보를 불러오는 중…' }) {
  return (
    <div style={s.centerCol}>
      <div style={s.spinner} />
      <p style={s.loadingLabel}>{label}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 오류
function ErrorView({ msg, onHome }) {
  return (
    <div style={s.centerCol}>
      <div style={s.errorIcon}>⚠️</div>
      <h2 style={s.title}>초대를 불러올 수 없습니다</h2>
      <p style={s.desc}>{msg}</p>
      <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onHome}>홈으로</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 초대 카드
function InviteView({ invite, errorMsg, onAccept, onReject }) {
  const [confirmReject, setConfirmReject] = useState(false);

  return (
    <div style={s.centerCol}>
      {/* 헤더 장식 */}
      <div style={s.decorRow}>
        <span style={s.decorLine2} /><span style={s.decorDot}>◆</span><span style={s.decorLine2} />
      </div>

      <div style={s.museumIcon}>🏛️</div>
      <h2 style={s.title}>가족 박물관 초대</h2>
      <p style={s.inviteFrom}>
        <strong style={s.accent}>{invite?.inviterName ?? '관장'}</strong>님이
        <br />
        <strong style={s.accent}>{invite?.museumName ?? '가족유산박물관'}</strong>에 초대했습니다.
      </p>

      {invite?.personName && (
        <div style={s.personTag}>
          등록된 이름: <strong>{invite.personName}</strong>
        </div>
      )}

      {errorMsg && <div style={s.inlineError}>{errorMsg}</div>}

      {invite?.relation === 'family' && (
        <div style={s.familyNotice}>
          👨‍👩‍👧 가족 구성원으로 초대되었습니다. 수락하시면 가족 트리에 등록됩니다.
        </div>
      )}

      {!confirmReject ? (
        <div style={s.btnGroup}>
          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onAccept}>
            ✓ {invite?.relation === 'family' ? '내 기록 확인하기' : '초대 수락하기'}
          </button>
          <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => setConfirmReject(true)}>
            거절하기
          </button>
        </div>
      ) : (
        <div style={s.rejectConfirmBox}>
          <p style={s.rejectQ}>정말 거절하시겠습니까?</p>
          <p style={s.rejectSub}>거절 후에는 박물관에 표시되지 않습니다.</p>
          <div style={s.btnGroup}>
            <button style={{ ...s.btn, ...s.btnDanger }} onClick={onReject}>거절 확인</button>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={() => setConfirmReject(false)}>취소</button>
          </div>
        </div>
      )}

      <div style={{ ...s.decorRow, marginTop: 20, marginBottom: 0 }}>
        <span style={s.decorLine2} /><span style={s.decorDot}>◆</span><span style={s.decorLine2} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 노출 이름 선택
function DisplayView({ invite, displayName, onChange, onConfirm, onBack }) {
  return (
    <div style={s.centerCol}>
      <h2 style={s.title}>박물관에서 어떻게 표시될까요?</h2>
      <p style={s.desc}>
        <strong style={s.accent}>{invite?.museumName ?? '박물관'}</strong>의 가족 트리에서<br />
        내 이름을 어떻게 공개할지 선택하세요.
      </p>

      <div style={s.optionList}>
        {DISPLAY_OPTIONS.map(opt => (
          <label key={opt.value} style={{
            ...s.optionRow,
            background: displayName === opt.value ? '#FDF8F0' : 'transparent',
            borderColor: displayName === opt.value ? '#C4A882' : '#E8DFD0',
          }}>
            <input
              type="radio"
              name="displayName"
              value={opt.value}
              checked={displayName === opt.value}
              onChange={() => onChange(opt.value)}
              style={s.radio}
            />
            <div>
              <div style={s.optionLabel}>{opt.label}</div>
              <div style={s.optionDesc}>{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={s.btnGroup}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={onConfirm}>
          이 설정으로 수락
        </button>
        <button style={{ ...s.btn, ...s.btnSecondary }} onClick={onBack}>
          뒤로
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 수락 완료
function AcceptedView({ invite }) {
  return (
    <div style={s.centerCol}>
      <div style={s.successIcon}>✓</div>
      <h2 style={s.title}>초대를 수락했습니다!</h2>
      <p style={s.desc}>
        <strong style={s.accent}>{invite?.museumName ?? '박물관'}</strong>으로 이동합니다…
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// §17 거절자 → RefusedPersonBox
function RefusedPersonBox({ invite, onHome }) {
  return (
    <div style={s.centerCol}>
      <div style={s.refusedIcon}>🚪</div>
      <h2 style={s.title}>초대를 거절했습니다</h2>
      <p style={s.desc}>
        <strong style={s.accent}>{invite?.museumName ?? '박물관'}</strong>의<br />
        가족 트리에 표시되지 않습니다.
      </p>

      <div style={s.refusedBox}>
        <p style={s.refusedNote}>
          거절하신 경우 박물관에는 <strong>"RefusedPersonBox"</strong>로만 표기되며,<br />
          관장이 다시 초대할 때까지 내부를 열람할 수 없습니다.
        </p>
        <p style={s.refusedNote}>
          마음이 바뀌셨다면 관장에게 연락하여 재초대를 요청해 주세요.
        </p>
      </div>

      <button style={{ ...s.btn, ...s.btnSecondary }} onClick={onHome}>
        홈으로 돌아가기
      </button>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '32px 16px',
    background:     '#F5F0E8',
    position:       'relative',
    overflow:       'hidden',
    boxSizing:      'border-box',
  },
  bgPattern: {
    position:      'absolute',
    inset:          0,
    background:    'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(196,168,130,0.04) 40px, rgba(196,168,130,0.04) 80px)',
    pointerEvents: 'none',
  },
  card: {
    position:      'relative',
    zIndex:         1,
    background:    '#FDFBF7',
    border:        '1px solid #C4A882',
    borderRight:   '2px solid #b09060',
    borderBottom:  '2px solid #9a7a50',
    boxShadow:     '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
    borderRadius:   10,
    padding:       '36px 44px 28px',
    width:          440,
    maxWidth:      'calc(100vw - 32px)',
    boxSizing:     'border-box',
  },
  centerCol: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    textAlign:     'center',
    gap:            0,
  },

  // ── 장식 ───────────────────────────────────────────────────────────────────
  decorRow: {
    display:     'flex',
    alignItems:  'center',
    gap:          8,
    width:       '100%',
    marginBottom: 20,
  },
  decorLine2: {
    flex:       1,
    height:     1,
    background: 'linear-gradient(to right, transparent, #C4A882, transparent)',
  },
  decorDot: {
    fontSize: 10,
    color:    '#C4A882',
  },

  // ── 아이콘 ─────────────────────────────────────────────────────────────────
  museumIcon: { fontSize: 40, marginBottom: 10 },
  errorIcon:  { fontSize: 36, marginBottom: 10 },
  refusedIcon:{ fontSize: 36, marginBottom: 10 },
  successIcon:{
    width:          56,
    height:         56,
    borderRadius:   '50%',
    background:     '#E8F5E9',
    border:         '2px solid #8BC48A',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       24,
    color:          '#2d6b2d',
    marginBottom:   14,
  },

  // ── 텍스트 ─────────────────────────────────────────────────────────────────
  title: {
    fontSize:    20,
    fontWeight:  700,
    color:       '#3a2a1a',
    margin:      '0 0 10px',
  },
  inviteFrom: {
    fontSize:   14,
    color:      '#5a4a35',
    lineHeight: 1.8,
    margin:     '0 0 14px',
  },
  desc: {
    fontSize:   13,
    color:      '#6a5a45',
    lineHeight: 1.7,
    margin:     '0 0 18px',
  },
  accent: { color: '#7a5a35', fontWeight: 700 },
  personTag: {
    background:   '#F5EDD8',
    border:       '1px solid #C4A882',
    borderRadius:  5,
    padding:      '6px 14px',
    fontSize:      12,
    color:        '#7a5a35',
    marginBottom:  16,
  },
  familyNotice: {
    background:   '#F0F8F0',
    border:       '1px solid #8BC48A',
    borderRadius:  5,
    padding:      '8px 12px',
    fontSize:      12,
    color:        '#2d5a2d',
    marginBottom:  14,
    lineHeight:    1.6,
  },
  inlineError: {
    background:   '#FFF0F0',
    border:       '1px solid #E4A0A0',
    borderRadius:  5,
    padding:      '8px 12px',
    fontSize:      12,
    color:        '#8B2020',
    marginBottom:  12,
    width:        '100%',
    boxSizing:    'border-box',
    textAlign:    'left',
  },
  loadingLabel: {
    fontSize: 13,
    color:    '#9a8a75',
    margin:   '12px 0 0',
  },

  // ── 거절 확인 ─────────────────────────────────────────────────────────────
  rejectConfirmBox: {
    background:   '#FFF8F0',
    border:       '1px solid #D4A860',
    borderRadius:  6,
    padding:      '14px 18px',
    width:        '100%',
    boxSizing:    'border-box',
    marginBottom:  4,
  },
  rejectQ:   { fontSize: 14, fontWeight: 700, color: '#7a4a20', margin: '0 0 4px' },
  rejectSub: { fontSize: 12, color: '#9a6a40', margin: '0 0 12px' },

  // ── RefusedPersonBox ────────────────────────────────────────────────────
  refusedBox: {
    background:   '#FAF7F2',
    border:       '1px dashed #C4A882',
    borderRadius:  6,
    padding:      '14px 18px',
    textAlign:    'left',
    marginBottom:  18,
    width:        '100%',
    boxSizing:    'border-box',
  },
  refusedNote: {
    fontSize:   12,
    color:      '#7a6a55',
    lineHeight: 1.7,
    margin:     '0 0 8px',
  },

  // ── 노출 이름 선택 ─────────────────────────────────────────────────────────
  optionList: {
    display:       'flex',
    flexDirection: 'column',
    gap:            8,
    width:         '100%',
    marginBottom:  18,
    textAlign:     'left',
  },
  optionRow: {
    display:      'flex',
    alignItems:   'center',
    gap:           12,
    padding:      '10px 14px',
    border:       '1px solid',
    borderRadius:  6,
    cursor:       'pointer',
    transition:   'background 0.15s, border-color 0.15s',
  },
  radio:       { accentColor: '#8B7355', flexShrink: 0 },
  optionLabel: { fontSize: 13, fontWeight: 600, color: '#3a2a1a', marginBottom: 2 },
  optionDesc:  { fontSize: 11, color: '#9a8a75' },

  // ── 공통 버튼 ─────────────────────────────────────────────────────────────
  btnGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:            10,
    width:         '100%',
  },
  btn: {
    width:       '100%',
    padding:     '11px 0',
    borderRadius: 6,
    fontSize:     14,
    fontWeight:   600,
    cursor:       'pointer',
    border:       'none',
    transition:   'opacity 0.15s',
    boxSizing:    'border-box',
  },
  btnPrimary:   { background: '#8B7355', color: '#fff' },
  btnSecondary: { background: 'transparent', color: '#8B7355', border: '1px solid #C4A882' },
  btnDanger:    { background: '#C45A45', color: '#fff' },

  // ── 스피너 ────────────────────────────────────────────────────────────────
  spinner: {
    width:       32,
    height:      32,
    borderRadius:'50%',
    border:      '3px solid #E8DFD0',
    borderTop:   '3px solid #C4A882',
    animation:   'spin 0.8s linear infinite',
  },
};

// 전역 CSS: spinner + keyframe
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(styleEl);
