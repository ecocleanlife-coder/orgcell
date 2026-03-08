import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Loader2, Calendar } from 'lucide-react';
import DriveImage from './DriveImage';
import useAuthStore from '../../store/authStore';

export default function TimelineView({ onPhotoSelect }) {
    const { token } = useAuthStore();
    const [timelineData, setTimelineData] = useState([]);
    const [monthSummary, setMonthSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();

    // 1. Fetch Month Summaries for the Sidebar
    useEffect(() => {
        if (!token) return;
        axios.get('/api/photos/months')
            .then(res => {
                if (res.data?.success) {
                    setMonthSummary(res.data.data);
                }
            })
            .catch(err => console.error("Failed to fetch month summaries:", err));
    }, [token]);

    // 2. Fetch Timeline Data (Infinite Scroll)
    const fetchTimeline = useCallback(async (pageNum) => {
        if (!token) return;
        try {
            setIsLoading(true);
            const res = await axios.get(`/api/photos/timeline?page=${pageNum}&limit=20`);
            if (res.data?.success) {
                const newData = res.data.data;
                if (newData.length === 0) setHasMore(false);

                if (pageNum === 1) {
                    setTimelineData(newData);
                } else {
                    setTimelineData(prev => [...prev, ...newData]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch timeline:", error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchTimeline(1);
    }, [fetchTimeline]);

    // Infinite Scroll Observer Setup
    const lastElementRef = useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchTimeline(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, fetchTimeline]);

    // Sidebar navigation click handler
    const scrollToMonth = (monthKey) => {
        const element = document.getElementById(`month-${monthKey}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Group the raw flat array of photos into a structured UI map: { "2026-03": [photos...], "2026-02": [...] }
    const groupedPhotos = timelineData.reduce((acc, photo) => {
        const dateStr = photo.taken_at || photo.created_at;
        const dateObj = new Date(dateStr);
        const yearMonth = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;

        if (!acc[yearMonth]) acc[yearMonth] = { key: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`, photos: [] };
        acc[yearMonth].photos.push(photo);
        return acc;
    }, {});


    if (timelineData.length === 0 && !isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                <Calendar size={48} className="mb-4 opacity-50" />
                <p>타임라인에 표시할 사진이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full bg-white relative">
            {/* Main Content Area (Timeline) */}
            <div className="flex-1 overflow-y-auto pr-2 pb-20 custom-scrollbar">
                {Object.entries(groupedPhotos).map(([monthLabel, groupData], groupIndex) => (
                    <div key={groupData.key} id={`month-${groupData.key}`} className="mb-8">
                        {/* Sticky Header for Month */}
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-3 px-2 border-b mb-4 shadow-sm flex items-center">
                            <h3 className="font-extrabold text-xl text-gray-800 tracking-tight">{monthLabel}</h3>
                            <span className="text-xs text-gray-500 font-medium ml-2 bg-gray-100 px-2 py-1 rounded-full">{groupData.photos.length}장의 사진</span>
                        </div>

                        {/* Photo Grid within the month */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 px-2">
                            {groupData.photos.map((photo, index) => {
                                const isLast = groupIndex === Object.keys(groupedPhotos).length - 1 && index === groupData.photos.length - 1;

                                return (
                                    <div
                                        ref={isLast ? lastElementRef : null}
                                        key={photo.id || index}
                                        onClick={() => onPhotoSelect(photo)}
                                        className="relative aspect-square group cursor-pointer overflow-hidden rounded-xl bg-gray-100 border border-gray-200 shadow-sm transition-transform hover:border-purple-400"
                                    >
                                        {photo.drive_thumbnail_id ? (
                                            <DriveImage
                                                fileId={photo.drive_thumbnail_id}
                                                alt={photo.original_name || photo.name || 'Photo'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                fallbackSrc={photo.thumbUrl}
                                            />
                                        ) : (
                                            <img
                                                src={photo.thumbUrl || photo.thumbnail_url}
                                                alt={photo.name || 'Photo'}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-center items-center py-6 col-span-full">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        <span className="ml-2 text-sm text-gray-500 font-medium">과거의 추억을 불러오는 중...</span>
                    </div>
                )}
            </div>

            {/* Right Sidebar (Fast Time Navigation) */}
            <div className="w-16 md:w-20 border-l bg-gray-50/50 flex flex-col items-center py-4 gap-1 overflow-y-auto shrink-0 hidden sm:flex custom-scrollbar">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2 border-b pb-1 w-full text-center">Time</span>
                {monthSummary.map((summary) => (
                    <button
                        key={summary.month}
                        onClick={() => scrollToMonth(summary.month)}
                        className="flex flex-col items-center p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-purple-200 transition-all group w-full text-center"
                    >
                        <span className="text-xs font-black text-gray-700 group-hover:text-purple-600">
                            {summary.month.split('-')[1]}월
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 group-hover:text-purple-400">
                            '{summary.month.split('-')[0].slice(-2)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
