import React, { useState, useEffect } from 'react';
import { Globe, ArrowRight, ArrowLeft, Check, HardDrive, Cloud, UserPlus, Copy, Share2 } from 'lucide-react';
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
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const navigate = useNavigate();

    // ── 이미 박물관 있으면 바로 이동 ──
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get('/api/sites/mine')
            .then(({ data }) => {
                if (data.data?.subdomain) {
                    navigate(`/${data.data.subdomain}`, { replace: true });
                }
            })
            .catch(() => {});
    }, [isAuthenticated, navigate]);

    // ── Step state ──
    const [step, setStep] = useState(0); // 0=가족확인, 0.5=검색결과, 1=domain, 2=drive, 3=done

    // ── Step 0: 가족 확인 ──
    const [familySearchName, setFamilySearchName] = useState('');
    const [familySearching, setFamilySearching] = useState(false);
    const [familySearchResults, setFamilySearchResults] = useState([]);
    const [selectedFoundPerson, setSelectedFoundPerson] = useState(null);
    const [joinRequestSent, setJoinRequestSent] = useState(false);

    const handleFamilySearch = async () => {
        const q = familySearchName.trim();
        if (!q) return;
        setFamilySearching(true);
        try {
            const res = await axios.get(`/api/museum/search?q=${encodeURIComponent(q)}`);
            setFamilySearchResults(res.data?.data || []);
            setStep(0.5);
        } catch {
            setFamilySearchResults([]);
            setStep(0.5);
        } finally {
            setFamilySearching(false);
        }
    };

    const handleJoinRequest = async (person) => {
        try {
            await axios.post('/api/invite/create', {
                site_id: person.site_id,
                person_id: person.id,
            });
            setSelectedFoundPerson(person);
            setJoinRequestSent(true);
        } catch {
            setJoinRequestSent(true); // optimistic: assume sent
        }
    };

    // ── Step 1: Domain ──
    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [createdSiteId, setCreatedSiteId] = useState(null);

    // ── Step 2: Storage ──
    const [storageChoice, setStorageChoice] = useState(null); // null | 'google' | 'onedrive' | 'dropbox'
    const [driveStatus, setDriveStatus] = useState(null); // null | 'connected' | 'not_connected'
    const [driveConnecting, setDriveConnecting] = useState(false);
    const [onedriveStatus, setOnedriveStatus] = useState(null);
    const [onedriveConnecting, setOnedriveConnecting] = useState(false);
    const [dropboxStatus, setDropboxStatus] = useState(null);
    const [dropboxConnecting, setDropboxConnecting] = useState(false);

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
                // Drive + OneDrive + Dropbox 상태 체크
                try {
                    const [driveRes, odRes, dbRes] = await Promise.all([
                        axios.get('/api/drive/status').catch(() => ({ data: { connected: false } })),
                        axios.get('/api/onedrive/status').catch(() => ({ data: { connected: false } })),
                        axios.get('/api/dropbox/status').catch(() => ({ data: { connected: false } })),
                    ]);
                    setDriveStatus(driveRes.data?.connected ? 'connected' : 'not_connected');
                    setOnedriveStatus(odRes.data?.connected ? 'connected' : 'not_connected');
                    setDropboxStatus(dbRes.data?.connected ? 'connected' : 'not_connected');
                } catch {
                    setDriveStatus('not_connected');
                    setOnedriveStatus('not_connected');
                    setDropboxStatus('not_connected');
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

    const handleConnectOneDrive = async () => {
        setOnedriveConnecting(true);
        try {
            const res = await axios.get('/api/onedrive/auth');
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch {
            setError('OneDrive 연결에 실패했습니다');
        } finally {
            setOnedriveConnecting(false);
        }
    };

    const handleConnectDropbox = async () => {
        setDropboxConnecting(true);
        try {
            const res = await axios.get('/api/dropbox/auth');
            if (res.data?.url) {
                window.location.href = res.data.url;
            }
        } catch {
            setError('Dropbox 연결에 실패했습니다');
        } finally {
            setDropboxConnecting(false);
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
        { num: 0, label: '가족 확인' },
        { num: 1, label: t.step1Label || '도메인' },
        { num: 2, label: t.step2Label || '저장소' },
        { num: 3, label: t.step3Label || '완료' },
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
                                            background: Math.floor(step) >= s.num ? '#5A9460' : '#e8e0d0',
                                            color: Math.floor(step) >= s.num ? '#fff' : '#9a9a8a',
                                        }}
                                    >
                                        {Math.floor(step) > s.num ? <Check size={14} /> : s.num}
                                    </div>
                                    <span className="text-xs font-medium hidden sm:inline" style={{ color: step >= s.num ? '#3a3a2a' : '#9a9a8a' }}>
                                        {s.label}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className="w-8 h-0.5" style={{ background: Math.floor(step) > s.num ? '#5A9460' : '#e8e0d0' }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-8" style={{ border: '1px solid #e8e0d0' }}>
                        {/* ═══ Step 0: 가족 확인 ═══ */}
                        {step === 0 && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fdf8f0' }}>
                                        <span style={{ fontSize: 32 }}>🏛️</span>
                                    </div>
                                    <h1 className="text-xl font-bold" style={{ color: '#3D2008' }}>가족유산박물관 만들기</h1>
                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: '#7a6e5e' }}>
                                        가족 중에 이미 박물관을 갖고 계신 분이<br />
                                        계신지 확인하겠습니다.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium" style={{ color: '#5a5040' }}>
                                        가족 이름 검색 (부·모·형제자매·자녀)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={familySearchName}
                                            onChange={e => setFamilySearchName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleFamilySearch(); }}
                                            placeholder="가족 이름 입력"
                                            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
                                            style={{ border: '1.5px solid #d8d0c0' }}
                                        />
                                        <button
                                            onClick={handleFamilySearch}
                                            disabled={familySearching || !familySearchName.trim()}
                                            className="px-4 py-2.5 rounded-lg text-sm font-bold text-white"
                                            style={{ background: '#C4A84F', opacity: familySearching || !familySearchName.trim() ? 0.6 : 1 }}
                                        >
                                            {familySearching ? '검색 중...' : '검색'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full py-2.5 rounded-lg text-sm font-medium mt-2"
                                        style={{ background: '#f0ece4', color: '#7a6e5e', border: '1px solid #d8d0c0' }}
                                    >
                                        건너뛰고 바로 만들기 →
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ═══ Step 0.5: 검색 결과 ═══ */}
                        {step === 0.5 && (
                            <>
                                {familySearchResults.length > 0 && !joinRequestSent ? (
                                    <>
                                        <div className="text-center mb-5">
                                            <span style={{ fontSize: 32 }}>🎉</span>
                                            <h2 className="text-lg font-bold mt-2" style={{ color: '#3D2008' }}>
                                                박물관을 찾았습니다!
                                            </h2>
                                        </div>
                                        <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
                                            {familySearchResults.map(person => (
                                                <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid #e8e0d0', background: '#fdfaf5' }}>
                                                    {person.photo_url
                                                        ? <img src={person.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                        : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f5e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👤</div>
                                                    }
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-sm" style={{ color: '#3D2008' }}>{person.name}</div>
                                                        <div className="text-xs" style={{ color: '#9a9a8a' }}>{person.museum_title || person.subdomain} 박물관</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleJoinRequest(person)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                                        style={{ background: '#5A9460', whiteSpace: 'nowrap' }}
                                                    >
                                                        합류
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setStep(1)}
                                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                                style={{ background: '#f0ece4', color: '#7a6e5e', border: '1px solid #d8d0c0' }}
                                            >
                                                아니오, 독립 박물관 만들기
                                            </button>
                                        </div>
                                    </>
                                ) : joinRequestSent ? (
                                    <>
                                        <div className="text-center py-4">
                                            <span style={{ fontSize: 40 }}>✅</span>
                                            <h2 className="text-lg font-bold mt-3" style={{ color: '#3D2008' }}>
                                                연결 요청을 보냈습니다
                                            </h2>
                                            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#7a6e5e' }}>
                                                {selectedFoundPerson?.name}님에게 연결 요청을 보냈습니다.<br />
                                                승인 후 가족트리에 추가됩니다.
                                            </p>
                                            <p className="text-xs mt-2" style={{ color: '#9a9a8a' }}>
                                                승인 대기 중에도 본인 박물관을 만드실 수 있습니다.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white"
                                            style={{ background: '#C4A84F' }}
                                        >
                                            내 박물관도 만들기 →
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center py-4">
                                            <span style={{ fontSize: 40 }}>🌱</span>
                                            <h2 className="text-lg font-bold mt-3" style={{ color: '#3D2008' }}>
                                                가문의 첫 박물관 주인이 되세요!
                                            </h2>
                                            <p className="text-sm mt-2" style={{ color: '#7a6e5e' }}>
                                                "{familySearchName}" 이름으로 된 가족 박물관을 찾지 못했습니다.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full mt-4 py-2.5 rounded-lg text-sm font-bold text-white"
                                            style={{ background: '#5A9460' }}
                                        >
                                            가문의 첫 박물관 만들기 →
                                        </button>
                                    </>
                                )}
                            </>
                        )}

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

                        {/* ═══ Step 2: Storage Selection ═══ */}
                        {step === 2 && (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e0f0ff' }}>
                                        <HardDrive className="w-8 h-8" style={{ color: '#3b82f6' }} />
                                    </div>
                                    <h1 className="text-2xl font-bold" style={{ color: '#1E2A0E' }}>저장소 연결</h1>
                                    <p className="mt-2" style={{ color: '#7a6e5e' }}>사진은 본인의 클라우드에 안전하게 저장됩니다.</p>
                                </div>

                                <div className="space-y-3">
                                    {/* Google Drive */}
                                    <button
                                        onClick={() => driveStatus === 'connected' ? null : handleConnectDrive()}
                                        disabled={driveConnecting}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer disabled:opacity-50"
                                        style={{
                                            borderColor: driveStatus === 'connected' ? '#5A9460' : '#e8e0d0',
                                            background: driveStatus === 'connected' ? '#f0faf0' : '#fff',
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#4285F418' }}>
                                            <HardDrive size={20} style={{ color: '#4285F4' }} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-bold text-[#3D2008]">Google Drive</div>
                                            <div className="text-xs text-[#7A6E5E]">
                                                {driveConnecting ? '연결 중...' : driveStatus === 'connected' ? '연결됨 ✓' : 'Google 계정으로 연결'}
                                            </div>
                                        </div>
                                        {driveStatus === 'connected' && <Check size={18} style={{ color: '#5A9460' }} />}
                                    </button>

                                    {/* OneDrive */}
                                    <button
                                        onClick={() => onedriveStatus === 'connected' ? null : handleConnectOneDrive()}
                                        disabled={onedriveConnecting}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer disabled:opacity-50"
                                        style={{
                                            borderColor: onedriveStatus === 'connected' ? '#5A9460' : '#e8e0d0',
                                            background: onedriveStatus === 'connected' ? '#f0faf0' : '#fff',
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0078D418' }}>
                                            <Cloud size={20} style={{ color: '#0078D4' }} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-bold text-[#3D2008]">OneDrive</div>
                                            <div className="text-xs text-[#7A6E5E]">
                                                {onedriveConnecting ? '연결 중...' : onedriveStatus === 'connected' ? '연결됨 ✓' : 'Microsoft 계정으로 연결'}
                                            </div>
                                        </div>
                                        {onedriveStatus === 'connected' && <Check size={18} style={{ color: '#5A9460' }} />}
                                    </button>

                                    {/* Dropbox */}
                                    <button
                                        onClick={() => dropboxStatus === 'connected' ? null : handleConnectDropbox()}
                                        disabled={dropboxConnecting}
                                        className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition cursor-pointer disabled:opacity-50"
                                        style={{
                                            borderColor: dropboxStatus === 'connected' ? '#5A9460' : '#e8e0d0',
                                            background: dropboxStatus === 'connected' ? '#f0faf0' : '#fff',
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#0061FF18' }}>
                                            <Cloud size={20} style={{ color: '#0061FF' }} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-sm font-bold text-[#3D2008]">Dropbox</div>
                                            <div className="text-xs text-[#7A6E5E]">
                                                {dropboxConnecting ? '연결 중...' : dropboxStatus === 'connected' ? '연결됨 ✓' : 'Dropbox 계정으로 연결'}
                                            </div>
                                        </div>
                                        {dropboxStatus === 'connected' && <Check size={18} style={{ color: '#5A9460' }} />}
                                    </button>

                                    {error && <p className="text-xs text-red-500">{error}</p>}

                                    <div className="flex gap-3 mt-2">
                                        <button
                                            onClick={() => setStep(3)}
                                            className="flex-1 py-3 rounded-xl font-semibold text-sm transition"
                                            style={{ background: '#f0ece4', color: '#5a5040' }}
                                        >
                                            {t.skipLater || '나중에'}
                                        </button>
                                        {(driveStatus === 'connected' || onedriveStatus === 'connected' || dropboxStatus === 'connected') && (
                                            <button
                                                onClick={() => setStep(3)}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition"
                                                style={{ background: '#5A9460' }}
                                            >
                                                {t.step2Next || '다음'} <ArrowRight size={16} />
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
                                                        navigator.share({ title: 'Family Heritage Museum Invite', url: inviteUrl });
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
