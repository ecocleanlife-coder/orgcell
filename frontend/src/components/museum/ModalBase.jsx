/**
 * ModalBase.jsx — 공통 모달 래퍼 (박물관 테마)
 *
 * - 반투명 backdrop + click-outside-close
 * - 금색 테두리, 어두운 배경
 * - title, onClose, children, width props
 */
import React, { useEffect } from 'react';

const FRAME_COLOR = '#C4A84F';

export default function ModalBase({ title, onClose, children, width = 480 }) {
    useEffect(() => {
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            onClick={handleBackdrop}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            data-testid="modal-backdrop"
        >
            <div
                style={{
                    width,
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    background: '#2A2418',
                    border: `2px solid ${FRAME_COLOR}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                data-testid="modal-container"
            >
                {/* 헤더 */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 20px',
                        borderBottom: `1px solid rgba(196,168,79,0.3)`,
                    }}
                >
                    <h3 style={{
                        margin: 0,
                        color: FRAME_COLOR,
                        fontSize: '16px',
                        fontFamily: 'Georgia, "Noto Serif KR", serif',
                    }}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#7A6E5E',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '0 4px',
                            lineHeight: 1,
                        }}
                        aria-label="닫기"
                    >
                        ×
                    </button>
                </div>

                {/* 본문 */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
