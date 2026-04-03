import { describe, it, expect } from 'vitest';
import {
    buildTree,
    normalizeGender,
    parseName,
    getInitials,
    isKoreanName,
    buildMaps,
    filterConnected,
    pickMainId,
    computeDepth,
    classifyZ,
    zOpacity,
    zScale,
    buildNodeData,
    getSiblings,
    SLOT_W,
    Y_GAP,
} from '../utils/buildTree.js';

// ── 테스트 데이터 (이한봉 가족 축소판) ──────────

const PERSONS = [
    { id: 1, name: '이상훈', gender: 'M', generation: 0, birth_date: '1935-01-01', death_date: '2000-01-01', is_deceased: true },
    { id: 2, name: '김순옥', gender: 'F', generation: 0, birth_date: '1938-01-01', death_date: '2010-01-01', is_deceased: true },
    { id: 3, name: '이한봉', gender: 'M', generation: 1, birth_date: '1965-06-15' },
    { id: 4, name: '공우영', gender: 'F', generation: 1, birth_date: '1968-03-20' },
    { id: 5, name: '이승현', gender: 'M', generation: 2, birth_date: '1995-01-10' },
    { id: 6, name: '이승아', gender: 'F', generation: 2, birth_date: '1997-05-20' },
    { id: 7, name: '공석환', gender: 'M', generation: 0, birth_date: '1940-01-01', death_date: '2005-01-01', is_deceased: true },
    { id: 8, name: '민임분', gender: 'F', generation: 0, birth_date: '1942-01-01', death_date: '2015-01-01', is_deceased: true },
];

const RELATIONS = [
    { person1_id: 1, person2_id: 3, relation_type: 'parent' },
    { person1_id: 2, person2_id: 3, relation_type: 'parent' },
    { person1_id: 3, person2_id: 4, relation_type: 'spouse' },
    { person1_id: 3, person2_id: 5, relation_type: 'parent' },
    { person1_id: 4, person2_id: 5, relation_type: 'parent' },
    { person1_id: 3, person2_id: 6, relation_type: 'parent' },
    { person1_id: 4, person2_id: 6, relation_type: 'parent' },
    { person1_id: 7, person2_id: 4, relation_type: 'parent' },
    { person1_id: 8, person2_id: 4, relation_type: 'parent' },
    { person1_id: 7, person2_id: 8, relation_type: 'spouse' },
];

// ── normalizeGender ─────────────────────────────

describe('normalizeGender', () => {
    it('M → M', () => expect(normalizeGender('M')).toBe('M'));
    it('F → F', () => expect(normalizeGender('F')).toBe('F'));
    it('female → F', () => expect(normalizeGender('female')).toBe('F'));
    it('null → M', () => expect(normalizeGender(null)).toBe('M'));
});

// ── parseName ───────────────────────────────────

describe('parseName', () => {
    it('한국식: 이한봉', () => {
        const r = parseName('이한봉');
        expect(r.displayName).toBe('이한봉');
        expect(r.lastName).toBe('이');
        expect(r.firstName).toBe('한봉');
    });
    it('영문: Han Lee', () => {
        const r = parseName('Han Lee');
        expect(r.firstName).toBe('Han');
        expect(r.lastName).toBe('Lee');
    });
    it('null → ?', () => expect(parseName(null).displayName).toBe('?'));
});

// ── getInitials ─────────────────────────────────

describe('getInitials', () => {
    it('한글 → 앞 2글자', () => expect(getInitials('이한봉')).toBe('이한'));
    it('영문 → 이니셜', () => expect(getInitials('Han Lee')).toBe('HL'));
    it('null → ?', () => expect(getInitials(null)).toBe('?'));
});

// ── buildMaps ───────────────────────────────────

describe('buildMaps', () => {
    it('parent 관계 매핑', () => {
        const { parentOf, childrenOf } = buildMaps(PERSONS, RELATIONS);
        expect(parentOf['3']).toEqual(expect.arrayContaining(['1', '2']));
        expect(childrenOf['1']).toContain('3');
    });

    it('spouse 양방향', () => {
        const { spousesOf } = buildMaps(PERSONS, RELATIONS);
        expect(spousesOf['3']).toContain('4');
        expect(spousesOf['4']).toContain('3');
    });

    it('존재하지 않는 person 무시', () => {
        const rels = [{ person1_id: 999, person2_id: 1, relation_type: 'parent' }];
        const { parentOf } = buildMaps(PERSONS, rels);
        expect(parentOf['1']).toBeUndefined();
    });

    it('sibling → 부모 공유', () => {
        const persons = [
            { id: 10, name: '형', generation: 1 },
            { id: 11, name: '동생', generation: 1 },
            { id: 1, name: '아버지', generation: 0 },
        ];
        const rels = [
            { person1_id: 1, person2_id: 10, relation_type: 'parent' },
            { person1_id: 10, person2_id: 11, relation_type: 'sibling' },
        ];
        const { parentOf, childrenOf } = buildMaps(persons, rels);
        expect(parentOf['11']).toContain('1');
        expect(childrenOf['1']).toContain('11');
    });
});

// ── filterConnected ─────────────────────────────

describe('filterConnected', () => {
    it('main에서 연결된 노드만', () => {
        const maps = buildMaps(PERSONS, RELATIONS);
        const allIds = PERSONS.map(p => String(p.id));
        const connected = filterConnected(allIds, maps, '3');
        expect(connected).toHaveLength(8);
    });

    it('고아 제외', () => {
        const orphan = { id: 99, name: '고아', generation: 5 };
        const persons = [...PERSONS, orphan];
        const maps = buildMaps(persons, RELATIONS);
        const allIds = persons.map(p => String(p.id));
        const connected = filterConnected(allIds, maps, '3');
        expect(connected).not.toContain('99');
    });
});

// ── pickMainId ──────────────────────────────────

describe('pickMainId', () => {
    it('generation 1 최소 id', () => expect(pickMainId(PERSONS)).toBe('3'));
    it('빈 배열 → null', () => expect(pickMainId([])).toBeNull());
});

// ── computeDepth ────────────────────────────────

describe('computeDepth', () => {
    const maps = buildMaps(PERSONS, RELATIONS);
    const depth = computeDepth('3', maps);

    it('이한봉(3) = 0', () => expect(depth['3']).toBe(0));
    it('공우영(4) = 0 (배우자)', () => expect(depth['4']).toBe(0));
    it('이상훈(1) = +1 (부모)', () => expect(depth['1']).toBe(1));
    it('이승현(5) = -1 (자녀)', () => expect(depth['5']).toBe(-1));
    it('공석환(7) = +1 (아내 부모)', () => expect(depth['7']).toBe(1));
});

// ── Z축 ─────────────────────────────────────────

describe('Z축', () => {
    it('zOpacity: 0→1.0, 1→0.4, 2→0.15', () => {
        expect(zOpacity(0)).toBe(1.0);
        expect(zOpacity(1)).toBe(0.4);
        expect(zOpacity(2)).toBe(0.15);
    });
    it('zScale: 0→1.0, 1→0.85, 2→0.7', () => {
        expect(zScale(0)).toBe(1.0);
        expect(zScale(1)).toBe(0.85);
        expect(zScale(2)).toBe(0.7);
    });
});

// ── buildNodeData ───────────────────────────────

describe('buildNodeData', () => {
    it('고인 날짜 레이블', () => {
        const node = buildNodeData(PERSONS[0]);
        expect(node.dateLabel).toBe('1935 ~ 2000');
        expect(node.isDeceased).toBe(true);
    });
    it('생존자 날짜 레이블 빈 문자열', () => {
        const node = buildNodeData(PERSONS[2]);
        expect(node.dateLabel).toBe('');
    });
});

// ── buildTree 통합 ──────────────────────────────

describe('buildTree', () => {
    it('빈 배열 → 빈 결과', () => {
        const r = buildTree([], []);
        expect(r.nodes).toHaveLength(0);
        expect(r.mainId).toBeNull();
    });

    it('null → 빈 결과', () => {
        const r = buildTree(null, null);
        expect(r.nodes).toHaveLength(0);
    });

    it('8명 노드', () => {
        const r = buildTree(PERSONS, RELATIONS);
        expect(r.nodes).toHaveLength(8);
        expect(r.mainId).toBe('3');
    });

    it('모든 노드에 x, y 좌표', () => {
        const r = buildTree(PERSONS, RELATIONS);
        for (const n of r.nodes) {
            expect(typeof n.x).toBe('number');
            expect(typeof n.y).toBe('number');
        }
    });

    it('Y축: 조상↑(+), 자손↓(-)', () => {
        const r = buildTree(PERSONS, RELATIONS);
        const main = r.nodes.find(n => n.id === '3');
        const parent = r.nodes.find(n => n.id === '1');
        const child = r.nodes.find(n => n.id === '5');
        expect(main.y).toBe(0);
        expect(parent.y).toBe(270);
        expect(child.y).toBe(-270);
    });

    it('부모→자녀 링크 8개', () => {
        const r = buildTree(PERSONS, RELATIONS);
        expect(r.links.filter(l => l.type === 'parent')).toHaveLength(8);
    });

    it('배우자 링크 2개 (중복 없음)', () => {
        const r = buildTree(PERSONS, RELATIONS);
        expect(r.links.filter(l => l.type === 'spouse')).toHaveLength(2);
    });

    it('Z축 포함', () => {
        const r = buildTree(PERSONS, RELATIONS);
        for (const n of r.nodes) {
            expect(n.z).toBeDefined();
            expect(n.zOpacity).toBeDefined();
            expect(n.zScale).toBeDefined();
        }
    });

    it('overrideMainId', () => {
        const r = buildTree(PERSONS, RELATIONS, 5);
        expect(r.mainId).toBe('5');
    });

    it('constants 레고 표준', () => {
        const r = buildTree(PERSONS, RELATIONS);
        expect(r.constants.SLOT_W).toBe(220);
        expect(r.constants.Y_GAP).toBe(270);
        expect(r.constants.CARD_W).toBe(180);
    });

    it('고아 노드 제외', () => {
        const orphan = { id: 99, name: '고아', gender: 'M', generation: 5 };
        const r = buildTree([...PERSONS, orphan], RELATIONS);
        expect(r.nodes.find(n => n.id === '99')).toBeUndefined();
    });

    it('rels에 parents/spouses/children', () => {
        const r = buildTree(PERSONS, RELATIONS);
        const hb = r.nodes.find(n => n.id === '3');
        expect(hb.rels.parents).toEqual(expect.arrayContaining(['1', '2']));
        expect(hb.rels.spouses).toContain('4');
        expect(hb.rels.children).toEqual(expect.arrayContaining(['5', '6']));
    });

    it('depth 필드 존재', () => {
        const r = buildTree(PERSONS, RELATIONS);
        const hb = r.nodes.find(n => n.id === '3');
        expect(hb.depth).toBe(0);
    });
});
