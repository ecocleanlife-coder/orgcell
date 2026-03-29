import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const AGE_STAGES = [
    { id: 'current', icon: '📸', label: '현재 모습', desc: '카메라 또는 최근 사진', required: true },
    { id: 'infant', icon: '👶', label: '유아기 (0~6세)', desc: '참고용, 정확도 낮음', required: false },
    { id: 'child', icon: '🧒', label: '유년기 (7~12세)', desc: '초등학교 시절', required: false },
    { id: 'teen', icon: '🧑', label: '청소년기 (13~19세)', desc: '중·고등학교 시절', required: false },
    { id: 'young', icon: '👨', label: '청년기 (20~30대)', desc: '대학·직장 초기', required: false },
];

const ACCURACY_MAP = {
    1: { stars: '★★☆☆☆', label: '기본', color: 'text-yellow-500' },
    2: { stars: '★★★☆☆', label: '양호', color: 'text-yellow-500' },
    3: { stars: '★★★★☆', label: '우수', color: 'text-emerald-500' },
    4: { stars: '★★★★★', label: '최고', color: 'text-emerald-600' },
};

function getAccuracy(registered) {
    const count = Object.keys(registered).filter(k => registered[k]).length;
    return ACCURACY_MAP[Math.min(count, 4)] || ACCURACY_MAP[1];
}

export default function FaceRegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';

    const { setCurrentStep: setOnboardingStep, completeStep: completeOnboardingStep } = useOnboardingStore();
    useEffect(() => { setOnboardingStep('face'); }, []);

    const [step, setStep] = useState(0); // 0=current, 1=infant, 2=child, 3=teen, 4=young
    const [registered, setRegistered] = useState({}); // { current: descriptor[], infant: descriptor[], ... }
    const [mode, setMode] = useState(null); // null | 'camera' | 'photo'
    const [processing, setProcessing] = useState(false);
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [selectedFaceIdx, setSelectedFaceIdx] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null); // null | 'no_face' | 'error'

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const workerRef = useRef(null);
    const streamRef = useRef(null);

    const stage = AGE_STAGES[step];
    const isCurrentStep = step === 0;
    const accuracy = getAccuracy(registered);

    // 워커 초기화
    useEffect(() => {
        const worker = new Worker(
            new URL('../../workers/faceScanWorker.js', import.meta.url),
            { type: 'module' }
        );
        worker.postMessage({ type: 'INIT', payload: { origin: window.location.origin } });
        workerRef.current = worker;

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'SCAN_COMPLETE') {
                setProcessing(false);
                if (payload.faces.length > 0) {
                    setError(null);
                    setDetectedFaces(payload.faces);
                    if (payload.faces.length === 1) {
                        setSelectedFaceIdx(0);
                    }
                } else {
                    setDetectedFaces([]);
                    setError('no_face');
                }
            } else if (type === 'ERROR') {
                setProcessing(false);
                setError('error');
            }
        };

        return () => {
            worker.terminate();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // 카메라 시작
    const startCamera = useCallback(async () => {
        setMode('camera');
        setDetectedFaces([]);
        setSelectedFaceIdx(null);
        setPreviewUrl(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setError('camera');
            setMode(null);
        }
    }, []);

    // 카메라 촬영
    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // 카메라 정지
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        setPreviewUrl(dataUrl);
        setProcessing(true);
        workerRef.current?.postMessage({
            type: 'SCAN_IMAGE',
            payload: { imageId: `capture_${Date.now()}`, dataUrl }
        });
    }, []);

    // 사진 파일 선택
    const handleFileSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMode('photo');
        setDetectedFaces([]);
        setSelectedFaceIdx(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setPreviewUrl(dataUrl);
            setProcessing(true);
            workerRef.current?.postMessage({
                type: 'SCAN_IMAGE',
                payload: { imageId: `file_${Date.now()}`, dataUrl }
            });
        };
        reader.readAsDataURL(file);
    }, []);

    // 얼굴 선택 확인 → 로컬 저장
    const confirmFace = useCallback(() => {
        if (selectedFaceIdx === null || !detectedFaces[selectedFaceIdx]) return;
        const face = detectedFaces[selectedFaceIdx];

        // 로컬 저장 (서버 미전송 — 특허 청구항 1)
        const stageId = stage.id;
        const stored = JSON.parse(localStorage.getItem('orgcell_face_descriptors') || '{}');
        const existing = stored[stageId] || [];
        existing.push({
            descriptor: face.descriptor,
            timestamp: Date.now(),
            stage: stageId,
        });
        stored[stageId] = existing;
        localStorage.setItem('orgcell_face_descriptors', JSON.stringify(stored));

        setRegistered(prev => ({ ...prev, [stageId]: true }));

        // 다음 단계
        if (step === 0) {
            // 현재 얼굴 등록 후 → 과거 연령대 시작
            setStep(1);
        } else if (step < AGE_STAGES.length - 1) {
            setStep(step + 1);
        } else {
            // 전체 완료
            navigateNext();
        }

        // 초기화
        setMode(null);
        setDetectedFaces([]);
        setSelectedFaceIdx(null);
        setPreviewUrl(null);
    }, [selectedFaceIdx, detectedFaces, stage, step]);

    const skipStage = () => {
        if (step < AGE_STAGES.length - 1) {
            setStep(step + 1);
            setMode(null);
            setDetectedFaces([]);
            setSelectedFaceIdx(null);
            setPreviewUrl(null);
        } else {
            navigateNext();
        }
    };

    const navigateNext = () => {
        completeOnboardingStep('face');
        navigate(`/onboarding/family?storage=${storage}`);
    };

    // 얼굴 바운딩 박스 오버레이 그리기
    useEffect(() => {
        if (!previewUrl || detectedFaces.length === 0 || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            detectedFaces.forEach((face, idx) => {
                const { x, y, width, height } = face.box;
                const cx = x + width / 2;
                const cy = y + height / 2;
                const r = Math.max(width, height) / 2 + 8;

                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = idx === selectedFaceIdx ? '#10b981' : '#ffffff';
                ctx.lineWidth = idx === selectedFaceIdx ? 4 : 2;
                ctx.stroke();

                if (idx === selectedFaceIdx) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                    ctx.fill();
                }
            });
        };
        img.src = previewUrl;
    }, [previewUrl, detectedFaces, selectedFaceIdx]);

    // 캔버스 클릭 → 얼굴 선택
    const handleCanvasClick = (e) => {
        if (detectedFaces.length === 0 || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const px = (e.clientX - rect.left) * scaleX;
        const py = (e.clientY - rect.top) * scaleY;

        for (let i = 0; i < detectedFaces.length; i++) {
            const { x, y, width, height } = detectedFaces[i].box;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const r = Math.max(width, height) / 2 + 8;
            if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= r) {
                setSelectedFaceIdx(i);
                return;
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #FAFAF7 0%, #F0EDE6 100%)' }}>
            {/* Header */}
            <OnboardingProgress current="face" />
            <div className="relative text-center pt-4 pb-4 px-4">
                <button onClick={() => step === 0 ? navigate(-1) : setStep(step - 1)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {isCurrentStep ? '본인 얼굴 등록' : '과거 사진 등록'}
                </h1>
                <p className="text-sm text-gray-500">{stage.icon} {stage.label}</p>
                {!isCurrentStep && stage.id === 'infant' && (
                    <p className="text-xs text-amber-600 mt-1">
                        유아기 사진은 얼굴이 많이 달라서 정확하지 않을 수 있어요. 참고용입니다.
                    </p>
                )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-4">
                {AGE_STAGES.map((s, i) => (
                    <div
                        key={s.id}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === step ? 'bg-emerald-500 scale-125'
                            : registered[s.id] ? 'bg-emerald-300'
                            : 'bg-gray-300'
                        }`}
                    />
                ))}
            </div>

            {/* Accuracy */}
            <div className="text-center mb-4">
                <span className={`text-lg ${accuracy.color}`}>{accuracy.stars}</span>
                <p className="text-xs text-gray-500 mt-0.5">인식 정확도: {accuracy.label}</p>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center px-5 max-w-md mx-auto w-full">
                {/* Mode selection */}
                {!mode && !processing && detectedFaces.length === 0 && (
                    <div className="w-full space-y-3">
                        {isCurrentStep && (
                            <button
                                onClick={startCamera}
                                className="w-full bg-white rounded-2xl p-6 border border-gray-200 text-center hover:border-emerald-400 transition-colors active:scale-[0.98]"
                            >
                                <span className="text-4xl block mb-2">📷</span>
                                <p className="text-base font-bold text-gray-900">카메라로 촬영</p>
                                <p className="text-xs text-gray-500">정면 얼굴을 촬영하세요</p>
                            </button>
                        )}
                        <label className="block w-full cursor-pointer">
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center hover:border-emerald-400 transition-colors active:scale-[0.98]">
                                <span className="text-4xl block mb-2">🖼️</span>
                                <p className="text-base font-bold text-gray-900">사진에서 선택</p>
                                <p className="text-xs text-gray-500">{stage.desc}</p>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>

                        {/* 등록된 연령대 목록 */}
                        {!isCurrentStep && Object.keys(registered).length > 0 && (
                            <div className="bg-emerald-50 rounded-xl p-3 mt-4">
                                <p className="text-xs text-emerald-700 font-medium mb-2">등록된 연령대:</p>
                                <div className="flex flex-wrap gap-2">
                                    {AGE_STAGES.filter(s => registered[s.id]).map(s => (
                                        <span key={s.id} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                            {s.icon} {s.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Camera view */}
                {mode === 'camera' && !previewUrl && (
                    <div className="w-full">
                        <div className="relative rounded-2xl overflow-hidden bg-black mb-4">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                        </div>
                        <button
                            onClick={capturePhoto}
                            className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                        >
                            📸 촬영
                        </button>
                    </div>
                )}

                {/* Processing */}
                {processing && (
                    <div className="w-full text-center py-12">
                        <span className="text-5xl block mb-4 animate-pulse">🔍</span>
                        <p className="text-base font-bold text-gray-900">얼굴을 감지하는 중...</p>
                        <p className="text-xs text-gray-500 mt-1">AI가 사진을 분석하고 있습니다</p>
                    </div>
                )}

                {/* Error: face detection failed */}
                {!processing && error && detectedFaces.length === 0 && (
                    <div className="w-full text-center py-8">
                        <span className="text-5xl block mb-4">
                            {error === 'no_face' ? '😕' : error === 'camera' ? '📷' : '⚠️'}
                        </span>
                        <p className="text-base font-bold text-gray-900 mb-2">
                            {error === 'no_face' ? '얼굴을 감지하지 못했어요'
                             : error === 'camera' ? '카메라에 접근할 수 없어요'
                             : '오류가 발생했어요'}
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            {error === 'no_face'
                                ? '정면 얼굴이 잘 보이는 사진으로 다시 시도해주세요'
                                : error === 'camera'
                                ? '카메라 권한을 허용하거나 사진을 선택해주세요'
                                : '잠시 후 다시 시도해주세요'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setError(null);
                                    setMode(null);
                                    setPreviewUrl(null);
                                }}
                                className="w-full py-3 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                            >
                                다른 사진으로 다시 시도
                            </button>
                            <button
                                onClick={skipStage}
                                className="w-full text-sm text-gray-400 py-2"
                            >
                                이 단계 건너뛰기 →
                            </button>
                        </div>
                    </div>
                )}

                {/* Face selection */}
                {!processing && detectedFaces.length > 0 && (
                    <div className="w-full">
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className="w-full rounded-2xl mb-4 cursor-pointer"
                        />
                        {detectedFaces.length > 1 && (
                            <p className="text-xs text-center text-amber-600 mb-3">
                                {detectedFaces.length}명 감지됨 — 본인 얼굴을 탭하세요
                            </p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={confirmFace}
                                disabled={selectedFaceIdx === null}
                                className={`flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
                                    selectedFaceIdx !== null
                                        ? 'bg-emerald-500 hover:bg-emerald-600'
                                        : 'bg-gray-300 cursor-not-allowed'
                                }`}
                            >
                                선택하기
                            </button>
                            <button
                                onClick={() => {
                                    setMode(null);
                                    setDetectedFaces([]);
                                    setSelectedFaceIdx(null);
                                    setPreviewUrl(null);
                                }}
                                className="px-4 py-3 rounded-xl text-sm text-gray-500 border border-gray-200"
                            >
                                다시
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Skip button */}
            <div className="text-center pb-6 px-4">
                {isCurrentStep ? (
                    <button onClick={() => navigateNext()} className="text-sm text-gray-400 py-2">
                        나중에 등록하기 →
                    </button>
                ) : (
                    <div className="flex justify-center gap-4">
                        <button onClick={skipStage} className="text-sm text-gray-400 py-2">
                            건너뛰기 →
                        </button>
                        {Object.keys(registered).length >= 1 && (
                            <button onClick={navigateNext} className="text-sm text-emerald-600 font-medium py-2">
                                등록 완료 →
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden canvas for capture */}
            {mode === 'camera' && <canvas ref={canvasRef} className="hidden" />}
        </div>
    );
}
