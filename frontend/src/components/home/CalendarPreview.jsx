import React from 'react';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 샘플 이벤트 (가족행사)
const EVENTS = {
    3: { label: '할아버지 생신', color: '#E74C3C' },
    8: { label: '결혼기념일', color: '#E67E22' },
    15: { label: '아들 생일', color: '#3498DB' },
    22: { label: '추석', color: '#27AE60' },
};

export default function CalendarPreview() {
    const today = 15;
    const days = Array.from({ length: 30 }, (_, i) => i + 1);

    return (
        <div style={{
            background: '#FFFDF7',
            borderRadius: 20,
            padding: '24px 20px',
            border: '1px solid #E8E3D8',
            maxWidth: 340,
            width: '100%',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(61,32,8,0.06)',
        }}>
            {/* 월 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{
                    fontSize: 18, fontWeight: 700, color: '#3D2008',
                    fontFamily: 'Georgia, serif',
                }}>
                    2026년 4월
                </span>
            </div>

            {/* 요일 헤더 */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2, marginBottom: 8, textAlign: 'center',
            }}>
                {DAYS.map(d => (
                    <span key={d} style={{
                        fontSize: 11, fontWeight: 600,
                        color: d === '일' ? '#E74C3C' : d === '토' ? '#3498DB' : '#999',
                    }}>{d}</span>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 3, textAlign: 'center',
            }}>
                {/* 시작 요일 오프셋 (수요일 시작) */}
                {[0, 1, 2].map(i => <div key={`e${i}`} />)}
                {days.map(day => {
                    const ev = EVENTS[day];
                    const isToday = day === today;
                    return (
                        <div key={day} style={{
                            position: 'relative', padding: '6px 0',
                            borderRadius: 10,
                            background: isToday ? '#3D2008' : ev ? `${ev.color}12` : 'transparent',
                            cursor: ev ? 'pointer' : 'default',
                            transition: 'transform 0.2s',
                        }}>
                            <span style={{
                                fontSize: 13, fontWeight: isToday ? 700 : 400,
                                color: isToday ? '#fff' : ev ? ev.color : '#555',
                            }}>{day}</span>
                            {ev && (
                                <div style={{
                                    width: 4, height: 4, borderRadius: '50%',
                                    background: ev.color, margin: '2px auto 0',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 이벤트 리스트 */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(EVENTS).map(([day, ev]) => (
                    <div key={day} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', borderRadius: 10,
                        background: `${ev.color}08`,
                    }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: ev.color, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 12, color: '#555' }}>
                            {day}일 — {ev.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
