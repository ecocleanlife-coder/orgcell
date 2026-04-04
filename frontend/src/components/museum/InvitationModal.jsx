/**
 * InvitationModal.jsx — 가족 초대 메시지 모달
 *
 * 관장이 타인 FolderCard에서 [초대] 버튼 클릭 시 표시
 * - 초대 메시지 미리보기 (관장 설정 문구 + 링크)
 * - 이메일 발송 / 링크 복사 / SNS 공유
 */
import React, { useState, useCallback } from 'react';
import { X, Mail, Copy, Check, Share2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function InvitationModal({
    personName = '',
    personId,
    siteId,
    curatorName = '',
    museumName = '',
    onClose,
}) {
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [inviteCode, setInviteCode] = useState(null);

    // 초대 링크 (코드 생성 후 업데이트)
    const inviteLink = inviteCode
        ? `${window.location.origin}/invite?code=${inviteCode}`
        : `${window.location.origin}/invite?person=${personId}&site=${siteId}`;

    // 초대 메시지 템플릿
    const messageTemplate = `안녕하세요, ${personName}님.

${curatorName}님이 「${museumName || '가족유산박물관'}」에서 당신을 기다리고 있습니다.

가계도에서 당신의 자리가 마련되어 있어요.
아래 링크를 클릭하면, 박물관에서의 노출 방식을 직접 선택하실 수 있습니다.

${inviteLink}

※ 원하지 않으시면 노출을 거절하실 수 있으며, 개인정보는 철저히 보호됩니다.`;

    // 이메일 발송: 1) 초대 생성 → 2) 이메일 발송
    const handleSendEmail = useCallback(async () => {
        if (!email.trim()) {
            toast.error('이메일 주소를 입력해주세요');
            return;
        }
        setSending(true);
        try {
            // Step 1: 초대 코드 생성
            const createRes = await axios.post('/api/invite/create', {
                site_id: siteId,
                email: email.trim(),
                person_id: personId,
            });
            const code = createRes.data?.data?.code;
            if (!code) throw new Error('초대 코드 생성 실패');
            setInviteCode(code);

            // Step 2: 이메일 발송
            await axios.post('/api/invite/send-email', {
                code,
                email: email.trim(),
            });
            toast.success(`${personName}님에게 초대 메시지를 보냈습니다`);
            onClose();
        } catch (err) {
            console.error('Invite send error:', err);
            const status = err.response?.status;
            if (status === 429) {
                toast.error('잠시 후 다시 시도해주세요 (발송 제한)');
            } else {
                toast.error('초대 발송에 실패했습니다');
            }
        } finally {
            setSending(false);
        }
    }, [email, personId, siteId, personName, onClose]);

    // 링크 복사
    const handleCopyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('초대 링크가 복사되었습니다');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = inviteLink;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            toast.success('초대 링크가 복사되었습니다');
            setTimeout(() => setCopied(false), 2000);
        }
    }, [inviteLink]);

    // SNS 공유 (Web Share API)
    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${museumName || '가족유산박물관'} 초대`,
                    text: `${curatorName}님이 가족유산박물관에 초대합니다`,
                    url: inviteLink,
                });
            } catch { /* user cancelled */ }
        } else {
            handleCopyLink();
        }
    }, [inviteLink, museumName, curatorName, handleCopyLink]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div
                    className="px-6 py-4 flex items-center justify-between"
                    style={{ background: 'linear-gradient(135deg, #2A1A08, #3D2008)' }}
                >
                    <div>
                        <h3 className="text-lg font-bold text-[#C4A84F]">가족 초대</h3>
                        <p className="text-xs text-[#e8e0d0] mt-0.5">{personName}님을 박물관에 초대합니다</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#C4A84F] hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* 메시지 미리보기 */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">초대 메시지</label>
                        <div
                            className="mt-1.5 p-3 rounded-lg text-[13px] text-gray-700 leading-relaxed max-h-40 overflow-y-auto"
                            style={{ background: '#FAFAF2', border: '1px solid #e8e0d0' }}
                        >
                            {messageTemplate.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* 이메일 입력 */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">이메일로 보내기</label>
                        <div className="mt-1.5 flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@email.com"
                                className="flex-1 px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#C4A84F]/30"
                                style={{ borderColor: '#e8e0d0' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendEmail(); }}
                            />
                            <button
                                onClick={handleSendEmail}
                                disabled={sending}
                                className="px-4 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                                style={{ background: '#C4A84F' }}
                            >
                                <Mail size={14} />
                                {sending ? '보내는 중...' : '발송'}
                            </button>
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">또는</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* 링크 복사 + SNS */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyLink}
                            className="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            style={{ borderColor: '#e8e0d0', color: '#3D2008' }}
                        >
                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            {copied ? '복사됨!' : '링크 복사'}
                        </button>
                        <button
                            onClick={handleShare}
                            className="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-1.5"
                            style={{ borderColor: '#e8e0d0', color: '#3D2008' }}
                        >
                            <Share2 size={14} />
                            SNS 공유
                        </button>
                    </div>
                </div>

                {/* 푸터 안내 */}
                <div className="px-6 py-3 text-center" style={{ background: '#FAFAF2', borderTop: '1px solid #e8e0d0' }}>
                    <p className="text-[11px] text-gray-400">
                        초대받은 분은 박물관 노출 여부를 직접 선택할 수 있습니다
                    </p>
                </div>
            </div>
        </div>
    );
}
