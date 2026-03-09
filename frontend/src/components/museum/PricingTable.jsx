import React, { useState } from 'react';
import { Check, CreditCard, Clock, Globe } from 'lucide-react';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState('annual');

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">평생 보존 라이선스</h3>
                <p className="text-gray-600 dark:text-gray-400">
                    구독료의 부담 없이 일시불로. 우리의 추억을 안전하게 보관하세요.
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
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">프리미엄 1년</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-emerald-600">$10</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">/ 1년</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={20} />
                            <span>1년 보존, 연장 가능</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>사진 2,000장 무료 업로드</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>추가 2,000장 당 $10 할증</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={20} />
                            <span>가족 전용 서브도메인 부여</span>
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
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">슈퍼 프리미엄 10년</h4>
                    <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-emerald-600">$100</span>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">/ 10년</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Clock className="shrink-0 text-emerald-500" size={20} />
                            <span className="font-bold text-gray-900 dark:text-white">10년 보존 보장 (사실상 평생)</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>사진 10,000장 무료 업로드</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Check className="shrink-0 text-emerald-500" size={20} />
                            <span>추가 2,000장 당 $10 할증</span>
                        </li>
                        <li className="flex gap-3 text-gray-600 dark:text-gray-300">
                            <Globe className="shrink-0 text-emerald-500" size={20} />
                            <span>가족 전용 서브도메인 부여</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 text-center bg-gray-100 dark:bg-gray-800/50 py-3 rounded-xl border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto flex items-center justify-center gap-2">
                <CreditCard size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">결제는 다음 단계에서 안전하게 진행됩니다.</span>
            </div>
        </div>
    );
}
