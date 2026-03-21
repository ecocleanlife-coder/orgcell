import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    Globe, Lock, Image as ImageIcon,
    GalleryThumbnails, ClipboardList, TreePine, Settings,
    LogIn, Bell, Star, Calendar, MessageSquare, ChevronRight, Download,
    BookOpen, CalendarDays,
} from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FamilyTreeView from '../../components/museum/FamilyTreeView';
import FamilyCalendar from '../../components/museum/FamilyCalendar';
import AncestorHallTab from '../../components/museum/AncestorHallTab';
import UpcomingEventsWidget from '../../components/museum/UpcomingEventsWidget';
import PostDetailModal from '../../components/museum/PostDetailModal';
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

// ─── Skeleton card ───
function SkeletonCard() {
    return (
        <div className="rounded-2xl border bg-white animate-pulse" style={{ borderColor: '#e8e0d0', height: 180 }}>
            <div className="h-28 rounded-t-2xl bg-gray-200" />
            <div className="p-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function MuseumPage({ initialTab }) {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('museum', lang);
    const pt = getT('pwa', lang);
    const { token } = useAuthStore();

    const [site, setSite] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [activeTab, setActiveTab] = useState(initialTab || 'exhibition');
    const [exhSubTab, setExhSubTab] = useState('public');
    const [exhibitions, setExhibitions] = useState([]);
    const [exhLoading, setExhLoading] = useState(false);
    const [posts, setPosts] = useState([]);
    const [boardLoading, setBoardLoading] = useState(false);
    const [boardCategory, setBoardCategory] = useState('all');
    const [selectedPostId, setSelectedPostId] = useState(null);

    // ── PWA install prompt ──
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Detect standalone mode (already installed)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setIsInstalled(true));
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // ── Fetch museum info ──
    useEffect(() => {
        setLoading(true);
        setNotFound(false);
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        axios.get(`/api/museum/${subdomain}`, config)
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
    }, [subdomain, token]);

    // ── Fetch exhibitions ──
    const fetchExhibitions = useCallback(async (vis) => {
        if (!site) return;
        setExhLoading(true);
        try {
            const params = { site_id: site.id };
            // Public visitors can only see public exhibitions
            params.visibility = role === 'public' ? 'public' : vis;
            const res = await axios.get('/api/exhibitions', { params });
            if (res.data?.success) setExhibitions(res.data.data);
        } catch { /* silent */ }
        finally { setExhLoading(false); }
    }, [site, role]);

    useEffect(() => {
        if (activeTab === 'exhibition' && site && role !== null) {
            fetchExhibitions(exhSubTab);
        }
    }, [activeTab, exhSubTab, site, role, fetchExhibitions]);

    // ── Fetch board posts ──
    const fetchPosts = useCallback(async (category) => {
        if (!site) return;
        setBoardLoading(true);
        try {
            const params = { site_id: site.id };
            if (category !== 'all') params.category = category;
            const res = await axios.get('/api/board/posts', { params });
            if (res.data?.success) setPosts(res.data.data);
        } catch { /* silent */ }
        finally { setBoardLoading(false); }
    }, [site]);

    useEffect(() => {
        if (activeTab === 'board' && site) fetchPosts(boardCategory);
    }, [activeTab, boardCategory, site, fetchPosts]);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setInstallPrompt(null);
        }
    };

    if (loading) return <PageLoader />;

    if (notFound) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#f0ece4' }}>
                <GalleryThumbnails size={56} className="mb-4 opacity-30" />
                <p className="text-gray-500">{t.notFound}</p>
            </div>
        );
    }

    // ── Tab config ──
    const TABS = [
        { key: 'tree',       icon: TreePine,          label: t.tabTree },
        { key: 'exhibition', icon: GalleryThumbnails, label: t.tabExhibition },
        { key: 'ancestor',   icon: BookOpen,          label: t.tabAncestor },
        { key: 'calendar',   icon: CalendarDays,      label: t.tabCalendar },
        ...(role !== 'public' ? [{ key: 'board', icon: ClipboardList, label: t.tabBoard }] : []),
    ];

    const BOARD_CATS = [
        { key: 'all',    label: t.boardAll },
        { key: 'notice', label: t.boardNotice },
        { key: 'daily',  label: t.boardDaily },
        { key: 'event',  label: t.boardEvent },
        { key: 'memory', label: t.boardMemory },
    ];

    return (
        <div className="min-h-screen font-sans" style={{ background: '#f0ece4' }}>
            {/* ── Dynamic manifest per subdomain ── */}
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

            {/* ── Header + Tab Bar ── */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(248,244,236,0.96)', borderColor: '#e0d8c8', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe size={16} style={{ color: '#5a8a4a' }} />
                        <span className="font-bold text-sm" style={{ color: '#3a3a2a' }}>
                            {subdomain}.orgcell.com
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* PWA install button — shown to owner when installable */}
                        {role === 'owner' && installPrompt && !isInstalled && (
                            <button
                                onClick={handleInstall}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#4a7a3a', color: '#fff' }}
                            >
                                <Download size={13} />
                                {pt.installBtn}
                            </button>
                        )}
                        {role === 'owner' && (
                            <button
                                onClick={() => navigate('/museum')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: '#e8e0d0', color: '#5a5040' }}
                            >
                                <Settings size={13} />
                                {t.tabSettings}
                            </button>
                        )}
                        <LanguageSwitcher />
                    </div>
                </div>

                {/* Upcoming events widget */}
                <div className="max-w-6xl mx-auto px-4 mt-3">
                    <UpcomingEventsWidget siteId={museum?.id} t={t} />
                </div>

                {/* Tab bar */}
                <div className="max-w-6xl mx-auto px-2 flex">
                    {TABS.map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
                            style={{
                                borderColor: activeTab === key ? '#5a8a4a' : 'transparent',
                                color: activeTab === key ? '#5a8a4a' : '#7a7a6a',
                                background: 'transparent',
                            }}
                        >
                            <Icon size={15} />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">

                {/* ══ Family Tree ══ */}
                {activeTab === 'tree' && (
                    <div
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                        style={{ border: '1px solid #e8e0d0' }}
                    >
                        <FamilyTreeView siteId={site?.id} readOnly={role === 'public'} />
                    </div>
                )}

                {/* ══ Exhibitions ══ */}
                {activeTab === 'exhibition' && (
                    <div>
                        {role !== 'public' && (
                            <div className="flex gap-2 mb-5">
                                {[
                                    { key: 'public', label: t.subPublic },
                                    { key: 'family', label: t.subFamily },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setExhSubTab(key)}
                                        className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
                                        style={{
                                            background: exhSubTab === key ? '#5a8a4a' : '#ffffff',
                                            color: exhSubTab === key ? '#ffffff' : '#5a5a4a',
                                            border: '1.5px solid ' + (exhSubTab === key ? '#5a8a4a' : '#d8d0c0'),
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {exhLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : exhibitions.length === 0 ? (
                            <div className="text-center py-24" style={{ color: '#9a9a8a' }}>
                                <GalleryThumbnails size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm">{t.exhEmpty}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {exhibitions.map((exh) => (
                                    <ExhibitionCard
                                        key={exh.id}
                                        exh={exh}
                                        t={t}
                                        onClick={() => navigate(`/${subdomain}/gallery/${exh.id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ Ancestor Hall ══ */}
                {activeTab === 'ancestor' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                        <AncestorHallTab siteId={site?.id} subdomain={subdomain} role={role} t={t} />
                    </div>
                )}

                {/* ══ Family Calendar ══ */}
                {activeTab === 'calendar' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e8e0d0' }}>
                        <FamilyCalendar siteId={site?.id} role={role} t={t} />
                    </div>
                )}

                {/* ══ Family Board ══ */}
                {activeTab === 'board' && (
                    <div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <div className="flex gap-1.5 flex-wrap">
                                {BOARD_CATS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setBoardCategory(key)}
                                        className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                                        style={{
                                            background: boardCategory === key ? '#3a3a2a' : '#ffffff',
                                            color: boardCategory === key ? '#ffffff' : '#5a5a4a',
                                            border: '1.5px solid ' + (boardCategory === key ? '#3a3a2a' : '#d8d0c0'),
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div
                            className="bg-white rounded-2xl shadow-sm overflow-hidden"
                            style={{ border: '1px solid #e8e0d0' }}
                        >
                            {boardLoading ? (
                                <div className="p-8 text-center">
                                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-20" style={{ color: '#9a9a8a' }}>
                                    <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">{t.boardEmpty}</p>
                                </div>
                            ) : (
                                posts.map((post) => <PostRow key={post.id} post={post} t={t} onClick={() => setSelectedPostId(post.id)} />)
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ════ Modal: 게시글 상세 ════ */}
            {selectedPostId && (
                <PostDetailModal
                    postId={selectedPostId}
                    onClose={() => { setSelectedPostId(null); if (role !== 'public') fetchPosts(boardCategory); }}
                    canComment={role !== 'public'}
                    t={t}
                />
            )}
        </div>
    );
}
