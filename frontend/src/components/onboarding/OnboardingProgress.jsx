import React from 'react';

const STEPS = [
    { id: 'service', label: '서비스' },
    { id: 'storage', label: '저장소' },
    { id: 'photos', label: '사진' },
    { id: 'face', label: '얼굴' },
    { id: 'family', label: '가족' },
    { id: 'privacy', label: '공개' },
    { id: 'invite', label: '초대' },
];

export default function OnboardingProgress({ current }) {
    const currentIdx = STEPS.findIndex(s => s.id === current);

    return (
        <div className="w-full px-5 pt-3 pb-1 max-w-md mx-auto">
            <div className="flex items-center justify-between gap-1">
                {STEPS.map((step, i) => {
                    const isDone = i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center">
                            <div
                                className={`w-full h-1.5 rounded-full transition-all ${
                                    isDone ? 'bg-emerald-500'
                                    : isActive ? 'bg-emerald-400'
                                    : 'bg-gray-200'
                                }`}
                            />
                            <span className={`text-[9px] mt-1 transition-all ${
                                isActive ? 'text-emerald-600 font-bold'
                                : isDone ? 'text-emerald-400'
                                : 'text-gray-300'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
