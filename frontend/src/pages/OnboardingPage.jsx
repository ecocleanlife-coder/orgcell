/**
 * OnboardingPage.jsx — §27 온보딩 (3단계)
 *
 * Step 1: 이름(성/이름 분리) + 성별 + 생년월일 + 영문여권명(선택)
 * Step 2: 본관 입력 (자동완성) 또는 "나중에 입력"
 * Step 3: 확인 → subdomain 배정 → 박물관 생성 → 관장 인물 생성 → 이동
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TOTAL_STEPS = 3;

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────
function apiFetch(path, opts = {}) {
  return fetch(path, { credentials: 'include', ...opts }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `오류 ${res.status}`);
    return json;
  });
}

// ─── 단계 인디케이터 ──────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div style={s.dots}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <span key={i} style={{ ...s.dot, background: i + 1 === step ? '#8B7355' : '#D5C9B8' }} />
      ))}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1 상태 ──────────────────────────────────────────────────────────
  const [lastName,    setLastName]    = useState('');
  const [firstName,   setFirstName]   = useState('');
  const [gender,      setGender]      = useState('');        // 'M' | 'F'
  const [birthYear,   setBirthYear]   = useState('');
  const [birthMonth,  setBirthMonth]  = useState('');
  const [birthDay,    setBirthDay]    = useState('');
  const [lunarBirth,  setLunarBirth]  = useState(false);    // 음력 여부
  const [engLast,     setEngLast]     = useState('');        // 영문 성 (선택)
  const [engFirst,    setEngFirst]    = useState('');        // 영문 이름 (선택)

  // ── Step 2 상태 ──────────────────────────────────────────────────────────
  const [bonGwanQuery,   setBonGwanQuery]   = useState('');
  const [bonGwanList,    setBonGwanList]    = useState([]);
  const [bonGwanSelected,setBonGwanSelected]= useState(null);  // { id, name }
  const [skipBonGwan,    setSkipBonGwan]    = useState(false);
  const debounceRef = useRef(null);

  // ── 본관 자동완성 (debounce 300ms) ──────────────────────────────────────
  const handleBonGwanInput = useCallback((val) => {
    setBonGwanQuery(val);
    setBonGwanSelected(null);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setBonGwanList([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/subdomain/bon-gwan?surnameKo=${encodeURIComponent(val)}`);
        setBonGwanList(Array.isArray(data) ? data : (data.bonGwanList ?? []));
      } catch (_) { setBonGwanList([]); }
    }, 300);
  }, []);

  // ── 단계 이동 ────────────────────────────────────────────────────────────
  function validateStep1() {
    if (!lastName.trim())  { toast.error('성(姓)을 입력하세요.'); return false; }
    if (!firstName.trim()) { toast.error('이름을 입력하세요.'); return false; }
    if (!gender)           { toast.error('성별을 선택하세요.'); return false; }
    return true;
  }

  function validateStep2() {
    if (!skipBonGwan && !bonGwanSelected && !bonGwanQuery.trim()) {
      toast.error('본관을 입력하거나 "나중에 입력"을 체크하세요.');
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }
  function goPrev() { setStep((s) => s - 1); }

  // ── 최종 제출 ────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      // 1. subdomain 배정
      const sdRes = await apiFetch('/api/subdomain/assign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surnameKo:  lastName.trim(),
          bonGwanKo:  bonGwanSelected?.name ?? (bonGwanQuery.trim() || null),
        }),
      });
      const subdomain = sdRes.subdomain;

      // 2. 박물관(site) 생성
      const siteRes = await apiFetch('/api/site', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      });
      const siteId = siteRes.site?.id ?? siteRes.id;

      // 3. 관장 인물 생성 (OPS)
      const birthDate = [birthYear, birthMonth.padStart(2,'0'), birthDay.padStart(2,'0')]
        .filter(Boolean).join('-') || null;

      await apiFetch('/api/persons', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          subdomain,
          lastName:    lastName.trim(),
          firstName:   firstName.trim(),
          gender,
          birth_date:  birthDate,
          birth_lunar: lunarBirth,
          eng_last:    engLast.trim()  || null,
          eng_first:   engFirst.trim() || null,
          bonGwanKo:   bonGwanSelected?.name ?? (bonGwanQuery.trim() || null),
          isCurator:   true,
        }),
      });

      toast.success('박물관이 개설되었습니다!');
      navigate(`/${subdomain}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>Orgcell</div>
        <p style={s.title}>박물관 개설</p>
        <StepDots step={step} />

        {step === 1 && (
          <Step1
            lastName={lastName}   setLastName={setLastName}
            firstName={firstName} setFirstName={setFirstName}
            gender={gender}       setGender={setGender}
            birthYear={birthYear} setBirthYear={setBirthYear}
            birthMonth={birthMonth} setBirthMonth={setBirthMonth}
            birthDay={birthDay}   setBirthDay={setBirthDay}
            lunarBirth={lunarBirth} setLunarBirth={setLunarBirth}
            engLast={engLast}     setEngLast={setEngLast}
            engFirst={engFirst}   setEngFirst={setEngFirst}
          />
        )}

        {step === 2 && (
          <Step2
            query={bonGwanQuery}       onInput={handleBonGwanInput}
            list={bonGwanList}         selected={bonGwanSelected}
            onSelect={(item) => { setBonGwanSelected(item); setBonGwanQuery(item.name); setBonGwanList([]); }}
            skip={skipBonGwan}
            onSkip={(v) => { setSkipBonGwan(v); if (v) { setBonGwanSelected(null); setBonGwanQuery(''); } }}
          />
        )}

        {step === 3 && (
          <Step3
            lastName={lastName} firstName={firstName} gender={gender}
            birthYear={birthYear} birthMonth={birthMonth} birthDay={birthDay}
            lunarBirth={lunarBirth} engLast={engLast} engFirst={engFirst}
            bonGwan={bonGwanSelected?.name ?? (skipBonGwan ? '나중에 입력' : (bonGwanQuery.trim() || '—'))}
          />
        )}

        <div style={s.btnRow}>
          {step > 1 && (
            <button style={s.prevBtn} onClick={goPrev} disabled={submitting}>
              ← 이전
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button style={s.nextBtn} onClick={goNext}>
              다음 →
            </button>
          ) : (
            <button
              style={{ ...s.nextBtn, opacity: submitting ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '개설 중…' : '박물관 개설하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: 이름 + 성별 + 생년월일 + 영문여권명 ──────────────────────────────
function Step1({
  lastName, setLastName, firstName, setFirstName,
  gender, setGender,
  birthYear, setBirthYear, birthMonth, setBirthMonth, birthDay, setBirthDay,
  lunarBirth, setLunarBirth,
  engLast, setEngLast, engFirst, setEngFirst,
}) {
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>1단계 — 본인 정보</p>

      {/* 성 / 이름 */}
      <div style={s.row2}>
        <label style={s.field}>
          <span style={s.lbl}>성 (姓) <Req /></span>
          <input style={s.input} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="예) 이" />
        </label>
        <label style={s.field}>
          <span style={s.lbl}>이름 <Req /></span>
          <input style={s.input} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="예) 상훈" />
        </label>
      </div>

      {/* 성별 */}
      <div style={s.field}>
        <span style={s.lbl}>성별 <Req /></span>
        <div style={s.radioRow}>
          <RadioBtn label="남" value="M" checked={gender === 'M'} onChange={setGender} />
          <RadioBtn label="여" value="F" checked={gender === 'F'} onChange={setGender} />
        </div>
      </div>

      {/* 생년월일 */}
      <div style={s.field}>
        <span style={s.lbl}>생년월일 <span style={s.opt}>(선택)</span></span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input style={{ ...s.input, width: 72 }} value={birthYear}  onChange={(e) => setBirthYear(e.target.value)}  placeholder="년" maxLength={4} />
          <input style={{ ...s.input, width: 48 }} value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} placeholder="월" maxLength={2} />
          <input style={{ ...s.input, width: 48 }} value={birthDay}   onChange={(e) => setBirthDay(e.target.value)}   placeholder="일" maxLength={2} />
          <label style={s.checkLabel}>
            <input type="checkbox" checked={lunarBirth} onChange={(e) => setLunarBirth(e.target.checked)} />
            음력
          </label>
        </div>
      </div>

      {/* 영문 여권명 (선택) */}
      <p style={s.sectionTitle}>영문 여권명 <span style={s.opt}>(선택)</span></p>
      <div style={s.row2}>
        <label style={s.field}>
          <span style={s.lbl}>영문 성</span>
          <input style={s.input} value={engLast}  onChange={(e) => setEngLast(e.target.value)}  placeholder="예) LEE" />
        </label>
        <label style={s.field}>
          <span style={s.lbl}>영문 이름</span>
          <input style={s.input} value={engFirst} onChange={(e) => setEngFirst(e.target.value)} placeholder="예) SANGHUN" />
        </label>
      </div>
    </div>
  );
}

// ─── Step 2: 본관 ──────────────────────────────────────────────────────────────
function Step2({ query, onInput, list, selected, onSelect, skip, onSkip }) {
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>2단계 — 본관 (本貫)</p>
      <p style={s.hint}>성씨의 발상지로, 박물관 주소(subdomain)에 사용됩니다.</p>

      <label style={s.field}>
        <span style={s.lbl}>본관 검색</span>
        <input
          style={{ ...s.input, opacity: skip ? 0.4 : 1 }}
          value={query}
          onChange={(e) => onInput(e.target.value)}
          placeholder="예) 전주, 경주, 김해…"
          disabled={skip}
        />
      </label>

      {/* 자동완성 목록 */}
      {list.length > 0 && !skip && (
        <ul style={s.autocomplete}>
          {list.map((item) => (
            <li key={item.id} style={s.acItem} onClick={() => onSelect(item)}>
              {item.name}
            </li>
          ))}
        </ul>
      )}

      {selected && !skip && (
        <p style={s.selectedTag}>✓ {selected.name} 선택됨</p>
      )}

      <label style={s.checkLabel}>
        <input type="checkbox" checked={skip} onChange={(e) => onSkip(e.target.checked)} />
        &nbsp;본관을 모릅니다 — 나중에 입력
      </label>
      {skip && (
        <p style={s.hint}>본관 미확정 시 성씨+순번으로 임시 배정됩니다. 확정 후 자동 변환됩니다.</p>
      )}
    </div>
  );
}

// ─── Step 3: 확인 ─────────────────────────────────────────────────────────────
function Step3({ lastName, firstName, gender, birthYear, birthMonth, birthDay, lunarBirth, engLast, engFirst, bonGwan }) {
  const birthStr = [birthYear, birthMonth && birthMonth.padStart(2,'0'), birthDay && birthDay.padStart(2,'0')]
    .filter(Boolean).join('-') + (lunarBirth ? ' (음력)' : '');
  const engName = [engLast, engFirst].filter(Boolean).join(' ') || '—';

  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>3단계 — 확인</p>
      <table style={s.table}>
        <tbody>
          <Row label="이름"       value={`${lastName} ${firstName}`} />
          <Row label="성별"       value={gender === 'M' ? '남' : '여'} />
          <Row label="생년월일"   value={birthStr || '—'} />
          <Row label="영문 여권명" value={engName} />
          <Row label="본관"       value={bonGwan} />
        </tbody>
      </table>
      <p style={s.hint}>정보가 맞으면 아래 버튼으로 박물관을 개설합니다.</p>
    </div>
  );
}

// ─── 공통 소컴포넌트 ──────────────────────────────────────────────────────────
function Req() { return <span style={{ color: '#C0392B' }}>*</span>; }

function RadioBtn({ label, value, checked, onChange }) {
  return (
    <label style={{ ...s.checkLabel, fontWeight: checked ? 600 : 400 }}>
      <input type="radio" value={value} checked={checked} onChange={() => onChange(value)} />
      &nbsp;{label}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td style={s.tdLabel}>{label}</td>
      <td style={s.tdValue}>{value}</td>
    </tr>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F5F0E8',
    padding: 16,
  },
  card: {
    background: '#FDFBF7',
    border: '1px solid #C4A882',
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '2px 2px 0 #c4a87a',
    borderRadius: 4,
    padding: '40px 36px 36px',
    width: '100%',
    maxWidth: 480,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: 700,
    color: '#8B7355',
    letterSpacing: 2,
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 600,
    color: '#5a4a35',
    margin: '6px 0 16px',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  stepBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    minHeight: 260,
  },
  stepLabel: {
    fontSize: 13,
    color: '#8B7355',
    fontWeight: 600,
    margin: 0,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#8B7355',
    margin: '8px 0 0',
    fontWeight: 600,
  },
  hint: {
    fontSize: 12,
    color: '#A09070',
    margin: 0,
    lineHeight: 1.5,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  lbl: {
    fontSize: 12,
    color: '#6a5a45',
    fontWeight: 600,
  },
  opt: {
    fontSize: 11,
    color: '#A09070',
    fontWeight: 400,
  },
  input: {
    padding: '9px 10px',
    border: '1px solid #C4A882',
    borderRadius: 4,
    fontSize: 14,
    color: '#333',
    background: '#FAFAF5',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  radioRow: {
    display: 'flex',
    gap: 20,
    paddingTop: 4,
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    color: '#5a4a35',
    cursor: 'pointer',
    gap: 4,
  },
  autocomplete: {
    listStyle: 'none',
    margin: '0',
    padding: 0,
    border: '1px solid #C4A882',
    borderRadius: 4,
    background: '#fff',
    maxHeight: 160,
    overflowY: 'auto',
  },
  acItem: {
    padding: '8px 12px',
    fontSize: 14,
    color: '#333',
    cursor: 'pointer',
    borderBottom: '1px solid #F0EAE0',
  },
  selectedTag: {
    fontSize: 13,
    color: '#5a8a55',
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tdLabel: {
    fontSize: 13,
    color: '#8B7355',
    fontWeight: 600,
    padding: '7px 0',
    width: 90,
    verticalAlign: 'top',
  },
  tdValue: {
    fontSize: 14,
    color: '#333',
    padding: '7px 0 7px 8px',
    borderBottom: '1px solid #F0EAE0',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 28,
  },
  prevBtn: {
    padding: '9px 20px',
    background: 'none',
    border: '1px solid #C4A882',
    borderRadius: 4,
    fontSize: 14,
    color: '#8B7355',
    cursor: 'pointer',
  },
  nextBtn: {
    padding: '9px 24px',
    background: '#8B7355',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
};
