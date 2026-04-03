import { describe, it, expect } from 'vitest';
import { buildTree, SLOT_W, Y_GAP } from '../utils/buildTree.js';

// ── EC2 실제 데이터 (site_id=1, 2026-04-02 추출) ──

const PERSONS = [
    { id: 1, name: '김할아버지', gender: 'M', generation: 0, birth_year: 1940 },
    { id: 2, name: '김할머니', gender: 'F', generation: 0, birth_year: 1943 },
    { id: 3, name: '이할아버지', gender: 'M', generation: 0, birth_year: 1938 },
    { id: 4, name: '이할머니', gender: 'F', generation: 0, birth_year: 1941 },
    { id: 5, name: '김아버지 John', gender: 'M', generation: 1, birth_year: 1968 },
    { id: 6, name: '이어머니 Jane', gender: 'F', generation: 1, birth_year: 1970 },
    { id: 7, name: '김장남 Son1', gender: 'M', generation: 2, birth_year: 1995 },
    { id: 8, name: '장남배우자', gender: 'F', generation: 2, birth_year: 1996 },
    { id: 9, name: '김장녀 Daughter1', gender: 'F', generation: 2, birth_year: 1997 },
    { id: 10, name: '장녀배우자', gender: 'M', generation: 2, birth_year: 1995 },
    { id: 11, name: '김차남 Son2', gender: 'M', generation: 2, birth_year: 1999 },
    { id: 12, name: '김차녀 Daughter2', gender: 'F', generation: 2, birth_year: 2001 },
    { id: 13, name: '김손자', gender: 'M', generation: 3, birth_year: 2020 },
    { id: 14, name: '김손녀1', gender: 'F', generation: 3, birth_year: 2022 },
    { id: 15, name: '김손녀2', gender: 'F', generation: 3, birth_year: 2024 },
];

const RELATIONS = [
    { person1_id: 1, person2_id: 5, relation_type: 'parent' },
    { person1_id: 3, person2_id: 6, relation_type: 'parent' },
    { person1_id: 5, person2_id: 11, relation_type: 'parent' },
    { person1_id: 5, person2_id: 12, relation_type: 'parent' },
    { person1_id: 5, person2_id: 7, relation_type: 'parent' },
    { person1_id: 5, person2_id: 9, relation_type: 'parent' },
    { person1_id: 7, person2_id: 13, relation_type: 'parent' },
    { person1_id: 9, person2_id: 14, relation_type: 'parent' },
    { person1_id: 9, person2_id: 15, relation_type: 'parent' },
    { person1_id: 2, person2_id: 5, relation_type: 'parent' },
    { person1_id: 4, person2_id: 6, relation_type: 'parent' },
    { person1_id: 6, person2_id: 11, relation_type: 'parent' },
    { person1_id: 6, person2_id: 12, relation_type: 'parent' },
    { person1_id: 6, person2_id: 7, relation_type: 'parent' },
    { person1_id: 6, person2_id: 9, relation_type: 'parent' },
    { person1_id: 8, person2_id: 13, relation_type: 'parent' },
    { person1_id: 10, person2_id: 14, relation_type: 'parent' },
    { person1_id: 10, person2_id: 15, relation_type: 'parent' },
    { person1_id: 1, person2_id: 2, relation_type: 'spouse' },
    { person1_id: 3, person2_id: 4, relation_type: 'spouse' },
    { person1_id: 5, person2_id: 6, relation_type: 'spouse' },
    { person1_id: 7, person2_id: 8, relation_type: 'spouse' },
    { person1_id: 9, person2_id: 10, relation_type: 'spouse' },
];

describe('buildTree — site_id=1 (15명) 레고 표준', () => {
    const result = buildTree(PERSONS, RELATIONS);

    it('15명 노드', () => expect(result.nodes).toHaveLength(15));

    it('겹치는 카드 0개', () => {
        const coords = result.nodes.map(n => `${n.x},${n.y}`);
        const duplicates = coords.filter((c, i) => coords.indexOf(c) !== i);
        if (duplicates.length > 0) {
            const dupeNodes = result.nodes.filter(n => duplicates.includes(`${n.x},${n.y}`));
            console.log('겹침:', dupeNodes.map(n => `${n.id}(${n.data.displayName}) x:${n.x} y:${n.y}`));
        }
        expect(duplicates).toEqual([]);
    });

    it('Y축: 조상↑, 자손↓', () => {
        const main = result.nodes.find(n => n.id === '5');
        const parent = result.nodes.find(n => n.id === '1');
        const child = result.nodes.find(n => n.id === '7');
        expect(main.y).toBe(0);
        expect(parent.y).toBeGreaterThan(0);
        expect(child.y).toBeLessThan(0);
    });

    it('부부 간격 200px', () => {
        const spouseLinks = result.links.filter(l => l.type === 'spouse');
        for (const link of spouseLinks) {
            const n1 = result.nodes.find(n => n.id === link.source);
            const n2 = result.nodes.find(n => n.id === link.target);
            expect(Math.abs(n1.x - n2.x)).toBe(220);
            expect(n1.y).toBe(n2.y);
        }
    });

    it('양가 조부모 같은 y, 다른 x', () => {
        const g1 = result.nodes.find(n => n.id === '1');
        const g3 = result.nodes.find(n => n.id === '3');
        expect(g1.y).toBe(g3.y);
        expect(g1.x).not.toBe(g3.x);
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
            }));
        console.table(summary);
        expect(summary).toHaveLength(15);
    });
});
