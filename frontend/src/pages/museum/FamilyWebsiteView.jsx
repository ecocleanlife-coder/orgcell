import React, { useState } from 'react';
import { ArrowLeft, Globe, Search, Lock, ShieldCheck, CreditCard, Check, Copy, Share2 } from 'lucide-react';
import FamilyTreeView from '../../components/museum/FamilyTreeView';
import AdBanner from '../../components/common/AdBanner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';
import { useNavigate } from 'react-router-dom';

export default function FamilyWebsiteView() {
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyWebsite', lang);
    const lt = getT('pricing', lang);

    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentDone, setPaymentDone] = useState(false);
    const [adminKey, setAdminKey] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('annual');
    const navigate = useNavigate();

    const handlePayment = async () => {
        setProcessing(true);
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch('/api/domain/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ subdomain }),
            });
            const data = await res.json();

            setProcessing(false);
            if (data.success) {
                setPaymentDone(true);
                setAdminKey(data.data.admin_key);
            } else {
                alert(data.message || 'Failed to register domain');
            }
        } catch (err) {
            console.error(err);
            setProcessing(false);
            alert('Registration processing failed');
        }
    };

    const handleCheckDomain = async () => {
        if (subdomain.length > 2) {
            try {
                const res = await fetch(`/api/domain/check?subdomain=${subdomain}`);
                const data = await res.json();
                setIsAvailable(data.success && data.available);
            } catch (err) {
                console.error(err);
                setIsAvailable(false);
            }
        } else {
            setIsAvailable(false);
        }
    };

    return (
        <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(180deg, #d8cfe8 0%, #e8e0f0 30%, #e0dce8 100%)' }}>
            {/* ══ Nav Header ══ */}
            <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(220, 215, 230, 0.95)', borderColor: '#c8c0d8', backdropFilter: 'blur(8px)' }}>
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#c8e0c0' }}>
                                <Globe size={16} style={{ color: '#4a7a3a' }} />
                            </div>
                            <span className="font-bold text-lg" style={{ color: '#3a3a3a' }}>Orgcell</span>
                        </div>
                        <span style={{ color: '#aaa' }}>|</span>
                        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: '#6a6a6a' }}>
                            <ArrowLeft size={16} />
                            Museum
                        </button>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 pb-16">
                {/* ══════════ Hero Section: 2-column layout ══════════ */}
                <div className="rounded-3xl overflow-hidden shadow-2xl border" style={{ background: 'linear-gradient(145deg, #f5f0e0 0%, #ece6d0 50%, #e8e2cc 100%)', borderColor: '#d8d0b8' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">

                        {/* ── Left Column: Text + Domain + Pricing ── */}
                        <div className="p-8 md:p-10">
                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ color: '#3a3a2a', fontFamily: 'Georgia, serif' }}>
                                $10 Family Website
                            </h1>

                            {/* Globe icon */}
                            <div className="mb-4">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#e0f0e0', border: '2px solid #b0d0a0' }}>
                                    <Globe size={24} style={{ color: '#5a8a4a' }} />
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-base leading-relaxed mb-6" style={{ color: '#5a5a4a' }}>
                                {t.heroDesc || 'Family can be together forever - Build a digital museum for your eternal family for just $10'}
                            </p>

                            {/* Create your family domain */}
                            <h3 className="text-xl font-extrabold mb-3" style={{ color: '#3a3a2a' }}>
                                {t.domainSearch || 'Create your family domain'}
                            </h3>

                            {/* Domain input */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center flex-1 rounded-xl overflow-hidden border-2" style={{ borderColor: '#c8c0a8', background: '#ffffff' }}>
                                    <input
                                        type="text"
                                        value={subdomain}
                                        onChange={(e) => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setIsAvailable(null); }}
                                        placeholder="smith-family"
                                        className="flex-1 px-4 py-3 outline-none font-medium bg-transparent"
                                        style={{ color: '#4a4a4a' }}
                                    />
                                    <span className="px-3 py-3 text-sm font-medium select-none" style={{ color: '#8a8a7a', background: '#f0ece0', borderLeft: '1px solid #d8d0b8' }}>
                                        .orgcell.com
                                    </span>
                                </div>
                                <button
                                    onClick={handleCheckDomain}
                                    className="px-4 py-3 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all hover:shadow-md shrink-0"
                                    style={{ background: '#e8e0d0', color: '#5a5040', border: '1px solid #c8c0a8' }}
                                >
                                    <Search size={14} />
                                    Check
                                </button>
                            </div>

                            {isAvailable !== null && (
                                <div className={`text-sm font-bold mb-3 ${isAvailable ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isAvailable ? `${subdomain}.orgcell.com is available!` : t.domainUnavailable || 'Domain is not available'}
                                </div>
                            )}

                            {/* Secure Payment Button */}
                            <button
                                onClick={() => setShowPayment(true)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base transition-all hover:shadow-lg hover:brightness-105 mb-2"
                                style={{
                                    background: 'linear-gradient(135deg, #3a8a3a 0%, #2a7a2a 100%)',
                                    color: '#ffffff',
                                    boxShadow: '0 4px 16px rgba(50, 120, 50, 0.3)',
                                }}
                            >
                                <Lock size={16} />
                                {t.paymentBtn || 'Secure Payment & Create Domain'}
                            </button>
                            <p className="text-xs text-center mb-8" style={{ color: '#8a8a7a' }}>
                                {lt.plan1Feature4 || 'Live sharing included'} &bull; Accessible anywhere
                            </p>

                            {/* ── Pricing Cards ── */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Basic Plan */}
                                <div
                                    onClick={() => setSelectedPlan('annual')}
                                    className="rounded-2xl p-4 cursor-pointer transition-all"
                                    style={{
                                        background: '#ffffff',
                                        border: selectedPlan === 'annual' ? '2px solid #8aaa7a' : '2px solid #d8d0c0',
                                        boxShadow: selectedPlan === 'annual' ? '0 4px 12px rgba(100, 150, 80, 0.15)' : 'none',
                                    }}
                                >
                                    <h4 className="text-sm font-bold mb-1" style={{ color: '#5a5a4a' }}>
                                        {lt.plan1Title || 'Basic (1 Year)'}
                                    </h4>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-2xl font-extrabold" style={{ color: '#3a3a2a' }}>{lt.plan1Price || '$10'}</span>
                                        <span className="text-xs" style={{ color: '#8a8a7a' }}>{lt.plan1Sub || '/year'}</span>
                                    </div>
                                    <ul className="space-y-1.5 mb-3">
                                        {[lt.plan1Feature1, lt.plan1Feature2, lt.plan1Feature3, lt.plan1Feature4].filter(Boolean).map((f, i) => (
                                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#6a6a5a' }}>
                                                <span style={{ color: '#8aaa7a' }}>&#8226;</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                                        style={{
                                            background: selectedPlan === 'annual' ? '#4a8a3a' : '#e8e0d0',
                                            color: selectedPlan === 'annual' ? '#ffffff' : '#6a6a5a',
                                        }}
                                    >
                                        Select Plan
                                    </button>
                                </div>

                                {/* Lifetime Plan */}
                                <div
                                    onClick={() => setSelectedPlan('lifetime')}
                                    className="rounded-2xl p-4 cursor-pointer transition-all"
                                    style={{
                                        background: '#ffffff',
                                        border: selectedPlan === 'lifetime' ? '2px solid #8aaa7a' : '2px solid #d8d0c0',
                                        boxShadow: selectedPlan === 'lifetime' ? '0 4px 12px rgba(100, 150, 80, 0.15)' : 'none',
                                    }}
                                >
                                    <h4 className="text-sm font-bold mb-1" style={{ color: '#5a5a4a' }}>
                                        {lt.plan2Title || 'Lifetime (10 Years)'}
                                    </h4>
                                    <div className="flex items-baseline gap-1 mb-3">
                                        <span className="text-2xl font-extrabold" style={{ color: '#3a3a2a' }}>{lt.plan2Price || '$100'}</span>
                                        <span className="text-xs" style={{ color: '#8a8a7a' }}>{lt.plan2Sub || '/10 years'}</span>
                                    </div>
                                    <ul className="space-y-1.5 mb-3">
                                        {[lt.plan2Feature1, lt.plan2Feature2, lt.plan2Feature3, lt.plan2Feature4].filter(Boolean).map((f, i) => (
                                            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#6a6a5a' }}>
                                                <span style={{ color: '#8aaa7a' }}>&#8226;</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        className="w-full py-2 rounded-lg text-xs font-bold transition-all"
                                        style={{
                                            background: selectedPlan === 'lifetime' ? '#4a8a3a' : '#e8e0d0',
                                            color: selectedPlan === 'lifetime' ? '#ffffff' : '#6a6a5a',
                                        }}
                                    >
                                        Select Plan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Right Column: Family Tree Image ── */}
                        <div className="hidden lg:flex items-center justify-center p-6">
                            <div className="relative w-full max-w-[480px]">
                                {/* 3D Frame */}
                                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{
                                    background: 'linear-gradient(145deg, #e0d4b8 0%, #c8b898 50%, #d8ccb0 100%)',
                                    padding: '16px',
                                    border: '3px solid #b8a888',
                                    boxShadow: '8px 8px 24px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.3)',
                                }}>
                                    <div className="rounded-xl overflow-hidden" style={{ background: '#f0e8d0' }}>
                                        <img
                                            src="/images/landing/hero-family-tree.png"
                                            alt="Family Tree"
                                            className="w-full h-auto"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentElement.innerHTML = `
                                                    <div style="padding: 40px; text-align: center;">
                                                        <div style="font-size: 64px; margin-bottom: 16px;">🌳</div>
                                                        <div style="color: #8a7a5a; font-size: 14px; font-weight: bold;">Family Tree Preview</div>
                                                        <div style="margin-top: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                                            <div style="display: flex; gap: 24px;">
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👴</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">GRANDPA</span>
                                                                </div>
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👵</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">GRANDMA</span>
                                                                </div>
                                                            </div>
                                                            <div style="width: 2px; height: 16px; background: #c8b898;"></div>
                                                            <div style="display: flex; gap: 24px;">
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👨</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">FATHER</span>
                                                                </div>
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👩</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">MOTHER</span>
                                                                </div>
                                                            </div>
                                                            <div style="width: 2px; height: 16px; background: #c8b898;"></div>
                                                            <div style="display: flex; gap: 24px;">
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👧</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">DAUGHTER</span>
                                                                </div>
                                                                <div style="text-align: center;">
                                                                    <div style="width: 48px; height: 48px; border-radius: 50%; background: #d8c8a8; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👦</div>
                                                                    <span style="font-size: 10px; color: #8a7a5a;">SON</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                `;
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ Lifetime Access Badge ══ */}
                <div className="flex justify-center -mt-6 relative z-10">
                    <div className="flex items-center gap-3 px-8 py-3 rounded-full shadow-lg" style={{
                        background: 'linear-gradient(135deg, #e8dcc0 0%, #d8ccb0 100%)',
                        border: '2px solid #c8b898',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                    }}>
                        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: '#6a5a3a' }}>
                            LIFETIME ACCESS:
                        </span>
                        <span className="text-lg">🏛️</span>
                        <span className="text-3xl font-extrabold" style={{ color: '#3a7a2a' }}>$10</span>
                    </div>
                </div>

                {/* ══ Family Tree Structure — 원래 FamilyTreeView 그대로 ══ */}
                <div className="mt-16 mb-8">
                    <FamilyTreeView />
                </div>

                {/* ══ Custom Development Banner ══ */}
                <div className="mt-12">
                    <AdBanner />
                </div>
            </main>

            {/* ══════════ Payment Modal ══════════ */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(40, 35, 50, 0.6)', backdropFilter: 'blur(6px)' }}>
                    <div className="rounded-3xl p-8 max-w-md w-full shadow-2xl relative" style={{ background: '#fdf8f0', border: '2px solid #d8d0b8' }}>
                        <button onClick={() => setShowPayment(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold transition-colors" style={{ background: '#e8e0d0', color: '#8a7a6a' }}>
                            &times;
                        </button>

                        {!paymentDone ? (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <ShieldCheck size={40} className="mx-auto mb-3" style={{ color: '#4a8a3a' }} />
                                    <h3 className="text-2xl font-bold" style={{ color: '#3a3a2a' }}>{t.paymentTitle}</h3>
                                    <p className="text-sm mt-1" style={{ color: '#8a8a7a' }}>{t.paymentSSL}</p>
                                </div>

                                <div className="rounded-xl p-4 text-center" style={{ background: '#e8f4e0', border: '1px solid #c8e0b8' }}>
                                    <p className="text-sm" style={{ color: '#6a7a5a' }}>{t.selectedPlan}</p>
                                    <p className="text-2xl font-bold" style={{ color: '#3a7a2a' }}>
                                        {selectedPlan === 'annual' ? '$10' : '$100'}
                                        <span className="text-base font-normal" style={{ color: '#8a8a7a' }}>
                                            {selectedPlan === 'annual' ? '/year' : '/10 years'}
                                        </span>
                                    </p>
                                    <p className="text-xs mt-1" style={{ color: '#8a8a7a' }}>
                                        {subdomain ? `${subdomain}.orgcell.com` : 'your-family.orgcell.com'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-bold mb-1 block" style={{ color: '#8a7a6a' }}>{t.cardNumber}</label>
                                        <input type="text" placeholder="1234 5678 9012 3456" maxLength={19}
                                            className="w-full px-4 py-3 rounded-xl outline-none"
                                            style={{ background: '#ffffff', border: '2px solid #d8d0c0', color: '#3a3a2a' }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm font-bold mb-1 block" style={{ color: '#8a7a6a' }}>{t.expiry}</label>
                                            <input type="text" placeholder="MM/YY" maxLength={5}
                                                className="w-full px-4 py-3 rounded-xl outline-none"
                                                style={{ background: '#ffffff', border: '2px solid #d8d0c0', color: '#3a3a2a' }} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold mb-1 block" style={{ color: '#8a7a6a' }}>CVC</label>
                                            <input type="text" placeholder="123" maxLength={4}
                                                className="w-full px-4 py-3 rounded-xl outline-none"
                                                style={{ background: '#ffffff', border: '2px solid #d8d0c0', color: '#3a3a2a' }} />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handlePayment} disabled={processing}
                                    className="w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 hover:brightness-105 disabled:opacity-70"
                                    style={{
                                        background: 'linear-gradient(135deg, #3a8a3a 0%, #2a7a2a 100%)',
                                        color: '#ffffff',
                                        boxShadow: '0 6px 20px rgba(50, 120, 50, 0.3)',
                                    }}>
                                    {processing ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t.processing}</>
                                    ) : (
                                        <><Lock size={18} /> {t.payNow}</>
                                    )}
                                </button>

                                <p className="text-xs text-center flex items-center justify-center gap-1" style={{ color: '#aaa' }}>
                                    <ShieldCheck size={12} /> {t.stripeNote}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#e0f4d8' }}>
                                    <Check size={32} style={{ color: '#3a8a3a' }} />
                                </div>
                                <h3 className="text-2xl font-bold" style={{ color: '#3a3a2a' }}>{t.setupComplete}</h3>
                                <p style={{ color: '#6a6a5a' }}>
                                    <span className="font-bold" style={{ color: '#3a8a3a' }}>{subdomain || 'your-family'}.orgcell.com</span>
                                </p>

                                <div className="rounded-xl p-4 text-center" style={{ background: '#f8f4e8', border: '1px solid #d8d0c0' }}>
                                    <p className="text-sm font-bold mb-1" style={{ color: '#5a5a4a' }}>{t.adminKeyGenerated}</p>
                                    <div className="font-mono text-lg font-bold px-3 py-2 rounded-lg inline-block select-all" style={{ color: '#7a5a9a', background: '#ffffff', border: '1px solid #d8d0c0' }}>
                                        {adminKey}
                                    </div>
                                    <p className="text-xs mt-2 text-left p-2 rounded-md" style={{ background: '#e8f0ff', color: '#4a6a8a' }}>
                                        {t.installText}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(`https://${subdomain || 'your-family'}.orgcell.com`);
                                        alert(t.copied);
                                    }}
                                        className="py-3 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
                                        style={{ background: '#e8e0d0', color: '#5a5040' }}>
                                        <Copy size={16} /> {t.copyLink}
                                    </button>
                                    <button
                                        className="py-3 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2"
                                        style={{ background: '#e8e0d0', color: '#5a5040' }}>
                                        <Share2 size={16} /> {t.shareSMS}
                                    </button>
                                </div>

                                <p className="text-sm" style={{ color: '#8a8a7a' }}>{t.setupDesc}<br />{t.setupAction}</p>
                                <button onClick={() => { setShowPayment(false); navigate('/family-dashboard'); }}
                                    className="w-full py-4 mt-2 rounded-xl font-bold transition-colors hover:brightness-105"
                                    style={{
                                        background: 'linear-gradient(135deg, #3a8a3a 0%, #2a7a2a 100%)',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 16px rgba(50, 120, 50, 0.25)',
                                    }}>
                                    {t.close}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
