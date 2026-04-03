/**
 * CubeSignboard.jsx — 3D 큐브 간판 메뉴
 *
 * 박물관 건물 블록 위에 표시되는 액션 메뉴:
 * - PC: hover 시 정면 오버레이로 슬라이드 다운
 * - 모바일: 터치 후 자동 순환 하이라이트
 * - 금색 테마의 박물관 간판 스타일
 * - 5개 액션: 가문전환, 전시, 편집, 사진, 초대
 */
import React from 'react';
import useCubeAnimation from '../../hooks/useCubeAnimation';

const ACTIONS = [
    { key: 'wormhole', label: '가문전환', icon: '⊕', desc: '다른 가문으로' },
    { key: 'exhibit',  label: '전시',     icon: '🖼', desc: '개인 전시관' },
    { key: 'edit',     label: '편집',     icon: '✎', desc: '정보 수정' },
    { key: 'photo',    label: '사진',     icon: '📷', desc: '사진 등록' },
    { key: 'invite',   label: '초대',     icon: '✉', desc: '가족 초대' },
];

/**
 * @param {boolean} visible — 간판 표시 여부
 * @param {boolean} isMobile — 모바일 여부 (자동 순환)
 * @param {function} onAction — (actionKey) => void
 * @param {number} width — 간판 너비 (기본 180)
 * @param {number} height — 간판 높이 (기본 180)
 */
export default function CubeSignboard({
    visible = false,
    isMobile = false,
    onAction,
    width = 180,
    height = 180,
}) {
    const { activeIndex, handleInteract } = useCubeAnimation(ACTIONS.length, {
        interval: 2500,
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
                background: 'rgba(30, 26, 20, 0.88)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                zIndex: 10,
                animation: 'signboardFadeIn 0.25s ease-out',
                padding: '12px 8px',
                boxSizing: 'border-box',
            }}
            data-testid="cube-signboard"
            onTouchStart={handleInteract}
        >
            {/* 간판 타이틀 */}
            <div
                style={{
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#C4A84F',
                    letterSpacing: '2px',
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                }}
            >
                MUSEUM
            </div>

            {/* 구분선 */}
            <div
                style={{
                    width: '60%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #C4A84F, transparent)',
                    marginBottom: 4,
                }}
            />

            {/* 액션 버튼들 */}
            {ACTIONS.map((action, idx) => {
                const isHighlighted = isMobile && idx === activeIndex;

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
                            width: '90%',
                            padding: '5px 8px',
                            border: `1px solid ${isHighlighted ? '#C4A84F' : 'rgba(196,168,79,0.3)'}`,
                            borderRadius: '6px',
                            background: isHighlighted
                                ? 'rgba(196,168,79,0.2)'
                                : 'rgba(196,168,79,0.05)',
                            color: isHighlighted ? '#E8D48C' : '#C4A84F',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.3s ease',
                            transform: isHighlighted ? 'scale(1.03)' : 'scale(1)',
                        }}
                    >
                        <span style={{ fontSize: '13px', width: 18, textAlign: 'center' }}>
                            {action.icon}
                        </span>
                        <span>{action.label}</span>
                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: '9px',
                                opacity: 0.6,
                                fontWeight: 400,
                            }}
                        >
                            {action.desc}
                        </span>
                    </button>
                );
            })}

            {/* CSS 애니메이션 */}
            <style>{`
                @keyframes signboardFadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export { ACTIONS };
