/**
 * CardTreeCanvas.jsx — 자료실 카드트리 캔버스 (§5 §22 §23 §24)
 * 화살표: ↑부모 ↓자녀 ←배우자(여성) →배우자(남성)
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/* ─── 상수 ─────────────────────────────────────────────────── */
const CARD_W  = 220;   // §24-1: 부부 440px = 220×2
const CARD_H  = 260;   // 사진180 + 텍스트 + 여백
const SLOT    = 260;   // §23: 형제 260px 간격
const ROW     = 360;   // CARD_H + 100
const PAD     = 150;   // 캔버스 여백
const LINE    = '#C4A882';
const ARR     = 28;    // 화살표 버튼 크기
const ARR_GAP = 10;    // 화살표 – 카드 간격

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

/* ─── 화살표 규칙 (성별 기반) ──────────────────────────────── */
// ↑ 부모 추가 / ↓ 자녀 추가 / ← 배우자(여성) / → 배우자(남성)
function arrowsFor(gender, hasParents, hasSpouse) {
    return {
        up:    !hasParents,
        down:  true,
        left:  gender === 'female' && !hasSpouse,
        right: gender === 'male'   && !hasSpouse,
    };
}

/* ─── 화살표 버튼 컴포넌트 ─────────────────────────────────── */
function ArrowBtn({ dir, top, left, title, disabled, onClick }) {
    const [hov, setHov] = useState(false);
    const Icon = dir === 'up' ? ChevronUp
               : dir === 'down' ? ChevronDown
               : dir === 'left' ? ChevronLeft
               : ChevronRight;
    return (
        <button
            title={title}
            onClick={e => { e.stopPropagation(); if (!disabled) onClick(); }}
            onMouseEnter={() => !disabled && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'absolute',
                top, left,
                width: ARR, height: ARR,
                borderRadius: '50%',
                border: '1px solid #C4A882',
                background: disabled ? 'rgba(0,0,0,0.05)' : hov ? '#C4A882' : 'rgba(196,168,130,0.15)',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
                opacity: disabled ? 0.4 : 1,
                transition: 'background 0.2s ease',
                padding: 0, boxShadow: 'none', outline: 'none',
            }}
        >
            <Icon size={15} strokeWidth={2.5} color={disabled ? '#AAA' : hov ? '#fff' : '#8B6914'} />
        </button>
    );
}

/* ─── 개별 카드 컴포넌트 ────────────────────────────────────── */
function PersonCard({ node, curatorId, curatorSpouseId, hasPendingCard, onArrowClick, onCardClick, onCardDoubleClick }) {
    const { person, cx, cy, hasParents, hasSpouseRel } = node;
    const isPending  = !person;
    const isComplete = !isPending && !!person.name;

    const isCuratorCouple = person && (person.id === curatorId || person.id === curatorSpouseId);
    const borderStyle = isPending
        ? { border: '2px dashed #C4A882', background: '#FAFAF5', boxShadow: 'none' }
        : cardBorderStyle(isCuratorCouple, person?.gender);

    const arrows = isComplete
        ? arrowsFor(person.gender, hasParents, hasSpouseRel)
        : { up: false, down: false, left: false, right: false };

    const cardLeft = cx - CARD_W / 2;
    const cardTop  = cy;
    const name = person?.name || '';

    const tooltips = {
        up:    `${name}의 부모 추가`,
        down:  `${name}의 자녀 추가`,
        left:  `${name}의 배우자 추가`,
        right: `${name}의 배우자 추가`,
    };

    const makeBtn = (dir, t, l) => (
        <ArrowBtn
            key={dir}
            dir={dir}
            top={t} left={l}
            title={tooltips[dir]}
            disabled={hasPendingCard}
            onClick={() => onArrowClick(node, dir)}
        />
    );

    return (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
            {arrows.up   && makeBtn('up',   cardTop - ARR - ARR_GAP, cardLeft + CARD_W / 2 - ARR / 2)}
            {arrows.down && makeBtn('down', cardTop + CARD_H + ARR_GAP, cardLeft + CARD_W / 2 - ARR / 2)}
            {arrows.left && makeBtn('left', cardTop + CARD_H / 2 - ARR / 2, cardLeft - ARR - ARR_GAP)}
            {arrows.right && makeBtn('right', cardTop + CARD_H / 2 - ARR / 2, cardLeft + CARD_W + ARR_GAP)}

            <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                onClick={() => person && onCardClick(person)}
                onDoubleClick={() => onCardDoubleClick(person || null)}
                style={{
                    position: 'absolute',
                    left: cardLeft, top: cardTop,
                    width: CARD_W, height: CARD_H,
                    ...borderStyle,
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-start',
                    padding: '14px 10px 10px',
                    overflow: 'hidden', boxSizing: 'border-box',
                    zIndex: 5,
                }}
            >
                {isPending ? (
                    <div style={{ fontSize: 12, color: '#AAAAAA', textAlign: 'center', lineHeight: 1.7, marginTop: 'auto', marginBottom: 'auto' }}>
                        더블클릭하여<br />정보 입력
                    </div>
                ) : (
                    <>
                        {/* 사진 180×180 사각형 */}
                        {person.photo_url ? (
                            <img
                                src={person.photo_url}
                                alt={person.name}
                                style={{ width: 180, height: 180, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                            />
                        ) : (
                            <div style={{
                                width: 180, height: 180, borderRadius: 8, flexShrink: 0,
                                background: isCuratorCouple ? '#DDD0BA' : '#E0E0E0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 52,
                            }}>
                                {person.gender === 'male' ? '👨' : person.gender === 'female' ? '👩' : '👤'}
                            </div>
                        )}
                        <div style={{ marginTop: 8, textAlign: 'center', width: '100%' }}>
                            {person.name ? (
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#3D2008', lineHeight: 1.3 }}>
                                    {person.name}
                                </div>
                            ) : (
                                <div style={{ fontSize: 11, color: '#AAAAAA' }}>이름 미입력</div>
                            )}
                            {person.oc_id && (
                                <div style={{ fontSize: 10, color: '#A09888', marginTop: 2 }}>{person.oc_id}</div>
                            )}
                            {person.bio1 && (
                                <div style={{ fontSize: 11, color: '#5a4a3a', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {person.bio1}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

/* ─── 레이아웃 엔진 ────────────────────────────────────────── */
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

    function hasSpouseRel(pid) {
        const p = byId.get(pid);
        // spouse_id가 실제로 로드된 인물을 가리키는 경우만 유효
        if (p?.spouse_id && (byId.has(p.spouse_id) || byId.has(Number(p.spouse_id)))) return true;
        return relations.some(r =>
            r.relation_type === 'spouse' &&
            (Number(r.person1_id) === Number(pid) || Number(r.person2_id) === Number(pid))
        );
    }

    function hasParentRel(pid) {
        const p = byId.get(pid);
        if (p?.parent1_id || p?.parent2_id) return true;
        return relations.some(r => r.relation_type === 'parent' && r.person2_id === pid);
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
        if (m?.gender === 'male'   && !f) { f = m; m = null; }
        return { f, m };
    }

    const P     = {};   // pid|'pending' → { x(center), y(top), hasParents, hasSpouseRel }
    const lines = [];

    function sP(pid, x, y) {
        if (pid == null) return;
        P[pid] = { x, y, hasParents: hasParentRel(pid), hasSpouseRel: hasSpouseRel(pid) };
    }
    function aL(x1, y1, x2, y2) { lines.push({ x1, y1, x2, y2 }); }

    // 관장 부부 (y=0)
    const curSp = spouseOf(curator.id);
    const [husb, wife] = curator.gender === 'female' ? [curSp, curator] : [curator, curSp];
    const bothPresent = !!(husb && wife);
    const HX = husb ? 0 : null;
    const WX = wife ? (bothPresent ? SLOT : 0) : null;
    const coupleCenter = (HX !== null && WX !== null) ? (HX + WX) / 2 : (HX ?? WX ?? 0);

    if (husb) sP(husb.id, HX, 0);
    if (wife) sP(wife.id, WX, 0);
    if (bothPresent) aL(HX, 0, WX, 0);

    // 남편 형제 (좌) ← §23
    const hSibs = husb ? siblingsOf(husb.id) : [];
    let lx = HX ?? 0;
    for (const s of hSibs) { lx -= SLOT; sP(s.id, lx, 0); }
    if (hSibs.length) aL(lx, 0, HX, 0);

    // 아내 형제 (우) → §23
    const wSibs = wife ? siblingsOf(wife.id) : [];
    let rx = WX ?? 0;
    for (const s of wSibs) { rx += SLOT; sP(s.id, rx, 0); }
    if (wSibs.length) aL(WX, 0, rx, 0);

    // 부모 행 (y=-ROW)
    function placeParents(child, childX, side) {
        if (!child || childX == null) return;
        const { f, m } = parentsOf(child.id);
        if (!f && !m) return;
        const busY = -ROW / 2;
        if (f && m) {
            const [fx, mx] = side === 'left' ? [childX - SLOT, childX] : [childX, childX + SLOT];
            sP(f.id, fx, -ROW); sP(m.id, mx, -ROW);
            aL(fx, -ROW, mx, -ROW);
            const pCX = (fx + mx) / 2;
            aL(pCX, -ROW, pCX, busY);
            aL(pCX, busY, childX, busY);
            aL(childX, busY, childX, 0);
        } else {
            const pp = f ?? m;
            sP(pp.id, childX, -ROW);
            aL(childX, -ROW, childX, 0);
        }
    }
    placeParents(husb, HX, 'left');
    placeParents(wife, WX, 'right');

    // 자녀 행 (y=ROW) + 형제 연결선 (§23 버스 패턴)
    const kids = childrenOf(husb?.id, wife?.id);

    // 대기 카드가 자녀 방향인지 확인 (앵커 = 관장 부부 중 한 명)
    const pendingIsChild = pendingCard?.direction === 'down' &&
        (pendingCard.anchorId === husb?.id || pendingCard.anchorId === wife?.id);

    const kidItemsBase = kids.map(c => {
        const cs = spouseOf(c.id);
        return { c, cs, slots: cs ? 2 : 1, pending: false };
    });
    const kidItems = pendingIsChild
        ? [...kidItemsBase, { c: null, cs: null, slots: 1, pending: true }]
        : kidItemsBase;

    const totalKidW = kidItems.reduce((s, ki) => s + ki.slots, 0);
    let kx = totalKidW > 0 ? coupleCenter - ((totalKidW - 1) * SLOT) / 2 : coupleCenter;
    const kidCenters = [];

    for (const ki of kidItems) {
        const kc = kx + (ki.slots - 1) * SLOT / 2;
        kidCenters.push(kc);
        if (ki.pending) {
            P['pending'] = { x: kc, y: ROW, hasParents: false, hasSpouseRel: false };
        } else if (ki.cs) {
            if (ki.c.gender !== 'female') {
                sP(ki.c.id,  kx,        ROW);
                sP(ki.cs.id, kx + SLOT, ROW);
            } else {
                sP(ki.cs.id, kx,        ROW);
                sP(ki.c.id,  kx + SLOT, ROW);
            }
            aL(kx, ROW, kx + SLOT, ROW); // 자녀 부부선
        } else {
            sP(ki.c.id, kx, ROW);
        }
        kx += ki.slots * SLOT;
    }

    // 부부→자녀 버스 연결 (형제 수평선)
    if (kidCenters.length > 0) {
        const busY = ROW / 2;
        aL(coupleCenter, 0, coupleCenter, busY);
        if (kidCenters.length > 1) {
            aL(kidCenters[0], busY, kidCenters[kidCenters.length - 1], busY); // 형제 수평 연결선
        }
        kidCenters.forEach(kc => aL(kc, busY, kc, ROW));
    }

    // 손자녀 행 (y=2*ROW) + 형제 연결선
    kidItems.forEach((ki, i) => {
        if (ki.pending) return; // 대기 자녀는 자손 없음
        const kc = kidCenters[i];
        const gcs = childrenOf(ki.c.id, ki.cs?.id);

        // 이 자녀 카드의 ↓ 화살표 클릭 시 손자 대기 카드 포함
        const pendingIsGrandchild = pendingCard?.direction === 'down' && !pendingIsChild &&
            (pendingCard.anchorId === ki.c?.id || (ki.cs && pendingCard.anchorId === ki.cs?.id));

        const totalGcSlots = gcs.length + (pendingIsGrandchild ? 1 : 0);
        if (!totalGcSlots) return;

        const busY2 = ROW + ROW / 2;
        let gcx = kc - ((totalGcSlots - 1) * SLOT) / 2;
        const gcCenters = [];

        gcs.forEach(gc => {
            sP(gc.id, gcx, 2 * ROW);
            gcCenters.push(gcx);
            gcx += SLOT;
        });

        if (pendingIsGrandchild) {
            P['pending'] = { x: gcx, y: 2 * ROW, hasParents: false, hasSpouseRel: false };
            gcCenters.push(gcx);
        }

        aL(kc, ROW, kc, busY2);
        if (gcCenters.length > 1) aL(gcCenters[0], busY2, gcCenters[gcCenters.length - 1], busY2);
        gcCenters.forEach(cx => aL(cx, busY2, cx, 2 * ROW));
    });

    // 대기 카드 (비-자녀 방향: 부모↑, 배우자←→ 또는 깊은 후손)
    if (pendingCard && !P['pending']) {
        const anchor = P[pendingCard.anchorId];
        if (anchor) {
            const { x: ax, y: ay } = anchor;
            const px = pendingCard.direction === 'left'  ? ax - SLOT
                     : pendingCard.direction === 'right' ? ax + SLOT : ax;
            const py = pendingCard.direction === 'up'   ? ay - ROW
                     : pendingCard.direction === 'down' ? ay + ROW  : ay;
            P['pending'] = { x: px, y: py, hasParents: false, hasSpouseRel: false };
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

    const nodes = posEntries.map(([id, { x, y, hasParents, hasSpouseRel }]) => ({
        id,
        person: id === 'pending' ? null : (byId.get(Number(id)) || byId.get(id)),
        cx: x + ox,
        cy: y + oy,
        hasParents,
        hasSpouseRel,
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

    if (!layout) {
        return (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div
                    onDoubleClick={() => onCardDoubleClick(curator || null)}
                    style={{
                        width: CARD_W, height: CARD_H,
                        ...cardBorderStyle(true),
                        borderRadius: 10,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: 14, cursor: 'pointer',
                    }}
                >
                    <div style={{ fontSize: 52, marginBottom: 12 }}>👤</div>
                    <div style={{ fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 1.7 }}>
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
                <AnimatePresence>
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
                </AnimatePresence>
            </div>
        </div>
    );
}
