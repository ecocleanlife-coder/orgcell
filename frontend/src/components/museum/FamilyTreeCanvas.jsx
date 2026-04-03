/**
 * FamilyTreeCanvas.jsx — 전체 가계도 캔버스
 *
 * buildTree() 출력 → CoupleBlocks + ConnectorLines 렌더링
 * - 절대 위치 기반 레이아웃 (220px 그리드)
 * - SVG 커넥터: 부부 박스 하단 중심 → 수평 버스 → 자녀 박스 상단
 * - Pan/Zoom (react-zoom-pan-pinch)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import CoupleBlock from './CoupleBlock';
import ConnectorLine from './ConnectorLine';
import { useWormholeTransition, WormholeWrapper } from './WormholeTransition';

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
// ── LOD 확장 버튼 ──
function LodExpandButton({ count, label, onClick, screenX, screenY }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="lod-expand-btn"
            style={{
                position: 'absolute',
                left: screenX - 70,
                top: screenY - 18,
                zIndex: 15,
                width: 140,
                height: 36,
                border: '1.5px dashed #C4A84F',
                borderRadius: '18px',
                background: 'rgba(30,26,20,0.75)',
                backdropFilter: 'blur(4px)',
                color: '#C4A84F',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'all 0.2s',
            }}
        >
            <span style={{ fontSize: '16px' }}>+</span>
            {count}명의 {label}
        </button>
    );
}

export default function FamilyTreeCanvas({
    nodes = [],
    links = [],
    mainId = null,
    centerId = null,
    selectedId: externalSelectedId = null,
    onCardClick: externalOnClick,
    onCenterChange,
    onWormhole,
    onContextMenu,
    onAction,
    style,
}) {
    const [internalSelectedId, setInternalSelectedId] = useState(null);
    const selectedId = externalSelectedId ?? internalSelectedId;
    const [expandedDepths, setExpandedDepths] = useState(new Set());

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
        } else {
            // centerId 전환: 클릭한 인물을 포커스 중심으로
            if (onCenterChange) onCenterChange(nodeId);
            if (externalOnClick) {
                externalOnClick(nodeId);
            } else {
                setInternalSelectedId(nodeId);
            }
        }
    }, [nodesMap, onWormhole, onCenterChange, externalOnClick, triggerWormhole]);

    // Z=0만 표시 (타가문은 웜홀 전환 전까지 숨김)
    const allZ0Nodes = useMemo(() => nodes.filter(n => n.z === 0), [nodes]);
    const allZ0Ids = useMemo(() => new Set(allZ0Nodes.map(n => n.id)), [allZ0Nodes]);

    // LOD 필터: 위 1대(+1) 아래 2대(-2)까지 기본 표시, 나머지는 확장 버튼
    const visibleNodes = useMemo(() => {
        return allZ0Nodes.filter(n => {
            // depth: 0=본인, +1=부모, -1=자녀, -2=손자
            return (n.depth >= -2 && n.depth <= 1) || expandedDepths.has(n.depth);
        });
    }, [allZ0Nodes, expandedDepths]);
    const visibleIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
    const visibleLinks = useMemo(() => links.filter(l => visibleIds.has(l.source) && visibleIds.has(l.target)), [links, visibleIds]);

    // 접힌 세대 요약 (확장 버튼용) — 위 1대/아래 2대 밖
    const collapsedSummaries = useMemo(() => {
        const hidden = allZ0Nodes.filter(n => {
            return (n.depth > 1 || n.depth < -2) && !expandedDepths.has(n.depth);
        });
        const byDepth = {};
        for (const n of hidden) {
            if (!byDepth[n.depth]) byDepth[n.depth] = [];
            byDepth[n.depth].push(n);
        }
        return Object.entries(byDepth).map(([depth, dnodes]) => ({
            depth: Number(depth),
            count: dnodes.length,
            centerX: dnodes.reduce((s, n) => s + n.x, 0) / dnodes.length,
            y: dnodes[0].y,
        }));
    }, [allZ0Nodes, expandedDepths]);

    const toggleDepth = useCallback((depth) => {
        setExpandedDepths(prev => {
            const next = new Set(prev);
            if (next.has(depth)) next.delete(depth);
            else next.add(depth);
            return next;
        });
    }, []);

    // 바운드는 전체 Z=0 노드 기준 (확장/축소 시 캔버스 크기 안정)
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

                                    // LOD 애니메이션: ±2 밖 세대는 슬라이드다운
                                    const nodeDepth = Math.abs(soloNode.depth);
                                    const isExpanded = nodeDepth > 2 && expandedDepths.has(soloNode.depth);
                                    const animStyle = isExpanded
                                        ? { animation: 'lodSlideDown 0.4s ease-out' }
                                        : {};

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
                                                    ...animStyle,
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
                                                ...animStyle,
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
                                        </motion.div>
                                    );
                                })}

                                {/* LOD 확장 버튼 (접힌 세대) */}
                                {collapsedSummaries.map(summary => (
                                    <LodExpandButton
                                        key={`lod-${summary.depth}`}
                                        count={summary.count}
                                        label={summary.depth < 0 ? '후손' : '조상'}
                                        onClick={() => toggleDepth(summary.depth)}
                                        screenX={toScreenX(summary.centerX)}
                                        screenY={toScreenY(summary.y)}
                                    />
                                ))}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
            </WormholeWrapper>

            {/* LOD 슬라이드다운 애니메이션 CSS */}
            <style>{`
                @keyframes lodSlideDown {
                    from { opacity: 0; transform: translateY(-30px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .lod-expand-btn:hover {
                    background: rgba(196,168,79,0.25) !important;
                    border-color: #C4A84F !important;
                }
            `}</style>
        </div>
    );
}
