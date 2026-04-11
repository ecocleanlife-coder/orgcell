/**
 * CoupleBlock.jsx — §24-1 부부 노드 규격
 *
 * §24-1 규칙:
 *   - CoupleBlock 너비: 440px 강제 (2인) / 단독: CARD_WIDTH + 패딩*2
 *   - 카드 간격: 8px, 부부박스 내부 패딩: 8px
 *   - CARD_HEIGHT: 220px
 *   - 사진 패딩 없음 (전체 채움)
 *   - 부부 박스 배경: #F9F7F2, 카드 개별 테두리 금지
 *
 * §4 카드 표시:
 *   - 카드 전체를 사진으로 채움 (object-fit: cover)
 *   - 이름만 하단 그라데이션 오버레이로 표시
 *   - 고인: 이름 옆 † 표시
 *   - 호버 시 "OOO 박물관" 툴팁만
 *
 * §5 입체감:
 *   - 관장 블록: 2단 그림자
 *   - 일반 블록: 1단 그림자
 *
 * §6 클릭 동작:
 *   - 싱글클릭: 웜홀 모달 (본인 카드 무반응)
 *   - 더블클릭: 인물 정보 수정 모달
 */

import { useState, useRef } from 'react';
import { COUPLE_WIDTH, CARD_WIDTH, CARD_HEIGHT, ANIM_DELAY_BASE, COLOR } from '../../constants/tree';
import GhostCard from './GhostCard';

// ── §24-1 수치 ────────────────────────────────────────────────────────────────
const BLOCK_PADDING = 8;
const CARD_GAP      = 8;
const BLOCK_H       = CARD_HEIGHT + BLOCK_PADDING * 2;   // 220 + 16 = 236

// ── §6 싱글/더블클릭 구분 딜레이 ─────────────────────────────────────────────
const DBL_CLICK_MS = 250;

// ══════════════════════════════════════════════════════════════════════════════
export default function CoupleBlock({ group, offsetX, offsetY, curatorPersonId, onDoubleClick, onWormhole }) {
  const { nodes, blockX, y } = group;

  const left   = nodes.find(n => n.coupleRole === 'left');
  const right  = nodes.find(n => n.coupleRole === 'right');
  const single = nodes.find(n => n.coupleRole === 'single');

  const isCuratorBlock = nodes.some(n => n.personId === curatorPersonId);
  const opacity        = nodes[0]?.opacity ?? 1;
  const animOrder      = Math.min(...nodes.map(n => n.animOrder ?? 0));

  const blockW = single ? CARD_WIDTH + BLOCK_PADDING * 2 : COUPLE_WIDTH;
  const pxLeft = offsetX + blockX - blockW / 2;
  const pxTop  = offsetY + y - BLOCK_H / 2;

  // §5 블록 레벨 테두리 (카드 개별 테두리 금지, §24-1)
  const blockBorder = isCuratorBlock ? {
    border:       `1px solid ${COLOR.curatorBorder}`,
    borderRight:  `2px solid ${COLOR.curatorBorderR}`,
    borderBottom: `2px solid ${COLOR.curatorBorderB}`,
    boxShadow:    `2px 2px 0 ${COLOR.curatorShadow1}, 3px 3px 0 ${COLOR.curatorShadow2}`,
  } : {
    border:       `1px solid ${COLOR.cardBorder}`,
    borderRight:  `2px solid ${COLOR.cardBorderR}`,
    borderBottom: `2px solid ${COLOR.cardBorderB}`,
    boxShadow:    `2px 2px 0 ${COLOR.cardShadow}`,
  };

  return (
    <>
      <style>{`
        @keyframes cardAppear {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        position:      'absolute',
        left:          pxLeft,
        top:           pxTop,
        width:         blockW,
        height:        BLOCK_H,
        display:       'flex',
        gap:           CARD_GAP,
        padding:       BLOCK_PADDING,
        boxSizing:     'border-box',
        background:    COLOR.coupleBg,
        borderRadius:  4,
        opacity,
        userSelect:    'none',
        animation:     `cardAppear 0.4s ease both`,
        animationDelay:`${animOrder * ANIM_DELAY_BASE}s`,
        ...blockBorder,
      }}>
        {single ? (
          <FolderCard
            node={single}
            isCuratorCard={single.personId === curatorPersonId}
            onDoubleClick={onDoubleClick}
            onWormhole={onWormhole}
          />
        ) : (
          <>
            {left  && (
              <FolderCard
                node={left}
                isCuratorCard={left.personId === curatorPersonId}
                isLeft
                onDoubleClick={onDoubleClick}
                onWormhole={onWormhole}
              />
            )}
            {right && (
              <FolderCard
                node={right}
                isCuratorCard={right.personId === curatorPersonId}
                isRight
                onDoubleClick={onDoubleClick}
                onWormhole={onWormhole}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FolderCard — §4 카드 (전체 사진 cover, 이름 오버레이, † 고인)
// ══════════════════════════════════════════════════════════════════════════════
function FolderCard({ node, isCuratorCard, isLeft, isRight, onDoubleClick, onWormhole }) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  // Ghost 인물: GhostCard 표시
  if (!node.name || node.matchStatus === 'ghost') {
    return (
      <GhostCard
        width={CARD_WIDTH}
        gender={node.gender}
        onDoubleClick={() => onDoubleClick(node.personId)}
      />
    );
  }

  // §6 싱글/더블 클릭 구분
  function handleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!isCuratorCard && node.matchStatus === 'linked') {
        onWormhole({ subdomain: node.personId, name: node.name });
      }
    }, DBL_CLICK_MS);
  }

  function handleDoubleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDoubleClick(node.personId);
  }

  // §24-1: 우측 카드 왼쪽에만 구분선
  const innerBorder = isRight ? { borderLeft: `1px solid ${COLOR.cardBorder}` } : {};

  return (
    <div
      style={{ ...s.card, ...innerBorder, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* §4 전체 사진 (object-fit: cover, 패딩 없음) */}
      {node.photoUrl
        ? <img src={node.photoUrl} alt={node.name} style={s.photoImg} />
        : <div style={{ ...s.photoPlaceholder, background: isCuratorCard ? COLOR.curatorBg : '#E8DFD0' }}>
            <span style={s.placeholderIcon}>{node.gender === 'female' ? '♀' : '♂'}</span>
          </div>
      }

      {/* §4 이름 하단 그라데이션 오버레이 */}
      <div style={s.nameOverlay}>{node.name}</div>

      {/* §4 호버 툴팁 "OOO 박물관" (linked 인물만) */}
      {hovered && node.matchStatus === 'linked' && (
        <div style={s.tooltip}>{node.name} 박물관</div>
      )}
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    flex:         1,
    height:       '100%',
    overflow:     'hidden',
    position:     'relative',
    borderRadius: 2,
  },
  photoImg: {
    position:  'absolute',
    top: 0, left: 0,
    width:     '100%',
    height:    '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    position:       'absolute',
    top: 0, left: 0,
    width:          '100%',
    height:         '100%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 44,
    color:    '#C4A882',
  },
  nameOverlay: {
    position:     'absolute',
    bottom: 0, left: 0, right: 0,
    background:   'linear-gradient(transparent, rgba(0,0,0,0.65))',
    color:        '#fff',
    fontSize:     13,
    fontWeight:   700,
    padding:      '22px 8px 8px',
    textAlign:    'center',
    whiteSpace:   'nowrap',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
  },
  tooltip: {
    position:      'absolute',
    top:           -28,
    left:          '50%',
    transform:     'translateX(-50%)',
    background:    'rgba(0,0,0,0.75)',
    color:         '#fff',
    fontSize:      11,
    padding:       '3px 8px',
    borderRadius:  3,
    whiteSpace:    'nowrap',
    pointerEvents: 'none',
    zIndex:        10,
  },
};
