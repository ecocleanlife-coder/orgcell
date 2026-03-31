import React from 'react';

const FAMILY = [
    { gen: 0, members: [{ name: '김영수', year: '1938', role: '할아버지' }, { name: '박순자', year: '1940', role: '할머니' }] },
    { gen: 1, members: [{ name: '김철수', year: '1965', role: '아버지' }, { name: '이영희', year: '1968', role: '어머니' }] },
    { gen: 2, members: [{ name: '김지훈', year: '1992', role: '아들' }, { name: '김수진', year: '1995', role: '딸' }] },
];

const FOLDER_COLORS = ['#F5DEB3', '#E8D4A8', '#D4C5A0'];

function FolderCard({ name, year, role, color }) {
    return (
        <div style={{
            background: `linear-gradient(145deg, ${color}, ${color}CC)`,
            borderRadius: 14,
            padding: '14px 16px',
            minWidth: 100,
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 3px 12px rgba(61,32,8,0.08)',
            border: '1px solid rgba(61,32,8,0.08)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
        }}>
            {/* 폴더 탭 */}
            <div style={{
                position: 'absolute', top: -8, left: 12,
                width: 32, height: 10, borderRadius: '6px 6px 0 0',
                background: color,
                border: '1px solid rgba(61,32,8,0.08)',
                borderBottom: 'none',
            }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3D2008', marginBottom: 2 }}>
                {name}
            </div>
            <div style={{ fontSize: 11, color: '#7A6E5E' }}>
                {role} · {year}
            </div>
        </div>
    );
}

export default function FamilyTreePreview() {
    return (
        <div style={{
            background: '#FFFDF7',
            borderRadius: 20,
            padding: '28px 20px',
            border: '1px solid #E8E3D8',
            maxWidth: 360,
            width: '100%',
            margin: '0 auto',
            boxShadow: '0 8px 32px rgba(61,32,8,0.06)',
        }}>
            {FAMILY.map((gen, gi) => (
                <div key={gi}>
                    {/* 세대 라벨 */}
                    <div style={{
                        textAlign: 'center', fontSize: 11, fontWeight: 600,
                        color: '#A09882', marginBottom: 10,
                        letterSpacing: 1,
                    }}>
                        {gi === 0 ? '1세대' : gi === 1 ? '2세대' : '3세대'}
                    </div>

                    {/* 멤버 카드 */}
                    <div style={{
                        display: 'flex', justifyContent: 'center',
                        gap: 12, marginBottom: gi < FAMILY.length - 1 ? 0 : 0,
                    }}>
                        {gen.members.map(m => (
                            <FolderCard
                                key={m.name}
                                name={m.name}
                                year={m.year}
                                role={m.role}
                                color={FOLDER_COLORS[gi]}
                            />
                        ))}
                    </div>

                    {/* 연결선 */}
                    {gi < FAMILY.length - 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'center',
                            padding: '8px 0',
                        }}>
                            <div style={{
                                width: 2, height: 24,
                                background: 'linear-gradient(to bottom, #D4C5A0, #E8E3D8)',
                                borderRadius: 1,
                            }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
