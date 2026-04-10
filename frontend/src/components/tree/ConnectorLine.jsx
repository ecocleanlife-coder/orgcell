/**
 * ConnectorLine.jsx — §23 연결선 렌더러
 *
 * SVG 컨텍스트 내부에서 렌더링. div 래퍼 없음.
 *
 * ── 타입 1: parent-to-children ──────────────────────────────────────────────
 *   부부 박스 아래 중간(fromX, fromY)
 *     → 수직선 내려와 midY 도달
 *     → 자녀들 수평 연결선 (childAnchors 범위)
 *     → 각 자녀 중심으로 수직선 내려감 (toY)
 *
 * ── 타입 2: parent-to-child-individual (§23 CRITICAL) ────────────────────────
 *   "부부 박스 중앙이 아닌 해당 배우자 카드 개인 중앙에서 선 올라감"
 *   부모 블록 중심(fromX, fromY)
 *     → 수직선 midY
 *     → 수평선 toX (개인 카드 X)
 *     → 수직선 toY (카드 상단)
 *
 * 렌더링 위치: FamilyTreeCanvas 의 <svg> 내부
 */

import { CONNECTOR_COLOR, CONNECTOR_WIDTH } from '../../constants/tree';

// ── 연결선 끝점 원형 마커 (부모 블록 아래) ────────────────────────────────────
const DOT_R = 2.5;

export default function ConnectorLine({ conn }) {
  if (!conn) return null;
  return conn.type === 'parent-to-child-individual'
    ? <IndividualLine conn={conn} />
    : <ChildrenLine  conn={conn} />;
}

// ─── parent-to-children ───────────────────────────────────────────────────────
function ChildrenLine({ conn }) {
  const { fromX, fromY, midY, toY, childAnchors = [] } = conn;
  if (!childAnchors.length) return null;

  const sw     = CONNECTOR_WIDTH;
  const stroke = CONNECTOR_COLOR;

  const anchorXs = childAnchors.map(a => a.anchorX);
  const spanMinX = Math.min(...anchorXs);
  const spanMaxX = Math.max(...anchorXs);

  return (
    <g>
      {/* 부모 블록 → midY 수직선 */}
      <line x1={fromX} y1={fromY} x2={fromX} y2={midY}
        stroke={stroke} strokeWidth={sw} strokeLinecap="round" />

      {/* 부모 아래 원형 마커 */}
      <circle cx={fromX} cy={fromY} r={DOT_R} fill={stroke} />

      {/* 자녀 수평 연결선 (자녀 2인 이상) */}
      {anchorXs.length > 1 && (
        <line x1={spanMinX} y1={midY} x2={spanMaxX} y2={midY}
          stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      )}

      {/* midY → 각 자녀 수직선 */}
      {childAnchors.map((a, i) => (
        <g key={i}>
          <line x1={a.anchorX} y1={midY} x2={a.anchorX} y2={toY}
            stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {/* 자녀 카드 위 원형 마커 */}
          <circle cx={a.anchorX} cy={toY} r={DOT_R} fill={stroke} />
        </g>
      ))}
    </g>
  );
}

// ─── parent-to-child-individual (§23 CRITICAL) ───────────────────────────────
//
// 부모 블록 중심 → midY → 개인 카드 X → 카드 상단
// "부부 박스 중앙이 아닌 해당 배우자 카드 개인 중앙에서 선 올라감"
//
// 경로: M fromX,fromY  L fromX,midY  L toX,midY  L toX,toY
function IndividualLine({ conn }) {
  const { fromX, fromY, midY, toX, toY } = conn;

  const sw     = CONNECTOR_WIDTH;
  const stroke = CONNECTOR_COLOR;

  // §23 CRITICAL: elbowed (꺾인) 경로
  const d = [
    `M ${fromX},${fromY}`,
    `L ${fromX},${midY}`,
    `L ${toX},${midY}`,
    `L ${toX},${toY}`,
  ].join(' ');

  return (
    <g>
      <path
        d={d}
        stroke={stroke}
        strokeWidth={sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 부모 아래 마커 */}
      <circle cx={fromX} cy={fromY} r={DOT_R} fill={stroke} />
      {/* 개인 카드 위 마커 */}
      <circle cx={toX} cy={toY} r={DOT_R} fill={stroke} />
    </g>
  );
}
