import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import useOnboardingStore from '../../store/onboardingStore';
import { LogOut, CalendarDays, MessageSquare, ChevronRight, Home, Users, UserPlus } from 'lucide-react';

const SERVICES = [
    {
        image: '/images/landing/card-museum.png',
        title: '가족유산박물관',
        desc: '우리 가족만의 유산박물관을 만들고,\n4세대를 연결하세요.',
        btn: '박물관 가기',
        btnSetup: '박물관 만들기',
        color: '#7C5CFC',
        hover: '#6A4AE0',
        bg: '#F3EFFF',
        route: 'museum',
    },
    {
        image: '/images/landing/card-ai-sort.png',
        title: 'AI 스마트 분류',
        desc: '중복 제거, 날짜 정렬, 인물 분류를\nAI가 자동으로 해드립니다.',
        btn: '정리 시작하기',
        color: '#5A9460',
        hover: '#4A8450',
        bg: '#EFF7E8',
        route: '/smart-sort',
    },
    {
        image: '/images/landing/card-live-share.png',
        title: '실시간 공유',
        desc: '가족 모임에서 찍은 사진을\n즉시 공유하세요.',
        btn: '공유 시작하기',
        color: '#4A7FB5',
        hover: '#3A6FA5',
        bg: '#EFF5FF',
        route: '/live-sharing',
    },
];

/* ── Onboarding Banner ── */
function OnboardingBanner() {
    const navigate = useNavigate();
    const { started, finished, getResumeUrl, completedSteps } = useOnboardingStore();

    if (!started || finished) return null;

    const resumeUrl = getResumeUrl();
    if (!resumeUrl) return null;

    const progress = Math.round((completedSteps.length / 8) * 100);

    return (
        <div
            onClick={() => navigate(resumeUrl)}
            className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-all active:scale-[0.99]"
        >
            <div className="flex items-center justify-between mb-2">
                <p className="text-[15px] font-bold text-emerald-800">온보딩 이어서 하기</p>
                <span className="text-[13px] text-emerald-600 font-medium">{completedSteps.length}/8 완료</span>
            </div>
            <div className="w-full bg-emerald-200 rounded-full h-2">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}

/* ── Main ── */
export default function HomePage() {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);
    const logoutFn = useAuthStore(s => s.logout);

    const [siteData, setSiteData] = useState(null);
    const [events, setEvents] = useState([]);
    const [posts, setPosts] = useState([]);
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        if (!isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!isAuthenticated) return;

        axios.get('/api/sites/mine')
            .then(r => { if (r.data?.success && r.data?.data) setSiteData(r.data.data); })
            .catch(() => {});

        const now = new Date();
        axios.get(`/api/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
            .then(r => {
                if (r.data?.success) {
                    const upcoming = (r.data.data || [])
                        .filter(e => new Date(e.event_date) >= now)
                        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
                        .slice(0, 3);
                    setEvents(upcoming);
                }
            })
            .catch(() => {});

        axios.get('/api/board/posts?limit=3')
            .then(r => { if (r.data?.success) setPosts((r.data.data || []).slice(0, 3)); })
            .catch(() => {});

        axios.get('/api/friends/list')
            .then(r => { if (r.data?.success) setFriends((r.data.data || []).slice(0, 5)); })
            .catch(() => {});
    }, [isAuthenticated]);

    const handleServiceClick = (svc) => {
        if (svc.route === 'museum') {
            if (siteData?.subdomain) {
                navigate(`/${siteData.subdomain}`);
            } else {
                navigate('/family-setup');
            }
        } else {
            navigate(svc.route);
        }
    };

    const handleLogout = () => {
        logoutFn();
        navigate('/');
    };

    const daysUntil = (dateStr) => {
        const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return '오늘';
        return `${diff}일 후`;
    };

    const EVENT_EMOJI = { birthday: '🎂', anniversary: '💑', event: '🎉', memorial: '🕯️', trip: '✈️' };

    if (!isAuthenticated || !user) return null;

    const displayName = user.name || user.email?.split('@')[0] || '회원';

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-[#E8E3D8]" style={{ background: 'rgba(250,250,247,0.97)', backdropFilter: 'blur(8px)' }}>
                <div className="max-w-[960px] mx-auto px-5 h-16 flex items-center justify-between">
                    <button onClick={() => navigate('/home')} className="flex items-center gap-2 cursor-pointer">
                        <Home size={20} className="text-[#5A9460]" />
                        <span className="text-[22px] font-black text-[#3D2008]" style={{ fontFamily: 'Georgia, serif' }}>Orgcell</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <span className="text-[14px] text-[#7A6E5E] hidden sm:inline">{user.email}</span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-[14px] font-semibold text-[#7A6E5E] hover:text-[#3D2008] transition cursor-pointer"
                        >
                            <LogOut size={15} />
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[960px] mx-auto px-5 py-8">
                {/* Welcome */}
                <h1 className="text-[26px] sm:text-[30px] font-bold text-[#3D2008] mb-8">
                    안녕하세요, {displayName}님!
                </h1>

                {/* Onboarding Resume Banner */}
                <OnboardingBanner />

                {/* Service Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    {SERVICES.map((svc) => (
                        <div
                            key={svc.title}
                            onClick={() => handleServiceClick(svc)}
                            className="flex flex-col rounded-2xl p-6 border border-[#E8E3D8] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                            style={{ background: svc.bg }}
                        >
                            <img
                                src={svc.image}
                                alt={svc.title}
                                className="mx-auto mb-4"
                                style={{ width: 72, height: 72, objectFit: 'contain' }}
                            />
                            <h3 className="text-[18px] font-bold text-[#3D2008] mb-2">{svc.title}</h3>
                            <p className="text-[15px] text-[#5A5A4A] leading-relaxed flex-1 mb-5" style={{ whiteSpace: 'pre-line' }}>
                                {svc.route === 'museum' && siteData ? svc.desc : svc.desc}
                            </p>
                            <button
                                className="w-full py-3 rounded-xl text-[16px] font-bold text-white transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                                style={{ background: `linear-gradient(135deg, ${svc.color}, ${svc.hover})` }}
                            >
                                {svc.route === 'museum' && siteData ? svc.btn : (svc.btnSetup || svc.btn)}
                            </button>
                        </div>
                    ))}
                </div>

                {/* 친구 박물관 */}
                {friends.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E8E3D8] p-5 mb-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-[#9b59b6]" />
                                <h2 className="text-[16px] font-bold text-[#3D2008]">친구 박물관</h2>
                            </div>
                            <button
                                onClick={() => navigate('/onboarding/invite?tab=friend')}
                                className="flex items-center gap-1 text-[13px] font-bold text-[#5A9460] hover:text-[#4A8450] transition"
                            >
                                <UserPlus size={13} />
                                초대하기
                            </button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {friends.map((f) => (
                                <div
                                    key={f.friendship_id}
                                    onClick={() => navigate(`/${f.subdomain}`)}
                                    className="flex flex-col items-center gap-1.5 cursor-pointer hover:opacity-80 transition shrink-0"
                                    style={{ minWidth: 72 }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[15px]"
                                        style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}
                                    >
                                        {(f.owner_name || f.subdomain || '?')[0].toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-medium text-[#3D2008] text-center truncate w-full">
                                        {f.owner_name || f.subdomain}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 다가오는 가족 행사 */}
                    <div className="bg-white rounded-2xl border border-[#E8E3D8] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDays size={18} className="text-[#B8860B]" />
                            <h2 className="text-[16px] font-bold text-[#3D2008]">다가오는 가족 행사</h2>
                        </div>
                        {events.length === 0 ? (
                            <p className="text-[15px] text-[#A09882]">예정된 행사가 없습니다</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {events.map((ev, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[16px]">{EVENT_EMOJI[ev.event_type] || '📅'}</span>
                                            <span className="text-[15px] font-medium text-[#3D2008]">{ev.title}</span>
                                        </div>
                                        <span className="text-[13px] text-[#A09882]">{daysUntil(ev.event_date)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* 최근 게시물 */}
                    <div className="bg-white rounded-2xl border border-[#E8E3D8] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={18} className="text-[#4A7FB5]" />
                            <h2 className="text-[16px] font-bold text-[#3D2008]">최근 게시물</h2>
                        </div>
                        {posts.length === 0 ? (
                            <p className="text-[15px] text-[#A09882]">게시물이 없습니다</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {posts.map((post, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between cursor-pointer hover:bg-[#F5F0E8] -mx-2 px-2 py-1.5 rounded-lg transition"
                                        onClick={() => siteData?.subdomain && navigate(`/${siteData.subdomain}/board`)}
                                    >
                                        <span className="text-[15px] font-medium text-[#3D2008] truncate max-w-[200px]">{post.title}</span>
                                        <ChevronRight size={14} className="text-[#A09882] shrink-0" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
