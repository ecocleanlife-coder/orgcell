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
 *   - 사진 + 이름 + ID + 대표정보 최대 3줄
 *   - 호버: "OOO 박물관" 툴팁 (opsPath 있을 때)
 *   - 고인: 생존기간만 표시
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
// FolderCard — §4 카드, §5 입체감 (블록 내부 → 테두리 없음)
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
      return; // 더블클릭 쪽에서 처리
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!isCuratorCard && node.matchStatus === 'linked') {
        // §6: 타인 싱글클릭 → 웜홀
        onWormhole({ subdomain: node.personId, name: node.name });
      }
      // 본인 카드 싱글클릭 → 무반응 (§6)
    }, DBL_CLICK_MS);
  }

  function handleDoubleClick() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDoubleClick(node.personId);
  }

  // §4 생존기간 (고인은 생존기간만)
  function lifespan() {
    if (!node.isDeceased) return null;
    const b = node.birthYear ?? (node.birthDate ? new Date(node.birthDate).getFullYear() : null);
    const d = node.deathYear ?? (node.deathDate ? new Date(node.deathDate).getFullYear() : null);
    return b && d ? `${b}~${d}` : b ? `${b}~` : null;
  }

  const span = lifespan();

  // §24-1: 카드 개별 테두리 금지 → 블록이 담당, 카드 자체는 border 없음
  // 좌우 카드 내부 경계선: 우측 카드 왼쪽에만 얇은 구분선
  const innerBorder = isRight ? { borderLeft: `1px solid ${COLOR.cardBorder}` } : {};

  return (
    <div
      style={{
        ...s.card,
        ...innerBorder,
        width,
        background: isCuratorCard ? COLOR.curatorBg : 'transparent',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 사진 (§24-1: 시각적 간격 40px — 내부 패딩으로 유지) */}
      <div style={s.photoWrap}>
        {node.photoUrl
          ? <img src={node.photoUrl} alt={node.name} style={s.photoImg} />
          : <span style={s.photoPlaceholder}>{node.gender === 'female' ? '♀' : '♂'}</span>
        }
      </div>

      {/* 이름 */}
      <div style={s.name}>{node.name}</div>

      {/* ID (§7) */}
      {node.personId && <div style={s.ocId}>{node.personId}</div>}

      {/* 대표정보 최대 3줄 (§4) */}
      <div style={s.infoWrap}>
        {span           ? <span style={s.infoLine}>{span}</span>
          : node.birthDate ? <span style={s.infoLine}>{node.birthDate.slice(0, 4)}년생</span>
          : null
        }
        {node.bio1 && <span style={s.infoLine}>{node.bio1}</span>}
        {node.bio2 && <span style={s.infoLine}>{node.bio2}</span>}
      </div>

      {/* §4 호버 툴팁 "OOO 박물관" */}
      {hovered && node.matchStatus === 'linked' && (
        <div style={s.tooltip}>{node.name} 박물관</div>
      )}
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  card: {
    height:        CARD_HEIGHT,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    // §24-1: 사진 시각적 간격 40px → 상하 패딩 10px + 좌우 20px
    padding:       '10px 20px 8px',
    boxSizing:     'border-box',
    borderRadius:  4,
    overflow:      'hidden',
  },
  photoWrap: {
    width:          44,
    height:         44,
    borderRadius:   '50%',
    overflow:       'hidden',
    marginBottom:   4,
    flexShrink:     0,
    background:     '#E8DFD0',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  },
  photoImg:        { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder:{ fontSize: 18, color: '#C4A882' },
  name: {
    fontSize:   13,
    fontWeight: 700,
    color:      '#3a2a1a',
    textAlign:  'center',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  },
  ocId: {
    fontSize:  9,
    color:     '#B09070',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  infoWrap: {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    marginTop:     3,
    flex:          1,
    overflow:      'hidden',
    width:         '100%',
  },
  infoLine: {
    fontSize:     10,
    color:        '#7a6a55',
    lineHeight:   1.3,
    whiteSpace:   'nowrap',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    maxWidth:     CARD_WIDTH - 40,
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
