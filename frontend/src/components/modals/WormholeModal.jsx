/**
 * WormholeModal.jsx — §6 웜홀 이동 확인 모달
 *
 * 트리거: treeStore.wormholeTarget = { subdomain, name }
 *
 * 동작 흐름 (§6):
 *   1. "OOO님의 박물관으로 이동하시겠습니까?" 모달 표시
 *   2. [이동] 클릭 → 페이드아웃 오버레이 + "OOO님의 박물관으로 이동합니다..."
 *   3. 1.2초 후 treeStore.navigateTo(subdomain) → URL 변경 + 트리 갱신
 *   4. [취소] 클릭 → closeWormhole()
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useTreeStore }        from '../../store/treeStore';

// ─── 애니메이션 상수 ──────────────────────────────────────────────────────────
const FADE_DURATION_MS = 800;
const NAV_DELAY_MS     = 1200;

export default function WormholeModal() {
  const { wormholeTarget, closeWormhole, navigateTo } = useTreeStore();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('idle'); // 'idle' | 'confirm' | 'fading' | 'moving'

  // wormholeTarget 세팅 시 confirm 단계로 전환
  useEffect(() => {
    if (wormholeTarget) setPhase('confirm');
    else                setPhase('idle');
  }, [wormholeTarget]);

  if (!wormholeTarget || phase === 'idle') return null;

  const { subdomain, name } = wormholeTarget;

  // ── 이동 확인 ────────────────────────────────────────────────────────────────
  async function handleConfirm() {
    setPhase('fading');

    // 페이드아웃 → 이동 메시지
    setTimeout(() => setPhase('moving'), FADE_DURATION_MS);

    // 실제 이동
    setTimeout(async () => {
      await navigateTo(subdomain);      // 트리 캐시 초기화 + 재fetch
      navigate(`/${subdomain}`);        // URL 변경
      setPhase('idle');
    }, NAV_DELAY_MS);
  }

  function handleCancel() {
    closeWormhole();
    setPhase('idle');
  }

  // ── 페이드아웃 오버레이 (§6: "OOO님의 박물관으로 이동합니다...") ─────────────
  if (phase === 'fading' || phase === 'moving') {
    return (
      <div style={{
        ...s.fadeOverlay,
        opacity: phase === 'fading' ? 1 : 1,
        animation: phase === 'fading' ? 'fadeIn 0.4s ease' : 'none',
      }}>
        <div style={s.movingText}>
          <span style={s.movingDot}>●</span>
          <span>{name}님의 박물관으로 이동합니다...</span>
        </div>
      </div>
    );
  }

  // ── 확인 모달 ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* 배경 딤 */}
      <div style={s.backdrop} onClick={handleCancel} />

      {/* 모달 카드 */}
      <div style={s.modal} role="dialog" aria-modal="true">
        {/* 웜홀 아이콘 */}
        <div style={s.iconWrap}>
          <span style={s.icon}>🌀</span>
        </div>

        <p style={s.title}>박물관 이동</p>
        <p style={s.message}>
          <strong style={s.nameHighlight}>{name}</strong>님의 박물관으로<br />
          이동하시겠습니까?
        </p>
        <p style={s.subMessage}>{subdomain} 가족유산박물관</p>

        <div style={s.btnRow}>
          <button style={s.cancelBtn} onClick={handleCancel}>
            취소
          </button>
          <button style={s.confirmBtn} onClick={handleConfirm}>
            이동하기 →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wormholePulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.15); }
        }
      `}</style>
    </>
  );
}

// ─── 스타일 (§5 금색톤) ────────────────────────────────────────────────────────
const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 900,
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    top:  '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 901,
    background: '#FDFBF7',
    border:       '1px solid #C4A882',
    borderRight:  '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow:    '2px 2px 0 #c4a87a, 0 8px 32px rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: '36px 40px 32px',
    textAlign: 'center',
    width: 320,
    animation: 'fadeIn 0.2s ease',
  },
  iconWrap: {
    marginBottom: 12,
    animation: 'wormholePulse 2s ease infinite',
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#B09060',
    textTransform: 'uppercase',
    margin: '0 0 12px',
    fontWeight: 600,
  },
  message: {
    fontSize: 17,
    color: '#3a2a1a',
    lineHeight: 1.6,
    margin: '0 0 6px',
  },
  nameHighlight: {
    color: '#8B7355',
    fontWeight: 700,
  },
  subMessage: {
    fontSize: 12,
    color: '#A09070',
    margin: '0 0 28px',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: '1px solid #C4A882',
    borderRadius: 4,
    fontSize: 14,
    color: '#8B7355',
    cursor: 'pointer',
    fontWeight: 500,
  },
  confirmBtn: {
    flex: 2,
    padding: '10px 0',
    background: '#8B7355',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },

  // 페이드아웃 오버레이
  fadeOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(90, 60, 30, 0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.4s ease',
  },
  movingText: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#FDF8F0',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  movingDot: {
    fontSize: 10,
    color: '#C4A882',
    animation: 'wormholePulse 0.8s ease infinite',
  },
};
