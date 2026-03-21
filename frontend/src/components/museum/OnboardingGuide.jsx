import React, { useState } from 'react';
import { TreePine, GalleryThumbnails, CalendarDays, ClipboardList, UserPlus, ArrowRight, X, Check } from 'lucide-react';

const STEPS = [
    { key: 'tree',       icon: TreePine,          color: '#5A9460' },
    { key: 'exhibition', icon: GalleryThumbnails, color: '#8B5CF6' },
    { key: 'calendar',   icon: CalendarDays,      color: '#3B82F6' },
    { key: 'board',      icon: ClipboardList,      color: '#E67E22' },
    { key: 'invite',     icon: UserPlus,           color: '#EC4899' },
];

export default function OnboardingGuide({ onGoToTab, onClose, t }) {
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const titles = {
        tree:       t?.onboardTree       || 'Build Your Family Tree',
        exhibition: t?.onboardExhibition || 'Create Your First Album',
        calendar:   t?.onboardCalendar   || 'Add Family Events',
        board:      t?.onboardBoard      || 'Write Your First Post',
        invite:     t?.onboardInvite     || 'Invite Your Family',
    };

    const descs = {
        tree:       t?.onboardTreeDesc       || 'Add family members and build your family tree with generations.',
        exhibition: t?.onboardExhibitionDesc || 'Create a photo gallery to share memories with your family.',
        calendar:   t?.onboardCalendarDesc   || 'Click a date to add birthdays, anniversaries, and events.',
        board:      t?.onboardBoardDesc      || 'Share news, memories, and stories with your family.',
        invite:     t?.onboardInviteDesc     || 'Go to Settings and share an invite link with your family.',
    };

    const handleDoIt = () => {
        const tabMap = { tree: 'tree', exhibition: 'exhibition', calendar: 'calendar', board: 'board', invite: 'settings' };
        onGoToTab(tabMap[step.key]);
        onClose();
    };

    const handleSkip = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const Icon = step.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl relative"
                style={{ border: '1.5px solid #e8e0d0' }}
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={18} />
                </button>

                {/* Step indicator */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                    {STEPS.map((s, i) => (
                        <div
                            key={s.key}
                            className="w-2 h-2 rounded-full transition-all"
                            style={{ background: i === currentStep ? step.color : '#e8e0d0' }}
                        />
                    ))}
                </div>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: step.color + '15' }}
                    >
                        <Icon size={32} style={{ color: step.color }} />
                    </div>
                </div>

                {/* Content */}
                <div className="text-center mb-6">
                    <h3 className="text-lg font-bold mb-2" style={{ color: '#1E2A0E' }}>
                        {titles[step.key]}
                    </h3>
                    <p className="text-sm" style={{ color: '#7a6e5e' }}>
                        {descs[step.key]}
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
                        style={{ background: '#f0ece4', color: '#5a5040' }}
                    >
                        {currentStep < STEPS.length - 1
                            ? (t?.onboardSkip || 'Later')
                            : (t?.onboardDone || 'Done')}
                    </button>
                    <button
                        onClick={handleDoIt}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
                        style={{ background: step.color }}
                    >
                        {t?.onboardDoIt || 'Do it now'}
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
