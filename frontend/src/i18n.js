import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import ko from './locales/ko/translation.json';
import ja from './locales/ja/translation.json';
import zhCN from './locales/zh-CN/translation.json';
import es from './locales/es/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ko: { translation: ko },
            ja: { translation: ja },
            'zh-CN': { translation: zhCN },
            es: { translation: es },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'ko', 'ja', 'zh-CN', 'es'],
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'orgcell_lang',
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
