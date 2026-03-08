import React, { useState } from 'react';
import { Award, FileText, Download, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OwnershipBadge({ proof }) {
    const [showModal, setShowModal] = useState(false);

    if (!proof || !proof.payload || !proof.signature) return null;

    const handleDownloadCertificate = () => {
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proof, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `ownership_proof_${proof.payload.fileHash.substring(0, 8)}.json`);
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            toast.success("소유권 증명서가 다운로드되었습니다.");
        } catch (err) {
            console.error("Failed to download proof:", err);
            toast.error("증명서 다운로드 실패");
        }
    };

    return (
        <>
            {/* The Badge */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowModal(true);
                }}
                className="flex items-center text-blue-400 text-[11px] font-bold gap-1 border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/30 transition-colors px-2 py-0.5 rounded-full whitespace-nowrap"
                title="소유권 증명 뷰어 열기"
            >
                <Award size={14} className="text-blue-400" />
                Ownership Proven
            </button>

            {/* The Detailed Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation(); // prevent PhotoViewer from closing
                        setShowModal(false);
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800"
                        onClick={e => e.stopPropagation()} // stop clicks from closing modal
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-start justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-2 bg-white/20 rounded-full">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">소유권 증명서 (Ownership Proof)</h3>
                                    <p className="text-blue-100 text-xs mt-0.5">디지털 해시 서명 기반 원본 증명</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-white/70 hover:text-white transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                                <CheckCircle size={18} />
                                <span className="text-sm font-bold">이 사진의 원본 소유권이 암호학적으로 증명되었습니다.</span>
                            </div>

                            <div className="space-y-4 text-sm">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">소유자 (Owner)</label>
                                    <div className="font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200 border dark:border-gray-700 break-all">
                                        {proof.payload.owner}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">인증 시각 (Timestamp)</label>
                                    <div className="font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200 border dark:border-gray-700">
                                        {new Date(proof.payload.timestamp).toLocaleString()}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">파일 무결성 해시 (SHA-256)</label>
                                    <div className="font-mono text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded text-gray-800 dark:text-gray-200 border dark:border-gray-700 break-all">
                                        {proof.payload.fileHash}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">디지털 서명 (HMAC-SHA256)</label>
                                    <div className="font-mono text-[10px] bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 break-all">
                                        {proof.signature}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-4 border-t dark:border-gray-800 flex gap-3">
                                <button
                                    onClick={handleDownloadCertificate}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white py-2.5 rounded-lg font-bold transition-colors"
                                >
                                    <Download size={18} />
                                    <span>JSON 증명서 다운로드</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
