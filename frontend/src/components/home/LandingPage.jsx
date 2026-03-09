import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useUiStore from '../../store/uiStore';
import LoginButton from '../auth/LoginButton';
import MagicLinkAuth from '../auth/MagicLinkAuth';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { Sparkles, Globe, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getT } from '../../i18n/translations';

function LandingPage() {
    const devLogin = useAuthStore(state => state.devLogin);
    const isLoading = useAuthStore(state => state.isLoading);
    const lang = useUiStore(state => state.lang);
    const [name, setName] = useState('Test User');
    const [email, setEmail] = useState('test@orgcell.com');
    const navigate = useNavigate();

    const t = getT('landing', lang);

    const handleDevLogin = () => {
        devLogin(name, email);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
            {/* Language Selector */}
            <div className="fixed top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

            {/* Hero Section */}
            <div className="max-w-4xl w-full text-center space-y-6 mb-16">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    Orgcell
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto italic">
                    {t.subtitle}
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mb-16">
                <button onClick={() => navigate('/smart-sort')} className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800 text-center hover:shadow-md transition-shadow cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Sparkles size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t.card1Title}</h3>
                    <p className="text-gray-700 dark:text-gray-300">{t.card1Desc}</p>
                </button>

                <button onClick={() => navigate('/family-website')} className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800 text-center hover:shadow-md transition-shadow cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Globe size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t.card2Title}</h3>
                    <p className="text-gray-700 dark:text-gray-300">{t.card2Desc}</p>
                </button>

                <button onClick={() => navigate('/live-sharing')} className="bg-purple-50 dark:bg-purple-900/20 p-8 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-800 text-center hover:shadow-md transition-shadow cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <div className="w-16 h-16 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Users size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t.card3Title}</h3>
                    <p className="text-gray-700 dark:text-gray-300">{t.card3Desc}</p>
                </button>
            </div>

            {/* Login Section */}
            <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.getStarted}</h2>

                <div className="mb-6">
                    <LoginButton />
                    <MagicLinkAuth />
                </div>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">{t.or}</span>
                    </div>
                </div>

                {/* Developer Mock Login */}
                <div className="space-y-4 pt-2">
                    <p className="text-xs font-bold text-gray-400 text-left uppercase tracking-wider">{t.devLogin}</p>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all"
                        placeholder={t.nameLabel}
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white transition-all"
                        placeholder={t.emailLabel}
                    />
                    <button
                        onClick={handleDevLogin}
                        disabled={isLoading}
                        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? t.loggingIn : t.loginBtn}
                    </button>
                </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400 pb-8">
                <p>{t.footer1}</p>
                <p className="mt-1">{t.footer2}</p>
            </div>
        </div>
    );
}

export default LandingPage;
