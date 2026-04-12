import { create } from 'zustand';

// API 호출 헬퍼
async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json.message || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return json;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  curatorSites: [], // 사용자가 관장인 박물관(subdomain) 목록
  lang: localStorage.getItem('orgcell_lang') || 'ko',

  setLang: (l) => {
    localStorage.setItem('orgcell_lang', l);
    set({ lang: l });
  },

  // 내 정보 가져오기 및 권한 갱신
  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.success) {
        set({ user: res.data, isAuthenticated: true });
        // ★ 로그인 성공 시 관장 중인 사이트 목록을 항상 새로고침합니다.
        await get().fetchMyCuration();
      } else {
        set({ user: null, isAuthenticated: false, curatorSites: [] });
      }
    } catch (err) {
      set({ user: null, isAuthenticated: false, curatorSites: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  // 내가 관장인 박물관 목록 조회
  fetchMyCuration: async () => {
    try {
      const res = await apiFetch('/api/museum/mine');
      // 응답 데이터 구조에 따라 유연하게 처리
      const sites = res.data || res.sites || (Array.isArray(res) ? res : []);
      const subdomains = sites.map(s => s.subdomain);
      set({ curatorSites: subdomains });
    } catch (err) {
      console.error('fetchMyCuration error:', err);
      set({ curatorSites: [] });
    }
  },

  // 관장 권한 여부 확인 (대소문자 무시)
  isCuratorOf: (subdomain) => {
    if (!subdomain) return false;
    const { curatorSites, isAuthenticated } = get();
    if (!isAuthenticated) return false;
    // 입력값과 목록 모두 소문자로 변환하여 비교
    return curatorSites.some(s => s?.toLowerCase() === subdomain.toLowerCase());
  },

  login: async (credential) => {
    const res = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    if (res.success) {
      set({ user: res.user, isAuthenticated: true, curatorSites: res.user.curatorSites || [] });
    }
    return res;
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    set({ user: null, isAuthenticated: false, curatorSites: [] });
  },
}));