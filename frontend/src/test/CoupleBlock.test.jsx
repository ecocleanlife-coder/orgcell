import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoupleBlock from '../components/museum/CoupleBlock';

function makeNode(id, gender = 'M', overrides = {}) {
    return {
        id, x: 0, y: 0, depth: 0, z: 0, zOpacity: 1.0, zScale: 1.0,
        data: {
            displayName: id === 'h' ? '이한봉' : '공우영',
            firstName: '', lastName: '',
            gender, initials: id === 'h' ? '이한' : '공우',
            birthday: '', avatar: '',
            photoPosition: { x: 50, y: 50 },
            dateLabel: '', isDeceased: false,
            birthLunar: false, deathLunar: false,
            fsPersonId: '', privacyLevel: 'family',
        },
        rels: { parents: [], spouses: [], children: [] },
        ...overrides,
    };
}

const husband = makeNode('h', 'M');
const wife = makeNode('w', 'F');

describe('CoupleBlock', () => {

    // ── 부부 렌더링 ──

    it('부부 카드 2개 렌더링', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        expect(screen.getByText('이한봉')).toBeTruthy();
        expect(screen.getByText('공우영')).toBeTruthy();
    });

    it('couple-block 래퍼 존재', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        expect(screen.getByTestId('couple-block')).toBeTruthy();
    });

    it('data-couple="true" (부부)', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        expect(screen.getByTestId('couple-block').dataset.couple).toBe('true');
    });

    it('couple-container 테두리', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        expect(screen.getByTestId('couple-container')).toBeTruthy();
    });

    // ── 부부 박스 테두리 (spouse-connector 대체) ──

    it('부부 박스 테두리 존재', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        const container = screen.getByTestId('couple-container');
        expect(container.style.border).toContain('solid');
        expect(container.style.border).toContain('rgb(196, 168, 79)');
    });

    it('부부 박스 테두리 pointer-events: none', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        const container = screen.getByTestId('couple-container');
        expect(container.style.pointerEvents).toBe('none');
    });

    it('부부 박스 너비 = 카드2 + 간격 + 패딩', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} />);
        const container = screen.getByTestId('couple-container');
        // 180*2 + 40 + padding*2 = 420
        expect(container.style.width).toBe('420px');
    });

    it('솔로에도 박스 테두리 존재', () => {
        render(<CoupleBlock husbandNode={husband} />);
        expect(screen.getByTestId('couple-container')).toBeTruthy();
    });

    // ── 솔로 ──

    it('솔로 카드 1개 렌더링', () => {
        render(<CoupleBlock husbandNode={husband} />);
        expect(screen.getByText('이한봉')).toBeTruthy();
        expect(screen.queryByText('공우영')).toBeNull();
    });

    it('data-couple="false" (솔로)', () => {
        render(<CoupleBlock husbandNode={husband} />);
        expect(screen.getByTestId('couple-block').dataset.couple).toBe('false');
    });

    // ── Children 전달 ──

    it('자녀 있을 때 렌더링 정상', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} childrenIds={['c1', 'c2']} />);
        expect(screen.getByTestId('couple-block')).toBeTruthy();
    });

    it('자녀 없을 때 렌더링 정상', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} childrenIds={[]} />);
        expect(screen.getByTestId('couple-block')).toBeTruthy();
    });

    it('솔로 + 자녀 있을 때 렌더링 정상', () => {
        render(<CoupleBlock husbandNode={husband} childrenIds={['c1']} />);
        expect(screen.getByTestId('couple-block')).toBeTruthy();
    });

    // ── 이벤트 ──

    it('onCardClick 전달', () => {
        const fn = vi.fn();
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} onCardClick={fn} />);
        fireEvent.click(screen.getByLabelText('이한봉'));
        expect(fn).toHaveBeenCalledWith('h');
    });

    it('아내 카드 클릭', () => {
        const fn = vi.fn();
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} onCardClick={fn} />);
        fireEvent.click(screen.getByLabelText('공우영'));
        expect(fn).toHaveBeenCalledWith('w');
    });

    // ── 상태 ──

    it('주인공 부부 컨테이너 스타일 (3px solid 금색)', () => {
        render(<CoupleBlock husbandNode={husband} wifeNode={wife} isMainCouple />);
        const container = screen.getByTestId('couple-container');
        expect(container.style.border).toContain('3px');
        expect(container.style.border).toContain('solid');
    });

    // ── 노드 없음 ──

    it('노드 없으면 null 반환', () => {
        const { container } = render(<CoupleBlock />);
        expect(container.innerHTML).toBe('');
    });
});
