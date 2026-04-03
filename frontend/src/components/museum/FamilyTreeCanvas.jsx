/**
 * FamilyTreeCanvas.jsx — 전체 가계도 캔버스
 *
 * buildTree() 출력 → CoupleBlocks + ConnectorLines 렌더링
 * - 절대 위치 기반 레이아웃 (220px 그리드)
 * - SVG 커넥터: 부부 박스 하단 중심 → 수평 버스 → 자녀 박스 상단
 * - Pan/Zoom (react-zoom-pan-pinch)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import CoupleBlock from './CoupleBlock';
import ConnectorLine from './ConnectorLine';
import { useWormholeTransition, WormholeWrapper } from './WormholeTransition';

const CARD_SIZE = 180;
const CARD_HALF = 90;
const TAB_H = 10;
const BOX_PAD = 10;  // CoupleBlock 내부 패딩
const GAP = 40;      // 카드 간 간격

// CoupleBlock 전체 높이: CARD_SIZE + padding*2 + TAB_H
const BOX_H = CARD_SIZE + BOX_PAD * 2 + TAB_H; // 210

/**
 * nodes/links → couple 단위 그룹핑
 * 모든 노드를 couple 또는 solo로 분류
 */
function groupCouples(nodes, links) {
    const nodesMap = {};
    for (const n of nodes) nodesMap[n.id] = n;

    const spouseLinks = links.filter(l => l.type === 'spouse');
    const paired = new Set();
    const couples = [];

    for (const link of spouseLinks) {
        if (paired.has(link.source) || paired.has(link.target)) continue;
        const n1 = nodesMap[link.source];
        const n2 = nodesMap[link.target];
        if (!n1 || !n2) continue;

        const husband = n1.data.gender === 'M' ? n1 : n2;
        const wife = n1.data.gender === 'M' ? n2 : n1;
        couples.push({ husband, wife });
        paired.add(link.source);
        paired.add(link.target);
    }

    for (const n of nodes) {
        if (!paired.has(n.id)) {
            couples.push({ husband: n.data.gender === 'M' ? n : null, wife: n.data.gender === 'F' ? n : null });
        }
    }

    return couples;
}

/**
 * 트리 바운드 계산
 */
function calcBounds(nodes) {
    if (nodes.length === 0) return { minX: 0, maxX: 400, minY: 0, maxY: 400 };
    const margin = 140;
    const xs = nodes.map(n => n.x);
    return {
        minX: Math.min(...xs) - CARD_HALF - margin,
        maxX: Math.max(...xs) + CARD_HALF + margin,
    };
}

// ── 줌 컨트롤 ──
function ZoomControls({ zoomIn, zoomOut, resetTransform }) {
    const btnStyle = {
        width: 32, height: 32,
        border: '1px solid #C4A84F',
        borderRadius: '4px',
        background: 'rgba(30,26,20,0.9)',
        color: '#C4A84F',
        fontSize: '16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', gap: 6 }}>
            <button style={btnStyle} onClick={() => zoomIn()} title="확대">+</button>
            <button style={btnStyle} onClick={() => zoomOut()} title="축소">−</button>
            <button style={{ ...btnStyle, fontSize: '12px' }} onClick={() => resetTransform()} title="리셋">⌂</button>
        </div>
    );
}

// ── 메인 컴포넌트 ──
export default function FamilyTreeCanvas({
    nodes = [],
    links = [],
    mainId = null,
    selectedId: externalSelectedId = null,
    onCardClick: externalOnClick,
    onWormhole,
    onContextMenu,
    onAction,
    style,
}) {
    const [internalSelectedId, setInternalSelectedId] = useState(null);
    const selectedId = externalSelectedId ?? internalSelectedId;

    const nodesMap = useMemo(() => {
        const m = {};
        for (const n of nodes) m[n.id] = n;
        return m;
    }, [nodes]);

    // Wormhole
    const handleWormholeTransition = useCallback((newMainId) => {
        if (onWormhole) onWormhole(newMainId);
    }, [onWormhole]);
    const { phase, trigger: triggerWormhole } = useWormholeTransition(handleWormholeTransition);

    const handleCardClick = useCallback((nodeId) => {
        const node = nodesMap[nodeId];
        if (node && node.z >= 1 && onWormhole) {
            triggerWormhole(nodeId);
        } else if (externalOnClick) {
            externalOnClick(nodeId);
        } else {
            setInternalSelectedId(nodeId);
        }
    }, [nodesMap, onWormhole, externalOnClick, triggerWormhole]);

    // Z=0만 표시 (타가문은 웜홀 전환 전까지 숨김)
    const visibleNodes = useMemo(() => nodes.filter(n => n.z === 0), [nodes]);
    const visibleIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
    const visibleLinks = useMemo(() => links.filter(l => visibleIds.has(l.source) && visibleIds.has(l.target)), [links, visibleIds]);

    const bounds = useMemo(() => calcBounds(visibleNodes), [visibleNodes]);
    const couples = useMemo(() => groupCouples(visibleNodes, visibleLinks), [visibleNodes, visibleLinks]);

    // 자녀 ID 맵
    const childrenMap = useMemo(() => {
        const parentLinks = visibleLinks.filter(l => l.type === 'parent');
        const map = {};
        for (const link of parentLinks) {
            if (!map[link.source]) map[link.source] = new Set();
            map[link.source].add(link.target);
        }
        return map;
    }, [visibleLinks]);

    // ── 스크린 좌표 변환 ──
    const screenYs = visibleNodes.map(n => -n.y);
    const screenBounds = useMemo(() => ({
        minY: visibleNodes.length > 0 ? Math.min(...screenYs) - CARD_HALF - 140 - TAB_H : 0,
        maxY: visibleNodes.length > 0 ? Math.max(...screenYs) + CARD_HALF + 140 + 30 : 400,
    }), [visibleNodes, screenYs]);

    const canvasW = bounds.maxX - bounds.minX;
    const realCanvasH = screenBounds.maxY - screenBounds.minY;

    const toScreenX = (x) => x - bounds.minX;
    const toScreenY = (treeY) => -treeY - screenBounds.minY;

    // ── 커플/솔로별 박스 위치 (screen coords) ──
    const couplePositions = useMemo(() => {
        const positions = {};

        for (const couple of couples) {
            const { husband, wife } = couple;
            const isCouple = !!(husband && wife);
            const soloNode = husband || wife;
            if (!soloNode) continue;

            if (isCouple) {
                const leftNode = husband.x < wife.x ? husband : wife;
                const boxLeft = toScreenX(leftNode.x) - CARD_HALF - BOX_PAD;
                const boxTop = toScreenY(leftNode.y) - CARD_HALF - TAB_H - BOX_PAD;
                const boxW = CARD_SIZE * 2 + GAP + BOX_PAD * 2;
                const boxCenterX = boxLeft + boxW / 2;
                const boxBottom = boxTop + BOX_H;

                // 두 사람 모두 이 박스에 매핑
                const key = `${husband.id}-${wife.id}`;
                positions[husband.id] = { key, centerX: boxCenterX, top: boxTop, bottom: boxBottom };
                positions[wife.id] = { key, centerX: boxCenterX, top: boxTop, bottom: boxBottom };
            } else {
                const boxLeft = toScreenX(soloNode.x) - CARD_HALF - BOX_PAD;
                const boxTop = toScreenY(soloNode.y) - CARD_HALF - TAB_H - BOX_PAD;
                const boxW = CARD_SIZE + BOX_PAD * 2;
                const boxCenterX = boxLeft + boxW / 2;
                const boxBottom = boxTop + BOX_H;

                positions[soloNode.id] = { key: soloNode.id, centerX: boxCenterX, top: boxTop, bottom: boxBottom };
            }
        }

        return positions;
    }, [couples, bounds, screenBounds]);

    // ── 커넥터 계산 (screen coords 직접) ──
    const connectors = useMemo(() => {
        const spouseOf = {};
        for (const l of visibleLinks.filter(l => l.type === 'spouse')) {
            spouseOf[l.source] = l.target;
            spouseOf[l.target] = l.source;
        }

        const childrenOfParent = {};
        for (const l of visibleLinks.filter(l => l.type === 'parent')) {
            if (!childrenOfParent[l.source]) childrenOfParent[l.source] = new Set();
            childrenOfParent[l.source].add(l.target);
        }

        const result = [];
        const processed = new Set();

        for (const pid of Object.keys(childrenOfParent)) {
            const coupleKey = spouseOf[pid]
                ? [pid, spouseOf[pid]].sort().join('-')
                : pid;
            if (processed.has(coupleKey)) continue;
            processed.add(coupleKey);

            const parentIds = [pid];
            if (spouseOf[pid]) parentIds.push(spouseOf[pid]);

            const allChildren = new Set();
            for (const p of parentIds) {
                for (const cid of (childrenOfParent[p] || [])) allChildren.add(cid);
            }

            const parentPos = couplePositions[pid];
            if (!parentPos) continue;

            const childEntries = [...allChildren]
                .map(cid => {
                    const cp = couplePositions[cid];
                    const node = nodesMap[cid];
                    if (!cp || !node) return null;
                    // 개인 위치 (커플 박스 중심이 아닌 본인 카드 중심)
                    const personalX = toScreenX(node.x);
                    return { x: personalX, y: cp.top };
                })
                .filter(Boolean);
            if (childEntries.length === 0) continue;

            const z = Math.min(...parentIds.map(id => nodesMap[id]?.z ?? 0));

            result.push({
                key: coupleKey,
                parentX: parentPos.centerX,
                parentY: parentPos.bottom + 5,
                children: childEntries.map(cp => ({
                    x: cp.x,
                    y: cp.y - 5,
                })),
                z,
            });
        }

        return result;
    }, [visibleLinks, couplePositions, nodesMap]);

    if (visibleNodes.length === 0) {
        return <div data-testid="tree-canvas-empty" style={{ color: '#7A6E5E', padding: 40 }}>데이터 없음</div>;
    }

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: style?.height || 600,
                overflow: 'hidden',
                background: '#1E1A14',
                borderRadius: '8px',
                ...style,
            }}
            data-testid="tree-canvas"
        >
            <WormholeWrapper phase={phase}>
            <TransformWrapper
                initialScale={0.6}
                minScale={0.2}
                maxScale={2}
                centerOnInit
                limitToBounds={false}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} resetTransform={resetTransform} />
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: canvasW, height: realCanvasH }}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    width: canvasW,
                                    height: realCanvasH,
                                }}
                            >
                                {/* SVG 커넥터: 박스 하단 → 버스 → 자녀 박스 상단 */}
                                <svg
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: canvasW,
                                        height: realCanvasH,
                                        zIndex: 5,
                                        pointerEvents: 'none',
                                    }}
                                    data-testid="connector-svg"
                                >
                                    {connectors.map(c => (
                                        <ConnectorLine
                                            key={c.key}
                                            parentX={c.parentX}
                                            parentY={c.parentY}
                                            children={c.children}
                                            z={c.z}
                                        />
                                    ))}
                                </svg>

                                {/* 모든 노드를 CoupleBlock으로 렌더링 (부부 + 솔로) */}
                                {couples.map((couple) => {
                                    const { husband, wife } = couple;
                                    const isCouple = !!(husband && wife);
                                    const soloNode = husband || wife;
                                    if (!soloNode) return null;

                                    if (isCouple) {
                                        const leftNode = husband.x < wife.x ? husband : wife;
                                        const coupleChildIds = [
                                            ...(childrenMap[husband.id] || []),
                                            ...(childrenMap[wife.id] || []),
                                        ];
                                        const isMain = husband.id === mainId || wife.id === mainId;

                                        return (
                                            <div
                                                key={`couple-${husband.id}-${wife.id}`}
                                                style={{
                                                    position: 'absolute',
                                                    left: toScreenX(leftNode.x) - CARD_HALF - BOX_PAD,
                                                    top: toScreenY(leftNode.y) - CARD_HALF - TAB_H - BOX_PAD,
                                                    zIndex: 1,
                                                }}
                                            >
                                                <CoupleBlock
                                                    husbandNode={husband}
                                                    wifeNode={wife}
                                                    isMainCouple={isMain}
                                                    selectedId={selectedId}
                                                    childrenIds={[...new Set(coupleChildIds)]}
                                                    onCardClick={handleCardClick}
                                                    onContextMenu={onContextMenu}
                                                    onAction={onAction}
                                                />
                                            </div>
                                        );
                                    }

                                    // 솔로 → CoupleBlock (홀부모도 박스 표시)
                                    const soloChildIds = [...(childrenMap[soloNode.id] || [])];
                                    return (
                                        <div
                                            key={soloNode.id}
                                            style={{
                                                position: 'absolute',
                                                left: toScreenX(soloNode.x) - CARD_HALF - BOX_PAD,
                                                top: toScreenY(soloNode.y) - CARD_HALF - TAB_H - BOX_PAD,
                                                zIndex: 1,
                                            }}
                                        >
                                            <CoupleBlock
                                                husbandNode={husband}
                                                wifeNode={wife}
                                                isMainCouple={soloNode.id === mainId}
                                                selectedId={selectedId}
                                                childrenIds={soloChildIds}
                                                onCardClick={handleCardClick}
                                                onContextMenu={onContextMenu}
                                                onAction={onAction}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
            </WormholeWrapper>
        </div>
    );
}
