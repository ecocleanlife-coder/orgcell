/**
 * DateInputKo.jsx — 한국어 날짜 입력 (YYYY년 MM월 DD일)
 * value: "YYYY-MM-DD" 또는 "" / onChange: (val: "YYYY-MM-DD" | "") => void
 */

/** "1994-07-27" → "1994년 7월 27일", isLunar=true → "1994년 7월 27일 (음력)" */
export function formatDateKo(dateStr, isLunar) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const parts = [];
    if (y && parseInt(y)) parts.push(`${parseInt(y)}년`);
    if (m && parseInt(m)) parts.push(`${parseInt(m)}월`);
    if (d && parseInt(d)) parts.push(`${parseInt(d)}일`);
    if (!parts.length) return '';
    return isLunar ? `${parts.join(' ')} (음력)` : parts.join(' ');
}

function pad2(n) { return n ? String(n).padStart(2, '0') : ''; }

export default function DateInputKo({ value, onChange, inputStyle, style }) {
    const parts = value ? value.split('-') : ['', '', ''];
    const yVal = parts[0] ? parseInt(parts[0]) : '';
    const mVal = parts[1] ? parseInt(parts[1]) : '';
    const dVal = parts[2] ? parseInt(parts[2]) : '';

    const BASE = {
        border: '1.5px solid #DDD5C8',
        background: '#FAFAF7',
        borderRadius: 5,
        fontSize: 14,
        color: '#3D2008',
        outline: 'none',
        padding: '5px 4px',
        textAlign: 'center',
        MozAppearance: 'textfield',
        WebkitAppearance: 'none',
        ...inputStyle,
    };

    const LABEL = { color: '#5a4a3a', fontSize: 14, userSelect: 'none' };

    function emit(y, m, d) {
        if (!y) { onChange(''); return; }
        const yStr = String(y).padStart(4, '0');
        const mStr = pad2(m || 1);
        const dStr = pad2(d || 1);
        onChange(`${yStr}-${mStr}-${dStr}`);
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap', ...style }}>
            <input
                type="number" placeholder="YYYY" min={1900} max={2100}
                style={{ ...BASE, width: 62 }}
                value={yVal}
                onChange={e => emit(e.target.value, mVal, dVal)}
            />
            <span style={LABEL}>년</span>
            <input
                type="number" placeholder="MM" min={1} max={12}
                style={{ ...BASE, width: 40 }}
                value={mVal}
                onChange={e => emit(yVal, e.target.value, dVal)}
            />
            <span style={LABEL}>월</span>
            <input
                type="number" placeholder="DD" min={1} max={31}
                style={{ ...BASE, width: 40 }}
                value={dVal}
                onChange={e => emit(yVal, mVal, e.target.value)}
            />
            <span style={LABEL}>일</span>
        </div>
    );
}
