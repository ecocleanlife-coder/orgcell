/**
 * FolderCard.jsx — "기록의 벽돌" (Record Brick)
 *
 * VISION.md v2.0 레고 블록 표준 + 박물관 컨셉
 * - 180×180px 정사각형 + 40×10 폴더 탭
 * - Photo Front: 사진 전면 + 하단 그라디언트 오버레이
 * - Canvas Front: 아이보리 린넨 + Georgia 서체 + 성별 실루엣
 * - 1.5px 금색 액자 프레임 + 인셋 라인
 * - 20px 시각적 3D 두께 (box-shadow 블록)
 * - preserve-3d + translateZ (웜홀 대비)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { maskName, maskInitials } from '../../utils/privacyMask';
import RefusedPersonBox from './RefusedPersonBox';
import CubeSignboard from './CubeSignboard';
import useMediaQuery from '../../hooks/useMediaQuery';

const CARD_SIZE = 180;
const TAB_W = 40;
const TAB_H = 10;
const BLOCK_DEPTH = 20;       // 시각적 3D 두께
const Z_DEPTH_PX = 200;       // Z 레이어 간 translateZ 거리
const FRAME_COLOR = '#C4A84F'; // 금색 액자
const INSET_COLOR = 'rgba(196,168,79,0.3)'; // 인셋 라인

// ── 성별 실루엣 색상 ──
const SILHOUETTE_COLOR = { M: '#8B7355', F: '#C4956A' };
const GENDER_ICON = { M: '♂', F: '♀' };

// ── Z축 안개 blur (VISION.md LOD) ──
const Z_BLUR = { 0: 0, 1: 3, 2: 6 };

// ── 린넨 노이즈 배경 (CSS 패턴) ──
const LINEN_BG = `
    repeating-linear-gradient(
        0deg,
        transparent, transparent 2px,
        rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px
    ),
    repeating-linear-gradient(
        90deg,
        transparent, transparent 2px,
        rgba(0,0,0,0.008) 2px, rgba(0,0,0,0.008) 4px
    )
`.trim().replace(/\n\s*/g, ' ');

// ── 3D 블록 box-shadow ──
function getBlockShadow(isMainPerson, isSelected) {
    // 우측+하단 묵직한 두께감 + 드롭 그림자
    const thickness = `${BLOCK_DEPTH * 0.3}px ${BLOCK_DEPTH * 0.4}px 0 rgba(80,60,30,0.25)`;
    const drop = `${BLOCK_DEPTH * 0.5}px ${BLOCK_DEPTH * 0.6}px ${BLOCK_DEPTH}px rgba(40,30,10,0.2)`;
    const ambient = `0 2px 8px rgba(61,32,8,0.08)`;

    if (isMainPerson) {
        return `${thickness}, ${drop}, ${ambient}, 0 0 24px rgba(196,168,79,0.3)`;
    }
    if (isSelected) {
        return `${thickness}, ${drop}, ${ambient}, 0 0 16px rgba(196,168,79,0.2)`;
    }
    return `${thickness}, ${drop}, ${ambient}`;
}

// ── 카드 기본 스타일 ──
function getCardStyle(node, isSelected, isMainPerson, hasPhoto) {
    const base = {
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: '3px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.3s, transform 0.4s, opacity 0.4s',
        opacity: node.zOpacity,
        transform: `scale(${node.zScale}) translateZ(${10 - (node.z || 0) * Z_DEPTH_PX}px)`,
        border: `1.5px solid ${FRAME_COLOR}`,
        boxShadow: getBlockShadow(isMainPerson, isSelected),
    };

    if (hasPhoto) {
        return base;
    }

    // Canvas Front: 린넨 배경
    return {
        ...base,
        background: `${LINEN_BG}, #FAFAF2`,
    };
}

// ── 성별 탭 색상 ──
const TAB_COLOR = { M: '#7BA7C4', F: '#C4956A' };

// ── 폴더 탭 ──
function FolderTab({ gender, isDeceased }) {
    const baseColor = TAB_COLOR[gender] || FRAME_COLOR;
    const tabColor = isDeceased ? '#B8B0A4' : baseColor;
    return (
        <div
            data-testid="folder-tab"
            style={{
                position: 'absolute',
                top: -TAB_H + 2,
                left: 0,
                width: TAB_W,
                height: TAB_H,
                background: tabColor,
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                border: `1px solid ${tabColor}`,
                borderBottom: 'none',
                boxShadow: `2px -1px 3px rgba(40,30,10,0.15)`,
            }}
        />
    );
}

// ── Photo Front: 사진 전면 + 하단 그라디언트 ──
function PhotoFront({ data, isDeceased }) {
    const [imgError, setImgError] = useState(false);

    // avatar URL 변경 시 에러 상태 리셋
    useEffect(() => { setImgError(false); }, [data.avatar]);

    if (imgError) return null; // fallback to CanvasFront

    const cropX = data.photoPosition?.x ?? 50;
    const cropY = data.photoPosition?.y ?? 50;

    return (
        <>
            <img
                src={data.avatar}
                alt={data.displayName}
                onError={() => setImgError(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: `${cropX}% ${cropY}%`,
                    display: 'block',
                    filter: isDeceased ? 'grayscale(50%)' : 'none',
                }}
            />
            {/* 하단 30% 다크 그라디언트 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
                    pointerEvents: 'none',
                }}
            />
            {/* 이름 + 날짜 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    right: '8px',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        fontFamily: 'Georgia, "Noto Serif KR", serif',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {data.displayName}
                </div>
                {data.dateLabel && (
                    <div
                        style={{
                            fontFamily: 'Georgia, "Noto Serif KR", serif',
                            fontSize: '10px',
                            color: 'rgba(255,255,255,0.8)',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            marginTop: '2px',
                        }}
                    >
                        {data.dateLabel}
                    </div>
                )}
            </div>
        </>
    );
}

// ── Canvas Front: 린넨 배경 + Georgia 서체 ──
function CanvasFront({ data, isDeceased }) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 12px',
                boxSizing: 'border-box',
                position: 'relative',
            }}
        >
            {/* 이름 (Georgia 클래식) */}
            <div
                style={{
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDeceased ? '#999' : '#3D2008',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    wordBreak: 'keep-all',
                    zIndex: 1,
                }}
            >
                {data.displayName}
            </div>

            {/* 날짜 */}
            {data.dateLabel && (
                <div
                    style={{
                        fontFamily: 'Georgia, "Noto Serif KR", serif',
                        fontSize: '11px',
                        color: isDeceased ? '#aaa' : '#7A6E5E',
                        marginTop: '6px',
                        zIndex: 1,
                    }}
                >
                    {data.dateLabel}
                </div>
            )}

        </div>
    );
}

// ── 사망자 배지 ──
function DeceasedBadge() {
    return (
        <div
            style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: '#fff',
                lineHeight: 1,
                zIndex: 3,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            }}
        >
            †
        </div>
    );
}

// ── 인셋 프레임 라인 ──
function InsetFrame() {
    return (
        <div
            data-testid="inset-frame"
            style={{
                position: 'absolute',
                inset: '3px',
                border: `0.5px solid ${INSET_COLOR}`,
                borderRadius: '2px',
                pointerEvents: 'none',
                zIndex: 2,
            }}
        />
    );
}

// ── Hover 액션 버튼 ──
const HOVER_ACTIONS = [
    { key: 'wormhole', label: '가문전환', icon: '⊕' },
    { key: 'exhibit', label: '전시', icon: '🖼' },
    { key: 'edit', label: '편집', icon: '✎' },
    { key: 'photo', label: '사진', icon: '📷' },
    { key: 'invite', label: '초대', icon: '✉' },
];

function HoverActions({ onAction }) {
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 4,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: 3,
                zIndex: 10,
            }}
            data-testid="hover-actions"
        >
            {HOVER_ACTIONS.map(a => (
                <button
                    key={a.key}
                    onClick={(e) => { e.stopPropagation(); onAction(a.key); }}
                    onPointerUp={(e) => { e.stopPropagation(); }}
                    title={a.label}
                    style={{
                        width: 28,
                        height: 28,
                        border: '1px solid rgba(196,168,79,0.6)',
                        borderRadius: '4px',
                        background: 'rgba(30,26,20,0.85)',
                        color: '#C4A84F',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        lineHeight: 1,
                    }}
                >
                    {a.icon}
                </button>
            ))}
        </div>
    );
}

// ── 메인 컴포넌트 ──
function FolderCard({
    node,
    isSelected = false,
    isMainPerson = false,
    onClick,
    onContextMenu,
    onAction,
    style: externalStyle,
}) {
    const { data, rels } = node;
    const isDeceased = data.isDeceased;
    const [photoFailed, setPhotoFailed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [touchLocked, setTouchLocked] = useState(false); // 터치 토글 고정
    const cardRef = useRef(null);
    const isMobile = useMediaQuery('(pointer: coarse)');

    // ── 거절자 빈 레고 박스: privacyLevel=private + isRefused=true ──
    const isRefused = data.privacyLevel === 'private' && data.isRefused;
    if (isRefused) {
        const refusedText = data.privacyVariant === 'surname_only'
            ? maskName(data.displayName, 'private', { privacyVariant: 'surname_only' })
            : data.privacyVariant === 'anonymous'
                ? maskName(data.displayName, 'private', { privacyVariant: 'anonymous', relationLabel: data.relationLabel })
                : data.displayName;
        return (
            <RefusedPersonBox
                displayText={refusedText}
                privacyVariant={data.privacyVariant || 'anonymous'}
                gender={data.gender}
                style={externalStyle}
            />
        );
    }

    // 관계자 수 (부모+배우자+자녀)
    const relCount = (rels?.parents?.length || 0)
        + (rels?.spouses?.length || 0)
        + (rels?.children?.length || 0);

    // Privacy masking
    const isPrivate = data.privacyLevel === 'private';
    const maskedName = isPrivate
        ? maskName(data.displayName, 'private', { relationLabel: data.relationLabel, privacyVariant: data.privacyVariant })
        : data.displayName;
    const maskedData = isPrivate
        ? { ...data, displayName: maskedName, avatar: '', initials: maskInitials(data.initials, 'private') }
        : data;

    const hasPhoto = !!(maskedData.avatar && !photoFailed);

    // Click-Outside-Close: 터치 메뉴 열린 상태에서 외부 터치 시 닫기
    useEffect(() => {
        if (!touchLocked) return;
        const handleOutside = (e) => {
            if (cardRef.current && !cardRef.current.contains(e.target)) {
                setTouchLocked(false);
                setHovered(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside, true);
        return () => document.removeEventListener('pointerdown', handleOutside, true);
    }, [touchLocked]);

    const handleClick = () => {
        if (onClick) onClick(node.id);
    };

    // Touch Toggle: 첫 터치 → 메뉴 열기, 메뉴 열린 상태 터치 → 편집 모달
    const handleTouchEnd = useCallback((e) => {
        // 터치 디바이스에서만 동작 (mouse 이벤트 무시)
        if (!e.nativeEvent || e.nativeEvent.pointerType === 'mouse') return;

        e.preventDefault();
        e.stopPropagation();

        if (!touchLocked) {
            // 첫 터치: 메뉴 열기 + haptic
            setTouchLocked(true);
            setHovered(true);
            if (navigator.vibrate) navigator.vibrate(10);
        } else {
            // 메뉴 열린 상태에서 카드 본체 터치: 상세보기 모달
            setTouchLocked(false);
            setHovered(false);
            if (onAction) onAction(node.id, 'edit');
        }
    }, [touchLocked, node.id, onAction]);

    const handleContextMenu = (e) => {
        if (onContextMenu) {
            e.preventDefault();
            onContextMenu(node.id, e);
        }
    };

    const cardStyle = getCardStyle(node, isSelected, isMainPerson, hasPhoto);

    // 사망자 필터
    const deceasedFilter = isDeceased
        ? { filter: 'grayscale(40%) brightness(0.9)', opacity: cardStyle.opacity * 0.8 }
        : {};

    // 선택/주인공 테두리 강조
    const stateOverride = {};
    if (isMainPerson) {
        stateOverride.border = `2.5px solid #3D2008`;
        stateOverride.boxShadow = cardStyle.boxShadow + ', inset 0 0 0 1px rgba(196,168,79,0.4)';
    } else if (isSelected) {
        stateOverride.border = `2px solid ${FRAME_COLOR}`;
    }

    const blurPx = Z_BLUR[node.z] ?? 0;

    const handleAction = (actionKey) => {
        if (onAction) onAction(node.id, actionKey);
    };

    return (
        <div
            ref={cardRef}
            style={{
                ...externalStyle,
                position: externalStyle?.position || 'relative',
                paddingTop: TAB_H,
                transformStyle: 'preserve-3d',
                touchAction: 'manipulation',
            }}
            data-person-id={node.id}
            data-z={node.z}
            data-testid="folder-card"
            onMouseEnter={() => { if (!touchLocked) setHovered(true); }}
            onMouseLeave={() => { if (!touchLocked) setHovered(false); }}
            onPointerUp={handleTouchEnd}
        >
            {/* 폴더 쌓임 효과: 관계자 2명+ → 그림자 2장 */}
            {relCount >= 2 && (
                <div
                    data-testid="stack-shadow-2"
                    style={{
                        position: 'absolute',
                        top: TAB_H - 6,
                        left: 6,
                        width: CARD_SIZE,
                        height: CARD_SIZE,
                        border: `1.5px solid ${FRAME_COLOR}`,
                        borderRadius: '3px',
                        opacity: 0.4,
                        zIndex: -2,
                        pointerEvents: 'none',
                        background: 'rgba(250,250,242,0.3)',
                    }}
                />
            )}
            {/* 폴더 쌓임 효과: 관계자 1명+ → 그림자 1장 */}
            {relCount >= 1 && (
                <div
                    data-testid="stack-shadow-1"
                    style={{
                        position: 'absolute',
                        top: TAB_H - 3,
                        left: 3,
                        width: CARD_SIZE,
                        height: CARD_SIZE,
                        border: `1.5px solid ${FRAME_COLOR}`,
                        borderRadius: '3px',
                        opacity: 0.6,
                        zIndex: -1,
                        pointerEvents: 'none',
                        background: 'rgba(250,250,242,0.3)',
                    }}
                />
            )}
            <FolderTab gender={maskedData.gender} isDeceased={isDeceased} />
            <div
                style={{ ...cardStyle, ...deceasedFilter, ...stateOverride }}
                onClick={(e) => { if (!touchLocked) handleClick(); }}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                aria-label={maskedName}
                onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
            >
                {/* 인셋 프레임 */}
                <InsetFrame />

                {/* 사망자 배지 */}
                {isDeceased && <DeceasedBadge />}

                {/* 카드 본체: Photo Front + Canvas Front fallback */}
                {hasPhoto && (
                    <PhotoFront
                        data={maskedData}
                        isDeceased={isDeceased}
                    />
                )}
                {/* Canvas Front: 사진 없거나 로드 실패 시 배경으로 표시 */}
                {!hasPhoto && (
                    <CanvasFront data={maskedData} isDeceased={isDeceased} />
                )}

                {/* Hover/Touch 액션 간판 메뉴 */}
                <CubeSignboard
                    visible={hovered || touchLocked}
                    isMobile={isMobile}
                    onAction={handleAction}
                    width={CARD_SIZE}
                    height={CARD_SIZE}
                />

                {/* Z축 안개 오버레이 */}
                {blurPx > 0 && (
                    <div
                        data-testid="fog-overlay"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '3px',
                            backdropFilter: `blur(${blurPx}px)`,
                            WebkitBackdropFilter: `blur(${blurPx}px)`,
                            background: `rgba(250,250,242,${node.z === 2 ? 0.5 : 0.2})`,
                            pointerEvents: 'none',
                            zIndex: 4,
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default React.memo(FolderCard, (prev, next) => {
    const prevRels = prev.node.rels || {};
    const nextRels = next.node.rels || {};
    const prevRelCount = (prevRels.parents?.length || 0) + (prevRels.spouses?.length || 0) + (prevRels.children?.length || 0);
    const nextRelCount = (nextRels.parents?.length || 0) + (nextRels.spouses?.length || 0) + (nextRels.children?.length || 0);
    return (
        prev.node.id === next.node.id &&
        prev.node.z === next.node.z &&
        prev.node.x === next.node.x &&
        prev.node.y === next.node.y &&
        prev.isSelected === next.isSelected &&
        prev.isMainPerson === next.isMainPerson &&
        prev.node.data?.avatar === next.node.data?.avatar &&
        prevRelCount === nextRelCount
    );
});
