import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Lock, Unlock, ShieldAlert, User,
    Play, Pause, X, ChevronLeft, ChevronRight,
    FolderOpen, GalleryHorizontalEnd, Maximize2, Upload, Image
} from 'lucide-react';
import axios from 'axios';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

// ── Fullscreen slideshow / video player ──
function FullscreenPlayer({ items, startIndex, onClose }) {
    const [idx, setIdx] = useState(startIndex);
    const [playing, setPlaying] = useState(true);
    const item = items[idx];

    useEffect(() => {
        if (item?.type !== 'photo' || !playing) return;
        const timer = setTimeout(() => setIdx(prev => (prev + 1) % items.length), 4000);
        return () => clearTimeout(timer);
    }, [idx, playing, item, items.length]);

    const prev = () => setIdx((idx - 1 + items.length) % items.length);
    const next = () => setIdx((idx + 1) % items.length);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [idx, onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <span className="text-white/80 text-sm font-medium">{item?.caption || ''} ({idx + 1}/{items.length})</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPlaying(p => !p)} className="text-white/80 hover:text-white p-2">
                        {playing ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2"><X size={24} /></button>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center relative">
                <img src={item?.url} alt={item?.caption || ''} className="max-w-full max-h-full object-contain transition-opacity duration-700" />
                {items.length > 1 && (
                    <>
                        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                            <ChevronLeft size={28} />
                        </button>
                        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                            <ChevronRight size={28} />
                        </button>
                    </>
                )}
            </div>

            {items.length > 1 && (
                <div className="bg-black/90 p-3 flex items-center gap-2 overflow-x-auto">
                    {items.map((it, i) => (
                        <button key={it.id} onClick={() => setIdx(i)}
                            className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === idx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                            <img src={it.url} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Page loader ──
function PageLoader() {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
    );
}

export default function PersonFolderView() {
    const { subdomain, id } = useParams();
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);

    const [person, setPerson] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [siteId, setSiteId] = useState(null);
    const [fullscreenIdx, setFullscreenIdx] = useState(null);

    // 1) siteId 가져오기
    useEffect(() => {
        if (!subdomain) return;
        axios.get(`/api/museum/${subdomain}`)
            .then(r => {
                if (r.data?.success) setSiteId(r.data.data.id);
                else setError('박물관을 찾을 수 없습니다');
            })
            .catch(() => setError('박물관을 찾을 수 없습니다'));
    }, [subdomain]);

    // 2) 인물 정보 + 사진 가져오기
    useEffect(() => {
        if (!siteId || !id) return;
        setLoading(true);

        Promise.all([
            axios.get(`/api/persons/${siteId}`),
            axios.get(`/api/persons/${siteId}/${id}/photos`),
        ])
            .then(([personsRes, photosRes]) => {
                const persons = personsRes.data?.data || [];
                const found = persons.find(p => String(p.id) === String(id));
                if (found) {
                    setPerson(found);
                } else {
                    setError('인물을 찾을 수 없습니다');
                }
                setPhotos(photosRes.data?.data || []);
            })
            .catch(() => setError('데이터를 불러올 수 없습니다'))
            .finally(() => setLoading(false));
    }, [siteId, id]);

    const startSlideshow = (startIdx = 0) => setFullscreenIdx(startIdx);

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#FAFAF7' }}>
                <Image size={56} className="mb-4 opacity-30" style={{ color: '#9a9a8a' }} />
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 rounded-full text-sm font-bold"
                    style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                >
                    돌아가기
                </button>
            </div>
        );
    }

    if (loading || !person) return <PageLoader />;

    const personName = person.name || '가족 구성원';
    const lifespan = person.is_deceased && person.birth_year
        ? `${person.birth_year}–${person.death_year || '?'}`
        : person.birth_year ? `${person.birth_year}년생` : '';

    return (
        <div className="min-h-screen font-sans" style={{ background: '#FAFAF7' }}>
            {/* Header */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(250,250,247,0.96)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3 truncate">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                            <ArrowLeft size={20} style={{ color: '#5a5040' }} />
                        </button>
                        {person.photo_url ? (
                            <img src={person.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: '#e8f5e0' }}>
                                <User size={16} style={{ color: '#5a8a4a' }} />
                            </div>
                        )}
                        <div className="truncate">
                            <h1 className="font-bold text-base truncate" style={{ color: '#3a3a2a' }}>
                                {personName} 자료실
                            </h1>
                            {lifespan && (
                                <span className="text-xs" style={{ color: '#9a9a8a' }}>{lifespan}</span>
                            )}
                        </div>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-2xl mx-auto px-4 py-6">
                {/* 인물 프로필 카드 */}
                <div
                    className="rounded-2xl p-5 mb-6 flex items-center gap-4"
                    style={{ background: '#fff', border: '1px solid #e8e0d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                    {person.photo_url ? (
                        <img
                            src={person.photo_url}
                            alt={personName}
                            className="w-20 h-20 rounded-2xl object-cover shrink-0"
                            style={{ border: '2px solid #e8e0d0' }}
                        />
                    ) : (
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: '#f0ece4', border: '2px solid #e8e0d0' }}
                        >
                            <User size={32} style={{ color: '#b8a88a' }} />
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>{personName}</h2>
                        {lifespan && (
                            <p className="text-sm" style={{ color: '#9a9a8a' }}>{lifespan}</p>
                        )}
                        {person.gender && (
                            <span
                                className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{
                                    background: person.gender === 'M' ? '#e0eaf5' : '#f5e0ea',
                                    color: person.gender === 'M' ? '#3a5a8a' : '#8a3a5a',
                                }}
                            >
                                {person.gender === 'M' ? '남성' : '여성'}
                            </span>
                        )}
                    </div>
                </div>

                {/* 사진 갤러리 */}
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: '#fff', border: '1px solid #e8e0d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#e8e0d0', background: '#faf8f4' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: '#e8f5e0' }}>
                                <GalleryHorizontalEnd size={20} style={{ color: '#5a8a4a' }} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm" style={{ color: '#3a3a2a' }}>사진 자료</h3>
                                <p className="text-xs" style={{ color: '#9a9a8a' }}>{photos.length}장</p>
                            </div>
                        </div>
                        {photos.length > 0 && (
                            <button
                                onClick={() => startSlideshow(0)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:brightness-95"
                                style={{ background: '#5a8a4a', color: '#fff' }}
                            >
                                <Play size={12} fill="white" /> 슬라이드쇼
                            </button>
                        )}
                    </div>

                    <div className="p-4">
                        {photos.length === 0 ? (
                            <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
                                <Image size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">아직 등록된 사진이 없습니다</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {photos.map((photo, i) => (
                                    <div
                                        key={photo.id}
                                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
                                        style={{ background: '#f0ece4' }}
                                        onClick={() => startSlideshow(i)}
                                    >
                                        <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Fullscreen Player */}
            {fullscreenIdx !== null && photos.length > 0 && (
                <FullscreenPlayer
                    items={photos.map(p => ({ ...p, type: 'photo' }))}
                    startIndex={fullscreenIdx}
                    onClose={() => setFullscreenIdx(null)}
                />
            )}
        </div>
    );
}
