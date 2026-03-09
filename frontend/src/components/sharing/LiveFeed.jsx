import React, { useState, useEffect } from 'react';
import { Heart, Laugh, ThumbsUp, MessageCircle } from 'lucide-react';

export default function LiveFeed() {
    const [photos, setPhotos] = useState([]);

    // Mock incoming photos simulating real-time feed
    useEffect(() => {
        const initialPhotos = [
            { id: 1, user: '엄마', time: '방금 전', color: 'bg-rose-100 dark:bg-rose-900', reactions: [] },
            { id: 2, user: '아빠', time: '1분 전', color: 'bg-blue-100 dark:bg-blue-900', reactions: [{ type: 'heart', count: 2 }] },
            { id: 3, user: '나', time: '5분 전', color: 'bg-emerald-100 dark:bg-emerald-900', reactions: [{ type: 'laugh', count: 1 }] }
        ];

        setPhotos(initialPhotos);

        // Simulate a new photo arriving after 3 seconds
        const timer = setTimeout(() => {
            setPhotos(prev => [
                { id: Date.now(), user: '형', time: '방금 전', color: 'bg-purple-100 dark:bg-purple-900', reactions: [], isNew: true },
                ...prev
            ]);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleReaction = (photoId, type) => {
        setPhotos(photos.map(p => {
            if (p.id === photoId) {
                const existing = p.reactions.find(r => r.type === type);
                const newReactions = existing
                    ? p.reactions.map(r => r.type === type ? { ...r, count: r.count + 1 } : r)
                    : [...p.reactions, { type, count: 1 }];
                return { ...p, reactions: newReactions };
            }
            return p;
        }));
    };

    return (
        <div className="space-y-6">
            {photos.map(photo => (
                <div
                    key={photo.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-500 ${photo.isNew ? 'animate-fade-in-up border-emerald-300 ring-2 ring-emerald-100 dark:ring-emerald-900' : ''}`}
                >
                    {/* Feed Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 ${photo.color}`}>
                            {photo.user[0]}
                        </div>
                        <div>
                            <div className="font-bold text-sm text-gray-900 dark:text-white">{photo.user}</div>
                            <div className="text-xs text-gray-500">{photo.time}</div>
                        </div>
                    </div>

                    {/* Mock Photo Body */}
                    <div className="w-full aspect-video bg-gray-200 dark:bg-gray-700 rounded-xl mb-4 overflow-hidden relative group">
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <span className="text-4xl text-gray-400">📷</span>
                        </div>
                    </div>

                    {/* Reaction Bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            {photo.reactions.map(r => (
                                <span key={r.type} className="bg-gray-100 dark:bg-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
                                    {r.type === 'heart' && '❤️'}
                                    {r.type === 'laugh' && '😂'}
                                    {r.type === 'thumb' && '👍'}
                                    {r.count}
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleReaction(photo.id, 'heart')} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-full transition-colors"><Heart size={20} /></button>
                            <button onClick={() => handleReaction(photo.id, 'laugh')} className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-gray-400 hover:text-yellow-500 rounded-full transition-colors"><Laugh size={20} /></button>
                            <button onClick={() => handleReaction(photo.id, 'thumb')} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 rounded-full transition-colors"><ThumbsUp size={20} /></button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors"><MessageCircle size={20} /></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
