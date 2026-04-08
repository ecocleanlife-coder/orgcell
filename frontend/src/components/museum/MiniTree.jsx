/**
 * MiniTree.jsx — 자료실 좌측 간이 직계 트리 (§23)
 * - onPersonClick: 클릭 시 콜백(personId) — 없으면 navigate
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARD_W = 64;
const CARD_H = 72;
const GAP = 8;
const SLOT = CARD_W + GAP;

const GOLD = '#C4A882';
const GOLD_DARK = '#8B7355';
const BG = '#FDF8F0';
const TEXT = '#3a3020';
const TEXT_SUB = '#7a6a50';

function MiniCard({ person, isMe, onClick }) {
    const initials = person.name ? person.name.slice(0, 2) : '?';
    const genderColor = person.gender === 'female' ? '#C4956A' : '#7BA7C4';

    return (
        <div
            onClick={() => onClick(person.id)}
            title={`${person.name}`}
            style={{
                width: CARD_W,
                height: CARD_H,
                border: isMe ? `2px solid ${GOLD_DARK}` : `1px solid ${GOLD}`,
                borderRight: isMe ? '3px solid #9a7a50' : '2px solid #b09060',
                borderBottom: isMe ? '3px solid #7a6040' : '2px solid #9a7a50',
                borderRadius: 4,
                background: isMe ? '#FDF8F0' : '#FAFAF5',
                boxShadow: isMe ? '2px 2px 0 #c4a87a, 4px 4px 0 #b09060' : '1px 1px 0 #c4a87a',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'opacity 0.15s',
                flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
            {person.photo_url ? (
                <img src={person.photo_url} alt={person.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${GOLD}` }} />
            ) : (
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: genderColor + '33', border: `1px solid ${genderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: genderColor,
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                }}>
                    {initials}
                </div>
            )}
            <div style={{
                fontSize: 10, fontWeight: isMe ? 700 : 500,
                color: isMe ? TEXT : TEXT_SUB,
                fontFamily: 'Georgia, serif',
                maxWidth: CARD_W - 8,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {person.name}
            </div>
        </div>
    );
}

function ConnectorV({ height = 12 }) {
    return <div style={{ width: 1, height, background: GOLD, margin: '0 auto', flexShrink: 0 }} />;
}

export default function MiniTree({ persons = [], relations = [], currentPersonId, subdomain, onPersonClick }) {
    const navigate = useNavigate();

    const handleClick = (personId) => {
        if (onPersonClick) {
            onPersonClick(personId);
        } else {
            navigate(`/${subdomain}/archive/${personId}`);
        }
    };

    const idStr = String(currentPersonId);
    const personMap = new Map(persons.map(p => [String(p.id), p]));
    const me = personMap.get(idStr);
    if (!me) return null;

    // 부모 (persons 직접 컬럼 + relations 보완)
    const parent1 = me.parent1_id ? personMap.get(String(me.parent1_id)) : null;
    const parent2 = me.parent2_id ? personMap.get(String(me.parent2_id)) : null;

    // 배우자 (spouse_id 또는 relations)
    let spouse = me.spouse_id ? personMap.get(String(me.spouse_id)) : null;
    if (!spouse) {
        const spouseRel = relations.find(r =>
            r.relation_type === 'spouse' &&
            (String(r.person1_id) === idStr || String(r.person2_id) === idStr)
        );
        if (spouseRel) {
            const sid = String(spouseRel.person1_id) === idStr ? spouseRel.person2_id : spouseRel.person1_id;
            spouse = personMap.get(String(sid)) || null;
        }
    }

    // 자녀
    const children = persons.filter(p => {
        if (String(p.id) === idStr) return false;
        if (String(p.parent1_id) === idStr || String(p.parent2_id) === idStr) return true;
        if (spouse && (String(p.parent1_id) === String(spouse.id) || String(p.parent2_id) === String(spouse.id))) return true;
        return false;
    });

    const displayChildren = children.slice(0, 5);
    const extraCount = children.length > 5 ? children.length - 5 : 0;

    // §23 수평 연결선 너비: 첫 자녀 중앙 ~ 마지막 자녀 중앙
    const childColCount = displayChildren.length + (extraCount > 0 ? 1 : 0);
    const hBarWidth = (childColCount - 1) * SLOT;

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 0, width: '100%', minWidth: 140, userSelect: 'none',
        }}>
            {/* 부모 행 */}
            {(parent1 || parent2) && (
                <>
                    <div style={{
                        display: 'flex', gap: GAP, alignItems: 'flex-end',
                        alignSelf: me.gender !== 'female' ? 'flex-start' : 'flex-end',
                    }}>
                        {parent1 && <MiniCard person={parent1} isMe={false} onClick={handleClick} />}
                        {parent2 && <MiniCard person={parent2} isMe={false} onClick={handleClick} />}
                    </div>
                    <ConnectorV height={12} />
                </>
            )}

            {/* 나 + 배우자 행 */}
            <div style={{ display: 'flex', gap: GAP, alignItems: 'center' }}>
                {me.gender !== 'female' && <MiniCard person={me} isMe={true} onClick={handleClick} />}
                {spouse && <MiniCard person={spouse} isMe={false} onClick={handleClick} />}
                {me.gender === 'female' && <MiniCard person={me} isMe={true} onClick={handleClick} />}
            </div>

            {/* 자녀 행 — §23 수평 연결선 */}
            {displayChildren.length > 0 && (
                <>
                    <ConnectorV height={12} />
                    {/* 수평 연결선 (자녀 2명 이상) */}
                    {childColCount > 1 && (
                        <div style={{ position: 'relative', height: 1, width: childColCount * SLOT - GAP }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: CARD_W / 2,
                                width: hBarWidth,
                                height: 1,
                                background: GOLD,
                            }} />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
                        {displayChildren.map(child => (
                            <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {childColCount > 1 && <ConnectorV height={12} />}
                                <MiniCard person={child} isMe={false} onClick={handleClick} />
                            </div>
                        ))}
                        {extraCount > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {childColCount > 1 && <ConnectorV height={12} />}
                                <div style={{
                                    width: CARD_W, height: CARD_H,
                                    border: `1px solid ${GOLD}`, borderRadius: 4,
                                    background: '#f8f6f0', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: 11, color: TEXT_SUB,
                                    fontFamily: 'Georgia, sans-serif',
                                }}>
                                    +{extraCount}명
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* 가족 없음 */}
            {!parent1 && !parent2 && !spouse && children.length === 0 && (
                <div style={{ fontSize: 11, color: TEXT_SUB, textAlign: 'center', marginTop: 10 }}>
                    가족을 추가해보세요
                </div>
            )}
        </div>
    );
}
