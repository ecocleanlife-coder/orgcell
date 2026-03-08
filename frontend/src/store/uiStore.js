import { create } from 'zustand';

const useUiStore = create((set) => ({
    // Mobile Tab Navigation ('gallery', 'people', 'sync', 'settings')
    activeTab: 'gallery',
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Dark Mode (persists to localStorage)
    isDarkMode: localStorage.getItem('darkMode') === 'true' ||
        (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
    toggleDarkMode: () => set((state) => {
        const nextMode = !state.isDarkMode;
        localStorage.setItem('darkMode', nextMode);
        if (nextMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: nextMode };
    }),

    // Upload Progress Modal/Toast Management
    uploadsInProgress: [],
    addUpload: (uploadId, file) => set((state) => ({
        uploadsInProgress: [...state.uploadsInProgress, { id: uploadId, file, status: 'queue', progress: 0 }]
    })),
    updateUploadStatus: (uploadId, status, progress) => set((state) => ({
        uploadsInProgress: state.uploadsInProgress.map(u =>
            u.id === uploadId ? { ...u, status, progress: progress ?? u.progress } : u
        )
    })),
    removeUpload: (uploadId) => set((state) => ({
        uploadsInProgress: state.uploadsInProgress.filter(u => u.id !== uploadId)
    }))
}));

// Provide an initialization hook to run on app start
export const initTheme = () => {
    const isDark = useUiStore.getState().isDarkMode;
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export default useUiStore;
