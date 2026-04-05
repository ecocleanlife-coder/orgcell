/**
 * ConnectorLine.jsx — 부모 커플 → 자녀 그룹 브라켓 커넥터
 *
 * 표준 가계도 패턴:
 *   부부 중심에서 수직선 → 수평 버스 → 각 자녀에 수직 드롭
 *   자녀 1명이면 직선
 */
import React from 'react';

const FRAME_COLOR = '#C4A84F';

/**
 * @param {number} parentX  - 부부 중심 x (screen)
 * @param {number} parentY  - 부부 하단 y (screen)
 * @param {Array}  children - [{ x, y }] 자녀 상단 좌표 (screen)
 */
function ConnectorLine({ parentX, parentY, children }) {
    if (!children || children.length === 0) return null;

    const midY = (parentY + children[0].y) / 2;

    const parts = [];

    if (children.length === 1) {
        parts.push(`M ${parentX} ${parentY} L ${parentX} ${midY} L ${children[0].x} ${midY} L ${children[0].x} ${children[0].y}`);
    } else {
        parts.push(`M ${parentX} ${parentY} L ${parentX} ${midY}`);

        const xs = children.map(c => c.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        parts.push(`M ${minX} ${midY} L ${maxX} ${midY}`);

        for (const c of children) {
            parts.push(`M ${c.x} ${midY} L ${c.x} ${c.y}`);
        }
    }

    return (
        <path
            d={parts.join(' ')}
            fill="none"
            stroke={FRAME_COLOR}
            strokeWidth={2}
            strokeOpacity={0.7}
            strokeLinejoin="round"
            data-testid="connector-line"
        />
    );
}

export default React.memo(ConnectorLine);
