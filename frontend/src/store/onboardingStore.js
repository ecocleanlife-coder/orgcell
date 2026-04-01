import { create } from 'zustand';

const STORAGE_KEY = 'orgcell_onboarding';

const STEPS = ['name'];

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // 무시
    }
}

const saved = loadState();

const useOnboardingStore = create((set, get) => ({
    started: saved?.started || false,
    completedSteps: saved?.completedSteps || [],
    currentStep: saved?.currentStep || null,
    finished: saved?.finished || false,
    storage: saved?.storage || 'orgcell', // 기본값: Orgcell 서버
    museumName: saved?.museumName || '',

    startOnboarding: () => {
        const next = { ...get(), started: true, currentStep: 'name' };
        saveState(next);
        set(next);
    },

    completeStep: (stepId) => {
        const { completedSteps } = get();
        if (completedSteps.includes(stepId)) return;
        const next = {
            ...get(),
            completedSteps: [...completedSteps, stepId],
            currentStep: getNextStep(stepId),
        };
        saveState(next);
        set(next);
    },

    setCurrentStep: (stepId) => {
        const next = { ...get(), currentStep: stepId };
        saveState(next);
        set(next);
    },

    setStorage: (storageType) => {
        const next = { ...get(), storage: storageType };
        saveState(next);
        set(next);
    },

    setMuseumName: (name) => {
        const next = { ...get(), museumName: name };
        saveState(next);
        set(next);
    },

    finishOnboarding: () => {
        const next = { ...get(), finished: true, completedSteps: [...STEPS] };
        saveState(next);
        set(next);
    },

    resetOnboarding: () => {
        localStorage.removeItem(STORAGE_KEY);
        set({
            started: false,
            completedSteps: [],
            currentStep: null,
            finished: false,
            storage: 'orgcell',
            museumName: '',
        });
    },

    getResumeUrl: () => {
        const { completedSteps, finished } = get();
        if (finished) return null;
        for (const step of STEPS) {
            if (!completedSteps.includes(step)) {
                return `/onboarding/${step}`;
            }
        }
        return null;
    },
}));

function getNextStep(currentStep) {
    const idx = STEPS.indexOf(currentStep);
    if (idx < 0 || idx >= STEPS.length - 1) return null;
    return STEPS[idx + 1];
}

export { STEPS };
export default useOnboardingStore;
