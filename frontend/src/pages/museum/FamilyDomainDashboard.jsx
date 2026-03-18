import React, { useState, useEffect, useCallback } from 'react';
import {
    TreePine, GalleryThumbnails, ClipboardList, Settings,
    Plus, Image as ImageIcon, Globe, Lock, X, ChevronRight,
    Copy, Check, LogOut, MessageSquare, Calendar, Star, Bell,
    UserPlus, Link, Mail, Share2,
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FamilyTreeView from '../../components/museum/FamilyTreeView';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ─── Category icon/color map ───
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
                    {exh.visibility === 'public'
                        ? <Globe size={10} />
                        : <Lock size={10} />}
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
function PostRow({ post, t }) {
    const meta = CATEGORY_META[post.category] || CATEGORY_META.daily;
    const Icon = meta.icon;
    const date = new Date(post.created_at).toLocaleDateString();
    return (
        <div
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

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function FamilyDomainDashboard() {
    const lang = useUiStore((s) => s.lang);
    const t = getT('museum', lang);
    const { logout } = useAuthStore();
    const navigate = useNavigate();

    // ── Site info ──
    const [site, setSite] = useState(null);

    // ── Active tab ──
    const [activeTab, setActiveTab] = useState('exhibition');
    const [exhSubTab, setExhSubTab] = useState('public');

    // ── Exhibition state ──
    const [exhibitions, setExhibitions] = useState([]);
    const [exhLoading, setExhLoading] = useState(false);
    const [showCreateExh, setShowCreateExh] = useState(false);
    const [newExh, setNewExh] = useState({ title: '', description: '', visibility: 'family' });
    const [creatingExh, setCreatingExh] = useState(false);

    // ── Board state ──
    const [posts, setPosts] = useState([]);
    const [boardLoading, setBoardLoading] = useState(false);
    const [boardCategory, setBoardCategory] = useState('all');
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'daily' });
    const [postingPost, setPostingPost] = useState(false);

    // ── Settings ──
    const [copied, setCopied] = useState(false);

    // ── Invite ──
    const [inviteUrl, setInviteUrl] = useState('');
    const [inviteGenerating, setInviteGenerating] = useState(false);
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteSending, setInviteSending] = useState(false);
    const [inviteSent, setInviteSent] = useState(false);

    // ── Fetch site ──
    useEffect(() => {
        axios.get('/api/sites/mine').then((r) => {
            if (r.data?.success && r.data?.data) setSite(r.data.data);
        }).catch(() => {});
    }, []);

    // ── Fetch exhibitions ──
    const fetchExhibitions = useCallback(async (vis) => {
        if (!site) return;
        setExhLoading(true);
        try {
            const res = await axios.get('/api/exhibitions', { params: { site_id: site.id, visibility: vis } });
            if (res.data?.success) setExhibitions(res.data.data);
        } catch { /* silent */ }
        finally { setExhLoading(false); }
    }, [site]);

    useEffect(() => {
        if (activeTab === 'exhibition' && site) fetchExhibitions(exhSubTab);
    }, [activeTab, exhSubTab, site, fetchExhibitions]);

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

    // ── Create exhibition ──
    const handleCreateExh = async () => {
        if (!newExh.title.trim() || !site) return;
        setCreatingExh(true);
        try {
            await axios.post('/api/exhibitions', { site_id: site.id, ...newExh });
            setShowCreateExh(false);
            setNewExh({ title: '', description: '', visibility: 'family' });
            fetchExhibitions(exhSubTab);
        } catch { /* silent */ }
        finally { setCreatingExh(false); }
    };

    // ── Create board post ──
    const handleCreatePost = async () => {
        if (!newPost.title.trim() || !newPost.content.trim() || !site) return;
        setPostingPost(true);
        try {
            await axios.post('/api/board/posts', { site_id: site.id, ...newPost });
            setShowCreatePost(false);
            setNewPost({ title: '', content: '', category: 'daily' });
            fetchPosts(boardCategory);
        } catch { /* silent */ }
        finally { setPostingPost(false); }
    };

    // ── Generate invite link ──
    const handleGenerateInvite = async () => {
        if (!site) return;
        setInviteGenerating(true);
        try {
            const res = await axios.post('/api/invite/create', { site_id: site.id });
            if (res.data?.success) setInviteUrl(res.data.data.url);
        } catch { /* silent */ }
        finally { setInviteGenerating(false); }
    };

    const handleCopyInviteLink = () => {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            setInviteLinkCopied(true);
            setTimeout(() => setInviteLinkCopied(false), 2000);
        });
    };

    const handleShareInvite = () => {
        const text = t.inviteLinkDesc + '\n' + inviteUrl;
        if (lang === 'ko') {
            window.open(`https://open.kakao.com/o/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`);
        } else if (lang === 'ja') {
            window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`);
        } else if (lang === 'es') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
        } else {
            window.open(`sms:?body=${encodeURIComponent(text)}`);
        }
    };

    const handleSendInviteEmail = async () => {
        if (!inviteEmail.trim() || !inviteUrl || !site) return;
        const code = new URL(inviteUrl).searchParams.get('code');
        setInviteSending(true);
        try {
            await axios.post('/api/invite/send-email', { email: inviteEmail, code, subdomain: site.subdomain });
            setInviteSent(true);
            setInviteEmail('');
            setTimeout(() => setInviteSent(false), 3000);
        } catch { /* silent */ }
        finally { setInviteSending(false); }
    };

    // ── Copy share link ──
    const handleCopy = () => {
        const url = site?.subdomain
            ? `https://${site.subdomain}.orgcell.com`
            : window.location.origin;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ─── Tab config ───
    const TABS = [
        { key: 'tree',       icon: TreePine,          label: t.tabTree },
        { key: 'exhibition', icon: GalleryThumbnails, label: t.tabExhibition },
        { key: 'board',      icon: ClipboardList,     label: t.tabBoard },
        { key: 'settings',   icon: Settings,          label: t.tabSettings },
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

            {/* ══ Header + Tab Bar ══ */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(248,244,236,0.96)', borderColor: '#e0d8c8', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe size={16} style={{ color: '#5a8a4a' }} />
                        <span className="font-bold text-sm" style={{ color: '#3a3a2a' }}>
                            {site?.subdomain ? `${site.subdomain}.orgcell.com` : 'orgcell.com'}
                        </span>
                    </div>
                    <LanguageSwitcher />
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

                {/* ══════════ 가족 트리 ══════════ */}
                {activeTab === 'tree' && (
                    <div
                        className="bg-white rounded-2xl shadow-sm overflow-hidden"
                        style={{ border: '1px solid #e8e0d0' }}
                    >
                        <FamilyTreeView />
                    </div>
                )}

                {/* ══════════ 전시관 ══════════ */}
                {activeTab === 'exhibition' && (
                    <div>
                        {/* Sub-tabs + create button */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex gap-2">
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
                            <button
                                onClick={() => setShowCreateExh(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold hover:brightness-95 transition-all"
                                style={{ background: '#5a8a4a', color: '#fff' }}
                            >
                                <Plus size={15} />
                                {t.exhCreateBtn}
                            </button>
                        </div>

                        {/* Exhibition grid */}
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
                                    <ExhibitionCard key={exh.id} exh={exh} t={t} onClick={() => navigate(`/museum/gallery/${exh.id}`)} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════ 가족 게시판 ══════════ */}
                {activeTab === 'board' && (
                    <div>
                        {/* Filter + write button */}
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
                            <button
                                onClick={() => setShowCreatePost(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                                style={{ background: '#3a3a2a', color: '#fff' }}
                            >
                                <Plus size={14} />
                                {t.boardWriteBtn}
                            </button>
                        </div>

                        {/* Post list */}
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
                                posts.map((post) => <PostRow key={post.id} post={post} t={t} />)
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════ 설정 ══════════ */}
                {activeTab === 'settings' && (
                    <div className="max-w-md space-y-4">
                        {/* Domain card */}
                        <div
                            className="bg-white rounded-2xl p-5 shadow-sm"
                            style={{ border: '1px solid #e8e0d0' }}
                        >
                            <p className="text-xs font-bold mb-1" style={{ color: '#9a9a8a' }}>{t.settingsDomain}</p>
                            <p className="font-bold text-lg" style={{ color: '#3a3a2a' }}>
                                {site?.subdomain ? `${site.subdomain}.orgcell.com` : '—'}
                            </p>
                        </div>

                        {/* Share link */}
                        <div
                            className="bg-white rounded-2xl p-5 shadow-sm"
                            style={{ border: '1px solid #e8e0d0' }}
                        >
                            <p className="text-xs font-bold mb-2" style={{ color: '#9a9a8a' }}>{t.settingsShare}</p>
                            <div className="flex items-center gap-2">
                                <span
                                    className="flex-1 text-sm px-3 py-2 rounded-lg truncate"
                                    style={{ background: '#f0ece4', color: '#5a5a4a' }}
                                >
                                    {site?.subdomain ? `https://${site.subdomain}.orgcell.com` : '—'}
                                </span>
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all"
                                    style={{
                                        background: copied ? '#e8f5e0' : '#e8e0d0',
                                        color: copied ? '#3a7a2a' : '#5a5040',
                                    }}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? t.settingsCopied : t.settingsCopy}
                                </button>
                            </div>
                        </div>

                        {/* ── 가족 초대하기 ── */}
                        <div
                            className="bg-white rounded-2xl p-5 shadow-sm space-y-5"
                            style={{ border: '1px solid #e8e0d0' }}
                        >
                            <div className="flex items-center gap-2">
                                <UserPlus size={16} style={{ color: '#5a8a4a' }} />
                                <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>{t.inviteTitle}</p>
                            </div>

                            {/* 방법 A — 초대 링크 */}
                            <div>
                                <p className="text-xs font-bold mb-1" style={{ color: '#7a7a6a' }}>{t.inviteLinkTitle}</p>
                                <p className="text-xs mb-3" style={{ color: '#9a9a8a' }}>{t.inviteLinkDesc}</p>

                                {!inviteUrl ? (
                                    <button
                                        onClick={handleGenerateInvite}
                                        disabled={inviteGenerating || !site}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                                        style={{ background: '#5a8a4a', color: '#fff' }}
                                    >
                                        <Link size={13} />
                                        {inviteGenerating ? t.inviteGenerating : t.inviteGenerate}
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="flex-1 text-xs px-3 py-2 rounded-lg truncate"
                                                style={{ background: '#f0ece4', color: '#5a5a4a' }}
                                            >
                                                {inviteUrl}
                                            </span>
                                            <button
                                                onClick={handleCopyInviteLink}
                                                className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                                                style={{
                                                    background: inviteLinkCopied ? '#e8f5e0' : '#e8e0d0',
                                                    color: inviteLinkCopied ? '#3a7a2a' : '#5a5040',
                                                }}
                                            >
                                                {inviteLinkCopied ? <Check size={12} /> : <Copy size={12} />}
                                                {inviteLinkCopied ? t.inviteLinkCopied : t.inviteLinkCopy}
                                            </button>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                onClick={handleShareInvite}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#f0ece4', color: '#5a5040' }}
                                            >
                                                <Share2 size={11} />
                                                {lang === 'ko' ? t.inviteShareKakao : lang === 'ja' ? t.inviteShareKakao : lang === 'es' ? t.inviteShareKakao : t.inviteShareSms}
                                            </button>
                                            <button
                                                onClick={() => window.open(`mailto:?subject=Orgcell%20Family%20Invite&body=${encodeURIComponent(inviteUrl)}`)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                style={{ background: '#f0ece4', color: '#5a5040' }}
                                            >
                                                <Mail size={11} />
                                                {t.inviteShareEmail}
                                            </button>
                                            <button
                                                onClick={handleGenerateInvite}
                                                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                                style={{ color: '#9a9a8a' }}
                                            >
                                                ↻ {t.inviteGenerate}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 방법 B — 이메일 초대 */}
                            <div style={{ borderTop: '1px solid #f0ece4', paddingTop: 16 }}>
                                <p className="text-xs font-bold mb-2" style={{ color: '#7a7a6a' }}>{t.inviteEmailTitle}</p>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder={t.inviteEmailPlaceholder}
                                        className="flex-1 px-3 py-2 rounded-xl outline-none text-xs"
                                        style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                        onKeyDown={(e) => e.key === 'Enter' && !inviteUrl && handleGenerateInvite()}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!inviteUrl) await handleGenerateInvite();
                                            handleSendInviteEmail();
                                        }}
                                        disabled={!inviteEmail.trim() || inviteSending}
                                        className="px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 shrink-0 flex items-center gap-1 transition-all"
                                        style={{ background: inviteSent ? '#e8f5e0' : '#3a3a2a', color: inviteSent ? '#3a7a2a' : '#fff' }}
                                    >
                                        {inviteSent ? <Check size={12} /> : <Mail size={12} />}
                                        {inviteSent ? t.inviteSent : inviteSending ? t.inviteSending : t.inviteSendBtn}
                                    </button>
                                </div>
                                <p className="text-xs mt-2" style={{ color: '#b0b0a0' }}>{t.inviteExpiry}</p>
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={() => { logout(); window.location.href = '/'; }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all"
                            style={{ background: '#ffffff', color: '#c0392b', border: '1.5px solid #f0ccc8' }}
                        >
                            <LogOut size={15} />
                            {t.settingsLogout}
                        </button>
                    </div>
                )}
            </main>

            {/* ════ Modal: 전시관 만들기 ════ */}
            {showCreateExh && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
                        style={{ border: '1.5px solid #e8e0d0' }}
                    >
                        <button
                            onClick={() => setShowCreateExh(false)}
                            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
                            style={{ background: '#f0ece4' }}
                        >
                            <X size={14} style={{ color: '#7a7a6a' }} />
                        </button>
                        <h3 className="text-lg font-bold mb-5" style={{ color: '#3a3a2a' }}>{t.exhModalTitle}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.exhTitleLabel}</label>
                                <input
                                    type="text"
                                    value={newExh.title}
                                    onChange={(e) => setNewExh({ ...newExh, title: e.target.value })}
                                    placeholder={t.exhTitlePlaceholder}
                                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.exhDescLabel}</label>
                                <textarea
                                    value={newExh.description}
                                    onChange={(e) => setNewExh({ ...newExh, description: e.target.value })}
                                    placeholder={t.exhDescPlaceholder}
                                    rows={3}
                                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm resize-none"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a' }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold block mb-1" style={{ color: '#7a7a6a' }}>{t.exhVisLabel}</label>
                                <select
                                    value={newExh.visibility}
                                    onChange={(e) => setNewExh({ ...newExh, visibility: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                                    style={{ border: '1.5px solid #d8d0c0', color: '#3a3a2a', background: '#fff' }}
                                >
                                    <option value="public">{t.exhVisPublic}</option>
                                    <option value="family">{t.exhVisFamily}</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateExh(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                                style={{ background: '#f0ece4', color: '#5a5a4a' }}
                            >
                                {t.exhCancelBtn}
                            </button>
                            <button
                                onClick={handleCreateExh}
                                disabled={!newExh.title.trim() || creatingExh}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                                style={{ background: '#5a8a4a', color: '#fff' }}
                            >
                                {creatingExh ? t.exhCreating : t.exhSubmitBtn}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ Modal: 글 쓰기 ════ */}
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
                                    rows={4}
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
        </div>
    );
}
