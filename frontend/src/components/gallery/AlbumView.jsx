import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GalleryGrid from './GalleryGrid';
import useAuthStore from '../../store/authStore';
import { FolderHeart, Users, ChevronLeft } from 'lucide-react';

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

    // View: Inside a specific person's album
    if (selectedPerson) {
        return (
            <div className="w-full h-full flex flex-col pt-2">
                <div className="flex items-center gap-3 mb-6 px-4">
                    <button
                        onClick={() => setSelectedPerson(null)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {selectedPerson.label}님의 스마트 앨범
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">AI가 자동 분류한 사진들입니다.</p>
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 min-h-[400px]">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                            <p className="font-medium animate-pulse">사진을 안전하게 불러오는 중...</p>
                        </div>
                    ) : albumPhotos.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-gray-400 text-sm space-y-4">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center">
                                <FolderHeart size={40} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">분류된 사진이 없습니다</p>
                                <p>새로운 사진을 업로드하면 AI가 {selectedPerson.label}님을 찾아 이 폴더에 넣습니다.</p>
                            </div>
                        </div>
                    ) : (
                        <GalleryGrid photos={albumPhotos} />
                    )}
                </div>
            </div>
        );
    }

    // View: Main Smart Folders Grid
    return (
        <div className="w-full h-full flex flex-col pt-4">
            <div className="mb-8 px-4 text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                    스마트 앨범
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    AI가 인물별로 사진을 자동 정리해 둔 마법 같은 공간입니다.
                </p>
            </div>

            {(!registeredFaces || registeredFaces.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-gray-800/50 rounded-3xl border border-dashed border-blue-200 dark:border-gray-700 text-center mx-4">
                    <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-6">
                        <Users size={48} className="text-blue-400 dark:text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">아직 등록된 인물이 없습니다</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                        AI Chronicle 영역에서 인물(예: 나, 아내, 아이)을 등록하면, AI가 업로드되는 모든 사진에서 얼굴을 찾아 전용 앨범을 만들어 줍니다.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 pb-8">
                    {registeredFaces.map((face, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedPerson(face)}
                            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 aspect-square hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left flex flex-col"
                        >
                            {/* Decorative Background Pattern */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative h-full flex flex-col p-6">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center shadow-inner mb-auto transition-transform group-hover:scale-110">
                                    <span className="text-2xl font-bold">
                                        {face.label.substring(0, 1).toUpperCase()}
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <h3 className="font-bold text-xl text-gray-900 dark:text-white truncate">
                                        {face.label}
                                    </h3>
                                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                                        AI 스마트 앨범 ➔
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
