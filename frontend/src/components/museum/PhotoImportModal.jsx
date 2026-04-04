import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Upload, Image, HardDrive, Cloud, Check, ChevronDown, Trash2 } from 'lucide-react';
import axios from 'axios';
import exifr from 'exifr';

const PRIVACY_OPTIONS = [
    { value: 'public', label: '일반공개', icon: '🌍' },
    { value: 'family', label: '가족공개', icon: '👨‍👩‍👧‍👦' },
    { value: 'private', label: '개인보관', icon: '🔒' },
    { value: 'download', label: '다운로드 허락', icon: '⬇️' },
];

const PAGE_OPTIONS = [
    { value: 0, label: '전체' },
    { value: 20, label: '20장' },
    { value: 50, label: '50장' },
    { value: 100, label: '100장' },
];

export default function PhotoImportModal({ siteId, onClose, onDone }) {
    const [source, setSource] = useState('local');
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [pageSize, setPageSize] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const fileInputRef = useRef(null);
    const lastClickedRef = useRef(null);

    // Group photos by year
    const photosByYear = photos.reduce((acc, photo) => {
        const year = photo.year || '미분류';
        if (!acc[year]) acc[year] = [];
        acc[year].push(photo);
        return acc;
    }, {});

    const sortedYears = Object.keys(photosByYear).sort((a, b) => {
        if (a === '미분류') return 1;
        if (b === '미분류') return -1;
        return Number(b) - Number(a);
    });

    const allPhotosFlat = sortedYears.flatMap(y => photosByYear[y]);
    const displayPhotos = pageSize > 0
        ? allPhotosFlat.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
        : allPhotosFlat;
    const totalPages = pageSize > 0 ? Math.ceil(allPhotosFlat.length / pageSize) : 1;

    // Handle local file selection
    const handleFileSelect = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        setLoading(true);
        const newPhotos = [];

        for (const file of files) {
            const isDup = photos.some(p => p.name === file.name && p.size === file.size);
            if (isDup) continue;

            let date = null;
            let year = null;
            try {
                const exif = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
                const exifDate = exif?.DateTimeOriginal || exif?.CreateDate;
                if (exifDate) {
                    date = exifDate instanceof Date ? exifDate : new Date(exifDate);
                    year = date.getFullYear().toString();
                }
            } catch {
                // No EXIF data
            }

            const thumbnail = URL.createObjectURL(file);

            newPhotos.push({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                file,
                name: file.name,
                size: file.size,
                date,
                year,
                thumbnail,
                privacy: 'family',
            });
        }

        setPhotos(prev => [...prev, ...newPhotos]);
        setLoading(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [photos]);

    const setPhotoPrivacy = useCallback((photoId, privacy) => {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, privacy } : p));
    }, []);

    const setBulkPrivacy = useCallback((privacy) => {
        if (selectedIds.size > 0) {
            setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, privacy } : p));
        } else {
            setPhotos(prev => prev.map(p => ({ ...p, privacy })));
        }
    }, [selectedIds]);

    const toggleSelect = useCallback((photoId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId);
            else next.add(photoId);
            return next;
        });
    }, []);

    const selectAll = () => setSelectedIds(new Set(photos.map(p => p.id)));
    const deselectAll = () => setSelectedIds(new Set());

    const removeSelected = () => {
        setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
    };

    const handlePhotoClick = useCallback((photoId, e) => {
        if (e.shiftKey && lastClickedRef.current) {
            const allIds = allPhotosFlat.map(p => p.id);
            const startIdx = allIds.indexOf(lastClickedRef.current);
            const endIdx = allIds.indexOf(photoId);
            const [from, to] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
            const rangeIds = allIds.slice(from, to + 1);
            setSelectedIds(prev => {
                const next = new Set(prev);
                rangeIds.forEach(id => next.add(id));
                return next;
            });
        } else {
            toggleSelect(photoId);
        }
        lastClickedRef.current = photoId;
    }, [allPhotosFlat, toggleSelect]);

    const handleUpload = async () => {
        if (!photos.length || !siteId) return;
        setUploading(true);
        setUploadProgress(0);

        let uploaded = 0;
        for (const photo of photos) {
            const fd = new FormData();
            fd.append('photo', photo.file);
            fd.append('privacy_level', photo.privacy);
            if (photo.date) fd.append('exif_date', photo.date.toISOString());

            try {
                await axios.post(`/api/photos/import`, fd);
            } catch (err) {
                console.error('Upload error:', photo.name, err);
            }

            uploaded++;
            setUploadProgress(Math.round((uploaded / photos.length) * 100));
        }

        setUploading(false);
        if (onDone) onDone();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl w-full h-full md:w-11/12 md:h-5/6 md:rounded-2xl flex flex-col" style={{ backgroundColor: '#FAFAF7' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#e8e0d0' }}>
                    <div>
                        <h2 className="text-2xl font-bold" style={{ color: '#3a3a2a' }}>사진 가져오기</h2>
                        <p className="text-sm mt-1" style={{ color: '#7a7a6a' }}>
                            {photos.length}장 선택됨 {selectedIds.size > 0 && `(${selectedIds.size}장)`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                    >
                        <X size={24} style={{ color: '#3a3a2a' }} />
                    </button>
                </div>

                {/* Source Tabs */}
                <div className="flex border-b" style={{ borderColor: '#e8e0d0' }}>
                    <button
                        onClick={() => setSource('local')}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                            source === 'local' ? 'border-b-2' : ''
                        }`}
                        style={{
                            color: source === 'local' ? '#C4A84F' : '#7a7a6a',
                            borderColor: source === 'local' ? '#C4A84F' : 'transparent',
                        }}
                    >
                        <HardDrive size={18} />
                        내 컴퓨터
                    </button>
                    <button
                        onClick={() => setSource('gdrive')}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                            source === 'gdrive' ? 'border-b-2' : ''
                        }`}
                        style={{
                            color: source === 'gdrive' ? '#C4A84F' : '#7a7a6a',
                            borderColor: source === 'gdrive' ? '#C4A84F' : 'transparent',
                        }}
                    >
                        <Cloud size={18} />
                        Google Drive
                    </button>
                    <button
                        onClick={() => setSource('onedrive')}
                        className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                            source === 'onedrive' ? 'border-b-2' : ''
                        }`}
                        style={{
                            color: source === 'onedrive' ? '#C4A84F' : '#7a7a6a',
                            borderColor: source === 'onedrive' ? '#C4A84F' : 'transparent',
                        }}
                    >
                        <Cloud size={18} />
                        OneDrive
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {source === 'local' ? (
                        <>
                            {photos.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <Image size={48} className="mx-auto mb-4" style={{ color: '#C4A84F' }} />
                                        <p style={{ color: '#3a3a2a' }} className="text-lg font-medium mb-6">
                                            사진을 선택해주세요
                                        </p>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-8 py-3 rounded-lg font-medium transition transform hover:scale-105"
                                            style={{ backgroundColor: '#C4A84F', color: '#FAFAF7' }}
                                        >
                                            컴퓨터에서 선택
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Toolbar */}
                                    <div className="p-4 border-b space-y-3" style={{ borderColor: '#e8e0d0' }}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80"
                                                style={{ backgroundColor: '#e8e0d0', color: '#3a3a2a' }}
                                            >
                                                + 더 추가
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                            <div className="flex gap-1">
                                                {PAGE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => {
                                                            setPageSize(opt.value);
                                                            setCurrentPage(0);
                                                        }}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                                                            pageSize === opt.value ? '' : 'hover:bg-gray-100'
                                                        }`}
                                                        style={{
                                                            backgroundColor: pageSize === opt.value ? '#C4A84F' : 'transparent',
                                                            color: pageSize === opt.value ? '#FAFAF7' : '#3a3a2a',
                                                        }}
                                                    >
                                                        [{opt.label}]
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={selectAll}
                                                className="px-3 py-1 rounded text-sm hover:opacity-80"
                                                style={{ backgroundColor: '#e8e0d0', color: '#3a3a2a' }}
                                            >
                                                모두선택
                                            </button>
                                            <button
                                                onClick={deselectAll}
                                                className="px-3 py-1 rounded text-sm hover:opacity-80"
                                                style={{ backgroundColor: '#e8e0d0', color: '#3a3a2a' }}
                                            >
                                                선택해제
                                            </button>
                                            {selectedIds.size > 0 && (
                                                <button
                                                    onClick={removeSelected}
                                                    className="px-3 py-1 rounded text-sm flex items-center gap-1 hover:opacity-80"
                                                    style={{ backgroundColor: '#f5d0d0', color: '#a03030' }}
                                                >
                                                    <Trash2 size={14} />
                                                    삭제
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {PRIVACY_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setBulkPrivacy(opt.value)}
                                                    className="px-3 py-1 rounded text-sm hover:opacity-80 transition"
                                                    style={{
                                                        backgroundColor: '#e8e0d0',
                                                        color: '#3a3a2a',
                                                    }}
                                                >
                                                    [전체 {opt.label}]
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Gallery Grid */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <p style={{ color: '#7a7a6a' }}>사진 처리 중...</p>
                                            </div>
                                        ) : displayPhotos.length > 0 ? (
                                            <div className="space-y-6">
                                                {sortedYears.filter(y => photosByYear[y].some(p => displayPhotos.includes(p))).map(year => (
                                                    <div key={year}>
                                                        <h3 className="text-lg font-bold mb-3" style={{ color: '#C4A84F' }}>
                                                            {year}
                                                        </h3>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                            {photosByYear[year]
                                                                .filter(p => displayPhotos.includes(p))
                                                                .map(photo => (
                                                                    <div
                                                                        key={photo.id}
                                                                        className="cursor-pointer transition"
                                                                        onClick={(e) => handlePhotoClick(photo.id, e)}
                                                                    >
                                                                        <div
                                                                            className={`relative rounded-lg overflow-hidden mb-2 ${
                                                                                selectedIds.has(photo.id) ? 'ring-2' : ''
                                                                            }`}
                                                                            style={{
                                                                                borderColor: selectedIds.has(photo.id) ? '#C4A84F' : 'transparent',
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={photo.thumbnail}
                                                                                alt={photo.name}
                                                                                className="w-full h-32 object-cover"
                                                                            />
                                                                            {selectedIds.has(photo.id) && (
                                                                                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                                                                    <Check size={24} style={{ color: '#C4A84F' }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs font-medium truncate" style={{ color: '#3a3a2a' }}>
                                                                                {photo.name}
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {PRIVACY_OPTIONS.map(opt => (
                                                                                    <button
                                                                                        key={opt.value}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setPhotoPrivacy(photo.id, opt.value);
                                                                                        }}
                                                                                        className={`text-xs px-2 py-1 rounded transition ${
                                                                                            photo.privacy === opt.value ? '' : 'opacity-40'
                                                                                        }`}
                                                                                        style={{
                                                                                            backgroundColor: photo.privacy === opt.value ? '#C4A84F' : '#e8e0d0',
                                                                                            color: photo.privacy === opt.value ? '#FAFAF7' : '#3a3a2a',
                                                                                        }}
                                                                                    >
                                                                                        {opt.icon}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <p style={{ color: '#7a7a6a' }}>선택된 사진이 없습니다</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 p-4 border-t" style={{ borderColor: '#e8e0d0' }}>
                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentPage(i)}
                                                    className={`px-3 py-1 rounded text-sm transition ${
                                                        currentPage === i ? '' : 'opacity-50 hover:opacity-75'
                                                    }`}
                                                    style={{
                                                        backgroundColor: currentPage === i ? '#C4A84F' : '#e8e0d0',
                                                        color: currentPage === i ? '#FAFAF7' : '#3a3a2a',
                                                    }}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Upload Progress */}
                                    {uploading && (
                                        <div className="p-4 border-t" style={{ borderColor: '#e8e0d0' }}>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full transition-all"
                                                    style={{ width: `${uploadProgress}%`, backgroundColor: '#C4A84F' }}
                                                />
                                            </div>
                                            <p className="text-sm text-center mt-2" style={{ color: '#7a7a6a' }}>
                                                {uploadProgress}% 업로드 중...
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Cloud size={48} className="mx-auto mb-4" style={{ color: '#C4A84F' }} />
                                <p style={{ color: '#3a3a2a' }} className="text-lg font-medium">
                                    준비 중입니다
                                </p>
                                <p style={{ color: '#7a7a6a' }} className="text-sm mt-2">
                                    곧 지원될 예정입니다
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t" style={{ borderColor: '#e8e0d0' }}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg font-medium transition hover:opacity-80"
                        style={{ backgroundColor: '#e8e0d0', color: '#3a3a2a' }}
                    >
                        취소
                    </button>
                    {source === 'local' && photos.length > 0 && (
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition hover:scale-105 disabled:opacity-50"
                            style={{ backgroundColor: '#C4A84F', color: '#FAFAF7' }}
                        >
                            <Upload size={18} />
                            {uploading ? '업로드 중...' : `업로드 (${photos.length}장)`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
