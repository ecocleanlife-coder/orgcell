import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Pica from 'pica';
import { computeDHash } from '../../utils/hashUtils';
import { encryptFile } from '../../utils/cryptoUtils';
import useCryptoStore from '../../store/cryptoStore';
import useUiStore from '../../store/uiStore';
import { CheckCircle, Clock, Loader2, Lock, FileImage, AlertCircle } from 'lucide-react';

// Initialize Pica with Web Worker support
const pica = new Pica({
    features: ['js', 'wasm', 'ww']
});

export default function PhotoUploader({ onUploadComplete }) {
    const { uploadsInProgress, addUpload, updateUploadStatus } = useUiStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const processFile = async (file, uploadId) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = async () => {
                try {
                    updateUploadStatus(uploadId, 'resizing', 10);
                    // Create source canvas
                    const srcCanvas = document.createElement('canvas');
                    srcCanvas.width = img.width;
                    srcCanvas.height = img.height;
                    const srcCtx = srcCanvas.getContext('2d');
                    srcCtx.drawImage(img, 0, 0);

                    // Resize logic: max 1080p width/height to save resources
                    const MAX_SIZE = 1080;
                    let dstWidth = img.width;
                    let dstHeight = img.height;

                    if (dstWidth > MAX_SIZE || dstHeight > MAX_SIZE) {
                        if (dstWidth > dstHeight) {
                            dstHeight = Math.round((dstHeight * MAX_SIZE) / dstWidth);
                            dstWidth = MAX_SIZE;
                        } else {
                            dstWidth = Math.round((dstWidth * MAX_SIZE) / dstHeight);
                            dstHeight = MAX_SIZE;
                        }
                    }

                    // Create destination canvas
                    const dstCanvas = document.createElement('canvas');
                    dstCanvas.width = dstWidth;
                    dstCanvas.height = dstHeight;

                    updateUploadStatus(uploadId, 'resizing', 30);
                    // Use Pica to resize with high quality but non-blocking worker
                    await pica.resize(srcCanvas, dstCanvas, {
                        quality: 3,
                        alpha: true
                    });

                    updateUploadStatus(uploadId, 'scanning', 50);
                    // Convert to Blob
                    const thumbBlob = await pica.toBlob(dstCanvas, 'image/jpeg', 0.85);
                    const thumbUrl = URL.createObjectURL(thumbBlob);

                    updateUploadStatus(uploadId, 'scanning', 70);
                    // Compute perceptual dHash for deduplication
                    const dHash = await computeDHash(thumbUrl);

                    updateUploadStatus(uploadId, 'encrypting', 80);
                    // E2E Encryption Phase 6: Encrypt the original high-res file using the master key
                    let finalFile = file;
                    const { masterKey } = useCryptoStore.getState();
                    if (masterKey) {
                        try {
                            finalFile = await encryptFile(file, masterKey);
                        } catch (encErr) {
                            console.error("Encryption failed for", file.name, encErr);
                        }
                    }

                    updateUploadStatus(uploadId, 'done', 100);
                    resolve({
                        originalFile: finalFile,
                        thumbUrl,
                        width: dstWidth,
                        height: dstHeight,
                        name: file.name,
                        dHash
                    });

                } catch (err) {
                    updateUploadStatus(uploadId, 'error', 0);
                    reject(err);
                } finally {
                    URL.revokeObjectURL(img.src);
                }
            };

            img.onerror = () => {
                updateUploadStatus(uploadId, 'error', 0);
                reject(new Error('Failed to load image'));
            };
        });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        // Clear previous uploads from local Zustand view if desired, but we keep them accumulating or we can clear via uiStore
        // For simplicity, we just add to the queue.
        setIsProcessing(true);

        const results = [];

        const tasks = acceptedFiles.map(file => {
            const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            addUpload(uploadId, file);
            return { uploadId, file };
        });

        for (const task of tasks) {
            try {
                const processed = await processFile(task.file, task.uploadId);
                results.push(processed);
            } catch (err) {
                console.error(`Failed to process ${task.file.name}`, err);
            }
        }

        setIsProcessing(false);
        if (onUploadComplete) {
            onUploadComplete(results);
        }
    }, [onUploadComplete, addUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        }
    });

    const StatusIcon = ({ status }) => {
        switch (status) {
            case 'queue': return <Clock size={16} className="text-gray-400" />;
            case 'resizing': return <FileImage size={16} className="text-blue-500 animate-pulse" />;
            case 'scanning': return <Loader2 size={16} className="text-purple-500 animate-spin" />;
            case 'encrypting': return <Lock size={16} className="text-emerald-500 animate-bounce" />;
            case 'done': return <CheckCircle size={16} className="text-green-500" />;
            case 'error': return <AlertCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} />;
        }
    };

    const StatusText = ({ status }) => {
        switch (status) {
            case 'queue': return '대기 중';
            case 'resizing': return '리사이징';
            case 'scanning': return 'dHash 스캔';
            case 'encrypting': return 'E2E 암호화';
            case 'done': return '완료';
            case 'error': return '오류';
            default: return '준비';
        }
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <div
                {...getRootProps()}
                className={`w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} />
                <div className="text-4xl mb-4">📸</div>
                <p className="text-gray-600 dark:text-gray-300 font-medium tracking-tight">
                    {isDragActive ? "여기에 사진을 놓으세요" : "사진을 드래그하거나 클릭해서 업로드하세요"}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                    Pica 엔진이 브라우저에서 안전하게 최적화(리사이즈)합니다.
                </p>
            </div>

            {/* Granular Upload Tracker */}
            {uploadsInProgress.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
                    <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">업로드 진행 상태</h3>
                    </div>
                    <ul className="divide-y dark:divide-gray-700 max-h-60 overflow-y-auto">
                        {uploadsInProgress.map(upload => (
                            <li key={upload.id} className="p-3 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 truncate max-w-[50%]">
                                    <StatusIcon status={upload.status} />
                                    <span className="truncate text-gray-700 dark:text-gray-300 font-medium text-xs">
                                        {upload.file.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 flex-1 justify-end">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                                        <StatusText status={upload.status} />
                                    </span>
                                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${upload.status === 'error' ? 'bg-red-500' : 'bg-blue-600'}`}
                                            style={{ width: `${upload.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
