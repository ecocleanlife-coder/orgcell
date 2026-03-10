import React from 'react';
import { Users, Heart, Camera, ChevronRight } from 'lucide-react';

const FamilyTreePreview = () => {
    return (
        <div className="relative w-full h-full bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 overflow-hidden min-h-[400px]">
            {/* 배경 장식 요소 */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-3xl opacity-50" />

            {/* 헤더 부분 */}
            <div className="flex items-center justify-between mb-8 z-10 relative">
                <div>
                    <h4 className="text-xl font-bold text-gray-800 dark:text-white">우리의 디지털 박물관</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">4세대의 기록이 연결됨</p>
                </div>
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="family" className="w-full h-full object-cover" />
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 bg-indigo-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 z-10">
                        +12
                    </div>
                </div>
            </div>

            {/* 가계도 시각화 영역 */}
            <div className="relative flex flex-col items-center gap-6 z-10">
                {/* 1세대 (조부모) */}
                <div className="flex gap-12 relative w-full justify-center">
                    <div className="relative group p-2">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform cursor-pointer">
                            <img src="https://i.pravatar.cc/100?img=68" className="rounded-xl w-full h-full object-cover" alt="Grandpa" />
                        </div>
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wider">GRANDPA</span>
                    </div>
                    <div className="relative group p-2">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-200 dark:border-rose-700/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform cursor-pointer">
                            <img src="https://i.pravatar.cc/100?img=45" className="rounded-xl w-full h-full object-cover" alt="Grandma" />
                        </div>
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400 tracking-wider">GRANDMA</span>
                    </div>
                    {/* 연결선 */}
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gray-300 dark:bg-gray-600 -z-10" />
                </div>

                {/* 연결 수직선 */}
                <div className="w-[2px] h-6 bg-gradient-to-b from-gray-300 to-indigo-300 dark:from-gray-600 dark:to-indigo-500/50" />

                {/* 2세대 (우리) */}
                <div className="relative p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 shadow-inner flex items-center gap-4 w-full max-w-[280px] cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                        <Heart size={20} fill="currentColor" />
                    </div>
                    <div className="flex-1">
                        <div className="h-2.5 w-24 bg-indigo-200 dark:bg-indigo-700/50 rounded-full mb-2.5" />
                        <div className="h-2 w-16 bg-indigo-100 dark:bg-indigo-800/50 rounded-full" />
                    </div>
                    <ChevronRight size={18} className="text-indigo-300 dark:text-indigo-500" />
                </div>

                {/* 하단 갤러리 카드 힌트 */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mt-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden hover:opacity-80 transition-opacity cursor-pointer shadow-sm">
                            <img src={`https://picsum.photos/seed/${i + 20}/200`} alt="memory" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            </div>

            {/* 부유하는 요소 (Floating Badge) */}
            <div className="absolute bottom-6 right-6 bg-white dark:bg-gray-800 shadow-xl shadow-indigo-100/50 dark:shadow-none rounded-full px-4 py-2 flex items-center gap-2 border border-indigo-50 dark:border-gray-700 animate-bounce z-20">
                <Camera size={14} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tracking-wide">AI가 1,240장의 사진 분류</span>
            </div>
        </div>
    );
};

export default FamilyTreePreview;
