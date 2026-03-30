import React from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

// IMPORTANT: This ID should typically come from env variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function LoginButton() {
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSuccess = async (credentialResponse) => {
        try {
            const res = await axios.post('/api/auth/google', {
                credential: credentialResponse.credential,
            });

            if (res.data?.success && res.data?.user) {
                setAuth(res.data.user);
            }
        } catch (err) {
            console.error('Google login failed on backend:', err);
            const status = err.response?.status;
            const msg = err.response?.data?.message;
            if (status === 500) {
                alert(`Google 로그인 처리 중 오류가 발생했습니다.\n(${msg || '서버 오류'})\n\n잠시 후 다시 시도해주세요.`);
            } else if (!err.response) {
                alert('서버에 연결할 수 없습니다.\n네트워크 연결을 확인해주세요.');
            } else {
                alert(`로그인에 실패했습니다. (${status}: ${msg || '알 수 없는 오류'})`);
            }
        }
    };

    const handleError = () => {
        console.error('Google Auth Failed');
        alert('Google 로그인 팝업이 차단되었거나 오류가 발생했습니다.\n\n팝업 차단을 해제하거나, 이메일 로그인을 이용해주세요.');
    };

    if (!GOOGLE_CLIENT_ID) {
        return (
            <div className="flex justify-center mt-6">
                <div className="px-6 py-2 bg-gray-100 text-gray-500 rounded-full text-sm font-medium border border-gray-200">
                    Google OAuth 설정 대기중
                </div>
            </div>
        );
    }

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
