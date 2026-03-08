import React from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

// IMPORTANT: This ID should typically come from env variables
// For MVP placeholder, we leave it configurable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

export default function LoginButton() {
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSuccess = async (credentialResponse) => {
        try {
            // Send token to our backend
            const res = await axios.post('/api/auth/google', {
                credential: credentialResponse.credential,
            });

            if (res.data?.success && res.data?.token) {
                setAuth(res.data.user, res.data.token);
            }
        } catch (err) {
            console.error('Google login failed on backend:', err);
            alert('로그인에 실패했습니다. 백엔드 연결을 확인해주세요.');
        }
    };

    const handleError = () => {
        console.error('Google Auth Failed');
        alert('구글 로그인 팝업 처리에 실패했습니다.');
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="flex justify-center mt-6">
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    useOneTap
                    theme="filled_blue"
                    shape="pill"
                    text="continue_with"
                />
            </div>
        </GoogleOAuthProvider>
    );
}
