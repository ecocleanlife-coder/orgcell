import React, { useState } from 'react';
import { Globe, ArrowRight, Check } from 'lucide-react';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function FamilySetupPage() {
    const lang = useUiStore((s) => s.lang);
    const t = getT('familySetup', lang);
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();

    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const checkSubdomain = async (val) => {
        const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setSubdomain(clean);
        setIsAvailable(null);
        setError('');

        if (clean.length < 3) return;

        setChecking(true);
        try {
            const res = await axios.get(`/api/domain/check?subdomain=${clean}`);
            if (res.data?.success) {
                setIsAvailable(res.data.available);
                if (!res.data.available) {
                    setError(res.data.reason === 'taken' ? t.domainTaken : t.domainTooShort);
                }
            }
        } catch {
            setError(t.domainCheckError);
        } finally {
            setChecking(false);
        }
    };

    const handleCreate = async () => {
        if (!subdomain || subdomain.length < 3 || !isAvailable) return;
        setCreating(true);
        try {
            const res = await axios.post('/api/sites', { subdomain });
            if (res.data?.success) {
                navigate('/museum', { replace: true });
            } else {
                setError(res.data?.message || 'Failed to create site');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create site');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
            <header className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                    <Globe className="w-5 h-5" /> Orgcell
                </div>
                <LanguageSwitcher />
            </header>

            <main className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                            <p className="text-gray-500 mt-2">{t.subtitle}</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t.domainLabel}
                                </label>
                                <div className="flex items-center border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                    <input
                                        type="text"
                                        value={subdomain}
                                        onChange={(e) => checkSubdomain(e.target.value)}
                                        placeholder={t.domainPlaceholder}
                                        className="flex-1 px-3 py-2.5 text-sm outline-none"
                                        maxLength={30}
                                    />
                                    <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-500 border-l">
                                        .orgcell.com
                                    </span>
                                </div>
                                {checking && (
                                    <p className="text-xs text-gray-400 mt-1">{t.checking}</p>
                                )}
                                {isAvailable === true && (
                                    <p className="text-xs text-green-600 mt-1">✓ {t.available}</p>
                                )}
                                {error && (
                                    <p className="text-xs text-red-500 mt-1">{error}</p>
                                )}
                            </div>

                            <button
                                onClick={handleCreate}
                                disabled={!isAvailable || creating}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {creating ? t.creating : t.createBtn}
                                {!creating && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
