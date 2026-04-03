import { describe, it, expect } from 'vitest';
import {
    buildTree,
    computeDepth,
    buildMaps,
    classifyZ,
    normalizeGender,
    getSiblings,
    SLOT_W,
    Y_GAP,
} from '../utils/buildTree.js';

// ── EC2 실제 데이터 (site_id=2, 이한봉 가족, 2026-04-02) ──

const PERSONS = [
    { id: 16, name: '이한봉', gender: 'male', generation: 1, birth_date: '1964-01-12' },
    { id: 17, name: '공우영', gender: 'female', generation: 1, birth_date: '1960-04-02' },
    { id: 18, name: '이슬기', gender: 'female', generation: 0, birth_date: '1988-09-08', death_date: '1990-07-12', is_deceased: true },
    { id: 19, name: '이상훈', gender: 'male', generation: 0, birth_date: '1989-12-14' },
    { id: 20, name: '이하영', gender: 'female', generation: 0, birth_date: '1992-03-09' },
    { id: 21, name: '이유경', gender: 'female', generation: 0, birth_date: '1994-07-27' },
    { id: 22, name: '신세라', gender: 'female', generation: 0 },
    { id: 23, name: 'john Lambert', gender: 'male', generation: 0 },
    { id: 24, name: '공인영', gender: 'male', generation: 1 },
    { id: 25, name: '공진영', gender: 'male', generation: 1 },
    { id: 26, name: '공수자', gender: 'female', generation: 1 },
    { id: 27, name: '공정영', gender: 'female', generation: 1 },
    { id: 28, name: '이지섭 Peter', gender: 'male', generation: 0 },
    { id: 29, name: '이은섭/ Lucas', gender: 'male', generation: 0 },
    { id: 32, name: 'Daniel Lee Lambert', gender: 'male', generation: 0 },
    { id: 33, name: '이순호', gender: 'male', generation: 2 },
    { id: 34, name: '임윤님', gender: 'female', generation: 2, birth_date: '1936-03-21' },
    { id: 35, name: '이은미', gender: 'female', generation: 1 },
    { id: 36, name: '이선미', gender: 'female', generation: 1 },
    { id: 37, name: '공석환', gender: 'male', generation: 2 },
    { id: 38, name: '민임분', gender: 'female', generation: 2 },
];

const RELATIONS = [
    { person1_id: 18, person2_id: 19, relation_type: 'sibling' },
    { person1_id: 18, person2_id: 20, relation_type: 'sibling' },
    { person1_id: 18, person2_id: 21, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 24, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 25, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 26, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 27, relation_type: 'sibling' },
    { person1_id: 16, person2_id: 35, relation_type: 'sibling' },
    { person1_id: 16, person2_id: 36, relation_type: 'sibling' },
    { person1_id: 37, person2_id: 17, relation_type: 'parent' },
    { person1_id: 19, person2_id: 29, relation_type: 'parent' },
    { person1_id: 19, person2_id: 28, relation_type: 'parent' },
    { person1_id: 23, person2_id: 32, relation_type: 'parent' },
    { person1_id: 33, person2_id: 16, relation_type: 'parent' },
    { person1_id: 33, person2_id: 35, relation_type: 'parent' },
    { person1_id: 16, person2_id: 18, relation_type: 'parent' },
    { person1_id: 16, person2_id: 21, relation_type: 'parent' },
    { person1_id: 16, person2_id: 19, relation_type: 'parent' },
    { person1_id: 16, person2_id: 20, relation_type: 'parent' },
    { person1_id: 33, person2_id: 36, relation_type: 'parent' },
    { person1_id: 37, person2_id: 24, relation_type: 'parent' },
    { person1_id: 37, person2_id: 25, relation_type: 'parent' },
    { person1_id: 37, person2_id: 26, relation_type: 'parent' },
    { person1_id: 37, person2_id: 27, relation_type: 'parent' },
    { person1_id: 38, person2_id: 17, relation_type: 'parent' },
    { person1_id: 22, person2_id: 29, relation_type: 'parent' },
    { person1_id: 22, person2_id: 28, relation_type: 'parent' },
    { person1_id: 20, person2_id: 32, relation_type: 'parent' },
    { person1_id: 34, person2_id: 16, relation_type: 'parent' },
    { person1_id: 34, person2_id: 35, relation_type: 'parent' },
    { person1_id: 17, person2_id: 18, relation_type: 'parent' },
    { person1_id: 17, person2_id: 21, relation_type: 'parent' },
    { person1_id: 17, person2_id: 19, relation_type: 'parent' },
    { person1_id: 17, person2_id: 20, relation_type: 'parent' },
    { person1_id: 34, person2_id: 36, relation_type: 'parent' },
    { person1_id: 38, person2_id: 24, relation_type: 'parent' },
    { person1_id: 38, person2_id: 25, relation_type: 'parent' },
    { person1_id: 38, person2_id: 26, relation_type: 'parent' },
    { person1_id: 38, person2_id: 27, relation_type: 'parent' },
    { person1_id: 33, person2_id: 34, relation_type: 'spouse' },
    { person1_id: 16, person2_id: 17, relation_type: 'spouse' },
    { person1_id: 19, person2_id: 22, relation_type: 'spouse' },
    { person1_id: 20, person2_id: 23, relation_type: 'spouse' },
    { person1_id: 37, person2_id: 38, relation_type: 'spouse' },
];

// ── computeDepth 검증 ───────────────────────────

describe('computeDepth — 관계 기반 (DB generation 무시)', () => {
    const byId = {};
    for (const p of PERSONS) byId[String(p.id)] = { ...p, gender: normalizeGender(p.gender) };
    const maps = buildMaps(PERSONS, RELATIONS);
    const depth = computeDepth('16', maps);

    it('이한봉 = depth 0', () => expect(depth['16']).toBe(0));
    it('공우영 = depth 0 (배우자)', () => expect(depth['17']).toBe(0));
    it('이순호 = depth +1 (부모)', () => expect(depth['33']).toBe(1));
    it('임윤님 = depth +1', () => expect(depth['34']).toBe(1));
    it('공석환 = depth +1 (아내 부모)', () => expect(depth['37']).toBe(1));
    it('민임분 = depth +1', () => expect(depth['38']).toBe(1));
    it('이상훈 = depth -1 (자녀)', () => expect(depth['19']).toBe(-1));
    it('이하영 = depth -1', () => expect(depth['20']).toBe(-1));
    it('신세라 = depth -1 (자녀 배우자)', () => expect(depth['22']).toBe(-1));
    it('이지섭 = depth -2 (손자)', () => expect(depth['28']).toBe(-2));
    it('Daniel = depth -2 (손자)', () => expect(depth['32']).toBe(-2));
    it('이은미 = depth 0 (형제)', () => expect(depth['35']).toBe(0));
    it('공인영 = depth 0 (아내 형제)', () => expect(depth['24']).toBe(0));
});

// ── Z축 분류 검증 ───────────────────────────────

describe('classifyZ — Z 레이어', () => {
    const byId = {};
    for (const p of PERSONS) byId[String(p.id)] = { ...p, gender: normalizeGender(p.gender) };
    const maps = buildMaps(PERSONS, RELATIONS);
    const depth = computeDepth('16', maps);
    const z = classifyZ('16', maps, depth, byId);

    it('이한봉 Z=0', () => expect(z['16']).toBe(0));
    it('공우영 Z=0', () => expect(z['17']).toBe(0));
    it('이순호 Z=0 (직계)', () => expect(z['33']).toBe(0));
    it('공석환 Z=0 (배우자 부모)', () => expect(z['37']).toBe(0));
    it('이은미 Z=0 (형제)', () => expect(z['35']).toBe(0));
    it('공인영 Z=0 (배우자 형제)', () => expect(z['24']).toBe(0));
    it('이상훈 Z=0 (자녀)', () => expect(z['19']).toBe(0));
    it('신세라 Z=0 (자녀 배우자)', () => expect(z['22']).toBe(0));
    it('이지섭 Z=0 (손자)', () => expect(z['28']).toBe(0));
    it('현재 데이터 전원 Z=0', () => {
        const allZ = Object.values(z);
        expect(allZ.every(v => v === 0)).toBe(true);
    });
});

// ── 통합 buildTree 검증 ────────────────────────

describe('buildTree — 레고 블록 표준 (21명)', () => {
    const result = buildTree(PERSONS, RELATIONS);

    it('21명 전원 노드', () => {
        expect(result.nodes).toHaveLength(21);
    });

    it('mainId = 16', () => {
        expect(result.mainId).toBe('16');
    });

    it('겹치는 카드 0개', () => {
        const coords = result.nodes.map(n => `${n.x},${n.y}`);
        const duplicates = coords.filter((c, i) => coords.indexOf(c) !== i);
        if (duplicates.length > 0) {
            const dupeNodes = result.nodes.filter(n => duplicates.includes(`${n.x},${n.y}`));
            console.log('겹침 발견:', dupeNodes.map(n => `${n.id}(${n.data.displayName}) x:${n.x} y:${n.y}`));
        }
        expect(duplicates).toEqual([]);
    });

    it('Y축: 조상↑(+), 자손↓(-), 본인=0', () => {
        const hb = result.nodes.find(n => n.id === '16');
        const parent = result.nodes.find(n => n.id === '33');
        const child = result.nodes.find(n => n.id === '19');
        expect(hb.y).toBe(0);
        expect(parent.y).toBeGreaterThan(0);   // 부모는 위 (+)
        expect(child.y).toBeLessThan(0);        // 자녀는 아래 (-)
    });

    it('Y축: 세대 간격 220px', () => {
        const hb = result.nodes.find(n => n.id === '16');
        const parent = result.nodes.find(n => n.id === '33');
        expect(parent.y - hb.y).toBe(270);
    });

    it('depth 기반 Y (DB generation 무시)', () => {
        // 이지섭(DB gen=0)은 실제 depth=-2 → y=-540
        const peter = result.nodes.find(n => n.id === '28');
        expect(peter.depth).toBe(-2);
        expect(peter.y).toBe(-540);
    });

    it('X축: 이한봉(남편) x=-110, 공우영(아내) x=+110', () => {
        const hb = result.nodes.find(n => n.id === '16');
        const wy = result.nodes.find(n => n.id === '17');
        expect(hb.x).toBe(-110);
        expect(wy.x).toBe(110);
    });

    it('X축: 남편 형제는 왼쪽(x < -100)', () => {
        const em = result.nodes.find(n => n.id === '35'); // 이은미
        const sm = result.nodes.find(n => n.id === '36'); // 이선미
        expect(em.x).toBeLessThan(-100);
        expect(sm.x).toBeLessThan(-100);
    });

    it('X축: 아내 형제는 오른쪽(x > 100)', () => {
        const iy = result.nodes.find(n => n.id === '24'); // 공인영
        const jy = result.nodes.find(n => n.id === '25'); // 공진영
        const sj = result.nodes.find(n => n.id === '26'); // 공수자
        const jy2 = result.nodes.find(n => n.id === '27'); // 공정영
        expect(iy.x).toBeGreaterThan(100);
        expect(jy.x).toBeGreaterThan(100);
        expect(sj.x).toBeGreaterThan(100);
        expect(jy2.x).toBeGreaterThan(100);
    });

    it('공석환(37) + 민임분(38) 부부 인접, 같은 y', () => {
        const n37 = result.nodes.find(n => n.id === '37');
        const n38 = result.nodes.find(n => n.id === '38');
        expect(Math.abs(n37.x - n38.x)).toBe(220);
        expect(n37.y).toBe(n38.y);
        expect(n37.y).toBe(270); // depth +1
    });

    it('모든 부부 간격 200px', () => {
        const spouseLinks = result.links.filter(l => l.type === 'spouse');
        for (const link of spouseLinks) {
            const n1 = result.nodes.find(n => n.id === link.source);
            const n2 = result.nodes.find(n => n.id === link.target);
            expect(Math.abs(n1.x - n2.x)).toBe(220);
            expect(n1.y).toBe(n2.y);
        }
    });

    it('Z축: 전원 Z=0', () => {
        for (const n of result.nodes) {
            expect(n.z).toBe(0);
            expect(n.zOpacity).toBe(1.0);
            expect(n.zScale).toBe(1.0);
        }
    });

    it('constants에 레고 표준', () => {
        expect(result.constants.SLOT_W).toBe(220);
        expect(result.constants.Y_GAP).toBe(270);
        expect(result.constants.CARD_W).toBe(180);
    });

    it('전체 좌표 출력', () => {
        const summary = result.nodes
            .sort((a, b) => b.depth - a.depth || a.x - b.x)
            .map(n => ({
                id: n.id,
                name: n.data.displayName,
                depth: n.depth,
                x: n.x,
                y: n.y,
                z: n.z,
            }));
        console.table(summary);
        expect(summary).toHaveLength(21);
    });
});
