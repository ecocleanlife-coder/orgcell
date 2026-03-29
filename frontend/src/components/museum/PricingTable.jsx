import React, { useState } from 'react';
import { Check, CreditCard, Cloud, Server, Star } from 'lucide-react';
import useUiStore from '../../store/uiStore';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState('cloud');
    const lang = useUiStore((s) => s.lang) || localStorage.getItem('orgcell_lang') || 'ko';

    const plans = [
        {
            id: 'cloud',
            icon: Cloud,
            title: 'Google Drive / OneDrive',
            price: '무료',
            sub: '',
            recommended: true,
            features: [
                '본인 클라우드에 안전 보관',
                '아이폰/안드로이드/위성폰 지원',
                'yourfamily.orgcell.com 도메인',
                '가계도·앨범·슬라이드쇼',
            ],
        },
        {
            id: 'server',
            icon: Server,
            title: 'Orgcell 서버',
            price: '$10',
            sub: '/년',
            recommended: false,
            features: [
                '별도 클라우드 불필요',
                'yourfamily.orgcell.com 도메인',
                '가계도·앨범·슬라이드쇼',
                '바로 시작 가능',
            ],
        },
    ];

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="text-center mb-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    어디서나 접속 가능 &bull; 우리 서버에 사진이 저장되지 않습니다
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const isSelected = selectedPlan === plan.id;
                    return (
                        <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                                isSelected
                                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 transform scale-105 z-10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                            }`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                    <Star size={12} /> 추천
                                </div>
                            )}
                            {isSelected && (
                                <div className="absolute top-0 right-0 -mr-2 -mt-2 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                    <Check size={12} strokeWidth={3} />
                                </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={20} className="text-emerald-500" />
                                <h4 className="text-base font-bold text-gray-900 dark:text-white">{plan.title}</h4>
                            </div>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-2xl font-extrabold text-emerald-600">{plan.price}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{plan.sub}</span>
                            </div>
                            <ul className="space-y-2 mb-4">
                                {plan.features.map((feat) => (
                                    <li key={feat} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <Check className="shrink-0 text-emerald-500" size={16} />
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 text-center bg-gray-100 dark:bg-gray-800/50 py-3 rounded-xl border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto flex items-center justify-center gap-2">
                <CreditCard size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Stripe 보안 결제 (클라우드 플랜은 결제 불필요)</span>
            </div>
        </div>
    );
}
