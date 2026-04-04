/**
 * FamilyTreeCanvas.jsx — 전체 가계도 캔버스 (듀얼 레이어 아키텍처)
 *
 * 구조:
 *   div.tree-viewport (perspective: 1200px, d3-zoom 바인딩)
 *   ├ motion.svg  (연결선, pointerEvents: none, x/y/scale = motionValue)
 *   └ motion.div  (3D 블록, preserve-3d, x/y/scale = motionValue)
 *
 * d3-zoom → useMotionValue → SVG + HTML 동시 동기화 (React state 미사용)
 * perspective는 최상위 viewport에 적용 → CSS 엔진이 위치 기반 자동 원근감 생성
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { zoom as d3Zoom } from 'd3-zoom';
import { select as d3Select } from 'd3-selection';
import CoupleBlock from './CoupleBlock';
import ConnectorLine from './ConnectorLine';
import { useWormholeTransition, WormholeWrapper } from './WormholeTransition';
import useTreeViewStore from '../../store/treeViewStore';

const CARD_SIZE = 180;  // 3D 큐브 정면 너비
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

// ── 줌 컨트롤 (d3-zoom 기반) ──
function ZoomControls({ zoomBehaviorRef, containerRef }) {
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

    const handleZoom = useCallback((factor) => {
        const sel = d3Select(containerRef.current);
        const zb = zoomBehaviorRef.current;
        if (sel && zb) sel.transition().duration(300).call(zb.scaleBy, factor);
    }, [zoomBehaviorRef, containerRef]);

    const handleReset = useCallback(() => {
        const sel = d3Select(containerRef.current);
        const zb = zoomBehaviorRef.current;
        if (sel && zb) {
            const vw = containerRef.current.clientWidth;
            const vh = containerRef.current.clientHeight;
            sel.transition().duration(500).call(
                zb.transform,
                { k: 0.55, x: vw / 2, y: vh / 3 },
            );
        }
    }, [zoomBehaviorRef, containerRef]);

    return (
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', gap: 6 }}>
            <button style={btnStyle} onClick={() => handleZoom(1.3)} title="확대">+</button>
            <button style={btnStyle} onClick={() => handleZoom(0.7)} title="축소">-</button>
            <button style={{ ...btnStyle, fontSize: '12px' }} onClick={handleReset} title="리셋">&#x2302;</button>
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

    // d3-zoom → useMotionValue (React state 미사용)
    const containerRef = useRef(null);
    const zoomBehaviorRef = useRef(null);
    const zoomX = useMotionValue(0);
    const zoomY = useMotionValue(0);
    const zoomScale = useMotionValue(0.55);
    // 동적 perspective: scale이 작을수록 perspective도 작게 → 3D 효과 유지
    // 목표: 블록 로컬 공간에서 항상 ~600px perspective 느끼도록
    const perspectiveValue = useTransform(zoomScale, (s) => Math.max(250, 600 * s));

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
    const allZ0Nodes = useMemo(() => nodes.filter(n => n.z === 0), [nodes]);
    const allZ0Ids = useMemo(() => new Set(allZ0Nodes.map(n => n.id)), [allZ0Nodes]);

    // 모든 Z=0 노드 표시 (LOD 필터 없음 — 모든 세대 렌더링)
    const visibleNodes = allZ0Nodes;
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
    const { viewport: savedViewport, setViewport, hasValidViewport } = useTreeViewStore();

    // ── 관장 부부 중심 뷰: 초기 로드 시 main couple을 화면 중앙에 배치 ──
    const mainScreenX = useMemo(() => toScreenX(0), [bounds]);
    const mainScreenY = useMemo(() => toScreenY(0), [screenBounds]);

    // ── d3-zoom 초기화 ──
    useEffect(() => {
        if (!containerRef.current || allZ0Nodes.length === 0) return;

        const zoomBehavior = d3Zoom()
            .scaleExtent([0.15, 2])
            .on('zoom', (event) => {
                const { x, y, k } = event.transform;
                zoomX.set(x);
                zoomY.set(y);
                zoomScale.set(k);
                // 뷰포트 저장 (인물 편집 복귀 시 복원)
                setViewport(k, x, y);
            });

        zoomBehaviorRef.current = zoomBehavior;
        const sel = d3Select(containerRef.current).call(zoomBehavior);

        // 초기 위치 설정
        if (hasValidViewport()) {
            // 저장된 뷰포트 복원
            const { scale, positionX, positionY } = savedViewport;
            sel.call(zoomBehavior.transform, {
                k: scale,
                x: positionX,
                y: positionY,
            });
        } else {
            // 관장 부부 중심 배치
            const scale = 0.55;
            const vw = containerRef.current.clientWidth;
            const vh = containerRef.current.clientHeight - 130;
            const tx = vw / 2 - mainScreenX * scale;
            const ty = vh / 3 - mainScreenY * scale;
            sel.call(zoomBehavior.transform, { k: scale, x: tx, y: ty });
        }

        return () => {
            sel.on('.zoom', null);
        };
    }, [allZ0Nodes.length, mainScreenX, mainScreenY]);

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
            {/* 듀얼 레이어 뷰포트: 동적 perspective (zoom scale 보정) */}
            <motion.div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    perspective: perspectiveValue,
                    cursor: 'grab',
                    touchAction: 'none',
                }}
                data-testid="tree-viewport"
            >
                <ZoomControls zoomBehaviorRef={zoomBehaviorRef} containerRef={containerRef} />

                {/* 레이어 1: SVG 연결선 (pointerEvents: none) */}
                <motion.svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: canvasW,
                        height: realCanvasH,
                        pointerEvents: 'none',
                        x: zoomX,
                        y: zoomY,
                        scale: zoomScale,
                        transformOrigin: '0 0',
                        zIndex: 1,
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
                </motion.svg>

                {/* 레이어 2: HTML 3D 블록 (preserve-3d) */}
                <motion.div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: canvasW,
                        height: realCanvasH,
                        pointerEvents: 'none',
                        transformStyle: 'preserve-3d',
                        x: zoomX,
                        y: zoomY,
                        scale: zoomScale,
                        transformOrigin: '0 0',
                        zIndex: 2,
                    }}
                    data-testid="blocks-layer"
                >
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
                                        transformStyle: 'preserve-3d',
                                        pointerEvents: 'auto',
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
                                    transformStyle: 'preserve-3d',
                                    pointerEvents: 'auto',
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
                </motion.div>
            </motion.div>
            </WormholeWrapper>
        </div>
    );
}
