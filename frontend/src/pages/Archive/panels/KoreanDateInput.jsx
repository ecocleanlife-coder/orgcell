/**
 * panels/KoreanDateInput.jsx — 한국식 년-월-일 날짜 입력
 *
 * 브라우저 로캘과 무관하게 항상 YYYY-MM-DD 순서로 표시.
 * <input type="date"> 대신 세 개의 드롭다운/텍스트를 사용해
 * mm/dd/yyyy 브라우저 기본 동작을 완전히 차단한다.
 *
 * Props:
 *   value    : "YYYY-MM-DD" 문자열 (없으면 "")
 *   onChange : (isoString: string) => void  — "YYYY-MM-DD" 또는 ""
 *   required : bool (기본 false)
 *   disabled : bool (기본 false)
 *
 * 사용:
 *   <KoreanDateInput value={form.deathDate} onChange={v => setForm(f => ({ ...f, deathDate: v }))} />
 */

import { useState, useEffect } from 'react';

// 월 목록
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

// 해당 년/월의 마지막 날 계산
function lastDay(y, m) {
  if (!y || !m) return 31;
  return new Date(Number(y), Number(m), 0).getDate();
}

export default function KoreanDateInput({ value = '', onChange, required = false, disabled = false }) {
  // value "YYYY-MM-DD" → 파싱
  const [y, m, d] = value ? value.split('-') : ['', '', ''];

  const [year,  setYear]  = useState(y ?? '');
  const [month, setMonth] = useState(m ?? '');
  const [day,   setDay]   = useState(d ?? '');

  // 외부 value 변경 시 동기화 (예: 폼 리셋)
  useEffect(() => {
    const [ny = '', nm = '', nd = ''] = value ? value.split('-') : [];
    setYear(ny); setMonth(nm); setDay(nd);
  }, [value]);

  // 내부 변경 → 부모에 ISO 문자열 전달
  function emit(ny, nm, nd) {
    if (ny && nm && nd) {
      onChange(`${ny}-${nm.padStart(2,'0')}-${nd.padStart(2,'0')}`);
    } else {
      onChange('');
    }
  }

  function handleYear(v) {
    const val = v.replace(/\D/g, '').slice(0, 4);
    setYear(val);
    emit(val, month, day);
  }

  function handleMonth(v) {
    setMonth(v);
    // 월 변경 시 일이 범위 초과하면 리셋
    const max = lastDay(year, v);
    const nd  = day && Number(day) > max ? '' : day;
    setDay(nd);
    emit(year, v, nd);
  }

  function handleDay(v) {
    setDay(v);
    emit(year, month, v);
  }

  const days = Array.from({ length: lastDay(year, month) }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );

  return (
    <div style={s.wrap}>
      {/* 년 */}
      <input
        style={{ ...s.inp, width: 72 }}
        type="text"
        inputMode="numeric"
        placeholder="년"
        value={year}
        onChange={e => handleYear(e.target.value)}
        disabled={disabled}
        required={required}
        maxLength={4}
        aria-label="년"
      />
      <span style={s.sep}>년</span>

      {/* 월 */}
      <select
        style={{ ...s.sel, width: 60 }}
        value={month}
        onChange={e => handleMonth(e.target.value)}
        disabled={disabled}
        aria-label="월"
      >
        <option value="">월</option>
        {MONTHS.map(mo => (
          <option key={mo} value={mo}>{Number(mo)}월</option>
        ))}
      </select>

      {/* 일 */}
      <select
        style={{ ...s.sel, width: 60 }}
        value={day}
        onChange={e => handleDay(e.target.value)}
        disabled={disabled || !month}
        aria-label="일"
      >
        <option value="">일</option>
        {days.map(dd => (
          <option key={dd} value={dd}>{Number(dd)}일</option>
        ))}
      </select>
    </div>
  );
}

const s = {
  wrap: { display: 'flex', alignItems: 'center', gap: 4 },
  inp:  { border: '1px solid #C4A882', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#FDFBF7', outline: 'none', boxSizing: 'border-box' },
  sel:  { border: '1px solid #C4A882', borderRadius: 4, padding: '6px 4px', fontSize: 13, background: '#FDFBF7', outline: 'none', cursor: 'pointer' },
  sep:  { fontSize: 12, color: '#8B7355', flexShrink: 0 },
};
