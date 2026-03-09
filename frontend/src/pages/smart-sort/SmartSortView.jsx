import React, { useState, useRef } from 'react';
import { ArrowLeft, FolderOpen, Play, CheckCircle2, ChevronRight, SlidersHorizontal, Trash2, Copy, Check, Sparkles, Trash, ImageOff, Search, AlertCircle, HardDrive } from 'lucide-react';
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            {/* Nav Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                            {t.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                            <span className={`px-2 py-1 rounded-md ${step >= 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>{t.step1}</span>
                            <ChevronRight size={16} />
                            <span className={`px-2 py-1 rounded-md ${step >= 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>{t.step2}</span>
                            <ChevronRight size={16} />
                            <span className={`px-2 py-1 rounded-md ${step >= 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>{t.step3}</span>
                        </div>
                        <LanguageSwitcher />
                    </div>
                </div>
            </header>

            <ProgressBar isVisible={isScanning} progress={scanProgress} title={scanMessage || t.defaultProgress} />

            <main className="max-w-5xl mx-auto px-4 py-8">
                {scanError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in-up">
                        <AlertCircle size={20} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-700 dark:text-red-300">{scanError}</p>
                        <button onClick={() => setScanError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold text-lg">&times;</button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FolderOpen className="text-blue-500" />
                                {t.selectFolder}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.sourceLabel}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sourcePath}
                                            onChange={(e) => setSourcePath(e.target.value)}
                                            placeholder={t.selectPlaceholder}
                                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            readOnly
                                        />
                                        <button onClick={() => { setSourceType('local'); handleBrowseFolder(setSourcePath, sourceDirRef); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors whitespace-nowrap">
                                            {t.browse}
                                        </button>
                                    </div>
                                    {/* Google Drive option */}
                                    <button
                                        onClick={handleConnectDrive}
                                        className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors border ${sourceType === 'drive'
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                                            }`}
                                    >
                                        <HardDrive size={16} />
                                        {t.googleDrive}
                                        {sourceType === 'drive' && <CheckCircle2 size={16} className="text-blue-500" />}
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.destLabel}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={destPath}
                                            onChange={(e) => setDestPath(e.target.value)}
                                            placeholder={t.selectOptional}
                                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                            readOnly
                                        />
                                        <button onClick={() => handleBrowseFolder(setDestPath, destDirRef)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors whitespace-nowrap">
                                            {t.browse}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="text-blue-500" />
                                {t.dupOptions}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.dupDesc}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-red-500 transition-colors ${dupAction === 'delete' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                                    <input type="radio" name="dupAction" value="delete" className="sr-only" checked={dupAction === 'delete'} onChange={() => setDupAction('delete')} />
                                    <span className="flex flex-1">
                                        <span className="flex flex-col">
                                            <span className="block text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <Trash2 size={16} className={dupAction === 'delete' ? 'text-red-500' : 'text-gray-400'} />
                                                {t.deleteKeepBest}
                                            </span>
                                            <span className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">{t.deleteKeepBestDesc}</span>
                                        </span>
                                    </span>
                                    {dupAction === 'delete' && <CheckCircle2 className="h-5 w-5 text-red-600" aria-hidden="true" />}
                                </label>

                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-blue-500 transition-colors ${dupAction === 'move' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                                    <input type="radio" name="dupAction" value="move" className="sr-only" checked={dupAction === 'move'} onChange={() => setDupAction('move')} />
                                    <span className="flex flex-1">
                                        <span className="flex flex-col">
                                            <span className="block text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <Copy size={16} className={dupAction === 'move' ? 'text-blue-500' : 'text-gray-400'} />
                                                {t.moveToDuplicates}
                                            </span>
                                            <span className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">{t.moveToDuplicatesDesc}</span>
                                        </span>
                                    </span>
                                    {dupAction === 'move' && <CheckCircle2 className="h-5 w-5 text-blue-600" aria-hidden="true" />}
                                </label>
                            </div>
                        </section>

                        {/* Small Image Cleanup */}
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <ImageOff className="text-blue-500" />
                                {t.smallImageCleanup}
                            </h2>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
                                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{t.smallImageInfo}</p>
                            </div>

                            <div className="space-y-4">
                                <label className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors ${deleteSmallImages ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <Trash size={18} className={deleteSmallImages ? 'text-red-500' : 'text-gray-400'} />
                                        <div>
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">{t.autoDeleteSmall}</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.autoDeleteSmallDesc}</span>
                                        </div>
                                    </div>
                                    <div className={`relative w-12 h-7 rounded-full transition-colors ${deleteSmallImages ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        onClick={() => setDeleteSmallImages(!deleteSmallImages)}>
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${deleteSmallImages ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>

                                <label className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors ${includeSmallInSearch ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <Search size={18} className={includeSmallInSearch ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">{t.includeSmallSearch}</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.includeSmallSearchDesc}</span>
                                        </div>
                                    </div>
                                    <div className={`relative w-12 h-7 rounded-full transition-colors ${includeSmallInSearch ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        onClick={() => setIncludeSmallInSearch(!includeSmallInSearch)}>
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${includeSmallInSearch ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            </div>

                            <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                                {deleteSmallImages ? `\u2705 ${t.summaryDeleteOn}` : `\u26A0\uFE0F ${t.summaryDeleteOff}`}
                                {' \u00B7 '}
                                {includeSmallInSearch ? `\uD83D\uDD0D ${t.summarySearchOn}` : `\uD83D\uDCF7 ${t.summarySearchOff}`}
                            </div>
                        </section>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleStartScan}
                                disabled={!sourcePath}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105"
                            >
                                <Play size={20} fill="currentColor" />
                                {t.startSort}
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-6">
                            <Sparkles size={40} className="animate-bounce" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">{t.scanning}</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md text-center mb-4">{t.scanDesc}</p>
                        <div className="w-full max-w-md">
                            <div className="flex justify-between text-sm text-gray-500 mb-1">
                                <span>{scanMessage}</span>
                                <span>{scanProgress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                        </div>

                        {/* Advertisement Banner during loading */}
                        <div className="w-full max-w-2xl mt-12 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <AdBanner />
                        </div>
                    </div>
                )}

                {step === 3 && stats && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-gray-500">{t.scannedPhotos}</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scanned.toLocaleString()}{t.unit && <span className="text-sm font-normal text-gray-400">{t.unit}</span>}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-red-500">{t.duplicatesTarget}</div>
                                <div className="text-2xl font-bold text-red-600">{stats.duplicates.toLocaleString()}{t.unit && <span className="text-sm font-normal text-red-400">{t.unit}</span>}</div>
                            </div>
                            {deleteSmallImages && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 text-center">
                                    <div className="text-sm text-orange-500">{t.smallImagesDelete}</div>
                                    <div className="text-2xl font-bold text-orange-600">{stats.smallImages.toLocaleString()}{t.unitSmall && <span className="text-sm font-normal text-orange-400">{t.unitSmall}</span>}</div>
                                </div>
                            )}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-blue-500">{t.identifiedFaces}</div>
                                <div className="text-2xl font-bold text-blue-600">{stats.faces}{t.unitFace && <span className="text-sm font-normal text-blue-400">{t.unitFace}</span>}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-emerald-500">{t.expectedSavings}</div>
                                <div className="text-2xl font-bold text-emerald-600">{stats.savedGB}</div>
                            </div>
                        </div>

                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4">{t.timelineViewer}</h2>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-dashed border-gray-300 dark:border-gray-600">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        {t.before} <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{t.messyFolder}</span>
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2 opacity-60">
                                        {[...Array(Math.min(16, stats.scanned))].map((_, i) => (
                                            <div key={i} className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg overflow-hidden">
                                                <img src={`https://picsum.photos/seed/nci-bg-${i}/100/100`} alt="mock" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center p-2">
                                    <ChevronRight className="text-blue-500 hidden md:block" size={32} />
                                </div>
                                <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        {t.after} <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">{t.organizedByDate}</span>
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
                                                        <div className="text-xs font-bold text-gray-500 mb-2">{label}</div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[...Array(Math.min(count, 8))].map((_, i) => (
                                                                <div key={i} className="aspect-square bg-blue-400 dark:bg-blue-600 rounded-lg shadow-sm overflow-hidden">
                                                                    <img src={`https://picsum.photos/seed/nci-af-${yearMonth.replace('/', '-')}-${i}/100/100`} alt="mock" className="w-full h-full object-cover" />
                                                                </div>
                                                            ))}
                                                            {count > 8 && (
                                                                <div className="aspect-square bg-blue-300 dark:bg-blue-700 rounded-lg shadow-sm flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-200">
                                                                    +{count - 8}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        {Object.keys(stats.timeline).length === 0 && (
                                            <p className="text-sm text-gray-400 text-center py-4">{t.noDateInfo}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <FaceTagger
                            faceGroups={stats.faceGroups}
                            assignedNames={assignedNames}
                            setAssignedNames={setAssignedNames}
                        />

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-8">
                            {!exported ? (
                                <button onClick={handleExport} disabled={exporting}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
                                    {exporting ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t.exporting}</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> {t.applyAndExport}</>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-6 py-3 rounded-xl">
                                    <Check size={20} className="text-emerald-600" />
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                        {t.exportDone} {exportResult ? `${exportResult.organized.toLocaleString()} ${t.exportSaved}` : t.saved}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
