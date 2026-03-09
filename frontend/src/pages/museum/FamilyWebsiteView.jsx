import React, { useState } from 'react';
import { ArrowLeft, Globe, Search, Lock, ShieldCheck, CreditCard, Check } from 'lucide-react';
import PricingTable from '../../components/museum/PricingTable';
import FamilyTreeView from '../../components/museum/FamilyTreeView';

export default function FamilyWebsiteView() {
    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentDone, setPaymentDone] = useState(false);

    const handlePayment = () => {
        setProcessing(true);
        setTimeout(() => {
            setProcessing(false);
            setPaymentDone(true);
        }, 2000);
    };

    const handleCheckDomain = () => {
        if (subdomain.length > 2) {
            // Mock API call
            setIsAvailable(true);
        } else {
            setIsAvailable(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-20">
            {/* Nav Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                            $10 가족 웹사이트
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
                {/* Hero Section */}
                <section className="text-center space-y-4 animate-fade-in-up">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-2">
                        <Globe size={32} />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Family can be together forever</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        어르신들도 스마트폰 앱 설치 없이 링크 하나로 손쉽게 접속하는 우리 가족만의 디지털 박물관.
                    </p>
                </section>

                {/* Domain Search */}
                <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 dark:border-gray-700 text-center max-w-3xl mx-auto animate-fade-in-up">
                    <h3 className="text-2xl font-bold mb-6">원하는 가족 도메인을 만들어보세요</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4 max-w-lg mx-auto">
                        <div className="relative flex-1 w-full flex items-center bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition-colors">
                            <input
                                type="text"
                                value={subdomain}
                                onChange={(e) => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setIsAvailable(null); }}
                                placeholder="smith-family"
                                className="w-full bg-transparent px-4 py-3.5 outline-none font-medium text-right text-gray-900 dark:text-white"
                            />
                            <span className="pr-4 py-3.5 text-gray-500 dark:text-gray-400 font-medium select-none bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                                .orgcell.com
                            </span>
                        </div>
                        <button
                            onClick={handleCheckDomain}
                            className="w-full sm:w-auto px-6 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shrink-0"
                        >
                            <Search size={20} className="inline mr-2" />
                            조회
                        </button>
                    </div>

                    {/* Mock Result */}
                    {isAvailable !== null && (
                        <div className={`mt-4 text-sm font-bold ${isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {isAvailable ? `🎉 사용 가능한 도메인입니다! (${subdomain}.orgcell.com)` : '❌ 이미 사용중이거나 너무 짧은 도메인입니다.'}
                        </div>
                    )}
                </section>

                {/* Pricing Table */}
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <PricingTable />
                </div>

                {/* Preview: Family Tree Viewer */}
                <section className="space-y-6 pt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">미리보기: 디지털 패밀리 뮤지엄</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">가계도를 기반으로 세대별, 인물별로 깔끔하게 정리되는 전용 갤러리</p>
                    </div>

                    {/* Family Tree View Component */}
                    <FamilyTreeView />
                </section>

                <div className="flex justify-center pt-12 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={() => setShowPayment(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/30 transition-all flex items-center gap-3 text-lg transform hover:-translate-y-1">
                        <CreditCard size={24} />
                        안전결제 및 도메인 개설
                    </button>
                </div>
            </main>

            {/* Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-gray-100 dark:border-gray-700">
                        <button onClick={() => setShowPayment(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors">
                            <span className="sr-only">Close</span>&times;
                        </button>

                        {!paymentDone ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <ShieldCheck size={40} className="mx-auto mb-3 text-emerald-500" />
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">안전결제</h3>
                                    <p className="text-sm text-gray-500 mt-1">SSL 암호화 보호 결제</p>
                                </div>

                                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">선택 플랜</p>
                                    <p className="text-2xl font-bold text-emerald-600">$10<span className="text-base font-normal text-gray-500">/year</span></p>
                                    <p className="text-xs text-gray-500 mt-1">{subdomain ? `${subdomain}.orgcell.com` : 'your-family.orgcell.com'}</p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-bold text-gray-500 mb-1 block">Card Number</label>
                                        <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none dark:text-white" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-bold text-gray-500 mb-1 block">Expiry</label>
                                            <input type="text" placeholder="MM/YY" maxLength={5}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-500 mb-1 block">CVC</label>
                                            <input type="text" placeholder="123" maxLength={4}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none dark:text-white" />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handlePayment} disabled={processing}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-3">
                                    {processing ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 결제 처리 중...</>
                                    ) : (
                                        <><Lock size={18} /> $10 결제하기</>
                                    )}
                                </button>

                                <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                                    <ShieldCheck size={12} /> Stripe 보안 결제 · 언제든 취소 가능
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                                    <Check size={32} className="text-emerald-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">개설 완료!</h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-bold text-emerald-600">{subdomain || 'your-family'}.orgcell.com</span>
                                </p>
                                <p className="text-sm text-gray-500">가족 웹사이트가 성공적으로 개설되었습니다.<br/>이제 가계도에 사진을 올려보세요!</p>
                                <button onClick={() => setShowPayment(false)}
                                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold transition-colors">
                                    닫기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
