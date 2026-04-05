/**
 * InvitationModal.jsx — 가족 초대 메시지 모달 (개선판)
 *
 * - 기본 메시지 + 관장 편집 가능
 * - 이메일 / SMS / 링크 복사 / 연락처 불러오기 / 카카오톡
 */
import React, { useState, useCallback } from 'react';
import { X, Mail, Copy, Check, Phone, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const DEFAULT_MESSAGE = `제 박물관에 당신을 초대합니다.
당신의 사진과 기록들을 확인해 주시고
우리 가족의 사진이나 자료가 있으시면
공유해 주세요.
후손에게 전할 본인과 가족을 위한
가족유산박물관을 만드세요.`;

export default function InvitationModal({
    personName = '',
    personId,
    siteId,
    curatorName = '',
    museumName = '',
    onClose,
    inline = false,
}) {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [inviteCode, setInviteCode] = useState(null);
    const [customMessage, setCustomMessage] = useState(DEFAULT_MESSAGE);
    const [editingMessage, setEditingMessage] = useState(false);

    // 초대 링크
    const inviteLink = inviteCode
        ? `${window.location.origin}/invite?code=${inviteCode}`
        : `${window.location.origin}/invite?person=${personId}&site=${siteId}`;

    // 전체 초대 메시지 (링크 포함)
    const fullMessage = `${customMessage}\n\n${inviteLink}`;

    // 초대 코드 생성 (최초 1회)
    const ensureInviteCode = useCallback(async () => {
        if (inviteCode) return inviteCode;
        const res = await axios.post('/api/invite/create', {
            site_id: siteId,
            email: email.trim() || undefined,
            person_id: personId,
        });
        const code = res.data?.data?.code;
        if (!code) throw new Error('초대 코드 생성 실패');
        setInviteCode(code);
        return code;
    }, [inviteCode, siteId, email, personId]);

    // ── 이메일 발송 ──────────────────────────────────────────────────────────
    const handleSendEmail = useCallback(async () => {
        if (!email.trim()) { toast.error('이메일 주소를 입력해주세요'); return; }
        setSending(true);
        try {
            const code = await ensureInviteCode();
            await axios.post('/api/invite/send-email', { code, email: email.trim() });
            toast.success(`${personName}님에게 초대 메시지를 보냈습니다`);
            if (!inline) onClose();
        } catch (err) {
            const status = err.response?.status;
            toast.error(status === 429 ? '잠시 후 다시 시도해주세요 (발송 제한)' : '초대 발송에 실패했습니다');
        } finally {
            setSending(false);
        }
    }, [email, personName, ensureInviteCode, inline, onClose]);

    // ── SMS 발송 (sms: URI scheme) ───────────────────────────────────────────
    const handleSendSMS = useCallback(() => {
        const body = encodeURIComponent(fullMessage);
        const to = phone.trim() ? phone.trim() : '';
        window.open(`sms:${to}?body=${body}`, '_self');
    }, [phone, fullMessage]);

    // ── 링크 복사 ────────────────────────────────────────────────────────────
    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = inviteLink;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        toast.success('초대 링크가 복사되었습니다');
        setTimeout(() => setCopied(false), 2000);
    }, [inviteLink]);

    // ── 연락처 불러오기 (Contact Picker API) ─────────────────────────────────
    const handleContactPicker = useCallback(async () => {
        if (!navigator.contacts || !navigator.contacts.select) {
            toast.error('이 브라우저에서는 연락처 불러오기를 지원하지 않습니다');
            return;
        }
        try {
            const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
            if (contacts?.[0]) {
                const c = contacts[0];
                if (c.email?.[0]) setEmail(c.email[0]);
                if (c.tel?.[0]) setPhone(c.tel[0]);
                toast.success(`${c.name?.[0] || '연락처'}를 불러왔습니다`);
            }
        } catch {
            /* 사용자가 취소 */
        }
    }, []);

    // ── 카카오톡 공유 ────────────────────────────────────────────────────────
    const handleKakaoShare = useCallback(() => {
        // Kakao SDK가 초기화된 경우
        if (window.Kakao?.isInitialized?.() && window.Kakao?.Share) {
            window.Kakao.Share.sendDefault({
                objectType: 'text',
                text: fullMessage,
                link: { mobileWebUrl: inviteLink, webUrl: inviteLink },
            });
        } else {
            // fallback: 카카오톡 앱 링크 스킴
            const encoded = encodeURIComponent(inviteLink);
            window.open(`kakaolink://send?msg=${encodeURIComponent(customMessage)}&url=${encoded}`, '_self');
            setTimeout(() => {
                // 앱이 없으면 링크 복사로 fallback
                handleCopyLink();
                toast('링크가 복사되었습니다. 카카오톡에 붙여넣기 하세요.', { icon: '💛' });
            }, 1500);
        }
    }, [fullMessage, inviteLink, customMessage, handleCopyLink]);

    const containerClass = inline ? "flex flex-col h-full bg-white rounded-2xl w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4";
    const innerClass = inline ? "bg-white flex flex-col h-full w-full" : "bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden";

    const btnBase = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
        border: 'none', transition: 'opacity 0.2s',
    };

    return (
        <div
            className={containerClass}
            style={inline ? { border: '1px solid #e8e0d0' } : { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={!inline ? onClose : undefined}
        >
            <div
                className={innerClass}
                onClick={!inline ? (e) => e.stopPropagation() : undefined}
            >
                {/* 헤더 */}
                <div
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #2A1A08, #3D2008)' }}
                >
                    <div>
                        <h3 className="text-lg font-bold text-[#C4A84F]">
                            {personName ? `${personName}님을 초대합니다` : '가족 초대'}
                        </h3>
                        <p className="text-xs text-[#e8e0d0] mt-0.5">가족유산박물관에 함께하세요</p>
                    </div>
                    {!inline && (
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[#C4A84F] hover:bg-white/10 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="px-5 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: inline ? 'none' : 480 }}>
                    {/* 초대 메시지 (편집 가능) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">초대 메시지</label>
                            <button
                                onClick={() => setEditingMessage(!editingMessage)}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ color: '#C4A84F', border: '1px solid #C4A84F', background: editingMessage ? '#fdf8f0' : 'transparent' }}
                            >
                                {editingMessage ? '완료' : '편집'}
                            </button>
                        </div>
                        {editingMessage ? (
                            <textarea
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                                rows={6}
                                className="w-full p-3 rounded-lg text-[13px] text-gray-700 leading-relaxed resize-none outline-none"
                                style={{ background: '#FAFAF2', border: '1.5px solid #C4A84F' }}
                            />
                        ) : (
                            <div
                                className="p-3 rounded-lg text-[13px] text-gray-700 leading-relaxed max-h-36 overflow-y-auto"
                                style={{ background: '#FAFAF2', border: '1px solid #e8e0d0', whiteSpace: 'pre-line' }}
                            >
                                {customMessage}
                            </div>
                        )}
                    </div>

                    {/* 연락처 불러오기 */}
                    {'contacts' in navigator && (
                        <button
                            onClick={handleContactPicker}
                            style={{ ...btnBase, width: '100%', background: '#f0f4ff', color: '#5a5aa0', border: '1px solid #c0c8f0' }}
                        >
                            <Phone size={14} /> 폰 연락처 불러오기
                        </button>
                    )}

                    {/* 이메일 */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">이메일</label>
                        <div className="mt-1.5 flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                className="flex-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A84F]/30"
                                style={{ borderColor: '#e8e0d0' }}
                                onKeyDown={e => { if (e.key === 'Enter') handleSendEmail(); }}
                            />
                            <button
                                onClick={handleSendEmail}
                                disabled={sending}
                                style={{ ...btnBase, padding: '0 16px', background: '#C4A84F', color: '#fff', opacity: sending ? 0.6 : 1 }}
                            >
                                <Mail size={14} />
                                {sending ? '발송 중...' : '발송'}
                            </button>
                        </div>
                    </div>

                    {/* SMS */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SMS</label>
                        <div className="mt-1.5 flex gap-2">
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="010-0000-0000"
                                className="flex-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none"
                                style={{ borderColor: '#e8e0d0' }}
                            />
                            <button
                                onClick={handleSendSMS}
                                style={{ ...btnBase, padding: '0 16px', background: '#3a7a3a', color: '#fff' }}
                            >
                                <MessageSquare size={14} /> 문자
                            </button>
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">또는</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* 링크 복사 + 카카오 */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyLink}
                            style={{ ...btnBase, flex: 1, background: '#f8f6f0', color: '#3D2008', border: '1px solid #e8e0d0' }}
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            {copied ? '복사됨!' : '링크 복사'}
                        </button>
                        <button
                            onClick={handleKakaoShare}
                            style={{ ...btnBase, flex: 1, background: '#FEE500', color: '#3C1E1E', border: 'none' }}
                        >
                            💛 카카오톡
                        </button>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="px-5 py-3 text-center" style={{ background: '#FAFAF2', borderTop: '1px solid #e8e0d0' }}>
                    <p className="text-[11px] text-gray-400">
                        초대받은 분은 박물관 노출 여부를 직접 선택할 수 있습니다
                    </p>
                </div>
            </div>
        </div>
    );
}
