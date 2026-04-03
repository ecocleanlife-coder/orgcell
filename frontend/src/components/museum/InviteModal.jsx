/**
 * InviteModal.jsx — 가족 초대 모달
 *
 * 이메일 또는 초대 링크로 가족 구성원 초대
 */
import React, { useState } from 'react';
import ModalBase from './ModalBase';

const FRAME_COLOR = '#C4A84F';

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: '#1E1A14',
    border: '1px solid rgba(196,168,79,0.3)',
    borderRadius: '4px',
    color: '#F5DEB3',
    fontSize: '14px',
    boxSizing: 'border-box',
};

export default function InviteModal({ person, onSendInvite, onClose }) {
    const [email, setEmail] = useState('');
    const [copied, setCopied] = useState(false);

    const inviteLink = `https://orgcell.com/invite/${person?.id || 'unknown'}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        if (onSendInvite) onSendInvite({ personId: person?.id, email });
        setEmail('');
    };

    return (
        <ModalBase title={`${person?.name || '인물'} — 가족 초대`} onClose={onClose}>
            <div style={{ marginBottom: '24px' }}>
                <p style={{ color: '#D4C5A0', fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>
                    <strong style={{ color: FRAME_COLOR }}>{person?.name}</strong>님의
                    가족을 초대하여 함께 가계도를 완성하세요.
                </p>

                {/* 초대 링크 */}
                <label style={{ display: 'block', color: FRAME_COLOR, fontSize: '12px', marginBottom: '6px' }}>
                    초대 링크
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={inviteLink}
                        readOnly
                    />
                    <button
                        onClick={handleCopy}
                        style={{
                            padding: '8px 16px',
                            background: copied ? '#4a7c59' : 'rgba(196,168,79,0.15)',
                            border: `1px solid ${copied ? '#4a7c59' : FRAME_COLOR}`,
                            borderRadius: '4px',
                            color: copied ? '#fff' : FRAME_COLOR,
                            cursor: 'pointer',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                        }}
                    >
                        {copied ? '복사됨' : '복사'}
                    </button>
                </div>
            </div>

            {/* 이메일 초대 */}
            <form onSubmit={handleSend}>
                <label style={{ display: 'block', color: FRAME_COLOR, fontSize: '12px', marginBottom: '6px' }}>
                    이메일로 초대
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="email"
                        style={{ ...inputStyle, flex: 1 }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="family@example.com"
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '8px 16px',
                            background: FRAME_COLOR,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#1E1A14',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        보내기
                    </button>
                </div>
            </form>
        </ModalBase>
    );
}
