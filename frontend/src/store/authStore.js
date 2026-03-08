import { create } from 'zustand';
import axios from 'axios';

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
        set({ isLoading: true, error: null });
        try {
            const res = await axios.post('/api/auth/dev-login', { name, email });
            if (res.data?.success && res.data?.token) {
                localStorage.setItem('orgcell_token', res.data.token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
                set({ user: res.data.user, token: res.data.token });
            }
        } catch (err) {
            console.error('Dev login failed:', err);
            set({ error: err.message });
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
    }
}));

export default useAuthStore;
