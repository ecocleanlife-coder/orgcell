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

  // ── §23 초기 중앙 배치: 관장 부부 블록 중심 = 화면 가로 정중앙 ──────────────
  useEffect(() => {
    if (!nodes.length || !wrapRef.current) return;
    const { width, height } = wrapRef.current.getBoundingClientRect();
    const curator = getCuratorNode();
    const blockX  = curator?.coupleBlockX ?? 0;
    const cardY   = curator?.y ?? 0;
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

  // 터치 패닝
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onTouchMove = useCallback((e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const { startX, startY, ox, oy } = dragRef.current;
    setOffset({ x: ox + (t.clientX - startX), y: oy + (t.clientY - startY) });
  }, []);

  const onTouchEnd = useCallback(() => { dragRef.current = null; }, []);

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
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── SVG 연결선 레이어 ─────────────────────────────────────────────── */}
      <svg
        style={{
          position: 'absolute',
          left: offset.x + minX,
          top:  offset.y + minY,
          width:  maxX - minX,
          height: maxY - minY,
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
          curatorPersonId={curatorId}
          onDoubleClick={selectPerson}
          onWormhole={openWormhole}
        />
      ))}
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
};
