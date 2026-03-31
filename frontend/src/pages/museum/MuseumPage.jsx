import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    Globe, Lock, Image as ImageIcon,
    GalleryThumbnails, ClipboardList, TreePine, Settings,
    LogIn, Bell, Star, Calendar, MessageSquare, ChevronRight, Download,
    BookOpen, CalendarDays, Plus, X, Pencil, UserPlus, Sparkles,
    Upload, Camera, Users,
} from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FamilyTreeView from '../../components/museum/FamilyTreeView';
import FamilyCalendar from '../../components/museum/FamilyCalendar';
import AncestorHallTab from '../../components/museum/AncestorHallTab';
import PostDetailModal from '../../components/museum/PostDetailModal';
import OnboardingGuide from '../../components/museum/OnboardingGuide';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ─── Category meta ───
const CATEGORY_META = {
    notice: { icon: Bell,          color: '#e67e22' },
    daily:  { icon: Star,          color: '#2ecc71' },
    event:  { icon: Calendar,      color: '#3498db' },
    memory: { icon: MessageSquare, color: '#9b59b6' },
};

// ─── Fade-in on scroll hook ───
function useFadeIn() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return { ref, style: {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
    }};
}

// ─── Section wrapper ───
function Section({ children, id }) {
    const fadeIn = useFadeIn();
    return (
        <section id={id} ref={fadeIn.ref} style={fadeIn.style} className="mb-8">
            {children}
        </section>
    );
}

// ─── Section header ───
function SectionHeader({ title, actionLabel, onAction, icon: Icon }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>{title}</h2>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:brightness-95"
                    style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                >
                    {Icon && <Icon size={13} />}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ─── Empty state ───
function EmptyState({ emoji, message, actionLabel, onAction }) {
    return (
        <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
            <span className="text-4xl block mb-3">{emoji}</span>
            <p className="text-sm mb-4">{message}</p>
            {actionLabel && (
                <button
                    onClick={onAction}
                    className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
                    style={{ background: '#5a8a4a' }}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// ─── Exhibition Card ───
function ExhibitionCard({ exh, t, onClick }) {
    return (
        <div
            onClick={onClick}
            className="rounded-2xl border bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            style={{ borderColor: '#e8e0d0' }}
        >
            <div
                className="h-28 flex items-center justify-center relative"
                style={{
                    background: exh.cover_photo
                        ? `url(${exh.cover_photo}) center/cover`
                        : 'linear-gradient(135deg, #d8cfe8, #c8e0c0)',
                }}
            >
                {!exh.cover_photo && <ImageIcon size={36} style={{ color: 'rgba(255,255,255,0.7)' }} />}
                <span
                    className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{
                        background: exh.visibility === 'public' ? '#e8f5e0' : '#f0eaf8',
                        color: exh.visibility === 'public' ? '#3a7a2a' : '#7a3a9a',
                    }}
                >
                    {exh.visibility === 'public' ? <Globe size={10} /> : <Lock size={10} />}
                    {exh.visibility === 'public' ? t.subPublic : t.subFamily}
                </span>
            </div>
            <div className="p-3">
                <h3 className="font-bold text-sm truncate" style={{ color: '#3a3a2a' }}>{exh.title}</h3>
                <p className="text-xs mt-1" style={{ color: '#8a8a7a' }}>
                    {exh.photo_count} {t.exhPhotos} &bull; {exh.guestbook_count} {t.exhGuestbook}
                </p>
            </div>
        </div>
    );
}

// ─── Board Post Row ───
function PostRow({ post, t, onClick }) {
    const meta = CATEGORY_META[post.category] || CATEGORY_META.daily;
    const Icon = meta.icon;
    const date = new Date(post.created_at).toLocaleDateString();
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ borderColor: '#f0ece4' }}
        >
            <span
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: meta.color + '20' }}
            >
                <Icon size={14} style={{ color: meta.color }} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#3a3a2a' }}>{post.title}</p>
                <p className="text-xs" style={{ color: '#9a9a8a' }}>{post.author_name} · {date}</p>
            </div>
            {post.comment_count > 0 && (
                <span className="text-xs shrink-0" style={{ color: '#aaa' }}>
                    {post.comment_count} {t.boardComments}
                </span>
            )}
            <ChevronRight size={14} style={{ color: '#ccc' }} />
        </div>
    );
}

// ─── Page loader ───
function PageLoader() {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
    );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT — 스크롤형 박물관
// ═══════════════════════════════════════════════
export default function MuseumPage({ initialTab }) {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('museum', lang);
    const pt = getT('pwa', lang);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [site, setSite] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // 전시관
    const [exhibitions, setExhibitions] = useState([]);
    const [exhLoading, setExhLoading] = useState(false);

    // 게시판
    const [posts, setPosts] = useState([]);
    const [boardLoading, setBoardLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPost, setNewPost] = useState({ category: 'daily', title: '', content: '' });
    const [postingPost, setPostingPost] = useState(false);

    // 온보딩
    const [showOnboarding, setShowOnboarding] = useState(false);

    // 업로드 모달
    const [showUploadModal, setShowUploadModal] = useState(false);

    // 친구 요청
    const [friendRequested, setFriendRequested] = useState(false);
    const [friendRequesting, setFriendRequesting] = useState(false);

    // PWA
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    // 섹션 refs (initialTab="board" 자동 스크롤용)
    const boardRef = useRef(null);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }
        const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setIsInstalled(true));
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // ── Fetch museum info ──
    useEffect(() => {
        setLoading(true);
        setNotFound(false);
        axios.get(`/api/museum/${subdomain}`)
            .then((r) => {
                if (r.data?.success) {
                    setSite(r.data.data);
                    setRole(r.data.data.role);
                } else {
                    setNotFound(true);
                }
            })
            .catch((err) => {
                if (err.response?.status === 404) setNotFound(true);
            })
            .finally(() => setLoading(false));
    }, [subdomain]);

    // ── Onboarding for owner ──
    useEffect(() => {
        if (role === 'owner' && site) {
            const key = `onboarding_seen_${site.id}`;
            if (!localStorage.getItem(key)) {
                setShowOnboarding(true);
                localStorage.setItem(key, '1');
            }
        }
    }, [role, site]);

    // ── 방문 기록 ──
    useEffect(() => {
        if (site && isAuthenticated && role === 'public') {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            const source = ref ? 'invite_link' : 'direct';
            axios.post('/api/friends/visit', {
                siteId: site.id,
                source,
                referralCode: ref || undefined,
            }).catch(() => {});
        }
    }, [site, isAuthenticated, role]);

    // ── initialTab="board" → 자동 스크롤 ──
    useEffect(() => {
        if (initialTab === 'board' && boardRef.current && !loading) {
            setTimeout(() => {
                boardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [initialTab, loading]);

    const handleFriendRequest = async () => {
        if (!site || friendRequesting) return;
        setFriendRequesting(true);
        try {
            await axios.post('/api/friends/request', { friendSiteId: site.id });
            setFriendRequested(true);
        } catch {
            setFriendRequested(true);
        } finally {
            setFriendRequesting(false);
        }
    };

    // ── Fetch exhibitions (전체) ──
    const fetchExhibitions = useCallback(async () => {
        if (!site) return;
        setExhLoading(true);
        try {
            const params = { site_id: site.id };
            if (role === 'public') params.visibility = 'public';
            const res = await axios.get('/api/exhibitions', { params });
            if (res.data?.success) setExhibitions(res.data.data);
        } catch { /* silent */ }
        finally { setExhLoading(false); }
    }, [site, role]);

    useEffect(() => {
        if (site && role !== null) fetchExhibitions();
    }, [site, role, fetchExhibitions]);

    // ── Fetch board posts ──
    const fetchPosts = useCallback(async () => {
        if (!site) return;
        setBoardLoading(true);
        try {
            const res = await axios.get('/api/board/posts', { params: { site_id: site.id } });
            if (res.data?.success) setPosts(res.data.data);
        } catch { /* silent */ }
        finally { setBoardLoading(false); }
    }, [site]);

    useEffect(() => {
        if (site) fetchPosts();
    }, [site, fetchPosts]);

    const handleCreatePost = async () => {
        if (!newPost.title.trim() || !newPost.content.trim() || !site) return;
        setPostingPost(true);
        try {
            await axios.post('/api/board/posts', {
                site_id: site.id,
                category: newPost.category,
                title: newPost.title,
                content: newPost.content,
            });
            setShowCreatePost(false);
            setNewPost({ category: 'daily', title: '', content: '' });
            fetchPosts();
        } catch (err) {
            console.error('createPost error:', err);
        } finally {
            setPostingPost(false);
        }
    };

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setInstallPrompt(null);
        }
    };

    // ── 전시관 그룹핑 ──
    const exhibitionGroups = useMemo(() => {
        const groups = [
            { key: 'family', label: '가족공개 전시관', icon: '🟢', items: [] },
            { key: 'public', label: '일반공개 전시관', icon: '🔵', items: [] },
        ];
        exhibitions.forEach((exh) => {
            if (exh.visibility === 'public') {
                groups[1].items.push(exh);
            } else {
                groups[0].items.push(exh);
            }
        });
        return groups.filter((g) => g.items.length > 0);
    }, [exhibitions]);

    const BOARD_CATS = [
        { key: 'all',    label: t.boardAll },
        { key: 'notice', label: t.boardNotice },
        { key: 'daily',  label: t.boardDaily },
        { key: 'event',  label: t.boardEvent },
        { key: 'memory', label: t.boardMemory },
    ];

    if (loading) return <PageLoader />;

    if (notFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#FAFAF7' }}>
                <GalleryThumbnails size={56} className="mb-4 opacity-30" />
                <p className="text-gray-500">{t.notFound}</p>
            </div>
        );
    }

    const museumName = site?.museum_name || `${subdomain} 가족 박물관`;
    const canEdit = role === 'owner' || role === 'member';
    const recentPosts = posts.slice(0, 3);

    return (
        <div className="min-h-screen font-sans" style={{ background: '#FAFAF7' }}>
            <Helmet>
                <link rel="manifest" href={`/api/manifest/${subdomain}`} />
                <meta name="theme-color" content="#4a7a3a" />
            </Helmet>

            {/* ── Public visitor banner ── */}
            {role === 'public' && (
                <div className="bg-indigo-600 text-white text-sm px-4 py-2.5 flex items-center justify-center gap-3 flex-wrap">
                    <span>{t.publicBanner}</span>
                    <button
                        onClick={() => navigate('/auth/login', { state: { from: `/${subdomain}` } })}
                        className="flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-700 rounded-full font-bold text-xs shrink-0"
                    >
                        <LogIn size={12} />
                        {t.loginBtn}
                    </button>
                </div>
            )}

            {/* ════ 상단 헤더 (고정) ════ */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(250,250,247,0.96)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <h1 className="font-bold text-base truncate" style={{ color: '#3a3a2a' }}>
                        {museumName}
                    </h1>
                    <div className="flex items-center gap-2 shrink-0">
                        {role === 'owner' && installPrompt && !isInstalled && (
                            <button
                                onClick={handleInstall}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                style={{ background: '#4a7a3a', color: '#fff' }}
                            >
                                <Download size={13} />
                                {pt.installBtn}
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                            >
                                <Upload size={16} />
                            </button>
                        )}
                        {role === 'owner' && (
                            <button
                                onClick={() => navigate('/museum')}
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: '#e8e0d0', color: '#5a5040' }}
                            >
                                <Settings size={16} />
                            </button>
                        )}
                        <LanguageSwitcher />
                    </div>
                </div>
            </header>

            {/* ════ 메인 콘텐츠 (스크롤) ════ */}
            <main className="max-w-2xl mx-auto px-4 py-6 pb-28">

                {/* ══ SECTION 1: 가족 행사 달력 ══ */}
                <Section id="section-calendar">
                    <SectionHeader
                        title="이번 달 우리 가족 행사"
                        actionLabel="달력 전체보기"
                        onAction={() => {
                            const calEl = document.getElementById('section-calendar-full');
                            if (calEl) calEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        icon={CalendarDays}
                    />
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                        {/* 다가오는 행사 미리보기 (UpcomingEventsWidget 인라인) */}
                        <UpcomingEventsPreview siteId={site?.id} t={t} />
                    </div>
                </Section>

                {/* ══ SECTION 1-FULL: 전체 달력 (접이식) ══ */}
                <Section id="section-calendar-full">
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                        <FamilyCalendar siteId={site?.id} role={role} t={t} />
                    </div>
                </Section>

                {/* ══ SECTION 2: 전시관 ══ */}
                <Section id="section-exhibition">
                    <SectionHeader
                        title="우리 가족 전시관"
                        actionLabel={canEdit ? '+ 새 전시관 만들기' : undefined}
                        onAction={() => navigate(`/${subdomain}/gallery/new`)}
                        icon={Plus}
                    />

                    {exhLoading ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-2xl border bg-white animate-pulse" style={{ borderColor: '#e8e0d0', height: 180 }}>
                                    <div className="h-28 rounded-t-2xl bg-gray-200" />
                                    <div className="p-3 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : exhibitions.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid #e8e0d0' }}>
                            <EmptyState
                                emoji="📷"
                                message="첫 사진을 올려보세요"
                                actionLabel={canEdit ? '업로드' : undefined}
                                onAction={() => setShowUploadModal(true)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {exhibitionGroups.map((group) => (
                                <div key={group.key}>
                                    <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#7a7a6a' }}>
                                        <span>{group.icon}</span> {group.label}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {group.items.map((exh) => (
                                            <ExhibitionCard
                                                key={exh.id}
                                                exh={exh}
                                                t={t}
                                                onClick={() => navigate(`/${subdomain}/gallery/${exh.id}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* ══ SECTION 3: 가족트리 ══ */}
                <Section id="section-tree">
                    <SectionHeader
                        title="우리 가족"
                        actionLabel={canEdit ? '+ 가족 추가' : undefined}
                        onAction={() => {/* FamilyTreeView 내부에서 처리 */}}
                        icon={UserPlus}
                    />
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                        <FamilyTreeView siteId={site?.id} readOnly={role === 'public'} role={role} />
                    </div>
                </Section>

                {/* ══ SECTION 4: 사진 요청 배너 ══ */}
                {canEdit && (
                    <Section id="section-request">
                        <div
                            className="rounded-2xl p-6 text-center"
                            style={{ background: 'linear-gradient(135deg, #e8f5e0, #d4edda)', border: '1px solid #b8ddb0' }}
                        >
                            <p className="text-base font-bold mb-1" style={{ color: '#2a6a2a' }}>
                                가족에게 사진을 요청해보세요
                            </p>
                            <p className="text-sm mb-4" style={{ color: '#4a8a4a' }}>
                                박물관을 둘러보고 추억 사진을 올려줄 거예요 😊
                            </p>
                            <button
                                onClick={() => navigate('/museum')}
                                className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-110"
                                style={{ background: '#4a7a3a' }}
                            >
                                <Users size={14} className="inline mr-1.5" />
                                가족에게 요청하기
                            </button>
                        </div>
                    </Section>
                )}

                {/* ══ SECTION 5: 최근 게시판 ══ */}
                {role !== 'public' && (
                    <div ref={boardRef}>
                        <Section id="section-board">
                            <SectionHeader
                                title="최근 게시판"
                                actionLabel="게시판 전체보기"
                                onAction={() => navigate(`/${subdomain}/board`)}
                                icon={ClipboardList}
                            />

                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                                {boardLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                                    </div>
                                ) : posts.length === 0 ? (
                                    <EmptyState
                                        emoji="✏️"
                                        message="첫 글을 써보세요"
                                        actionLabel={canEdit ? '글쓰기' : undefined}
                                        onAction={() => setShowCreatePost(true)}
                                    />
                                ) : (
                                    <>
                                        {recentPosts.map((post) => (
                                            <PostRow key={post.id} post={post} t={t} onClick={() => setSelectedPostId(post.id)} />
                                        ))}
                                        {posts.length > 3 && (
                                            <div className="px-4 py-3 text-center border-t" style={{ borderColor: '#f0ece4' }}>
                                                <button
                                                    onClick={() => navigate(`/${subdomain}/board`)}
                                                    className="text-sm font-bold transition-colors hover:underline"
                                                    style={{ color: '#5a8a4a' }}
                                                >
                                                    게시판 전체보기 ({posts.length}개)
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* 글쓰기 버튼 */}
                            {canEdit && posts.length > 0 && (
                                <div className="mt-3 text-right">
                                    <button
                                        onClick={() => setShowCreatePost(true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                                        style={{ background: '#3a3a2a', color: '#fff' }}
                                    >
                                        <Pencil size={12} />
                                        {t.boardWriteBtn}
                                    </button>
                                </div>
                            )}
                        </Section>
                    </div>
                )}
            </main>

            {/* ════ 플로팅 업로드 버튼 (우측 하단) ════ */}
            {canEdit && (
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                >
                    <Plus size={24} />
                </button>
            )}

            {/* ════ 업로드 모달 ════ */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowUploadModal(false)}
                >
                    <div
                        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6 shadow-2xl"
                        style={{ border: '1.5px solid #e8e0d0' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>업로드</h3>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-full"
                                style={{ background: '#f0ece4' }}
                            >
                                <X size={14} style={{ color: '#7a7a6a' }} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => { setShowUploadModal(false); navigate(`/${subdomain}/gallery/new`); }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl border transition-colors hover:bg-gray-50"
                                style={{ borderColor: '#e8e0d0' }}
                            >
                                <Camera size={20} style={{ color: '#5a8a4a' }} />
                                <div className="text-left">
                                    <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>직접 올리기</p>
                                    <p className="text-xs" style={{ color: '#9a9a8a' }}>새 전시관을 만들고 사진을 올려보세요</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setShowUploadModal(false); navigate('/museum'); }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl border transition-colors hover:bg-gray-50"
                                style={{ borderColor: '#e8e0d0' }}
                            >
                                <Users size={20} style={{ color: '#3498db' }} />
                                <div className="text-left">
                                    <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>가족에게 요청하기</p>
                                    <p className="text-xs" style={{ color: '#9a9a8a' }}>가족을 초대해서 사진을 받아보세요</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ 게시글 상세 모달 ════ */}
            {selectedPostId && (
                <PostDetailModal
                    postId={selectedPostId}
                    onClose={() => { setSelectedPostId(null); if (role !== 'public') fetchPosts(); }}
                    canComment={role !== 'public'}
                    t={t}
                />
            )}

            {/* ════ 글쓰기 모달 ════ */}
            {showCreatePost && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                        style={{ border: '1.5px solid #e8e0d0' }}
                    >
                        <button
                            onClick={() => setShowCreatePost(false)}
                            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
                            style={{ background: '#f0ece4' }}
                        >
                            <X size={14} style={{ color: '#7a7a6a' }} />
                        </button>
                        <h3 className="text-lg font-bold mb-5" style={{ color: '#3a3a2a' }}>{t.boardModalTitle}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.boardCategoryLabel}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {BOARD_CATS.filter((c) => c.key !== 'all').map(({ key, label }) => {
                                        const meta = CATEGORY_META[key];
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setNewPost({ ...newPost, category: key })}
                                                className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                                                style={{
                                                    background: newPost.category === key ? meta.color : '#f0ece4',
                                                    color: newPost.category === key ? '#fff' : '#5a5a4a',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.boardTitleLabel}</label>
                                <input
                                    type="text"
                                    value={newPost.title}
                                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                                    placeholder={t.boardTitlePlaceholder}
                                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.boardContentLabel}</label>
                                <textarea
                                    value={newPost.content}
                                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                                    placeholder={t.boardContentPlaceholder}
                                    rows={5}
                                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm resize-none"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreatePost(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                                style={{ background: '#f0ece4', color: '#5a5a4a' }}
                            >
                                {t.boardCancelBtn}
                            </button>
                            <button
                                onClick={handleCreatePost}
                                disabled={!newPost.title.trim() || !newPost.content.trim() || postingPost}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                                style={{ background: '#3a3a2a', color: '#fff' }}
                            >
                                {postingPost ? t.boardPosting : t.boardSubmitBtn}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ 온보딩 가이드 ════ */}
            {showOnboarding && (
                <OnboardingGuide
                    onGoToTab={(tab) => {
                        const sectionMap = { tree: 'section-tree', exhibition: 'section-exhibition', calendar: 'section-calendar', board: 'section-board' };
                        const el = document.getElementById(sectionMap[tab]);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    onClose={() => setShowOnboarding(false)}
                    t={t}
                />
            )}

            {/* ════ 바이럴 배너 (방문자용) ════ */}
            {role === 'public' && isAuthenticated && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-40 border-t"
                    style={{ background: 'rgba(255,255,255,0.97)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
                >
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={handleFriendRequest}
                                disabled={friendRequested || friendRequesting}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all"
                                style={{
                                    background: friendRequested ? '#e8f5e0' : '#f0eaf8',
                                    color: friendRequested ? '#3a7a2a' : '#6a3a9a',
                                }}
                            >
                                <UserPlus size={14} />
                                {friendRequesting ? '...' : friendRequested ? '요청됨' : '친구 추가'}
                            </button>
                            <p className="text-sm font-medium truncate" style={{ color: '#3a3a2a' }}>
                                나도 가족 박물관 만들기
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/onboarding/service')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 text-white transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                        >
                            <Sparkles size={13} />
                            무료로 시작하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── 다가오는 행사 미리보기 (인라인 컴포넌트) ───
function UpcomingEventsPreview({ siteId, t }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const TYPE_EMOJI = {
        birthday: '🎂', anniversary: '💑', event: '🎉', memorial: '🕯️', trip: '✈️',
    };

    useEffect(() => {
        if (!siteId) return;
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;

        Promise.all([
            axios.get('/api/calendar', { params: { site_id: siteId, year: y, month: m } }),
            axios.get('/api/calendar', { params: { site_id: siteId, year: m === 12 ? y + 1 : y, month: m === 12 ? 1 : m + 1 } }),
        ]).then(([r1, r2]) => {
            const all = [...(r1.data?.data || []), ...(r2.data?.data || [])];
            const today = new Date(y, m - 1, now.getDate());
            const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

            const upcoming = all.filter(ev => {
                const d = new Date(ev.event_date);
                if (ev.is_recurring) {
                    const thisYear = new Date(y, d.getUTCMonth(), d.getUTCDate());
                    return thisYear >= today && thisYear <= limit;
                }
                return d >= today && d <= limit;
            }).sort((a, b) => {
                const da = new Date(a.event_date);
                const db = new Date(b.event_date);
                return da.getUTCDate() - db.getUTCDate();
            });

            setEvents(upcoming.slice(0, 3));
        }).catch(() => {}).finally(() => setLoading(false));
    }, [siteId]);

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-green-300 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="p-6 text-center" style={{ color: '#9a9a8a' }}>
                <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">이번 달 행사가 없습니다</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-2">
            {events.map((ev) => {
                const d = new Date(ev.event_date);
                const emoji = TYPE_EMOJI[ev.event_type] || '📅';
                return (
                    <div key={ev.id} className="flex items-center gap-3 py-2">
                        <span className="text-xl">{emoji}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: '#3a3a2a' }}>{ev.title}</p>
                            <p className="text-xs" style={{ color: '#9a9a8a' }}>
                                {String(d.getUTCMonth() + 1).padStart(2, '0')}/{String(d.getUTCDate()).padStart(2, '0')}
                                {ev.person_name && ` · ${ev.person_name}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
