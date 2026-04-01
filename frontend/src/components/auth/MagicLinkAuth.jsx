import React, { useState } from 'react';
import axios from 'axios';
import { Mail, ArrowRight, Loader, UserCheck, UserPlus } from 'lucide-react';

export default function MagicLinkAuth() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error, exists
    const [errorMessage, setErrorMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [maskedEmail, setMaskedEmail] = useState('');

    const sendMagicLink = async (targetEmail) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            const { data } = await axios.post('/api/auth/magic-link/request', { email: targetEmail.trim() });

            if (data.exists) {
                setMaskedEmail(data.maskedEmail || targetEmail);
                setStatus('exists');
            } else {
                setStatus('success');
            }
        } catch (err) {
            setStatus('error');
            const serverMsg = err.response?.data?.message;
            const is429 = err.response?.status === 429;
            setErrorMessage(
                serverMsg || (is429
                    ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
                    : '이메일 발송에 실패했습니다. 스팸함을 확인하시거나 잠시 후 다시 시도해주세요.')
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setErrorMessage('유효한 이메일을 입력해주세요.');
            return;
        }
        await sendMagicLink(email);
    };

    const handleExistsLogin = async () => {
        setStatus('loading');
        try {
            await axios.post('/api/auth/magic-link/request', { email: email.trim() });
            setStatus('success');
        } catch (err) {
            setStatus('error');
            const serverMsg = err.response?.data?.message;
            const is429 = err.response?.status === 429;
            setErrorMessage(
                serverMsg || (is429
                    ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
                    : '이메일 발송에 실패했습니다. 스팸함을 확인하시거나 잠시 후 다시 시도해주세요.')
            );
        }
    };

    const handleExistsOther = () => {
        setEmail('');
        setMaskedEmail('');
        setStatus('idle');
        setErrorMessage('');
    };

    // 이미 가입된 이메일 안내
    if (status === 'exists') {
        return (
            <div className="w-full mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="text-amber-600" size={24} />
                </div>
                <h3 className="text-[16px] font-bold text-amber-900 mb-2">이미 가입된 이메일입니다</h3>
                <p className="text-[14px] text-amber-700 mb-5">
                    <span className="font-semibold">{maskedEmail}</span> 으로 이미 가입되어 있습니다.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleExistsLogin}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-[14px] font-bold text-white bg-amber-600 hover:bg-amber-700 transition-all"
                    >
                        <Mail className="mr-2 h-4 w-4" /> 기존 이메일로 로그인하기
                    </button>
                    <button
                        onClick={handleExistsOther}
                        className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-[14px] font-bold text-amber-700 bg-white border border-amber-300 hover:bg-amber-50 transition-all"
                    >
                        <UserPlus className="mr-2 h-4 w-4" /> 다른 이메일로 시작하기
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="w-full mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="text-emerald-600" size={24} />
                </div>
                <h3 className="text-[16px] font-bold text-emerald-900 mb-2">이메일을 보냈습니다!</h3>
                <p className="text-[14px] text-emerald-700 leading-relaxed mb-3">
                    <span className="font-semibold">{email}</span> 주소로<br />
                    보안 로그인 링크를 보내드렸습니다.
                </p>
                <p className="text-[12px] text-emerald-600 mb-3">
                    <span className="font-semibold">noreply@orgcell.com</span> 에서 발송됩니다.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                    <p className="text-[13px] text-amber-800 leading-relaxed">
                        <span className="font-bold">이메일이 안 보이시면:</span><br />
                        스팸/정크 메일함을 확인해주세요.<br />
                        받은편지함으로 이동하시면 다음부터 정상 수신됩니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mt-6">
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-[14px]">
                    <span className="px-3 bg-white text-gray-500 font-medium">또는</span>
                </div>
            </div>

            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-[14px] font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7C5CFC] transition-all cursor-pointer"
                >
                    <Mail className="mr-2 h-5 w-5 text-gray-500" /> 이메일로 시작하기
                </button>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일 주소 입력"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7C5CFC] focus:border-[#7C5CFC] text-[15px] transition-colors"
                            disabled={status === 'loading'}
                            autoFocus
                        />
                    </div>
                    {errorMessage && (
                        <p className="text-[14px] text-red-600 text-left pl-1 animate-pulse">
                            {errorMessage}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={status === 'loading' || !email.trim()}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-bold text-white disabled:opacity-50 transition-all cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #7C5CFC, #6A4AE0)' }}
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" /> 전송 중...
                            </>
                        ) : (
                            <>
                                로그인 링크 받기 <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </button>
                    <p className="mt-3 text-[13px] text-center text-gray-500">
                        비밀번호 없이 링크 하나로 안전하게 로그인합니다.
                    </p>
                </form>
            )}
        </div>
    );
}
