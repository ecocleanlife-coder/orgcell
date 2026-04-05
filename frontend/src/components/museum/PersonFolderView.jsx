import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Lock, Unlock, ShieldAlert, User,
    Play, Pause, X, ChevronLeft, ChevronRight,
    FolderOpen, GalleryHorizontalEnd, Maximize2, Upload, Image, MessageSquare, Mic, UserPlus
} from 'lucide-react';
import axios from 'axios';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { toast } from 'react-hot-toast';

import PersonEditModal from './PersonEditModal';
import PhotoImportModal from './PhotoImportModal';
import VoiceRecordingModal from './VoiceRecordingModal';
import InvitationModal from './InvitationModal';
import AccessRequestManager from './AccessRequestManager';

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
    const [activeTool, setActiveTool] = useState('photos'); // photos, upload, voice, invite, access

    const role = useUiStore((s) => s.role); // owner or viewer
    const userRole = role === 'owner' ? 'owner' : 'viewer'; // get user's auth role if needed from somewhere, wait, let's just use role from store.

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

    const fetchPhotos = useCallback(() => {
        if (!siteId || !id) return;
        axios.get(`/api/persons/${siteId}/${id}/photos`)
             .then(r => setPhotos(r.data?.data || []))
             .catch(() => {});
    }, [siteId, id]);

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

    const handlePersonSave = async (updated) => {
        try {
            await axios.put(`/api/persons/${siteId}/${updated.id}`, updated);
            setPerson(updated);
            toast.success('저장되었습니다');
        } catch (err) {
            toast.error('저장에 실패했습니다');
        }
    };

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
            <main className="max-w-4xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* 좌측: 인물 프로필 및 수정 */}
                    <div className="w-full md:w-1/2 flex flex-col gap-4">
                        <div
                            className="rounded-2xl p-5 flex items-center gap-4 shrink-0 transition"
                            style={{ background: '#fff', border: '1px solid #e8e0d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                        >
                            {person.photo_url ? (
                                <img src={person.photo_url} alt={personName} className="w-20 h-20 rounded-2xl object-cover shrink-0" style={{ border: '2px solid #e8e0d0' }} />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#f0ece4', border: '2px solid #e8e0d0' }}>
                                    <User size={32} style={{ color: '#b8a88a' }} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>{personName}</h2>
                                {lifespan && <p className="text-sm" style={{ color: '#9a9a8a' }}>{lifespan}</p>}
                                {person.gender && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: person.gender === 'M' ? '#e0eaf5' : '#f5e0ea', color: person.gender === 'M' ? '#3a5a8a' : '#8a3a5a' }}>
                                        {person.gender === 'M' ? '남성' : '여성'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 인물 수정 (기존 기능 인라인으로 노출) */}
                        <div className="flex-1 rounded-2xl flex flex-col" style={{ background: '#fff', border: '1px solid #e8e0d0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                            <PersonEditModal person={person} onSave={handlePersonSave} onClose={() => {}} inline={true} />
                        </div>
                    </div>

                    {/* 우측: 4개 버튼 메뉴 */}
                    <div className="w-full md:w-64 flex flex-col gap-3 shrink-0">
                        <button
                            onClick={() => setActiveTool('upload')}
                            className="px-4 py-3.5 bg-white rounded-xl shadow-sm border text-left font-bold transition-all hover:bg-gray-50 flex items-center gap-3"
                            style={{ borderColor: activeTool === 'upload' ? '#C4A84F' : '#e8e0d0', color: '#3a3a2a' }}
                        >
                            <Upload size={18} style={{ color: '#C4A84F' }} /> 사진 불러오기
                        </button>
                        <button
                            onClick={() => navigate(`/${subdomain}/board`)}
                            className="px-4 py-3.5 bg-white rounded-xl shadow-sm border text-left font-bold transition-all hover:bg-gray-50 flex items-center gap-3"
                            style={{ borderColor: '#e8e0d0', color: '#3a3a2a' }}
                        >
                            <MessageSquare size={18} style={{ color: '#3498db' }} /> 게시판
                        </button>
                        <button
                            onClick={() => setActiveTool('voice')}
                            className="px-4 py-3.5 bg-white rounded-xl shadow-sm border text-left font-bold transition-all hover:bg-gray-50 flex items-center gap-3"
                            style={{ borderColor: activeTool === 'voice' ? '#C4A84F' : '#e8e0d0', color: '#3a3a2a' }}
                        >
                            <Mic size={18} style={{ color: '#e74c3c' }} /> 육성녹음
                        </button>
                        <button
                            onClick={() => setActiveTool('invite')}
                            className="px-4 py-3.5 bg-white rounded-xl shadow-sm border text-left font-bold transition-all hover:bg-gray-50 flex items-center gap-3"
                            style={{ borderColor: activeTool === 'invite' ? '#C4A84F' : '#e8e0d0', color: '#3a3a2a' }}
                        >
                            <UserPlus size={18} style={{ color: '#2ecc71' }} /> 초대하기
                        </button>

                        {userRole === 'owner' && (
                            <button
                                onClick={() => setActiveTool('access')}
                                className="px-4 py-3.5 bg-white rounded-xl shadow-sm border text-left font-bold transition-all hover:bg-gray-50 flex items-center gap-3 mt-3"
                                style={{ borderColor: activeTool === 'access' ? '#C4A84F' : '#e8e0d0', color: '#3a3a2a' }}
                            >
                                <Lock size={18} style={{ color: '#5a5a4a' }} /> 접근 요청 관리
                            </button>
                        )}
                        
                        {activeTool !== 'photos' && (
                            <button
                                onClick={() => setActiveTool('photos')}
                                className="px-4 py-3 rounded-xl mt-auto transition-all text-sm font-bold text-center"
                                style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                            >
                                사진 갤러리 닫고 돌아가기
                            </button>
                        )}
                    </div>
                </div>

                {/* 하단: 컨텐츠 표시 라우터 */}
                <div className="mt-8 rounded-2xl overflow-hidden shadow-sm" style={{ minHeight: '500px', border: activeTool !== 'photos' ? 'none' : '1px solid #e8e0d0' }}>
                    
                    {activeTool === 'photos' && (
                        <div className="flex flex-col h-full bg-white">
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

                            <div className="p-4 flex-1">
                                {photos.length === 0 ? (
                                    <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
                                        <Image size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">아직 등록된 사진이 없습니다. 우측 메뉴 사진 불러오기를 눌러주세요.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                    )}

                    {activeTool === 'upload' && <PhotoImportModal siteId={siteId} inline={true} onDone={fetchPhotos} onClose={() => setActiveTool('photos')} />}
                    {activeTool === 'voice' && <VoiceRecordingModal siteId={siteId} persons={[person]} inline={true} onClose={() => setActiveTool('photos')} />}
                    {activeTool === 'invite' && <InvitationModal siteId={siteId} personId={person.id} personName={personName} museumName={`${personName} 자료실`} inline={true} onClose={() => setActiveTool('photos')} />}
                    {activeTool === 'access' && <AccessRequestManager siteId={siteId} inline={true} onClose={() => setActiveTool('photos')} />}
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
