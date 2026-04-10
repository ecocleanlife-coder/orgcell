/**
 * store/authStore.js — §16 인증/입장권 상태 관리
 *
 * - user: GET /api/auth/me (httpOnly cookie 기반)
 * - curatorSites: GET /api/museum/mine → Set<subdomain>
 * - museumAccess: GET /api/access/:siteId/:personId/check 결과 캐시
 * - lang: 헤더 언어 선택 (§31, localStorage 지속)
 */

import { create } from 'zustand';

// ─── 상수 ────────────────────────────────────────────────────────────────────
const ME_CACHE_MS = 5 * 60 * 1000; // 5분

// ─── 내부 유틸 ───────────────────────────────────────────────────────────────
let _meFetchPromise = null;
let _meLastFetched  = 0;

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { credentials: 'include', ...opts });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ─── 스토어 ──────────────────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  // ── 사용자 상태 ─────────────────────────────────────────────────────────
  user:            null,
  isAuthenticated: false,
  isLoading:       false,

  // ── 언어 (§31 헤더) ──────────────────────────────────────────────────────
  lang: localStorage.getItem('orgcell_lang') || 'ko',
  setLang(lang) {
    localStorage.setItem('orgcell_lang', lang);
    set({ lang });
  },

  // ── 관장 박물관 목록 ─────────────────────────────────────────────────────
  curatorSites: new Set(), // Set<subdomain>

  // ── 입장권 캐시 ─────────────────────────────────────────────────────────
  // key: `${subdomain}:${siteId}:${personId}` → boolean
  museumAccessCache: {},

  // ─────────────────────────────────────────────────────────────────────────
  // fetchMe — GET /api/auth/me
  //   • 5분 캐시 + 중복 요청 방지 (같은 promise 재사용)
  //   • 401 → 비로그인 처리 (에러 throw 안 함)
  // ─────────────────────────────────────────────────────────────────────────
  async fetchMe() {
    const now = Date.now();
    if (get().isAuthenticated && now - _meLastFetched < ME_CACHE_MS) return;

    if (_meFetchPromise) return _meFetchPromise;

    set({ isLoading: true });
    _meFetchPromise = apiFetch('/api/auth/me')
      .then(async (data) => {
        _meLastFetched = Date.now();
        set({ user: data.data, isAuthenticated: true, isLoading: false });
        // 로그인 상태면 관장 목록도 로드
        await get().fetchMyCuration();
      })
      .catch((err) => {
        if (err.status === 401) {
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          // 네트워크 오류 등 — 상태 유지
          set({ isLoading: false });
        }
      })
      .finally(() => { _meFetchPromise = null; });

    return _meFetchPromise;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // logout — POST /api/auth/logout
  // ─────────────────────────────────────────────────────────────────────────
  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {
      // 서버 오류여도 클라이언트 상태는 초기화
    }
    _meLastFetched = 0;
    set({
      user:            null,
      isAuthenticated: false,
      curatorSites:    new Set(),
      museumAccessCache: {},
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // fetchMyCuration — GET /api/museum/mine
  //   응답: [ { subdomain, ... }, ... ]
  // ─────────────────────────────────────────────────────────────────────────
  async fetchMyCuration() {
    try {
      const data = await apiFetch('/api/museum/mine');
      // 응답 shape: { success, data: rows } 또는 배열
      const sites = Array.isArray(data) ? data : (data.data ?? data.museums ?? []);
      set({ curatorSites: new Set(sites.map((m) => m.subdomain?.toLowerCase() || '')) });
    } catch (_) {
      // 비관장 유저는 403/404 → 무시
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // isCuratorOf — 해당 subdomain의 관장인지 확인
  // ─────────────────────────────────────────────────────────────────────────
  isCuratorOf(subdomain) {
    return get().curatorSites.has(subdomain);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // checkMuseumAccess — GET /api/access/:siteId/:personId/check (§16)
  //   결과를 캐시하여 중복 요청 방지
  //   반환: boolean (입장 가능 여부)
  // ─────────────────────────────────────────────────────────────────────────
  async checkMuseumAccess(subdomain, siteId, personId) {
    const key = `${subdomain}:${siteId}:${personId}`;
    const cache = get().museumAccessCache;
    if (key in cache) return cache[key];

    try {
      const data = await apiFetch(`/api/access/${siteId}/${personId}/check`);
      const allowed = !!data.allowed;
      set({ museumAccessCache: { ...cache, [key]: allowed } });
      return allowed;
    } catch (_) {
      return false;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // hasPassFor — 캐시된 입장권 여부 (동기)
  // ─────────────────────────────────────────────────────────────────────────
  hasPassFor(subdomain, siteId, personId) {
    const key = `${subdomain}:${siteId}:${personId}`;
    return get().museumAccessCache[key] === true;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // requestAccess — POST /api/access/:siteId/:personId/request (§16)
  // ─────────────────────────────────────────────────────────────────────────
  async requestAccess(siteId, personId, message = '') {
    const data = await apiFetch(`/api/access/${siteId}/${personId}/request`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message }),
    });
    return data;
  },
}));
