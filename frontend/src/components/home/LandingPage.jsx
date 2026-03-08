import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import LoginButton from '../auth/LoginButton';
import { Camera, ShieldCheck, Users } from 'lucide-react';

function LandingPage() {
    const devLogin = useAuthStore(state => state.devLogin);
    const isLoading = useAuthStore(state => state.isLoading);
    const [name, setName] = useState('Test User');
    const [email, setEmail] = useState('test@orgcell.com');

    const handleDevLogin = () => {
        devLogin(name, email);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
            {/* Hero Section */}
            <div className="max-w-4xl w-full text-center space-y-6 mb-16">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    Memoir Lens
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    가족의 역사를 AI가 자동으로 정리합니다. 가장 안전한 사진 보관 및 공유 플랫폼.
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mb-16">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Camera size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI 스마트 분류</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        디바이스 내장 AI가 인물별로 사진을 자동 정리하여 앨범을 만들어 줍니다.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">종단간(E2E) 암호화</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        업로드 되는 모든 사진은 브라우저에서 암호화되며 서버 관리자도 절대 열어볼 수 없습니다.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">실시간 P2P 공유</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        QR코드 스캔 한 번으로 지인들과 임시 방을 열고 사진을 안전하게 주고 받으세요.
                    </p>
                </div>
            </div>

            {/* Login Section */}
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">지금 바로 시작하세요</h2>

                <div className="mb-6">
                    <LoginButton />
                </div>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">또는</span>
                    </div>
                </div>

                {/* Developer Mock Login */}
                <div className="space-y-4 pt-2">
                    <p className="text-xs font-bold text-gray-400 text-left uppercase tracking-wider">개발자 테스트 로그인</p>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all"
                        placeholder="이름"
                        aria-label="테스트 계정 이름 입력"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all"
                        placeholder="이메일"
                        aria-label="테스트 계정 이메일 입력"
                    />
                    <button
                        onClick={handleDevLogin}
                        disabled={isLoading}
                        aria-label={isLoading ? '로그인 처리 중입니다' : '테스트 계정으로 로그인 버튼'}
                        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? '로그인 중...' : '테스트 계정으로 로그인'}
                    </button>
                </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400 pb-8">
                <p>🔒 고객보호를 위해 본 앱에는 사진 원본을 볼 수 있는 권한이 서버에 존재하지 않습니다.</p>
                <p className="mt-1">© 2026 Memoir Lens. All rights reserved.</p>
            </div>
        </div>
    );
}

export default LandingPage;
