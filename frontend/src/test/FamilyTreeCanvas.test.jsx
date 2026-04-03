import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import FamilyTreeCanvas from '../components/museum/FamilyTreeCanvas';
import { buildTree } from '../utils/buildTree';

// jsdom 폴리필
beforeAll(() => {
    if (!globalThis.ResizeObserver) {
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
    if (!window.matchMedia) {
        window.matchMedia = (query) => ({
            matches: false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
        });
    }
});

// ── 최소 테스트 데이터 (3명: 부모+자녀) ──
const PERSONS = [
    { id: 1, name: '아버지', gender: 'M', generation: 1 },
    { id: 2, name: '어머니', gender: 'F', generation: 1 },
    { id: 3, name: '아들', gender: 'M', generation: 0 },
];
const RELATIONS = [
    { person1_id: 1, person2_id: 2, relation_type: 'spouse' },
    { person1_id: 1, person2_id: 3, relation_type: 'parent' },
    { person1_id: 2, person2_id: 3, relation_type: 'parent' },
];

describe('FamilyTreeCanvas', () => {
    it('빈 데이터 → "데이터 없음"', () => {
        render(<FamilyTreeCanvas nodes={[]} links={[]} />);
        expect(screen.getByTestId('tree-canvas-empty')).toBeTruthy();
    });

    it('3명 데이터 → tree-canvas 렌더링', () => {
        const { nodes, links, mainId } = buildTree(PERSONS, RELATIONS);
        render(<FamilyTreeCanvas nodes={nodes} links={links} mainId={mainId} />);
        expect(screen.getByTestId('tree-canvas')).toBeTruthy();
    });

    it('카드 3개 렌더링', () => {
        const { nodes, links, mainId } = buildTree(PERSONS, RELATIONS);
        render(<FamilyTreeCanvas nodes={nodes} links={links} mainId={mainId} />);
        expect(screen.getByText('아버지')).toBeTruthy();
        expect(screen.getByText('어머니')).toBeTruthy();
        expect(screen.getByText('아들')).toBeTruthy();
    });

    it('SVG 커넥터 레이어 존재', () => {
        const { nodes, links, mainId } = buildTree(PERSONS, RELATIONS);
        render(<FamilyTreeCanvas nodes={nodes} links={links} mainId={mainId} />);
        expect(screen.getByTestId('connector-svg')).toBeTruthy();
    });

    it('부모→자녀 커넥터 라인 존재', () => {
        const { nodes, links, mainId } = buildTree(PERSONS, RELATIONS);
        const { container } = render(<FamilyTreeCanvas nodes={nodes} links={links} mainId={mainId} />);
        const paths = container.querySelectorAll('[data-testid="connector-line"]');
        expect(paths.length).toBeGreaterThan(0);
    });

    it('줌 컨트롤 버튼 3개', () => {
        const { nodes, links, mainId } = buildTree(PERSONS, RELATIONS);
        render(<FamilyTreeCanvas nodes={nodes} links={links} mainId={mainId} />);
        expect(screen.getByTitle('확대')).toBeTruthy();
        expect(screen.getByTitle('축소')).toBeTruthy();
        expect(screen.getByTitle('리셋')).toBeTruthy();
    });
});
