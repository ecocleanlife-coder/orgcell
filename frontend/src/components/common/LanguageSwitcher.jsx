import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import useUiStore from '../../store/uiStore';
import { langLabels } from '../../i18n/translations';

export default function LanguageSwitcher({ className = '' }) {
    const [open, setOpen] = useState(false);
    const lang = useUiStore((s) => s.lang);
    const setLang = useUiStore((s) => s.setLang);

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                <Globe size={14} />
                {langLabels[lang]}
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                        {Object.entries(langLabels).map(([code, label]) => (
                            <button
                                key={code}
                                onClick={() => { setLang(code); setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${lang === code ? 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
