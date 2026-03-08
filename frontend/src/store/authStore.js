import { create } from 'zustand';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Setup Global Axios Interceptor for Error Handling
axios.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            // Network Error or Server Down
            toast.error('서버와의 연결이 끊어졌습니다. 인터넷 상태를 확인해주세요.', { id: 'network-error' });
        } else if (error.response.status === 401) {
            // Unauthorized - Handled dynamically in fetchMe usually, but global toast helps
            toast.error('세션이 만료되었습니다. 다시 로그인해주세요.', { id: 'auth-error' });
        } else if (error.response.status >= 500) {
            toast.error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        return Promise.reject(error);
    }
);

const useAuthStore = create((set) => ({
    user: null,
    token: localStorage.getItem('orgcell_token') || null,
    isLoading: false,
    error: null,
    registeredFaces: [],

    setAuth: (user, token) => {
        localStorage.setItem('orgcell_token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ user, token, error: null });
    },

    logout: () => {
        localStorage.removeItem('orgcell_token');
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
    },

    devLogin: async (name, email) => {
        if (import.meta.env.PROD) {
            toast.error('프로덕션 환경에서는 Mock 로그인을 지원하지 않습니다.');
            return;
        }
        set({ isLoading: true, error: null });
        try {
            const res = await axios.post('/api/auth/dev-login', { name, email });
            if (res.data?.success && res.data?.token) {
                localStorage.setItem('orgcell_token', res.data.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                set({ user: res.data.user, token: res.data.token });
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
            // Use mock data until API is fully ready or pull from local dev
            const res = await axios.get('/api/face/descriptors').catch(() => ({ data: { data: [] } }));
            set({ registeredFaces: res.data.data || [] });
        } catch (err) {
            console.error('Failed to fetch face references', err);
        }
    },

    fetchMe: async () => {
        const token = localStorage.getItem('orgcell_token');
        if (!token) return;

        set({ isLoading: true });
        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // In development, you might point this to localhost:5001 if backend is separate
            const res = await axios.get('/api/auth/me');
            if (res.data?.data) {
                set({ user: res.data.data });
                // Also check drive status
                useAuthStore.getState().checkDriveStatus();
            } else {
                throw new Error('Invalid user data');
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            // If unauthorized, clear token
            if (err.response?.status === 401) {
                localStorage.removeItem('orgcell_token');
                delete axios.defaults.headers.common['Authorization'];
                set({ user: null, token: null });
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
