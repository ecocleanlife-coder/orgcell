import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    GalleryThumbnails, Settings,
    LogIn, Bell, Star, Calendar, MessageSquare, Download,
    Plus, X, Pencil, UserPlus, Sparkles,
    Upload, Users,
} from 'lucide-react';
import axios from 'axios';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FamilyTreeView from '../../components/museum/FamilyTreeView';
import FamilySearchModal from '../../components/common/FamilySearchModal';
import DashboardCalendarWidget from '../../components/museum/DashboardCalendarWidget';
import DashboardExhibitionWidget from '../../components/museum/DashboardExhibitionWidget';
import PostDetailModal from '../../components/museum/PostDetailModal';
import OnboardingGuide from '../../components/museum/OnboardingGuide';
import UploadModal from '../../components/museum/UploadModal';
import FeaturePanel from '../../components/museum/FeaturePanel';
import PhotoImportModal from '../../components/museum/PhotoImportModal';
import VoiceRecordingModal from '../../components/museum/VoiceRecordingModal';
import InvitationModal from '../../components/museum/InvitationModal';
import AccessRequestManager from '../../components/museum/AccessRequestManager';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ─── Category meta (글쓰기 모달용) ───
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
    const [uploadInitialDest, setUploadInitialDest] = useState(null);
    const [showFsModal, setShowFsModal] = useState(false);

    // 자료실 모달
    const [showPhotoImport, setShowPhotoImport] = useState(false);
    const [showVoiceRecording, setShowVoiceRecording] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showAccessRequests, setShowAccessRequests] = useState(false);

    // 가족트리 인물 목록 (녹음 인물 선택용)
    const [treePersons, setTreePersons] = useState([]);

    // 친구 요청
    const [friendRequested, setFriendRequested] = useState(false);
    const [friendRequesting, setFriendRequesting] = useState(false);

    // PWA
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

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

    // ── Fetch persons for voice recording ──
    useEffect(() => {
        if (!site) return;
        axios.get(`/api/persons/${site.id}`)
            .then(r => { if (r.data?.data) setTreePersons(r.data.data); })
            .catch(() => {});
    }, [site]);

    // ── Feature panel handler ──
    const handleFeatureClick = useCallback((key) => {
        switch (key) {
            case 'photo': setShowPhotoImport(true); break;
            case 'board': setShowCreatePost(true); break;
            case 'voice': setShowVoiceRecording(true); break;
            case 'invite': setShowInviteModal(true); break;
            case 'access_requests': setShowAccessRequests(true); break;
        }
    }, []);

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

    const museumName = site?.museum_name || `${subdomain} 가족유산박물관`;
    const canEdit = role === 'owner' || role === 'member';

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
                    <div className="flex items-center gap-2 truncate">
                        <img src="/logo-icon-sm.png" alt="" style={{ height: 28, objectFit: 'contain' }} />
                        <h1 className="font-bold text-base truncate" style={{ color: '#3a3a2a' }}>
                            {museumName}
                        </h1>
                    </div>
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
            <main className="max-w-5xl mx-auto px-4 py-6 pb-28">

                {/* ══ 2열 대시보드 위젯 (대형 카드 버튼) ══ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                    <DashboardCalendarWidget
                        siteId={site?.id}
                        role={role}
                        t={t}
                        posts={posts}
                        boardLoading={boardLoading}
                        canEdit={canEdit}
                        onPostClick={(id) => setSelectedPostId(id)}
                        onWritePost={() => setShowCreatePost(true)}
                    />
                    <DashboardExhibitionWidget
                        siteId={site?.id}
                        role={role}
                        t={t}
                        subdomain={subdomain}
                        exhibitions={exhibitions}
                        exhLoading={exhLoading}
                        canEdit={canEdit}
                        onUpload={() => setShowUploadModal(true)}
                        onPrivateUpload={() => { setUploadInitialDest('private'); setShowUploadModal(true); }}
                        onNavigate={navigate}
                    />
                </div>

                {/* ══ 가족트리 + 자료실 (좌우 분할) ══ */}
                <Section id="section-tree">
                    <SectionHeader title="우리 가족" />
                    <div className="flex gap-5" style={{ minHeight: '70vh' }}>
                        {/* 좌측: 기존 가족트리 */}
                        <div className="flex-1 overflow-hidden">
                            <FamilyTreeView siteId={site?.id} readOnly={role === 'public'} role={role} />
                        </div>
                        {/* 우측: 자료실 버튼 패널 */}
                        {canEdit && (
                            <div className="hidden lg:block w-48 shrink-0">
                                <FeaturePanel onFeatureClick={handleFeatureClick} isOwner={role === 'owner'} />
                            </div>
                        )}
                    </div>
                    {/* 모바일: 자료실 버튼을 아래에 가로 배치 */}
                    {canEdit && (
                        <div className="lg:hidden mt-4">
                            <FeaturePanel onFeatureClick={handleFeatureClick} isOwner={role === 'owner'} />
                        </div>
                    )}
                </Section>

                {/* ══ 사진 요청 배너 ══ */}
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
                                박물관을 둘러보고 추억 사진을 올려줄 거예요
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
            </main>

            {/* ════ 플로팅 업로드 버튼 (우측 하단) ════ */}
            {canEdit && (
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #5A9460, #4A8450)', boxShadow: '0 4px 20px rgba(76,132,80,0.4)' }}
                >
                    <Plus size={24} />
                </button>
            )}

            {/* ════ 업로드 모달 (UploadModal 컴포넌트) ════ */}
            {showUploadModal && (
                <UploadModal
                    siteId={site?.id}
                    subdomain={subdomain}
                    initialDest={uploadInitialDest}
                    onClose={() => { setShowUploadModal(false); setUploadInitialDest(null); }}
                    onDone={() => { fetchExhibitions(); }}
                />
            )}

            {showFsModal && <FamilySearchModal onClose={() => setShowFsModal(false)} />}

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

            {/* ════ 사진 불러오기 모달 ════ */}
            {showPhotoImport && (
                <PhotoImportModal
                    siteId={site?.id}
                    onClose={() => setShowPhotoImport(false)}
                    onDone={() => { /* refresh if needed */ }}
                />
            )}

            {/* ════ 육성녹음 모달 ════ */}
            {showVoiceRecording && (
                <VoiceRecordingModal
                    siteId={site?.id}
                    persons={treePersons.map(p => ({ id: p.id, name: p.name }))}
                    onClose={() => setShowVoiceRecording(false)}
                />
            )}

            {/* ════ 초대 모달 ════ */}
            {showInviteModal && (
                <InvitationModal
                    siteId={site?.id}
                    museumName={museumName}
                    onClose={() => setShowInviteModal(false)}
                />
            )}

            {/* ════ 접근 요청 관리 모달 (관장 전용) ════ */}
            {showAccessRequests && (
                <AccessRequestManager
                    siteId={site?.id}
                    onClose={() => setShowAccessRequests(false)}
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
                                나도 가족유산박물관 만들기
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

