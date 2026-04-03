/**
 * RefusedPersonBox.jsx — 노출 거절자의 "빈 레고 박스"
 *
 * 박물관 노출을 거절한 사람을 신비로운 빈 박스로 표현
 * - 가계도 구조 유지 (위치/크기 동일)
 * - 에테리얼 효과: 낮은 불투명도, 부드러운 글로우, 미세한 시머
 * - 관계만 표시 (예: "장남") 또는 성씨만 표시 (예: "이씨")
 */
import React from 'react';

const CARD_SIZE = 180;
const TAB_H = 10;
const FRAME_COLOR = '#C4A84F';

export default function RefusedPersonBox({
    displayText = '가족',
    privacyVariant = 'anonymous', // 'anonymous' | 'surname_only'
    gender = 'M',
    style: externalStyle,
}) {
    const tabColor = gender === 'F' ? '#C4956A' : '#7BA7C4';

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
                }}
            />

            {/* 메인 박스: 에테리얼 빈 레고 */}
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
                    transition: 'opacity 0.4s ease',
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

                {/* 중앙 텍스트: 관계 또는 성씨 */}
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
                    {/* 실루엣 아이콘 */}
                    <div
                        style={{
                            fontSize: '28px',
                            color: 'rgba(196,168,79,0.25)',
                            marginBottom: '8px',
                            lineHeight: 1,
                        }}
                    >
                        {gender === 'F' ? '♀' : '♂'}
                    </div>

                    {/* 표시 텍스트 */}
                    <div
                        style={{
                            fontFamily: 'Georgia, "Noto Serif KR", serif',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#B8B0A4',
                            textAlign: 'center',
                            lineHeight: 1.4,
                        }}
                    >
                        {displayText}
                    </div>

                    {/* 비공개 안내 */}
                    <div
                        style={{
                            fontSize: '10px',
                            color: '#C4B89C',
                            marginTop: '6px',
                            letterSpacing: '0.5px',
                        }}
                    >
                        비공개
                    </div>
                </div>

                {/* 시머 애니메이션 오버레이 */}
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

            {/* CSS shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0%, 100% { opacity: 0; transform: translateX(-100%); }
                    50% { opacity: 1; transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
