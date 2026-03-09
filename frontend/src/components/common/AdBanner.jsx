import React, { useState } from 'react';
import { Code2, Send, Loader, CheckCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';
import useUiStore from '../../store/uiStore';

const texts = {
    en: {
        badge: 'Custom Development',
        title: 'We Build Your Dream App for $100',
        subtitle: 'Tell us what you need — we\'ll make it real.',
        cta: 'Get Started',
        formTitle: 'Describe Your App Idea',
        descLabel: 'What do you want to build?',
        descPlaceholder: 'Describe the app or website you want. What should it do? Who will use it?',
        similarLabel: 'Similar apps or websites (optional)',
        similarPlaceholder: 'e.g. "Like Airbnb but for pet sitting" or paste URLs',
        emailLabel: 'Your email',
        emailPlaceholder: 'you@example.com',
        priceNote: 'Base price starts at $100. Final pricing will be provided after reviewing your requirements.',
        submit: 'Submit Request',
        submitting: 'Submitting...',
        successTitle: 'Request Received!',
        successMsg: 'We\'ll review your idea and send you a detailed quote within 24 hours.',
        cancel: 'Cancel',
        close: 'Close',
        error: 'Something went wrong. Please try again.',
    },
    es: {
        badge: 'Desarrollo Personalizado',
        title: 'Creamos Tu App por $100',
        subtitle: 'Dinos qué necesitas — lo hacemos realidad.',
        cta: 'Comenzar',
        formTitle: 'Describe Tu Idea de App',
        descLabel: '¿Qué quieres crear?',
        descPlaceholder: 'Describe la app o sitio web que deseas. ¿Qué debe hacer? ¿Quién la usará?',
        similarLabel: 'Apps o sitios similares (opcional)',
        similarPlaceholder: 'ej. "Como Airbnb pero para cuidado de mascotas" o pega URLs',
        emailLabel: 'Tu correo electrónico',
        emailPlaceholder: 'tu@ejemplo.com',
        priceNote: 'El precio base es $100. El precio final se proporcionará después de revisar tus requisitos.',
        submit: 'Enviar Solicitud',
        submitting: 'Enviando...',
        successTitle: '¡Solicitud Recibida!',
        successMsg: 'Revisaremos tu idea y te enviaremos una cotización detallada en 24 horas.',
        cancel: 'Cancelar',
        close: 'Cerrar',
        error: 'Algo salió mal. Inténtalo de nuevo.',
    },
    ko: {
        badge: '맞춤 개발',
        title: '$100로 원하는 앱을 만들어 드립니다',
        subtitle: '어떤 앱이 필요한지 알려주세요 — 현실로 만들어 드립니다.',
        cta: '시작하기',
        formTitle: '원하시는 앱을 설명해주세요',
        descLabel: '어떤 앱/웹사이트를 만들고 싶으신가요?',
        descPlaceholder: '만들고 싶은 앱이나 웹사이트를 설명해주세요. 어떤 기능이 필요한가요? 누가 사용하나요?',
        similarLabel: '유사한 앱이나 웹사이트 (선택사항)',
        similarPlaceholder: '예: "에어비앤비 같은 펫시팅 앱" 또는 URL을 붙여넣기',
        emailLabel: '이메일 주소',
        emailPlaceholder: 'you@example.com',
        priceNote: '기본 가격은 $100입니다. 요구사항 검토 후 최종 가격을 안내드립니다.',
        submit: '요청 제출',
        submitting: '제출 중...',
        successTitle: '접수 완료!',
        successMsg: '아이디어를 검토한 후 24시간 이내에 상세 견적을 보내드리겠습니다.',
        cancel: '취소',
        close: '닫기',
        error: '오류가 발생했습니다. 다시 시도해주세요.',
    },
    hi: {
        badge: 'कस्टम डेवलपमेंट',
        title: '$100 में अपना सपनों का ऐप बनवाएं',
        subtitle: 'बताएं आपको क्या चाहिए — हम इसे वास्तविकता बनाएंगे।',
        cta: 'शुरू करें',
        formTitle: 'अपने ऐप आइडिया का वर्णन करें',
        descLabel: 'आप क्या बनाना चाहते हैं?',
        descPlaceholder: 'जो ऐप या वेबसाइट आप चाहते हैं उसका वर्णन करें। यह क्या करेगा? कौन इसका उपयोग करेगा?',
        similarLabel: 'समान ऐप या वेबसाइट (वैकल्पिक)',
        similarPlaceholder: 'जैसे "Airbnb जैसा लेकिन पालतू जानवरों की देखभाल के लिए" या URL पेस्ट करें',
        emailLabel: 'आपका ईमेल',
        emailPlaceholder: 'you@example.com',
        priceNote: 'आधार मूल्य $100 से शुरू होता है। आपकी आवश्यकताओं की समीक्षा के बाद अंतिम मूल्य प्रदान किया जाएगा।',
        submit: 'अनुरोध सबमिट करें',
        submitting: 'सबमिट हो रहा है...',
        successTitle: 'अनुरोध प्राप्त!',
        successMsg: 'हम आपके आइडिया की समीक्षा करेंगे और 24 घंटे में विस्तृत कोटेशन भेजेंगे।',
        cancel: 'रद्द करें',
        close: 'बंद करें',
        error: 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
    },
};

export default function AdBanner({ className = '' }) {
    const lang = useUiStore((s) => s.lang) || 'en';
    const t = texts[lang] || texts.en;

    const [showForm, setShowForm] = useState(false);
    const [description, setDescription] = useState('');
    const [similarApps, setSimilarApps] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await axios.post('/api/inquiry', {
                email: email.trim(),
                description: description.trim(),
                similarApps: similarApps.trim(),
            });
            if (res.data?.success) {
                setStatus('success');
            } else {
                throw new Error(res.data?.message || 'Failed');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.response?.data?.message || t.error);
        }
    };

    // Success state
    if (status === 'success') {
        return (
            <div className={`bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center ${className}`}>
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="text-emerald-600" size={28} />
                </div>
                <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">{t.successTitle}</h3>
                <p className="text-emerald-700 dark:text-emerald-300 text-sm mb-4">{t.successMsg}</p>
                <button onClick={() => { setShowForm(false); setStatus('idle'); setDescription(''); setSimilarApps(''); setEmail(''); }}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm">
                    {t.close}
                </button>
            </div>
        );
    }

    // Form modal
    if (showForm) {
        return (
            <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8 shadow-lg ${className}`}>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t.formTitle}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.priceNote}</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.descLabel} *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t.descPlaceholder}
                            rows={4}
                            required
                            minLength={10}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.similarLabel}</label>
                        <textarea
                            value={similarApps}
                            onChange={(e) => setSimilarApps(e.target.value)}
                            placeholder={t.similarPlaceholder}
                            rows={2}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.emailLabel} *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t.emailPlaceholder}
                            required
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm"
                        />
                    </div>

                    {errorMsg && (
                        <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-colors">
                            {t.cancel}
                        </button>
                        <button type="submit" disabled={status === 'loading'}
                            className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            {status === 'loading' ? (
                                <><Loader className="animate-spin" size={16} /> {t.submitting}</>
                            ) : (
                                <><Send size={16} /> {t.submit}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Banner (default)
    return (
        <button
            onClick={() => setShowForm(true)}
            className={`block w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all group text-left ${className}`}
        >
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-5 sm:p-7 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider backdrop-blur-sm">{t.badge}</span>
                    </div>
                    <h4 className="font-extrabold text-xl sm:text-2xl mb-1">{t.title}</h4>
                    <p className="text-white/80 text-sm">{t.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-white text-gray-900 px-5 py-3 rounded-xl font-bold text-sm group-hover:bg-gray-50 transition-colors">
                    <Code2 size={18} />
                    {t.cta}
                    <ArrowRight size={16} className="text-gray-500 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </button>
    );
}
