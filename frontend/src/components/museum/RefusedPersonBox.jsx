/**
 * RefusedPersonBox.jsx — 노출 거절자의 "빈 박물관 블록"
 *
 * 박물관 노출을 거절한 사람을 평면 카드로 표현
 * - 에테리얼 빈 박스 (실루엣 + 관계/성씨)
 * - 점선 테두리 + 시머 애니메이션
 * - 호버 메뉴 없음
 */
import React from 'react';

const CARD_SIZE = 180;
const TAB_H = 10;
const TAB_COLOR = { M: '#7BA7C4', F: '#C4956A' };
const FRAME_COLOR = '#C4A84F';

export default function RefusedPersonBox({
    displayText = '가족',
    privacyVariant = 'anonymous',
    gender = 'M',
    style: externalStyle,
}) {
    const tabColor = gender === 'F' ? TAB_COLOR.F : TAB_COLOR.M;

    return (
        <div
            style={{
                ...externalStyle,
                position: externalStyle?.position || 'relative',
                paddingTop: TAB_H,
            }}
            data-testid="refused-person-box"
        >
            {/* 폴더 탭 (반투명) */}
            <div
                style={{
                    position: 'absolute',
                    top: 2,
                    left: 0,
                    width: 40,
                    height: TAB_H,
                    background: tabColor,
                    borderTopLeftRadius: '4px',
                    borderTopRightRadius: '4px',
                    opacity: 0.3,
                    zIndex: 5,
                }}
            />

            {/* 평면 카드 */}
            <div
                style={{
                    width: CARD_SIZE,
                    height: CARD_SIZE,
                    borderRadius: '3px',
                    border: `1.5px dashed ${FRAME_COLOR}`,
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    opacity: 0.35,
                    background: `
                        radial-gradient(ellipse at 50% 50%, rgba(196,168,79,0.08) 0%, transparent 70%),
                        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px),
                        #FAFAF2
                    `,
                    boxShadow: `
                        inset 0 0 20px rgba(196,168,79,0.08),
                        0 2px 8px rgba(61,32,8,0.05)
                    `,
                }}
            >
                {/* 인셋 프레임 (점선) */}
                <div
                    style={{
                        position: 'absolute',
                        inset: '6px',
                        border: '0.5px dashed rgba(196,168,79,0.2)',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                    }}
                />

                {/* 중앙 실루엣 + 텍스트 */}
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        boxSizing: 'border-box',
                    }}
                >
                    <div style={{ fontSize: '28px', color: 'rgba(196,168,79,0.25)', marginBottom: '8px', lineHeight: 1 }}>
                        {gender === 'F' ? '♀' : '♂'}
                    </div>
                    <div style={{
                        fontFamily: 'Georgia, "Noto Serif KR", serif',
                        fontSize: '13px', fontWeight: 600,
                        color: '#B8B0A4', textAlign: 'center', lineHeight: 1.4,
                    }}>
                        {displayText}
                    </div>
                    <div style={{ fontSize: '10px', color: '#C4B89C', marginTop: '6px', letterSpacing: '0.5px' }}>
                        비공개
                    </div>
                </div>

                {/* 시머 애니메이션 */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, transparent 40%, rgba(196,168,79,0.06) 50%, transparent 60%)',
                        animation: 'shimmer 4s ease-in-out infinite',
                        pointerEvents: 'none',
                    }}
                />
            </div>

            <style>{`
                @keyframes shimmer {
                    0%, 100% { opacity: 0; transform: translateX(-100%); }
                    50% { opacity: 1; transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
