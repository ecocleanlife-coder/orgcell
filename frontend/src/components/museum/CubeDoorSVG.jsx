/**
 * CubeDoorSVG.jsx — 3D 큐브 측면 전시관 입구 SVG
 *
 * ArchDoor: 좌측면 — 아치형 문 + "일반전시관" 세로텍스트 + 🏛️
 * WoodenDoor: 우측면 — 나무 대문 + "가족전시관" 세로텍스트 + 🏠
 *
 * 각 SVG는 40×180px 측면 크기에 맞춰 배치
 */
import React from 'react';

const SIDE_W = 40;
const SIDE_H = 180;
const GOLD = '#C4A84F';
const GOLD_DIM = 'rgba(196,168,79,0.5)';

/**
 * 아치형 문 — 일반전시관 입구 (좌측면)
 * @param {boolean} locked — 잠금 표시 (RefusedPersonBox용)
 */
export function ArchDoor({ locked = false }) {
    return (
        <div style={{
            width: SIDE_W,
            height: SIDE_H,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        }}>
            {/* 아치형 문 SVG */}
            <svg
                width="28"
                height="50"
                viewBox="0 0 28 50"
                fill="none"
                style={{ marginBottom: 4 }}
            >
                {/* 문틀 */}
                <path
                    d="M2 50 V18 Q2 2 14 2 Q26 2 26 18 V50"
                    stroke={GOLD}
                    strokeWidth="1.5"
                    fill="rgba(196,168,79,0.08)"
                />
                {/* 벽돌 패턴 — 아치 위 */}
                <line x1="0" y1="8" x2="6" y2="8" stroke={GOLD_DIM} strokeWidth="0.5" />
                <line x1="22" y1="8" x2="28" y2="8" stroke={GOLD_DIM} strokeWidth="0.5" />
                <line x1="0" y1="14" x2="4" y2="14" stroke={GOLD_DIM} strokeWidth="0.5" />
                <line x1="24" y1="14" x2="28" y2="14" stroke={GOLD_DIM} strokeWidth="0.5" />
                {/* 문 손잡이 / 잠금 */}
                {locked ? (
                    <text x="14" y="38" textAnchor="middle" fontSize="12" fill={GOLD}>🔒</text>
                ) : (
                    <circle cx="18" cy="35" r="1.5" fill={GOLD} />
                )}
            </svg>

            {/* 세로 텍스트 */}
            <div style={{
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                fontSize: '8px',
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '2px',
                lineHeight: 1,
                userSelect: 'none',
            }}>
                {locked ? '' : '일반전시관'}
            </div>

            {/* 이모지 */}
            {!locked && (
                <div style={{
                    fontSize: '10px',
                    marginTop: 4,
                    lineHeight: 1,
                    opacity: 0.7,
                }}>
                    🏛️
                </div>
            )}
        </div>
    );
}

/**
 * 나무 대문 — 가족전시관 입구 (우측면)
 * @param {boolean} locked — 잠금 표시
 */
export function WoodenDoor({ locked = false }) {
    return (
        <div style={{
            width: SIDE_W,
            height: SIDE_H,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        }}>
            {/* 나무 대문 SVG */}
            <svg
                width="28"
                height="50"
                viewBox="0 0 28 50"
                fill="none"
                style={{ marginBottom: 4 }}
            >
                {/* 문틀 — 직사각형 */}
                <rect
                    x="2" y="4" width="24" height="46"
                    rx="1"
                    stroke={GOLD}
                    strokeWidth="1.5"
                    fill="rgba(139,115,85,0.12)"
                />
                {/* 목재 가로 패턴 */}
                <line x1="4" y1="14" x2="24" y2="14" stroke="rgba(139,115,85,0.25)" strokeWidth="0.7" />
                <line x1="4" y1="24" x2="24" y2="24" stroke="rgba(139,115,85,0.25)" strokeWidth="0.7" />
                <line x1="4" y1="34" x2="24" y2="34" stroke="rgba(139,115,85,0.25)" strokeWidth="0.7" />
                <line x1="4" y1="44" x2="24" y2="44" stroke="rgba(139,115,85,0.25)" strokeWidth="0.7" />
                {/* 중앙 분할선 */}
                <line x1="14" y1="6" x2="14" y2="48" stroke={GOLD_DIM} strokeWidth="0.7" />
                {/* 손잡이 / 잠금 */}
                {locked ? (
                    <text x="14" y="32" textAnchor="middle" fontSize="12" fill={GOLD}>🔒</text>
                ) : (
                    <>
                        <circle cx="11" cy="28" r="1.2" fill={GOLD} />
                        <circle cx="17" cy="28" r="1.2" fill={GOLD} />
                    </>
                )}
            </svg>

            {/* 세로 텍스트 */}
            <div style={{
                writingMode: 'vertical-rl',
                textOrientation: 'upright',
                fontSize: '8px',
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '2px',
                lineHeight: 1,
                userSelect: 'none',
            }}>
                {locked ? '' : '가족전시관'}
            </div>

            {/* 이모지 */}
            {!locked && (
                <div style={{
                    fontSize: '10px',
                    marginTop: 4,
                    lineHeight: 1,
                    opacity: 0.7,
                }}>
                    🏠
                </div>
            )}
        </div>
    );
}
