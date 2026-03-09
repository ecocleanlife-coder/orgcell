import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function MagicLinkVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const setAuth = useAuthStore(state => state.setAuth);
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [errorMsg, setErrorMsg] = useState('');
    const verificationAttempted = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMsg('유효하지 않은 링크입니다 (토큰 누락).');
            return;
        }

        // Prevent React strict mode double-firing
        if (verificationAttempted.current) return;
        verificationAttempted.current = true;

        const verifyToken = async () => {
            try {
                const res = await axios.post('/api/auth/magic-link/verify', { token });
                if (res.data?.success && res.data?.token) {
                    // Log the user in
                    setAuth(res.data.user, res.data.token);
                    setStatus('success');

                    // Allow UI to show success state briefly before redirecting
                    setTimeout(() => {
                        navigate('/dashboard', { replace: true });
                    }, 1500);
                } else {
                    throw new Error('Verification failed');
                }
            } catch (err) {
                console.error('Magic link verification error:', err);
                setStatus('error');
                setErrorMsg(err.response?.data?.message || '로그인 링크가 만료되었거나 올바르지 않습니다.');
            }
        };

        verifyToken();
    }, [token, navigate, setAuth]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <div className="mb-6 flex justify-center">
                    <img src="/nci_vertical_logo.png" alt="NCI Logo" className="h-12 object-contain" onError={(e) => e.target.style.display = 'none'} />
                </div>

                {status === 'verifying' && (
                    <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">보안 로그인 확인 중...</h2>
                        <p className="text-gray-500 dark:text-gray-400">잠시만 기다려주세요.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center space-y-4 animate-fade-in-up">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">로그인 성공!</h2>
                        <p className="text-gray-500 dark:text-gray-400">잠시 후 대시보드로 이동합니다...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center space-y-4 animate-fade-in-up">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">로그인 실패</h2>
                        <p className="text-red-500 dark:text-red-400">{errorMsg}</p>
                        <button
                            onClick={() => navigate('/', { replace: true })}
                            className="mt-4 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                        >
                            홈으로 돌아가기
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
