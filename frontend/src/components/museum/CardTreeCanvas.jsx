/**
 * CardTreeCanvas.jsx — 자료실 카드트리 캔버스 (§5 §22 §23 §24)
 * 카드 중심 확장. 모든 완성 카드에 사방 화살표.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/* ─── 상수 ─────────────────────────────────────────────────── */
const CARD_W = 160;
const CARD_H = 150;
const H_GAP  = 20;
const V_GAP  = 80;
const SLOT   = CARD_W + H_GAP;   // 180
const ROW    = CARD_H + V_GAP;   // 230
const PAD    = 120;
const LINE   = '#C4A882';
const ARR    = 24;                // 화살표 버튼 크기
const ARR_GAP = 6;                // 화살표 - 카드 간격

/* ─── §5 카드 스타일 ────────────────────────────────────────── */
function cardBorderStyle(isCuratorCouple, gender) {
    if (isCuratorCouple) return {
        border: '2px solid #8B7355',
        background: '#FDF8F0',
        borderRight: '4px solid #9a7a50',
        borderBottom: '4px solid #7a6040',
        boxShadow: '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
    };
    if (gender === 'male') return {
        border: '1px solid #90CAF9',
        background: '#E8F4FD',
        borderRight: '2px solid #5baff5',
        borderBottom: '2px solid #5baff5',
        boxShadow: '2px 2px 0 #90CAF9',
    };
    if (gender === 'female') return {
        border: '1px solid #F48FB1',
        background: '#FDE8F0',
        borderRight: '2px solid #e07aaa',
        borderBottom: '2px solid #e07aaa',
        boxShadow: '2px 2px 0 #F48FB1',
    };
    return {
        border: '1px dashed #BDBDBD',
        background: '#F5F5F5',
        boxShadow: '2px 2px 0 #BDBDBD',
    };
}

/* ─── 화살표 표시 규칙 (layoutRole 기준) ──────────────────── */
// right 화살표: wife/w_sib/child_sp 역할은 형제 추가, 나머지는 배우자 추가
function arrowsFor(layoutRole, hasParents, hasSpouse) {
    switch (layoutRole) {
        case 'husb':     return { up: !hasParents, down: true,  left: true,  right: !hasSpouse };
        case 'wife':     return { up: !hasParents, down: false, left: false, right: true  };
        case 'h_sib':    return { up: !hasParents, down: false, left: true,  right: !hasSpouse };
        case 'w_sib':    return { up: !hasParents, down: false, left: false, right: !hasSpouse };
        case 'child':    return { up: false,       down: true,  left: true,  right: !hasSpouse };
        case 'child_sp': return { up: false,       down: false, left: false, right: true  };
        case 'gc':       return { up: false,       down: false, left: true,  right: !hasSpouse };
        default:         return { up: false,       down: false, left: false, right: false };
    }
}

/* ─── 개별 카드 컴포넌트 ────────────────────────────────────── */
function PersonCard({ node, curatorId, curatorSpouseId, hasPendingCard, onArrowClick, onCardClick, onCardDoubleClick }) {
    const { person, cx, cy, layoutRole } = node;
    const isPending  = !person;
    const isComplete = !isPending && !!person.name;

    const isCuratorCouple = person && (person.id === curatorId || person.id === curatorSpouseId);
    const borderStyle = isPending
        ? { border: '2px dashed #BDBDBD', background: '#FAFAFA', boxShadow: 'none' }
        : cardBorderStyle(isCuratorCouple, person.gender);

    const hasParents = !isPending && !!(person.parent1_id || person.parent2_id);
    const hasSpouse  = !isPending && !!(person.spouse_id);
    const arrows = isComplete ? arrowsFor(layoutRole, hasParents, hasSpouse)
                              : { up: false, down: false, left: false, right: false };

    const cardLeft = cx - CARD_W / 2;
    const cardTop  = cy;

    const arrowTooltip = (dir) => {
        const name = person?.name || '';
        if (dir === 'up') return `${name}의 부모 추가`;
        if (dir === 'down') return `${name}의 자녀 추가`;
        if (dir === 'left') return `${name}의 형제 추가`;
        // right
        if (layoutRole === 'wife' || layoutRole === 'w_sib' || layoutRole === 'child_sp') return `${name}의 형제 추가`;
        return `${name}의 배우자 추가`;
    };

    const ArrowBtn = ({ dir, top, left }) => (
        <button
            title={arrowTooltip(dir)}
            onClick={e => { e.stopPropagation(); if (!hasPendingCard) onArrowClick(node, dir); }}
            style={{
                position: 'absolute',
                top, left,
                width: ARR, height: ARR,
                borderRadius: 12,
                border: '1px solid #C4A882',
                background: hasPendingCard ? '#EEE' : '#FDF8F0',
                cursor: hasPendingCard ? 'default' : 'pointer',
                fontSize: 13, color: '#8B6914',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '1px 1px 0 #c4a87a',
                zIndex: 10,
                opacity: hasPendingCard ? 0.5 : 1,
            }}
        >
            {dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'left' ? '←' : '→'}
        </button>
    );

    return (
        /* 0-크기 앵커 div — 자식들은 캔버스 기준 절대 위치 */
        <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
            {/* ↑ */}
            {arrows.up && (
                <ArrowBtn dir="up"
                    top={cardTop - ARR - ARR_GAP}
                    left={cardLeft + CARD_W / 2 - ARR / 2}
                />
            )}
            {/* ↓ */}
            {arrows.down && (
                <ArrowBtn dir="down"
                    top={cardTop + CARD_H + ARR_GAP}
                    left={cardLeft + CARD_W / 2 - ARR / 2}
                />
            )}
            {/* ← */}
            {arrows.left && (
                <ArrowBtn dir="left"
                    top={cardTop + CARD_H / 2 - ARR / 2}
                    left={cardLeft - ARR - ARR_GAP}
                />
            )}
            {/* → */}
            {arrows.right && (
                <ArrowBtn dir="right"
                    top={cardTop + CARD_H / 2 - ARR / 2}
                    left={cardLeft + CARD_W + ARR_GAP}
                />
            )}

            {/* 카드 본체 */}
            <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={() => person && onCardClick(person)}
                onDoubleClick={() => onCardDoubleClick(person || null)}
                style={{
                    position: 'absolute',
                    left: cardLeft, top: cardTop,
                    width: CARD_W, height: CARD_H,
                    ...borderStyle,
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 6px',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    zIndex: 5,
                }}
            >
                {isPending ? (
                    <div style={{ fontSize: 11, color: '#AAAAAA', textAlign: 'center', lineHeight: 1.6 }}>
                        더블클릭하여<br />정보 입력
                    </div>
                ) : (
                    <>
                        {person.photo_url ? (
                            <img
                                src={person.photo_url}
                                alt={person.name}
                                style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', marginBottom: 5, flexShrink: 0 }}
                            />
                        ) : (
                            <div style={{
                                width: 56, height: 56, borderRadius: 28, marginBottom: 5, flexShrink: 0,
                                background: isCuratorCouple ? '#DDD0BA' : '#E0E0E0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 24,
                            }}>
                                {person.gender === 'male' ? '👨' : person.gender === 'female' ? '👩' : '👤'}
                            </div>
                        )}
                        {person.name ? (
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#3D2008', textAlign: 'center', lineHeight: 1.2, marginBottom: 2 }}>
                                {person.name}
                            </div>
                        ) : (
                            <div style={{ fontSize: 11, color: '#AAAAAA', textAlign: 'center' }}>이름 미입력<br/>더블클릭하여 입력</div>
                        )}
                        {person.orgcell_id && (
                            <div style={{ fontSize: 9, color: '#A09888' }}>{person.orgcell_id}</div>
                        )}
                        {person.bio1 && (
                            <div style={{ fontSize: 10, color: '#5a4a3a', textAlign: 'center', overflow: 'hidden', maxWidth: CARD_W - 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {person.bio1}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
}

/* ─── 레이아웃 엔진 (FamilyRelationView 알고리즘 기반) ──────── */
function buildLayout(persons, relations, curator, pendingCard) {
    if (!curator) return null;

    const byId = new Map(persons.map(p => [p.id, p]));

    function spouseOf(pid) {
        const p = byId.get(pid);
        if (p?.spouse_id) return byId.get(p.spouse_id) || null;
        const r = relations.find(r =>
            r.relation_type === 'spouse' && (r.person1_id === pid || r.person2_id === pid)
        );
        return r ? (byId.get(r.person1_id === pid ? r.person2_id : r.person1_id) || null) : null;
    }

    function childrenOf(...pids) {
        const seen = new Set();
        const kids = [];
        for (const pid of pids) {
            if (!pid) continue;
            persons.forEach(p => {
                if ((p.parent1_id === pid || p.parent2_id === pid) && !seen.has(p.id)) {
                    seen.add(p.id); kids.push(p);
                }
            });
            relations.filter(r => r.relation_type === 'parent' && r.person1_id === pid)
                .forEach(r => {
                    const c = byId.get(r.person2_id);
                    if (c && !seen.has(c.id)) { seen.add(c.id); kids.push(c); }
                });
        }
        return kids.sort((a, b) => (a.birth_date || '').localeCompare(b.birth_date || ''));
    }

    function siblingsOf(pid) {
        return relations
            .filter(r => r.relation_type === 'sibling' && (r.person1_id === pid || r.person2_id === pid))
            .map(r => byId.get(r.person1_id === pid ? r.person2_id : r.person1_id))
            .filter(Boolean);
    }

    function parentsOf(pid) {
        const p = byId.get(pid);
        let f = p?.parent1_id ? byId.get(p.parent1_id) : null;
        let m = p?.parent2_id ? byId.get(p.parent2_id) : null;
        relations.filter(r => r.relation_type === 'parent' && r.person2_id === pid).forEach(r => {
            const par = byId.get(r.person1_id);
            if (!par) return;
            if (!f && par.gender === 'male') f = par;
            else if (!m && par.gender === 'female') m = par;
        });
        if (f?.gender === 'female' && !m) { m = f; f = null; }
        if (m?.gender === 'male' && !f)   { f = m; m = null; }
        return { f, m };
    }

    const P = {};    // pid|'pending' → { x (center), y (top), layoutRole }
    const lines = [];

    function sP(pid, x, y, role) { if (pid != null) P[pid] = { x, y, layoutRole: role }; }
    function aL(x1, y1, x2, y2) { lines.push({ x1, y1, x2, y2 }); }

    // 관장 부부 (y=0)
    const curSp = spouseOf(curator.id);
    const [husb, wife] = curator.gender === 'female' ? [curSp, curator] : [curator, curSp];
    const bothPresent = !!(husb && wife);
    const HX = husb ? 0 : null;
    const WX = wife ? (bothPresent ? SLOT : 0) : null;
    const coupleCenter = (HX !== null && WX !== null) ? (HX + WX) / 2 : (HX ?? WX ?? 0);

    if (husb) sP(husb.id, HX, 0, 'husb');
    if (wife) sP(wife.id, WX, 0, 'wife');
    if (bothPresent) aL(HX, 0, WX, 0); // 부부 수평선

    // 남편 형제 (좌)
    const hSibs = husb ? siblingsOf(husb.id) : [];
    let lx = HX ?? 0;
    for (const s of hSibs) { lx -= SLOT; sP(s.id, lx, 0, 'h_sib'); }
    if (hSibs.length) aL(lx, 0, HX, 0);

    // 아내 형제 (우)
    const wSibs = wife ? siblingsOf(wife.id) : [];
    let rx = WX ?? 0;
    for (const s of wSibs) { rx += SLOT; sP(s.id, rx, 0, 'w_sib'); }
    if (wSibs.length) aL(WX, 0, rx, 0);

    // 부모 행 (y=-ROW)
    function placeParents(child, childX, side) {
        if (!child || childX == null) return;
        const { f, m } = parentsOf(child.id);
        if (!f && !m) return;
        const busY = -ROW / 2;
        const parRole = side === 'left' ? 'h_par' : 'w_par';
        if (f && m) {
            const [fx, mx] = side === 'left' ? [childX - SLOT, childX] : [childX, childX + SLOT];
            sP(f.id, fx, -ROW, parRole); sP(m.id, mx, -ROW, parRole);
            aL(fx, -ROW, mx, -ROW);
            const pCX = (fx + mx) / 2;
            aL(pCX, -ROW, pCX, busY);
            aL(pCX, busY, childX, busY);
            aL(childX, busY, childX, 0);
        } else {
            const pp = f ?? m;
            sP(pp.id, childX, -ROW, parRole);
            aL(childX, -ROW, childX, 0);
        }
    }
    placeParents(husb, HX, 'left');
    placeParents(wife, WX, 'right');

    // 자녀 행 (y=ROW)
    const kids = childrenOf(husb?.id, wife?.id);
    const kidItems = kids.map(c => {
        const cs = spouseOf(c.id);
        return { c, cs, slots: cs ? 2 : 1 };
    });
    const totalKidW = kidItems.reduce((s, ki) => s + ki.slots, 0);
    let kx = coupleCenter - ((totalKidW - 1) * SLOT) / 2;
    const kidCenters = [];

    for (const ki of kidItems) {
        const kc = kx + (ki.slots - 1) * SLOT / 2;
        kidCenters.push(kc);
        if (ki.cs) {
            if (ki.c.gender !== 'female') {
                sP(ki.c.id,  kx,        ROW, 'child');
                sP(ki.cs.id, kx + SLOT, ROW, 'child_sp');
            } else {
                sP(ki.cs.id, kx,        ROW, 'child_sp');
                sP(ki.c.id,  kx + SLOT, ROW, 'child');
            }
            aL(kx, ROW, kx + SLOT, ROW);
        } else {
            sP(ki.c.id, kx, ROW, 'child');
        }
        kx += ki.slots * SLOT;
    }

    if (kidCenters.length > 0) {
        const busY = ROW / 2;
        aL(coupleCenter, 0, coupleCenter, busY);
        if (kidCenters.length > 1) aL(kidCenters[0], busY, kidCenters[kidCenters.length - 1], busY);
        kidCenters.forEach(kc => aL(kc, busY, kc, ROW));
    }

    // 손자녀 행 (y=2*ROW)
    kidItems.forEach((ki, i) => {
        const kc = kidCenters[i];
        const gcs = childrenOf(ki.c.id, ki.cs?.id);
        if (!gcs.length) return;
        const busY2 = ROW + ROW / 2;
        let gcx = kc - ((gcs.length - 1) * SLOT) / 2;
        const gcCenters = gcs.map(gc => {
            const cx = gcx; gcx += SLOT;
            sP(gc.id, cx, 2 * ROW, 'gc');
            return cx;
        });
        aL(kc, ROW, kc, busY2);
        if (gcCenters.length > 1) aL(gcCenters[0], busY2, gcCenters[gcCenters.length - 1], busY2);
        gcCenters.forEach(cx => aL(cx, busY2, cx, 2 * ROW));
    });

    // 대기 카드 (pendingCard)
    if (pendingCard) {
        const anchor = P[pendingCard.anchorId];
        if (anchor) {
            const { x: ax, y: ay } = anchor;
            const px = pendingCard.direction === 'left'  ? ax - SLOT
                     : pendingCard.direction === 'right' ? ax + SLOT : ax;
            const py = pendingCard.direction === 'up'   ? ay - ROW
                     : pendingCard.direction === 'down' ? ay + ROW  : ay;
            P['pending'] = { x: px, y: py, layoutRole: 'pending' };
        }
    }

    // 캔버스 경계
    const posEntries = Object.entries(P);
    if (!posEntries.length) return null;

    const allX = posEntries.map(([, p]) => p.x).concat(lines.flatMap(l => [l.x1, l.x2]));
    const allY = posEntries.map(([, p]) => p.y).concat(lines.flatMap(l => [l.y1, l.y2]));
    const minX = Math.min(...allX) - CARD_W / 2 - PAD;
    const maxX = Math.max(...allX) + CARD_W / 2 + PAD;
    const minY = Math.min(...allY) - PAD;
    const maxY = Math.max(...allY) + CARD_H + PAD;
    const ox = -minX, oy = -minY;
    const W = maxX - minX, H = maxY - minY;

    const nodes = posEntries.map(([id, { x, y, layoutRole }]) => ({
        id,
        person: id === 'pending' ? null : (byId.get(Number(id)) || byId.get(id)),
        cx: x + ox,
        cy: y + oy,
        layoutRole,
    })).filter(n => n.person || n.id === 'pending');

    return { nodes, lines, W, H, ox, oy };
}

/* ─── 메인 컴포넌트 ────────────────────────────────────────── */
export default function CardTreeCanvas({
    persons, relations, curator,
    pendingCard, onArrowClick, onCardClick, onCardDoubleClick,
}) {
    const curatorSpouseId = useMemo(() => {
        if (!curator) return null;
        if (curator.spouse_id) return curator.spouse_id;
        const r = relations.find(r =>
            r.relation_type === 'spouse' && (r.person1_id === curator.id || r.person2_id === curator.id)
        );
        return r ? (r.person1_id === curator.id ? r.person2_id : r.person1_id) : null;
    }, [curator, relations]);

    const layout = useMemo(
        () => buildLayout(persons, relations, curator, pendingCard),
        [persons, relations, curator, pendingCard]
    );

    // 관장만 있고 이름도 없는 최초 진입 상태
    if (!layout) {
        return (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div
                    onDoubleClick={() => onCardDoubleClick(curator || null)}
                    style={{
                        width: CARD_W, height: CARD_H,
                        ...cardBorderStyle(true),
                        borderRadius: 8,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: 8, cursor: 'pointer',
                    }}
                >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
                    <div style={{ fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 1.6 }}>
                        더블클릭하여<br />정보를 입력하세요
                    </div>
                </div>
            </div>
        );
    }

    const { nodes, lines, W, H, ox, oy } = layout;

    return (
        <div style={{ overflow: 'auto', flex: 1, display: 'flex' }}>
            <div style={{ position: 'relative', width: W, height: H, flexShrink: 0, margin: 'auto' }}>
                {/* SVG 연결선 (z-index 1, 카드 뒤) */}
                <svg
                    width={W} height={H}
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}
                >
                    {lines.map(({ x1, y1, x2, y2 }, i) => (
                        <line key={i}
                            x1={x1 + ox} y1={y1 + oy + CARD_H / 2}
                            x2={x2 + ox} y2={y2 + oy + CARD_H / 2}
                            stroke={LINE} strokeWidth={1.5}
                        />
                    ))}
                </svg>
                {/* 카드 + 화살표 */}
                {nodes.map(node => (
                    <PersonCard
                        key={node.id}
                        node={node}
                        curatorId={curator?.id}
                        curatorSpouseId={curatorSpouseId}
                        hasPendingCard={!!pendingCard}
                        onArrowClick={onArrowClick}
                        onCardClick={onCardClick}
                        onCardDoubleClick={onCardDoubleClick}
                    />
                ))}
            </div>
        </div>
    );
}
