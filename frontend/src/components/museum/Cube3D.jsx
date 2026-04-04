/**
 * Cube3D.jsx — CSS preserve-3d 정육면체 (6면)
 *
 * 듀얼 레이어 아키텍처:
 * - 부모 viewport에 perspective: 1200px
 * - 개별 블록에 rotateX/Y 없음
 * - CSS 엔진이 위치 기반으로 자동 원근감 생성
 *
 * 규격: 180×180×60 (DEPTH 60px → 옆면 넓게)
 */
import React from 'react';

const FRONT_W = 180;
const FRONT_H = 180;
const DEPTH = 60;
const HALF_DEPTH = DEPTH / 2; // 30px

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
                {/* ── 정면 (Front) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: FRONT_H,
                        transform: `translateZ(${HALF_DEPTH}px)`,
                        zIndex: 3,
                        overflow: 'hidden',
                        borderRadius: '3px',
                    }}
                    data-testid="cube3d-front"
                >
                    {front}
                </div>

                {/* ── 후면 (Back) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: FRONT_H,
                        transform: `translateZ(-${HALF_DEPTH}px) rotateY(180deg)`,
                        background: BACK_COLOR,
                        zIndex: 0,
                    }}
                    data-testid="cube3d-back"
                />

                {/* ── 좌측면 (Left) — 일반전시관 문 ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        transform: `rotateY(-90deg) translateZ(${HALF_DEPTH}px)`,
                        transformOrigin: 'left center',
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderLeft: '1px solid rgba(196,168,79,0.3)',
                        zIndex: 2,
                        overflow: 'hidden',
                    }}
                    data-testid="cube3d-left"
                >
                    {leftFace}
                </div>

                {/* ── 우측면 (Right) — 가족전시관 문 ── */}
                <div
                    style={{
                        ...faceBase,
                        width: DEPTH,
                        height: FRONT_H,
                        transform: `rotateY(90deg) translateZ(${FRONT_W - HALF_DEPTH}px)`,
                        transformOrigin: 'left center',
                        background: `linear-gradient(180deg, ${WALL_SHADOW} 0%, ${WALL_BASE} 30%, ${WALL_SHADOW} 100%)`,
                        borderRight: '1px solid rgba(196,168,79,0.3)',
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
                        transform: `rotateX(90deg) translateZ(${HALF_DEPTH}px)`,
                        transformOrigin: 'center top',
                        background: `linear-gradient(180deg, ${ROOF_DARK} 0%, rgba(60,45,20,0.15) 100%)`,
                        zIndex: 0,
                    }}
                    data-testid="cube3d-top"
                />

                {/* ── 하단면 (Bottom) ── */}
                <div
                    style={{
                        ...faceBase,
                        width: FRONT_W,
                        height: DEPTH,
                        transform: `rotateX(-90deg) translateZ(${FRONT_H - HALF_DEPTH}px)`,
                        transformOrigin: 'center top',
                        background: FLOOR_COLOR,
                        zIndex: 0,
                    }}
                    data-testid="cube3d-bottom"
                />
            </div>
        </div>
    );
}

export { FRONT_W, FRONT_H, DEPTH };
