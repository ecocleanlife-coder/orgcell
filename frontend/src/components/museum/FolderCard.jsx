/**
 * FolderCard.jsx — "기록의 벽돌" (Record Brick)
 *
 * ORGCELL_CODING_RULES.md 레고 블록 표준 + 박물관 컨셉
 * - 180×180px 정사각형 + 40×10 폴더 탭
 * - Photo Front: 사진 전면 + 하단 그라디언트 오버레이
 * - Canvas Front: 아이보리 린넨 + Georgia 서체 + 성별 실루엣
 * - 1.5px 금색 액자 프레임 + 인셋 라인
 * - 20px 시각적 3D 두께 (box-shadow 블록)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { maskName, maskInitials } from '../../utils/privacyMask';
import RefusedPersonBox from './RefusedPersonBox';
import useMediaQuery from '../../hooks/useMediaQuery';

const CARD_SIZE = 220;
const TAB_W = 40;
const TAB_H = 10;
const FRAME_COLOR = '#C4A84F'; // 금색 액자
const INSET_COLOR = 'rgba(196,168,79,0.3)'; // 인셋 라인

// ── 성별 실루엣 색상 ──
const SILHOUETTE_COLOR = { M: '#8B7355', F: '#C4956A' };
const GENDER_ICON = { M: '♂', F: '♀' };

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

// ── 카드 기본 스타일 (ORGCELL_CODING_RULES.md §5) ──
function getCardStyle(node, isSelected, isMainPerson, hasPhoto) {
    const base = {
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: '3px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'box-shadow 0.3s',
    };

    // 관장 부부 — 강한 입체감
    if (isMainPerson) {
        return {
            ...base,
            border: '2px solid #8B7355',
            borderRight: '4px solid #9a7a50',
            borderBottom: '4px solid #7a6040',
            boxShadow: '3px 3px 0 #c4a87a, 6px 6px 0 #b09060',
            background: hasPhoto ? undefined : `${LINEN_BG}, #FDF8F0`,
        };
    }

    // 일반 블록 — 약한 입체감
    return {
        ...base,
        border: '1px solid #C4A882',
        borderRight: '2px solid #b09060',
        borderBottom: '2px solid #9a7a50',
        boxShadow: '2px 2px 0 #c4a87a',
        background: hasPhoto ? undefined : `${LINEN_BG}, #FAFAF5`,
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
                    imageOrientation: 'from-image',
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
            {/* 이름, ID, 대표정보 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    right: '8px',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    <span>{data.displayName}</span>
                    {data.ocId && (
                        <span style={{ fontSize: '9px', fontWeight: 400, opacity: 0.7 }}>
                            {data.ocId}
                        </span>
                    )}
                </div>
                
                <div style={{
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.9)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                    lineHeight: 1.2
                }}>
                    {(data.display_info1 || data.displayInfo1) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info1 || data.displayInfo1}</div>}
                    {(data.display_info2 || data.displayInfo2) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info2 || data.displayInfo2}</div>}
                    {(data.display_info3 || data.displayInfo3) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info3 || data.displayInfo3}</div>}
                </div>
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

            {/* oc_id */}
            {data.ocId && (
                <div
                    style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        color: isDeceased ? '#bbb' : '#A09080',
                        marginTop: '2px',
                        zIndex: 1,
                    }}
                >
                    {data.ocId}
                </div>
            )}

            {/* 대표정보 */}
            <div
                style={{
                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                    fontSize: '11px',
                    color: isDeceased ? '#aaa' : '#7A6E5E',
                    marginTop: '6px',
                    zIndex: 1,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    width: '100%',
                }}
            >
                {(data.display_info1 || data.displayInfo1) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info1 || data.displayInfo1}</div>}
                {(data.display_info2 || data.displayInfo2) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info2 || data.displayInfo2}</div>}
                {(data.display_info3 || data.displayInfo3) && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.display_info3 || data.displayInfo3}</div>}
            </div>

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

// ── 메인 컴포넌트 ──
function FolderCard({
    node,
    isSelected = false,
    isMainPerson = false,
    onClick,
    onDoubleClick,
    onContextMenu,
    style: externalStyle,
}) {
    const { data, rels } = node;
    const isDeceased = data.isDeceased;
    const [photoFailed, setPhotoFailed] = useState(false);
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

    const handleClick = () => {
        if (onClick) onClick(node.id);
    };

    const handleDoubleClick = () => {
        if (onDoubleClick) onDoubleClick(node.id);
    };

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

    // 선택 테두리 강조 (관장은 getCardStyle에서 처리됨)
    const stateOverride = {};
    if (isSelected && !isMainPerson) {
        stateOverride.border = `2px solid ${FRAME_COLOR}`;
    }

    return (
        <div
            ref={cardRef}
            title={`${maskedName} 박물관`}
            style={{
                ...externalStyle,
                position: externalStyle?.position || 'relative',
                paddingTop: TAB_H,
                transformStyle: 'preserve-3d',
                touchAction: 'manipulation',
            }}
            data-person-id={node.id}
            data-testid="folder-card"
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
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
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

                {/* FamilySearch 연동 배지 */}
                {data.fsPersonId && (
                    <div
                        title="FamilySearch 연동됨"
                        style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(74,141,183,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            zIndex: 3,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            cursor: 'default',
                        }}
                    >🌐</div>
                )}

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
        prev.node.x === next.node.x &&
        prev.node.y === next.node.y &&
        prev.isSelected === next.isSelected &&
        prev.isMainPerson === next.isMainPerson &&
        prev.node.data?.avatar === next.node.data?.avatar &&
        prevRelCount === nextRelCount
    );
});
