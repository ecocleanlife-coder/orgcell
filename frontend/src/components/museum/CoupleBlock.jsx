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
const GAP = 0;          // 부부 카드 간 간격 = 0 (밀착)
const BOX_PAD = 20;     // 외부 패딩 = 20px → totalW = 220×2 + 40 = 480px
const COUPLE_BG = '#F9F7F2';       // 부부 배경색 (연한 미색)
const COUPLE_BORDER = '3px solid #8B7355'; // 부부 박스 외곽 테두리 (§5)

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
    onArrowClick,
    style: externalStyle,
}) {
    const isCouple = !!(husbandNode && wifeNode);
    const soloNode = husbandNode || wifeNode;

    // 컨테이너 크기 계산 (§24: 부부 전체 너비 440px 확정)
    const containerW = isCouple ? CARD_SIZE * 2 + GAP : CARD_SIZE;
    const containerH = CARD_SIZE;
    const totalW = containerW + BOX_PAD * 2; // 440px (부부) / 220px (솔로)
    const totalH = containerH + BOX_PAD * 2 + 10; // +10 for tab

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
            {/* 부부 배경: 외곽 테두리 + 미색. z-index=0 → ConnectorLine SVG(z=5) 뒤에 위치 */}
            {isCouple && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: totalW,
                        height: totalH,
                        borderRadius: '8px',
                        border: COUPLE_BORDER,
                        background: COUPLE_BG,
                        zIndex: 0,
                        pointerEvents: 'none',
                    }}
                    data-testid="couple-container"
                />
            )}

            {isCouple ? (
                <>
                    {/* 남편 (왼쪽): BOX_PAD 안쪽, 개별 테두리 제거 */}
                    <div style={{ position: 'absolute', left: BOX_PAD, top: BOX_PAD }}>
                        <FolderCard
                            node={husbandNode}
                            isSelected={selectedId === husbandNode.id}
                            isMainPerson={isMainCouple && husbandNode.id === selectedId}
                            inCouple={true}
                            onClick={onCardClick}
                            onDoubleClick={onCardDoubleClick}
                            onContextMenu={onContextMenu}
                            onArrowClick={onArrowClick}
                        />
                    </div>

                    {/* 아내 (오른쪽): gap=0 밀착, 개별 테두리 제거 */}
                    <div style={{ position: 'absolute', left: BOX_PAD + CARD_SIZE + GAP, top: BOX_PAD }}>
                        <FolderCard
                            node={wifeNode}
                            isSelected={selectedId === wifeNode.id}
                            isMainPerson={isMainCouple && wifeNode.id === selectedId}
                            inCouple={true}
                            onClick={onCardClick}
                            onDoubleClick={onCardDoubleClick}
                            onContextMenu={onContextMenu}
                            onArrowClick={onArrowClick}
                        />
                    </div>
                </>
            ) : (
                /* 솔로 (홀부모) */
                <div style={{ position: 'absolute', left: BOX_PAD, top: BOX_PAD }}>
                    <FolderCard
                        node={soloNode}
                        isSelected={selectedId === soloNode.id}
                        isMainPerson={isMainCouple}
                        onClick={onCardClick}
                        onDoubleClick={onCardDoubleClick}
                        onContextMenu={onContextMenu}
                        onArrowClick={onArrowClick}
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
        prev.husbandNode?.data?.avatar === next.husbandNode?.data?.avatar &&
        prev.wifeNode?.data?.avatar === next.wifeNode?.data?.avatar &&
        prev.isMainCouple === next.isMainCouple &&
        prev.selectedId === next.selectedId &&
        prev.childrenIds?.length === next.childrenIds?.length &&
        prev.onArrowClick === next.onArrowClick
    );
});
