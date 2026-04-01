import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    X, ChevronRight, Camera, Users,
    Image as ImageIcon, Check, ArrowLeft, Plus, Settings, Lightbulb, Sparkles,
} from 'lucide-react';
import axios from 'axios';
import { getVisibilityInfo } from '../../hooks/useVisibility';
import { findSimilarGroups } from '../../utils/hashUtils';

// ─── 목적지 카드 데이터 ───
const DEST_PRESETS = [
    {
        key: 'parents',
        icon: '🟡',
        label: '부모님 전시관',
        desc: '가족만 볼 수 있어요',
        defaultVis: 'family',
        hasVisOption: true,
    },
    {
        key: 'family',
        icon: '🟢',
        label: '가족공개 전시관',
        desc: '초대된 가족 공개',
        defaultVis: 'family',
        hasVisOption: false,
    },
    {
        key: 'public',
        icon: '🔵',
        label: '일반공개 전시관',
        desc: '누구나 볼 수 있어요',
        defaultVis: 'public',
        hasVisOption: false,
    },
    {
        key: 'private',
        icon: '🔒',
        label: '내 보관함',
        desc: '나만 볼 수 있어요',
        defaultVis: 'private',
        hasVisOption: false,
    },
];

const VIS_OPTIONS = ['family', 'public', 'private'].map((key) => {
    const info = getVisibilityInfo(key);
    return { key, label: info.shortLabel, icon: info.icon };
});

// ─── 기기 감지 ───
function detectDevice() {
    const ua = navigator.userAgent || '';
    if (/Samsung|SM-|Galaxy/i.test(ua)) return 'samsung';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iphone';
    if (/Macintosh|Mac OS/i.test(ua)) return 'mac';
    return 'pc';
}

const DEVICE_GUIDES = {
    samsung: { icon: '📱', label: '삼성 갤럭시', tip: '내 파일 앱 → DCIM/Camera 폴더에서 사진을 선택해주세요.' },
    android: { icon: '🤖', label: 'Android', tip: '파일 앱 또는 갤러리 → DCIM/Camera 폴더에서 선택해주세요.' },
    iphone: { icon: '🍎', label: 'iPhone / iPad', tip: '아래 "사진 보관함"에서 원하는 사진을 선택해주세요.' },
    mac: { icon: '🍎', label: 'Mac', tip: '사진 앱 → 파일 → 내보내기, 또는 Finder에서 끌어다 놓으세요.' },
    pc: { icon: '🖥️', label: 'PC', tip: '사진 폴더에서 파일을 끌어다 놓거나, 아래 버튼으로 선택하세요.' },
};

// ─── UploadModal ───
export default function UploadModal({ siteId, subdomain, onClose, onDone, initialDest }) {
    const [step, setStep] = useState(initialDest ? 0 : 1); // 0: 초기화 대기, 1: 목적지, 2: 파일 선택
    const [selectedDest, setSelectedDest] = useState(null);
    const [parentVis, setParentVis] = useState('family');
    const [exhibitions, setExhibitions] = useState([]);
    const [targetExhId, setTargetExhId] = useState(null);
    const [creatingExh, setCreatingExh] = useState(false);

    // 파일 관련
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [showPhotoGuide, setShowPhotoGuide] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // 기존 전시관 목록 fetch
    const [exhLoaded, setExhLoaded] = useState(false);
    useEffect(() => {
        if (!siteId) return;
        axios.get('/api/exhibitions', { params: { site_id: siteId } })
            .then((r) => { if (r.data?.success) setExhibitions(r.data.data); })
            .catch(() => {})
            .finally(() => setExhLoaded(true));
    }, [siteId]);

    // initialDest로 바로 진입 (전시관 목록 로드 후)
    useEffect(() => {
        if (step !== 0 || !initialDest || !exhLoaded) return;
        const dest = DEST_PRESETS.find((d) => d.key === initialDest);
        if (!dest) { setStep(1); return; }
        handleDestSelect(dest);
    }, [step, initialDest, exhLoaded, handleDestSelect]);

    // 목적지 선택 → 전시관 찾거나 생성
    const handleDestSelect = useCallback(async (dest) => {
        setSelectedDest(dest);

        if (dest.hasVisOption) return; // 부모님 전시관은 공개범위 선택 후 다음

        const visibility = dest.defaultVis;
        const existing = exhibitions.find((e) => e.visibility === visibility);

        if (existing) {
            setTargetExhId(existing.id);
            setStep(2);
        } else {
            setCreatingExh(true);
            try {
                const res = await axios.post('/api/exhibitions', {
                    site_id: siteId,
                    title: dest.label,
                    visibility,
                });
                if (res.data?.success) {
                    setTargetExhId(res.data.data.id);
                    setExhibitions((prev) => [...prev, res.data.data]);
                    setStep(2);
                }
            } catch (err) {
                setError('전시관 생성 실패');
            } finally {
                setCreatingExh(false);
            }
        }
    }, [exhibitions, siteId]);

    // 부모님 전시관: 공개범위 선택 후 다음
    const handleParentNext = useCallback(async () => {
        const existing = exhibitions.find(
            (e) => e.title === '부모님 전시관' || (e.visibility === parentVis && e.title?.includes('부모님'))
        );

        if (existing) {
            // visibility 업데이트
            await axios.put(`/api/exhibitions/${existing.id}`, { visibility: parentVis }).catch(() => {});
            setTargetExhId(existing.id);
            setStep(2);
        } else {
            setCreatingExh(true);
            try {
                const res = await axios.post('/api/exhibitions', {
                    site_id: siteId,
                    title: '부모님 전시관',
                    visibility: parentVis,
                });
                if (res.data?.success) {
                    setTargetExhId(res.data.data.id);
                    setExhibitions((prev) => [...prev, res.data.data]);
                    setStep(2);
                }
            } catch {
                setError('전시관 생성 실패');
            } finally {
                setCreatingExh(false);
            }
        }
    }, [exhibitions, parentVis, siteId]);

    // 파일 해시 계산 (중복 감지용)
    const [dupCount, setDupCount] = useState(0);
    const hashCache = useRef(new Set());

    // 유사 사진 그룹
    const [similarGroups, setSimilarGroups] = useState([]); // [[idx, idx, ...], ...]
    const [analyzingSimilar, setAnalyzingSimilar] = useState(false);
    const [excludedIdxs, setExcludedIdxs] = useState(new Set()); // 사용자가 제외한 인덱스

    // 기기 감지
    const device = useMemo(() => detectDevice(), []);
    const deviceGuide = DEVICE_GUIDES[device];

    const computeHash = async (file) => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    };

    // 파일 추가 (SHA-256 해시 중복 제거)
    const addFiles = async (newFiles) => {
        const valid = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
        const unique = [];
        let dups = 0;

        for (const file of valid) {
            const hash = await computeHash(file);
            if (hashCache.current.has(hash)) {
                dups++;
            } else {
                hashCache.current.add(hash);
                unique.push(file);
            }
        }

        if (dups > 0) setDupCount((prev) => prev + dups);
        if (unique.length > 0) {
            setFiles((prev) => [...prev, ...unique]);
        }
    };

    // 파일 변경 시 유사 사진 분석
    useEffect(() => {
        if (files.length < 2) { setSimilarGroups([]); return; }
        let cancelled = false;
        setAnalyzingSimilar(true);
        findSimilarGroups(files).then((groups) => {
            if (!cancelled) {
                setSimilarGroups(groups);
                setAnalyzingSimilar(false);
            }
        }).catch(() => { if (!cancelled) setAnalyzingSimilar(false); });
        return () => { cancelled = true; };
    }, [files]);

    const removeFile = (idx) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
        setExcludedIdxs((prev) => { const next = new Set(prev); next.delete(idx); return next; });
    };

    // 그룹에서 "이 한 장만 남기기" → 나머지 제외
    const keepOnlyInGroup = (group, keepIdx) => {
        setExcludedIdxs((prev) => {
            const next = new Set(prev);
            group.forEach((idx) => { if (idx !== keepIdx) next.add(idx); });
            return next;
        });
    };

    // 그룹 전체 유지
    const keepAllInGroup = (group) => {
        setExcludedIdxs((prev) => {
            const next = new Set(prev);
            group.forEach((idx) => next.delete(idx));
            return next;
        });
    };

    // 최종 업로드할 파일 (제외된 인덱스 빼기)
    const finalFiles = files.filter((_, i) => !excludedIdxs.has(i));

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    };

    // 업로드 실행
    const handleUpload = async () => {
        if (finalFiles.length === 0 || !targetExhId) return;
        setError('');
        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        finalFiles.forEach((f) => formData.append('photos', f));
        formData.append('visibility', selectedDest?.defaultVis === 'family' ? parentVis : (selectedDest?.defaultVis || 'private'));
        formData.append('set_cover', finalFiles.length <= 3 ? 'true' : 'false');

        try {
            await axios.post(`/api/exhibitions/${targetExhId}/photos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
                },
            });
            setDone(true);
            setTimeout(() => { onDone?.(); onClose(); }, 800);
        } catch (err) {
            setError(err.response?.data?.message || '업로드 실패');
        } finally {
            setUploading(false);
        }
    };

    const previews = files.slice(0, 8);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
                style={{ border: '1.5px solid #e8e0d0' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: '#f0ece4' }}>
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="mr-1">
                                <ArrowLeft size={18} style={{ color: '#7a7a6a' }} />
                            </button>
                        )}
                        <h3 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>
                            {step === 1 ? '어디에 올릴까요?' : '큐레이션 도우미'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full"
                        style={{ background: '#f0ece4' }}
                    >
                        <X size={14} style={{ color: '#7a7a6a' }} />
                    </button>
                </div>

                <div className="p-5">
                    {/* ══ STEP 0: initialDest 로딩 ══ */}
                    {step === 0 && (
                        <div className="py-12 flex justify-center">
                            <div className="w-6 h-6 border-2 border-[#5a8a4a] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* ══ STEP 1: 목적지 선택 ══ */}
                    {step === 1 && (
                        <div className="space-y-3">
                            {DEST_PRESETS.map((dest) => (
                                <div key={dest.key}>
                                    <button
                                        onClick={() => handleDestSelect(dest)}
                                        disabled={creatingExh}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all hover:bg-gray-50 disabled:opacity-50 text-left"
                                        style={{
                                            borderColor: selectedDest?.key === dest.key ? '#5a8a4a' : '#e8e0d0',
                                            background: selectedDest?.key === dest.key ? '#f0f7ec' : '#fff',
                                        }}
                                    >
                                        <span className="text-2xl">{dest.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>{dest.label}</p>
                                            <p className="text-xs" style={{ color: '#9a9a8a' }}>{dest.desc}</p>
                                        </div>
                                        <ChevronRight size={16} style={{ color: '#ccc' }} />
                                    </button>

                                    {/* 부모님 전시관: 공개 범위 선택 */}
                                    {dest.hasVisOption && selectedDest?.key === dest.key && (
                                        <div className="mt-2 ml-4 p-3 rounded-xl" style={{ background: '#faf8f4', border: '1px solid #e8e0d0' }}>
                                            <p className="text-xs font-bold mb-2" style={{ color: '#7a7a6a' }}>공개 범위:</p>
                                            <div className="space-y-1.5">
                                                {VIS_OPTIONS.map(({ key, label, icon: Icon }) => (
                                                    <label
                                                        key={key}
                                                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white"
                                                        style={{ background: parentVis === key ? '#fff' : 'transparent', border: parentVis === key ? '1px solid #5a8a4a' : '1px solid transparent' }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="parentVis"
                                                            checked={parentVis === key}
                                                            onChange={() => setParentVis(key)}
                                                            className="accent-[#5a8a4a]"
                                                        />
                                                        <Icon size={14} style={{ color: parentVis === key ? '#5a8a4a' : '#9a9a8a' }} />
                                                        <span className="text-sm" style={{ color: '#3a3a2a' }}>{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <button
                                                onClick={handleParentNext}
                                                disabled={creatingExh}
                                                className="mt-3 w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                                                style={{ background: '#5a8a4a' }}
                                            >
                                                {creatingExh ? '준비 중...' : '다음'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* 기존 전시관 선택 */}
                            {exhibitions.length > 0 && (
                                <div className="pt-3 border-t" style={{ borderColor: '#f0ece4' }}>
                                    <p className="text-xs font-bold mb-2" style={{ color: '#7a7a6a' }}>기존 전시관에 추가:</p>
                                    <div className="space-y-2">
                                        {exhibitions.map((exh) => (
                                            <button
                                                key={exh.id}
                                                onClick={() => { setTargetExhId(exh.id); setSelectedDest({ key: 'existing', defaultVis: exh.visibility }); setStep(2); }}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-gray-50"
                                                style={{ borderColor: '#e8e0d0' }}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{
                                                        background: exh.cover_photo ? `url(${exh.cover_photo}) center/cover` : '#e8e0d0',
                                                    }}
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
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══ STEP 2: 큐레이션 도우미 ══ */}
                    {step === 2 && (
                        <div>
                            {/* 큐레이션 메인 문구 */}
                            <p className="text-sm leading-relaxed mb-1" style={{ color: '#5a5a4a' }}>
                                장수를 제한하기보다, 먼저 우리 가족의 소중한 사진을 골라서 시작해 보세요.
                            </p>
                            <p className="text-xs mb-4" style={{ color: '#9a9a8a' }}>
                                사진 찾기를 먼저 도와 드리겠습니다. 정확한 위치를 아시는 분은 바로 선택해 주세요.
                            </p>

                            {/* 기기별 자동 가이드 */}
                            <div className="flex items-start gap-2.5 mb-4 p-3 rounded-xl" style={{ background: '#f0f7ec', border: '1px solid #d4e8cc' }}>
                                <span className="text-lg shrink-0">{deviceGuide.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold" style={{ color: '#3a6a2a' }}>{deviceGuide.label} 감지됨</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#5a8a4a' }}>{deviceGuide.tip}</p>
                                </div>
                            </div>

                            {/* 사진 찾기 팁 버튼 */}
                            <button
                                onClick={() => setShowPhotoGuide((v) => !v)}
                                className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-50"
                                style={{ color: '#b8860b', background: '#fffbf0', border: '1px solid #f0e6c8' }}
                            >
                                <Lightbulb size={13} /> 사진 찾기 팁
                            </button>

                            {showPhotoGuide && (
                                <div className="mb-4 rounded-xl p-4 space-y-3" style={{ background: '#f8f6f0', border: '1px solid #e8e0d0' }}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold" style={{ color: '#3a3a2a' }}>기기별 사진 저장 위치</h4>
                                        <button onClick={() => setShowPhotoGuide(false)} className="text-slate-400"><X size={14} /></button>
                                    </div>
                                    <div className="space-y-2.5 text-xs" style={{ color: '#5a5a4a' }}>
                                        <div>
                                            <p className="font-bold mb-0.5">📱 삼성 갤럭시</p>
                                            <p className="pl-4">내 파일 앱 → DCIM → Camera</p>
                                            <p className="pl-4">갤러리 앱 → 앨범에서 선택</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5">🍎 iPhone / iPad</p>
                                            <p className="pl-4">사진 앱 → 앨범 → 선택 → 공유 → "파일에 저장"</p>
                                            <p className="pl-4">또는 iCloud.com/photos 에서 다운로드</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5">🖥️ PC (Windows / Mac)</p>
                                            <p className="pl-4">사진 폴더에서 파일을 끌어다 놓으세요</p>
                                            <p className="pl-4">Windows: 사진 폴더 또는 OneDrive\Pictures</p>
                                            <p className="pl-4">Mac: ~/Pictures 또는 사진 앱 → 내보내기</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5">☁️ 클라우드</p>
                                            <p className="pl-4">Google Photos → 다운로드</p>
                                            <p className="pl-4">Google Drive → 내 드라이브에서 다운로드</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 드래그앤드롭 영역 */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4"
                                style={{
                                    borderColor: dragging ? '#5a8a4a' : '#d8d0c0',
                                    background: dragging ? '#f0f7ec' : '#faf8f4',
                                }}
                            >
                                <Camera size={32} className="mx-auto mb-2 opacity-40" style={{ color: '#5a8a4a' }} />
                                <p className="text-sm font-semibold" style={{ color: '#5a5a4a' }}>
                                    사진을 끌어놓거나{' '}
                                    <span className="underline" style={{ color: '#5a8a4a' }}>선택하기</span>
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#aaa' }}>JPG, PNG, GIF, WebP (최대 20MB)</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => addFiles(e.target.files)}
                                />
                            </div>

                            {/* 중복 제거 알림 */}
                            {dupCount > 0 && (
                                <div className="mb-3 p-2.5 rounded-lg flex items-center gap-2 text-xs" style={{ background: '#fef9e7', border: '1px solid #f0e6c8', color: '#b8860b' }}>
                                    <Sparkles size={14} />
                                    <span>중복된 사진 <strong>{dupCount}장</strong>을 정리했습니다</span>
                                </div>
                            )}

                            {/* 미리보기 */}
                            {files.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-bold mb-2" style={{ color: '#5a8a4a' }}>
                                        {finalFiles.length}장 업로드 예정
                                        {excludedIdxs.size > 0 && (
                                            <span className="ml-2 font-normal" style={{ color: '#9a9a8a' }}>
                                                ({excludedIdxs.size}장 큐레이션 제외)
                                            </span>
                                        )}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {previews.map((f, i) => (
                                            <div
                                                key={i}
                                                className="relative aspect-square rounded-lg overflow-hidden group"
                                                style={{
                                                    background: '#f0ece4',
                                                    opacity: excludedIdxs.has(i) ? 0.35 : 1,
                                                    transition: 'opacity 0.2s',
                                                }}
                                            >
                                                <img
                                                    src={URL.createObjectURL(f)}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} style={{ color: '#fff' }} />
                                                </button>
                                            </div>
                                        ))}
                                        {files.length > 8 && (
                                            <div className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#f0ece4', color: '#7a7a6a' }}>
                                                +{files.length - 8}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── 유사 사진 그룹 제안 카드 ── */}
                            {analyzingSimilar && files.length >= 2 && (
                                <div className="mb-3 p-3 rounded-xl flex items-center gap-2 text-xs" style={{ background: '#f5f0ff', border: '1px solid #e0d5f5', color: '#7c5cbf' }}>
                                    <div className="w-4 h-4 border-2 border-[#7c5cbf] border-t-transparent rounded-full animate-spin" />
                                    비슷한 사진을 분석하고 있어요...
                                </div>
                            )}

                            {similarGroups.length > 0 && !analyzingSimilar && (
                                <div className="mb-4 space-y-3">
                                    <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#7c5cbf' }}>
                                        <Sparkles size={13} /> 비슷한 사진이 {similarGroups.length}그룹 발견됐어요
                                    </p>
                                    {similarGroups.map((group, gi) => (
                                        <div key={gi} className="rounded-xl p-3" style={{ background: '#faf8ff', border: '1px solid #e8e0f5' }}>
                                            <p className="text-xs mb-2" style={{ color: '#5a5a4a' }}>
                                                가장 잘 나온 한 장만 전시할까요?
                                            </p>
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                                {group.map((idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => keepOnlyInGroup(group, idx)}
                                                        className="shrink-0 relative rounded-lg overflow-hidden transition-all"
                                                        style={{
                                                            width: 64, height: 64,
                                                            border: excludedIdxs.has(idx) ? '2px solid #ddd' : '2px solid #7c5cbf',
                                                            opacity: excludedIdxs.has(idx) ? 0.4 : 1,
                                                        }}
                                                    >
                                                        <img
                                                            src={URL.createObjectURL(files[idx])}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {!excludedIdxs.has(idx) && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-[#7c5cbf]/80 text-white text-[9px] text-center py-0.5">
                                                                선택
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => keepAllInGroup(group)}
                                                className="mt-2 text-xs underline"
                                                style={{ color: '#9a9a8a' }}
                                            >
                                                전부 유지하기
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 프로그레스바 */}
                            {uploading && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs mb-1" style={{ color: '#7a7a6a' }}>
                                        <span>업로드 중...</span>
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
                                    <Check size={16} /> 업로드 완료!
                                </div>
                            )}

                            {error && <p className="mb-3 text-xs font-bold text-red-500">{error}</p>}

                            {/* 업로드 버튼 */}
                            <button
                                onClick={handleUpload}
                                disabled={uploading || finalFiles.length === 0}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:brightness-110"
                                style={{ background: '#5a8a4a' }}
                            >
                                {uploading ? '업로드 중...' : `업로드 (${finalFiles.length}장)`}
                            </button>

                            {/* 안심 멘트 */}
                            <p className="mt-4 text-xs text-center leading-relaxed" style={{ color: '#b0a898' }}>
                                지금은 가장 소중한 몇 장으로 가볍게 시작해 보세요.<br />
                                나중에 가족에게 요청하거나 클라우드에서 천천히 추가하셔도 충분합니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
