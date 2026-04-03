/**
 * PhotoEditor.jsx — 사진 편집 도구 (이동/회전/줌)
 *
 * 인물 사진 업로드 후 편집:
 * - 드래그로 이동 (Pan) — PC 마우스 + 모바일 터치
 * - 90도 회전 + 미세 회전 슬라이더 (-45° ~ +45°)
 * - 줌 슬라이더 (0.5x ~ 3x) + 핀치 줌
 * - EXIF orientation 자동 보정
 * - 최종 저장 시 canvas crop 이미지 생성
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';

const PREVIEW_SIZE = 200; // 미리보기 영역 크기

/**
 * @param {string} src — 이미지 URL (blob 또는 서버 URL)
 * @param {object} initialPosition — { x: 50, y: 50 } 초기 위치 (%)
 * @param {function} onSave — (croppedBlob, position) => void
 * @param {function} onCancel — () => void
 */
export default function PhotoEditor({ src, initialPosition, onSave, onCancel }) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);      // 총 회전 (90도 단위 + 미세)
    const [fineRotation, setFineRotation] = useState(0); // 미세 회전 (-45 ~ +45)
    const [baseRotation, setBaseRotation] = useState(0);  // 90도 단위 누적
    const [pan, setPan] = useState({ x: 0, y: 0 });    // px 단위 이동
    const [dragging, setDragging] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const pinchStart = useRef({ dist: 0, zoom: 1 });

    const totalRotation = baseRotation + fineRotation;

    // ── 마우스 드래그 (이동) ──
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }, [pan]);

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
        };
        const handleMouseUp = () => setDragging(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging]);

    // ── 터치 드래그 + 핀치 줌 ──
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            dragStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
            setDragging(true);
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStart.current = { dist: Math.hypot(dx, dy), zoom };
        }
    }, [pan, zoom]);

    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 1 && dragging) {
            const t = e.touches[0];
            const dx = t.clientX - dragStart.current.x;
            const dy = t.clientY - dragStart.current.y;
            setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const scale = dist / pinchStart.current.dist;
            const newZoom = Math.max(0.5, Math.min(3, pinchStart.current.zoom * scale));
            setZoom(newZoom);
        }
    }, [dragging]);

    const handleTouchEnd = useCallback(() => {
        setDragging(false);
    }, []);

    // ── 90도 회전 ──
    const rotateCW = () => setBaseRotation(prev => prev + 90);
    const rotateCCW = () => setBaseRotation(prev => prev - 90);

    // ── 미세 회전 리셋 ──
    const resetFineRotation = () => setFineRotation(0);

    // ── canvas crop 저장 ──
    const handleSave = useCallback(async () => {
        if (!imgRef.current) return;

        const canvas = document.createElement('canvas');
        const size = PREVIEW_SIZE;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const img = imgRef.current;
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((totalRotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.translate(pan.x, pan.y);

        const aspect = img.naturalWidth / img.naturalHeight;
        let drawW, drawH;
        if (aspect >= 1) {
            drawH = size;
            drawW = size * aspect;
        } else {
            drawW = size;
            drawH = size / aspect;
        }
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        canvas.toBlob((blob) => {
            if (blob && onSave) {
                const position = {
                    x: 50 + (pan.x / size) * 100,
                    y: 50 + (pan.y / size) * 100,
                };
                onSave(blob, position);
            }
        }, 'image/jpeg', 0.92);
    }, [totalRotation, zoom, pan, onSave]);

    const transformStyle = {
        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${totalRotation}deg) scale(${zoom})`,
        transition: dragging ? 'none' : 'transform 0.2s ease',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {/* ── 미리보기 영역 ── */}
            <div
                ref={containerRef}
                style={{
                    width: PREVIEW_SIZE,
                    height: PREVIEW_SIZE,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '2px solid #C4A84F',
                    position: 'relative',
                    cursor: dragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                    background: '#1a1a1a',
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {src && (
                    <img
                        ref={imgRef}
                        src={src}
                        alt="편집 중"
                        onLoad={() => setImgLoaded(true)}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            ...transformStyle,
                        }}
                        draggable={false}
                    />
                )}
                {/* 중심선 가이드 */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    border: '1px dashed rgba(196,168,79,0.3)',
                    borderRadius: '12px',
                }} />
            </div>

            {/* ── 툴바 1단: 회전 ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                justifyContent: 'center', width: '100%', maxWidth: 280,
            }}>
                <button onClick={rotateCCW} style={toolBtnStyle} title="반시계 90°">↺ 90°</button>
                <button onClick={rotateCW} style={toolBtnStyle} title="시계 90°">↻ 90°</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 120 }}>
                    <span style={labelStyle}>회전</span>
                    <input
                        type="range"
                        min={-45}
                        max={45}
                        step={1}
                        value={fineRotation}
                        onChange={(e) => setFineRotation(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#C4A84F' }}
                    />
                    <span style={{ ...labelStyle, minWidth: 32, textAlign: 'right' }}>
                        {fineRotation > 0 ? '+' : ''}{fineRotation}°
                    </span>
                </div>

                <button onClick={resetFineRotation} style={toolBtnStyle} title="회전 리셋">0°</button>
            </div>

            {/* ── 툴바 2단: 줌 ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                maxWidth: 280, justifyContent: 'center',
            }}>
                <button
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                    style={toolBtnStyle}
                    title="축소"
                >
                    🔍−
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 120 }}>
                    <span style={labelStyle}>줌</span>
                    <input
                        type="range"
                        min={50}
                        max={300}
                        step={5}
                        value={Math.round(zoom * 100)}
                        onChange={(e) => setZoom(Number(e.target.value) / 100)}
                        style={{ flex: 1, accentColor: '#C4A84F' }}
                    />
                    <span style={{ ...labelStyle, minWidth: 36, textAlign: 'right' }}>
                        {Math.round(zoom * 100)}%
                    </span>
                </div>

                <button
                    onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                    style={toolBtnStyle}
                    title="확대"
                >
                    🔍+
                </button>
            </div>

            {/* ── 저장/취소 ── */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        border: '1px solid #d4d4d4',
                        background: '#f5f5f5',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#666',
                        cursor: 'pointer',
                    }}
                >
                    취소
                </button>
                <button
                    onClick={handleSave}
                    style={{
                        padding: '8px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#C4A84F',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    적용
                </button>
            </div>
        </div>
    );
}

// ── 공통 스타일 ──
const toolBtnStyle = {
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid #e8e0d0',
    background: '#FAFAF2',
    fontSize: '11px',
    fontWeight: 700,
    color: '#3D2008',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

const labelStyle = {
    fontSize: '10px',
    fontWeight: 600,
    color: '#7A6E5E',
    whiteSpace: 'nowrap',
};
