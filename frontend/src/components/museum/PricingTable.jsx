import React, { useState } from 'react';
import { Check, CreditCard, Clock, Globe } from 'lucide-react';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState('annual');
    const lang = useUiStore((s) => s.lang);
    const lt = getT('pricing', lang);

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{lt.plan2Title}</h3>
                <p className="text-gray-600 dark:text-gray-400">
                    {lt.plan2Feature1}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {/* $10 Plan */}
                <div
                    onClick={() => setSelectedPlan('annual')}
                    className={`relative bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'annual'
                        ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 transform scale-105 z-10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                >
                    {selectedPlan === 'annual' && (
                        <div className="absolute top-0 right-0 -mr-2 -mt-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                            <Check size={14} strokeWidth={3} />
                        </div>
                    )}
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{lt.plan1Title}</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-emerald-600">{lt.plan1Price}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{lt.plan1Sub}</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan1Feature1}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan1Feature2}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan1Feature3}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan1Feature4}</span>
                        </li>
                    </ul>
                </div>

                {/* $100 Plan */}
                <div
                    onClick={() => setSelectedPlan('lifetime')}
                    className={`relative bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === 'lifetime'
                        ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 transform scale-105 z-10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                >
                    {selectedPlan === 'lifetime' && (
                        <div className="absolute top-0 right-0 -mr-2 -mt-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                            <Check size={14} strokeWidth={3} />
                        </div>
                    )}
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{lt.plan2Title}</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-emerald-600">{lt.plan2Price}</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{lt.plan2Sub}</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={20} />
                            <span className="font-bold text-gray-900 dark:text-white">{lt.plan2Feature1}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan2Feature2}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>{lt.plan2Feature3}</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={20} />
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
