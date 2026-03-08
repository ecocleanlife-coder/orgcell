import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Pica from 'pica';
import { computeDHash } from '../../utils/hashUtils';
import { encryptFile } from '../../utils/cryptoUtils';
import { extractExif } from '../../utils/exifUtils';
import useCryptoStore from '../../store/cryptoStore';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { CheckCircle, Clock, Loader2, Lock, FileImage, AlertCircle, CloudUpload } from 'lucide-react';

// Initialize Pica with Web Worker support
const pica = new Pica({
    features: ['js', 'wasm', 'ww']
});

const retryAxiosPost = async (url, data, config, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.post(url, data, config);
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Exponential-ish backoff
        }
    }
};

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

                    // 0. Extract EXIF data BEFORE resizing strips it
                    const exifData = await extractExif(file);

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

                    // Phase 12 BYOS: Upload to Google Drive and Save Metadata
                    const { driveConnected } = useAuthStore.getState();
                    if (driveConnected) {
                        updateUploadStatus(uploadId, 'drive_upload', 90);
                        let drive_file_id = null;
                        let drive_thumbnail_id = null;

                        try {
                            const uuid = crypto.randomUUID();
                            const encFilename = 'enc_' + uuid + '_' + file.name;
                            const thumbFilename = 'thumb_' + uuid + '_' + file.name;

                            // 1. Upload original encrypted file to Drive
                            const originalFormData = new FormData();
                            originalFormData.append('file', finalFile, encFilename);
                            originalFormData.append('mimeType', 'application/octet-stream'); // it's encrypted

                            const driveOriginalRes = await retryAxiosPost('/api/drive/upload', originalFormData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            }, 3);

                            if (!driveOriginalRes.data?.success) throw new Error('Original Drive upload failed');
                            drive_file_id = driveOriginalRes.data.data.id;

                            // 2. Upload thumbnail to Drive
                            const thumbFormData = new FormData();
                            thumbFormData.append('file', thumbBlob, thumbFilename);
                            thumbFormData.append('mimeType', 'image/jpeg');

                            const driveThumbRes = await retryAxiosPost('/api/drive/upload', thumbFormData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            }, 3);

                            if (!driveThumbRes.data?.success) throw new Error('Thumbnail Drive upload failed');
                            drive_thumbnail_id = driveThumbRes.data.data.id;

                            // 3. Save photo metadata to Postgres DB
                            const metaRes = await axios.post('/api/photos/upload', {
                                filename: encFilename,
                                original_name: file.name,
                                mime_type: file.type,
                                file_size: finalFile.size,
                                width: dstWidth,
                                height: dstHeight,
                                drive_file_id,
                                drive_thumbnail_id,
                                dhash: dHash,
                                taken_at: exifData.takenAt,
                                location: exifData.location,
                                metadata: exifData.metadata
                            });

                            if (!metaRes.data?.success) throw new Error('Metadata save failed');

                            toast.success(`'${file.name}' 클라우드 백업 완료!`);
                        } catch (driveErr) {
                            console.error("Drive upload error", driveErr);

                            // Rollback partial Drive uploads
                            if (drive_file_id) await axios.delete(`/api/drive/file/${drive_file_id}`).catch(() => { });
                            if (drive_thumbnail_id) await axios.delete(`/api/drive/file/${drive_thumbnail_id}`).catch(() => { });

                            // If it's a 409 Conflict (Duplicate dHash)
                            if (driveErr.response?.status === 409) {
                                toast.error(`'${file.name}' 이미 등록된 사진입니다 (중복).`);
                            } else {
                                toast.error(`'${file.name}' 업로드 실패. 롤백 처리되었습니다.`);
                            }

                            updateUploadStatus(uploadId, 'error', 0);
                            reject(driveErr);
                            URL.revokeObjectURL(img.src);
                            return; // Stop here, do not resolve
                        }
                    } else {
                        // Not connected.
                        // For the Manager's note: "Drive 미연결 시 → 로컬 브라우저에만 보관 + 안내"
                        toast.error(`[${file.name}] Drive가 연결되지 않아 브라우저에 임시 보관됩니다.`, { duration: 4000 });
                    }

                    updateUploadStatus(uploadId, 'done', 100);
                    resolve({
                        originalFile: finalFile,
                        thumbUrl,
                        width: dstWidth,
                        height: dstHeight,
                        name: file.name,
                        dHash,
                        exif: exifData
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
            case 'drive_upload': return <CloudUpload size={16} className="text-blue-600 animate-pulse" />;
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
            case 'drive_upload': return 'Drive 업로드';
            case 'done': return '완료';
            case 'error': return '오류';
            default: return '준비';
        }
    };

    return (
        <div className="w-full flex flex-col gap-4">
            <div
                {...getRootProps()}
                tabIndex={0}
                role="button"
                aria-label="사진 업로드 영역. 클릭하거나 엔터를 눌러 사진을 선택하세요."
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const inputChild = e.currentTarget.querySelector('input[type="file"]');
                        if (inputChild) inputChild.click();
                    }
                }}
                className={`w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} aria-label="파일 선택 입력창" />
                <div className="text-4xl mb-4" aria-hidden="true">📸</div>
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
