import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';

const STORAGE_LABELS = {
    google: { name: 'Google Drive', icon: '☁️', api: '/api/drive/photos' },
    onedrive: { name: 'OneDrive', icon: '☁️', api: '/api/onedrive/photos' },
    orgcell: { name: 'Orgcell 서버', icon: '🏠', api: null },
};

export default function PhotoImportPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';
    const storageInfo = STORAGE_LABELS[storage] || STORAGE_LABELS.google;

    const [phase, setPhase] = useState('select'); // select | importing | done | error
    const [progress, setProgress] = useState(0);
    const [photoCount, setPhotoCount] = useState(0);
    const [photos, setPhotos] = useState([]); // 실제 사진 목록
    const [errorMsg, setErrorMsg] = useState('');
    const { setCurrentStep, completeStep } = useOnboardingStore();

    useEffect(() => { setCurrentStep('photos'); }, []);

    // 파일 직접 선택 (Orgcell 서버)
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length === 0) return;
        setErrorMsg('');
        setPhase('importing');
        uploadFiles(selected);
    };

    // 파일 업로드 (Orgcell 서버)
    const uploadFiles = async (files) => {
        setPhotoCount(files.length);
        let uploaded = 0;

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                await axios.post('/api/photos/upload', formData);
            } catch {
                // 개별 실패는 무시하고 진행
            }
            uploaded++;
            setProgress(Math.round((uploaded / files.length) * 100));
        }
        setPhase('done');
    };

    // 클라우드에서 사진 목록 불러오기
    const handleCloudConnect = async () => {
        setErrorMsg('');
        setPhase('importing');
        setProgress(10);

        try {
            const res = await axios.get(storageInfo.api, {
                params: { limit: 100 },
            });

            setProgress(80);

            if (res.data?.success) {
                const fetchedPhotos = res.data.data || [];
                setPhotos(fetchedPhotos);
                setPhotoCount(fetchedPhotos.length);
                setProgress(100);

                if (fetchedPhotos.length === 0) {
                    // 사진 0장
                    setPhase('done');
                } else {
                    setTimeout(() => setPhase('done'), 500);
                }
            } else {
                setErrorMsg('사진을 가져올 수 없습니다');
                setPhase('error');
            }
        } catch (err) {
            const msg = err.response?.status === 401
                ? '저장소에 다시 연결해주세요'
                : '네트워크 상태를 확인하고 다시 시도해주세요';
            setErrorMsg(msg);
            setPhase('error');
        }
    };

    const handleRetry = () => {
        setPhase('select');
        setProgress(0);
        setPhotoCount(0);
        setErrorMsg('');
        setPhotos([]);
    };

    const handleNext = (doSort) => {
        // 사진 정보를 localStorage에 저장 (다음 단계에서 활용)
        if (photos.length > 0) {
            localStorage.setItem('orgcell_imported_photos', JSON.stringify({
                storage,
                count: photos.length,
                photos: photos.slice(0, 200).map(p => ({ id: p.id, name: p.name, thumbnailUrl: p.thumbnailUrl })),
            }));
        }
        completeStep('photos');
        navigate(`/onboarding/face?storage=${storage}&sort=${doSort}`);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            <OnboardingProgress current="photos" />
            <div className="relative text-center pt-6 pb-4 px-4">
                <button onClick={() => navigate('/onboarding/storage')} className="absolute left-4 top-4 text-[#A09882] text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-[#3D2008] mb-2">사진 가져오기</h1>
                <p className="text-sm text-[#7A6E5E]">
                    {storageInfo.icon} {storageInfo.name}에서 사진을 불러옵니다
                </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-md mx-auto w-full">
                {/* Phase: Select */}
                {phase === 'select' && (
                    <div className="w-full space-y-4">
                        {storage === 'orgcell' ? (
                            <>
                                <label className="block w-full cursor-pointer">
                                    <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-[#E8E3D8] text-center hover:border-[#5A9460] transition-colors">
                                        <span className="text-5xl block mb-4">📁</span>
                                        <p className="text-base font-semibold text-[#3D2008] mb-1">사진 파일 선택</p>
                                        <p className="text-xs text-[#7A6E5E]">탭하여 사진을 선택하세요</p>
                                    </div>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                                </label>
                                <label className="block w-full cursor-pointer">
                                    <div className="bg-white rounded-2xl p-6 text-center hover:border-[#5A9460] transition-colors" style={{ border: '0.5px solid #E8E3D8' }}>
                                        <span className="text-3xl block mb-2">📷</span>
                                        <p className="text-sm font-semibold text-[#3D2008]">카메라로 촬영</p>
                                    </div>
                                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                                </label>
                            </>
                        ) : (
                            <button
                                onClick={handleCloudConnect}
                                className="w-full bg-white rounded-2xl p-8 border-2 border-dashed border-[#5A9460] text-center hover:bg-[#F5FFF5] transition-colors active:scale-[0.98]"
                            >
                                <span className="text-5xl block mb-4">{storageInfo.icon}</span>
                                <p className="text-base font-semibold text-[#3D2008] mb-1">
                                    {storageInfo.name}에서 사진 불러오기
                                </p>
                                <p className="text-xs text-[#7A6E5E]">연결된 클라우드에서 사진을 자동으로 가져옵니다</p>
                            </button>
                        )}

                        <button
                            onClick={() => { completeStep('photos'); navigate(`/onboarding/face?storage=${storage}`); }}
                            className="w-full text-center text-sm text-[#A09882] py-3"
                        >
                            나중에 하기 →
                        </button>
                    </div>
                )}

                {/* Phase: Importing */}
                {phase === 'importing' && (
                    <div className="w-full text-center">
                        <div className="mb-8">
                            <span className="text-6xl block mb-4 animate-pulse">📥</span>
                            <p className="text-lg font-bold text-[#3D2008] mb-2">사진을 가져오는 중...</p>
                            <p className="text-sm text-[#7A6E5E]">
                                {photoCount > 0 ? `${photoCount}장 처리 중` : '클라우드에서 검색 중'}
                            </p>
                        </div>
                        <div className="w-full bg-[#E8E3D8] rounded-full h-3 mb-3">
                            <div className="h-3 rounded-full bg-[#5A9460] transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-sm font-semibold text-[#5A9460]">{progress}%</p>
                    </div>
                )}

                {/* Phase: Done */}
                {phase === 'done' && (
                    <div className="w-full text-center">
                        <span className="text-6xl block mb-4">✅</span>
                        <p className="text-xl font-bold text-[#3D2008] mb-2">
                            {photoCount > 0 ? `${photoCount}장 가져오기 완료!` : '사진이 없습니다'}
                        </p>
                        <p className="text-sm text-[#7A6E5E] mb-4">
                            {photoCount > 0 ? 'AI가 사진을 정리해 드릴까요?' : '사진을 추가하면 AI가 자동으로 정리해줍니다'}
                        </p>

                        {/* 사진 미리보기 그리드 */}
                        {photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-1 mb-6 rounded-xl overflow-hidden">
                                {photos.slice(0, 8).map((photo) => (
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
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={() => handleNext('yes')}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                                style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                            >
                                {photoCount > 0 ? '🤖 AI로 사진 정리하기' : '다음 단계'}
                            </button>
                            {photoCount > 0 && (
                                <button onClick={() => handleNext('no')} className="w-full py-3 text-sm text-[#A09882]">
                                    건너뛰기 →
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Phase: Error */}
                {phase === 'error' && (
                    <div className="w-full text-center">
                        <span className="text-6xl block mb-4">⚠️</span>
                        <p className="text-xl font-bold text-[#3D2008] mb-2">연결에 실패했어요</p>
                        <p className="text-sm text-[#7A6E5E] mb-8">{errorMsg || '네트워크 상태를 확인하고 다시 시도해주세요'}</p>
                        <div className="space-y-3">
                            <button
                                onClick={handleRetry}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                                style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                            >
                                다시 시도
                            </button>
                            <button
                                onClick={() => { completeStep('photos'); navigate(`/onboarding/face?storage=${storage}`); }}
                                className="w-full text-sm text-[#A09882] py-2"
                            >
                                나중에 하기 →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center pb-6 px-4">
                <p className="text-xs text-[#A09882]">사진은 {storageInfo.name}에만 저장됩니다</p>
            </div>
        </div>
    );
}
