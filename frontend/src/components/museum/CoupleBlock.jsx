/**
 * CoupleBlock.jsx — 부부/솔로 박스 컴포넌트
 *
 * - 부부: FolderCard 2개를 금색 박스로 래핑
 * - 솔로(홀부모): FolderCard 1개를 금색 박스로 래핑
 * - 박스 테두리 1.5px (커넥터 선과 동일 굵기)
 * - 부부 사이 별도 선 없음 (박스가 관계를 표현)
 */
import React from 'react';
import FolderCard from './FolderCard';

const CARD_SIZE = 180;  // 3D 큐브 정면 너비 (Cube3D.FRONT_W)
const GAP = 40;
const FRAME_COLOR = '#C4A84F';

// ── 메인 컴포넌트 ──
function CoupleBlock({
    husbandNode = null,
    wifeNode = null,
    isMainCouple = false,
    selectedId = null,
    childrenIds = [],
    onCardClick,
    onContextMenu,
    onAction,
    style: externalStyle,
}) {
    const isCouple = !!(husbandNode && wifeNode);
    const soloNode = husbandNode || wifeNode;

    // 컨테이너 크기 계산
    const containerW = isCouple ? CARD_SIZE * 2 + GAP : CARD_SIZE;
    const containerH = CARD_SIZE;
    const padding = 10;
    const totalW = containerW + padding * 2;
    const totalH = containerH + padding * 2 + 10; // +10 for tab

    // Z-depth: 인척(사위/며느리 등) 감지 — 부부 중 하나라도 Z≥1이면 depth 효과
    const maxZ = Math.max(husbandNode?.z ?? 0, wifeNode?.z ?? 0);
    const hasDepth = maxZ >= 1;
    const depthBlur = hasDepth ? (maxZ === 1 ? 2 : 5) : 0;
    const depthOpacity = hasDepth ? (maxZ === 1 ? 0.55 : 0.3) : 1;

    // 박스 스타일: 주인공 부부 = 진한 금색, 일반 = 옅은 금색
    const borderColor = '#C4A84F';
    const containerBg = 'transparent';

    if (!soloNode) return null;

    return (
        <div
            style={{
                ...externalStyle,
                position: externalStyle?.position || 'relative',
                width: totalW,
                height: totalH,
            }}
            data-testid="couple-block"
            data-couple={isCouple ? 'true' : 'false'}
            data-z-depth={maxZ}
        >
            {/* Z-depth 안개 배경 레이어: 타 가문 인척만 표시 */}
            {hasDepth && (
                <div
                    data-testid="z-depth-fog"
                    style={{
                        position: 'absolute',
                        top: -8,
                        left: -8,
                        width: totalW + 16,
                        height: totalH + 16,
                        borderRadius: '12px',
                        background: `radial-gradient(ellipse at center, rgba(30,26,20,${0.3 + maxZ * 0.15}) 0%, rgba(30,26,20,0.05) 80%, transparent 100%)`,
                        backdropFilter: `blur(${depthBlur}px)`,
                        WebkitBackdropFilter: `blur(${depthBlur}px)`,
                        pointerEvents: 'none',
                        zIndex: -1,
                        transition: 'all 0.4s ease',
                    }}
                />
            )}

            {/* 박스 테두리 */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: totalW,
                    height: totalH,
                    border: `3px solid ${borderColor}`,
                    borderRadius: '8px',
                    background: containerBg,
                    boxSizing: 'border-box',
                    pointerEvents: 'none',
                    opacity: hasDepth ? depthOpacity : 1,
                    transition: 'opacity 0.4s ease',
                }}
                data-testid="couple-container"
            />

            {isCouple ? (
                <>
                    {/* 남편 (왼쪽) */}
                    <div style={{ position: 'absolute', left: padding, top: padding }}>
                        <FolderCard
                            node={husbandNode}
                            isSelected={selectedId === husbandNode.id}
                            isMainPerson={isMainCouple && husbandNode.id === selectedId}
                            onClick={onCardClick}
                            onContextMenu={onContextMenu}
                            onAction={onAction}
                        />
                    </div>

                    {/* 아내 (오른쪽) */}
                    <div style={{ position: 'absolute', left: padding + CARD_SIZE + GAP, top: padding }}>
                        <FolderCard
                            node={wifeNode}
                            isSelected={selectedId === wifeNode.id}
                            isMainPerson={isMainCouple && wifeNode.id === selectedId}
                            onClick={onCardClick}
                            onContextMenu={onContextMenu}
                            onAction={onAction}
                        />
                    </div>
                </>
            ) : (
                /* 솔로 (홀부모) */
                <div style={{ position: 'absolute', left: padding, top: padding }}>
                    <FolderCard
                        node={soloNode}
                        isSelected={selectedId === soloNode.id}
                        isMainPerson={isMainCouple}
                        onClick={onCardClick}
                        onContextMenu={onContextMenu}
                        onAction={onAction}
                    />
                </div>
            )}
        </div>
    );
}

export default React.memo(CoupleBlock, (prev, next) => {
    return (
        prev.husbandNode?.id === next.husbandNode?.id &&
        prev.wifeNode?.id === next.wifeNode?.id &&
        prev.husbandNode?.z === next.husbandNode?.z &&
        prev.wifeNode?.z === next.wifeNode?.z &&
        prev.isMainCouple === next.isMainCouple &&
        prev.selectedId === next.selectedId &&
        prev.childrenIds?.length === next.childrenIds?.length
    );
});
