import React from 'react';
import DriveImage from './DriveImage';

export default function GalleryGrid({ photos, onPhotoSelect }) {
    if (!photos || photos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
                <p className="text-lg mb-2">갤러리가 비어 있습니다</p>
                <p className="text-sm">사진을 업로드하여 추억을 정리해보세요.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo, idx) => (
                <div
                    key={photo.id || idx}
                    className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer border"
                    onClick={() => onPhotoSelect && onPhotoSelect(photo)}
                >
                    {photo.drive_thumbnail_id ? (
                        <DriveImage
                            fileId={photo.drive_thumbnail_id}
                            alt={photo.filename || photo.original_name || `Photo ${idx}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            fallbackSrc={photo.thumbUrl}
                        />
                    ) : (
                        <img
                            src={photo.thumbUrl || photo.thumbnail_url}
                            alt={photo.filename || photo.original_name || `Photo ${idx}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-white text-xs truncate drop-shadow-md">
                            {photo.name || 'Untitled'}
                        </p>
                        <p className="text-gray-300 text-[10px] drop-shadow-md">
                            {photo.width} x {photo.height}
                        </p>
                    </div>

                    {/* Temporary Top Badge (for TPE/Face indicator later) */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur pb-px pt-0.5 px-1.5 rounded text-[10px] font-bold text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        👤 AI
                    </div>
                </div>
            ))}
        </div>
    );
}
