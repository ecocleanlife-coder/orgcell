import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import useOnboardingStore from '../../store/onboardingStore';
import { Building2, Sparkles, Share2, LogOut, CalendarDays, MessageSquare, ChevronRight, Home } from 'lucide-react';

/* ── i18n ── */
const T = {
    ko: {
        welcome: (n) => `안녕하세요, ${n}님!`,
        logout: '로그아웃',
        museumTitle: '가족 박물관',
        museumDesc: '우리 가족만의 디지털 박물관을 만들고, 4세대를 연결하세요.',
        museumBtn: '박물관 가기',
        museumBtnSetup: '박물관 만들기',
        sortTitle: 'AI 스마트 분류',
        sortDesc: '중복 제거, 날짜 정렬, 인물 분류를 AI가 자동으로 해드립니다.',
        sortBtn: '정리 시작',
        shareTitle: '실시간 공유',
        shareDesc: '가족 모임에서 찍은 사진을 즉시 공유하세요.',
        shareBtn: '공유 시작',
        upcomingEvents: '다가오는 가족 행사',
        noEvents: '등록된 행사가 없습니다',
        recentPosts: '최근 게시글',
        noPosts: '게시글이 없습니다',
        daysLeft: (d) => `${d}일 후`,
        today: '오늘',
    },
    en: {
        welcome: (n) => `Hello, ${n}!`,
        logout: 'Logout',
        museumTitle: 'Family Museum',
        museumDesc: 'Create your digital family museum and connect 4+ generations.',
        museumBtn: 'Go to Museum',
        museumBtnSetup: 'Create Museum',
        sortTitle: 'AI Smart Sort',
        sortDesc: 'Remove duplicates, sort by date, classify faces — all automatic.',
        sortBtn: 'Start Sorting',
        shareTitle: 'Live Sharing',
        shareDesc: 'Instantly share photos from family gatherings.',
        shareBtn: 'Start Sharing',
        upcomingEvents: 'Upcoming Family Events',
        noEvents: 'No upcoming events',
        recentPosts: 'Recent Posts',
        noPosts: 'No posts yet',
        daysLeft: (d) => `in ${d} days`,
        today: 'Today',
    },
    ja: {
        welcome: (n) => `こんにちは、${n}さん！`,
        logout: 'ログアウト',
        museumTitle: '家族博物館',
        museumDesc: 'デジタル家族博物館を作り、4世代をつなげましょう。',
        museumBtn: '博物館へ',
        museumBtnSetup: '博物館を作る',
        sortTitle: 'AIスマート分類',
        sortDesc: '重複削除、日付順整理、人物分類をAIが自動で行います。',
        sortBtn: '整理開始',
        shareTitle: 'リアルタイム共有',
        shareDesc: '家族の集まりで撮った写真をすぐに共有。',
        shareBtn: '共有開始',
        upcomingEvents: '今後の家族イベント',
        noEvents: 'イベントはありません',
        recentPosts: '最近の投稿',
        noPosts: '投稿はありません',
        daysLeft: (d) => `${d}日後`,
        today: '今日',
    },
    'zh-CN': {
        welcome: (n) => `您好，${n}！`,
        logout: '退出登录',
        museumTitle: '家族博物馆',
        museumDesc: '创建数字家族博物馆，连接四代人。',
        museumBtn: '进入博物馆',
        museumBtnSetup: '创建博物馆',
        sortTitle: 'AI智能分类',
        sortDesc: '去重、按日期排序、人物分类——全部自动完成。',
        sortBtn: '开始整理',
        shareTitle: '实时分享',
        shareDesc: '即时分享家庭聚会照片。',
        shareBtn: '开始分享',
        upcomingEvents: '即将到来的家庭活动',
        noEvents: '暂无活动',
        recentPosts: '最近帖子',
        noPosts: '暂无帖子',
        daysLeft: (d) => `${d}天后`,
        today: '今天',
    },
    es: {
        welcome: (n) => `¡Hola, ${n}!`,
        logout: 'Cerrar sesión',
        museumTitle: 'Museo Familiar',
        museumDesc: 'Crea tu museo familiar digital y conecta 4+ generaciones.',
        museumBtn: 'Ir al Museo',
        museumBtnSetup: 'Crear Museo',
        sortTitle: 'Clasificación IA',
        sortDesc: 'Elimina duplicados, ordena por fecha, clasifica rostros — todo automático.',
        sortBtn: 'Empezar',
        shareTitle: 'Compartir en Vivo',
        shareDesc: 'Comparte fotos de reuniones familiares al instante.',
        shareBtn: 'Compartir',
        upcomingEvents: 'Próximos Eventos Familiares',
        noEvents: 'No hay eventos próximos',
        recentPosts: 'Publicaciones Recientes',
        noPosts: 'No hay publicaciones',
        daysLeft: (d) => `en ${d} días`,
        today: 'Hoy',
    },
};

function getLang() {
    const stored = localStorage.getItem('orgcell-lang');
    if (stored && T[stored]) return stored;
    const nav = (navigator.language || '').slice(0, 2);
    if (nav === 'ko') return 'ko';
    if (nav === 'ja') return 'ja';
    if (nav === 'zh') return 'zh-CN';
    if (nav === 'es') return 'es';
    return 'en';
}

/* ── Service Card ── */
function ServiceCard({ icon: Icon, iconColor, title, desc, btnLabel, onClick }) {
    return (
        <div
            className="flex flex-col bg-white rounded-2xl border border-[#E8E3D8] p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
            onClick={onClick}
        >
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: iconColor + '18' }}
            >
                <Icon size={24} style={{ color: iconColor }} />
            </div>
            <h3 className="text-[17px] font-bold text-[#3D2008] mb-2">{title}</h3>
            <p className="text-[13.5px] text-[#7A6E5E] leading-relaxed flex-1 mb-5">{desc}</p>
            <button
                className="w-full py-2.5 rounded-xl text-[13.5px] font-bold text-white transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${iconColor}, ${iconColor}cc)` }}
            >
                {btnLabel}
            </button>
        </div>
    );
}

/* ── Onboarding Banner ── */
function OnboardingBanner() {
    const navigate = useNavigate();
    const { started, finished, getResumeUrl, completedSteps } = useOnboardingStore();

    if (!started || finished) return null;

    const resumeUrl = getResumeUrl();
    if (!resumeUrl) return null;

    const progress = Math.round((completedSteps.length / 7) * 100);

    return (
        <div
            onClick={() => navigate(resumeUrl)}
            className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-all active:scale-[0.99]"
        >
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-emerald-800">🚀 온보딩 이어서 하기</p>
                <span className="text-xs text-emerald-600 font-medium">{completedSteps.length}/7 완료</span>
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

    const t = useMemo(() => T[getLang()] || T.en, []);

    // 로그인 안 됐으면 랜딩으로
    useEffect(() => {
        if (!isAuthenticated) navigate('/', { replace: true });
    }, [isAuthenticated, navigate]);

    // 사이트 정보 + 달력 + 게시판 로드
    useEffect(() => {
        if (!isAuthenticated) return;

        axios.get('/api/sites/mine')
            .then(r => {
                if (r.data?.success && r.data?.data) setSiteData(r.data.data);
            })
            .catch(() => {});

        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        axios.get(`/api/calendar?year=${y}&month=${m}`)
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
            .then(r => {
                if (r.data?.success) setPosts((r.data.data || []).slice(0, 3));
            })
            .catch(() => {});
    }, [isAuthenticated]);

    const handleMuseum = () => {
        if (siteData?.subdomain) {
            navigate(`/${siteData.subdomain}`);
        } else {
            navigate('/family-setup');
        }
    };

    const handleLogout = () => {
        logoutFn();
        navigate('/');
    };

    const daysUntil = (dateStr) => {
        const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return t.today;
        return t.daysLeft(diff);
    };

    const EVENT_EMOJI = { birthday: '🎂', anniversary: '💑', event: '🎉', memorial: '🕯️', trip: '✈️' };

    if (!isAuthenticated || !user) return null;

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
                        <span className="text-[13px] text-[#7A6E5E] hidden sm:inline">{user.email}</span>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#7A6E5E] hover:text-[#3D2008] transition cursor-pointer"
                        >
                            <LogOut size={15} />
                            {t.logout}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[960px] mx-auto px-5 py-8">
                {/* Welcome */}
                <h1 className="text-[24px] sm:text-[28px] font-bold text-[#3D2008] mb-8">
                    {t.welcome(user.name || user.email?.split('@')[0] || 'User')}
                </h1>

                {/* Onboarding Resume Banner */}
                <OnboardingBanner />

                {/* Service Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    <ServiceCard
                        icon={Building2}
                        iconColor="#5A9460"
                        title={t.museumTitle}
                        desc={t.museumDesc}
                        btnLabel={siteData ? t.museumBtn : t.museumBtnSetup}
                        onClick={handleMuseum}
                    />
                    <ServiceCard
                        icon={Sparkles}
                        iconColor="#B8860B"
                        title={t.sortTitle}
                        desc={t.sortDesc}
                        btnLabel={t.sortBtn}
                        onClick={() => navigate('/smart-sort')}
                    />
                    <ServiceCard
                        icon={Share2}
                        iconColor="#4A7FB5"
                        title={t.shareTitle}
                        desc={t.shareDesc}
                        btnLabel={t.shareBtn}
                        onClick={() => navigate('/live-sharing')}
                    />
                </div>

                {/* Bottom Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Upcoming Events */}
                    <div className="bg-white rounded-2xl border border-[#E8E3D8] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarDays size={18} className="text-[#B8860B]" />
                            <h2 className="text-[15px] font-bold text-[#3D2008]">{t.upcomingEvents}</h2>
                        </div>
                        {events.length === 0 ? (
                            <p className="text-[13px] text-[#A09882]">{t.noEvents}</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {events.map((ev, i) => (
                                    <li key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[16px]">{EVENT_EMOJI[ev.event_type] || '📅'}</span>
                                            <span className="text-[13.5px] font-medium text-[#3D2008]">{ev.title}</span>
                                        </div>
                                        <span className="text-[12px] text-[#A09882]">{daysUntil(ev.event_date)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Recent Posts */}
                    <div className="bg-white rounded-2xl border border-[#E8E3D8] p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={18} className="text-[#4A7FB5]" />
                            <h2 className="text-[15px] font-bold text-[#3D2008]">{t.recentPosts}</h2>
                        </div>
                        {posts.length === 0 ? (
                            <p className="text-[13px] text-[#A09882]">{t.noPosts}</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {posts.map((post, i) => (
                                    <li
                                        key={i}
                                        className="flex items-center justify-between cursor-pointer hover:bg-[#F5F0E8] -mx-2 px-2 py-1.5 rounded-lg transition"
                                        onClick={() => siteData?.subdomain && navigate(`/${siteData.subdomain}/board`)}
                                    >
                                        <span className="text-[13.5px] font-medium text-[#3D2008] truncate max-w-[200px]">{post.title}</span>
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
