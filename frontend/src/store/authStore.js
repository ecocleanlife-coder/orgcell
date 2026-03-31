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
        } else if (error.response.status === 401 && !skip) {
            toast.error('세션이 만료되었습니다. 다시 로그인해주세요.', { id: 'auth-error' });
        } else if (error.response.status >= 500) {
            toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        return Promise.reject(error);
    }
);

const useAuthStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    registeredFaces: [],

    setAuth: (user) => {
        // 토큰은 httpOnly 쿠키로 관리됨 — localStorage 사용 안 함
        set({ user, isAuthenticated: true, error: null });
    },

    logout: async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch { /* 쿠키 만료된 경우 무시 */ }
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
        set({ isLoading: true });
        try {
            const res = await Promise.race([
                axios.get('/api/auth/me'),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth check timeout')), 5000)
                ),
            ]);
            if (res.data?.data) {
                set({ user: res.data.data, isAuthenticated: true });
                useAuthStore.getState().checkDriveStatus();
            } else {
                throw new Error('Invalid user data');
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            if (err.response?.status === 401 || err.message === 'Auth check timeout') {
                set({ user: null, isAuthenticated: false });
            }
            set({ error: err.message });
        } finally {
            set({ isLoading: false });
        }
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
