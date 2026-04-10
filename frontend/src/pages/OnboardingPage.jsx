/**
 * OnboardingPage.jsx — §27 온보딩 (확정 흐름)
 *
 * 모드별 흐름:
 *   INPUT → (POST /api/persons/search) → CANDIDATES | NO_MATCH
 *   CANDIDATES → 후보 선택 → ADDITIONAL → (POST /api/persons/link-account) → 박물관 이동
 *   NO_MATCH   → CONFIRM_NEW → (POST /api/sites) → 새 박물관 이동
 *   CANDIDATES → "다른 사람" → CONFIRM_NEW
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MODE = {
  INPUT:       'input',
  CANDIDATES:  'candidates',
  NO_MATCH:    'no_match',
  ADDITIONAL:  'additional',
  CONFIRM_NEW: 'confirm_new',
};

function apiFetch(path, opts = {}) {
  return fetch(path, { credentials: 'include', ...opts }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `오류 ${res.status}`);
    return json;
  });
}

function modeToStep(mode) {
  if (mode === MODE.INPUT)                    return 1;
  if (mode === MODE.CANDIDATES || mode === MODE.NO_MATCH || mode === MODE.ADDITIONAL) return 2;
  return 3;
}

// ─── 단계 인디케이터 ──────────────────────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div style={s.dots}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ ...s.dot, background: i === step ? '#8B7355' : '#D5C9B8' }} />
      ))}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [mode, setMode]           = useState(MODE.INPUT);
  const [busy, setBusy]           = useState(false);

  // Step 1 입력 데이터
  const [lastName,    setLastName]    = useState('');
  const [firstName,   setFirstName]   = useState('');
  const [gender,      setGender]      = useState('');
  const [birthYear,   setBirthYear]   = useState('');
  const [birthMonth,  setBirthMonth]  = useState('');
  const [birthDay,    setBirthDay]    = useState('');
  const [lunarBirth,  setLunarBirth]  = useState(false);
  const [bonGwanQuery,    setBonGwanQuery]    = useState('');
  const [bonGwanList,     setBonGwanList]     = useState([]);
  const [bonGwanSelected, setBonGwanSelected] = useState(null);
  const [skipBonGwan,     setSkipBonGwan]     = useState(false);
  const [parentFather,    setParentFather]    = useState('');
  const [parentMother,    setParentMother]    = useState('');
  const [otherNames,      setOtherNames]      = useState([]);  // [{name,type}]
  const [engLast,  setEngLast]  = useState('');
  const [engFirst, setEngFirst] = useState('');

  // 검색 결과
  const [candidates,         setCandidates]         = useState([]);
  const [selectedCandidate,  setSelectedCandidate]  = useState(null);

  // 추가 확인 질문
  const [addBirthPlace, setAddBirthPlace] = useState('');
  const [addSpouse,     setAddSpouse]     = useState('');
  const [addChildren,   setAddChildren]   = useState('');
  const [addSiblings,   setAddSiblings]   = useState('');

  const debounceRef = useRef(null);

  // ── 본관 자동완성 ─────────────────────────────────────────────────────────
  const handleBonGwanInput = useCallback((val) => {
    setBonGwanQuery(val);
    setBonGwanSelected(null);
    clearTimeout(debounceRef.current);
    if (!val.trim() || skipBonGwan) { setBonGwanList([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/api/subdomain/bon-gwan?surnameKo=${encodeURIComponent(lastName || val)}`);
        setBonGwanList(Array.isArray(data) ? data : (data.bonGwanList ?? []));
      } catch (_) { setBonGwanList([]); }
    }, 300);
  }, [skipBonGwan, lastName]);

  // ── 다른 이름 관리 ────────────────────────────────────────────────────────
  function addOtherName() { setOtherNames((p) => [...p, { name: '', type: '어릴때' }]); }
  function removeOtherName(i) { setOtherNames((p) => p.filter((_, idx) => idx !== i)); }
  function updateOtherName(i, key, val) {
    setOtherNames((p) => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  // ── 검색 실행 ─────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!lastName.trim())  { toast.error('성(姓)을 입력하세요.'); return; }
    if (!firstName.trim()) { toast.error('이름을 입력하세요.'); return; }
    if (!gender)           { toast.error('성별을 선택하세요.'); return; }

    setBusy(true);
    try {
      const birthDate = buildBirthDate();
      const bonGwan   = bonGwanSelected?.name ?? (skipBonGwan ? null : bonGwanQuery.trim() || null);
      const others    = otherNames.filter((o) => o.name.trim());

      const res = await apiFetch('/api/persons/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname_ko:   lastName.trim(),
          given_name:   firstName.trim(),
          birth_date:   birthDate,
          birth_lunar:  lunarBirth,
          bon_gwan_ko:  bonGwan,
          parent_name1: parentFather.trim() || null,
          parent_name2: parentMother.trim() || null,
          name_other:   others.length ? others : undefined,
        }),
      });

      const list = res.candidates ?? [];
      if (list.length === 0) {
        setMode(MODE.NO_MATCH);
      } else {
        setCandidates(list);
        setMode(MODE.CANDIDATES);
      }
    } catch (err) {
      toast.error(`검색 실패: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // ── 계정 연결 ─────────────────────────────────────────────────────────────
  async function handleLinkAccount() {
    if (!selectedCandidate) return;
    setBusy(true);
    try {
      const res = await apiFetch('/api/persons/link-account', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id:   selectedCandidate.site_id,
          person_id: selectedCandidate.person_id,
        }),
      });
      toast.success('기존 박물관에 계정이 연결되었습니다!');
      navigate(`/${res.subdomain}`);
    } catch (err) {
      toast.error(`연결 실패: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  // ── 새 박물관 생성 ────────────────────────────────────────────────────────
  async function handleCreateNew() {
    setBusy(true);
    try {
      const birthDate = buildBirthDate();
      const bonGwan   = bonGwanSelected?.name ?? (skipBonGwan ? null : bonGwanQuery.trim() || null);
      const others    = otherNames.filter((o) => o.name.trim());

      const res = await apiFetch('/api/sites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname_ko:     lastName.trim(),
          given_name:     firstName.trim(),
          bon_gwan_ko:    bonGwan,
          curator_gender: gender,
          birth_date:     birthDate,
          birth_lunar:    lunarBirth,
          surname_en:     engLast.trim()  || null,
          name_en:        [engLast.trim(), engFirst.trim()].filter(Boolean).join(' ') || null,
          name_other:     others.length ? others : undefined,
        }),
      });
      const subdomain = res.data?.subdomain ?? res.subdomain;
      if (!subdomain) { toast.error('박물관 주소를 받지 못했습니다.'); return; }
      toast.success('박물관이 개설되었습니다!');
      navigate(`/${subdomain}`);
    } catch (err) {
      toast.error(`박물관 개설 실패: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function buildBirthDate() {
    const y = birthYear.trim();
    const m = birthMonth.trim().padStart(2, '0');
    const d = birthDay.trim().padStart(2, '0');
    return y ? [y, m, d].filter(Boolean).join('-') : null;
  }

  function bonGwanDisplay() {
    return bonGwanSelected?.name ?? (skipBonGwan ? '나중에 입력' : (bonGwanQuery.trim() || '—'));
  }

  // ─── 렌더 ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>Orgcell</div>
        <p style={s.title}>박물관 개설</p>
        <StepDots step={modeToStep(mode)} />

        {mode === MODE.INPUT && (
          <InputStep
            lastName={lastName} setLastName={setLastName}
            firstName={firstName} setFirstName={setFirstName}
            gender={gender} setGender={setGender}
            birthYear={birthYear} setBirthYear={setBirthYear}
            birthMonth={birthMonth} setBirthMonth={setBirthMonth}
            birthDay={birthDay} setBirthDay={setBirthDay}
            lunarBirth={lunarBirth} setLunarBirth={setLunarBirth}
            bonGwanQuery={bonGwanQuery} bonGwanList={bonGwanList}
            bonGwanSelected={bonGwanSelected} skipBonGwan={skipBonGwan}
            onBonGwanInput={handleBonGwanInput}
            onBonGwanSelect={(item) => { setBonGwanSelected(item); setBonGwanQuery(item.name); setBonGwanList([]); }}
            onSkipBonGwan={(v) => { setSkipBonGwan(v); if (v) { setBonGwanSelected(null); setBonGwanQuery(''); } }}
            parentFather={parentFather} setParentFather={setParentFather}
            parentMother={parentMother} setParentMother={setParentMother}
            otherNames={otherNames}
            onAddOtherName={addOtherName} onRemoveOtherName={removeOtherName} onUpdateOtherName={updateOtherName}
            engLast={engLast} setEngLast={setEngLast}
            engFirst={engFirst} setEngFirst={setEngFirst}
          />
        )}

        {mode === MODE.CANDIDATES && (
          <CandidatesStep
            candidates={candidates}
            selected={selectedCandidate}
            onSelect={(c) => { setSelectedCandidate(c); setMode(MODE.ADDITIONAL); }}
            onNotMe={() => setMode(MODE.CONFIRM_NEW)}
          />
        )}

        {mode === MODE.ADDITIONAL && selectedCandidate && (
          <AdditionalStep
            candidate={selectedCandidate}
            birthPlace={addBirthPlace} setBirthPlace={setAddBirthPlace}
            spouse={addSpouse}         setSpouse={setAddSpouse}
            children={addChildren}     setChildren={setAddChildren}
            siblings={addSiblings}     setSiblings={setAddSiblings}
          />
        )}

        {(mode === MODE.NO_MATCH || mode === MODE.CONFIRM_NEW) && (
          <ConfirmNewStep
            lastName={lastName} firstName={firstName} gender={gender}
            birthDate={buildBirthDate()} lunarBirth={lunarBirth}
            bonGwan={bonGwanDisplay()} engLast={engLast} engFirst={engFirst}
            noMatch={mode === MODE.NO_MATCH}
          />
        )}

        {/* 버튼 영역 */}
        <div style={s.btnRow}>
          {/* 이전 버튼 */}
          {mode === MODE.CANDIDATES && (
            <button style={s.prevBtn} onClick={() => setMode(MODE.INPUT)} disabled={busy}>← 이전</button>
          )}
          {mode === MODE.ADDITIONAL && (
            <button style={s.prevBtn} onClick={() => setMode(MODE.CANDIDATES)} disabled={busy}>← 이전</button>
          )}
          {(mode === MODE.NO_MATCH || mode === MODE.CONFIRM_NEW) && (
            <button style={s.prevBtn} onClick={() => setMode(mode === MODE.NO_MATCH ? MODE.INPUT : MODE.CANDIDATES)} disabled={busy}>
              ← 이전
            </button>
          )}

          {/* 다음/실행 버튼 */}
          {mode === MODE.INPUT && (
            <button style={{ ...s.nextBtn, opacity: busy ? 0.7 : 1 }} onClick={handleSearch} disabled={busy}>
              {busy ? '검색 중…' : '기존 박물관 찾기 →'}
            </button>
          )}
          {mode === MODE.ADDITIONAL && (
            <button style={{ ...s.nextBtn, opacity: busy ? 0.7 : 1 }} onClick={handleLinkAccount} disabled={busy}>
              {busy ? '연결 중…' : '이분이 맞습니다 — 계정 연결'}
            </button>
          )}
          {(mode === MODE.NO_MATCH || mode === MODE.CONFIRM_NEW) && (
            <button style={{ ...s.nextBtn, opacity: busy ? 0.7 : 1 }} onClick={handleCreateNew} disabled={busy}>
              {busy ? '개설 중…' : '새 박물관 개설하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: 정보 입력 ────────────────────────────────────────────────────────
function InputStep({
  lastName, setLastName, firstName, setFirstName,
  gender, setGender,
  birthYear, setBirthYear, birthMonth, setBirthMonth, birthDay, setBirthDay,
  lunarBirth, setLunarBirth,
  bonGwanQuery, bonGwanList, bonGwanSelected, skipBonGwan,
  onBonGwanInput, onBonGwanSelect, onSkipBonGwan,
  parentFather, setParentFather, parentMother, setParentMother,
  otherNames, onAddOtherName, onRemoveOtherName, onUpdateOtherName,
  engLast, setEngLast, engFirst, setEngFirst,
}) {
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>1단계 — 본인 확인</p>
      <p style={s.hint}>기존에 생성된 본인이나 가족의 박물관이 있는지 확인하겠습니다.</p>

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
        <span style={s.lbl}>생년월일 <Opt /></span>
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

      {/* 본관 */}
      <div style={s.field}>
        <span style={s.lbl}>본관 <Opt /></span>
        <input
          style={{ ...s.input, opacity: skipBonGwan ? 0.4 : 1 }}
          value={bonGwanQuery}
          onChange={(e) => onBonGwanInput(e.target.value)}
          placeholder="예) 전주, 경주…"
          disabled={skipBonGwan}
        />
        {bonGwanList.length > 0 && !skipBonGwan && (
          <ul style={s.autocomplete}>
            {bonGwanList.map((item) => (
              <li key={item.id ?? item.bon_gwan_ko} style={s.acItem} onClick={() => onBonGwanSelect({ id: item.id, name: item.bon_gwan_ko })}>
                {item.bon_gwan_ko}
              </li>
            ))}
          </ul>
        )}
        {bonGwanSelected && !skipBonGwan && <p style={s.selectedTag}>✓ {bonGwanSelected.name} 선택됨</p>}
        <label style={s.checkLabel}>
          <input type="checkbox" checked={skipBonGwan} onChange={(e) => onSkipBonGwan(e.target.checked)} />
          &nbsp;모름 — 나중에 입력
        </label>
      </div>

      {/* 부모 이름 */}
      <div style={s.row2}>
        <label style={s.field}>
          <span style={s.lbl}>부(父) 이름 <Opt /></span>
          <input style={s.input} value={parentFather} onChange={(e) => setParentFather(e.target.value)} placeholder="예) 이철수" />
        </label>
        <label style={s.field}>
          <span style={s.lbl}>모(母) 이름 <Opt /></span>
          <input style={s.input} value={parentMother} onChange={(e) => setParentMother(e.target.value)} placeholder="예) 김영희" />
        </label>
      </div>

      {/* 다른 이름 */}
      <div style={s.field}>
        <span style={s.lbl}>다른 이름 <Opt /></span>
        {otherNames.map((o, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <input
              style={{ ...s.input, flex: 1 }}
              value={o.name}
              onChange={(e) => onUpdateOtherName(i, 'name', e.target.value)}
              placeholder="이름"
            />
            <select
              style={{ ...s.input, width: 100 }}
              value={o.type}
              onChange={(e) => onUpdateOtherName(i, 'type', e.target.value)}
            >
              <option>어릴때</option>
              <option>개명전</option>
              <option>별명</option>
              <option>기타</option>
            </select>
            <button style={s.removeBtn} onClick={() => onRemoveOtherName(i)}>✕</button>
          </div>
        ))}
        <button style={s.addBtn} onClick={onAddOtherName}>+ 다른 이름 추가</button>
      </div>

      {/* 영문 여권명 */}
      <p style={s.sectionTitle}>영문 여권명 <Opt /></p>
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

// ─── Step 2A: 후보 목록 ────────────────────────────────────────────────────────
function CandidatesStep({ candidates, selected, onSelect, onNotMe }) {
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>2단계 — 검색 결과</p>
      <p style={s.hint}>아래 인물 중 본인이 있으면 선택해주세요.</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {candidates.map((c) => (
          <li key={c.person_id} style={{ ...s.candidateCard, border: selected?.person_id === c.person_id ? '2px solid #8B7355' : '1px solid #C4A882' }}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{c.name}</strong>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{c.birth_date ? c.birth_date.slice(0, 10) : '생년 미상'} · {c.gender === 'M' ? '남' : c.gender === 'F' ? '여' : '?'}</span>
              <span style={{ fontSize: 11, color: c.match_strength === 'strong' ? '#5a8a55' : c.match_strength === 'medium' ? '#8a7a35' : '#888', marginLeft: 8 }}>
                {c.match_strength === 'strong' ? '높은 일치' : c.match_strength === 'medium' ? '부분 일치' : '이름 일치'}
              </span>
            </div>
            <button style={s.nextBtn} onClick={() => onSelect(c)}>이분입니다</button>
          </li>
        ))}
      </ul>
      <button style={{ ...s.prevBtn, marginTop: 8 }} onClick={onNotMe}>해당 없음 — 새로 만들기</button>
    </div>
  );
}

// ─── Step 2A-2: 추가 확인 ────────────────────────────────────────────────────
function AdditionalStep({ candidate, birthPlace, setBirthPlace, spouse, setSpouse, children, setChildren, siblings, setSiblings }) {
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>2단계 — 추가 확인</p>
      <p style={s.hint}>
        <strong>{candidate.name}</strong>님과 동일인인지 확인하겠습니다.<br />
        아는 정보만 입력하세요.
      </p>
      <label style={s.field}>
        <span style={s.lbl}>출생지 <Opt /></span>
        <input style={s.input} value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="예) 서울 종로구" />
      </label>
      <label style={s.field}>
        <span style={s.lbl}>배우자 이름 <Opt /></span>
        <input style={s.input} value={spouse} onChange={(e) => setSpouse(e.target.value)} placeholder="예) 박민주" />
      </label>
      <label style={s.field}>
        <span style={s.lbl}>자녀 이름 <Opt /></span>
        <input style={s.input} value={children} onChange={(e) => setChildren(e.target.value)} placeholder="예) 이준호, 이수아" />
      </label>
      <label style={s.field}>
        <span style={s.lbl}>형제자매 이름 <Opt /></span>
        <input style={s.input} value={siblings} onChange={(e) => setSiblings(e.target.value)} placeholder="예) 이상민, 이미나" />
      </label>
    </div>
  );
}

// ─── Step 2B: 새 생성 확인 ───────────────────────────────────────────────────
function ConfirmNewStep({ lastName, firstName, gender, birthDate, lunarBirth, bonGwan, engLast, engFirst, noMatch }) {
  const engName = [engLast, engFirst].filter(Boolean).join(' ') || '—';
  const birthStr = birthDate ? birthDate + (lunarBirth ? ' (음력)' : '') : '—';
  return (
    <div style={s.stepBody}>
      <p style={s.stepLabel}>
        {noMatch ? '후보 없음 — 새 박물관 개설' : '새 박물관 개설'}
      </p>
      {noMatch && <p style={s.hint}>기존 박물관에서 일치하는 인물을 찾지 못했습니다. 새 박물관을 개설합니다.</p>}
      <table style={s.table}>
        <tbody>
          <Row label="이름"         value={`${lastName} ${firstName}`} />
          <Row label="성별"         value={gender === 'M' ? '남' : '여'} />
          <Row label="생년월일"     value={birthStr} />
          <Row label="본관"         value={bonGwan} />
          <Row label="영문 여권명"  value={engName} />
        </tbody>
      </table>
      <p style={s.hint}>정보가 맞으면 아래 버튼을 눌러 박물관을 개설합니다.</p>
    </div>
  );
}

// ─── 공통 소컴포넌트 ──────────────────────────────────────────────────────────
function Req() { return <span style={{ color: '#C0392B' }}>*</span>; }
function Opt() { return <span style={s.opt}>(선택)</span>; }

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
  wrap:       { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', padding: 16 },
  card:       { background: '#FDFBF7', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '2px 2px 0 #c4a87a', borderRadius: 4, padding: '40px 36px 36px', width: '100%', maxWidth: 480 },
  logo:       { fontFamily: 'serif', fontSize: 24, fontWeight: 700, color: '#8B7355', letterSpacing: 2, textAlign: 'center' },
  title:      { textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#5a4a35', margin: '6px 0 16px' },
  dots:       { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot:        { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
  stepBody:   { display: 'flex', flexDirection: 'column', gap: 14, minHeight: 260 },
  stepLabel:  { fontSize: 13, color: '#8B7355', fontWeight: 600, margin: 0, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 13, color: '#8B7355', margin: '8px 0 0', fontWeight: 600 },
  hint:       { fontSize: 12, color: '#A09070', margin: 0, lineHeight: 1.5 },
  field:      { display: 'flex', flexDirection: 'column', gap: 4 },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  lbl:        { fontSize: 12, color: '#6a5a45', fontWeight: 600 },
  opt:        { fontSize: 11, color: '#A09070', fontWeight: 400 },
  input:      { padding: '9px 10px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 14, color: '#333', background: '#FAFAF5', outline: 'none', width: '100%', boxSizing: 'border-box' },
  radioRow:   { display: 'flex', gap: 20, paddingTop: 4 },
  checkLabel: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#5a4a35', cursor: 'pointer', gap: 4 },
  autocomplete: { listStyle: 'none', margin: '0', padding: 0, border: '1px solid #C4A882', borderRadius: 4, background: '#fff', maxHeight: 160, overflowY: 'auto' },
  acItem:     { padding: '8px 12px', fontSize: 14, color: '#333', cursor: 'pointer', borderBottom: '1px solid #F0EAE0' },
  selectedTag: { fontSize: 13, color: '#5a8a55', margin: 0 },
  candidateCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 4, background: '#FAFAF5', cursor: 'default' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  tdLabel:    { fontSize: 13, color: '#8B7355', fontWeight: 600, padding: '7px 0', width: 90, verticalAlign: 'top' },
  tdValue:    { fontSize: 14, color: '#333', padding: '7px 0 7px 8px', borderBottom: '1px solid #F0EAE0' },
  btnRow:     { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28 },
  prevBtn:    { padding: '9px 20px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 14, color: '#8B7355', cursor: 'pointer' },
  nextBtn:    { padding: '9px 24px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.5 },
  addBtn:     { padding: '6px 14px', background: 'none', border: '1px dashed #C4A882', borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer', alignSelf: 'flex-start' },
  removeBtn:  { padding: '0 8px', background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: 16, lineHeight: '38px' },
};
