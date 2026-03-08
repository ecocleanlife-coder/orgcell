import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Pica from 'pica';
import { computeDHash } from '../../utils/hashUtils';
import { encryptFile } from '../../utils/cryptoUtils';
import useCryptoStore from '../../store/cryptoStore';

// Initialize Pica with Web Worker support
const pica = new Pica({
    features: ['js', 'wasm', 'ww']
});

export default function PhotoUploader({ onUploadComplete }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const processFile = async (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = async () => {
                try {
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

                    // Use Pica to resize with high quality but non-blocking worker
                    await pica.resize(srcCanvas, dstCanvas, {
                        quality: 3,
                        alpha: true
                    });

                    // Convert to Blob
                    const thumbBlob = await pica.toBlob(dstCanvas, 'image/jpeg', 0.85);
                    const thumbUrl = URL.createObjectURL(thumbBlob);

                    // Compute perceptual dHash for deduplication
                    const dHash = await computeDHash(thumbUrl);

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

                    resolve({
                        originalFile: finalFile,
                        thumbUrl,
                        width: dstWidth,
                        height: dstHeight,
                        name: file.name,
                        dHash
                    });

                } catch (err) {
                    reject(err);
                } finally {
                    URL.revokeObjectURL(img.src);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
        });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        setIsProcessing(true);
        setProgress(0);

        const results = [];
        const total = acceptedFiles.length;

        for (let i = 0; i < total; i++) {
            try {
                const processed = await processFile(acceptedFiles[i]);
                results.push(processed);
            } catch (err) {
                console.error(`Failed to process ${acceptedFiles[i].name}`, err);
            }
            // Update progress bar
            setProgress(Math.round(((i + 1) / total) * 100));
        }

        setIsProcessing(false);
        if (onUploadComplete) {
            onUploadComplete(results);
        }
    }, [onUploadComplete]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            'image/webp': ['.webp']
        }
    });

    return (
        <div className="w-full">
            <div
                {...getRootProps()}
                className={`w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
                    ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                <input {...getInputProps()} />
                {isProcessing ? (
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2 mt-4">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-sm font-medium text-blue-600">처리 중... {progress}%</p>
                    </div>
                ) : (
                    <>
                        <div className="text-4xl mb-4">📸</div>
                        <p className="text-gray-600 font-medium">
                            {isDragActive ? "여기에 사진을 놓으세요" : "사진을 드래그하거나 클릭해서 업로드하세요"}
                        </p>
                        <p className="text-gray-400 text-xs mt-2">
                            Pica 엔진이 브라우저에서 안전하게 최적화(리사이즈)합니다.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
