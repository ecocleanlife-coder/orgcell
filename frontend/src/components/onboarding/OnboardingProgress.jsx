import React from 'react';
import useOnboardingStore from '../../store/onboardingStore';

const STEPS = [
    { id: 'start', label: '시작' },
    { id: 'service', label: '서비스' },
    { id: 'storage', label: '저장소' },
    { id: 'photos', label: '사진' },
    { id: 'face', label: '얼굴' },
    { id: 'family', label: '가족' },
    { id: 'privacy', label: '공개' },
    { id: 'invite', label: '초대' },
];

const ACCENT_COLORS = {
    museum: { done: '#7C5CFC', active: '#9B80FC', text: '#6B4FD6' },
    ai: { done: '#5A9460', active: '#7AB880', text: '#4A8450' },
    share: { done: '#4A7FB5', active: '#6A9FD5', text: '#3A6FA5' },
};

export default function OnboardingProgress({ current }) {
    const completedSteps = useOnboardingStore(s => s.completedSteps);
    const currentIdx = STEPS.findIndex(s => s.id === current);
    const onboardingType = localStorage.getItem('onboarding_type') || 'museum';
    const accent = ACCENT_COLORS[onboardingType] || ACCENT_COLORS.museum;

    return (
        <div className="w-full px-5 pt-3 pb-1 max-w-md mx-auto">
            <div className="flex items-center justify-between gap-1">
                {STEPS.map((step, i) => {
                    const isDone = completedSteps.includes(step.id) || i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center">
                            <div className="relative w-full">
                                <div
                                    className="w-full h-1.5 rounded-full transition-all"
                                    style={{
                                        background: isDone ? accent.done
                                            : isActive ? accent.active
                                            : '#E5E7EB',
                                    }}
                                />
                                {isDone && !isActive && (
                                    <span className="absolute -top-1 right-0 text-[8px]" style={{ color: accent.done }}>✓</span>
                                )}
                            </div>
                            <span
                                className="text-[11px] mt-1 transition-all"
                                style={{
                                    color: isActive ? accent.text
                                        : isDone ? accent.active
                                        : '#D1D5DB',
                                    fontWeight: isActive ? '700' : '400',
                                }}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
