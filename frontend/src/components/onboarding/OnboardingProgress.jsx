import React from 'react';
import useOnboardingStore from '../../store/onboardingStore';

const STEPS = [
    { id: 'name', label: '이름 짓기' },
    { id: 'invite', label: '초대하기' },
];

export default function OnboardingProgress({ current }) {
    const completedSteps = useOnboardingStore(s => s.completedSteps);
    const currentIdx = STEPS.findIndex(s => s.id === current);

    return (
        <div style={{ padding: '16px 24px 8px', maxWidth: 360, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {STEPS.map((step, i) => {
                    const isDone = completedSteps.includes(step.id) || i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: isDone || isActive ? '#3D2008' : '#D4C5A0',
                                    transition: 'all 0.3s',
                                    boxShadow: isActive ? '0 0 0 3px rgba(61,32,8,0.15)' : 'none',
                                }} />
                                <span style={{
                                    fontSize: 11, fontWeight: isActive ? 700 : 400,
                                    color: isActive ? '#3D2008' : isDone ? '#7A6E5E' : '#A09882',
                                    fontFamily: 'Georgia, serif',
                                }}>
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    width: 40, height: 2, borderRadius: 1,
                                    background: isDone ? '#3D2008' : '#E8E3D8',
                                    transition: 'all 0.3s',
                                    marginBottom: 18,
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
