import React, { useState } from 'react';
import { ArrowLeft, FolderOpen, Play, CheckCircle2, ChevronRight, SlidersHorizontal, Trash2, Copy, Check, Sparkles, Trash, ImageOff, Search } from 'lucide-react';
import ProgressBar from '../../components/smart-sort/ProgressBar';
import FaceTagger from '../../components/smart-sort/FaceTagger';

export default function SmartSortView() {
    const [step, setStep] = useState(1);
    const [sourcePath, setSourcePath] = useState('');
    const [destPath, setDestPath] = useState('');
    const [dupAction, setDupAction] = useState('delete'); // 'delete' or 'move'
    const [deleteSmallImages, setDeleteSmallImages] = useState(true); // ON by default
    const [includeSmallInSearch, setIncludeSmallInSearch] = useState(false); // OFF by default

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [exported, setExported] = useState(false);

    const handleBrowseFolder = async (setter) => {
        try {
            // Modern File System Access API — shows native folder picker (no upload message)
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setter(dirHandle.name);
        } catch (err) {
            // User cancelled or browser doesn't support — ignore
        }
    };

    const handleExport = () => {
        setExporting(true);
        setTimeout(() => {
            setExporting(false);
            setExported(true);
        }, 2000);
    };

    const handleStartScan = () => {
        setIsScanning(true);
        setStep(2);

        // Mock progress
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            setScanProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setIsScanning(false);
                    setStep(3);
                }, 500);
            }
        }, 150);
    };

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
                            AI 스마트 분류
                        </h1>
                    </div>
                    {/* Stepper */}
                    <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-1 rounded-md ${step >= 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>1. 설정</span>
                        <ChevronRight size={16} />
                        <span className={`px-2 py-1 rounded-md ${step >= 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>2. AI 스캔</span>
                        <ChevronRight size={16} />
                        <span className={`px-2 py-1 rounded-md ${step >= 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}>3. 인물 지정 & 결과</span>
                    </div>
                </div>
            </header>

            {/* Non-intrusive Top Progress Bar */}
            <ProgressBar isVisible={isScanning} progress={scanProgress} title="로컬 AI가 사진을 분석 중입니다..." />

            <main className="max-w-5xl mx-auto px-4 py-8">
                {step === 1 && (
                    <div className="space-y-8 animate-fade-in-up">
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FolderOpen className="text-blue-500" />
                                1. 분류할 폴더 선택
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">원본 사진이 있는 경로 (Source)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sourcePath}
                                            onChange={(e) => setSourcePath(e.target.value)}
                                            placeholder="C:\Users\Family\Pictures"
                                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button onClick={() => handleBrowseFolder(setSourcePath)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors whitespace-nowrap">찾아보기</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">정리된 사진을 저장할 경로 (Destination)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={destPath}
                                            onChange={(e) => setDestPath(e.target.value)}
                                            placeholder="D:\Organized_Photos"
                                            className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button onClick={() => handleBrowseFolder(setDestPath)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors whitespace-nowrap">찾아보기</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <SlidersHorizontal className="text-blue-500" />
                                2. 중복 처리 옵션
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                AI가 완전히 동일하거나 매우 비슷한 연사 사진을 발견했을 때 어떻게 처리할지 선택하세요.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm hover:border-red-500 transition-colors ${dupAction === 'delete' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                                    <input type="radio" name="dupAction" value="delete" className="sr-only" checked={dupAction === 'delete'} onChange={() => setDupAction('delete')} />
                                    <span className="flex flex-1">
                                        <span className="flex flex-col">
                                            <span className="block text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                <Trash2 size={16} className={dupAction === 'delete' ? 'text-red-500' : 'text-gray-400'} />
                                                최적 1장 제외 삭제 (권장)
                                            </span>
                                            <span className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">용량을 아끼고 가장 잘 나온 사진만 남깁니다.</span>
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
                                                'Duplicates' 폴더로 이동
                                            </span>
                                            <span className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">혹시 모를 상황을 대비해 원본을 따로 보관합니다.</span>
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
                                3. 작은 이미지 정리
                            </h2>

                            {/* Info notice */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
                                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                                    폰이나 컴퓨터에는 앱 아이콘, 썸네일 캐시, 시스템 이미지 등 <span className="font-bold">사진이 아닌 작은 이미지 파일</span>이 많이 저장되어 있습니다.
                                    이러한 파일들은 용량을 차지하고 사진 정리를 방해합니다. 기본적으로 이런 작은 이미지들을 자동 삭제합니다.
                                </p>
                            </div>

                            {/* Toggle: Delete small images (default ON) */}
                            <div className="space-y-4">
                                <label className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors ${deleteSmallImages ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <Trash size={18} className={deleteSmallImages ? 'text-red-500' : 'text-gray-400'} />
                                        <div>
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">작은 이미지 자동 삭제</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">아이콘, 썸네일, 시스템 이미지 등 200px 이하 파일 제거 (권장)</span>
                                        </div>
                                    </div>
                                    <div className={`relative w-12 h-7 rounded-full transition-colors ${deleteSmallImages ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        onClick={() => setDeleteSmallImages(!deleteSmallImages)}>
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${deleteSmallImages ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>

                                {/* Toggle: Include small photos in search (default OFF) */}
                                <label className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors ${includeSmallInSearch ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <Search size={18} className={includeSmallInSearch ? 'text-blue-500' : 'text-gray-400'} />
                                        <div>
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">작은 사진 포함 전체 검색</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">작은 사진까지 모두 포함하여 검색합니다 (시간이 더 걸릴 수 있습니다)</span>
                                        </div>
                                    </div>
                                    <div className={`relative w-12 h-7 rounded-full transition-colors ${includeSmallInSearch ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        onClick={() => setIncludeSmallInSearch(!includeSmallInSearch)}>
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${includeSmallInSearch ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                </label>
                            </div>

                            {/* Summary */}
                            <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400">
                                {deleteSmallImages
                                    ? '✅ 아이콘/썸네일/시스템 이미지가 자동 삭제됩니다.'
                                    : '⚠️ 작은 이미지도 보존됩니다. 수동으로 정리해야 합니다.'}
                                {' · '}
                                {includeSmallInSearch
                                    ? '🔍 작은 사진 포함 전체 검색 활성화'
                                    : '📷 일반 크기 사진만 검색'}
                            </div>
                        </section>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={handleStartScan}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105"
                            >
                                <Play size={20} fill="currentColor" />
                                분류 시작하기
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-6">
                            <Sparkles size={40} className="animate-bounce" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">로컬 환경에서 안전하게 스캔 중입니다</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md text-center">
                            사진은 서버로 전송되지 않으며, 기기의 성능을 활용해 인물과 타임라인을 분류하고 있습니다.
                        </p>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-gray-500">스캔된 사진</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">4,281<span className="text-sm font-normal text-gray-400">장</span></div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-red-500">중복 (정리 대상)</div>
                                <div className="text-2xl font-bold text-red-600">842<span className="text-sm font-normal text-red-400">장</span></div>
                            </div>
                            {deleteSmallImages && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 text-center">
                                    <div className="text-sm text-orange-500">작은 이미지 삭제</div>
                                    <div className="text-2xl font-bold text-orange-600">1,247<span className="text-sm font-normal text-orange-400">개</span></div>
                                </div>
                            )}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-blue-500">식별된 인물</div>
                                <div className="text-2xl font-bold text-blue-600">7<span className="text-sm font-normal text-blue-400">명</span></div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                <div className="text-sm text-emerald-500">절약 기대 용량</div>
                                <div className="text-2xl font-bold text-emerald-600">{deleteSmallImages ? '4.8' : '3.2'}<span className="text-sm font-normal text-emerald-400">GB</span></div>
                            </div>
                        </div>

                        {/* Timeline Before & After Placeholder */}
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold mb-4">타임라인 대조 뷰어 (Before & After)</h2>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-dashed border-gray-300 dark:border-gray-600">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        Before <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">혼란스러운 폴더</span>
                                    </h3>
                                    {/* Mock Before */}
                                    <div className="grid grid-cols-4 gap-2 opacity-60">
                                        {[...Array(16)].map((_, i) => (
                                            <div key={i} className="aspect-square bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-center p-2">
                                    <ChevronRight className="text-blue-500 hidden md:block" size={32} />
                                </div>
                                <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        After <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">연도/월별 정리</span>
                                    </h3>
                                    {/* Mock After Timeline */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 mb-2">2026년 3월</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="aspect-square bg-blue-400 dark:bg-blue-600 rounded-lg shadow-sm"></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 mb-2">2025년 12월</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[...Array(8)].map((_, i) => (
                                                    <div key={i} className="aspect-square bg-blue-300 dark:bg-blue-700 rounded-lg shadow-sm"></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Face Tagger Component */}
                        <FaceTagger />

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-8">
                            {!exported ? (
                                <button onClick={handleExport} disabled={exporting}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2">
                                    {exporting ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 내보내는 중...</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> 최종 적용 및 내보내기</>
                                    )}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-6 py-3 rounded-xl">
                                    <Check size={20} className="text-emerald-600" />
                                    <span className="font-bold text-emerald-700 dark:text-emerald-300">정리 완료! 3,439장이 연도/월별로 저장되었습니다.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
