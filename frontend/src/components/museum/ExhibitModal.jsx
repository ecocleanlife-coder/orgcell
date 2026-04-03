/**
 * ExhibitModal.jsx — 인물 전시 모달
 *
 * 해당 인물 관련 전시(사진 갤러리) 목록
 * 새 전시 만들기, 기존 전시 보기
 */
import React from 'react';
import ModalBase from './ModalBase';

const FRAME_COLOR = '#C4A84F';

export default function ExhibitModal({ person, exhibits = [], onCreateExhibit, onViewExhibit, onClose }) {
    return (
        <ModalBase title={`${person?.name || '인물'} — 전시`} onClose={onClose} width={520}>
            {exhibits.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🖼</div>
                    <p style={{ color: '#7A6E5E', fontSize: '14px', marginBottom: '20px' }}>
                        아직 등록된 전시가 없습니다
                    </p>
                    <button
                        onClick={() => onCreateExhibit && onCreateExhibit(person)}
                        style={{
                            padding: '10px 24px',
                            background: FRAME_COLOR,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#1E1A14',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                        }}
                    >
                        새 전시 만들기
                    </button>
                </div>
            ) : (
                <div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '20px',
                    }}>
                        {exhibits.map((ex, i) => (
                            <div
                                key={ex.id || i}
                                onClick={() => onViewExhibit && onViewExhibit(ex)}
                                style={{
                                    padding: '16px',
                                    background: '#1E1A14',
                                    border: '1px solid rgba(196,168,79,0.2)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = FRAME_COLOR; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(196,168,79,0.2)'; }}
                            >
                                <div style={{ color: '#F5DEB3', fontSize: '14px', fontWeight: 600 }}>
                                    {ex.title || '제목 없음'}
                                </div>
                                <div style={{ color: '#7A6E5E', fontSize: '11px', marginTop: '4px' }}>
                                    사진 {ex.photoCount || 0}장
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => onCreateExhibit && onCreateExhibit(person)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'transparent',
                            border: `1px dashed rgba(196,168,79,0.4)`,
                            borderRadius: '4px',
                            color: FRAME_COLOR,
                            cursor: 'pointer',
                            fontSize: '13px',
                        }}
                    >
                        + 새 전시 만들기
                    </button>
                </div>
            )}
        </ModalBase>
    );
}
