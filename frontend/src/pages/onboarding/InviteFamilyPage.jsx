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
    const [connectStatus, setConnectStatus] = useState(null); // null | 'sending' | 'sent' | 'error'
    const [inviteSent, setInviteSent] = useState(false);

    // 사용자 사이트 도메인 가져오기
    useEffect(() => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        if (setup.subdomain) {
            setSubdomain(setup.subdomain);
        } else {
            // API에서 가져오기 시도
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

    const shareMessage = `우리 가족 디지털 박물관을 만들었어요!\n방문하려면: ${museumUrl}\n당신만의 박물관을 만들려면: ${signupUrl}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`https://${museumUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
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
        // 카카오톡 공유 (모바일 딥링크)
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
        const subject = encodeURIComponent(`${subdomain} 가족 박물관에 초대합니다`);
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

            // 도메인 정리 (.orgcell.com 제거)
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

    const [creating, setCreating] = useState(false);

    const handleFinish = async () => {
        finishOnboarding();

        if (subdomain && subdomain !== 'myfamily') {
            navigate(`/${subdomain}`);
            return;
        }

        // 사이트 없으면 자동 생성
        if (!isAuthenticated) {
            navigate('/family-setup');
            return;
        }

        setCreating(true);
        try {
            // 이미 사이트가 있는지 확인
            const mineRes = await axios.get('/api/sites/mine');
            const existing = mineRes.data?.data;
            if (existing?.subdomain) {
                navigate(`/${existing.subdomain}`);
                return;
            }

            // 이름 기반 서브도메인 생성 (영문 소문자 + 숫자만)
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
            // 서브도메인 충돌 등 — family-setup으로 fallback
            navigate('/family-setup');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            {/* Header */}
            <OnboardingProgress current="invite" />
            <div className="relative text-center pt-6 pb-6 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">가족 초대</h1>
                <p className="text-sm text-gray-500">가족에게 내 박물관을 알려주세요</p>
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
                        {copied ? '✓ 복사됨!' : '📋 복사하기'}
                    </button>
                </div>

                {/* 공유 버튼 */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        onClick={shareKakao}
                        className="bg-yellow-400 text-yellow-900 rounded-xl p-4 text-center font-medium text-sm hover:bg-yellow-500 active:scale-[0.98] transition-all"
                    >
                        📱 카카오톡
                    </button>
                    <button
                        onClick={shareSMS}
                        className="bg-green-100 text-green-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-green-200 active:scale-[0.98] transition-all"
                    >
                        💬 문자
                    </button>
                    <button
                        onClick={shareEmail}
                        className="bg-blue-100 text-blue-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-blue-200 active:scale-[0.98] transition-all"
                    >
                        📧 이메일
                    </button>
                    <button
                        onClick={shareLink}
                        className="bg-gray-100 text-gray-800 rounded-xl p-4 text-center font-medium text-sm hover:bg-gray-200 active:scale-[0.98] transition-all"
                    >
                        🔗 링크 공유
                    </button>
                </div>

                {/* 기존 가족 연결 */}
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
                                     : connectStatus === 'sent' ? '✓ 요청됨'
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

                {/* 공개 범위 표시 */}
                <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-emerald-700">
                        {privacy === 'public' && '🌍 현재 설정: 일반공개 — 누구나 방문 가능'}
                        {privacy === 'family' && '👨‍👩‍👧‍👦 현재 설정: 가족공개 — 초대된 가족만 열람'}
                        {privacy === 'private' && '🔒 현재 설정: 본인보관 — 나만 열람 가능'}
                    </p>
                </div>
            </div>

            {/* Footer buttons */}
            <div className="px-5 pb-8 max-w-md mx-auto w-full space-y-3">
                <button
                    onClick={handleFinish}
                    disabled={creating}
                    className={`w-full rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${creating ? 'opacity-60' : ''}`}
                    style={{ height: 56, background: inviteSent ? 'linear-gradient(135deg, #5A9460, #4A8450)' : 'linear-gradient(135deg, #3D2008, #5A4020)' }}
                >
                    {creating ? '박물관 생성 중...' : inviteSent ? '🎉 초대 완료 → 박물관 입장' : '🏛️ 박물관으로 이동'}
                </button>
                {!inviteSent && (
                    <button onClick={handleFinish} className="w-full text-center text-sm text-gray-400 py-2">
                        나중에 초대하기 →
                    </button>
                )}
            </div>
        </div>
    );
}
