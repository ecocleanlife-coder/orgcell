import React, { useState } from 'react';
import { Globe, ArrowRight, ArrowLeft, Check, HardDrive, UserPlus, Copy, Share2 } from 'lucide-react';
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

    // ── Step state ──
    const [step, setStep] = useState(1); // 1=domain, 2=drive, 3=done

    // ── Step 1: Domain ──
    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [createdSiteId, setCreatedSiteId] = useState(null);

    // ── Step 2: Drive ──
    const [driveStatus, setDriveStatus] = useState(null); // null | 'connected' | 'not_connected'
    const [driveConnecting, setDriveConnecting] = useState(false);

    // ── Step 3: Invite ──
    const [inviteUrl, setInviteUrl] = useState('');
    const [inviteGenerating, setInviteGenerating] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);

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
                setCreatedSiteId(res.data.data.id);
                setStep(2);
                // Drive 상태 체크
                try {
                    const driveRes = await axios.get('/api/drive/status');
                    setDriveStatus(driveRes.data?.connected ? 'connected' : 'not_connected');
                } catch {
                    setDriveStatus('not_connected');
                }
            } else {
                setError(res.data?.message || 'Failed to create site');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create site');
        } finally {
            setCreating(false);
        }
    };

    const handleConnectDrive = async () => {
        setDriveConnecting(true);
        try {
            const res = await axios.get('/api/drive/auth');
            if (res.data?.url) {
                // Drive OAuth 인증 페이지로 이동 (callback 후 돌아옴)
                window.location.href = res.data.url;
            }
        } catch {
            setError(t.driveError || 'Failed to connect Drive');
        } finally {
            setDriveConnecting(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!createdSiteId) return;
        setInviteGenerating(true);
        try {
            const res = await axios.post('/api/invite/create', { site_id: createdSiteId });
            if (res.data?.success) setInviteUrl(res.data.data.url);
        } catch { /* silent */ }
        finally { setInviteGenerating(false); }
    };

    const handleCopyInvite = () => {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 2000);
        });
    };

    const STEPS = [
        { num: 1, label: t.step1Label || 'Domain' },
        { num: 2, label: t.step2Label || 'Storage' },
        { num: 3, label: t.step3Label || 'Invite' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
            <header className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 font-bold text-lg" style={{ color: '#5A9460' }}>
                    <Globe className="w-5 h-5" /> Orgcell
                </div>
                <LanguageSwitcher />
            </header>

            <main className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className="flex items-center gap-1.5">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{
                                            background: step >= s.num ? '#5A9460' : '#e8e0d0',
                                            color: step >= s.num ? '#fff' : '#9a9a8a',
                                        }}
                                    >
                                        {step > s.num ? <Check size={14} /> : s.num}
                                    </div>
                                    <span className="text-xs font-medium hidden sm:inline" style={{ color: step >= s.num ? '#3a3a2a' : '#9a9a8a' }}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="w-8 h-0.5" style={{ background: step > s.num ? '#5A9460' : '#e8e0d0' }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-8" style={{ border: '1px solid #e8e0d0' }}>
                        {/* ═══ Step 1: Domain ═══ */}
                        {step === 1 && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f5e0' }}>
                                        <Globe className="w-8 h-8" style={{ color: '#5A9460' }} />
                                    </div>
                                    <h1 className="text-2xl font-bold" style={{ color: '#1E2A0E' }}>{t.title}</h1>
                                    <p className="mt-2" style={{ color: '#7a6e5e' }}>{t.subtitle}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1" style={{ color: '#5a5040' }}>
                                            {t.domainLabel}
                                        </label>
                                        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1.5px solid #d8d0c0' }}>
                                            <input
                                                type="text"
                                                value={subdomain}
                                                onChange={(e) => checkSubdomain(e.target.value)}
                                                placeholder={t.domainPlaceholder}
                                                className="flex-1 px-3 py-2.5 text-sm outline-none"
                                                maxLength={30}
                                            />
                                            <span className="px-3 py-2.5 text-sm border-l" style={{ background: '#f8f6f0', color: '#9a9a8a', borderColor: '#d8d0c0' }}>
                                                .orgcell.com
                                            </span>
                                        </div>
                                        {checking && <p className="text-xs mt-1" style={{ color: '#9a9a8a' }}>{t.checking}</p>}
                                        {isAvailable === true && <p className="text-xs mt-1" style={{ color: '#5A9460' }}>✓ {t.available}</p>}
                                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                                    </div>

                                    <button
                                        onClick={handleCreate}
                                        disabled={!isAvailable || creating}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        style={{ background: '#5A9460' }}
                                    >
                                        {creating ? t.creating : (t.step1Next || 'Next')}
                                        {!creating && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ═══ Step 2: Google Drive ═══ */}
                        {step === 2 && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e0f0ff' }}>
                                        <HardDrive className="w-8 h-8" style={{ color: '#3b82f6' }} />
                                    </div>
                                    <h1 className="text-2xl font-bold" style={{ color: '#1E2A0E' }}>{t.driveTitle || 'Connect Google Drive'}</h1>
                                    <p className="mt-2" style={{ color: '#7a6e5e' }}>{t.driveSubtitle || 'Photos are stored safely in your own Google Drive.'}</p>
                                </div>

                                <div className="space-y-4">
                                    {driveStatus === 'connected' ? (
                                        <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: '#e8f5e0' }}>
                                            <Check size={20} style={{ color: '#5A9460' }} />
                                            <span className="text-sm font-semibold" style={{ color: '#3a7a2a' }}>{t.driveConnected || 'Google Drive connected!'}</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleConnectDrive}
                                            disabled={driveConnecting}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
                                            style={{ background: '#4285F4' }}
                                        >
                                            <HardDrive size={18} />
                                            {driveConnecting ? (t.driveConnecting || 'Connecting...') : (t.driveConnect || 'Connect Google Drive')}
                                        </button>
                                    )}

                                    {error && <p className="text-xs text-red-500">{error}</p>}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(3)}
                                            className="flex-1 py-3 rounded-xl font-semibold text-sm transition"
                                            style={{ background: '#f0ece4', color: '#5a5040' }}
                                        >
                                            {t.skipLater || 'Skip for now'}
                                        </button>
                                        {driveStatus === 'connected' && (
                                            <button
                                                onClick={() => setStep(3)}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition"
                                                style={{ background: '#5A9460' }}
                                            >
                                                {t.step2Next || 'Next'} <ArrowRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══ Step 3: Invite & Done ═══ */}
                        {step === 3 && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fff3e0' }}>
                                        <UserPlus className="w-8 h-8" style={{ color: '#e67e22' }} />
                                    </div>
                                    <h1 className="text-2xl font-bold" style={{ color: '#1E2A0E' }}>{t.inviteTitle || 'Invite Your Family'}</h1>
                                    <p className="mt-2" style={{ color: '#7a6e5e' }}>{t.inviteSubtitle || 'Share this link so your family can join your museum.'}</p>
                                </div>

                                <div className="space-y-4">
                                    {!inviteUrl ? (
                                        <button
                                            onClick={handleGenerateInvite}
                                            disabled={inviteGenerating}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition"
                                            style={{ background: '#e67e22' }}
                                        >
                                            <UserPlus size={18} />
                                            {inviteGenerating ? (t.inviteGenerating || 'Generating...') : (t.inviteGenerate || 'Generate Invite Link')}
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="flex-1 text-xs px-3 py-2.5 rounded-lg truncate"
                                                    style={{ background: '#f8f6f0', color: '#5a5a4a', border: '1px solid #e8e0d0' }}
                                                >
                                                    {inviteUrl}
                                                </span>
                                                <button
                                                    onClick={handleCopyInvite}
                                                    className="px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                                                    style={{
                                                        background: inviteCopied ? '#e8f5e0' : '#e8e0d0',
                                                        color: inviteCopied ? '#3a7a2a' : '#5a5040',
                                                    }}
                                                >
                                                    {inviteCopied ? <Check size={12} /> : <Copy size={12} />}
                                                    {inviteCopied ? (t.copied || 'Copied!') : (t.copy || 'Copy')}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const text = inviteUrl;
                                                    if (navigator.share) {
                                                        navigator.share({ title: 'Family Museum Invite', url: inviteUrl });
                                                    } else {
                                                        window.open(`sms:?body=${encodeURIComponent(text)}`);
                                                    }
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition"
                                                style={{ background: '#f0ece4', color: '#5a5040' }}
                                            >
                                                <Share2 size={14} />
                                                {t.shareBtn || 'Share via Message'}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => navigate(`/${subdomain}`, { replace: true })}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition"
                                        style={{ background: '#5A9460' }}
                                    >
                                        {t.goToMuseum || 'Go to My Museum'}
                                        <ArrowRight size={16} />
                                    </button>

                                    {!inviteUrl && (
                                        <button
                                            onClick={() => navigate(`/${subdomain}`, { replace: true })}
                                            className="w-full py-2 text-xs font-medium transition"
                                            style={{ color: '#9a9a8a' }}
                                        >
                                            {t.skipLater || 'Skip for now'}
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
