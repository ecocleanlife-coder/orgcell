import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, User } from 'lucide-react';

function FaceCrop({ file, box }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!file || !box || !canvasRef.current) return;
        let isMounted = true;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            if (!isMounted) {
                URL.revokeObjectURL(url);
                return;
            }
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Add some padding around the face box
            const padding = 0.2;
            const px = box.width * padding;
            const py = box.height * padding;

            const sx = Math.max(0, box.x - px);
            const sy = Math.max(0, box.y - py);
            const sw = Math.min(img.width - sx, box.width + px * 2);
            const sh = Math.min(img.height - sy, box.height + py * 2);

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;

        return () => { isMounted = false; };
    }, [file, box]);

    return (
        <canvas
            ref={canvasRef}
            width={128}
            height={128}
            className="w-16 h-16 rounded-full object-cover relative z-10"
        />
    );
}

export default function FaceTagger({ faceGroups = [], assignedNames = {}, setAssignedNames }) {
    const handleAssign = (id, newName) => {
        if (setAssignedNames) {
            setAssignedNames(prev => ({ ...prev, [id]: newName }));
        }
    }

    if (!faceGroups || faceGroups.length === 0) {
        return null;
    }

    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <UserPlus className="text-blue-500" />
                인물 지정 (얼굴 식별 완료)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                발견된 주요 인물들의 이름을 지정해주세요. 이름이 입력된 인물만 '인물 폴더'로 자동 복사됩니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {faceGroups.filter(f => f.count >= 2).map((face) => { // Only show faces that appear multiple times to reduce noise
                    const name = assignedNames[face.id] || '';
                    const isAssigned = name.trim() !== '';
                    const samplePhoto = face.photos[0];

                    return (
                        <div key={face.id} className={`border rounded-xl p-4 transition-all ${isAssigned ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative">
                                    {samplePhoto ? (
                                        <FaceCrop file={samplePhoto.file} box={samplePhoto.box} />
                                    ) : (
                                        <User size={24} className="text-gray-400" />
                                    )}
                                    {/* Overlay circle */}
                                    <div className="absolute inset-0 border-2 border-yellow-400 rounded-full scale-75 opacity-70 z-20 pointer-events-none"></div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-500 uppercase">발견된 사진</div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-white">{face.count}장</div>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="이름 입력 (예: 엄마)"
                                value={name}
                                onChange={(e) => handleAssign(face.id, e.target.value)}
                                className={`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isAssigned ? 'bg-white border-emerald-200 focus:ring-emerald-500 text-emerald-900 font-bold dark:bg-gray-800 dark:text-emerald-400 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white'}`}
                            />
                        </div>
                    );
                })}
            </div>

            {faceGroups.filter(f => f.count >= 2).length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p>유의미한 인물(2장 이상)이 발견되지 않았습니다.</p>
                </div>
            )}
        </section>
    );
}
