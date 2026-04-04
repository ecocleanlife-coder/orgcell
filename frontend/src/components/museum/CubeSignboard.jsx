/**
 * CubeSignboard.jsx — 블록 호버 메뉴 (방향 간판)
 *
 * FolderCard 호버/터치 시 표시되는 방향 메뉴:
 *
 * 일반인물: 3개 메뉴
 *   ◀ 일반전시관 | 가족전시관 ▶ | ▼ 자료실
 *
 * 사위/며느리: 4개 메뉴 (+ 가문전환)
 *   ◀ 일반전시관 | 가족전시관 ▶ | ▼ 자료실 | ⊕ 가문전환
 *
 * PC: hover fade-in 0.3s
 * 모바일: 2초 간격 자동 순환 ghost effect
 */
import React from 'react';
import useCubeAnimation from '../../hooks/useCubeAnimation';

const BASE_ACTIONS = [
    { key: 'exhibit_public', label: '일반전시관', icon: '◀', desc: '공개 전시' },
    { key: 'exhibit_family', label: '가족전시관', icon: '▶', desc: '가족 전용' },
    { key: 'archive',        label: '자료실',     icon: '▼', desc: '사진·문서' },
];

const WORMHOLE_ACTION = { key: 'wormhole', label: '가문전환', icon: '⊕', desc: '다른 가문으로' };

/**
 * @param {boolean} visible — 메뉴 표시 여부
 * @param {boolean} isMobile — 모바일 여부 (자동 순환)
 * @param {boolean} showWormhole — 가문전환 표시 (사위/며느리만)
 * @param {function} onAction — (actionKey) => void
 * @param {number} width — 너비 (기본 180)
 * @param {number} height — 높이 (기본 180)
 */
export default function CubeSignboard({
    visible = false,
    isMobile = false,
    showWormhole = false,
    onAction,
    width = 180,
    height = 180,
}) {
    const actions = showWormhole
        ? [...BASE_ACTIONS, WORMHOLE_ACTION]
        : BASE_ACTIONS;

    const { activeIndex, handleInteract } = useCubeAnimation(actions.length, {
        interval: 2000,
        active: visible && isMobile,
    });

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                width,
                height,
                borderRadius: '3px',
                background: 'rgba(30, 26, 20, 0.85)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                zIndex: 10,
                opacity: 1,
                animation: 'signboardFadeIn 0.3s ease-out',
                padding: '16px 10px',
                boxSizing: 'border-box',
            }}
            data-testid="cube-signboard"
            onTouchStart={handleInteract}
        >
            {/* 액션 버튼들 */}
            {actions.map((action, idx) => {
                const isHighlighted = isMobile && idx === activeIndex;
                const isWormhole = action.key === 'wormhole';

                return (
                    <button
                        key={action.key}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAction) onAction(action.key);
                        }}
                        onPointerUp={(e) => e.stopPropagation()}
                        title={action.desc}
                        style={{
                            width: '92%',
                            padding: '8px 10px',
                            border: `1px solid ${
                                isHighlighted ? '#C4A84F'
                                : isWormhole ? 'rgba(100,180,255,0.4)'
                                : 'rgba(196,168,79,0.3)'
                            }`,
                            borderRadius: '8px',
                            background: isHighlighted
                                ? 'rgba(196,168,79,0.25)'
                                : isWormhole
                                    ? 'rgba(100,180,255,0.08)'
                                    : 'rgba(196,168,79,0.05)',
                            color: isHighlighted
                                ? '#E8D48C'
                                : isWormhole ? '#8BC4F0' : '#C4A84F',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.3s ease',
                            transform: isHighlighted ? 'scale(1.04)' : 'scale(1)',
                            boxShadow: isHighlighted
                                ? '0 0 8px rgba(196,168,79,0.3)'
                                : 'none',
                        }}
                    >
                        <span style={{
                            fontSize: '14px',
                            width: 20,
                            textAlign: 'center',
                            opacity: isHighlighted ? 1 : 0.8,
                        }}>
                            {action.icon}
                        </span>
                        <span>{action.label}</span>
                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: '9px',
                                opacity: 0.5,
                                fontWeight: 400,
                            }}
                        >
                            {action.desc}
                        </span>
                    </button>
                );
            })}

            {/* fade-in 애니메이션 */}
            <style>{`
                @keyframes signboardFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export { BASE_ACTIONS, WORMHOLE_ACTION };
