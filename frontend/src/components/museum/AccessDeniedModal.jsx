/**
 * AccessDeniedModal.jsx — 접근 거부 모달
 *
 * 비공개 인물의 전시관 접근 시 표시:
 * - denied: 접근 요청 버튼 표시
 * - pending: 승인 대기 중 안내
 * - refused: 완전 비공개 안내 (요청 불가)
 * - auth_required: 로그인 필요 안내
 */
import React, { useState } from 'react';

const FRAME_COLOR = '#C4A84F';

export default function AccessDeniedModal({
    visible = false,
    accessLevel = 'denied',
    personName = '',
    onRequestAccess,
    onClose,
    requesting = false,
}) {
    const [message, setMessage] = useState('');

    if (!visible) return null;

    const getContent = () => {
        switch (accessLevel) {
            case 'refused':
                return {
                    icon: '🔒',
                    title: '비공개 전시관',
                    desc: '이 인물은 박물관 노출을 거절했습니다.\n접근 요청이 불가능합니다.',
                    showRequest: false,
                };
            case 'auth_required':
                return {
                    icon: '🔑',
                    title: '로그인 필요',
                    desc: '이 전시관을 보려면 로그인이 필요합니다.',
                    showRequest: false,
                };
            case 'pending':
                return {
                    icon: '⏳',
                    title: '승인 대기 중',
                    desc: `${personName || '해당 인물'}의 전시관 접근 요청이\n승인 대기 중입니다.`,
                    showRequest: false,
                };
            default: // denied / family / private
                return {
                    icon: '🏛️',
                    title: '접근 제한 전시관',
                    desc: `${personName || '해당 인물'}의 전시관은\n가족/본인에게만 공개됩니다.`,
                    showRequest: true,
                };
        }
    };

    const content = getContent();

    const handleRequest = () => {
        if (onRequestAccess) onRequestAccess(message);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(30,26,20,0.7)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#FAFAF2',
                    borderRadius: '16px',
                    border: `2px solid ${FRAME_COLOR}`,
                    padding: '32px 24px',
                    maxWidth: 360,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(40,30,10,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 아이콘 */}
                <div style={{ fontSize: '40px', marginBottom: 12 }}>
                    {content.icon}
                </div>

                {/* 제목 */}
                <h3
                    style={{
                        fontFamily: 'Georgia, "Noto Serif KR", serif',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#3D2008',
                        marginBottom: 8,
                    }}
                >
                    {content.title}
                </h3>

                {/* 설명 */}
                <p
                    style={{
                        fontSize: '14px',
                        color: '#7A6E5E',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        marginBottom: content.showRequest ? 16 : 24,
                    }}
                >
                    {content.desc}
                </p>

                {/* 접근 요청 폼 */}
                {content.showRequest && (
                    <div style={{ marginBottom: 16 }}>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="요청 메시지 (선택사항)"
                            maxLength={200}
                            style={{
                                width: '100%',
                                height: 60,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e8e0d0',
                                background: '#fff',
                                fontSize: '13px',
                                resize: 'none',
                                boxSizing: 'border-box',
                                fontFamily: 'inherit',
                            }}
                        />
                        <button
                            onClick={handleRequest}
                            disabled={requesting}
                            style={{
                                marginTop: 8,
                                width: '100%',
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                background: requesting
                                    ? '#ccc'
                                    : `linear-gradient(135deg, ${FRAME_COLOR}, #A88E3A)`,
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: requesting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {requesting ? '요청 중...' : '접근 요청하기'}
                        </button>
                    </div>
                )}

                {/* 닫기 */}
                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 24px',
                        borderRadius: '8px',
                        border: '1px solid #d4d4d4',
                        background: '#f5f5f5',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#666',
                        cursor: 'pointer',
                    }}
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
