import React, { useState, useEffect } from 'react';
import { X, Download, ShieldCheck, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { decryptBlob } from '../../utils/cryptoUtils';
import useCryptoStore from '../../store/cryptoStore';
import { toast } from 'react-hot-toast';

import OwnershipBadge from './OwnershipBadge';

export default function PhotoViewer({ photo, onClose, onDeleteClick }) {
    const [decryptedUrl, setDecryptedUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const masterKey = useCryptoStore(state => state.masterKey);

    useEffect(() => {
        let objectUrl = null;
        let isMounted = true;
        const abortController = new AbortController();

        const loadPhoto = async () => {
            if (!photo) return;

            // Scenario 1: It's a newly uploaded photo in the current session (we have the original file locally)
            if (photo.originalFile) {
                try {
                    if (!masterKey) throw new Error('마스터 키가 없습니다.');
                    const blob = await decryptBlob(photo.originalFile, masterKey);
                    if (isMounted) {
                        objectUrl = URL.createObjectURL(blob);
                        setDecryptedUrl(objectUrl);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Local Decryption failed', err);
                    if (isMounted) {
                        setError('로컬 암호화 해제 실패. 키를 확인하세요.');
                        setLoading(false);
                    }
                }
                return;
            }

            // Scenario 2: It's a remote photo fetched from DB/Drive
            if (photo.drive_file_id) {
                try {
                    if (!masterKey) throw new Error('마스터 키가 없습니다.');

                    // Fetch encrypted blob from our proxy Drive API
                    const res = await axios.get(`/api/drive/download/${photo.drive_file_id}`, {
                        responseType: 'blob',
                        signal: abortController.signal
                    });

                    const decryptedBlob = await decryptBlob(res.data, masterKey);

                    // Create proper typed blob based on metadata 
                    const typedBlob = new Blob([decryptedBlob], { type: photo.mime_type || 'image/jpeg' });

                    if (isMounted) {
                        objectUrl = URL.createObjectURL(typedBlob);
                        setDecryptedUrl(objectUrl);
                        setLoading(false);
                    }
                } catch (err) {
                    if (axios.isCancel(err)) {
                        console.log('Request canceled:', err.message);
                    } else {
                        console.error('Remote Decryption failed', err);
                        if (isMounted) {
                            setError('사진을 복호화할 수 없습니다. 마스터 키가 다르거나 파일이 손상되었습니다.');
                            setLoading(false);
                        }
                    }
                }
                return;
            }

            // Scenario 3: Unknown state
            if (isMounted) {
                setError('원본 파일을 찾을 수 없습니다.');
                setLoading(false);
            }
        };

        loadPhoto();

        return () => {
            isMounted = false;
            abortController.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [photo, masterKey]);

    if (!photo) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
            {/* Header / Toolbar */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <span className="font-medium text-lg drop-shadow-md truncate max-w-xs md:max-w-md">
                        {photo.original_name || photo.name || photo.filename || 'Untitled'}
                    </span>
                    <span className="flex items-center text-emerald-400 text-xs gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={12} /> E2E Secured
                    </span>
                    {photo.metadata && photo.metadata.ownership_proof && (
                        <OwnershipBadge proof={photo.metadata.ownership_proof} />
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Delete Button */}
                    <button
                        className="bg-red-500/80 hover:bg-red-600 p-2 rounded-full transition-colors cursor-pointer text-white"
                        title="영구 삭제"
                        onClick={(e) => {
                            if (window.confirm("정말 이 사진을 삭제하시겠습니까? Drive 연결 상태라면 클라우드에서도 영구 삭제됩니다.")) {
                                if (onDeleteClick) onDeleteClick(photo);
                            }
                        }}
                    >
                        <Trash2 size={20} />
                    </button>
                    {decryptedUrl && (
                        <a
                            href={decryptedUrl}
                            download={photo.original_name || photo.name || 'orgcell_photo.jpeg'}
                            className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer"
                            title="원본 원격 다운로드"
                            onClick={(e) => {
                                toast.success('안전하게 복호화되어 로컬 기기에 저장됩니다.');
                            }}
                        >
                            <Download size={20} />
                        </a>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                        title="닫기 (ESC)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full h-full max-h-[85vh] flex items-center justify-center relative mt-12">
                {loading ? (
                    <div className="flex flex-col items-center gap-4 text-white p-8 bg-gray-900/50 rounded-2xl border border-gray-700/50">
                        <Loader2 size={48} className="animate-spin text-purple-500" />
                        <div className="text-center">
                            <p className="font-medium text-lg mb-1">E2E 복호화 진행중...</p>
                            <p className="text-xs text-gray-400">Google Drive에서 안전하게 스트리밍 중입니다.</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-red-400 bg-red-900/20 p-8 rounded-2xl border border-red-500/30 max-w-md text-center">
                        <AlertCircle size={48} className="mb-4 text-red-500" />
                        <p className="font-bold text-lg mb-2">복호화 실패</p>
                        <p className="text-sm font-medium opacity-90">{error}</p>
                    </div>
                ) : (
                    <img
                        src={decryptedUrl}
                        alt="Decrypted Full Res"
                        className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
                        draggable={false}
                    />
                )}
            </div>

            {/* Metadata Footer */}
            {decryptedUrl && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-xs text-gray-300 flex items-center gap-4 border border-white/10">
                    {photo.width && photo.height && <span>{photo.width} × {photo.height}</span>}
                    {photo.file_size && <span>{(photo.file_size / 1024 / 1024).toFixed(2)} MB</span>}
                    <span>Google Drive 연동됨</span>
                </div>
            )}
        </div>
    );
}
