/**
 * treeViewStore.js — 가계도 뷰포트 상태 유지 (Zustand + sessionStorage)
 *
 * 용도: 인물 편집/사진 업로드 등 작업 후 돌아왔을 때
 *       화면 위치(pan/zoom)를 그대로 유지
 */
import { create } from 'zustand';

const STORAGE_KEY = 'orgcell_tree_viewport';

function loadFromSession() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveToSession(state) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
}

const useTreeViewStore = create((set, get) => ({
    // 뷰포트 상태
    viewport: loadFromSession(),

    // 뷰포트 저장 (pan/zoom 변경 시)
    setViewport: (scale, positionX, positionY) => {
        const vp = { scale, positionX, positionY, savedAt: Date.now() };
        saveToSession(vp);
        set({ viewport: vp });
    },

    // 뷰포트 초기화 (새로운 mainId 전환 시)
    clearViewport: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        set({ viewport: null });
    },

    // 저장된 뷰포트가 유효한지 (5분 이내)
    hasValidViewport: () => {
        const vp = get().viewport;
        if (!vp) return false;
        return (Date.now() - vp.savedAt) < 5 * 60 * 1000;
    },
}));

export default useTreeViewStore;
