import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const STORAGE_LABELS = {
    google: { name: 'Google Drive', icon: '☁️' },
    onedrive: { name: 'OneDrive', icon: '☁️' },
    orgcell: { name: 'Orgcell 서버', icon: '🏠' },
};

export default function PhotoImportPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';
    const storageInfo = STORAGE_LABELS[storage] || STORAGE_LABELS.google;

    const [phase, setPhase] = useState('select'); // select | importing | done | error
    const [progress, setProgress] = useState(0);
    const [photoCount, setPhotoCount] = useState(0);
    const [files, setFiles] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const { setCurrentStep, completeStep } = useOnboardingStore();

    useEffect(() => { setCurrentStep('photos'); }, []);

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length === 0) return;
        setFiles(selected);
        setErrorMsg('');
        setPhase('importing');
        simulateImport(selected.length);
    };

    const handleCloudConnect = () => {
        setErrorMsg('');
        setPhase('importing');
        // 실제로는 OAuth 플로우 시작
        simulateImport(47);
    };

    const handleRetry = () => {
        setPhase('select');
        setProgress(0);
        setPhotoCount(0);
        setErrorMsg('');
    };

    const simulateImport = (total) => {
        setPhotoCount(total);
        let current = 0;
        const interval = setInterval(() => {
            current += Math.ceil(total / 20);
            if (current >= total) {
                current = total;
                clearInterval(interval);
                setPhase('done');
            }
            setProgress(Math.min(Math.round((current / total) * 100), 100));
        }, 150);
    };

    const handleNext = (doSort) => {
        completeStep('photos');
        navigate(`/onboarding/face?storage=${storage}&sort=${doSort}`);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            {/* Header */}
            <OnboardingProgress current="photos" />
            <div className="relative text-center pt-6 pb-6 px-4">
                <button onClick={() => navigate(`/onboarding/storage`)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">사진 가져오기</h1>
                <p className="text-sm text-gray-500">
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
                                    <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center hover:border-emerald-400 transition-colors">
                                        <span className="text-5xl block mb-4">📁</span>
                                        <p className="text-base font-semibold text-gray-900 mb-1">사진 파일 선택</p>
                                        <p className="text-xs text-gray-500">탭하여 사진을 선택하세요</p>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                                <label className="block w-full cursor-pointer">
                                    <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center hover:border-emerald-400 transition-colors">
                                        <span className="text-3xl block mb-2">📷</span>
                                        <p className="text-sm font-semibold text-gray-900">카메라로 촬영</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </label>
                            </>
                        ) : (
                            <button
                                onClick={handleCloudConnect}
                                className="w-full bg-white rounded-2xl p-8 border-2 border-dashed border-emerald-300 text-center hover:border-emerald-500 transition-colors"
                            >
                                <span className="text-5xl block mb-4">{storageInfo.icon}</span>
                                <p className="text-base font-semibold text-gray-900 mb-1">
                                    {storageInfo.name} 연결하기
                                </p>
                                <p className="text-xs text-gray-500">사진을 자동으로 불러옵니다</p>
                            </button>
                        )}

                        <button
                            onClick={() => navigate(`/onboarding/face?storage=${storage}`)}
                            className="w-full text-center text-sm text-gray-400 py-3"
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
                            <p className="text-lg font-bold text-gray-900 mb-2">사진을 가져오는 중...</p>
                            <p className="text-sm text-gray-500">{photoCount}장 처리 중</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                            <div
                                className="h-3 rounded-full transition-all duration-300 bg-emerald-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm font-semibold text-emerald-600">{progress}%</p>
                    </div>
                )}

                {/* Phase: Done */}
                {phase === 'done' && (
                    <div className="w-full text-center">
                        <span className="text-6xl block mb-4">✅</span>
                        <p className="text-xl font-bold text-gray-900 mb-2">
                            {photoCount}장 가져오기 완료!
                        </p>
                        <p className="text-sm text-gray-500 mb-8">AI가 사진을 정리해 드릴까요?</p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleNext('yes')}
                                className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-base"
                            >
                                🤖 AI로 사진 정리하기
                            </button>
                            <button
                                onClick={() => handleNext('no')}
                                className="w-full py-3 rounded-xl text-sm text-gray-500 hover:text-gray-700"
                            >
                                건너뛰기 →
                            </button>
                        </div>
                    </div>
                )}

                {/* Phase: Error */}
                {phase === 'error' && (
                    <div className="w-full text-center">
                        <span className="text-6xl block mb-4">⚠️</span>
                        <p className="text-xl font-bold text-gray-900 mb-2">연결에 실패했어요</p>
                        <p className="text-sm text-gray-500 mb-8">
                            {errorMsg || '네트워크 상태를 확인하고 다시 시도해주세요'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={handleRetry}
                                className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                            >
                                다시 시도
                            </button>
                            <button
                                onClick={() => {
                                    completeStep('photos');
                                    navigate(`/onboarding/face?storage=${storage}`);
                                }}
                                className="w-full text-sm text-gray-400 py-2"
                            >
                                나중에 하기 →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center pb-6 px-4">
                <p className="text-xs text-gray-400">사진은 {storageInfo.name}에만 저장됩니다</p>
            </div>
        </div>
    );
}
