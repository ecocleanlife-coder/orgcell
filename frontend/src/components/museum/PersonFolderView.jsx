import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Lock, Unlock, ShieldAlert,
    User, Play, Pause, X, ChevronLeft, ChevronRight,
    FolderOpen, FolderLock, GalleryHorizontalEnd, Maximize2
} from 'lucide-react';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FamilyBanner from '../common/FamilyBanner';

// Mock person data
const MOCK_PERSONS = {
    me:           { name: 'John', role: 'Self' },
    spouse:       { name: 'Jane', role: 'Spouse' },
    myDad:        { name: "John's Dad", role: 'Parent' },
    myMom:        { name: "John's Mom", role: 'Parent' },
    herDad:       { name: "Jane's Dad", role: 'Parent' },
    herMom:       { name: "Jane's Mom", role: 'Parent' },
    son1:         { name: 'Son1', role: 'Child' },
    son1wife:     { name: "Son1's Wife", role: 'Child-in-law' },
    daughter1:    { name: 'Daughter1', role: 'Child' },
    daughter1hub: { name: "Daughter1's Husband", role: 'Child-in-law' },
    son2:         { name: 'Son2', role: 'Child' },
    daughter2:    { name: 'Daughter2', role: 'Child' },
    son1son:      { name: "Son1's Son", role: 'Grandchild' },
    d1daughter1:  { name: "D1's Daughter1", role: 'Grandchild' },
    d1daughter2:  { name: "D1's Daughter2", role: 'Grandchild' },
};

// Mock gallery (photos + videos)
const MOCK_GALLERY = [
    { id: 1, type: 'photo', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&q=60', desc: 'Family Reunion 2025' },
    { id: 2, type: 'photo', url: 'https://images.unsplash.com/photo-1506869640319-fea1a278e0ec?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506869640319-fea1a278e0ec?w=300&q=60', desc: 'Grand Canyon Trip' },
    { id: 3, type: 'photo', url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=300&q=60', desc: 'Beach Sunset' },
    { id: 4, type: 'photo', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=60', desc: 'Birthday Party' },
    { id: 5, type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=60', desc: 'Home Video' },
    { id: 6, type: 'photo', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=60', desc: 'Holiday Dinner' },
];

// Fullscreen slideshow / video player
function FullscreenPlayer({ items, startIndex, onClose }) {
    const [idx, setIdx] = useState(startIndex);
    const [playing, setPlaying] = useState(true);
    const item = items[idx];

    // Auto-advance for photos
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
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <span className="text-white/80 text-sm font-medium">{item?.desc} ({idx + 1}/{items.length})</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPlaying(p => !p)} className="text-white/80 hover:text-white p-2">
                        {playing ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2"><X size={24} /></button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center relative">
                {item?.type === 'video' ? (
                    <video src={item.url} autoPlay controls className="max-w-full max-h-full object-contain" />
                ) : (
                    <img src={item?.url} alt={item?.desc} className="max-w-full max-h-full object-contain transition-opacity duration-700" />
                )}
                <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                    <ChevronLeft size={28} />
                </button>
                <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                    <ChevronRight size={28} />
                </button>
            </div>

            {/* Bottom thumbnails */}
            <div className="bg-black/90 p-3 flex items-center gap-2 overflow-x-auto">
                {items.map((it, i) => (
                    <button key={it.id} onClick={() => setIdx(i)}
                        className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all relative ${i === idx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                        <img src={it.thumb} alt="" className="w-full h-full object-cover" />
                        {it.type === 'video' && <div className="absolute inset-0 flex items-center justify-center"><Play size={12} className="text-white drop-shadow" /></div>}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function PersonFolderView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);
    const person = MOCK_PERSONS[id] || { name: 'Family Member', role: 'Member' };

    const [unlockedPrivate, setUnlockedPrivate] = useState(false);
    const [pwdInput, setPwdInput] = useState('');
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [fullscreenIdx, setFullscreenIdx] = useState(null);

    const handleUnlock = () => {
        if (pwdInput === '1234') {
            setUnlockedPrivate(true);
            setShowPwdModal(false);
            setPwdInput('');
        } else {
            alert('Incorrect password (hint: 1234)');
        }
    };

    const startSlideshow = (startIdx = 0) => setFullscreenIdx(startIdx);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <FamilyBanner />
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <User size={22} className="text-amber-500" />
                        <h1 className="text-lg font-bold text-amber-700 dark:text-amber-400">{person.name}{t.folder}</h1>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{person.role}</span>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* 3-Column: Shared | Private | Gallery */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* SHARED FOLDER */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-xl text-emerald-600 dark:text-emerald-400"><FolderOpen size={22} /></div>
                            <div>
                                <h2 className="font-bold text-emerald-800 dark:text-emerald-300">{t.sharedFolder}</h2>
                                <p className="text-xs text-gray-500">{t.sharedDesc}</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                                {MOCK_GALLERY.slice(0, 3).map((item, i) => (
                                    <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => startSlideshow(i)}>
                                        <img src={item.thumb} alt={item.desc} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 text-center">3 {t.sharedAlbums}</p>
                        </div>
                    </div>

                    {/* PRIVATE FOLDER */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-slate-900/40 flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${unlockedPrivate ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                                {unlockedPrivate ? <Unlock size={22} /> : <FolderLock size={22} />}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-slate-800 dark:text-slate-200">{t.privateFolder}</h2>
                                <p className="text-xs text-gray-500">{unlockedPrivate ? t.unlocked : t.privatePwProtected}</p>
                            </div>
                            {!unlockedPrivate && (
                                <button onClick={() => setShowPwdModal(true)}
                                    className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-lg text-xs">{t.unlock}</button>
                            )}
                        </div>
                        <div className="p-4">
                            {unlockedPrivate ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        {MOCK_GALLERY.slice(3, 6).map((item) => (
                                            <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity relative"
                                                onClick={() => startSlideshow(MOCK_GALLERY.indexOf(item))}>
                                                <img src={item.thumb} alt={item.desc} className="w-full h-full object-cover" />
                                                {item.type === 'video' && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                        <Play size={20} className="text-white" fill="white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 text-center">{t.privateUnlocked}</p>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <Lock size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">{t.enterPwdView}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GALLERY with PLAY button */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-xl text-purple-600 dark:text-purple-400"><GalleryHorizontalEnd size={22} /></div>
                            <div className="flex-1">
                                <h2 className="font-bold text-purple-800 dark:text-purple-300">{t.gallery}</h2>
                                <p className="text-xs text-gray-500">{MOCK_GALLERY.length} {t.photosAndVideos}</p>
                            </div>
                            <button onClick={() => startSlideshow(0)}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition-all text-sm">
                                <Play size={16} fill="white" /> {t.play}
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-2">
                                {MOCK_GALLERY.map((item, i) => (
                                    <div key={item.id}
                                        className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity relative group"
                                        onClick={() => startSlideshow(i)}>
                                        <img src={item.thumb} alt={item.desc} className="w-full h-full object-cover" />
                                        {item.type === 'video' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <Play size={20} className="text-white" fill="white" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Fullscreen Player */}
            {fullscreenIdx !== null && (
                <FullscreenPlayer items={MOCK_GALLERY} startIndex={fullscreenIdx} onClose={() => setFullscreenIdx(null)} />
            )}

            {/* Password Modal */}
            {showPwdModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
                        <ShieldAlert size={44} className="text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{t.privateFolder}</h3>
                        <p className="text-gray-500 text-sm mb-5">{t.enterPwd}</p>
                        <input type="password" value={pwdInput} onChange={e => setPwdInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                            className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-xl outline-none border-2 border-transparent focus:border-amber-500 text-center text-xl font-mono tracking-widest mb-4 dark:text-white"
                            placeholder="****" autoFocus />
                        <div className="flex gap-2">
                            <button onClick={() => { setShowPwdModal(false); setPwdInput(''); }} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                            <button onClick={handleUnlock} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-colors">{t.unlock}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
