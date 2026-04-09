/**
 * constants/tree.js — §24 트리 레이아웃 수치 상수
 *
 * 백엔드 treeLayoutEngine.js의 C 객체와 동일한 값을 유지해야 한다.
 * 수치 변경 시 두 파일을 함께 수정할 것.
 */

// ─── §24-1 부부 노드 규격 ─────────────────────────────────────────────────────
export const COUPLE_WIDTH   = 440;  // CoupleBlock 너비 강제
export const CARD_WIDTH     = 220;  // COUPLE_WIDTH / 2 (카드 간격 0px 밀착)
export const HALF_CARD      = 110;  // CARD_WIDTH / 2
export const CARD_HEIGHT    = 140;  // 규칙서 미명시 → 백엔드 엔진과 동일 기본값
export const COUPLE_BG      = '#F9F7F2'; // 부부 박스 배경

// ─── §24-2 X축 좌표 기본값 ───────────────────────────────────────────────────
export const CURATOR_X          =    0;  // 관장 부부 CoupleBlock 중심
export const PARENT_DEFAULT_X   = -300;  // 관장 부모, 형제 없을 때
export const PARENT_IN_LAW_X    =  300;  // 배우자 부모, 형제 없을 때

// ─── §23 형제/자녀 간격 ──────────────────────────────────────────────────────
export const SIBLING_GAP        = 260;  // 남편 형제 왼쪽 / 아내 형제 오른쪽 260px씩
export const CHILD_BLOCK_STEP   = 500;  // 자녀 CoupleBlock 간격 (COUPLE_WIDTH 440 + GAP 60)

// ─── Q1 확정: 세대간 Y 간격 ──────────────────────────────────────────────────
export const ROW_GAP            = 280;  // 세대간 픽셀 간격

// ─── §22 투명도 ──────────────────────────────────────────────────────────────
export const OPACITY_NORMAL     = 1.0;
export const OPACITY_DEEP       = 0.3;  // 증손주(depth=3) 이상

// ─── §24-4 애니메이션 ─────────────────────────────────────────────────────────
export const ANIM_DELAY_BASE    = 0.3;  // 노드 순차 등장 delay 간격(초)

// ─── §5 카드 색상 (CSS 변수와 동기화) ────────────────────────────────────────
export const COLOR = {
  cardBorder:      '#C4A882',
  cardBg:          '#FAFAF5',
  cardBorderR:     '#b09060',
  cardBorderB:     '#9a7a50',
  cardShadow:      '#c4a87a',
  curatorBorder:   '#8B7355',
  curatorBg:       '#FDF8F0',
  curatorBorderR:  '#9a7a50',
  curatorBorderB:  '#7a6040',
  curatorShadow1:  '#c4a87a',
  curatorShadow2:  '#b09060',
  coupleBg:        '#F9F7F2',
};

// ─── SVG 연결선 ───────────────────────────────────────────────────────────────
export const CONNECTOR_COLOR    = '#C4A882';
export const CONNECTOR_WIDTH    = 1.5;
