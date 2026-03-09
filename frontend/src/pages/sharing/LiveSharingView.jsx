import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft, ArrowRight, FolderOpen, Image as ImageIcon, User, Sparkles,
    QrCode, Share2, X, Copy, Check, MessageCircle, Send, CheckSquare, Square,
    Camera, Phone, Mail, MessageSquare, ChevronRight, Shield, Eye, EyeOff,
    Hash, Users, Upload, Download, FolderDown, Plus, Search, Radio
} from 'lucide-react';
import LiveFeed from '../../components/sharing/LiveFeed';
import AdBanner from '../../components/common/AdBanner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import FriendCall from '../../components/sync/FriendCall';
import RoomWorkspace from '../../components/sync/RoomWorkspace';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ── Mock Data ──
const mockFolders = [
    { id: 1, name: '2026 Family Photos', count: 342 },
    { id: 2, name: 'Jeju Trip', count: 128 },
    { id: 3, name: 'Holiday Gathering', count: 89 },
    { id: 4, name: 'Kids Birthday', count: 67 },
    { id: 5, name: 'Daily Life', count: 215 },
];

const generateMockPhotos = (count) =>
    [...Array(count)].map((_, i) => ({
        id: i + 1,
        name: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
        hasFace: i % 3 === 0,
        selected: true,
        uploader: ['Mom', 'Dad', 'Brother', 'Sister', 'Me'][i % 5],
    }));

const mockFaces = [
    { id: 1, label: 'Person A', color: 'bg-rose-100 text-rose-700', matchCount: 45 },
    { id: 2, label: 'Person B', color: 'bg-blue-100 text-blue-700', matchCount: 32 },
    { id: 3, label: 'Person C', color: 'bg-emerald-100 text-emerald-700', matchCount: 18 },
    { id: 4, label: 'Person D', color: 'bg-amber-100 text-amber-700', matchCount: 12 },
];

const mockGroupAlbums = [
    { id: 1, title: '2025 Summer Hawaii Family Trip', emoji: '🌴', photoCount: 247, members: 6, createdAt: '2025-08-15' },
    { id: 2, title: '2025 친목회 Vietnam Travel', emoji: '🇻🇳', photoCount: 189, members: 12, createdAt: '2025-11-20' },
];

// ── Steps ──
const STEPS = {
    // Common
    MAIN: 'main',
    // Individual flow
    IND_GUIDE: 'ind_guide',
    IND_FOLDER: 'ind_folder',
    IND_SELECT_MODE: 'ind_select_mode',
    IND_PICK: 'ind_pick',
    IND_FACE_SELECT: 'ind_face_select',
    IND_FACE_RESULTS: 'ind_face_results',
    IND_CODE: 'ind_code',
    IND_CHAT: 'ind_chat',
    // Group flow
    GRP_LOBBY: 'grp_lobby',
    GRP_CREATE: 'grp_create',
    GRP_ALBUM: 'grp_album',
    GRP_FACE_SELECT: 'grp_face_select',
    GRP_FACE_RESULTS: 'grp_face_results',
    GRP_SAVE: 'grp_save',
};

export default function LiveSharingView() {
    const lang = useUiStore((s) => s.lang);
    const lt = getT('liveSharing', lang);
    const token = useAuthStore((s) => s.token);
    const [step, setStep] = useState(STEPS.MAIN);

    // ── Individual state ──
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [selectedFace, setSelectedFace] = useState(null);
    const [shareCode, setShareCode] = useState('');
    const [codeCopied, setCodeCopied] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [showJoin, setShowJoin] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { id: 1, from: 'system', text: 'Room created. Waiting for the other person to join...' },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [peerJoined, setPeerJoined] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // ── Group state ──
    const [groupTitle, setGroupTitle] = useState('');
    const [groupAlbum, setGroupAlbum] = useState(null);
    const [groupPhotos, setGroupPhotos] = useState([]);
    const [groupFace, setGroupFace] = useState(null);
    const [groupSaveFolder, setGroupSaveFolder] = useState('');
    const [groupSaving, setGroupSaving] = useState(false);
    const [groupSaved, setGroupSaved] = useState(false);
    const [aiScanning, setAiScanning] = useState(false);
    const fileInputRef = useRef(null);

    // ── Helpers ──
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        setShareCode(code);
    };

    const selectedCount = photos.filter(p => p.selected).length;
    const groupSelectedCount = groupPhotos.filter(p => p.selected).length;

    // Simulate peer join
    useEffect(() => {
        if (step === STEPS.IND_CHAT && !peerJoined) {
            const t = setTimeout(() => {
                setPeerJoined(true);
                setChatMessages(prev => [...prev, { id: Date.now(), from: 'system', text: 'A guest has joined the room.' }]);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [step, peerJoined]);

    // Group: simulate AI scan
    useEffect(() => {
        if (aiScanning) {
            const t = setTimeout(() => {
                setAiScanning(false);
                setGroupPhotos(prev => prev.map(p => ({ ...p, selected: p.hasFace })));
                setStep(STEPS.GRP_FACE_RESULTS);
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [aiScanning]);

    // ── Individual handlers ──
    const handleFolderSelect = (folder) => {
        setSelectedFolder(folder);
        setPhotos(generateMockPhotos(Math.min(folder.count, 24)));
        setStep(STEPS.IND_SELECT_MODE);
    };

    const handleTogglePhoto = (photoId) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, selected: !p.selected } : p));
    };

    const handleSelectAll = (list, setter) => {
        const allSelected = list.every(p => p.selected);
        setter(prev => prev.map(p => ({ ...p, selected: !allSelected })));
    };

    const handleFaceSelect = (face) => {
        setSelectedFace(face);
        setPhotos(prev => prev.map(p => ({ ...p, selected: p.hasFace })));
        setStep(STEPS.IND_FACE_RESULTS);
    };

    const handleGoToCode = () => { generateCode(); setStep(STEPS.IND_CODE); };

    const handleCopyCode = () => {
        navigator.clipboard?.writeText(shareCode).catch(() => { });
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, { id: Date.now(), from: 'me', text: chatInput.trim() }]);
        setChatInput('');
        setTimeout(() => {
            setChatMessages(prev => [...prev, { id: Date.now() + 1, from: 'peer', text: 'Got it! Please send them.' }]);
        }, 2000);
    };

    const handleSendPhotos = () => {
        setSending(true);
        setTimeout(() => {
            setSending(false); setSent(true);
            setChatMessages(prev => [...prev, { id: Date.now(), from: 'system', text: `${selectedCount} photos sent successfully!` }]);
        }, 2500);
    };

    // ── Group handlers ──
    const handleCreateGroupAlbum = () => {
        if (!groupTitle.trim()) return;
        const newAlbum = { id: Date.now(), title: groupTitle.trim(), emoji: '📷', photoCount: 0, members: 1, createdAt: '2026-03-08' };
        setGroupAlbum(newAlbum);
        setGroupPhotos([]);
        setStep(STEPS.GRP_ALBUM);
    };

    const handleOpenGroupAlbum = (album) => {
        setGroupAlbum(album);
        setGroupPhotos(generateMockPhotos(Math.min(album.photoCount, 30)));
        setStep(STEPS.GRP_ALBUM);
    };

    const handleGroupUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        // Optimistically show uploading files
        const tempPhotos = files.map((file, idx) => ({
            id: `temp-${Date.now()}-${idx}`,
            name: file.name,
            uploader: 'Me',
            selected: false,
            isUploading: true
        }));

        setGroupPhotos(prev => [...tempPhotos, ...prev]);

        try {
            const formData = new FormData();
            formData.append('room_code', groupAlbum?.id || 'default');
            files.forEach(file => formData.append('photos', file));

            const token = localStorage.getItem('token') || '';

            // POST to backend API
            const response = await fetch('/api/sharing/upload', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: formData
            });

            if (response.ok) {
                // Remove uploading flag on success
                setGroupPhotos(prev => prev.map(p =>
                    p.isUploading ? { ...p, isUploading: false, id: Date.now() + Math.random() } : p
                ));
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Upload Error:', error);
            // Optionally remove them or show error state
            setGroupPhotos(prev => prev.filter(p => !p.isUploading));
            alert('업로드 중 오류가 발생했습니다. 백엔드가 아직 준비되지 않았을 수 있습니다.');
        }

        e.target.value = ''; // Reset input
    };

    const handleGroupFaceSelect = (face) => {
        setGroupFace(face);
        setAiScanning(true);
    };

    const handleGroupTogglePhoto = (photoId) => {
        setGroupPhotos(prev => prev.map(p => p.id === photoId ? { ...p, selected: !p.selected } : p));
    };

    const handleGroupSave = () => {
        setGroupSaving(true);
        setTimeout(() => { setGroupSaving(false); setGroupSaved(true); }, 2000);
    };

    // ── Back logic ──
    const handleBack = () => {
        const map = {
            [STEPS.IND_GUIDE]: STEPS.MAIN,
            [STEPS.IND_FOLDER]: STEPS.IND_GUIDE,
            [STEPS.IND_SELECT_MODE]: STEPS.IND_FOLDER,
            [STEPS.IND_PICK]: STEPS.IND_SELECT_MODE,
            [STEPS.IND_FACE_SELECT]: STEPS.IND_SELECT_MODE,
            [STEPS.IND_FACE_RESULTS]: STEPS.IND_FACE_SELECT,
            [STEPS.IND_CODE]: selectedFace ? STEPS.IND_FACE_RESULTS : STEPS.IND_PICK,
            [STEPS.IND_CHAT]: STEPS.IND_CODE,
            [STEPS.GRP_LOBBY]: STEPS.MAIN,
            [STEPS.GRP_CREATE]: STEPS.GRP_LOBBY,
            [STEPS.GRP_ALBUM]: STEPS.GRP_LOBBY,
            [STEPS.GRP_FACE_SELECT]: STEPS.GRP_ALBUM,
            [STEPS.GRP_FACE_RESULTS]: STEPS.GRP_FACE_SELECT,
            [STEPS.GRP_SAVE]: STEPS.GRP_FACE_RESULTS,
        };
        setStep(map[step] || STEPS.MAIN);
    };

    // ── Step titles ──
    const stepTitles = {
        [STEPS.MAIN]: lt.title,
        [STEPS.IND_GUIDE]: 'Individual Sharing',
        [STEPS.IND_FOLDER]: 'Select Folder',
        [STEPS.IND_SELECT_MODE]: 'How to Select',
        [STEPS.IND_PICK]: 'Select Photos',
        [STEPS.IND_FACE_SELECT]: 'Select a Face',
        [STEPS.IND_FACE_RESULTS]: 'AI Selected Photos',
        [STEPS.IND_CODE]: 'Share Code',
        [STEPS.IND_CHAT]: 'Sharing Room',
        [STEPS.GRP_LOBBY]: 'Group Albums',
        [STEPS.GRP_CREATE]: 'New Group Album',
        [STEPS.GRP_ALBUM]: groupAlbum?.title || 'Group Album',
        [STEPS.GRP_FACE_SELECT]: 'Select a Face',
        [STEPS.GRP_FACE_RESULTS]: 'AI Found Photos',
        [STEPS.GRP_SAVE]: 'Save to Folder',
    };

    const [albumTab, setAlbumTab] = useState('photos'); // 'photos' | 'feed'

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-24">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={step === STEPS.MAIN ? () => window.history.back() : handleBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent truncate">
                            {stepTitles[step]}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {step === STEPS.MAIN && (
                            <button onClick={() => setShowJoin(true)}
                                className="flex items-center gap-2 text-sm font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-4 py-2 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                                <Hash size={16} /> Join
                            </button>
                        )}
                        <LanguageSwitcher />
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6">

                {/* ════════════════════════════════════
                    MAIN: Choose Individual or Group
                   ════════════════════════════════════ */}
                {step === STEPS.MAIN && (
                    <div className="space-y-6">
                        <p className="text-center text-gray-500 dark:text-gray-400 text-sm">How would you like to share photos?</p>

                        {/* Individual */}
                        <button onClick={() => setStep(STEPS.IND_GUIDE)}
                            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all text-left group">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Send size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{lt.individualTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {lt.individualDesc}
                                    </p>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-500" />
                            </div>
                        </button>

                        {/* Group */}
                        <button onClick={() => setStep(STEPS.GRP_LOBBY)}
                            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all text-left group">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <Users size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{lt.groupTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {lt.groupDesc}
                                    </p>
                                </div>
                                <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500" />
                            </div>
                        </button>

                        {/* P2P Friend Call — 상대방 호출 */}
                        {token && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <Radio size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">P2P Photo Call</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">상대방 폰에서 내 사진을 AI로 찾아 안전하게 전송</p>
                                    </div>
                                </div>
                                <FriendCall localPhotos={[]} />
                                <RoomWorkspace workerRef={null} localPhotos={[]} />
                            </div>
                        )}

                        {!token && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800 text-center">
                                <Radio size={24} className="mx-auto mb-2 text-indigo-500" />
                                <p className="font-bold text-indigo-800 dark:text-indigo-300 mb-1">P2P Photo Call</p>
                                <p className="text-sm text-indigo-600 dark:text-indigo-400">로그인하면 상대방 호출 기능을 사용할 수 있습니다.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* ════════════════════════════════════
                    INDIVIDUAL SHARING FLOW
                   ════════════════════════════════════ */}

                {/* IND_GUIDE */}
                {step === STEPS.IND_GUIDE && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield size={24} className="text-white/90" />
                                    <h2 className="text-xl font-bold text-white">Individual Photo Sharing</h2>
                                </div>
                                <p className="text-purple-100 text-sm">Safe, private photo sharing with one person</p>
                            </div>
                            <div className="p-6 space-y-5">
                                {[
                                    { n: 1, title: 'Check your photo folder', desc: <>Please check the folder that contains the photos you want to share. <span className="font-semibold text-purple-600 dark:text-purple-400">No photos will be visible to the other person until you press Share.</span></> },
                                    { n: 2, title: 'Select photos to share', desc: <>Select photos individually, or choose a <span className="font-semibold text-purple-600 dark:text-purple-400">representative face</span> to let AI find all photos of that person. All matched photos are pre-selected — just uncheck the ones you don&apos;t want to send.</> },
                                    { n: 3, title: 'Generate a code', desc: <>Click <span className="font-semibold">Generate Code</span> to get a 6-digit code. Send this code to the other person via phone, email, or SNS — they can click it to enter this room.</> },
                                    { n: 4, title: 'Chat & confirm', desc: <>You can chat with the other person in the room. Once you&apos;ve confirmed what they&apos;d like to receive, select the files and press <span className="font-semibold">Send</span> to transfer.</> },
                                ].map(s => (
                                    <div key={s.n} className="flex gap-4">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">{s.n}</div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{s.title}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                            <EyeOff size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-800 dark:text-emerald-300">
                                <span className="font-bold">Your privacy is protected.</span> Photos are only transferred after your explicit confirmation.
                            </p>
                        </div>

                        <button onClick={() => setStep(STEPS.IND_FOLDER)}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-3">
                            <FolderOpen size={22} /> Start — Select Photo Folder
                        </button>
                    </div>
                )}

                {/* IND_FOLDER */}
                {step === STEPS.IND_FOLDER && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Select the folder containing photos you want to share:</p>
                        {mockFolders.map(f => (
                            <button key={f.id} onClick={() => handleFolderSelect(f)}
                                className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all text-left group">
                                <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center">
                                    <FolderOpen size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{f.name}</h3>
                                    <p className="text-xs text-gray-500">{f.count} photos</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-500" />
                            </button>
                        ))}
                    </div>
                )}

                {/* IND_SELECT_MODE */}
                {step === STEPS.IND_SELECT_MODE && (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                            <FolderOpen size={18} className="text-purple-500" />
                            <span className="font-bold text-gray-900 dark:text-white">{selectedFolder?.name}</span>
                            <span className="text-xs text-gray-500">({selectedFolder?.count} photos)</span>
                        </div>
                        <p className="text-sm text-gray-500">How would you like to select photos?</p>
                        <button onClick={() => { setPhotos(prev => prev.map(p => ({ ...p, selected: true }))); setStep(STEPS.IND_PICK); }}
                            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-purple-200 transition-all text-left group">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center"><ImageIcon size={24} /></div>
                                <div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-white mb-1">Select Manually</h3><p className="text-sm text-gray-500">Browse and pick photos yourself</p></div>
                                <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-500" />
                            </div>
                        </button>
                        <button onClick={() => setStep(STEPS.IND_FACE_SELECT)}
                            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-purple-200 transition-all text-left group">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center"><Sparkles size={24} /></div>
                                <div className="flex-1"><h3 className="font-bold text-gray-900 dark:text-white mb-1">AI Face Match</h3><p className="text-sm text-gray-500">Select a person — AI finds all their photos</p></div>
                                <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-500" />
                            </div>
                        </button>
                    </div>
                )}

                {/* IND_PICK */}
                {step === STEPS.IND_PICK && (
                    <PhotoGrid photos={photos} onToggle={handleTogglePhoto} onSelectAll={() => handleSelectAll(photos, setPhotos)} selectedCount={selectedCount} total={photos.length}
                        actionLabel="Generate Code" onAction={handleGoToCode} />
                )}

                {/* IND_FACE_SELECT */}
                {step === STEPS.IND_FACE_SELECT && (
                    <FaceGrid faces={mockFaces} onSelect={handleFaceSelect} />
                )}

                {/* IND_FACE_RESULTS */}
                {step === STEPS.IND_FACE_RESULTS && (
                    <div className="space-y-4">
                        <FaceBadge face={selectedFace} count={selectedCount} />
                        <PhotoGrid photos={photos} onToggle={handleTogglePhoto} onSelectAll={() => handleSelectAll(photos, setPhotos)} selectedCount={selectedCount} total={photos.length}
                            actionLabel="Generate Code" onAction={handleGoToCode} hint="uncheck photos you don't want to send" />
                    </div>
                )}

                {/* IND_CODE */}
                {step === STEPS.IND_CODE && (
                    <div className="space-y-6">
                        <CodeCard code={shareCode} selectedCount={selectedCount} folderName={selectedFolder?.name} onCopy={handleCopyCode} copied={codeCopied} />
                        <button onClick={() => setStep(STEPS.IND_CHAT)}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-3">
                            <MessageCircle size={20} /> Enter Sharing Room
                        </button>
                    </div>
                )}

                {/* IND_CHAT */}
                {step === STEPS.IND_CHAT && (
                    <ChatRoom
                        code={shareCode} selectedCount={selectedCount} peerJoined={peerJoined}
                        messages={chatMessages} chatInput={chatInput} setChatInput={setChatInput}
                        onSendMsg={handleSendChat} onSendPhotos={handleSendPhotos}
                        sending={sending} sent={sent}
                    />
                )}


                {/* ════════════════════════════════════
                    GROUP SHARING FLOW
                   ════════════════════════════════════ */}

                {/* GRP_LOBBY */}
                {step === STEPS.GRP_LOBBY && (
                    <div className="space-y-6">
                        {/* Create new */}
                        <button onClick={() => setStep(STEPS.GRP_CREATE)}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white p-6 rounded-2xl shadow-lg shadow-blue-500/25 text-center transition-all hover:-translate-y-0.5">
                            <Plus size={28} className="mx-auto mb-2" />
                            <span className="font-bold text-lg">Create Group Album</span>
                            <p className="text-blue-100 text-sm mt-1">Start a shared album for your event</p>
                        </button>

                        {/* Existing albums */}
                        {mockGroupAlbums.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold mb-4">My Group Albums</h2>
                                <div className="space-y-3">
                                    {mockGroupAlbums.map(album => (
                                        <button key={album.id} onClick={() => handleOpenGroupAlbum(album)}
                                            className="w-full bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-all text-left group">
                                            <span className="text-3xl">{album.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{album.title}</h3>
                                                <p className="text-xs text-gray-500">{album.photoCount} photos · {album.members} members · {album.createdAt}</p>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Advertisement Banner in Group Lobby */}
                        <div className="pt-4">
                            <AdBanner />
                        </div>
                    </div>
                )}

                {/* GRP_CREATE */}
                {step === STEPS.GRP_CREATE && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Group Album</h2>
                            <p className="text-sm text-gray-500">Give your album a title so everyone knows what it's for.</p>
                            <div>
                                <label className="text-sm font-bold text-gray-500 mb-2 block">Album Title</label>
                                <input type="text" value={groupTitle} onChange={e => setGroupTitle(e.target.value)}
                                    placeholder="e.g. 2025 Summer Hawaii Family Trip"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white text-base" />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                                After creating, share the album code with everyone so they can upload their photos.
                            </div>
                            <button onClick={handleCreateGroupAlbum} disabled={!groupTitle.trim()}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-3">
                                <Plus size={20} /> Create Album
                            </button>
                        </div>
                    </div>
                )}

                {/* GRP_ALBUM — Upload & Thumbnails */}
                {step === STEPS.GRP_ALBUM && (
                    <div className="space-y-5">
                        {/* Album header */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{groupAlbum?.title}</h2>
                                <p className="text-xs text-gray-500">{groupPhotos.length} photos uploaded</p>
                            </div>
                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                <button onClick={() => setAlbumTab('photos')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${albumTab === 'photos' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>Photos</button>
                                <button onClick={() => setAlbumTab('feed')} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${albumTab === 'feed' ? 'bg-white dark:bg-gray-800 text-rose-500 shadow-sm' : 'text-gray-500'}`}>
                                    <Radio size={14} className={albumTab === 'feed' ? 'animate-pulse' : ''} /> Live
                                </button>
                            </div>
                        </div>

                        {/* Upload area */}
                        {albumTab === 'photos' && (
                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                <button onClick={handleGroupUpload}
                                    className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-8 text-center hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                                    <Upload size={36} className="mx-auto mb-3 text-blue-400 group-hover:text-blue-600 transition-colors" />
                                    <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">Upload Photos Here</p>
                                    <p className="text-sm text-gray-500 mt-1">Tap to add photos from your device</p>
                                </button>
                            </div>
                        )}

                        {/* Photo thumbnails */}
                        {groupPhotos.length > 0 && (
                            <>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {groupPhotos.map((photo, idx) => (
                                        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm group">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {photo.isUploading ? (
                                                    <div className="w-6 h-6 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
                                                ) : (
                                                    <ImageIcon size={20} className="text-gray-400" />
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                                <p className="text-[9px] text-white/90 font-medium truncate">{photo.uploader}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Download CTA */}
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Sparkles size={20} className="text-amber-500" />
                                        <h3 className="font-bold text-gray-900 dark:text-white">Download Your Photos</h3>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Select a representative face — AI will find all photos of that person from this album. Review and save them to your folder.
                                    </p>
                                    <button onClick={() => setStep(STEPS.GRP_FACE_SELECT)}
                                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/20">
                                        <Search size={18} /> Select Face to Find My Photos
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Live Feed Tab */}
                        {albumTab === 'feed' && (
                            <div className="mt-6">
                                <LiveFeed />
                            </div>
                        )}
                    </div>
                )}

                {/* GRP_FACE_SELECT */}
                {step === STEPS.GRP_FACE_SELECT && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                <Sparkles size={14} className="inline mr-1" />
                                <span className="font-bold">Select a representative face.</span> AI will search all {groupPhotos.length} photos in this album for that person.
                            </p>
                        </div>

                        <p className="text-sm text-gray-500">Detected faces in this album:</p>
                        <FaceGrid faces={mockFaces} onSelect={handleGroupFaceSelect} />

                        {aiScanning && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-2xl max-w-xs w-full">
                                    <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="font-bold text-gray-900 dark:text-white">AI Scanning...</p>
                                    <p className="text-sm text-gray-500 mt-1">Finding photos of {groupFace?.label}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )
                }

                {/* GRP_FACE_RESULTS */}
                {
                    step === STEPS.GRP_FACE_RESULTS && (
                        <div className="space-y-4">
                            <FaceBadge face={groupFace} count={groupSelectedCount} />

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    <span className="font-bold text-blue-600">{groupSelectedCount}</span> of {groupPhotos.length} matched — uncheck any you don't need
                                </p>
                                <button onClick={() => handleSelectAll(groupPhotos, setGroupPhotos)}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-700">
                                    {groupPhotos.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {groupPhotos.map(photo => (
                                    <button key={photo.id} onClick={() => handleGroupTogglePhoto(photo.id)}
                                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${photo.selected ? 'border-blue-500 shadow-md shadow-blue-500/20' : 'border-transparent opacity-40'}`}>
                                        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><ImageIcon size={20} className="text-gray-400" /></div>
                                        <div className="absolute top-1.5 right-1.5">
                                            {photo.selected ? <CheckSquare size={20} className="text-blue-500 drop-shadow" /> : <Square size={20} className="text-white/70 drop-shadow" />}
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                                            <p className="text-[9px] text-white/80 truncate">{photo.uploader}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {groupSelectedCount > 0 && (
                                <button onClick={() => setStep(STEPS.GRP_SAVE)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-3">
                                    <Download size={20} /> Save {groupSelectedCount} Photos
                                </button>
                            )}
                        </div>
                    )
                }

                {/* GRP_SAVE */}
                {
                    step === STEPS.GRP_SAVE && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
                                <div className="flex items-center gap-3">
                                    <FolderDown size={24} className="text-blue-500" />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Save to Folder</h2>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center gap-3">
                                    <FaceBadgeSmall face={groupFace} />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{groupSelectedCount} photos selected</p>
                                        <p className="text-xs text-gray-500">from "{groupAlbum?.title}"</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-gray-500 mb-2 block">Destination Folder Name</label>
                                    <input type="text" value={groupSaveFolder} onChange={e => setGroupSaveFolder(e.target.value)}
                                        placeholder={`e.g. ${groupAlbum?.title || 'My Downloads'}`}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white" />
                                </div>

                                {!groupSaved ? (
                                    <button onClick={handleGroupSave} disabled={groupSaving}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3">
                                        {groupSaving ? (
                                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                        ) : (
                                            <><Download size={20} /> Confirm &amp; Save</>
                                        )}
                                    </button>
                                ) : (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                                        <Check size={32} className="mx-auto mb-2 text-emerald-600" />
                                        <p className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">Saved Successfully!</p>
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{groupSelectedCount} photos saved to "{groupSaveFolder || groupAlbum?.title}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

            </main>

            {/* Join by Code Modal */}
            {
                showJoin && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 text-center">
                            <button onClick={() => setShowJoin(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                            <QrCode size={40} className="mx-auto mb-4 text-purple-600" />
                            <h3 className="text-2xl font-bold mb-2">Join by Code</h3>
                            <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code you received</p>
                            <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123"
                                className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-center font-black text-3xl tracking-[0.5em] uppercase focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none dark:text-white" />
                            <button disabled={joinCode.length < 6}
                                onClick={() => {
                                    setShowJoin(false); setShareCode(joinCode); setPeerJoined(true);
                                    setChatMessages([{ id: 1, from: 'system', text: 'You have joined the room.' }, { id: 2, from: 'peer', text: 'Welcome! I have some photos to share with you.' }]);
                                    setStep(STEPS.IND_CHAT);
                                }}
                                className="w-full py-3 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors">
                                Join
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


// ── Shared Sub-Components ──

function PhotoGrid({ photos, onToggle, onSelectAll, selectedCount, total, actionLabel, onAction, hint }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-bold text-purple-600">{selectedCount}</span> of {total} selected
                    {hint && <span className="text-gray-400"> — {hint}</span>}
                </p>
                <button onClick={onSelectAll} className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors">
                    {photos.every(p => p.selected) ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {photos.map(photo => (
                    <button key={photo.id} onClick={() => onToggle(photo.id)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${photo.selected ? 'border-purple-500 shadow-md shadow-purple-500/20' : 'border-transparent opacity-60'}`}>
                        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><ImageIcon size={20} className="text-gray-400" /></div>
                        <div className="absolute top-1.5 right-1.5">
                            {photo.selected ? <CheckSquare size={20} className="text-purple-500 drop-shadow" /> : <Square size={20} className="text-white/70 drop-shadow" />}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1.5">
                            <p className="text-[9px] text-white/80 truncate">{photo.name}</p>
                        </div>
                    </button>
                ))}
            </div>
            {selectedCount > 0 && (
                <button onClick={onAction}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-3">
                    {actionLabel} <ArrowRight size={20} />
                </button>
            )}
        </div>
    );
}

function FaceGrid({ faces, onSelect }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {faces.map(face => (
                <button key={face.id} onClick={() => onSelect(face)}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all text-center group">
                    <div className={`w-16 h-16 rounded-full ${face.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <User size={28} />
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{face.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{face.matchCount} photos</p>
                </button>
            ))}
        </div>
    );
}

function FaceBadge({ face, count }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${face?.color} flex items-center justify-center`}><User size={18} /></div>
            <div className="flex-1">
                <p className="font-bold text-gray-900 dark:text-white text-sm">{face?.label}'s photos</p>
                <p className="text-xs text-gray-500">AI found {count} matching photos</p>
            </div>
            <Sparkles size={16} className="text-amber-500" />
        </div>
    );
}

function FaceBadgeSmall({ face }) {
    return <div className={`w-10 h-10 rounded-full ${face?.color} flex items-center justify-center shrink-0`}><User size={16} /></div>;
}

function CodeCard({ code, selectedCount, folderName, onCopy, copied }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center">
            <QrCode size={40} className="mx-auto mb-4 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Sharing Code</h2>
            <p className="text-sm text-gray-500 mb-6">Send this code to the person you want to share with</p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 mb-6 border-2 border-dashed border-purple-200 dark:border-purple-800">
                <p className="text-4xl font-black tracking-[0.4em] text-purple-600 dark:text-purple-400">{code}</p>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 mb-6 text-left">
                <Eye size={16} className="text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-400"><span className="font-bold">{selectedCount} photos</span> ready from "{folderName}"</p>
            </div>
            <button onClick={onCopy} className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mb-3">
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Share via</p>
            <div className="flex justify-center gap-4">
                {[{ icon: Phone, bg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' }, { icon: Mail, bg: 'bg-red-50 dark:bg-red-900/30 text-red-600' }, { icon: MessageSquare, bg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' }, { icon: Share2, bg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600' }].map(({ icon: Icon, bg }, i) => (
                    <button key={i} className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center hover:opacity-80 transition-opacity`}><Icon size={20} /></button>
                ))}
            </div>
        </div>
    );
}

function ChatRoom({ code, selectedCount, peerJoined, messages, chatInput, setChatInput, onSendMsg, onSendPhotos, sending, sent }) {
    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold border-2 border-white dark:border-gray-800">Me</div>
                        {peerJoined && <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold border-2 border-white dark:border-gray-800 -ml-3">G</div>}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">Code: {code}</p>
                        <p className="text-xs text-gray-500">{selectedCount} photos selected</p>
                    </div>
                </div>
                {peerJoined ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Connected
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />Waiting...
                    </span>
                )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="h-[300px] overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : msg.from === 'system' ? 'justify-center' : 'justify-start'}`}>
                            {msg.from === 'system' ? (
                                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">{msg.text}</span>
                            ) : (
                                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${msg.from === 'me' ? 'bg-purple-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'}`}>
                                    {msg.text}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSendMsg()} placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white" />
                    <button onClick={onSendMsg} className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"><Send size={18} /></button>
                </div>
            </div>
            {peerJoined && !sent && (
                <button onClick={onSendPhotos} disabled={sending}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3">
                    {sending ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending {selectedCount} photos...</>) : (<><Send size={20} /> Send {selectedCount} Photos</>)}
                </button>
            )}
            {sent && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center">
                    <Check size={32} className="mx-auto mb-2 text-emerald-600" />
                    <p className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">Photos Sent Successfully!</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">{selectedCount} photos transferred.</p>
                </div>
            )}
        </div>
    );
}
