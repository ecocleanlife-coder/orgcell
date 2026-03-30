import { create } from 'zustand';

const STORAGE_KEY = 'orgcell_onboarding';

const STEPS = ['start', 'service', 'storage', 'photos', 'face', 'family', 'privacy', 'invite'];

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
    // 온보딩 시작 여부
    started: saved?.started || false,
    // 완료된 단계들
    completedSteps: saved?.completedSteps || [],
    // 현재 단계
    currentStep: saved?.currentStep || null,
    // 온보딩 완료 여부
    finished: saved?.finished || false,
    // 선택한 저장소
    storage: saved?.storage || null,

    // 단계 시작
    startOnboarding: () => {
        const next = { ...get(), started: true, currentStep: 'start' };
        saveState(next);
        set(next);
    },

    // 단계 완료 표시
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

    // 현재 단계 업데이트
    setCurrentStep: (stepId) => {
        const next = { ...get(), currentStep: stepId };
        saveState(next);
        set(next);
    },

    // 저장소 선택
    setStorage: (storageType) => {
        const next = { ...get(), storage: storageType };
        saveState(next);
        set(next);
    },

    // 온보딩 완료
    finishOnboarding: () => {
        const next = { ...get(), finished: true, completedSteps: [...STEPS] };
        saveState(next);
        set(next);
    },

    // 온보딩 리셋
    resetOnboarding: () => {
        localStorage.removeItem(STORAGE_KEY);
        set({
            started: false,
            completedSteps: [],
            currentStep: null,
            finished: false,
            storage: null,
        });
    },

    // 다음 미완료 단계 경로 반환
    getResumeUrl: () => {
        const { completedSteps, storage, finished } = get();
        if (finished) return null;
        for (const step of STEPS) {
            if (!completedSteps.includes(step)) {
                const base = `/onboarding/${step}`;
                if (storage && step !== 'service' && step !== 'storage') {
                    return `${base}?storage=${storage}`;
                }
                return base;
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
