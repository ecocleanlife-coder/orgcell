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
import { CARD_W, CARD_GAP } from '../../utils/buildTree';

const springTransition = { type: 'spring', stiffness: 200, damping: 25 };

// buildTree.js에서 import한 상수만 사용 — 여기서 직접 정의 금지
const CARD_HALF = CARD_W / 2;  // 110
const TAB_H = 10;
const BOX_PAD = 10;  // CoupleBlock 내부 패딩

// CoupleBlock 전체 높이: CARD_W + padding*2 + TAB_H
const BOX_H = CARD_W + BOX_PAD * 2 + TAB_H; // 250

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
function ZoomControls({ zoomIn, zoomOut, resetTransform, onCenterMain }) {
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
            <button style={{ ...btnStyle, fontSize: '12px' }} onClick={() => onCenterMain ? onCenterMain() : resetTransform()} title="관장 중앙 배치">🏠</button>
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
    onCardDoubleClick: externalOnDoubleClick,
    onWormhole,
    onHome,
    onContextMenu,
    style,
}) {
    const [internalSelectedId, setInternalSelectedId] = useState(null);
    const selectedId = externalSelectedId ?? internalSelectedId;
    const transformRef = useRef(null);

    // ── 박물관 이동 확인 모달 ──
    const [navConfirm, setNavConfirm] = useState(null);    // { nodeId, name } | null
    const [transitioning, setTransitioning] = useState(null); // { name } | null

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
        // 1단계: viewport 캐시 강제 제거
        sessionStorage.removeItem('familyTree_state');
        useTreeViewStore.getState().clearViewport();
        // 2단계: mainPersonId 변경 → useMemo에서 buildTree 자동 재호출
        if (onWormhole) {
            onWormhole(newMainId);
            console.log('=== 가문전환 onWormhole 호출 완료 ===');
        } else {
            console.error('=== 가문전환 실패: onWormhole prop이 없음 ===');
        }
    }, [onWormhole, mainId]);

    const handleCardClick = useCallback((nodeId) => {
        // 관장 본인 클릭: 기존 동작 (선택/자료실 진입)
        if (nodeId === mainId) {
            if (externalOnClick) externalOnClick(nodeId);
            else setInternalSelectedId(nodeId);
            return;
        }
        // 타인 카드 클릭: 이동 확인 모달 표시 (§6조)
        const node = nodesMap[nodeId];
        const name = node?.data?.displayName || node?.data?.name || '?';
        setNavConfirm({ nodeId, name });
    }, [externalOnClick, mainId, nodesMap]);

    // 확인 → 전환 효과 후 이동
    const handleNavConfirm = useCallback(() => {
        if (!navConfirm) return;
        const { nodeId, name } = navConfirm;
        setNavConfirm(null);
        setTransitioning({ name });
        setTimeout(() => {
            if (externalOnClick) externalOnClick(nodeId);
            else handleWormhole(nodeId);
            setTransitioning(null);
        }, 900);
    }, [navConfirm, externalOnClick, handleWormhole]);

    // onCardDoubleClick 래핑
    const handleCardDoubleClick = useCallback((nodeId) => {
        if (externalOnDoubleClick) {
            externalOnDoubleClick(nodeId);
        }
    }, [externalOnDoubleClick]);

    // z=0만 표시 (타가문 숨김)
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

    // ── 뷰포트 상태 유지 ──
    const { viewport: savedViewport, setViewport, clearViewport, hasValidViewport } = useTreeViewStore();

    // ── 관장 부부 중심 뷰: 초기 로드 시 main couple을 화면 중앙에 배치 ──
    // buildTree에서 mainId 부부는 x=0 중앙에 배치 (husband=-COUPLE_HALF, wife=+COUPLE_HALF, 커플 중심=0)
    const mainScreenX = useMemo(() => toScreenX(0), [bounds]);
    const mainScreenY = useMemo(() => toScreenY(0), [screenBounds]);

    // 관장 중앙 배치 함수 (🏠 버튼 + wormhole 복귀 시 사용)
    const centerOnMain = useCallback(() => {
        if (!transformRef.current) return;
        const scale = 0.55;
        const vw = window.innerWidth;
        const vh = window.innerHeight - 130;
        const tx = vw / 2 - mainScreenX * scale;
        const ty = vh / 2 - mainScreenY * scale;
        transformRef.current.setTransform(tx, ty, scale);
    }, [mainScreenX, mainScreenY]);

    // 이전 mainId 추적 (가문전환 감지)
    const prevMainIdRef = useRef(mainId);

    useEffect(() => {
        if (!transformRef.current || visibleNodes.length === 0) return;

        const isWormholeSwitch = prevMainIdRef.current !== mainId;
        prevMainIdRef.current = mainId;

        if (isWormholeSwitch) {
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

        // 기본/가문전환: 관장 부부 정중앙 배치
        setTimeout(() => { centerOnMain(); }, 50);
    }, [visibleNodes.length, mainScreenX, mainScreenY, mainId]);

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
                const boxW = CARD_W * 2 + CARD_GAP + BOX_PAD * 2;
                const boxCenterX = boxLeft + boxW / 2;
                const boxBottom = boxTop + BOX_H;

                // 두 사람 모두 이 박스에 매핑
                const key = `${husband.id}-${wife.id}`;
                positions[husband.id] = { key, centerX: boxCenterX, top: boxTop, bottom: boxBottom };
                positions[wife.id] = { key, centerX: boxCenterX, top: boxTop, bottom: boxBottom };
            } else {
                const boxLeft = toScreenX(soloNode.x) - CARD_HALF - BOX_PAD;
                const boxTop = toScreenY(soloNode.y) - CARD_HALF - TAB_H - BOX_PAD;
                const boxW = CARD_W + BOX_PAD * 2;
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
                    // 자녀 끝점: 본인 카드 상단 중앙 (VISION.md §23 — 개인 카드 중앙에서 올라감)
                    const personalX = toScreenX(node.x);
                    return { x: personalX, y: cp.top + TAB_H + BOX_PAD };
                })
                .filter(Boolean);

            if (childEntries.length === 0) {
                const pNode = nodesMap[pid];
                for (const cid of allChildren) {
                    const cNode = nodesMap[cid];
                    if (cNode) console.log('선 누락:', pNode?.data?.name || pid, '→', cNode?.data?.name || cid);
                }
                continue;
            }

            result.push({
                key: coupleKey,
                parentX: parentPos.centerX,  // 부부 박스 하단 중앙에서 내려옴
                parentY: parentPos.bottom,
                children: childEntries.map(cp => ({
                    x: cp.x,
                    y: cp.y,
                })),
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
            {/* ── 박물관 이동 확인 모달 (§6조) ── */}
            {navConfirm && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: '#FDF8F0', borderRadius: '12px',
                        padding: '28px 32px', maxWidth: '340px', width: '90%',
                        border: '1px solid #C4A882', boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                        fontFamily: 'Georgia, "Noto Serif KR", serif', textAlign: 'center',
                    }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#3a3020', marginBottom: '8px' }}>
                            박물관 이동
                        </p>
                        <p style={{ fontSize: '14px', color: '#7a6a50', marginBottom: '24px', lineHeight: '1.7' }}>
                            <strong style={{ color: '#8B7355' }}>{navConfirm.name}</strong> 님의<br />
                            박물관으로 이동하시겠습니까?
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setNavConfirm(null)}
                                style={{ padding: '8px 22px', background: 'rgba(196,168,130,0.15)', border: '1px solid #C4A882', borderRadius: '6px', color: '#8B7355', cursor: 'pointer', fontSize: '13px' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleNavConfirm}
                                style={{ padding: '8px 22px', background: '#8B7355', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                            >
                                이동
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 전환 오버레이 ── */}
            {transitioning && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 90,
                    background: '#1E1A14',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '16px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #C4A84F', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: '#C4A84F', fontSize: '15px', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                        <strong>{transitioning.name}</strong> 님의 박물관으로 이동합니다...
                    </p>
                </div>
            )}

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
                        <ZoomControls zoomIn={zoomIn} zoomOut={zoomOut} resetTransform={resetTransform} onCenterMain={centerOnMain} />
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
                                                    onCardDoubleClick={handleCardDoubleClick}
                                                    onContextMenu={onContextMenu}
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
                                                onCardDoubleClick={handleCardDoubleClick}
                                                onContextMenu={onContextMenu}
                                            />
                                        </motion.div>
                                    );
                                })}

                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

        </div>
    );
}
