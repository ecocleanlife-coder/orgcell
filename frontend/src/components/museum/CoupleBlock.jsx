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

const CARD_SIZE = 180;
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
        >
            {/* 박스 테두리 2px */}
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
