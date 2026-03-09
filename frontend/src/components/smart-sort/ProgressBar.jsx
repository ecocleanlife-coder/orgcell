import React from 'react';

export default function ProgressBar({ isVisible, progress, title }) {
    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg transform transition-transform duration-300 translate-y-0">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm font-medium">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    {title}
                </div>
                <div>{progress}%</div>
            </div>
            <div className="h-1 bg-blue-800 w-full overflow-hidden">
                <div
                    className="h-full bg-blue-300 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}
