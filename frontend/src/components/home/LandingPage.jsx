import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import LoginButton from '../auth/LoginButton';
import { Sparkles, Globe, Users, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const translations = {
    en: {
        subtitle: 'Family can be together forever',
        card1Title: 'AI Smart Sort',
        card1Desc: 'Remove duplicate photos from your phone or computer and reorganize them in chronological order.',
        card2Title: '$10 Family Website',
        card2Desc: 'Create a digital family museum that your family can access anytime for just $10.',
        card3Title: 'Live Photo Sharing',
        card3Desc: 'Easily share photos taken together with family and friends.',
        getStarted: 'Get Started Now',
        or: 'or',
        devLogin: 'Developer Test Login',
        nameLabel: 'Name',
        emailLabel: 'Email',
        loginBtn: 'Log in with test account',
        loggingIn: 'Logging in...',
        footer1: 'For your protection, this app does not store original photos on our servers.',
        footer2: '© 2026 Orgcell. All rights reserved.',
    },
    es: {
        subtitle: 'La familia puede estar junta para siempre',
        card1Title: 'Clasificación Inteligente IA',
        card1Desc: 'Elimine fotos duplicadas de su teléfono o computadora y reorganícelas en orden cronológico.',
        card2Title: 'Sitio Web Familiar $10',
        card2Desc: 'Cree un museo familiar digital al que su familia pueda acceder en cualquier momento por solo $10.',
        card3Title: 'Compartir Fotos en Vivo',
        card3Desc: 'Comparta fácilmente las fotos tomadas junto con familiares y amigos.',
        getStarted: 'Comience Ahora',
        or: 'o',
        devLogin: 'Inicio de sesión de prueba',
        nameLabel: 'Nombre',
        emailLabel: 'Correo electrónico',
        loginBtn: 'Iniciar sesión con cuenta de prueba',
        loggingIn: 'Iniciando sesión...',
        footer1: 'Para su protección, esta aplicación no almacena fotos originales en nuestros servidores.',
        footer2: '© 2026 Orgcell. Todos los derechos reservados.',
    },
    ko: {
        subtitle: '가족은 영원히 함께할 수 있습니다',
        card1Title: 'AI 스마트 분류',
        card1Desc: '전화기나 컴퓨터의 중복된 사진을 제거하고 시간의 흐름순으로 다시 정리해 드립니다.',
        card2Title: '$10로 가족(개인) 웹사이트',
        card2Desc: '$10로 개인이나 가족들이 언제든 접속할 수 있는 디지털 가족 박물관을 만들어 드립니다.',
        card3Title: '실시간 사진공유',
        card3Desc: '가족이나 지인들과 함께 찍은 사진들을 쉽게 공유하세요.',
        getStarted: '지금 바로 시작하세요',
        or: '또는',
        devLogin: '개발자 테스트 로그인',
        nameLabel: '이름',
        emailLabel: '이메일',
        loginBtn: '테스트 계정으로 로그인',
        loggingIn: '로그인 중...',
        footer1: '고객보호를 위해 본 앱에는 사진 원본을 볼 수 있는 권한이 서버에 존재하지 않습니다.',
        footer2: '© 2026 Orgcell. All rights reserved.',
    },
    hi: {
        subtitle: 'परिवार हमेशा साथ रह सकता है',
        card1Title: 'AI स्मार्ट सॉर्ट',
        card1Desc: 'अपने फ़ोन या कंप्यूटर से डुप्लिकेट फ़ोटो हटाएं और उन्हें समय के अनुसार पुनर्व्यवस्थित करें।',
        card2Title: '$10 में पारिवारिक वेबसाइट',
        card2Desc: 'केवल $10 में एक डिजिटल पारिवारिक संग्रहालय बनाएं जिसे आपका परिवार कभी भी देख सकता है।',
        card3Title: 'लाइव फ़ोटो शेयरिंग',
        card3Desc: 'परिवार और दोस्तों के साथ ली गई फ़ोटो आसानी से साझा करें।',
        getStarted: 'अभी शुरू करें',
        or: 'या',
        devLogin: 'डेवलपर टेस्ट लॉगिन',
        nameLabel: 'नाम',
        emailLabel: 'ईमेल',
        loginBtn: 'टेस्ट अकाउंट से लॉगिन',
        loggingIn: 'लॉगिन हो रहा है...',
        footer1: 'आपकी सुरक्षा के लिए, यह ऐप हमारे सर्वर पर मूल फ़ोटो संग्रहीत नहीं करता है।',
        footer2: '© 2026 Orgcell. सर्वाधिकार सुरक्षित।',
    },
};

const langLabels = { en: 'English', es: 'Español', ko: '한국어', hi: 'हिन्दी' };

function LandingPage() {
    const devLogin = useAuthStore(state => state.devLogin);
    const isLoading = useAuthStore(state => state.isLoading);
    const [name, setName] = useState('Test User');
    const [email, setEmail] = useState('test@orgcell.com');
    const [lang, setLang] = useState('en');
    const [langOpen, setLangOpen] = useState(false);
    const navigate = useNavigate();

    const t = translations[lang];

    const handleDevLogin = () => {
        devLogin(name, email);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
            {/* Language Selector */}
            <div className="fixed top-4 right-4 z-50">
                <div className="relative">
                    <button
                        onClick={() => setLangOpen(!langOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                        <Globe size={16} />
                        {langLabels[lang]}
                        <ChevronDown size={14} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                            {Object.entries(langLabels).map(([code, label]) => (
                                <button
                                    key={code}
                                    onClick={() => { setLang(code); setLangOpen(false); }}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${lang === code ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
