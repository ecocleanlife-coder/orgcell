/**
 * FamilyTreeCanvas.jsx — §22/§23/§24 트리 캔버스
 *
 * 역할: 패닝 컨테이너 + SVG 연결선 레이어 + CoupleBlock 배치
 * 세부 렌더링은 CoupleBlock / ConnectorLine / GhostCard 에 위임.
 *
 * §23 화면 중앙 배치:
 *   초기 마운트 시 관장 부부 블록 중심 = 화면 가로 정중앙
 *
 * §24-4:
 *   navKey 변경 시 이 컴포넌트가 리마운트되어 초기화 보장
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useTreeStore }   from '../../store/treeStore';
import { CARD_WIDTH, CARD_HEIGHT, COUPLE_WIDTH } from '../../constants/tree';
import CoupleBlock        from './CoupleBlock';
import ConnectorLine      from './ConnectorLine';

const CANVAS_PAD = 600; // 패닝 여유 공간

// ─── coupleId → { nodes[], blockX, y } 그룹 빌드 ─────────────────────────────
function buildCoupleGroups(nodes) {
  const map = new Map();
  for (const n of nodes) {
    if (!map.has(n.coupleId)) {
      map.set(n.coupleId, { coupleId: n.coupleId, nodes: [], blockX: n.coupleBlockX, y: n.y });
    }
    map.get(n.coupleId).nodes.push(n);
  }
  return [...map.values()];
}

// ══════════════════════════════════════════════════════════════════════════════
export default function FamilyTreeCanvas() {
  const {
    nodes, connectors,
    curatorId,
    getCuratorNode, selectPerson, openWormhole,
  } = useTreeStore();

  const wrapRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, ox, oy }
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale,  setScale]  = useState(1);
  const pinchRef = useRef(null); // { dist, scale }

  // ── §23 초기 중앙 배치: 관장 부부 블록 중심 = 화면 가로 정중앙 ──────────────
  useEffect(() => {
    if (!nodes.length || !wrapRef.current) return;
    const { width, height } = wrapRef.current.getBoundingClientRect();
    const curator = getCuratorNode();
    const blockX  = curator?.coupleBlockX ?? 0;
    const cardY   = curator?.y ?? 0;
    setScale(1);
    setOffset({
      x: Math.round(width  / 2 - blockX),
      y: Math.round(height / 2 - cardY - CARD_HEIGHT / 2),
    });
  }, [nodes]);

  // ── 드래그 패닝 ─────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { startX, startY, ox, oy } = dragRef.current;
    setOffset({ x: ox + (e.clientX - startX), y: oy + (e.clientY - startY) });
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [offset, onMouseMove, onMouseUp]);

  // 마우스 휠 줌
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.3, Math.min(3, s * delta)));
  }, []);

  // 터치 패닝 + 핀치줌
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), scale };
      dragRef.current = null;
    } else {
      const t = e.touches[0];
      dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
      pinchRef.current = null;
    }
  }, [offset, scale]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(0.3, Math.min(3, pinchRef.current.scale * (dist / pinchRef.current.dist)));
      setScale(newScale);
    } else if (dragRef.current) {
      const t = e.touches[0];
      const { startX, startY, ox, oy } = dragRef.current;
      setOffset({ x: ox + (t.clientX - startX), y: oy + (t.clientY - startY) });
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

  if (!nodes.length) return null;

  // ── SVG 뷰박스 계산 ──────────────────────────────────────────────────────────
  const xs   = nodes.map(n => n.x);
  const ys   = nodes.map(n => n.y);
  const minX = Math.min(...xs) - CANVAS_PAD;
  const minY = Math.min(...ys) - CANVAS_PAD;
  const maxX = Math.max(...xs) + CARD_WIDTH  + CANVAS_PAD;
  const maxY = Math.max(...ys) + CARD_HEIGHT + CANVAS_PAD;

  const coupleGroups = buildCoupleGroups(nodes);

  return (
    <div
      ref={wrapRef}
      style={s.wrap}
      onMouseDown={onMouseDown}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── SVG 연결선 레이어 ─────────────────────────────────────────────── */}
      {/* §23: left/top/width/height 에 scale 포함 → CSS transform 추가 시 이중 스케일로 카드와 어긋남 */}
      <svg
        style={{
          position: 'absolute',
          left: (offset.x + minX) * scale,
          top:  (offset.y + minY) * scale,
          width:  (maxX - minX) * scale,
          height: (maxY - minY) * scale,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      >
        {connectors.map(conn => (
          <ConnectorLine key={conn.id} conn={conn} />
        ))}
      </svg>

      {/* ── CoupleBlock 레이어 ────────────────────────────────────────────── */}
      {coupleGroups.map(group => (
        <CoupleBlock
          key={group.coupleId}
          group={group}
          offsetX={offset.x}
          offsetY={offset.y}
          scale={scale}
          curatorPersonId={curatorId}
          onDoubleClick={selectPerson}
          onWormhole={openWormhole}
        />
      ))}
      {/* 줌 버튼 */}
      <div style={s.zoomBtns}>
        <button style={s.zoomBtn} onClick={() => setScale(s => Math.min(3, s * 1.2))}>＋</button>
        <button style={s.zoomBtn} onClick={() => setScale(1)}>⟳</button>
        <button style={s.zoomBtn} onClick={() => setScale(s => Math.max(0.3, s * 0.8))}>－</button>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    position:   'absolute',
    inset:       0,
    overflow:   'hidden',
    cursor:     'grab',
    background: '#F5F0E8',
    touchAction:'none',
  },
  zoomBtns: { position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 },
  zoomBtn:  { width: 36, height: 36, background: 'rgba(253,251,247,0.9)', border: '1px solid #C4A882', borderRadius: 6, fontSize: 18, cursor: 'pointer', color: '#8B7355', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
