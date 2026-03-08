import React, { useState, useEffect } from 'react';
import { Check, Send, Filter, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import DriveImage from '../gallery/DriveImage';

export default function PhotoSelector({ localPhotos, onSend, disabled }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [filterPerson, setFilterPerson] = useState(null);
    const registeredFaces = useAuthStore(state => state.registeredFaces || []);

    const handleToggle = (photo) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(photo.id || photo.name)) {
            newSet.delete(photo.id || photo.name);
        } else {
            newSet.add(photo.id || photo.name);
        }
        setSelectedIds(newSet);
    };

    const handleSendClick = () => {
        const photosToSend = localPhotos.filter(p => selectedIds.has(p.id || p.name));
        if (photosToSend.length > 0 && onSend) {
            onSend(photosToSend);
            setSelectedIds(new Set());
        }
    };

    // Derived filtered photos based on face-api tags
    // Assuming backend returns face labels in photo object, or we match it locally
    // For MVP, if filterPerson is selected, we only show photos containing that label
    const displayedPhotos = filterPerson
        ? localPhotos.filter(p => p.faces && p.faces.some(f => f.label === filterPerson.label))
        : localPhotos;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Toolbar Header */}
            <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                    <span className="text-sm font-bold text-gray-700 whitespace-nowrap"><Filter size={16} className="inline mr-1 text-gray-500" /> 인물 필터:</span>
                    <button
                        onClick={() => setFilterPerson(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${!filterPerson ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}
                    >
                        전체 보기
                    </button>
                    {registeredFaces.map(face => (
                        <button
                            key={face.label}
                            onClick={() => setFilterPerson(face)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${filterPerson?.label === face.label ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}
                        >
                            {face.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Photo Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {displayedPhotos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                        <span className="text-2xl mb-2">📭</span>
                        <p>{filterPerson ? `${filterPerson.label}님이 포함된 사진이 없습니다.` : '갤러리가 비어 있습니다.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {displayedPhotos.map((photo, idx) => {
                            const isSelected = selectedIds.has(photo.id || photo.name);
                            return (
                                <div
                                    key={photo.id || idx}
                                    onClick={() => handleToggle(photo)}
                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-purple-500 scale-95 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                                >
                                    {photo.drive_thumbnail_id ? (
                                        <DriveImage
                                            fileId={photo.drive_thumbnail_id}
                                            alt={photo.original_name || photo.name || `Photo`}
                                            className="w-full h-full object-cover"
                                            fallbackSrc={photo.thumbUrl}
                                        />
                                    ) : (
                                        <img
                                            src={photo.thumbUrl || photo.thumbnail_url}
                                            alt={photo.name || 'Photo'}
                                            className="w-full h-full object-cover"
                                        />
                                    )}

                                    {/* Selection Checkmark */}
                                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600' : 'bg-black/20 border-white/70'}`}>
                                        {isSelected && <Check size={12} className="text-white" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-white border-t flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                    <strong className="text-purple-600">{selectedIds.size}</strong>장 선택됨
                </span>

                <button
                    onClick={handleSendClick}
                    disabled={selectedIds.size === 0 || disabled}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:from-gray-400 disabled:to-gray-500 transition-all cursor-pointer"
                >
                    <Send size={16} />
                    보내기
                </button>
            </div>
        </div>
    );
}
