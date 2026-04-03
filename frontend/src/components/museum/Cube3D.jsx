/**
 * Cube3D.jsx — CSS preserve-3d 정육면체 컨테이너
 *
 * 가족트리 인물 카드를 입체 박물관 건물 블록으로 표현
 * - 정면 (front): 180×180px — 인물 사진/이름 (children으로 주입)
 * - 좌측면 (left): 40×180px — 일반전시관 입구
 * - 우측면 (right): 40×180px — 가족전시관 입구
 * - 상단면 (top): 180×40px — 어두운 그라디언트 (입체감)
 *
 * perspective: 800px, rotateX(-5deg) rotateY(-15deg) 통일
 */
import React from 'react';

const FRONT_W = 180;
const FRONT_H = 180;
const DEPTH = 40;

// 공통 3D 각도
const ROTATE_X = -5;
const ROTATE_Y = -15;
const PERSPECTIVE = 800;

// 색상
const WALL_BASE = '#F5F0E6';       // 벽돌 기본색
const WALL_SHADOW = '#E8E0D0';     // 측면 벽색
const ROOF_DARK = 'rgba(40,30,10,0.25)';  // 지붕 그라디언트

/**
 * @param {object} props
 * @param {React.ReactNode} props.front — 정면 콘텐츠 (FolderCard 기존 내용)
 * @param {React.ReactNode} props.leftFace — 좌측면 (일반전시관 문)
 * @param {React.ReactNode} props.rightFace — 우측면 (가족전시관 문)
 * @param {boolean} props.locked — 잠금 상태 (RefusedPersonBox용)
 * @param {number} props.opacity — 전체 불투명도
 * @param {object} props.style — 외부 스타일 오버라이드
 */
export default function Cube3D({
    front,
    leftFace,
    rightFace,
    locked = false,
    opacity = 1,
    style: externalStyle,
}) {
    // 면 공통 스타일
    const faceBase = {
        position: 'absolute',
        backfaceVisibility: 'hidden',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{
                ...externalStyle,
                width: FRONT_W,
                height: FRONT_H,
                perspective: `${PERSPECTIVE}px`,
                position: 'relative',
            }}
            data-testid="cube3d-wrapper"
        >
            <div
                style={{
                    width: FRONT_W,
                    height: FRONT_H,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${ROTATE_X}deg) rotateY(${ROTATE_Y}deg)`,
                    transition: 'transform 0.4s ease',
                    willChange: 'transform',
                    opacity,
                }}
                data-testid="cube3d-scene"
            >
                {/* ── 정면 (Front) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: FRONT_H,
                        transform: `translateZ(${DEPTH / 2}px)`,
                        zIndex: 3,
                        overflow: 'hidden',
                        borderRadius: '3px',
                    }}
                    data-testid="cube3d-front"
                >
                    {front}
                </div>

                {/* ── 좌측면 (Left) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        left: 0,
                        transform: `rotateY(-90deg) translateZ(0px)`,
                        transformOrigin: 'left center',
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderLeft: `1px solid rgba(196,168,79,0.3)`,
                        zIndex: 2,
                        overflow: 'hidden',
                    }}
                    data-testid="cube3d-left"
                >
                    {leftFace}
                </div>

                {/* ── 우측면 (Right) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        right: 0,
                        transform: `rotateY(90deg) translateZ(0px)`,
                        transformOrigin: 'right center',
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderRight: `1px solid rgba(196,168,79,0.3)`,
                        zIndex: 1,
                        overflow: 'hidden',
                    }}
                    data-testid="cube3d-right"
                >
                    {rightFace}
                </div>

                {/* ── 상단면 (Top) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: DEPTH,
                        top: 0,
                        transform: `rotateX(90deg) translateZ(0px)`,
                        transformOrigin: 'top center',
                        background: `linear-gradient(180deg, ${ROOF_DARK} 0%, rgba(60,45,20,0.15) 100%)`,
                        zIndex: 0,
                    }}
                    data-testid="cube3d-top"
                />
            </div>
        </div>
    );
}

// 상수 export (다른 컴포넌트에서 사이징 참조용)
export { FRONT_W, FRONT_H, DEPTH, PERSPECTIVE, ROTATE_X, ROTATE_Y };
