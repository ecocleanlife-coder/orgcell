/**
 * CoupleBlock.jsx — §24-1 부부 노드 규격
 *
 * §24-1 규칙:
 *   - CoupleBlock 너비: 440px 강제 (2인) / 단독: 220px
 *   - 카드 간격: 0px 밀착
 *   - 사진 시각적 간격: 40px (내부 패딩)
 *   - 부부 박스 배경: #F9F7F2
 *   - 카드 개별 테두리 금지 → 블록 단위로 테두리
 *
 * §24-4 규칙:
 *   - 순차 등장: animOrder × 0.3s delay
 *
 * §5 입체감:
 *   - 관장 블록: 2단 그림자
 *   - 일반 블록: 1단 그림자
 *
 * §6 클릭 동작:
 *   - 싱글클릭: 웜홀 모달 (본인 카드 무반응)
 *   - 더블클릭: 인물 정보 수정 모달
 *
 * §4 카드 표시:
 *   - 카드 전체를 사진으로 채움 (object-fit: cover)
 *   - 이름만 하단 오버레이로 표시
 *   - 고인: 이름 옆에 † 표시
 *   - 호버: "OOO 박물관" 툴팁만 (matchStatus='linked')
 */

import { useState, useRef } from 'react';
import { COUPLE_WIDTH, CARD_WIDTH, CARD_HEIGHT, ANIM_DELAY_BASE, COLOR } from '../../constants/tree';
import GhostCard from './GhostCard';

// ── 싱글/더블클릭 구분 딜레이 ────────────────────────────────────────────────
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

  const blockW  = single ? CARD_WIDTH : COUPLE_WIDTH;
  const pxLeft  = offsetX + blockX - blockW / 2;
  const pxTop   = offsetY + y - CARD_HEIGHT / 2;

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
        position:  'absolute',
        left:       pxLeft,
        top:        pxTop,
        width:      blockW,
        height:     CARD_HEIGHT,
        display:    'flex',
        background: COLOR.coupleBg,
        borderRadius: 4,
        opacity,
        userSelect: 'none',
        animation: `cardAppear 0.4s ease both`,
        animationDelay: `${animOrder * ANIM_DELAY_BASE}s`,
        ...blockBorder,
      }}>
        {single ? (
          <FolderCard
            node={single}
            width={CARD_WIDTH}
            isCuratorCard={single.personId === curatorPersonId}
            onDoubleClick={onDoubleClick}
            onWormhole={onWormhole}
          />
        ) : (
          <>
            {left  && (
              <FolderCard
                node={left}
                width={CARD_WIDTH}
                isCuratorCard={left.personId === curatorPersonId}
                isLeft
                onDoubleClick={onDoubleClick}
                onWormhole={onWormhole}
              />
            )}
            {right && (
              <FolderCard
                node={right}
                width={CARD_WIDTH}
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
// FolderCard — §4 카드 (전체 사진, 이름 오버레이, † 고인)
// ══════════════════════════════════════════════════════════════════════════════
function FolderCard({ node, width, isCuratorCard, isLeft, isRight, onDoubleClick, onWormhole }) {
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  // Ghost 인물: GhostCard 표시
  if (!node.name || node.matchStatus === 'ghost') {
    return (
      <GhostCard
        width={width}
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
  // §4: 고인은 이름 옆에 †
  const displayName = node.isDeceased ? `${node.name} †` : node.name;

  return (
    <div
      style={{ ...s.card, ...innerBorder, width, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* §4 전체 사진 (object-fit: cover) */}
      {node.photoUrl
        ? <img src={node.photoUrl} alt={node.name} style={s.photoImg} />
        : <div style={{ ...s.photoPlaceholder, background: isCuratorCard ? COLOR.curatorBg : '#E8DFD0' }}>
            <span style={s.placeholderIcon}>{node.gender === 'female' ? '♀' : '♂'}</span>
          </div>
      }

      {/* §4 이름 하단 오버레이 */}
      <div style={s.nameOverlay}>{displayName}</div>

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
    height:   CARD_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    position:       'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
    color:    '#C4A882',
  },
  nameOverlay: {
    position:     'absolute',
    bottom: 0, left: 0, right: 0,
    background:   'linear-gradient(transparent, rgba(0,0,0,0.65))',
    color:        '#fff',
    fontSize:     12,
    fontWeight:   700,
    padding:      '18px 8px 6px',
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
