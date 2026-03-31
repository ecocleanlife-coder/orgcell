import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Upload, Share2, Globe, Lock, User,
    X, Download, ChevronLeft, ChevronRight,
    Link2, Check, Image as ImageIcon, BookOpen,
    Play, Pause, Grid, Maximize2, Settings, Trash2,
    FolderInput, CheckSquare,
} from 'lucide-react';
import axios from 'axios';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

// ─── visibility badge ───
const VIS_STYLE = {
    public:  { bg: '#e8f5e0', color: '#3a7a2a', icon: Globe },
    family:  { bg: '#f0eaf8', color: '#7a3a9a', icon: Lock },
    private: { bg: '#f0f0f0', color: '#5a5a5a', icon: User },
};

function VisBadge({ vis, label }) {
    const s = VIS_STYLE[vis] || VIS_STYLE.private;
    const Icon = s.icon;
    return (
        <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: s.bg, color: s.color }}
        >
            <Icon size={11} /> {label}
        </span>
    );
}

// ─── Photo Viewer Overlay ───
function PhotoViewer({ photos, startIndex, onClose, t }) {
    const [idx, setIdx] = useState(startIndex);
    const photo = photos[idx];

    const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIdx((i) => Math.min(photos.length - 1, i + 1)), [photos.length]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [prev, next, onClose]);

    if (!photo) return null;

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = photo.url;
        a.download = photo.original_name || photo.filename;
        a.click();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(10,10,10,0.93)' }}
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full z-10"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                onClick={onClose}
            >
                <X size={20} style={{ color: '#fff' }} />
            </button>

            <button
                className="absolute top-4 right-16 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold z-10"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            >
                <Download size={16} /> {t.viewerDownload}
            </button>

            {idx > 0 && (
                <button
                    className="absolute left-4 w-11 h-11 flex items-center justify-center rounded-full z-10"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                    onClick={(e) => { e.stopPropagation(); prev(); }}
                >
                    <ChevronLeft size={24} style={{ color: '#fff' }} />
                </button>
            )}

            {idx < photos.length - 1 && (
                <button
                    className="absolute right-4 w-11 h-11 flex items-center justify-center rounded-full z-10"
                    style={{ background: 'rgba(255,255,255,0.12)' }}
                    onClick={(e) => { e.stopPropagation(); next(); }}
                >
                    <ChevronRight size={24} style={{ color: '#fff' }} />
                </button>
            )}

            <img
                src={photo.url}
                alt={photo.original_name || ''}
                className="max-w-full max-h-full object-contain select-none"
                style={{ maxHeight: '90vh', maxWidth: '90vw' }}
                onClick={(e) => e.stopPropagation()}
                draggable={false}
            />

            <span
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
                {idx + 1} / {photos.length}
            </span>
        </div>
    );
}

// ─── Slideshow Panel ───
const SPEED_OPTIONS = [
    { key: 3000, label: '3초' },
    { key: 5000, label: '5초' },
    { key: 10000, label: '10초' },
];

function SlideshowPanel({ photos, t, onFullscreen }) {
    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [speed, setSpeed] = useState(() => {
        try { return parseInt(localStorage.getItem('orgcell_slideshow_speed')) || 4000; } catch { return 4000; }
    });
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!playing || photos.length <= 1) {
            clearInterval(intervalRef.current);
            return;
        }
        intervalRef.current = setInterval(() => {
            setIdx((i) => (i + 1) % photos.length);
        }, speed);
        return () => clearInterval(intervalRef.current);
    }, [playing, photos.length, speed]);

    const changeSpeed = (ms) => {
        setSpeed(ms);
        setShowSpeedMenu(false);
        try { localStorage.setItem('orgcell_slideshow_speed', String(ms)); } catch {}
    };

    if (photos.length === 0) {
        return (
            <div className="rounded-2xl flex flex-col items-center justify-center py-24"
                style={{ background: '#fff', border: '1px solid #e8e0d0', color: '#9a9a8a' }}>
                <ImageIcon size={48} className="mb-3 opacity-25" />
                <p className="text-sm">{t.emptyPhotos}</p>
            </div>
        );
    }

    const photo = photos[idx];

    return (
        <div className="relative rounded-2xl overflow-hidden" style={{ background: '#1a1a1a' }}>
            {/* 슬라이드 이미지 */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.original_name || ''}
                    className="absolute inset-0 w-full h-full object-contain animate-fade-in"
                    draggable={false}
                />
            </div>

            {/* 컨트롤 바 */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <div className="flex items-center gap-2">
                    {/* Prev */}
                    <button
                        onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                        <ChevronLeft size={16} style={{ color: '#fff' }} />
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={() => setPlaying((v) => !v)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                        {playing
                            ? <Pause size={14} style={{ color: '#fff' }} />
                            : <Play size={14} style={{ color: '#fff' }} />}
                    </button>

                    {/* Next */}
                    <button
                        onClick={() => setIdx((i) => (i + 1) % photos.length)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                        <ChevronRight size={16} style={{ color: '#fff' }} />
                    </button>
                </div>

                {/* Counter + Speed + Fullscreen */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {idx + 1} / {photos.length}
                    </span>
                    {/* Speed settings */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSpeedMenu((v) => !v)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: 'rgba(255,255,255,0.15)' }}
                            title="슬라이드쇼 속도"
                        >
                            <Settings size={13} style={{ color: '#fff' }} />
                        </button>
                        {showSpeedMenu && (
                            <div className="absolute bottom-10 right-0 bg-white rounded-xl shadow-xl overflow-hidden" style={{ minWidth: 100, border: '1px solid #e8e0d0' }}>
                                {SPEED_OPTIONS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => changeSpeed(key)}
                                        className="w-full px-3 py-2 text-xs font-semibold text-left hover:bg-gray-50 flex items-center justify-between"
                                        style={{ color: speed === key ? '#5a8a4a' : '#3a3a2a' }}
                                    >
                                        {label}
                                        {speed === key && <Check size={12} style={{ color: '#5a8a4a' }} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onFullscreen(idx)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                        <Maximize2 size={14} style={{ color: '#fff' }} />
                    </button>
                </div>
            </div>

            {/* 프로그레스 도트 (10개 이하일 때만) */}
            {photos.length <= 10 && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            className="w-2 h-2 rounded-full transition-all"
                            style={{
                                background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)',
                                transform: i === idx ? 'scale(1.3)' : 'scale(1)',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Upload Modal ───
function UploadModal({ exhibitionId, t, onClose, onDone }) {
    const [files, setFiles] = useState([]);
    const [visibility, setVisibility] = useState('private');
    const [setCover, setSetCover] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef(null);

    const addFiles = (newFiles) => {
        const valid = Array.from(newFiles).filter((f) =>
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'].includes(f.type)
        );
        setFiles((prev) => {
            const names = new Set(prev.map((f) => f.name + f.size));
            return [...prev, ...valid.filter((f) => !names.has(f.name + f.size))];
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (files.length === 0) { setError(t.uploadEmpty); return; }
        setError('');
        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        files.forEach((f) => formData.append('photos', f));
        formData.append('visibility', visibility);
        formData.append('set_cover', String(setCover));

        try {
            await axios.post(`/api/exhibitions/${exhibitionId}/photos`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (e) => {
                    if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
                },
            });
            setDone(true);
            setTimeout(() => { onDone(); onClose(); }, 800);
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const previews = files.slice(0, 6);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(30,25,40,0.6)', backdropFilter: 'blur(4px)' }}
        >
            <div
                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
                style={{ border: '1.5px solid #e8e0d0' }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ background: '#f0ece4' }}
                >
                    <X size={14} style={{ color: '#7a7a6a' }} />
                </button>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#3a3a2a' }}>{t.uploadModalTitle}</h3>

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4"
                    style={{
                        borderColor: dragging ? '#5a8a4a' : '#d8d0c0',
                        background: dragging ? '#f0f7ec' : '#faf8f4',
                    }}
                >
                    <ImageIcon size={32} className="mx-auto mb-2 opacity-30" style={{ color: '#5a5a4a' }} />
                    <p className="text-sm" style={{ color: '#7a7a6a' }}>
                        {t.uploadDrop}{' '}
                        <span className="font-bold underline" style={{ color: '#5a8a4a' }}>{t.uploadBrowse}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#aaa' }}>{t.uploadAccept}</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addFiles(e.target.files)}
                    />
                </div>

                {/* Preview */}
                {files.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-4">
                        {previews.map((f, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group" style={{ background: '#f0ece4' }}>
                                <img
                                    src={URL.createObjectURL(f)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={10} style={{ color: '#fff' }} />
                                </button>
                            </div>
                        ))}
                        {files.length > 6 && (
                            <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#f0ece4', color: '#7a7a6a' }}>
                                +{files.length - 6}
                            </div>
                        )}
                    </div>
                )}

                {/* Options */}
                <div className="space-y-3 mb-4">
                    <div>
                        <label className="text-xs font-bold block mb-1.5" style={{ color: '#7a7a6a' }}>{t.uploadVisLabel}</label>
                        <div className="flex gap-2">
                            {[
                                { key: 'public',  label: t.uploadVisPublic },
                                { key: 'family',  label: t.uploadVisFamily },
                                { key: 'private', label: t.uploadVisPrivate },
                            ].map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setVisibility(key)}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                    style={{
                                        background: visibility === key ? '#3a3a2a' : '#f0ece4',
                                        color: visibility === key ? '#fff' : '#5a5a4a',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                            onClick={() => setSetCover((v) => !v)}
                            className="w-10 h-5 rounded-full transition-colors relative"
                            style={{ background: setCover ? '#5a8a4a' : '#d8d0c0' }}
                        >
                            <span
                                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                style={{ transform: setCover ? 'translateX(20px)' : 'translateX(2px)' }}
                            />
                        </div>
                        <span className="text-xs font-medium" style={{ color: '#5a5a4a' }}>{t.uploadCoverLabel}</span>
                    </label>
                </div>

                {/* Progress */}
                {uploading && (
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1" style={{ color: '#7a7a6a' }}>
                            <span>{t.uploadProgress}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e8e0d0' }}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, background: '#5a8a4a' }}
                            />
                        </div>
                    </div>
                )}

                {done && (
                    <div className="mb-4 text-center text-sm font-bold flex items-center justify-center gap-1" style={{ color: '#3a7a2a' }}>
                        <Check size={16} /> {t.uploadDone}
                    </div>
                )}

                {error && (
                    <p className="mb-3 text-xs font-bold text-red-500">{error}</p>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                        style={{ background: '#f0ece4', color: '#5a5a4a' }}
                    >
                        {t.uploadCancel}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || files.length === 0}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                        style={{ background: '#3a3a2a', color: '#fff' }}
                    >
                        {uploading ? t.uploadSubmitting : `${t.uploadSubmitBtn} (${files.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Share Dropdown ───
function ShareDropdown({ url, t, lang, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => { setCopied(false); onClose(); }, 1500);
        });
    };

    const encoded = encodeURIComponent(url);

    const handleSNS = () => {
        if (lang === 'ko') {
            const kakaoKey = import.meta.env.VITE_KAKAO_APP_KEY || '';
            if (kakaoKey && window.Kakao && window.Kakao.isInitialized()) {
                window.Kakao.Share.sendDefault({
                    objectType: 'feed',
                    content: {
                        title: 'Family Museum',
                        imageUrl: 'https://orgcell.com/pwa-512x512.png',
                        link: { mobileWebUrl: url, webUrl: url },
                    },
                });
            } else {
                window.open(`https://story.kakao.com/share?url=${encoded}`, '_blank');
            }
        } else if (lang === 'ja') {
            window.open(`https://social-plugins.line.me/lineit/share?url=${encoded}`, '_blank');
        } else if (lang === 'es') {
            window.open(`https://wa.me/?text=${encoded}`, '_blank');
        } else {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank');
        }
        onClose();
    };

    const snsLabel = lang === 'ko' ? t.shareKakao : lang === 'ja' ? t.shareLine : lang === 'es' ? t.shareWhatsApp : t.shareFacebook;
    const snsIcon = lang === 'ko' ? '💬' : lang === 'ja' ? '💚' : lang === 'es' ? '💬' : '📘';

    return (
        <div
            className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
            style={{ border: '1.5px solid #e8e0d0', minWidth: 180 }}
        >
            <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
                style={{ color: '#3a3a2a' }}
            >
                {copied ? <Check size={16} style={{ color: '#3a7a2a' }} /> : <Link2 size={16} style={{ color: '#7a7a6a' }} />}
                {copied ? t.shareCopied : t.shareCopy}
            </button>
            <button
                onClick={handleSNS}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors border-t"
                style={{ color: '#3a3a2a', borderColor: '#f0ece4' }}
            >
                <span className="text-base leading-none">{snsIcon}</span>
                {snsLabel}
            </button>
        </div>
    );
}

// ─── Tab constants ───
const TABS = ['slideshow', 'gallery', 'guestbook'];
const TAB_ICONS = { slideshow: Play, gallery: Grid, guestbook: BookOpen };

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function ExhibitionDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('galleryDetail', lang);
    const { token } = useAuthStore();

    const [exhibition, setExhibition] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [guestbook, setGuestbook] = useState([]);
    const [loadingExh, setLoadingExh] = useState(true);
    const [viewerIndex, setViewerIndex] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [activeTab, setActiveTab] = useState('slideshow');

    // Guestbook form
    const [gbName, setGbName] = useState('');
    const [gbMsg, setGbMsg] = useState('');
    const [gbSubmitting, setGbSubmitting] = useState(false);

    // Multi-select mode
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showVisSettings, setShowVisSettings] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [exhRes, photoRes, gbRes] = await Promise.all([
                axios.get(`/api/exhibitions/${id}`),
                axios.get(`/api/exhibitions/${id}/photos`),
                axios.get(`/api/exhibitions/${id}/guestbook`),
            ]);
            if (exhRes.data?.success) setExhibition(exhRes.data.data);
            if (photoRes.data?.success) setPhotos(photoRes.data.data);
            if (gbRes.data?.success) setGuestbook(gbRes.data.data);
        } catch { /* silent */ }
        finally { setLoadingExh(false); }
    }, [id]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Multi-select helpers
    const togglePhotoSelect = (photoId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId);
            else next.add(photoId);
            return next;
        });
    };

    const handleLongPress = (photoId) => {
        if (!token) return;
        setSelectMode(true);
        setSelectedIds(new Set([photoId]));
    };

    const handleMovePhotos = async (targetExhId) => {
        const ids = Array.from(selectedIds);
        try {
            await axios.post(`/api/exhibitions/${id}/photos/move`, {
                photo_ids: ids,
                target_exhibition_id: targetExhId,
            });
            setSelectedIds(new Set());
            setSelectMode(false);
            setShowMoveModal(false);
            fetchAll();
        } catch { /* silent */ }
    };

    const handleDeleteSelected = async () => {
        if (!window.confirm(`${selectedIds.size}장을 삭제하시겠습니까?`)) return;
        const ids = Array.from(selectedIds);
        try {
            await Promise.all(ids.map((pid) => axios.delete(`/api/exhibitions/${id}/photos/${pid}`)));
            setSelectedIds(new Set());
            setSelectMode(false);
            fetchAll();
        } catch { /* silent */ }
    };

    const handleDownloadSelected = () => {
        const selected = photos.filter((p) => selectedIds.has(p.id));
        selected.forEach((p) => {
            const a = document.createElement('a');
            a.href = p.url;
            a.download = p.original_name || p.filename;
            a.click();
        });
    };

    const handleUpdateVisibility = async (vis) => {
        try {
            await axios.put(`/api/exhibitions/${id}`, { visibility: vis });
            setExhibition((prev) => ({ ...prev, visibility: vis }));
            setShowVisSettings(false);
        } catch { /* silent */ }
    };

    // Close share dropdown on outside click
    useEffect(() => {
        if (!showShare) return;
        const handler = () => setShowShare(false);
        setTimeout(() => document.addEventListener('click', handler), 0);
        return () => document.removeEventListener('click', handler);
    }, [showShare]);

    // Submit guestbook
    const handleGbSubmit = async () => {
        if (!gbName.trim() || !gbMsg.trim()) return;
        setGbSubmitting(true);
        try {
            const res = await axios.post(`/api/exhibitions/${id}/guestbook`, {
                name: gbName.trim(),
                message: gbMsg.trim(),
            });
            if (res.data?.success) {
                setGuestbook((prev) => [res.data.data, ...prev]);
                setGbName('');
                setGbMsg('');
            }
        } catch { /* silent */ }
        finally { setGbSubmitting(false); }
    };

    const pageUrl = window.location.href;
    const visLabel = { public: t.visPublic, family: t.visFamily, private: t.visPrivate };
    const tabLabels = {
        slideshow: t.tabSlideshow || 'Slideshow',
        gallery: t.tabGallery || 'Gallery',
        guestbook: t.tabGuestbook || t.guestbookTitle || 'Guestbook',
    };

    if (loadingExh) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0ece4' }}>
                <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!exhibition) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0ece4' }}>
                <p style={{ color: '#9a9a8a' }}>Exhibition not found.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans pb-24" style={{ background: '#f0ece4' }}>

            {/* ── Header ── */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(248,244,236,0.96)', borderColor: '#e0d8c8', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
                        style={{ color: '#5a5a4a' }}
                    >
                        <ArrowLeft size={16} />
                        {t.backBtn}
                    </button>

                    <h1 className="flex-1 text-base font-bold truncate text-center" style={{ color: '#3a3a2a' }}>
                        {exhibition.title}
                    </h1>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowShare((v) => !v)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                                style={{ background: '#e8e0d0', color: '#5a5040' }}
                            >
                                <Share2 size={14} />
                                {t.shareBtn}
                            </button>
                            {showShare && (
                                <ShareDropdown
                                    url={pageUrl}
                                    t={t}
                                    lang={lang}
                                    onClose={() => setShowShare(false)}
                                />
                            )}
                        </div>

                        {token && (
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                                style={{ background: '#5a8a4a', color: '#fff' }}
                            >
                                <Upload size={14} />
                                {t.uploadBtn}
                            </button>
                        )}

                        <LanguageSwitcher />
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">

                {/* ── Exhibition info ── */}
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <VisBadge vis={exhibition.visibility} label={visLabel[exhibition.visibility] || exhibition.visibility} />
                        <span className="text-sm" style={{ color: '#9a9a8a' }}>
                            {photos.length} {t.photoCount}
                        </span>
                    </div>
                    {exhibition.description && (
                        <p className="text-sm leading-relaxed" style={{ color: '#6a6a5a' }}>{exhibition.description}</p>
                    )}
                </div>

                {/* ── 3-Panel Tabs ── */}
                <div className="flex gap-1 mb-6 bg-white rounded-xl p-1" style={{ border: '1px solid #e8e0d0' }}>
                    {TABS.map((tab) => {
                        const Icon = TAB_ICONS[tab];
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all"
                                style={{
                                    background: isActive ? '#3a3a2a' : 'transparent',
                                    color: isActive ? '#fff' : '#7a7a6a',
                                }}
                            >
                                <Icon size={14} />
                                {tabLabels[tab]}
                                {tab === 'guestbook' && guestbook.length > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full ml-0.5"
                                        style={{
                                            background: isActive ? 'rgba(255,255,255,0.2)' : '#f0ece4',
                                            color: isActive ? '#fff' : '#7a7a6a',
                                            fontSize: '10px',
                                        }}>
                                        {guestbook.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Panel: Slideshow ── */}
                {activeTab === 'slideshow' && (
                    <SlideshowPanel
                        photos={photos}
                        t={t}
                        onFullscreen={(idx) => setViewerIndex(idx)}
                    />
                )}

                {/* ── Panel: Gallery (멀티셀렉트 지원) ── */}
                {activeTab === 'gallery' && (
                    <>
                        {/* 멀티셀렉트 / 공개범위 설정 툴바 */}
                        {token && photos.length > 0 && (
                            <div className="flex items-center justify-between mb-3">
                                <button
                                    onClick={() => { setSelectMode((v) => !v); setSelectedIds(new Set()); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                                    style={{
                                        background: selectMode ? '#3a3a2a' : '#e8e0d0',
                                        color: selectMode ? '#fff' : '#5a5040',
                                    }}
                                >
                                    <CheckSquare size={13} />
                                    {selectMode ? '선택 취소' : '선택'}
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowVisSettings((v) => !v)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                                        style={{ background: '#e8e0d0', color: '#5a5040' }}
                                    >
                                        <Settings size={13} />
                                        공개 범위
                                    </button>
                                    {showVisSettings && (
                                        <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl z-10 overflow-hidden" style={{ border: '1px solid #e8e0d0', minWidth: 160 }}>
                                            {[
                                                { key: 'family', label: '가족만', icon: Lock },
                                                { key: 'public', label: '일반공개', icon: Globe },
                                                { key: 'private', label: '나만', icon: User },
                                            ].map(({ key, label, icon: Icon }) => (
                                                <button
                                                    key={key}
                                                    onClick={() => handleUpdateVisibility(key)}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left hover:bg-gray-50"
                                                    style={{ color: exhibition.visibility === key ? '#5a8a4a' : '#3a3a2a' }}
                                                >
                                                    <Icon size={13} />
                                                    {label}
                                                    {exhibition.visibility === key && <Check size={12} className="ml-auto" style={{ color: '#5a8a4a' }} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {photos.length === 0 ? (
                            <div
                                className="rounded-2xl flex flex-col items-center justify-center py-24"
                                style={{ background: '#fff', border: '1px solid #e8e0d0', color: '#9a9a8a' }}
                            >
                                <ImageIcon size={48} className="mb-3 opacity-25" />
                                <p className="text-sm">{t.emptyPhotos}</p>
                                {token && (
                                    <button
                                        onClick={() => setShowUpload(true)}
                                        className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
                                        style={{ background: '#5a8a4a', color: '#fff' }}
                                    >
                                        <Upload size={14} className="inline mr-1.5" />
                                        {t.uploadBtn}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                                {photos.map((photo, i) => {
                                    const isSelected = selectedIds.has(photo.id);
                                    let longPressTimer = null;
                                    return (
                                        <div
                                            key={photo.id}
                                            className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:brightness-90 transition-all relative"
                                            style={{ background: '#e8e0d0' }}
                                            onClick={() => {
                                                if (selectMode) togglePhotoSelect(photo.id);
                                                else setViewerIndex(i);
                                            }}
                                            onTouchStart={() => { longPressTimer = setTimeout(() => handleLongPress(photo.id), 500); }}
                                            onTouchEnd={() => clearTimeout(longPressTimer)}
                                            onTouchMove={() => clearTimeout(longPressTimer)}
                                        >
                                            <img
                                                src={photo.url}
                                                alt={photo.original_name || ''}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                            {selectMode && (
                                                <div
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2"
                                                    style={{
                                                        background: isSelected ? '#5a8a4a' : 'rgba(255,255,255,0.7)',
                                                        borderColor: isSelected ? '#5a8a4a' : 'rgba(255,255,255,0.9)',
                                                    }}
                                                >
                                                    {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── Panel: Guestbook ── */}
                {activeTab === 'guestbook' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #e8e0d0' }}>
                        <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#3a3a2a' }}>
                            <BookOpen size={18} style={{ color: '#5a8a4a' }} />
                            {t.guestbookTitle}
                            {guestbook.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0ece4', color: '#7a7a6a' }}>
                                    {guestbook.length}
                                </span>
                            )}
                        </h2>

                        {/* Write form */}
                        <div className="space-y-2 mb-6 pb-6 border-b" style={{ borderColor: '#f0ece4' }}>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    value={gbName}
                                    onChange={(e) => setGbName(e.target.value)}
                                    placeholder={t.guestbookNamePlaceholder}
                                    className="col-span-1 px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ border: '1.5px solid #e8e0d0', color: '#3a3a2a' }}
                                />
                                <input
                                    type="text"
                                    value={gbMsg}
                                    onChange={(e) => setGbMsg(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGbSubmit()}
                                    placeholder={t.guestbookMsgPlaceholder}
                                    className="col-span-2 px-3 py-2 rounded-xl text-sm outline-none"
                                    style={{ border: '1.5px solid #e8e0d0', color: '#3a3a2a' }}
                                />
                            </div>
                            <button
                                onClick={handleGbSubmit}
                                disabled={!gbName.trim() || !gbMsg.trim() || gbSubmitting}
                                className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                                style={{ background: '#3a3a2a', color: '#fff' }}
                            >
                                {gbSubmitting ? t.guestbookSubmitting : t.guestbookSubmit}
                            </button>
                        </div>

                        {/* Messages */}
                        {guestbook.length === 0 ? (
                            <p className="text-sm text-center py-6" style={{ color: '#aaa' }}>{t.guestbookEmpty}</p>
                        ) : (
                            <div className="space-y-3">
                                {guestbook.map((entry) => (
                                    <div key={entry.id} className="flex gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                                            style={{ background: '#e8e0d0', color: '#5a5a4a' }}
                                        >
                                            {entry.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-bold" style={{ color: '#3a3a2a' }}>{entry.name}</span>
                                                <span className="text-xs" style={{ color: '#aaa' }}>
                                                    {new Date(entry.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-0.5 break-words" style={{ color: '#5a5a4a' }}>{entry.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Footer CTA ── */}
                <a
                    href="https://orgcell.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold transition-all hover:brightness-95 mt-8"
                    style={{
                        background: 'linear-gradient(135deg, #3a8a3a 0%, #2a7a2a 100%)',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(50,120,50,0.2)',
                    }}
                >
                    {t.footerCta}
                </a>
            </main>

            {/* ── Photo Viewer ── */}
            {viewerIndex !== null && (
                <PhotoViewer
                    photos={photos}
                    startIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                    t={t}
                />
            )}

            {/* ── Upload Modal ── */}
            {showUpload && (
                <UploadModal
                    exhibitionId={id}
                    t={t}
                    onClose={() => setShowUpload(false)}
                    onDone={fetchAll}
                />
            )}

            {/* ── 멀티셀렉트 하단 액션바 ── */}
            {selectMode && selectedIds.size > 0 && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-40 border-t"
                    style={{ background: 'rgba(255,255,255,0.97)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
                >
                    <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: '#3a3a2a' }}>
                            {selectedIds.size}장 선택
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowMoveModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                                style={{ background: '#5a8a4a' }}
                            >
                                <FolderInput size={13} />
                                이동
                            </button>
                            <button
                                onClick={handleDownloadSelected}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                                style={{ background: '#e8e0d0', color: '#5a5040' }}
                            >
                                <Download size={13} />
                                다운로드
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
                                style={{ background: '#fee2e2', color: '#dc2626' }}
                            >
                                <Trash2 size={13} />
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 사진 이동 모달 ── */}
            {showMoveModal && (
                <MoveToModal
                    exhibitionId={id}
                    siteId={exhibition?.site_id}
                    onMove={handleMovePhotos}
                    onClose={() => setShowMoveModal(false)}
                />
            )}
        </div>
    );
}

// ─── 이동 목적지 선택 모달 ───
function MoveToModal({ exhibitionId, siteId, onMove, onClose }) {
    const [exhibitions, setExhibitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!siteId) return;
        axios.get('/api/exhibitions', { params: { site_id: siteId } })
            .then((r) => {
                if (r.data?.success) {
                    setExhibitions(r.data.data.filter((e) => String(e.id) !== String(exhibitionId)));
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [siteId, exhibitionId]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl max-h-[70vh] overflow-y-auto"
                style={{ border: '1.5px solid #e8e0d0' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold" style={{ color: '#3a3a2a' }}>어디로 이동할까요?</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f0ece4' }}>
                        <X size={14} style={{ color: '#7a7a6a' }} />
                    </button>
                </div>
                {loading ? (
                    <div className="py-8 text-center">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                    </div>
                ) : exhibitions.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#9a9a8a' }}>이동할 전시관이 없습니다.</p>
                ) : (
                    <div className="space-y-2">
                        {exhibitions.map((exh) => (
                            <button
                                key={exh.id}
                                onClick={() => onMove(exh.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-gray-50"
                                style={{ borderColor: '#e8e0d0' }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: exh.cover_photo ? `url(${exh.cover_photo}) center/cover` : '#e8e0d0' }}
                                >
                                    {!exh.cover_photo && <ImageIcon size={16} style={{ color: '#9a9a8a' }} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: '#3a3a2a' }}>{exh.title}</p>
                                    <p className="text-xs" style={{ color: '#9a9a8a' }}>{exh.photo_count}장</p>
                                </div>
                                <ChevronRight size={14} style={{ color: '#ccc' }} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
