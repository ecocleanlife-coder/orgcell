import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// httpOnly 쿠키 자동 전송
axios.defaults.withCredentials = true;

// Setup Global Axios Interceptor for Error Handling
axios.interceptors.response.use(
    response => response,
    error => {
        const skip = error.config?._skipAuthToast;
        if (!error.response) {
            toast.error('서버와의 연결이 끊어졌습니다. 인터넷 상태를 확인해주세요.', { id: 'network-error' });
        } else if (error.response.status === 429 && !skip) {
            // 429는 fetchMe 내부에서 자체 처리 — 다른 API만 토스트
            const url = error.config?.url || '';
            if (!url.includes('/auth/me')) {
                toast.error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', { id: 'rate-limit' });
            }
        } else if (error.response.status === 401 && !skip) {
            toast.error('세션이 만료되었습니다. 다시 로그인해주세요.', { id: 'auth-error' });
        } else if (error.response.status >= 500) {
            toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        return Promise.reject(error);
    }
);

let _fetchMePromise = null; // 중복 호출 방지
let _lastFetchMeTime = 0;  // 마지막 성공 시각 (5분 캐시)
const FETCH_ME_CACHE_MS = 5 * 60 * 1000; // 5분

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    registeredFaces: [],

    setAuth: (user) => {
        // 토큰은 httpOnly 쿠키로 관리됨 — localStorage 사용 안 함
        _lastFetchMeTime = Date.now();
        set({ user, isAuthenticated: true, error: null });
    },

    logout: async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch { /* 쿠키 만료된 경우 무시 */ }
        _lastFetchMeTime = 0;
        set({ user: null, isAuthenticated: false });
    },

    devLogin: async (name, email) => {
        if (import.meta.env.PROD) {
            toast.error('프로덕션 환경에서는 Mock 로그인을 지원하지 않습니다.');
            return;
        }
        set({ isLoading: true, error: null });
        try {
            const res = await axios.post('/api/auth/dev-login', { name, email });
            if (res.data?.success) {
                _lastFetchMeTime = Date.now();
                set({ user: res.data.user, isAuthenticated: true });
                toast.success('Mock 로그인 성공');
            }
        } catch (err) {
            console.error('Dev login failed:', err);
            set({ error: err.message });
            toast.error('Mock 로그인 실패: ' + (err.response?.data?.error || err.message));
        } finally {
            set({ isLoading: false });
        }
    },

    fetchRegisteredFaces: async () => {
        try {
            const res = await axios.get('/api/face/descriptors').catch(() => ({ data: { data: [] } }));
            set({ registeredFaces: res.data.data || [] });
        } catch (err) {
            console.error('Failed to fetch face references', err);
        }
    },

    fetchMe: async () => {
        // 5분 이내 성공했으면 서버 호출 스킵
        const { user, isAuthenticated } = useAuthStore.getState();
        if (user && isAuthenticated && (Date.now() - _lastFetchMeTime < FETCH_ME_CACHE_MS)) {
            return;
        }

        // 이미 진행 중이면 기존 Promise 재사용 (중복 호출 방지)
        if (_fetchMePromise) return _fetchMePromise;

        set({ isLoading: true });
        _fetchMePromise = (async () => {
            try {
                const res = await Promise.race([
                    axios.get('/api/auth/me', { headers: {}, _skipAuthToast: true }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth check timeout')), 5000)
                    ),
                ]);
                if (res.data?.data) {
                    _lastFetchMeTime = Date.now();
                    set({ user: res.data.data, isAuthenticated: true });
                    useAuthStore.getState().checkDriveStatus();
                } else {
                    throw new Error('Invalid user data');
                }
            } catch (err) {
                // 429: 사용자 알림 + 5초 후 1회 재시도
                if (err.response?.status === 429) {
                    toast.error('요청이 너무 많습니다. 잠시 후 다시 시도합니다...', { id: 'rate-limit' });
                    await new Promise(r => setTimeout(r, 5000));
                    try {
                        const retry = await axios.get('/api/auth/me', { headers: {}, _skipAuthToast: true });
                        if (retry.data?.data) {
                            _lastFetchMeTime = Date.now();
                            set({ user: retry.data.data, isAuthenticated: true });
                            useAuthStore.getState().checkDriveStatus();
                            toast.dismiss('rate-limit');
                            return;
                        }
                    } catch {
                        toast.error('잠시 후 다시 시도해주세요.', { id: 'rate-limit' });
                    }
                }
                if (err.response?.status === 401 || err.message === 'Auth check timeout') {
                    set({ user: null, isAuthenticated: false });
                }
                set({ error: err.message });
            } finally {
                set({ isLoading: false });
                _fetchMePromise = null;
            }
        })();
        return _fetchMePromise;
    },

    driveConnected: false,

    checkDriveStatus: async () => {
        try {
            const res = await axios.get('/api/drive/status');
            if (res.data?.success) {
                set({ driveConnected: res.data.connected });
            }
        } catch (err) {
            console.error('Check drive status failed', err);
        }
    },

    disconnectDrive: async () => {
        try {
            const res = await axios.post('/api/drive/disconnect');
            if (res.data?.success) {
                set({ driveConnected: false });
                toast.success('Google Drive 연결이 해제되었습니다.');
            }
        } catch (err) {
            console.error('Disconnect drive failed', err);
            toast.error('연결 해제에 실패했습니다.');
        }
    }
}));

export default useAuthStore;
