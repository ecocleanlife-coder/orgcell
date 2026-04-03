import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FolderCard from '../components/museum/FolderCard';

// ── 테스트용 노드 팩토리 ──
function makeNode(overrides = {}) {
    const base = {
        id: '16',
        x: -100, y: 0, depth: 0, z: 0, zOpacity: 1.0, zScale: 1.0,
        data: {
            displayName: '이한봉', firstName: '한봉', lastName: '이',
            gender: 'M', initials: '이한', birthday: '1964-01-12',
            avatar: '', photoPosition: { x: 50, y: 50 },
            dateLabel: '', isDeceased: false,
            birthLunar: false, deathLunar: false,
            fsPersonId: '', privacyLevel: 'family',
        },
        rels: { parents: ['33', '34'], spouses: ['17'], children: ['18', '19', '20', '21'] },
    };
    return {
        ...base, ...overrides,
        data: { ...base.data, ...(overrides.data || {}) },
        rels: { ...base.rels, ...(overrides.rels || {}) },
    };
}

describe('FolderCard — 기록의 벽돌', () => {

    // ── 기본 렌더링 ──

    it('이름 렌더링 (Canvas Front)', () => {
        render(<FolderCard node={makeNode()} />);
        expect(screen.getByText('이한봉')).toBeTruthy();
    });

    it('카드 크기 180×180px', () => {
        render(<FolderCard node={makeNode()} />);
        const card = screen.getByRole('button');
        expect(card.style.width).toBe('180px');
        expect(card.style.height).toBe('180px');
    });

    it('data-person-id 속성', () => {
        render(<FolderCard node={makeNode()} />);
        expect(document.querySelector('[data-person-id="16"]')).toBeTruthy();
    });

    it('aria-label 접근성', () => {
        render(<FolderCard node={makeNode()} />);
        expect(screen.getByLabelText('이한봉')).toBeTruthy();
    });

    // ── 폴더 탭 ──

    it('폴더탭 40×10px', () => {
        const { container } = render(<FolderCard node={makeNode()} />);
        const tab = container.querySelector('[data-testid="folder-tab"]');
        expect(tab.style.width).toBe('40px');
        expect(tab.style.height).toBe('10px');
    });

    // ── 액자 프레임 ──

    it('금색 액자 테두리 1.5px', () => {
        render(<FolderCard node={makeNode()} />);
        const card = screen.getByRole('button');
        expect(card.style.border).toContain('1.5px');
    });

    it('인셋 프레임 존재', () => {
        render(<FolderCard node={makeNode()} />);
        expect(screen.getByTestId('inset-frame')).toBeTruthy();
    });

    // ── Canvas Front (사진 없을 때) ──

    it('Canvas: 이름만 표시, 실루엣 없음', () => {
        render(<FolderCard node={makeNode()} />);
        expect(screen.getByText('이한봉')).toBeTruthy();
        expect(screen.queryByTestId('silhouette')).toBeNull();
    });

    // ── Photo Front (사진 있을 때) ──

    it('Photo: img 태그 렌더링', () => {
        const node = makeNode({ data: { avatar: 'https://example.com/photo.jpg' } });
        render(<FolderCard node={node} />);
        const img = document.querySelector('img[src="https://example.com/photo.jpg"]');
        expect(img).toBeTruthy();
        expect(img.style.objectFit).toBe('cover');
    });

    it('Photo: 하단 그라디언트에 이름 표시', () => {
        const node = makeNode({ data: { avatar: 'https://example.com/photo.jpg', displayName: '이한봉' } });
        render(<FolderCard node={node} />);
        expect(screen.getByText('이한봉')).toBeTruthy();
    });

    it('Photo: 실루엣 배경 없음', () => {
        const node = makeNode({ data: { avatar: 'https://example.com/photo.jpg' } });
        render(<FolderCard node={node} />);
        expect(screen.queryByTestId('silhouette')).toBeNull();
    });

    // ── 사망자 ──

    it('사망자 배지 (†)', () => {
        render(<FolderCard node={makeNode({ data: { isDeceased: true } })} />);
        expect(screen.getByText('†')).toBeTruthy();
    });

    it('생존자에 사망자 배지 없음', () => {
        render(<FolderCard node={makeNode()} />);
        expect(screen.queryByText('†')).toBeNull();
    });

    it('사망자 날짜 레이블', () => {
        render(<FolderCard node={makeNode({ data: { dateLabel: '1935 ~ 2000', isDeceased: true } })} />);
        expect(screen.getByText('1935 ~ 2000')).toBeTruthy();
    });

    // ── 이벤트 ──

    it('onClick 호출', () => {
        const fn = vi.fn();
        render(<FolderCard node={makeNode()} onClick={fn} />);
        fireEvent.click(screen.getByRole('button'));
        expect(fn).toHaveBeenCalledWith('16');
    });

    it('onContextMenu 호출', () => {
        const fn = vi.fn();
        render(<FolderCard node={makeNode()} onContextMenu={fn} />);
        fireEvent.contextMenu(screen.getByRole('button'));
        expect(fn).toHaveBeenCalledWith('16', expect.anything());
    });

    it('키보드 Enter로 클릭', () => {
        const fn = vi.fn();
        render(<FolderCard node={makeNode()} onClick={fn} />);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        expect(fn).toHaveBeenCalledWith('16');
    });

    // ── 상태 스타일 ──

    it('주인공 스타일 (2.5px 테두리)', () => {
        render(<FolderCard node={makeNode()} isMainPerson />);
        const card = screen.getByRole('button');
        expect(card.style.border).toContain('2.5px');
    });

    // ── 3D / Z축 ──

    it('preserve-3d 래퍼', () => {
        const { container } = render(<FolderCard node={makeNode()} />);
        const wrapper = container.querySelector('[data-person-id="16"]');
        expect(wrapper.style.transformStyle).toBe('preserve-3d');
    });

    it('3D 두께: translateZ(10px) 기본', () => {
        render(<FolderCard node={makeNode({ z: 0 })} />);
        const card = screen.getByRole('button');
        expect(card.style.transform).toContain('translateZ(10px)');
    });

    it('Z=0 → 안개 없음', () => {
        render(<FolderCard node={makeNode({ z: 0 })} />);
        expect(screen.queryByTestId('fog-overlay')).toBeNull();
    });

    it('Z=1 → 안개 오버레이', () => {
        render(<FolderCard node={makeNode({ z: 1, zOpacity: 0.4, zScale: 0.85 })} />);
        expect(screen.getByTestId('fog-overlay')).toBeTruthy();
    });

    it('Z=2 → 안개 오버레이', () => {
        render(<FolderCard node={makeNode({ z: 2, zOpacity: 0.15, zScale: 0.7 })} />);
        expect(screen.getByTestId('fog-overlay')).toBeTruthy();
    });

    it('data-z 속성', () => {
        const { container } = render(<FolderCard node={makeNode({ z: 1 })} />);
        expect(container.querySelector('[data-z="1"]')).toBeTruthy();
    });

    // ── 3D box-shadow (두께감) ──

    it('box-shadow에 두께 그림자 포함', () => {
        render(<FolderCard node={makeNode()} />);
        const card = screen.getByRole('button');
        // 6px 8px 0 (thickness shadow)
        expect(card.style.boxShadow).toContain('6px');
    });
});
