/**
 * GhostCard.jsx — VISION §4 가상 노드
 *
 * "데이터가 아직 입력되지 않아 비어있는 경우, 트리 구조가 끊어지게 두지 않는다."
 * "해당 빈자리에 즉시 '가상 노드'를 생성하여 시각적인 틀을 유지하고,
 *  이름 대신 '아직 개관전입니다'라는 메시지를 표시하여 추후 데이터 입력을 유도한다."
 *
 * 사용 조건:
 *   - matchStatus === 'ghost' 또는 name 미입력 인물
 *
 * 동작:
 *   - 싱글클릭 → 무반응 (박물관 없음)
 *   - 더블클릭 → onDoubleClick (관장이면 정보 입력 모달)
 *
 * 크기: CoupleBlock 내부 카드 슬롯과 동일 (width prop, CARD_HEIGHT)
 */

import { CARD_HEIGHT } from '../../constants/tree';

export default function GhostCard({ width, gender, onDoubleClick }) {
  const genderIcon = gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?';

  return (
    <div
      style={{ ...s.wrap, width }}
      onDoubleClick={onDoubleClick}
      title="아직 개관전입니다 — 더블클릭하여 정보 입력"
    >
      {/* 성별 아이콘 */}
      <div style={s.iconWrap}>
        <span style={s.icon}>{genderIcon}</span>
      </div>

      {/* 점선 구분 */}
      <div style={s.divider} />

      {/* 메시지 */}
      <p style={s.message}>아직</p>
      <p style={s.message}>개관전입니다</p>

      {/* 입력 유도 힌트 */}
      <p style={s.hint}>더블클릭</p>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  wrap: {
    height:         CARD_HEIGHT,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '10px 20px 8px',
    boxSizing:      'border-box',
    cursor:         'pointer',
    // 가상 노드: 점선 + 반투명 — CoupleBlock 내부에서 개별 테두리 없음
    background:     'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(196,168,130,0.06) 4px, rgba(196,168,130,0.06) 8px)',
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   '50%',
    border:         '1.5px dashed #C4A882',
    background:     'rgba(196,168,130,0.1)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   5,
    flexShrink:     0,
  },
  icon: {
    fontSize: 15,
    color:    '#C4A882',
    opacity:  0.7,
  },
  divider: {
    width:        '60%',
    height:       1,
    background:   'repeating-linear-gradient(to right, #C4A882 0, #C4A882 4px, transparent 4px, transparent 8px)',
    marginBottom: 5,
    opacity:      0.5,
  },
  message: {
    fontSize:   10,
    color:      '#B09070',
    fontStyle:  'italic',
    margin:     '1px 0',
    textAlign:  'center',
    lineHeight: 1.3,
    letterSpacing: 0.2,
  },
  hint: {
    fontSize:  9,
    color:     '#C4A882',
    margin:    '4px 0 0',
    opacity:   0.6,
    textAlign: 'center',
  },
};
