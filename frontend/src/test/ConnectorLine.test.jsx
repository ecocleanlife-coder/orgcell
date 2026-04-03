import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ConnectorLine from '../components/museum/ConnectorLine';

describe('ConnectorLine', () => {
    it('SVG path 렌더링', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={100} parentY={100} children={[{ x: 100, y: 300 }]} />
            </svg>
        );
        const path = container.querySelector('path');
        expect(path).toBeTruthy();
        expect(path.getAttribute('d')).toContain('M 100 100');
    });

    it('금색 stroke', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={0} parentY={0} children={[{ x: 0, y: 200 }]} />
            </svg>
        );
        const path = container.querySelector('path');
        expect(path.getAttribute('stroke')).toBe('#C4A84F');
    });

    it('Z=0 → opacity 0.7', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={0} parentY={0} children={[{ x: 0, y: 200 }]} z={0} />
            </svg>
        );
        expect(container.querySelector('path').getAttribute('stroke-opacity')).toBe('0.7');
    });

    it('Z=1 → opacity 0.3', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={0} parentY={0} children={[{ x: 0, y: 200 }]} z={1} />
            </svg>
        );
        expect(container.querySelector('path').getAttribute('stroke-opacity')).toBe('0.3');
    });

    it('Z=2 → opacity 0.1', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={0} parentY={0} children={[{ x: 0, y: 200 }]} z={2} />
            </svg>
        );
        expect(container.querySelector('path').getAttribute('stroke-opacity')).toBe('0.1');
    });

    it('자녀 1명 → 직선 경로', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={100} parentY={100} children={[{ x: 100, y: 300 }]} />
            </svg>
        );
        const d = container.querySelector('path').getAttribute('d');
        expect(d).toContain('M 100 100');
        expect(d).toContain('L 100 300');
    });

    it('자녀 2명 → 수평 버스 포함', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={150} parentY={100} children={[{ x: 50, y: 300 }, { x: 250, y: 300 }]} />
            </svg>
        );
        const d = container.querySelector('path').getAttribute('d');
        // 수평 버스: minX 50 ~ maxX 250
        expect(d).toContain('M 50 200 L 250 200');
    });

    it('자녀 없으면 null 반환', () => {
        const { container } = render(
            <svg>
                <ConnectorLine parentX={0} parentY={0} children={[]} />
            </svg>
        );
        expect(container.querySelector('path')).toBeNull();
    });
});
