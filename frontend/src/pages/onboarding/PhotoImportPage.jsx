import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const SOURCES = [
    {
        id: 'device',
        icon: '📱',
        title: '이 기기 (폰/PC)',
        desc: '카메라롤, 로컬 폴더에서 직접 선택',
    },
    {
        id: 'google',
        icon: '☁️',
        title: 'Google Drive',
        desc: '드라이브 폴더에서 불러오기',
        api: '/api/drive/photos',
    },
    {
        id: 'onedrive',
        icon: '☁️',
        title: 'OneDrive',
        desc: 'OneDrive 폴더에서 불러오기',
        api: '/api/onedrive/photos',
    },
    {
        id: 'dropbox',
        icon: '📦',
        title: 'Dropbox',
        desc: 'Dropbox 폴더에서 불러오기',
        api: '/api/dropbox/photos',
    },
];

export default function PhotoImportPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';
    const { setCurrentStep, completeStep } = useOnboardingStore();
    const fileInputRef = useRef(null);

    const [phase, setPhase] = useState('select'); // select | importing | done | error
    const [selected, setSelected] = useState(() => {
        // 저장소 선택에서 온 경우 해당 소스 미리 선택
        if (storage === 'google') return ['google'];
        if (storage === 'onedrive') return ['onedrive'];
        if (storage === 'orgcell') return ['device'];
        return [];
    });
    const [progress, setProgress] = useState(0);
    const [photos, setPhotos] = useState([]);
    const [localFiles, setLocalFiles] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [importingSrc, setImportingSrc] = useState('');

    useEffect(() => { setCurrentStep('photos'); }, []);

    const onboardingType = localStorage.getItem('onboarding_type') || 'museum';
    const themeBg = { museum: '#F3EFFF', ai: '#EFF7E8', share: '#EFF5FF' }[onboardingType];
    const themeColor = { museum: '#7C5CFC', ai: '#5A9460', share: '#4A7FB5' }[onboardingType];
    const themeHover = { museum: '#6A4AE0', ai: '#4A8450', share: '#3A6FA5' }[onboardingType];

    const toggleSource = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    // 로컬 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const previews = files.map((f) => ({
            id: `local-${f.name}-${f.size}`,
            name: f.name,
            size: f.size,
            thumbnailUrl: URL.createObjectURL(f),
            source: 'device',
            file: f,
        }));
        setLocalFiles(previews);
    };

    // 전체 가져오기 시작
    const handleImport = async () => {
        if (selected.length === 0) return;

        // device만 선택 + 파일 미선택 → 파일 다이얼로그 열기
        if (selected.length === 1 && selected[0] === 'device' && localFiles.length === 0) {
            fileInputRef.current?.click();
            return;
        }

        setPhase('importing');
        setProgress(0);
        setErrorMsg('');

        const allPhotos = [...localFiles];
        const cloudSources = selected.filter((s) => s !== 'device');
        const totalSteps = cloudSources.length + (localFiles.length > 0 ? 1 : 0);
        let completedStepsCount = 0;

        // 로컬 파일 업로드
        if (selected.includes('device') && localFiles.length > 0) {
            setImportingSrc('이 기기');
            for (let i = 0; i < localFiles.length; i++) {
                try {
                    const formData = new FormData();
                    formData.append('file', localFiles[i].file);
                    await axios.post('/api/photos/upload', formData);
                } catch {
                    // 개별 실패 무시
                }
                setProgress(Math.round(((i + 1) / localFiles.length) * (100 / totalSteps)));
            }
            completedStepsCount++;
        }

        // 클라우드 소스 순차 처리
        for (const srcId of cloudSources) {
            const src = SOURCES.find((s) => s.id === srcId);
            if (!src?.api) continue;

            setImportingSrc(src.title);
            try {
                const res = await axios.get(src.api, { params: { limit: 200 } });
                if (res.data?.success) {
                    const fetched = (res.data.data || []).map((p) => ({
                        ...p,
                        source: srcId,
                    }));
                    // 중복 제거 (파일명 + 크기 기준)
                    const existing = new Set(allPhotos.map((p) => `${p.name}-${p.size || ''}`));
                    const unique = fetched.filter((p) => !existing.has(`${p.name}-${p.size || ''}`));
                    allPhotos.push(...unique);
                }
            } catch (err) {
                if (err.response?.status === 401) {
                    setErrorMsg(`${src.title} 연결이 만료되었습니다. 다시 연결해주세요.`);
                    setPhase('error');
                    return;
                }
                // 개별 소스 실패는 계속 진행
            }
            completedStepsCount++;
            setProgress(Math.round((completedStepsCount / totalSteps) * 100));
        }

        setPhotos(allPhotos);
        setProgress(100);
        setTimeout(() => setPhase('done'), 400);
    };

    // localFiles 변경 시 device만 선택된 상태면 자동 import
    useEffect(() => {
        if (localFiles.length > 0 && selected.includes('device')) {
            const cloudSources = selected.filter((s) => s !== 'device');
            if (cloudSources.length === 0) {
                // 로컬만 → 바로 완료 (업로드 없이 미리보기만)
                setPhotos(localFiles);
                setPhase('done');
            }
        }
    }, [localFiles]);

    const handleRetry = () => {
        setPhase('select');
        setProgress(0);
        setPhotos([]);
        setErrorMsg('');
        setImportingSrc('');
    };

    const handleNext = (doSort) => {
        if (photos.length > 0) {
            localStorage.setItem('orgcell_imported_photos', JSON.stringify({
                storage,
                count: photos.length,
                sources: selected,
                photos: photos.slice(0, 200).map((p) => ({
                    id: p.id, name: p.name, thumbnailUrl: p.thumbnailUrl,
                })),
            }));
        }
        completeStep('photos');
        navigate(`/onboarding/face?storage=${storage}&sort=${doSort}`);
    };

    const handleSkip = () => {
        completeStep('photos');
        navigate(`/onboarding/face?storage=${storage}`);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: themeBg }}>
            <OnboardingProgress current="photos" />
            <div className="relative text-center pt-6 pb-4 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-[#A09882] text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-[28px] font-bold text-[#3D2008] mb-2">
                    {phase === 'select' ? '어디서 사진을 가져올까요?' : '사진 가져오기'}
                </h1>
                {phase === 'select' && (
                    <p className="text-[15px] text-[#7A6E5E]">여러 곳에서 동시에 가져올 수 있어요</p>
                )}
            </div>

            <div className="flex-1 flex flex-col px-5 max-w-md mx-auto w-full">
                {/* Phase: Select */}
                {phase === 'select' && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 space-y-3 pb-4">
                            {SOURCES.map((src) => {
                                const isSelected = selected.includes(src.id);
                                return (
                                    <button
                                        key={src.id}
                                        onClick={() => toggleSource(src.id)}
                                        className="w-full text-left rounded-2xl p-4 border-2 transition-all active:scale-[0.98]"
                                        style={{
                                            background: isSelected ? '#FFFFFF' : '#FFFFFF',
                                            borderColor: isSelected ? themeColor : '#E8E3D8',
                                            boxShadow: isSelected ? `0 2px 12px ${themeColor}20` : 'none',
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-3xl">{src.icon}</span>
                                            <div className="flex-1">
                                                <h3 className="text-[16px] font-bold text-[#3D2008]">{src.title}</h3>
                                                <p className="text-[14px] text-[#7A6E5E] mt-0.5">{src.desc}</p>
                                            </div>
                                            <div
                                                className="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all"
                                                style={{
                                                    borderColor: isSelected ? themeColor : '#D1D5DB',
                                                    background: isSelected ? themeColor : 'transparent',
                                                }}
                                            >
                                                {isSelected && (
                                                    <span className="text-white text-[11px] font-bold">✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {/* 로컬 파일 선택된 경우 미리보기 */}
                            {selected.includes('device') && localFiles.length > 0 && (
                                <div className="bg-white rounded-2xl p-4 border border-[#E8E3D8]">
                                    <p className="text-xs font-bold text-[#3D2008] mb-2">
                                        선택된 파일: {localFiles.length}장
                                    </p>
                                    <div className="grid grid-cols-5 gap-1 rounded-lg overflow-hidden">
                                        {localFiles.slice(0, 10).map((f) => (
                                            <div key={f.id} className="aspect-square bg-[#F0EDE6] overflow-hidden">
                                                <img src={f.thumbnailUrl} alt={f.name} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        {localFiles.length > 10 && (
                                            <div className="aspect-square bg-[#F0EDE6] flex items-center justify-center text-xs text-[#7A6E5E] font-bold">
                                                +{localFiles.length - 10}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 기기 선택 시 파일 입력 */}
                            {selected.includes('device') && localFiles.length === 0 && (
                                <label className="block w-full cursor-pointer">
                                    <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-[#E8E3D8] text-center hover:border-[#5A9460] transition-colors">
                                        <p className="text-sm font-semibold text-[#3D2008] mb-1">탭하여 사진 선택</p>
                                        <p className="text-xs text-[#7A6E5E]">HEIC, JPG, PNG 모두 가능</p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept="image/*,.heic,.heif"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            )}
                        </div>

                        {/* 하단 버튼 */}
                        <div className="pb-8 space-y-3">
                            <button
                                onClick={handleImport}
                                disabled={selected.length === 0}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all disabled:opacity-40"
                                style={{
                                    height: 56,
                                    background: `linear-gradient(135deg, ${themeColor}, ${themeHover})`,
                                }}
                            >
                                {selected.length === 0
                                    ? '소스를 선택하세요'
                                    : selected.length === 1 && selected[0] === 'device' && localFiles.length === 0
                                        ? '사진 선택하기'
                                        : `가져오기 (${selected.length}곳)`}
                            </button>
                            <button onClick={handleSkip} className="w-full text-center text-sm text-[#A09882] py-2">
                                나중에 하기
                            </button>
                        </div>
                    </div>
                )}

                {/* Phase: Importing */}
                {phase === 'importing' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4 animate-pulse">📥</span>
                        <p className="text-lg font-bold text-[#3D2008] mb-2">사진을 가져오는 중...</p>
                        <p className="text-sm text-[#7A6E5E] mb-6">{importingSrc}에서 검색 중</p>
                        <div className="w-full max-w-[300px] bg-[#E8E3D8] rounded-full h-3 mb-3">
                            <div
                                className="h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%`, background: themeColor }}
                            />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: themeColor }}>{progress}%</p>
                    </div>
                )}

                {/* Phase: Done */}
                {phase === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4">✅</span>
                        <p className="text-xl font-bold text-[#3D2008] mb-1">
                            {photos.length > 0
                                ? `총 ${photos.length}장 가져왔습니다`
                                : '사진이 없습니다'}
                        </p>
                        {photos.length > 0 && selected.length > 1 && (
                            <p className="text-xs text-[#7A6E5E] mb-4">
                                {selected.map((s) => SOURCES.find((x) => x.id === s)?.title).join(' + ')}
                            </p>
                        )}

                        {/* 사진 미리보기 그리드 */}
                        {photos.length > 0 && (
                            <div className="w-full grid grid-cols-4 gap-1 mb-6 rounded-xl overflow-hidden">
                                {photos.slice(0, 12).map((photo) => (
                                    <div key={photo.id} className="aspect-square bg-[#F0EDE6] overflow-hidden">
                                        {photo.thumbnailUrl ? (
                                            <img src={photo.thumbnailUrl} alt={photo.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-[#A09882]">
                                                📷
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {photos.length > 12 && (
                                    <div className="aspect-square bg-[#F0EDE6] flex items-center justify-center text-sm text-[#7A6E5E] font-bold">
                                        +{photos.length - 12}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="w-full space-y-3 pb-8">
                            <button
                                onClick={() => handleNext('yes')}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                                style={{
                                    height: 56,
                                    background: `linear-gradient(135deg, ${themeColor}, ${themeHover})`,
                                }}
                            >
                                {photos.length > 0 ? 'AI 분류 시작하기' : '다음 단계'}
                            </button>
                            {photos.length > 0 && (
                                <button
                                    onClick={() => handleNext('no')}
                                    className="w-full rounded-2xl font-bold text-[15px] active:scale-[0.98] transition-all"
                                    style={{
                                        height: 48,
                                        background: 'transparent',
                                        border: `2px solid ${themeColor}`,
                                        color: themeColor,
                                    }}
                                >
                                    직접 정리하기
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Phase: Error */}
                {phase === 'error' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4">⚠️</span>
                        <p className="text-xl font-bold text-[#3D2008] mb-2">연결에 실패했어요</p>
                        <p className="text-sm text-[#7A6E5E] mb-8">{errorMsg || '네트워크 상태를 확인하고 다시 시도해주세요'}</p>
                        <div className="w-full space-y-3 pb-8">
                            <button
                                onClick={handleRetry}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                                style={{
                                    height: 56,
                                    background: `linear-gradient(135deg, ${themeColor}, ${themeHover})`,
                                }}
                            >
                                다시 시도
                            </button>
                            <button onClick={handleSkip} className="w-full text-sm text-[#A09882] py-2">
                                나중에 하기
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 숨겨진 파일 입력 (device 선택 후 가져오기 버튼 클릭 시) */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={handleFileSelect}
            />
        </div>
    );
}
