import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GalleryGrid from './GalleryGrid';
import useAuthStore from '../../store/authStore';

export default function AlbumView() {
    const registeredFaces = useAuthStore(state => state.registeredFaces);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [albumPhotos, setAlbumPhotos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Mock functionality since backend API isn't fully wired for this demo yet
    const fetchAlbumPhotos = async (personName) => {
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/albums/${personName}/photos`).catch(() => null);
            if (res && res.data) {
                setAlbumPhotos(res.data.photos || []);
            } else {
                // Mock fallback for UI testing
                setAlbumPhotos([]);
            }
        } catch (err) {
            console.error('Failed to load album', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPerson) {
            fetchAlbumPhotos(selectedPerson.label);
        } else {
            setAlbumPhotos([]);
        }
    }, [selectedPerson]);

    if (!registeredFaces || registeredFaces.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-dashed text-gray-400 text-sm">
                <p>등록된 인물이 없습니다.</p>
                <p>AI Chronicle 영역에서 인물을 먼저 등록해주세요.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h3 className="font-bold text-gray-700 mb-4 px-2">인물별 스마트 앨범 (Global Sync)</h3>

            <div className="flex flex-wrap gap-2 mb-6 px-2">
                {registeredFaces.map((face, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedPerson(face)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm
                            ${selectedPerson?.label === face.label
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-gray-700 border hover:bg-gray-50'
                            }`
                        }
                    >
                        {face.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-gray-50 rounded-xl border p-4 overflow-y-auto">
                {!selectedPerson ? (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        위에서 인물을 선택하면 관련된 사진만 모아 보여줍니다.
                    </div>
                ) : isLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
                        사진 불러오는 중...
                    </div>
                ) : albumPhotos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                        <span className="text-3xl mb-2">📭</span>
                        <p>아직 {selectedPerson.label}님이 포함된 사진이 분류되지 않았습니다.</p>
                        <p className="mt-1 text-xs">사진을 업로드하면 백그라운드 AI가 스캔을 시작합니다.</p>
                    </div>
                ) : (
                    <GalleryGrid photos={albumPhotos} />
                )}
            </div>
        </div>
    );
}
