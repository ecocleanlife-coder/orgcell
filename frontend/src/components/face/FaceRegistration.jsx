import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

export default function FaceRegistration({ onRegisterComplete }) {
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [detection, setDetection] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [personName, setPersonName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const imgRef = useRef();
    const canvasRef = useRef();

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelsLoaded(true);
            } catch (err) {
                console.error("Failed to load face-api models", err);
            }
        };
        loadModels();
    }, []);

    const handleFileChange = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setSelectedFile(file);
        setDetection(null);
        setPersonName('');

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleImageLoad = async () => {
        if (!isModelsLoaded || !imgRef.current) return;

        setIsDetecting(true);
        try {
            const result = await faceapi.detectSingleFace(
                imgRef.current,
                new faceapi.TinyFaceDetectorOptions()
            ).withFaceLandmarks().withFaceDescriptor();

            if (result) {
                setDetection({
                    descriptor: Array.from(result.descriptor), // Convert Float32Array to JS array for JSON
                    box: result.detection.box
                });

                // Draw bounding box
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    faceapi.matchDimensions(canvas, imgRef.current);
                    const resizedResult = faceapi.resizeResults(result, imgRef.current);
                    faceapi.draw.drawDetections(canvas, resizedResult);
                }
            } else {
                setDetection(false); // false means no face found
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleRegister = async () => {
        if (!personName || !detection) return;

        setIsSaving(true);
        try {
            // NOTE: In Phase 4, we POST to /api/face/register
            const res = await axios.post('/api/face/register', {
                label: personName,
                descriptor: detection.descriptor,
                photo_id: 'local_upload_' + Date.now(), // Temporary ID since we aren't uploading the original byte file
                is_reference: true
            });

            if (res.data?.success || res.status === 200) {
                alert(`${personName}님이 정상적으로 등록되었습니다.`);
                if (onRegisterComplete) onRegisterComplete();
                setSelectedFile(null);
                setPreviewUrl('');
                setDetection(null);
            }
        } catch (err) {
            console.error('Registration failed:', err);
            alert('등록에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isModelsLoaded) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">AI 얼굴 인식 엔진을 브라우저에 배포 중입니다...</p>
                <p className="text-xs text-gray-400 mt-2">최초 1회만 약 10MB의 리소스가 로드됩니다.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-800 text-white p-4">
                <h3 className="font-bold text-lg">새 인물 얼굴 등록 (Reference)</h3>
                <p className="text-xs text-gray-300">이후 업로드되는 사진 자동 분류의 기준이 됩니다.</p>
            </div>

            <div className="p-6">
                {!previewUrl ? (
                    <div className="w-full aspect-video border-2 border-dashed bg-gray-50 flex items-center justify-center rounded-xl relative cursor-pointer hover:bg-gray-100 transition-colors">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        <div className="text-center">
                            <span className="text-3xl mb-2 block">👤</span>
                            <span className="font-medium text-blue-600">기준 얼굴 사진 선택</span>
                            <p className="text-xs text-gray-500 mt-1">정면이 잘 보이고 1명만 있는 사진 권장</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="relative w-full border rounded-lg overflow-hidden bg-black flex justify-center">
                            <img
                                ref={imgRef}
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-64 object-contain"
                                onLoad={handleImageLoad}
                                crossOrigin="anonymous"
                            />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ left: '50%', transform: 'translateX(-50%)' }} />
                        </div>

                        {isDetecting && (
                            <p className="text-center text-sm font-bold text-blue-600 animate-pulse">얼굴 특징 추출 중...</p>
                        )}

                        {detection === false && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                                얼굴을 찾을 수 없습니다. 다른 사진을 선택해주세요.
                                <button className="block mx-auto mt-2 underline" onClick={() => setPreviewUrl('')}>다시 선택</button>
                            </div>
                        )}

                        {detection && detection !== false && (
                            <div className="bg-green-50 text-green-800 p-4 rounded-lg space-y-4">
                                <p className="font-bold text-sm text-center border-b border-green-200 pb-2">✓ 128-d 얼굴 식별자 추출 완료</p>

                                <div>
                                    <label className="block text-xs font-bold mb-1">인물 이름 (분류 라벨)</label>
                                    <input
                                        type="text"
                                        value={personName}
                                        onChange={(e) => setPersonName(e.target.value)}
                                        placeholder="예: 홍길동, 막내딸"
                                        className="w-full px-3 py-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>

                                <button
                                    onClick={handleRegister}
                                    disabled={!personName.trim() || isSaving}
                                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold disabled:opacity-50 transition-colors"
                                >
                                    {isSaving ? '서버에 저장 중...' : `${personName || '이름'} 앨범 기준점으로 등록`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
