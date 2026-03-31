import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';

export default function InviteFamilyPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';
    const privacy = searchParams.get('privacy') || 'public';

    const { setCurrentStep, finishOnboarding } = useOnboardingStore();
    const { user, isAuthenticated } = useAuthStore();
    useEffect(() => { setCurrentStep('invite'); }, []);

    const [subdomain, setSubdomain] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConnect, setShowConnect] = useState(false);
    const [connectDomain, setConnectDomain] = useState('');
    const [connectStatus, setConnectStatus] = useState(null);
    const [inviteSent, setInviteSent] = useState(false);
    const [activeTab, setActiveTab] = useState('family'); // 'family' | 'friend'

    // 사용자 사이트 도메인 가져오기
    useEffect(() => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        if (setup.subdomain) {
            setSubdomain(setup.subdomain);
        } else {
            axios.get('/api/sites/mine').then(res => {
                const site = res.data?.data?.[0];
                if (site?.subdomain) {
                    setSubdomain(site.subdomain);
                }
            }).catch(() => {
                setSubdomain('myfamily');
            });
        }
    }, []);

    const museumUrl = `${subdomain}.orgcell.com`;
    const signupUrl = 'orgcell.com/onboarding/service';

    // 가족 초대 메시지
    const familyShareMessage = `우리 가족 디지털 박물관을 만들었어요!\n방문하려면: ${museumUrl}\n당신만의 박물관을 만들려면: ${signupUrl}`;

    // 친구 초대 메시지 (바이럴 루프)
    const friendShareMessage = `내 가족 박물관을 만들었어요!\n구경하러 오세요: ${museumUrl}\n당신도 만들어보세요: ${signupUrl}`;

    const shareMessage = activeTab === 'family' ? familyShareMessage : friendShareMessage;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://${museumUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const input = document.createElement('input');
            input.value = `https://${museumUrl}`;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareKakao = () => {
        const url = `https://sharer.kakao.com/talk/friends/picker/shorturl?url=${encodeURIComponent(`https://${museumUrl}`)}&text=${encodeURIComponent(shareMessage)}`;
        window.open(url, '_blank');
        setInviteSent(true);
    };

    const shareSMS = () => {
        const body = encodeURIComponent(shareMessage);
        window.location.href = `sms:?body=${body}`;
        setInviteSent(true);
    };

    const shareEmail = () => {
        const subject = encodeURIComponent(
            activeTab === 'family'
                ? `${subdomain} 가족 박물관에 초대합니다`
                : `${subdomain} 가족 박물관에 놀러오세요`
        );
        const body = encodeURIComponent(shareMessage);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        setInviteSent(true);
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${subdomain} 가족 박물관`,
                    text: shareMessage,
                    url: `https://${museumUrl}`,
                });
                setInviteSent(true);
            } catch {
                copyLink();
            }
        } else {
            copyLink();
        }
    };

    // 웜홀 연결 요청
    const handleConnect = async () => {
        if (!connectDomain.trim()) return;
        setConnectStatus('sending');

        try {
            if (!isAuthenticated) {
                setConnectStatus('error');
                return;
            }

            const targetDomain = connectDomain.replace('.orgcell.com', '').trim();

            await axios.post('/api/federation/request', {
                targetDomain: `${targetDomain}.orgcell.com`,
                relationType: 'family',
            });

            setConnectStatus('sent');
        } catch {
            setConnectStatus('error');
        }
    };

    // ── 초대 현황 ──
    const [inviteList, setInviteList] = useState([]);
    const [inviteListLoading, setInviteListLoading] = useState(false);
    const [showInviteList, setShowInviteList] = useState(false);
    const [resending, setResending] = useState(null);

    const fetchInviteStatus = async () => {
        setInviteListLoading(true);
        try {
            const res = await axios.get('/api/invite/status');
            if (res.data?.success) setInviteList(res.data.data);
        } catch { /* silent */ }
        finally { setInviteListLoading(false); }
    };

    const handleResend = async (inviteId) => {
        setResending(inviteId);
        try {
            await axios.post('/api/invite/resend', { invite_id: inviteId });
            fetchInviteStatus();
        } catch { /* silent */ }
        finally { setResending(null); }
    };

    const copyShortCode = async (shortCode) => {
        const url = `https://orgcell.com/invite?code=${shortCode}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
    };

    const [creating, setCreating] = useState(false);

    const handleFinish = async () => {
        finishOnboarding();

        if (subdomain && subdomain !== 'myfamily') {
            navigate(`/${subdomain}`);
            return;
        }

        if (!isAuthenticated) {
            navigate('/family-setup');
            return;
        }

        setCreating(true);
        try {
            const mineRes = await axios.get('/api/sites/mine');
            const existing = mineRes.data?.data;
            if (existing?.subdomain) {
                navigate(`/${existing.subdomain}`);
                return;
            }

            const rawName = user?.name || 'myfamily';
            const base = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'myfamily';
            const candidate = base.length < 3 ? base + 'family' : base;

            const res = await axios.post('/api/sites', {
                subdomain: candidate,
                theme: 'modern',
            });

            if (res.data?.success) {
                const newSub = res.data.data.subdomain;
                localStorage.setItem('orgcell_family_setup', JSON.stringify({ subdomain: newSub }));
                navigate(`/${newSub}`);
            } else {
                navigate('/family-setup');
            }
        } catch {
            navigate('/family-setup');
        } finally {
            setCreating(false);
        }
    };

    const [agreedTerms, setAgreedTerms] = useState(false);

    const onboardingType = localStorage.getItem('onboarding_type') || 'museum';
    const themeBg = { museum: '#F3EFFF', ai: '#EFF7E8', share: '#EFF5FF' }[onboardingType];

    return (
        <div className="min-h-screen flex flex-col" style={{ background: themeBg }}>
            {/* Header */}
            <OnboardingProgress current="invite" />
            <div className="relative text-center pt-6 pb-4 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-[28px] font-bold text-gray-900 mb-2">초대하기</h1>
                <p className="text-[15px] text-gray-500">가족과 친구에게 내 박물관을 알려주세요</p>
            </div>

            {/* 가족/친구 탭 */}
            <div className="flex mx-5 max-w-md mx-auto w-full mb-4" style={{ maxWidth: '28rem' }}>
                <button
                    onClick={() => setActiveTab('family')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-l-xl border transition-all ${
                        activeTab === 'family'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    👨‍👩‍👧‍👦 가족 초대
                </button>
                <button
                    onClick={() => setActiveTab('friend')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-r-xl border-t border-b border-r transition-all ${
                        activeTab === 'friend'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    🤝 친구 초대
                </button>
            </div>

            <div className="flex-1 flex flex-col px-5 max-w-md mx-auto w-full overflow-y-auto">
                {/* 내 박물관 주소 */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-4 text-center">
                    <p className="text-xs text-gray-500 mb-2">내 박물관 주소</p>
                    <p className="text-lg font-bold text-emerald-600 mb-3">{museumUrl}</p>
                    <button
                        onClick={copyLink}
                        className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                            copied
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {copied ? '복사됨!' : '복사하기'}
                    </button>
                </div>

                {/* 친구 탭: 공유 메시지 미리보기 */}
                {activeTab === 'friend' && (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-4">
                        <p className="text-xs font-bold text-blue-700 mb-2">공유 메시지 미리보기</p>
                        <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">{friendShareMessage}</p>
                    </div>
                )}

                {/* 공유 버튼 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={shareKakao}
                        className="bg-yellow-400 text-yellow-900 rounded-xl p-4 text-center font-medium text-sm hover:bg-yellow-500 active:scale-[0.98] transition-all"
                    >
                        카카오톡
                    </button>
                    <button
                        onClick={shareSMS}
                        className="bg-green-100 text-green-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-green-200 active:scale-[0.98] transition-all"
                    >
                        문자
                    </button>
                    <button
                        onClick={shareEmail}
                        className="bg-blue-100 text-blue-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-blue-200 active:scale-[0.98] transition-all"
                    >
                        이메일
                    </button>
                    <button
                        onClick={shareLink}
                        className="bg-gray-100 text-gray-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
                    >
                        링크 공유
                    </button>
                </div>

                {/* 가족 탭: 웜홀 연결 */}
                {activeTab === 'family' && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 mb-4">
                        <button
                            onClick={() => setShowConnect(!showConnect)}
                            className="w-full flex items-center justify-between"
                        >
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-900">가족이 이미 Orgcell을 쓰고 있나요?</p>
                                <p className="text-xs text-gray-500">가족 박물관을 서로 연결할 수 있어요</p>
                            </div>
                            <span className={`text-gray-400 transition-transform ${showConnect ? 'rotate-90' : ''}`}>
                                &rsaquo;
                            </span>
                        </button>

                        {showConnect && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-600 mb-2">상대방의 도메인을 입력하세요</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={connectDomain}
                                            onChange={(e) => setConnectDomain(e.target.value)}
                                            placeholder="예: kim"
                                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                            .orgcell.com
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        disabled={!connectDomain.trim() || connectStatus === 'sending'}
                                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            connectStatus === 'sent'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : connectStatus === 'error'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                        }`}
                                    >
                                        {connectStatus === 'sending' ? '...'
                                         : connectStatus === 'sent' ? '요청됨'
                                         : connectStatus === 'error' ? '재시도'
                                         : '연결'}
                                    </button>
                                </div>
                                {connectStatus === 'sent' && (
                                    <p className="text-xs text-emerald-600 mt-2">
                                        연결 요청을 보냈습니다. 상대방이 수락하면 웜홀이 생성됩니다.
                                    </p>
                                )}
                                {connectStatus === 'error' && (
                                    <p className="text-xs text-red-600 mt-2">
                                        요청에 실패했습니다. 도메인을 확인해주세요.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── 초대 현황 섹션 ── */}
                {isAuthenticated && (
                    <div className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden">
                        <button
                            onClick={() => { setShowInviteList(!showInviteList); if (!showInviteList && inviteList.length === 0) fetchInviteStatus(); }}
                            className="w-full flex items-center justify-between p-4"
                        >
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-900">보낸 초대 현황</p>
                                <p className="text-xs text-gray-500">초대 상태를 확인하고 재발송할 수 있어요</p>
                            </div>
                            <span className={`text-gray-400 transition-transform ${showInviteList ? 'rotate-90' : ''}`}>
                                &rsaquo;
                            </span>
                        </button>

                        {showInviteList && (
                            <div className="border-t border-gray-100">
                                {inviteListLoading ? (
                                    <div className="p-6 text-center">
                                        <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : inviteList.length === 0 ? (
                                    <p className="p-4 text-center text-sm text-gray-400">아직 보낸 초대가 없습니다</p>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {inviteList.map(inv => {
                                            const now = new Date();
                                            const isExpired = inv.is_expired;
                                            const statusLabel = inv.status === 'accepted' ? '수락됨'
                                                : isExpired ? '만료됨'
                                                : '대기 중';
                                            const statusColor = inv.status === 'accepted' ? '#2ecc71'
                                                : isExpired ? '#e74c3c'
                                                : '#f39c12';

                                            return (
                                                <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">
                                                            {inv.email || '(이메일 없음)'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span
                                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                                style={{ background: statusColor + '20', color: statusColor }}
                                                            >
                                                                {statusLabel}
                                                            </span>
                                                            {inv.short_code && (
                                                                <button
                                                                    onClick={() => copyShortCode(inv.short_code)}
                                                                    className="text-[10px] text-blue-500 font-mono hover:underline"
                                                                >
                                                                    {inv.short_code}
                                                                </button>
                                                            )}
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(inv.created_at).toLocaleDateString('ko-KR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {(isExpired || inv.status === 'pending') && inv.email && (
                                                        <button
                                                            onClick={() => handleResend(inv.id)}
                                                            disabled={resending === inv.id}
                                                            className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-all"
                                                            style={{
                                                                background: resending === inv.id ? '#f0f0f0' : '#EFF5FF',
                                                                color: resending === inv.id ? '#999' : '#3478F6',
                                                            }}
                                                        >
                                                            {resending === inv.id ? '...' : '재발송'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 공개 범위 표시 */}
                <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-emerald-700">
                        {privacy === 'public' && '현재 설정: 일반공개 — 누구나 방문 가능'}
                        {privacy === 'family' && '현재 설정: 가족공개 — 초대된 가족만 열람'}
                        {privacy === 'private' && '현재 설정: 본인보관 — 나만 열람 가능'}
                    </p>
                </div>
            </div>

            {/* Terms agreement + Footer buttons */}
            <div className="px-5 pb-8 max-w-md mx-auto w-full space-y-3">
                {/* 약관 동의 체크박스 */}
                <label className="flex items-start gap-2.5 cursor-pointer py-2">
                    <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-emerald-500 shrink-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-gray-600">개인정보처리방침</a>과{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-gray-600">이용약관</a>을
                        읽었으며 동의합니다.
                    </span>
                </label>

                <button
                    onClick={handleFinish}
                    disabled={creating || !agreedTerms}
                    className={`w-full rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${(creating || !agreedTerms) ? 'opacity-60' : ''}`}
                    style={{ height: 56, background: inviteSent ? 'linear-gradient(135deg, #5A9460, #4A8450)' : 'linear-gradient(135deg, #3D2008, #5A4020)' }}
                >
                    {creating ? '박물관 생성 중...' : inviteSent ? '초대 완료 → 박물관 입장' : '박물관으로 이동'}
                </button>
                {!inviteSent && (
                    <button onClick={handleFinish} className="w-full text-center text-sm text-gray-400 py-2">
                        나중에 초대하기
                    </button>
                )}
            </div>
        </div>
    );
}
