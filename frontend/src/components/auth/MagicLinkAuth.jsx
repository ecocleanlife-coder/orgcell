import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader } from 'lucide-react';

export default function MagicLinkAuth() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setErrorMessage('유효한 이메일을 입력해주세요.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            await axios.post('/api/auth/magic-link/request', { email: email.trim() });
            setStatus('success');
        } catch (err) {
            console.error('Magic link request failed:', err);
            setStatus('error');
            setErrorMessage(err.response?.data?.message || '로그인 링크 전송에 실패했습니다. 다시 시도해주세요.');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="text-emerald-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-emerald-900 mb-2">이메일을 확인해주세요!</h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                    <span className="font-semibold">{email}</span> 주소로<br />
                    보안 로그인 링크를 보내드렸습니다.<br />
                    이 창을 닫고 메일함의 링크를 클릭해주세요.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full mt-6">
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 font-medium">또는 이메일로 로그인</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="이메일 주소 입력"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        disabled={status === 'loading'}
                    />
                </div>
                {errorMessage && (
                    <p className="text-sm text-red-600 dark:text-red-400 text-left pl-1 animate-pulse">
                        {errorMessage}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={status === 'loading' || !email.trim()}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
                >
                    {status === 'loading' ? (
                        <>
                            <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" /> 전송 중...
                        </>
                    ) : (
                        <>
                            보안 링크 받기 <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </button>
            </form>
            <p className="mt-3 text-xs text-center text-gray-500 dark:text-gray-400">
                비밀번호 없이 링크 버튼 하나로 안전하게 로그인하세요.
            </p>
        </div>
    );
}
