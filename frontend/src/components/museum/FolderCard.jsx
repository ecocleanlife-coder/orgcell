/**
 * FolderCard.jsx — 3D 박물관 건물 블록
 *
 * CSS preserve-3d 정육면체로 각 인물을 표현
 * - 정면: 인물 사진 + 이름 (Photo/Canvas Front)
 * - 좌측면: 아치형 문 — 일반전시관
 * - 우측면: 나무 대문 — 가족전시관
 * - 상단면: 어두운 그라디언트 (입체감)
 * - Hover/Touch 액션 버튼 유지
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { maskName, maskInitials } from '../../utils/privacyMask';
import RefusedPersonBox from './RefusedPersonBox';
import Cube3D, { FRONT_W, FRONT_H } from './Cube3D';
import { ArchDoor, WoodenDoor } from './CubeDoorSVG';
import CubeSignboard from './CubeSignboard';
import useMediaQuery from '../../hooks/useMediaQuery';

const CARD_W = FRONT_W;    // 180px
const CARD_H = FRONT_H;    // 180px
const TAB_W = 40;
const TAB_H = 10;
const Z_DEPTH_PX = 200;
const FRAME_COLOR = '#C4A84F';
const INSET_COLOR = 'rgba(196,168,79,0.3)';

// ── Z축 안개 blur ──
const Z_BLUR = { 0: 0, 1: 3, 2: 6 };

// ── 린넨 노이즈 배경 ──
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
                boxShadow: '2px -1px 3px rgba(40,30,10,0.15)',
                zIndex: 5,
            }}
        />
    );
}

// ── Photo Front: 사진 전면 + 하단 그라디언트 ──
function PhotoFront({ data, isDeceased }) {
    const [imgError, setImgError] = useState(false);

    if (imgError) return null;

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
            {/* 하단 다크 그라디언트 */}
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
                        fontSize: '13px',
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
                padding: '16px 10px',
                boxSizing: 'border-box',
                position: 'relative',
                background: `${LINEN_BG}, #FAFAF2`,
            }}
        >
            <div
                style={{
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    fontSize: '16px',
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

// (HoverActions 제거 → CubeSignboard로 대체)

// ── 정면 콘텐츠 (Cube3D.front에 주입) ──
function FrontContent({
    maskedData,
    hasPhoto,
    photoFailed,
    isDeceased,
    isSelected,
    isMainPerson,
    node,
    hovered,
    touchLocked,
    isMobile,
    handleAction,
}) {
    const blurPx = Z_BLUR[node.z] ?? 0;

    return (
        <div
            style={{
                width: CARD_W,
                height: CARD_H,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '3px',
                border: `1.5px solid ${FRAME_COLOR}`,
                boxSizing: 'border-box',
                background: hasPhoto ? '#1a1a1a' : `${LINEN_BG}, #FAFAF2`,
                filter: isDeceased ? 'grayscale(40%) brightness(0.9)' : 'none',
                ...(isMainPerson ? {
                    border: '2.5px solid #3D2008',
                    boxShadow: 'inset 0 0 0 1px rgba(196,168,79,0.4)',
                } : isSelected ? {
                    border: `2px solid ${FRAME_COLOR}`,
                } : {}),
            }}
        >
            <InsetFrame />
            {isDeceased && <DeceasedBadge />}

            {hasPhoto ? (
                <PhotoFront data={maskedData} isDeceased={isDeceased} />
            ) : (
                <CanvasFront data={maskedData} isDeceased={isDeceased} />
            )}

            <CubeSignboard
                visible={hovered || touchLocked}
                isMobile={isMobile}
                onAction={handleAction}
                width={CARD_W}
                height={CARD_H}
            />

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
    const [touchLocked, setTouchLocked] = useState(false);
    const cardRef = useRef(null);
    const isMobile = useMediaQuery('(pointer: coarse)');

    // ── 거절자 빈 레고 박스 ──
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

    // Privacy masking
    const isPrivate = data.privacyLevel === 'private';
    const maskedName = isPrivate
        ? maskName(data.displayName, 'private', { relationLabel: data.relationLabel, privacyVariant: data.privacyVariant })
        : data.displayName;
    const maskedData = isPrivate
        ? { ...data, displayName: maskedName, avatar: '', initials: maskInitials(data.initials, 'private') }
        : data;

    const hasPhoto = !!(maskedData.avatar && !photoFailed);

    // Click-Outside-Close
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

    const handleTouchEnd = useCallback((e) => {
        if (!e.nativeEvent || e.nativeEvent.pointerType === 'mouse') return;
        e.preventDefault();
        e.stopPropagation();

        if (!touchLocked) {
            setTouchLocked(true);
            setHovered(true);
            if (navigator.vibrate) navigator.vibrate(10);
        } else {
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

    const handleAction = (actionKey) => {
        if (onAction) onAction(node.id, actionKey);
    };

    const cubeOpacity = node.zOpacity ?? 1;

    return (
        <div
            ref={cardRef}
            style={{
                ...externalStyle,
                position: externalStyle?.position || 'relative',
                paddingTop: TAB_H,
                touchAction: 'manipulation',
                transformStyle: 'preserve-3d',
            }}
            data-person-id={node.id}
            data-z={node.z}
            data-testid="folder-card"
            onMouseEnter={() => { if (!touchLocked) setHovered(true); }}
            onMouseLeave={() => { if (!touchLocked) setHovered(false); }}
            onPointerUp={handleTouchEnd}
            onClick={(e) => { if (!touchLocked) handleClick(); }}
            onContextMenu={handleContextMenu}
        >
            <FolderTab gender={maskedData.gender} isDeceased={isDeceased} />

            <Cube3D
                opacity={cubeOpacity}
                front={
                    <FrontContent
                        maskedData={maskedData}
                        hasPhoto={hasPhoto}
                        photoFailed={photoFailed}
                        isDeceased={isDeceased}
                        isSelected={isSelected}
                        isMainPerson={isMainPerson}
                        node={node}
                        hovered={hovered}
                        touchLocked={touchLocked}
                        isMobile={isMobile}
                        handleAction={handleAction}
                    />
                }
                leftFace={<ArchDoor />}
                rightFace={<WoodenDoor />}
            />
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
