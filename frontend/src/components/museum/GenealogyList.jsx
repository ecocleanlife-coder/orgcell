/**
 * GenealogyList.jsx — 가계도 색인 & 내비게이션 사이드바
 *
 * - 트리의 모든 인물(z=0 + z=1)을 세대별 그룹으로 표시
 * - 클릭 → onWormhole(personId) 호출 → 즉시 박물관 이동(Hard Reset 포함)
 * - position: fixed 오버레이 (Canvas 레이아웃 변경 없음)
 * - 슬라이드 인/아웃 CSS transition
 */
import React, { useMemo, useState } from 'react';

const Y_GAP = 280; // buildTree.js와 동일

// ── 세대 분류 ──────────────────────────────────────
const GENERATION_GROUPS = [
    { key: 'roots',   label: '뿌리 세대',   icon: '🌳', test: (y) => y >= Y_GAP * 2 },
    { key: 'parents', label: '부모 세대',   icon: '👫', test: (y) => y > 0 && y < Y_GAP * 2 },
    { key: 'us',      label: '우리 세대',   icon: '⭐', test: (y) => y === 0 },
    { key: 'future1', label: '자녀 세대',   icon: '🌱', test: (y) => y < 0 && y > -Y_GAP * 2 },
    { key: 'future2', label: '손자녀 세대', icon: '✨', test: (y) => y <= -Y_GAP * 2 },
];

function groupNodes(nodes, mainPersonId) {
    const groups = GENERATION_GROUPS.map(g => ({ ...g, persons: [] }));
    const storage = [];

    for (const node of nodes) {
        if (node.data?.isVirtual) continue; // 임시 노드 제외

        const item = {
            id: node.id,
            name: node.data?.displayName || '?',
            gender: node.data?.gender || '?',
            dateLabel: node.data?.dateLabel || '',
            isDeceased: node.data?.isDeceased || false,
            isMain: String(node.id) === String(mainPersonId),
            z: node.z,
            y: node.y,
        };

        if (node.z !== 0) {
            storage.push(item);
            continue;
        }

        const group = groups.find(g => g.test(node.y));
        if (group) group.persons.push(item);
        else storage.push(item); // 범위 초과 → 수장고
    }

    // 각 그룹 내 정렬: y 내림차순, 같은 y는 x 오름차순
    for (const g of groups) {
        g.persons.sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y;
            const na = nodes.find(n => String(n.id) === String(a.id));
            const nb = nodes.find(n => String(n.id) === String(b.id));
            return (na?.x ?? 0) - (nb?.x ?? 0);
        });
    }

    return { groups: groups.filter(g => g.persons.length > 0), storage };
}

// ── 성별 아이콘 ────────────────────────────────────
function GenderDot({ gender }) {
    const color = gender === 'M' ? '#5B9BD5' : '#D55B9B';
    return (
        <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: color, marginRight: 5, flexShrink: 0,
        }} />
    );
}

// ── 개별 인물 행 ────────────────────────────────────
function PersonRow({ person, onClick }) {
    const isMain = person.isMain;

    return (
        <button
            onClick={() => onClick(person.id)}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: isMain ? 'rgba(196,168,79,0.15)' : 'transparent',
                border: isMain ? '1px solid #C4A84F' : '1px solid transparent',
                borderRadius: 6,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
                marginBottom: 2,
            }}
            onMouseEnter={e => { if (!isMain) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { if (!isMain) e.currentTarget.style.background = 'transparent'; }}
        >
            <GenderDot gender={person.gender} />
            <span style={{
                fontSize: 13,
                fontWeight: isMain ? 700 : 400,
                color: isMain ? '#C4A84F' : (person.isDeceased ? '#8A8070' : '#E8E0D0'),
                fontFamily: 'Georgia, "Noto Serif KR", serif',
                flex: 1,
                textDecoration: person.isDeceased ? 'line-through' : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {person.name}
                {isMain && <span style={{ fontSize: 10, marginLeft: 5, color: '#C4A84F' }}>★ 관장</span>}
            </span>
            {person.dateLabel && (
                <span style={{ fontSize: 10, color: '#6A6050', flexShrink: 0 }}>
                    {person.dateLabel}
                </span>
            )}
        </button>
    );
}

// ── 세대 그룹 섹션 ─────────────────────────────────
function GenerationGroup({ group, onWormhole, collapsible = false }) {
    const [open, setOpen] = useState(true);

    return (
        <div style={{ marginBottom: 12 }}>
            <button
                onClick={() => collapsible && setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', background: 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: 4, cursor: collapsible ? 'pointer' : 'default',
                    marginBottom: 4,
                }}
            >
                <span style={{ fontSize: 13 }}>{group.icon}</span>
                <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                    color: '#A09070', textTransform: 'uppercase', flex: 1, textAlign: 'left',
                }}>
                    {group.label}
                </span>
                <span style={{ fontSize: 10, color: '#6A6050' }}>
                    {group.persons.length}명{collapsible ? (open ? ' ▴' : ' ▾') : ''}
                </span>
            </button>
            {open && group.persons.map(p => (
                <PersonRow key={p.id} person={p} onClick={onWormhole} />
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════
export default function GenealogyList({ nodes = [], mainPersonId, onWormhole, onClose }) {
    const { groups, storage } = useMemo(
        () => groupNodes(nodes, mainPersonId),
        [nodes, mainPersonId]
    );

    const [showStorage, setShowStorage] = useState(false);

    const handleWormhole = (personId) => {
        if (String(personId) === String(mainPersonId)) return;
        if (onWormhole) onWormhole(personId);
        if (onClose) onClose();
    };

    return (
        <>
            {/* ── 반투명 백드롭 (모바일에서 닫기용) ── */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 49,
                    background: 'transparent',
                }}
            />

            {/* ── 사이드바 패널 ── */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: 260,
                    height: '100dvh',
                    zIndex: 50,
                    background: 'rgba(20,17,12,0.97)',
                    borderRight: '1px solid rgba(196,168,79,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                }}
            >
                {/* ── 헤더 ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 14px 12px',
                    borderBottom: '1px solid rgba(196,168,79,0.2)',
                    flexShrink: 0,
                }}>
                    <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#C4A84F', margin: 0 }}>
                            가계도 색인
                        </p>
                        <p style={{ fontSize: 10, color: '#6A6050', margin: '2px 0 0' }}>
                            클릭하면 해당 박물관으로 이동
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 28, height: 28, borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#A09070', fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* ── 스크롤 목록 ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 4px 12px 8px' }}>

                    {/* 세대별 그룹 */}
                    {groups.map(group => (
                        <GenerationGroup
                            key={group.key}
                            group={group}
                            onWormhole={handleWormhole}
                            collapsible={group.key !== 'us'}
                        />
                    ))}

                    {/* 수장고 — z=1 방계 인원 */}
                    {storage.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: '1px dashed rgba(196,168,79,0.2)', paddingTop: 10 }}>
                            <button
                                onClick={() => setShowStorage(s => !s)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '4px 10px', background: 'none',
                                    border: 'none', cursor: 'pointer', marginBottom: 4,
                                }}
                            >
                                <span style={{ fontSize: 13 }}>🗄</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6A6050', letterSpacing: '0.05em', flex: 1, textAlign: 'left' }}>
                                    수장고
                                </span>
                                <span style={{ fontSize: 10, color: '#4A4030' }}>
                                    {storage.length}명 {showStorage ? '▴' : '▾'}
                                </span>
                            </button>
                            {showStorage && storage.map(p => (
                                <PersonRow
                                    key={p.id}
                                    person={{ ...p, isDeceased: true }} // 수장고는 흐리게
                                    onClick={handleWormhole}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── 푸터 ── */}
                <div style={{
                    padding: '10px 14px',
                    borderTop: '1px solid rgba(196,168,79,0.15)',
                    flexShrink: 0,
                }}>
                    <p style={{ fontSize: 9, color: '#4A4030', margin: 0, lineHeight: 1.5 }}>
                        트리 제외 인원은 수장고(🗄)에 보관됩니다.
                    </p>
                </div>
            </div>
        </>
    );
}
