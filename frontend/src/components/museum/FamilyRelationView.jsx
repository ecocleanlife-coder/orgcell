/**
 * FamilyRelationView.jsx — 자료실 가족관계보기 (§22/§23/§24)
 * - 텍스트 노드만 표시 (박스 없음)
 * - SVG 연결선 1px #BDBDBD
 * - 클릭 → onPersonClick(person)
 */
import React, { useMemo, useState } from 'react';

const SLOT  = 96;   // 노드 간 수평 간격 (center-to-center)
const ROW   = 70;   // 세대 간 수직 간격
const NH    = 22;   // 노드 높이 (레이아웃 계산용)
const PAD   = SLOT; // 캔버스 여백
const LINE  = '#BDBDBD';

function nodeColor(p, curator) {
    if (!p) return '#9E9E9E';
    if (p.id === curator?.id) return '#8B6914';
    if (p.gender === 'male')   return '#1565C0';
    if (p.gender === 'female') return '#AD1457';
    return '#9E9E9E';
}

function PersonNode({ person, curator, selected, cx, cy, onClick }) {
    const [hov, setHov] = useState(false);
    return (
        <span
            onClick={onClick}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                position: 'absolute', left: cx, top: cy,
                transform: 'translateX(-50%)',
                padding: '4px 8px', fontSize: 14, lineHeight: `${NH}px`,
                color: nodeColor(person, curator),
                fontWeight: person.id === curator?.id ? 700 : 400,
                background: selected
                    ? 'rgba(196,168,130,0.18)'
                    : hov ? 'rgba(0,0,0,0.05)' : 'transparent',
                outline: selected ? '1.5px solid #C4A882' : 'none',
                borderRadius: 4, cursor: 'pointer',
                whiteSpace: 'nowrap', userSelect: 'none',
            }}
        >
            {person.name || '?'}
        </span>
    );
}

export default function FamilyRelationView({ persons, relations, curator, anchorPerson, onPersonClick }) {
    const layout = useMemo(() => {
        if (!curator || !persons.length) return null;

        const byId = new Map(persons.map(p => [p.id, p]));

        // ── 헬퍼 ────────────────────────────────────────────────
        function spouseOf(pid) {
            const p = byId.get(pid);
            if (p?.spouse_id) return byId.get(p.spouse_id) || null;
            const r = relations.find(r =>
                r.relation_type === 'spouse' &&
                (r.person1_id === pid || r.person2_id === pid)
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
                .filter(r => r.relation_type === 'sibling' &&
                    (r.person1_id === pid || r.person2_id === pid))
                .map(r => byId.get(r.person1_id === pid ? r.person2_id : r.person1_id))
                .filter(Boolean);
        }

        function parentsOf(pid) {
            const p = byId.get(pid);
            let f = (p?.parent1_id ? byId.get(p.parent1_id) : null);
            let m = (p?.parent2_id ? byId.get(p.parent2_id) : null);
            // relations 보완
            relations.filter(r => r.relation_type === 'parent' && r.person2_id === pid).forEach(r => {
                const par = byId.get(r.person1_id);
                if (!par) return;
                if (!f && par.gender === 'male') f = par;
                else if (!m && par.gender === 'female') m = par;
            });
            // 성별 배정 오류 보정
            if (f?.gender === 'female' && !m) { m = f; f = null; }
            if (m?.gender === 'male' && !f)   { f = m; m = null; }
            return { f, m };
        }

        // ── 위치/선 계산 ─────────────────────────────────────────
        const P    = {}; // pid -> {x, y}
        const lines = []; // [{x1,y1,x2,y2}]

        function sP(pid, x, y) { if (pid != null) P[pid] = { x, y }; }
        function gP(pid) { return P[pid]; }
        function aL(x1, y1, x2, y2) { lines.push({ x1, y1, x2, y2 }); }

        // 남편/아내 판별
        const curSp = spouseOf(curator.id);
        const [husb, wife] = curator.gender === 'female'
            ? [curSp, curator]
            : [curator, curSp];

        const bothPresent = !!(husb && wife);
        const HX = husb ? 0 : null;
        const WX = wife ? (bothPresent ? SLOT : 0) : null;
        const coupleCenter = (HX !== null && WX !== null)
            ? (HX + WX) / 2
            : (HX ?? WX ?? 0);

        // 메인 행 (y=0)
        if (husb) sP(husb.id, HX, 0);
        if (wife) sP(wife.id, WX, 0);
        if (bothPresent) aL(HX, 0, WX, 0); // 부부 수평선

        // 남편 형제 → 좌 (§23)
        const hSibs = husb ? siblingsOf(husb.id) : [];
        let lx = HX ?? 0;
        for (const s of hSibs) { lx -= SLOT; sP(s.id, lx, 0); }
        if (hSibs.length) aL(lx, 0, HX, 0);

        // 아내 형제 → 우 (§23)
        const wSibs = wife ? siblingsOf(wife.id) : [];
        let rx = WX ?? 0;
        for (const s of wSibs) { rx += SLOT; sP(s.id, rx, 0); }
        if (wSibs.length) aL(WX, 0, rx, 0);

        // 부모 행 (y = -ROW)
        function placeParents(child, childX, side) {
            if (!child || childX == null) return;
            const { f, m } = parentsOf(child.id);
            if (!f && !m) return;
            const busY = -ROW / 2;
            if (f && m) {
                const [fx, mx] = side === 'left'
                    ? [childX - SLOT, childX]
                    : [childX,        childX + SLOT];
                sP(f.id, fx, -ROW); sP(m.id, mx, -ROW);
                aL(fx, -ROW, mx, -ROW);           // 부모 부부선
                const pCX = (fx + mx) / 2;
                aL(pCX, -ROW, pCX, busY);          // 부모→버스
                aL(pCX, busY, childX, busY);        // 버스→자녀 열
                aL(childX, busY, childX, 0);        // 자녀 열→자녀
            } else {
                const pp = f ?? m;
                sP(pp.id, childX, -ROW);
                aL(childX, -ROW, childX, 0);
            }
        }
        placeParents(husb, HX, 'left');
        placeParents(wife, WX, 'right');

        // 자녀 행 (y = ROW)
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

        // 부부→자녀 연결선 (버스)
        if (kidCenters.length > 0) {
            const busY = ROW / 2;
            aL(coupleCenter, 0, coupleCenter, busY);
            if (kidCenters.length > 1) {
                aL(kidCenters[0], busY, kidCenters[kidCenters.length - 1], busY);
            }
            kidCenters.forEach(kc => aL(kc, busY, kc, ROW));
        }

        // 손자녀 행 (y = 2*ROW)
        kidItems.forEach((ki, i) => {
            const kc = kidCenters[i];
            const gcs = childrenOf(ki.c.id, ki.cs?.id);
            if (!gcs.length) return;
            const busY = ROW + ROW / 2;
            let gcx = kc - ((gcs.length - 1) * SLOT) / 2;
            const gcCenters = gcs.map(gc => {
                sP(gc.id, gcx, 2 * ROW);
                return gcx++;
            });
            // 위에서 gcx++가 아닌 gcx를 캡처해야 하므로 수정
            let gcx2 = kc - ((gcs.length - 1) * SLOT) / 2;
            const gcCenters2 = gcs.map(gc => { const cx = gcx2; gcx2 += SLOT; return cx; });
            // 이미 sP로 위치가 설정됐으므로 연결선만 추가
            aL(kc, ROW, kc, busY);
            if (gcCenters2.length > 1) aL(gcCenters2[0], busY, gcCenters2[gcCenters2.length - 1], busY);
            gcCenters2.forEach(cx => aL(cx, busY, cx, 2 * ROW));
        });

        // ── 캔버스 경계 ─────────────────────────────────────────
        const posEntries = Object.entries(P);
        if (!posEntries.length) return null;

        const allX = posEntries.map(([, p]) => p.x).concat(lines.flatMap(l => [l.x1, l.x2]));
        const allY = posEntries.map(([, p]) => p.y).concat(lines.flatMap(l => [l.y1, l.y2]));
        const minX = Math.min(...allX) - PAD;
        const maxX = Math.max(...allX) + PAD;
        const minY = Math.min(...allY) - PAD * 0.4;
        const maxY = Math.max(...allY) + PAD * 0.4 + NH;
        const ox = -minX, oy = -minY;
        const W = maxX - minX, H = maxY - minY;

        const nodes = posEntries.map(([id, { x, y }]) => ({
            person: byId.get(Number(id)) || byId.get(id),
            cx: x + ox,
            cy: y + oy,
        })).filter(n => n.person);

        return { nodes, lines, W, H, ox, oy };
    }, [persons, relations, curator]);

    if (!layout || !layout.nodes.length) {
        return (
            <div style={{ textAlign: 'center', color: '#A09888', fontSize: 18, paddingTop: 24 }}>
                첫 가족을 등록해보세요
            </div>
        );
    }

    const { nodes, lines, W, H, ox, oy } = layout;

    return (
        <div style={{ overflowX: 'auto' }}>
            <div style={{ position: 'relative', width: W, height: H, margin: '0 auto' }}>
                {/* SVG 연결선 */}
                <svg width={W} height={H}
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                    {lines.map(({ x1, y1, x2, y2 }, i) => (
                        <line key={i}
                            x1={x1 + ox} y1={y1 + oy + NH / 2}
                            x2={x2 + ox} y2={y2 + oy + NH / 2}
                            stroke={LINE} strokeWidth={1}
                        />
                    ))}
                </svg>
                {/* 텍스트 노드 */}
                {nodes.map(({ person, cx, cy }) => (
                    <PersonNode
                        key={person.id}
                        person={person} curator={curator}
                        selected={anchorPerson?.id === person.id}
                        cx={cx} cy={cy}
                        onClick={() => onPersonClick?.(person)}
                    />
                ))}
            </div>
        </div>
    );
}
