import React, { useState } from 'react';
import { Check, CreditCard, Clock, Globe } from 'lucide-react';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState('annual');
    const lang = useUiStore((s) => s.lang) || localStorage.getItem('orgcell_lang') || 'en';
    const lt = getT('pricing', lang);

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {lt.plan1Feature4} &bull; {lang === 'ko' ? '어디서나 접속 가능' : 'Accessible anywhere'}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {/* $10 Plan */}
                <div
                    onClick={() => setSelectedPlan('annual')}
                    className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 cursor-pointer transition-all ${selectedPlan === 'annual'
                        ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 transform scale-105 z-10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                >
                    {selectedPlan === 'annual' && (
                        <div className="absolute top-0 right-0 -mr-2 -mt-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                            <Check size={12} strokeWidth={3} />
                        </div>
                    )}
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{lt.plan1Title}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-extrabold text-emerald-600">{lt.plan1Price}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{lt.plan1Sub}</span>
                    </div>

                    <ul className="space-y-2 mb-4">
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan1Feature1}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan1Feature2}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan1Feature3}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan1Feature4}</span>
                        </li>
                    </ul>
                </div>

                {/* $100 Plan */}
                <div
                    onClick={() => setSelectedPlan('lifetime')}
                    className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 cursor-pointer transition-all ${selectedPlan === 'lifetime'
                        ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 transform scale-105 z-10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                >
                    {selectedPlan === 'lifetime' && (
                        <div className="absolute top-0 right-0 -mr-2 -mt-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                            <Check size={12} strokeWidth={3} />
                        </div>
                    )}
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{lt.plan2Title}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-extrabold text-emerald-600">{lt.plan2Price}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{lt.plan2Sub}</span>
                    </div>

                    <ul className="space-y-2 mb-4">
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={16} />
                            <span className="font-bold text-gray-900 dark:text-white">{lt.plan2Feature1}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan2Feature2}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan2Feature3}</span>
                        </li>
                        <li className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={16} />
                            <span>{lt.plan2Feature4}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 text-center bg-gray-100 dark:bg-gray-800/50 py-3 rounded-xl border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto flex items-center justify-center gap-2">
                <CreditCard size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{lt.selectBtn}</span>
            </div>
        </div>
    );
}
