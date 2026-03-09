import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function PricingTable() {
    const [selectedPlan, setSelectedPlan] = useState('standard');

    return (
        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-3xl mx-auto w-full">
            <h2 className="text-xl font-bold text-center mb-2">우리 가족만의 디지털 뮤지엄 개설</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">안전하고 영구적인 가족 사진 보관소</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Standard Plan */}
                <label className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all ${selectedPlan === 'standard' ? 'border-blue-500 ring-4 ring-blue-50 dark:ring-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                    <input type="radio" name="plan" value="standard" className="sr-only" checked={selectedPlan === 'standard'} onChange={() => setSelectedPlan('standard')} />
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Standard</h3>
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-full">인기</span>
                    </div>
                    <div className="mb-4">
                        <span className="text-3xl font-extrabold">$10</span>
                        <span className="text-gray-500 dark:text-gray-400"> / 년</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>최대 <strong>2,000장</strong> 사진 보관</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>추가 2,000장당 $10</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>프리미엄 슬라이드쇼 제공</span>
                        </li>
                    </ul>
                    <div className={`w-full py-2.5 rounded-xl text-center font-bold text-sm transition-colors ${selectedPlan === 'standard' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                        선택하기
                    </div>
                </label>

                {/* Lifetime Plan */}
                <label className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all ${selectedPlan === 'lifetime' ? 'border-purple-500 ring-4 ring-purple-50 dark:ring-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'}`}>
                    <input type="radio" name="plan" value="lifetime" className="sr-only" checked={selectedPlan === 'lifetime'} onChange={() => setSelectedPlan('lifetime')} />
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Family Heritage</h3>
                    </div>
                    <div className="mb-4">
                        <span className="text-3xl font-extrabold">$100</span>
                        <span className="text-gray-500 dark:text-gray-400"> / 10년</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>최대 <strong>10,000장</strong> 대용량 보관</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>10년 장기 보존 보장 (할인율 적용)</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                            <span>프리미엄 슬라이드쇼 & 원본 다운로드</span>
                        </li>
                    </ul>
                    <div className={`w-full py-2.5 rounded-xl text-center font-bold text-sm transition-colors ${selectedPlan === 'lifetime' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                        선택하기
                    </div>
                </label>
            </div>

            {/* Custom Domain Add-ons */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-center mb-6">🌟 독립 도메인 연결 프리미엄 옵션 (선택)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option A */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">옵션 A: Turn-key 패키지</h4>
                                <p className="text-xs text-gray-500 mt-1">도메인 구매부터 연결, 보안까지 모두 대행</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">추천</span>
                        </div>
                        <div className="mt-4 flex items-end gap-1">
                            <span className="text-2xl font-black">$60</span>
                            <span className="text-sm text-gray-500 mb-1">/ 첫 달 (초기 설정)</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">이후 2년차부터 매년 $45 갱신</p>
                    </div>

                    {/* Option B */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <div className="mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">옵션 B: 직접 구매 후 연결</h4>
                            <p className="text-xs text-gray-500 mt-1">고객이 도메인을 외부에서 구매 후 서버만 연결</p>
                        </div>
                        <div className="mt-4 flex items-end gap-1">
                            <span className="text-2xl font-black">$45</span>
                            <span className="text-sm text-gray-500 mb-1">/ 년</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1 invisible">유지비</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
