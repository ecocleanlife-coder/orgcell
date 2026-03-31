import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, ChevronRight, Camera, Users, Globe, Lock, User,
    Image as ImageIcon, Check, ArrowLeft, Plus, Settings,
} from 'lucide-react';
import axios from 'axios';

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

const VIS_OPTIONS = [
    { key: 'family',  label: '가족만', icon: Lock },
    { key: 'public',  label: '일반공개 (누구나)', icon: Globe },
    { key: 'private', label: '나만', icon: User },
];

// ─── UploadModal ───
export default function UploadModal({ siteId, subdomain, onClose, onDone }) {
    const [step, setStep] = useState(1); // 1: 목적지, 2: 파일 선택
    const [selectedDest, setSelectedDest] = useState(null);
    const [parentVis, setParentVis] = useState('family');
    const [exhibitions, setExhibitions] = useState([]);
    const [targetExhId, setTargetExhId] = useState(null);
    const [creatingExh, setCreatingExh] = useState(false);

    // 파일 관련
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // 기존 전시관 목록 fetch
    useEffect(() => {
        if (!siteId) return;
        axios.get('/api/exhibitions', { params: { site_id: siteId } })
            .then((r) => { if (r.data?.success) setExhibitions(r.data.data); })
            .catch(() => {});
    }, [siteId]);

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

    // 파일 추가
    const addFiles = (newFiles) => {
        const valid = Array.from(newFiles).filter((f) =>
            f.type.startsWith('image/')
        );
        setFiles((prev) => {
            const names = new Set(prev.map((f) => f.name + f.size));
            return [...prev, ...valid.filter((f) => !names.has(f.name + f.size))];
        });
    };

    const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
    };

    // 업로드 실행
    const handleUpload = async () => {
        if (files.length === 0 || !targetExhId) return;
        setError('');
        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        files.forEach((f) => formData.append('photos', f));
        formData.append('visibility', selectedDest?.defaultVis === 'family' ? parentVis : (selectedDest?.defaultVis || 'private'));
        formData.append('set_cover', files.length <= 3 ? 'true' : 'false');

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
                            {step === 1 ? '어디에 올릴까요?' : '사진 선택'}
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

                    {/* ══ STEP 2: 파일 선택 + 업로드 ══ */}
                    {step === 2 && (
                        <div>
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

                            {/* 미리보기 */}
                            {files.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs font-bold mb-2" style={{ color: '#5a8a4a' }}>
                                        {files.length}장 선택됨
                                    </p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {previews.map((f, i) => (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group" style={{ background: '#f0ece4' }}>
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
                                disabled={uploading || files.length === 0}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all hover:brightness-110"
                                style={{ background: '#5a8a4a' }}
                            >
                                {uploading ? '업로드 중...' : `업로드 (${files.length}장)`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
