/**
 * FamilyTreeCanvas.jsx — 전체 가계도 캔버스
 *
 * buildTree() 출력 → CoupleBlocks + ConnectorLines 렌더링
 * - 절대 위치 기반 레이아웃 (220px 그리드)
 * - SVG 커넥터: 부부 박스 하단 중심 → 수평 버스 → 자녀 박스 상단
 * - Pan/Zoom (react-zoom-pan-pinch)
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import CoupleBlock from './CoupleBlock';
import ConnectorLine from './ConnectorLine';
import useTreeViewStore from '../../store/treeViewStore';

const springTransition = { type: 'spring', stiffness: 200, damping: 25 };

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
function ZoomControls({ zoomIn, zoomOut, resetTransform, onHome }) {
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
            <button style={{ ...btnStyle, fontSize: '12px' }} onClick={() => onHome ? onHome() : resetTransform()} title="관장 복귀">🏠</button>
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
    onHome,
    onContextMenu,
    onAction,
    style,
}) {
    const [internalSelectedId, setInternalSelectedId] = useState(null);
    const selectedId = externalSelectedId ?? internalSelectedId;
    const transformRef = useRef(null);

    const nodesMap = useMemo(() => {
        const m = {};
        for (const n of nodes) m[n.id] = n;
        return m;
    }, [nodes]);

    // Wormhole: 오직 setMainPersonId만 호출. 애니메이션/transition/setTimeout 없음.
    const handleWormhole = useCallback((newMainId) => {
        console.log('=== 가문전환 START ===');
        console.log('이전 centerId:', mainId);
        console.log('새 centerId:', newMainId);
        // 1단계: viewport 초기화 (sessionStorage 강제 제거)
        sessionStorage.removeItem('familyTree_state');
        clearViewport();
        // 2단계: mainPersonId 변경 → useMemo에서 buildTree 자동 재호출
        if (onWormhole) {
            onWormhole(newMainId);
            console.log('=== 가문전환 onWormhole 호출 완료 ===');
        } else {
            console.error('=== 가문전환 실패: onWormhole prop이 없음 ===');
        }
    }, [onWormhole, mainId, clearViewport]);

    const handleCardClick = useCallback((nodeId) => {
        const node = nodesMap[nodeId];
        if (node && node.z >= 1 && onWormhole) {
            handleWormhole(nodeId);
        } else if (externalOnClick) {
            externalOnClick(nodeId);
        } else {
            setInternalSelectedId(nodeId);
        }
    }, [nodesMap, onWormhole, externalOnClick, handleWormhole]);

    // onAction 래핑: wormhole 액션은 직접 centerId 변경 (애니메이션 없이)
    const handleAction = useCallback((nodeId, actionKey) => {
        if (actionKey === 'wormhole') {
            handleWormhole(nodeId);
        } else if (onAction) {
            onAction(nodeId, actionKey);
        }
    }, [handleWormhole, onAction]);

    // Z=0만 표시 (타가문은 웜홀 전환 전까지 숨김)
    const allZ0Nodes = useMemo(() => nodes.filter(n => n.z === 0), [nodes]);
    const allZ0Ids = useMemo(() => new Set(allZ0Nodes.map(n => n.id)), [allZ0Nodes]);

    // 모든 Z=0 노드 표시 (LOD 필터 없음 — 모든 세대 렌더링)
    const visibleNodes = allZ0Nodes;
    const visibleIds = allZ0Ids;
    const visibleLinks = useMemo(() => links.filter(l => allZ0Ids.has(l.source) && allZ0Ids.has(l.target)), [links, allZ0Ids]);

    const bounds = useMemo(() => calcBounds(allZ0Nodes), [allZ0Nodes]);
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

    // ── 스크린 좌표 변환 (전체 Z=0 기준 — 캔버스 크기 안정) ──
    const screenYs = allZ0Nodes.map(n => -n.y);
    const screenBounds = useMemo(() => ({
        minY: allZ0Nodes.length > 0 ? Math.min(...screenYs) - CARD_HALF - 140 - TAB_H : 0,
        maxY: allZ0Nodes.length > 0 ? Math.max(...screenYs) + CARD_HALF + 140 + 30 : 400,
    }), [allZ0Nodes, screenYs]);

    const canvasW = bounds.maxX - bounds.minX;
    const realCanvasH = screenBounds.maxY - screenBounds.minY;

    const toScreenX = (x) => x - bounds.minX;
    const toScreenY = (treeY) => -treeY - screenBounds.minY;

    // ── 뷰포트 상태 유지 ──
    const { viewport: savedViewport, setViewport, clearViewport, hasValidViewport } = useTreeViewStore();

    // ── 관장 부부 중심 뷰: 초기 로드 시 main couple을 화면 중앙에 배치 ──
    const mainScreenX = useMemo(() => toScreenX(0), [bounds]);
    const mainScreenY = useMemo(() => toScreenY(0), [screenBounds]);

    // 이전 mainId 추적 (가문전환 감지)
    const prevMainIdRef = useRef(mainId);

    useEffect(() => {
        if (!transformRef.current || allZ0Nodes.length === 0) return;

        const isWormholeSwitch = prevMainIdRef.current !== mainId;
        prevMainIdRef.current = mainId;

        if (isWormholeSwitch) {
            console.log('[가문전환] viewport 초기화, mainId:', mainId, 'Z0노드:', allZ0Nodes.length);
            clearViewport();
        }

        // 일반 복원: 가문전환 아닌 경우만 저장된 뷰포트 사용
        if (!isWormholeSwitch && hasValidViewport()) {
            setTimeout(() => {
                transformRef.current?.setTransform(
                    savedViewport.positionX,
                    savedViewport.positionY,
                    savedViewport.scale,
                );
            }, 50);
            return;
        }

        // 기본/가문전환: 관장 부부 중심 배치
        const scale = 0.55;
        const vw = window.innerWidth;
        const vh = window.innerHeight - 130;
        const tx = vw / 2 - mainScreenX * scale;
        const ty = vh / 3 - mainScreenY * scale;
        console.log('[가문전환] 중심 배치 mainId:', mainId, 'screenX:', mainScreenX, 'screenY:', mainScreenY, 'tx:', tx, 'ty:', ty);
        setTimeout(() => {
            transformRef.current?.setTransform(tx, ty, scale);
        }, 50);
    }, [allZ0Nodes.length, mainScreenX, mainScreenY, mainId]);

    // ── pan/zoom 변경 시 뷰포트 저장 ──
    const handleTransformChange = useCallback((ref) => {
        const { scale, positionX, positionY } = ref.state;
        setViewport(scale, positionX, positionY);
    }, [setViewport]);

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
            <TransformWrapper
                ref={transformRef}
                initialScale={0.55}
                minScale={0.15}
                maxScale={2}
                limitToBounds={false}
                onTransformed={handleTransformChange}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} resetTransform={resetTransform} onHome={onHome} />
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
                                            <motion.div
                                                key={`couple-${husband.id}-${wife.id}`}
                                                animate={{
                                                    left: toScreenX(leftNode.x) - CARD_HALF - BOX_PAD,
                                                    top: toScreenY(leftNode.y) - CARD_HALF - TAB_H - BOX_PAD,
                                                }}
                                                transition={springTransition}
                                                style={{
                                                    position: 'absolute',
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
                                                    onAction={handleAction}
                                                />
                                            </motion.div>
                                        );
                                    }

                                    // 솔로 → CoupleBlock (홀부모도 박스 표시)
                                    const soloChildIds = [...(childrenMap[soloNode.id] || [])];
                                    return (
                                        <motion.div
                                            key={soloNode.id}
                                            animate={{
                                                left: toScreenX(soloNode.x) - CARD_HALF - BOX_PAD,
                                                top: toScreenY(soloNode.y) - CARD_HALF - TAB_H - BOX_PAD,
                                            }}
                                            transition={springTransition}
                                            style={{
                                                position: 'absolute',
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
                                                onAction={handleAction}
                                            />
                                        </motion.div>
                                    );
                                })}

                                {/* 모든 세대 표시 — LOD 필터 없음 */}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

        </div>
    );
}
