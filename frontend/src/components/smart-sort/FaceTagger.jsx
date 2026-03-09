import React, { useState } from 'react';
import { UserPlus, User } from 'lucide-react';

export default function FaceTagger() {
    // Mock detected faces
    const [faces, setFaces] = useState([
        { id: 1, name: '', assigned: false, count: 420 },
        { id: 2, name: '', assigned: false, count: 185 },
        { id: 3, name: '', assigned: false, count: 93 },
    ]);

    const handleAssign = (id, newName) => {
        setFaces(faces.map(f => f.id === id ? { ...f, name: newName, assigned: newName.trim() !== '' } : f));
    }

    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <UserPlus className="text-blue-500" />
                인물 지정 (얼굴 매핑)
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                발견된 인물들의 이름을 지정해주세요. 이 이름으로 '인물 폴더'가 자동 생성됩니다.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {faces.map((face) => (
                    <div key={face.id} className={`border rounded-xl p-4 transition-all ${face.assigned ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            {/* Mock Face Circular Crop */}
                            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative">
                                <User size={24} className="text-gray-400" />
                                {/* Overlay mock circle */}
                                <div className="absolute inset-0 border-2 border-yellow-400 rounded-full scale-75 opacity-70"></div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase">발견된 사진</div>
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{face.count}장</div>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="이름 입력 (예: 엄마)"
                            value={face.name}
                            onChange={(e) => handleAssign(face.id, e.target.value)}
                            className={`w-full text-sm px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${face.assigned ? 'bg-white border-emerald-200 focus:ring-emerald-500 text-emerald-900 font-bold dark:bg-gray-800 dark:text-emerald-400 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white'}`}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
