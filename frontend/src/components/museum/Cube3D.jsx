/**
 * Cube3D.jsx — CSS preserve-3d 정육면체 (6면)
 *
 * 180×180×60 정밀 수치 (LM 검증)
 * 모든 면은 rotate + translateZ만으로 배치 (CSS position 속성 미사용)
 * 부모 큐브 중심(90,90,0) 기준 배치
 *
 * HALF_SIZE = 90px (정면 절반)
 * HALF_DEPTH = 30px (깊이 절반)
 */
import React from 'react';

const FRONT_W = 180;
const FRONT_H = 180;
const DEPTH = 60;
const HALF_SIZE = FRONT_W / 2;  // 90px
const HALF_DEPTH = DEPTH / 2;   // 30px

// 색상
const WALL_BASE = '#F5F0E6';
const WALL_SHADOW = '#E8E0D0';
const ROOF_DARK = 'rgba(40,30,10,0.35)';
const FLOOR_COLOR = '#5a4a3a';
const BACK_COLOR = '#8b7355';

export default function Cube3D({
    front,
    leftFace,
    rightFace,
    locked = false,
    opacity = 1,
    style: externalStyle,
}) {
    const faceBase = {
        position: 'absolute',
        top: 0,
        left: 0,
        backfaceVisibility: 'hidden',
        boxSizing: 'border-box',
    };

    return (
        <div
            style={{
                ...externalStyle,
                width: FRONT_W,
                height: FRONT_H,
                position: 'relative',
                transformStyle: 'preserve-3d',
            }}
            data-testid="cube3d-wrapper"
        >
            <div
                style={{
                    width: FRONT_W,
                    height: FRONT_H,
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    willChange: 'transform',
                    opacity,
                }}
                data-testid="cube3d-scene"
            >
                {/* ── 정면 (Front): translateZ(30px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: FRONT_H,
                        transform: `translateZ(${HALF_DEPTH}px)`,
                        overflow: 'hidden',
                        borderRadius: '3px',
                    }}
                    data-testid="cube3d-front"
                >
                    {front}
                </div>

                {/* ── 후면 (Back): rotateY(180deg) translateZ(30px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: FRONT_H,
                        transform: `rotateY(180deg) translateZ(${HALF_DEPTH}px)`,
                        background: BACK_COLOR,
                    }}
                    data-testid="cube3d-back"
                />

                {/* ── 좌측면 (Left): rotateY(-90deg) translateZ(90px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)`,
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderLeft: '1px solid rgba(196,168,79,0.3)',
                        overflow: 'hidden',
                    }}
                    data-testid="cube3d-left"
                >
                    {leftFace}
                </div>

                {/* ── 우측면 (Right): rotateY(90deg) translateZ(90px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)`,
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderRight: '1px solid rgba(196,168,79,0.3)',
                        overflow: 'hidden',
                    }}
                    data-testid="cube3d-right"
                >
                    {rightFace}
                </div>

                {/* ── 상단면 (Top): rotateX(90deg) translateZ(90px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: DEPTH,
                        transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)`,
                        background: `linear-gradient(180deg, ${ROOF_DARK} 0%, rgba(60,45,20,0.15) 100%)`,
                    }}
                    data-testid="cube3d-top"
                />

                {/* ── 하단면 (Bottom): rotateX(-90deg) translateZ(90px) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: DEPTH,
                        transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)`,
                        background: FLOOR_COLOR,
                    }}
                    data-testid="cube3d-bottom"
                />
            </div>
        </div>
    );
}

export { FRONT_W, FRONT_H, DEPTH };
