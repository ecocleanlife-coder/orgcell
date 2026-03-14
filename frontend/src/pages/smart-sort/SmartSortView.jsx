import React, { useState, useRef } from 'react';
import { ArrowLeft, FolderOpen, Play, CheckCircle2, ChevronRight, SlidersHorizontal, Trash2, Copy, Check, Sparkles, Trash, ImageOff, Search, AlertCircle, HardDrive, Settings, ScanSearch, Users, Globe, ArrowDownToLine } from 'lucide-react';
import ProgressBar from '../../components/smart-sort/ProgressBar';
import FaceTagger from '../../components/smart-sort/FaceTagger';
import AdBanner from '../../components/common/AdBanner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { runScan, applyResults, formatBytes } from '../../services/smartSortEngine';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function SmartSortView() {
    const lang = useUiStore((s) => s.lang);
    const t = getT('smartSort', lang);

    const [step, setStep] = useState(1);
    const [sourceType, setSourceType] = useState('local'); // 'local' or 'drive'
    const [sourcePath, setSourcePath] = useState('');
    const [destPath, setDestPath] = useState('');
    const [dupAction, setDupAction] = useState('delete');
    const [deleteSmallImages, setDeleteSmallImages] = useState(true);
    const [includeSmallInSearch, setIncludeSmallInSearch] = useState(false);
    const [assignedNames, setAssignedNames] = useState({});

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanMessage, setScanMessage] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);
    const [exportResult, setExportResult] = useState(null);

    const [scanResults, setScanResults] = useState(null);
    const [scanError, setScanError] = useState(null);

    const sourceDirRef = useRef(null);
    const destDirRef = useRef(null);

    const handleBrowseFolder = async (setter, dirRef) => {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setter(dirHandle.name);
            if (dirRef) dirRef.current = dirHandle;
        } catch (err) {
            // User cancelled or browser doesn't support
        }
    };

    const handleConnectDrive = async () => {
        try {
            const width = 600, height = 700;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;
            window.open(
                '/api/drive/auth',
                'google-drive-auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );
            setSourceType('drive');
            setSourcePath('Google Drive');
        } catch (err) {
            setScanError('Google Drive connection failed');
        }
    };

    const handleStartScan = async () => {
        if (!sourceDirRef.current && sourceType === 'local') {
            setScanError(t.selectSourceFirst);
            return;
        }

        setScanError(null);
        setIsScanning(true);
        setStep(2);
        setScanProgress(0);
        setScanMessage(t.defaultProgress);

        try {
            const results = await runScan(sourceDirRef.current, {
                deleteSmallImages,
                includeSmallInSearch,
                onProgress: (p) => {
                    setScanProgress(p.percent);
                    setScanMessage(p.message);
                },
            });

            setScanResults(results);
            setIsScanning(false);
            setStep(3);
        } catch (err) {
            setIsScanning(false);
            setScanError(`${t.scanError}: ${err.message}`);
            setStep(1);
        }
    };

    const handleExport = async () => {
        if (!destDirRef.current) {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                setDestPath(dirHandle.name);
                destDirRef.current = dirHandle;
            } catch {
                return;
            }
        }

        setExporting(true);

        try {
            const result = await applyResults(destDirRef.current, scanResults, {
                dupAction,
                deleteSmallImages,
                assignedNames,
                onProgress: (p) => {
                    setScanProgress(p.percent);
                    setScanMessage(p.message);
                },
            });

            setExportResult(result);
            setExporting(false);
            setExported(true);
        } catch (err) {
            setExporting(false);
            setScanError(`${t.exportError}: ${err.message}`);
        }
    };

    const stats = scanResults ? {
        scanned: scanResults.totalScanned,
        duplicates: scanResults.duplicatesFound,
        smallImages: scanResults.smallImagesFound,
        faces: scanResults.facesDetected,
        faceGroups: scanResults.faceGroups || [],
        savedGB: formatBytes(scanResults.savedBytes),
        timeline: scanResults.timeline,
    } : null;

    /* ── Step Tab Data ── */
    const stepTabs = [
        { num: 1, label: t.step1 || '1. Settings', icon: <Settings size={14} /> },
        { num: 2, label: t.step2 || '2. AI Scan', icon: <ScanSearch size={14} /> },
        { num: 3, label: t.step3 || '3. Face Tagging', icon: <Users size={14} /> },
        { num: 4, label: t.step4 || '4. Results', icon: <Globe size={14} /> },
    ];

    return (
        <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #d8cfe8 0%, #c7b8de 40%, #e0d5f0 100%)' }}>
            {/* ══ Title ══ */}
            <div className="text-center pt-8 pb-4">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: '#5c4a3a', fontFamily: 'Georgia, serif' }}>
                    AI Smart Sort
                    <span className="inline-block ml-2 text-3xl">🤖</span>
                </h1>
            </div>

            {/* ══ Step Tabs ══ */}
            <div className="flex justify-center gap-2 md:gap-3 px-4 pb-6">
                {stepTabs.map((tab) => (
                    <button
                        key={tab.num}
                        onClick={() => { if (tab.num <= step) setStep(tab.num); }}
                        className={`flex items-center gap-1.5 px-3 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-all shadow-sm ${
                            step === tab.num
                                ? 'bg-white text-amber-800 shadow-md border-2 border-amber-200'
                                : step > tab.num
                                    ? 'bg-white/70 text-amber-700 border border-amber-100'
                                    : 'bg-white/40 text-gray-500 border border-white/30'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <ProgressBar isVisible={isScanning} progress={scanProgress} title={scanMessage || t.defaultProgress} />

            <main className="max-w-4xl mx-auto px-4 pb-12">
                {scanError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up shadow-sm">
                        <AlertCircle size={20} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">{scanError}</p>
                        <button onClick={() => setScanError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold text-lg">&times;</button>
                    </div>
                )}

                {/* ══════════ STEP 1: Settings ══════════ */}
                {step === 1 && (
                    <div className="animate-fade-in-up">
                        {/* Main cream card */}
                        <div className="rounded-3xl p-6 md:p-8 shadow-xl border border-white/50" style={{ background: 'linear-gradient(145deg, #fdf8f0 0%, #f9f3e8 100%)' }}>

                            {/* Top row: Select Folders + Duplicate Handling */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                                {/* ── 1. Select Folders ── */}
                                <div>
                                    <h2 className="text-xl md:text-2xl font-extrabold mb-3 flex items-center gap-2" style={{ color: '#4a3a2a' }}>
                                        <span className="text-2xl">🤖</span>
                                        1. Select Folders
                                    </h2>
                                    <p className="text-sm mb-4" style={{ color: '#8a7a6a' }}>
                                        {t.sourceLabel || 'Source path with original photos to add a folder:'}
                                    </p>

                                    {/* Folder buttons */}
                                    <div className="flex gap-4 mb-4">
                                        <button
                                            onClick={() => { setSourceType('local'); handleBrowseFolder(setSourcePath, sourceDirRef); }}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #e8c99b 0%, #d4a574 100%)' }}>
                                                <FolderOpen size={28} className="text-white" />
                                            </div>
                                            <span className="text-xs font-semibold" style={{ color: '#6a5a4a' }}>
                                                {sourcePath || 'Select Folder'}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => handleBrowseFolder(setDestPath, destDirRef)}
                                            className="flex flex-col items-center gap-1 group"
                                        >
                                            <div className="w-16 h-14 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #b8d4a8 0%, #8fb87a 100%)' }}>
                                                <FolderOpen size={28} className="text-white" />
                                            </div>
                                            <span className="text-xs font-semibold" style={{ color: '#6a5a4a' }}>
                                                {destPath || 'Select Folder'}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Sign in with Google Drive */}
                                    <button
                                        onClick={handleConnectDrive}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all border-2 hover:shadow-md"
                                        style={{
                                            background: sourceType === 'drive' ? '#eef6ff' : '#ffffff',
                                            borderColor: sourceType === 'drive' ? '#93b8e8' : '#e0d8d0',
                                            color: '#4a4a4a',
                                        }}
                                    >
                                        <HardDrive size={16} />
                                        {t.googleDrive || 'Sign In with Google Drive'}
                                        {sourceType === 'drive' && <CheckCircle2 size={16} className="text-blue-500" />}
                                    </button>
                                </div>

                                {/* ── 2. Duplicate Handling ── */}
                                <div className="rounded-2xl p-5 border shadow-sm" style={{ background: '#fefcf8', borderColor: '#e8ddd0' }}>
                                    <h2 className="text-xl md:text-2xl font-extrabold mb-3" style={{ color: '#4a3a2a' }}>
                                        2. Duplicate Handling
                                    </h2>
                                    <p className="text-sm mb-4" style={{ color: '#8a7a6a' }}>
                                        {t.dupDesc || 'Choose how to handle identical by AI.'}
                                    </p>

                                    <div className="space-y-3">
                                        {/* Delete all except best */}
                                        <button
                                            onClick={() => setDupAction('delete')}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left"
                                            style={{
                                                borderColor: dupAction === 'delete' ? '#c9a882' : '#e8e0d8',
                                                background: dupAction === 'delete' ? '#fdf5ec' : '#ffffff',
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#e8f4e8' }}>
                                                <Trash2 size={18} style={{ color: '#6a9a5a' }} />
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm" style={{ color: '#4a3a2a' }}>
                                                    {t.deleteKeepBest || 'Delete all except best'}
                                                </span>
                                                <span className="ml-1 text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: '#f0e0d0', color: '#8a6a4a' }}>
                                                    (Recommended)
                                                </span>
                                            </div>
                                        </button>

                                        {/* Move to Duplicates */}
                                        <button
                                            onClick={() => setDupAction('move')}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left"
                                            style={{
                                                borderColor: dupAction === 'move' ? '#c9a882' : '#e8e0d8',
                                                background: dupAction === 'move' ? '#fdf5ec' : '#ffffff',
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#e8f0e8' }}>
                                                <FolderOpen size={18} style={{ color: '#7a9a6a' }} />
                                            </div>
                                            <span className="font-bold text-sm" style={{ color: '#4a3a2a' }}>
                                                {t.moveToDuplicates || 'Move to Duplicates'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── 3. Small Image Cleanup ── */}
                            <div className="rounded-2xl p-5 md:p-6 border shadow-sm" style={{ background: 'linear-gradient(135deg, #fef8e8 0%, #fdf0d0 100%)', borderColor: '#e8dbb8' }}>
                                <div className="flex items-start gap-4">
                                    {/* Cloud cleanup illustration */}
                                    <div className="shrink-0 hidden sm:block">
                                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8ddd0 0%, #d8c8b8 100%)' }}>
                                            <div className="text-center">
                                                <ImageOff size={28} style={{ color: '#8a7a6a' }} className="mx-auto" />
                                                <span className="text-[10px] font-bold block mt-1" style={{ color: '#6a5a4a' }}>Cleanup</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h2 className="text-xl md:text-2xl font-extrabold mb-2" style={{ color: '#4a3a2a' }}>
                                            3. Small Image Cleanup
                                        </h2>
                                        <p className="text-sm leading-relaxed mb-4" style={{ color: '#7a6a5a' }}>
                                            {t.smallImageInfo || 'Remove duplicate photos many small image files like app icons, thumbnail caches or real photos. These storage and clutter. By default, we auto-delete these.'}
                                        </p>

                                        {/* Toggle */}
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="relative w-14 h-8 rounded-full cursor-pointer transition-colors shadow-inner"
                                                style={{ background: deleteSmallImages ? '#6ab04c' : '#ccc' }}
                                                onClick={() => setDeleteSmallImages(!deleteSmallImages)}
                                            >
                                                <div
                                                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform"
                                                    style={{ transform: deleteSmallImages ? 'translateX(26px)' : 'translateX(4px)' }}
                                                />
                                            </div>
                                            <span className="text-sm font-semibold" style={{ color: '#5a4a3a' }}>
                                                {t.autoDeleteSmall || 'Auto-delete small images'}
                                            </span>
                                            <span className="text-xl ml-1">🖼️</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Start Sorting Button ── */}
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={handleStartScan}
                                disabled={!sourcePath}
                                className="flex items-center gap-3 px-10 py-4 rounded-full text-lg font-extrabold shadow-lg transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                style={{
                                    background: 'linear-gradient(135deg, #e8b88a 0%, #d4976a 100%)',
                                    color: '#4a3020',
                                    boxShadow: '0 8px 24px rgba(200, 160, 120, 0.4)',
                                }}
                            >
                                <ArrowDownToLine size={22} />
                                {t.startSort || 'Start Sorting'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════ STEP 2: Scanning ══════════ */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #e8ddd0 0%, #d8c8b8 100%)' }}>
                            <Sparkles size={40} className="animate-bounce" style={{ color: '#8a7040' }} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4a3a2a' }}>{t.scanning}</h2>
                        <p className="max-w-md text-center mb-4" style={{ color: '#8a7a6a' }}>{t.scanDesc}</p>
                        <div className="w-full max-w-md">
                            <div className="flex justify-between text-sm mb-1" style={{ color: '#8a7a6a' }}>
                                <span>{scanMessage}</span>
                                <span>{scanProgress}%</span>
                            </div>
                            <div className="w-full rounded-full h-3 overflow-hidden" style={{ background: '#e8ddd0' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${scanProgress}%`, background: 'linear-gradient(90deg, #e8b88a, #d4976a)' }}
                                />
                            </div>
                        </div>

                        <div className="w-full max-w-2xl mt-12 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <AdBanner />
                        </div>
                    </div>
                )}

                {/* ══════════ STEP 3: Results ══════════ */}
                {step === 3 && stats && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* Stats cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { label: t.scannedPhotos, value: stats.scanned.toLocaleString(), color: '#6a5a4a', bg: '#fdf8f0' },
                                { label: t.duplicatesTarget, value: stats.duplicates.toLocaleString(), color: '#c0392b', bg: '#fef0f0' },
                                ...(deleteSmallImages ? [{ label: t.smallImagesDelete, value: stats.smallImages.toLocaleString(), color: '#d4976a', bg: '#fef8e8' }] : []),
                                { label: t.identifiedFaces, value: stats.faces, color: '#2980b9', bg: '#eef6ff' },
                                { label: t.expectedSavings, value: stats.savedGB, color: '#27ae60', bg: '#eef8f0' },
                            ].map((card, i) => (
                                <div key={i} className="rounded-2xl p-4 text-center shadow-sm border" style={{ background: card.bg, borderColor: '#e8ddd0' }}>
                                    <div className="text-xs font-semibold mb-1" style={{ color: card.color }}>{card.label}</div>
                                    <div className="text-2xl font-extrabold" style={{ color: card.color }}>{card.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Timeline viewer */}
                        <div className="rounded-3xl p-6 shadow-sm border" style={{ background: '#fdf8f0', borderColor: '#e8ddd0' }}>
                            <h2 className="text-lg font-bold mb-4" style={{ color: '#4a3a2a' }}>{t.timelineViewer}</h2>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 rounded-xl p-4 border border-dashed" style={{ background: '#f8f4ee', borderColor: '#d8cbb8' }}>
                                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center justify-between" style={{ color: '#8a7a6a' }}>
                                        {t.before} <span className="text-xs px-2 py-1 rounded" style={{ background: '#e8ddd0' }}>{t.messyFolder}</span>
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2 opacity-60">
                                        {[...Array(Math.min(16, stats.scanned))].map((_, i) => (
                                            <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ background: '#d8cbb8' }}>
                                                <img src={`https://picsum.photos/seed/nci-bg-${i}/100/100`} alt="mock" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center p-2">
                                    <ChevronRight className="hidden md:block" size={32} style={{ color: '#c9a882' }} />
                                </div>
                                <div className="flex-1 rounded-xl p-4 border" style={{ background: '#f8f0e0', borderColor: '#e0d0b8' }}>
                                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center justify-between" style={{ color: '#8a6a40' }}>
                                        {t.after} <span className="text-xs px-2 py-1 rounded" style={{ background: '#e8d8b8', color: '#6a5030' }}>{t.organizedByDate}</span>
                                    </h3>
                                    <div className="space-y-4 max-h-64 overflow-y-auto">
                                        {Object.entries(stats.timeline)
                                            .sort(([a], [b]) => b.localeCompare(a))
                                            .slice(0, 6)
                                            .map(([yearMonth, count]) => {
                                                const [year, month] = yearMonth.split('/');
                                                const label = t.yearLabel
                                                    ? `${year}${t.yearLabel} ${parseInt(month)}${t.monthLabel} \u2014 ${count}${t.photosLabel}`
                                                    : `${year}/${parseInt(month)} \u2014 ${count} photos`;
                                                return (
                                                    <div key={yearMonth}>
                                                        <div className="text-xs font-bold mb-2" style={{ color: '#8a7a6a' }}>{label}</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[...Array(Math.min(count, 8))].map((_, i) => (
                                                                <div key={i} className="aspect-square rounded-lg shadow-sm overflow-hidden" style={{ background: '#d4b888' }}>
                                                                    <img src={`https://picsum.photos/seed/nci-af-${yearMonth.replace('/', '-')}-${i}/100/100`} alt="mock" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                            {count > 8 && (
                                                                <div className="aspect-square rounded-lg shadow-sm flex items-center justify-center text-xs font-bold" style={{ background: '#e8d8b8', color: '#6a5030' }}>
                                                                    +{count - 8}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        {Object.keys(stats.timeline).length === 0 && (
                                            <p className="text-sm text-center py-4" style={{ color: '#aaa' }}>{t.noDateInfo}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <FaceTagger
                            faceGroups={stats.faceGroups}
                            assignedNames={assignedNames}
                            setAssignedNames={setAssignedNames}
                        />

                        <div className="flex justify-end pt-4 border-t mt-8" style={{ borderColor: '#e8ddd0' }}>
                            {!exported ? (
                                <button onClick={handleExport} disabled={exporting}
                                    className="px-8 py-3 rounded-full font-bold shadow-lg transition-all flex items-center gap-2 hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(135deg, #6ab04c, #4a9030)',
                                        color: '#ffffff',
                                        boxShadow: '0 6px 20px rgba(100, 180, 80, 0.3)',
                                    }}>
                                    {exporting ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t.exporting}</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> {t.applyAndExport}</>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl" style={{ background: '#eef8f0', border: '1px solid #c8e8c0' }}>
                                    <Check size={20} style={{ color: '#27ae60' }} />
                                    <span className="font-bold" style={{ color: '#27ae60' }}>
                                        {t.exportDone} {exportResult ? `${exportResult.organized.toLocaleString()} ${t.exportSaved}` : t.saved}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Language switcher floating */}
            <div className="fixed bottom-4 right-4 z-50">
                <LanguageSwitcher />
            </div>
        </div>
    );
}
