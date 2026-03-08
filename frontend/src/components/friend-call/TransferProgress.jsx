import React from 'react';
import { CheckCircle, UploadCloud, DownloadCloud, Loader2 } from 'lucide-react';

export default function TransferProgress({ total, current, type, bytesSent, bytesTotal }) {
    if (total === 0) return null;

    const percent = Math.round((current / total) * 100);
    const isComplete = current === total;

    return (
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {type === 'send' ? (
                        <UploadCloud size={20} className={isComplete ? 'text-green-500' : 'text-purple-600'} />
                    ) : (
                        <DownloadCloud size={20} className={isComplete ? 'text-green-500' : 'text-blue-600'} />
                    )}
                    <span className="font-bold text-gray-700 text-sm">
                        {type === 'send' ? '사진 전송' : '사진 수신'}
                        {isComplete ? ' 완료' : ' 중...'}
                    </span>
                </div>
                <span className="text-xs font-bold text-gray-500">{current} / {total}</span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner flex items-center">
                <div
                    className={`h-full transition-all duration-300 flex items-center justify-center text-[10px] text-white font-bold
                        ${isComplete ? 'bg-green-500' : type === 'send' ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`
                    }
                    style={{ width: `${Math.max(5, percent)}%` }}
                >
                    {percent > 10 && `${percent}%`}
                </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <span>
                    {isComplete ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle size={14} /> 모든 호스트 전송 완료
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 animate-pulse">
                            <Loader2 size={12} className="animate-spin" /> E2E 암호화 스트리밍 중
                        </span>
                    )}
                </span>

                {bytesTotal > 0 && (
                    <span>
                        {(bytesSent / 1024 / 1024).toFixed(1)}MB / {(bytesTotal / 1024 / 1024).toFixed(1)}MB
                    </span>
                )}
            </div>
        </div>
    );
}
