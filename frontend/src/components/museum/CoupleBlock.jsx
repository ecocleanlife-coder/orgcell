/**
 * CoupleBlock.jsx — 부부/솔로 박스 컴포넌트
 *
 * - 부부: FolderCard 2개를 미색 배경 사각형으로 감쌈 (테두리 없음)
 * - 솔로(홀부모): FolderCard 1개, 배경/박스 없음
 * - VISION.md §23: 배경색 레이어는 ConnectorLine SVG보다 뒤에 위치 (z-index로 보장)
 */
import React from 'react';
import FolderCard from './FolderCard';

const CARD_SIZE = 220;
const GAP = 0;  // 부부 카드 간 간격 = 0 (붙어있음)
const COUPLE_BG = '#F9F7F2';  // 부부 배경색 (연한 미색)

// ── 메인 컴포넌트 ──
function CoupleBlock({
    husbandNode = null,
    wifeNode = null,
    isMainCouple = false,
    selectedId = null,
    childrenIds = [],
    onCardClick,
    onCardDoubleClick,
    onContextMenu,
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
            {/* 부부 배경: 테두리 없음, 연한 미색만. z-index=0 → ConnectorLine SVG(z=5) 뒤에 위치 */}
            {isCouple && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: totalW,
                        height: totalH,
                        borderRadius: '8px',
                        background: COUPLE_BG,
                        zIndex: 0,
                        pointerEvents: 'none',
                    }}
                    data-testid="couple-container"
                />
            )}

            {isCouple ? (
                <>
                    {/* 남편 (왼쪽) */}
                    <div style={{ position: 'absolute', left: padding, top: padding }}>
                        <FolderCard
                            node={husbandNode}
                            isSelected={selectedId === husbandNode.id}
                            isMainPerson={isMainCouple && husbandNode.id === selectedId}
                            onClick={onCardClick}
                            onDoubleClick={onCardDoubleClick}
                            onContextMenu={onContextMenu}
                        />
                    </div>

                    {/* 아내 (오른쪽) */}
                    <div style={{ position: 'absolute', left: padding + CARD_SIZE + GAP, top: padding }}>
                        <FolderCard
                            node={wifeNode}
                            isSelected={selectedId === wifeNode.id}
                            isMainPerson={isMainCouple && wifeNode.id === selectedId}
                            onClick={onCardClick}
                            onDoubleClick={onCardDoubleClick}
                            onContextMenu={onContextMenu}
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
                        onDoubleClick={onCardDoubleClick}
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
        prev.isMainCouple === next.isMainCouple &&
        prev.selectedId === next.selectedId &&
        prev.childrenIds?.length === next.childrenIds?.length
    );
});
