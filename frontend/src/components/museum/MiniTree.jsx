/**
 * MiniTree.jsx — 자료실 좌측 간이 직계 트리
 *
 * 부모, 나, 배우자, 자녀만 표시 (작게)
 * - 클릭 시 해당 인물 자료실로 전환
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARD_W = 64;
const CARD_H = 72;

const GOLD = '#C4A882';
const GOLD_DARK = '#8B7355';
const BG = '#FDF8F0';
const TEXT = '#3a3020';
const TEXT_SUB = '#7a6a50';

function MiniCard({ person, isMe, subdomain, onClick }) {
    const initials = person.name ? person.name.slice(0, 2) : '?';
    const genderColor = person.gender === 'F' ? '#C4956A' : '#7BA7C4';

    return (
        <div
            onClick={() => onClick(person.id)}
            title={`${person.name} 자료실로 이동`}
            style={{
                width: CARD_W,
                height: CARD_H,
                border: isMe ? `2px solid ${GOLD_DARK}` : `1px solid ${GOLD}`,
                borderRight: isMe ? `3px solid #9a7a50` : `2px solid #b09060`,
                borderBottom: isMe ? `3px solid #7a6040` : `2px solid #9a7a50`,
                borderRadius: 4,
                background: isMe ? '#FDF8F0' : '#FAFAF5',
                boxShadow: isMe ? '2px 2px 0 #c4a87a, 4px 4px 0 #b09060' : '1px 1px 0 #c4a87a',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'box-shadow 0.2s',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* 사진 or 이니셜 */}
            {person.photo_url ? (
                <img
                    src={person.photo_url}
                    alt={person.name}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${GOLD}` }}
                />
            ) : (
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: genderColor + '33',
                    border: `1px solid ${genderColor}`,
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
                fontFamily: 'Georgia, "Noto Serif KR", serif',
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
    return <div style={{ width: 1, height, background: GOLD, margin: '0 auto' }} />;
}

function ConnectorH({ width }) {
    return <div style={{ height: 1, width, background: GOLD }} />;
}

export default function MiniTree({ persons = [], relations = [], currentPersonId, subdomain }) {
    const navigate = useNavigate();

    const idStr = String(currentPersonId);
    const personMap = new Map(persons.map(p => [String(p.id), p]));
    const me = personMap.get(idStr);
    if (!me) return null;

    // 부모 찾기 (from persons columns, parent1_id/parent2_id)
    const parent1 = me.parent1_id ? personMap.get(String(me.parent1_id)) : null;
    const parent2 = me.parent2_id ? personMap.get(String(me.parent2_id)) : null;

    // 배우자 찾기
    const spouse = me.spouse_id ? personMap.get(String(me.spouse_id)) : null;

    // 자녀 찾기
    const children = persons.filter(p =>
        String(p.parent1_id) === idStr || String(p.parent2_id) === idStr ||
        (spouse && (String(p.parent1_id) === String(spouse.id) || String(p.parent2_id) === String(spouse.id)))
    );

    const handleClick = (personId) => {
        navigate(`/${subdomain}/person/${personId}`);
    };

    const SLOT = CARD_W + 8;
    const meAndSpouseW = spouse ? SLOT * 2 + 4 : SLOT;
    const parentsW = (parent1 ? SLOT : 0) + (parent2 ? SLOT : 0) + (parent1 && parent2 ? 4 : 0);
    const childrenW = children.length * SLOT + Math.max(0, children.length - 1) * 4;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            width: '100%',
            minWidth: 140,
            userSelect: 'none',
        }}>
            {/* 부모 행 */}
            {(parent1 || parent2) && (
                <>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                        {parent1 && <MiniCard person={parent1} isMe={false} subdomain={subdomain} onClick={handleClick} />}
                        {parent2 && <MiniCard person={parent2} isMe={false} subdomain={subdomain} onClick={handleClick} />}
                    </div>
                    <ConnectorV height={12} />
                </>
            )}

            {/* 나 + 배우자 행 */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* 나: 항상 왼쪽 (남자) 또는 오른쪽 (여자) */}
                {me.gender !== 'F' && <MiniCard person={me} isMe={true} subdomain={subdomain} onClick={handleClick} />}
                {spouse && <MiniCard person={spouse} isMe={false} subdomain={subdomain} onClick={handleClick} />}
                {me.gender === 'F' && <MiniCard person={me} isMe={true} subdomain={subdomain} onClick={handleClick} />}
            </div>

            {/* 자녀 행 */}
            {children.length > 0 && (
                <>
                    <ConnectorV height={12} />
                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        {children.slice(0, 4).map(child => (
                            <MiniCard key={child.id} person={child} isMe={false} subdomain={subdomain} onClick={handleClick} />
                        ))}
                        {children.length > 4 && (
                            <div style={{
                                width: CARD_W, height: CARD_H,
                                border: `1px solid ${GOLD}`, borderRadius: 4,
                                background: '#f8f6f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: TEXT_SUB, fontFamily: 'Georgia, sans-serif',
                            }}>
                                +{children.length - 4}명
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* 가족 없음 */}
            {!parent1 && !parent2 && !spouse && children.length === 0 && (
                <div style={{ fontSize: 10, color: TEXT_SUB, textAlign: 'center', marginTop: 8 }}>
                    가족을 추가해보세요
                </div>
            )}
        </div>
    );
}
