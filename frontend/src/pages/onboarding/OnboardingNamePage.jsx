import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

const SLUG_REGEX = /^[a-z0-9-]*$/;

export default function OnboardingNamePage() {
    const navigate = useNavigate();
    const { startOnboarding, setCurrentStep, completeStep, finishOnboarding, setMuseumName } = useOnboardingStore();
    const { user, isAuthenticated, isLoading } = useAuthStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [slugError, setSlugError] = useState('');
    const [slugWarning, setSlugWarning] = useState('');

    // 슬러그 사용 가능 여부 상태
    const [slugAvailable, setSlugAvailable] = useState(null); // null | true | false
    const [slugChecking, setSlugChecking] = useState(false);
    const [slugConfirmed, setSlugConfirmed] = useState(false);

    useEffect(() => {
        startOnboarding();
        setCurrentStep('name');
    }, []);

    // 비로그인 사용자는 로그인 페이지로 리다이렉트
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/auth/login?next=onboarding/name', { replace: true });
        }
    }, [isLoading, isAuthenticated]);

    // 이미 사이트가 있으면 대시보드로 직행
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get('/api/sites/mine', { _skipAuthToast: true })
            .then(({ data }) => {
                if (data.data?.subdomain) {
                    completeStep('name');
                    finishOnboarding();
                    navigate(`/${data.data.subdomain}`, { replace: true });
                }
            })
            .catch(() => {});
    }, [isAuthenticated]);

    const handleNameChange = (val) => {
        setName(val);
        setError('');
    };

    // 주소: 대문자→소문자 자동 변환, 허용 외 문자 감지 시 경고
    const handleSlugChange = (rawVal) => {
        const lowered = rawVal.toLowerCase();
        const clean = lowered
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .slice(0, 20);

        setSlug(clean);
        setSlugError('');
        setSlugAvailable(null);
        setSlugConfirmed(false);

        // 원본에 허용 외 문자가 있었는지 감지
        if (!SLUG_REGEX.test(lowered)) {
            setSlugWarning('영문 소문자, 숫자, 하이픈만 사용 가능합니다 (3~20자)');
        } else {
            setSlugWarning('');
        }
    };

    // 주소 사용 가능 여부 확인
    const handleCheckSlug = async () => {
        if (slug.length < 3) {
            setSlugError('주소는 3자 이상이어야 합니다');
            return;
        }
        setSlugChecking(true);
        setSlugError('');
        setSlugAvailable(null);

        try {
            const res = await axios.get(`/api/domain/check?subdomain=${slug}`);
            if (res.data?.success && res.data.available) {
                setSlugAvailable(true);
            } else {
                setSlugAvailable(false);
                setSlugError('이미 사용 중인 주소예요. 다른 주소를 입력해주세요.');
            }
        } catch {
            setSlugError('확인에 실패했어요. 다시 시도해주세요.');
        } finally {
            setSlugChecking(false);
        }
    };

    // "이 주소로 할게요" 확인
    const handleConfirmSlug = () => {
        setSlugConfirmed(true);
    };

    // [다음] 클릭 → 사이트 생성
    const handleNext = async () => {
        if (!name.trim() || !slugConfirmed || creating) return;

        setCreating(true);
        setError('');

        try {
            const res = await axios.post('/api/sites', {
                subdomain: slug,
                title: name.trim(),
                theme: 'modern',
            });

            if (res.data?.success) {
                const newSub = res.data.data.subdomain;
                localStorage.setItem('orgcell_family_setup', JSON.stringify({ subdomain: newSub }));
                setMuseumName(name.trim());
                completeStep('name');
                finishOnboarding();
                navigate(`/${newSub}`);
            } else {
                setError(res.data?.message || '생성에 실패했어요. 다시 시도해주세요.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || '생성에 실패했어요.';
            if (msg.includes('taken') || msg.includes('exists')) {
                setSlugError('이미 사용 중인 주소예요. 다른 주소를 입력해주세요.');
                setSlugAvailable(false);
                setSlugConfirmed(false);
            } else {
                setError(msg);
            }
        } finally {
            setCreating(false);
        }
    };

    const canCheck = slug.length >= 3 && slug.length <= 20 && !slugWarning;
    const canProceed = name.trim().length > 0 && slugConfirmed;

    // 로딩 중이면 로더 표시
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
            <OnboardingProgress current="name" />

            <div className="flex-1 flex flex-col items-center justify-center px-5"
                style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>

                {/* 아이콘 */}
                <div style={{ fontSize: 72, marginBottom: 20, lineHeight: 1 }}>🏛️</div>

                {/* 제목 */}
                <h1 style={{
                    fontSize: 28, fontWeight: 800, color: '#1E2A0E',
                    fontFamily: 'Georgia, serif', textAlign: 'center',
                    marginBottom: 10, lineHeight: 1.35,
                }}>
                    우리 가족유산박물관<br />이름을 지어주세요
                </h1>

                <p style={{ fontSize: 16, color: '#7A6E5E', textAlign: 'center', marginBottom: 40, lineHeight: 1.5 }}>
                    나중에 언제든지 바꿀 수 있어요
                </p>

                {/* ─── 박물관 이름 ─── */}
                <label className="block w-full mb-2"
                    style={{ fontSize: 16, fontWeight: 700, color: '#3D2008' }}>
                    박물관 이름
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="예: 이한봉 가족유산박물관"
                    maxLength={30}
                    className="w-full"
                    style={{
                        height: 60, borderRadius: 16,
                        border: error ? '2px solid #E74C3C' : '2px solid #E8E3D8',
                        padding: '0 20px', fontSize: 20,
                        fontFamily: 'Georgia, serif', color: '#3D2008',
                        background: '#fff', outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { if (!error) e.target.style.borderColor = '#3D2008'; }}
                    onBlur={(e) => { if (!error) e.target.style.borderColor = '#E8E3D8'; }}
                />

                {error && (
                    <p className="w-full mt-2" style={{ fontSize: 15, color: '#E74C3C' }}>
                        {error}
                    </p>
                )}

                {/* ─── 박물관 주소 ─── */}
                <label className="block w-full mt-8 mb-2"
                    style={{ fontSize: 16, fontWeight: 700, color: '#3D2008' }}>
                    박물관 주소
                </label>
                <div className="flex items-center w-full overflow-hidden"
                    style={{
                        borderRadius: 16,
                        border: slugError ? '2px solid #E74C3C'
                            : slugAvailable ? '2px solid #4CAF50'
                            : slugWarning ? '2px solid #E74C3C'
                            : '2px solid #E8E3D8',
                        background: '#fff',
                        transition: 'border-color 0.2s',
                    }}>
                    <span className="shrink-0 px-4 self-stretch flex items-center"
                        style={{
                            fontSize: 16, color: '#A09882', fontWeight: 500,
                            background: '#F5F3EE', borderRight: '1px solid #E8E3D8',
                        }}>
                        orgcell.com /
                    </span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="my-family"
                        maxLength={20}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{
                            flex: 1, height: 60, border: 'none', outline: 'none',
                            padding: '0 16px', fontSize: 20, color: '#3D2008',
                            background: 'transparent',
                        }}
                    />
                </div>

                {/* 경고/에러/사용가능 메시지 */}
                {slugWarning && !slugError && (
                    <p className="w-full mt-2" style={{ fontSize: 14, color: '#E74C3C', lineHeight: 1.5 }}>
                        {slugWarning}
                    </p>
                )}

                {slugError && (
                    <p className="w-full mt-2" style={{ fontSize: 15, color: '#E74C3C' }}>
                        {slugError}
                    </p>
                )}

                {!slugWarning && !slugError && slugAvailable === null && (
                    <p className="w-full mt-2" style={{ fontSize: 14, color: '#A09882', lineHeight: 1.5 }}>
                        영문 소문자, 숫자, 하이픈만 사용 가능합니다 (3~20자)
                    </p>
                )}

                <p className="w-full mt-2" style={{ fontSize: 14, color: '#D97706', fontWeight: 600 }}>
                    ⚠️ 주소는 한번 정하면 변경이 어렵습니다
                </p>

                {/* ─── 사용 가능 여부 확인 버튼 ─── */}
                {!slugConfirmed && slugAvailable === null && (
                    <button
                        onClick={handleCheckSlug}
                        disabled={!canCheck || slugChecking}
                        className="active:scale-[0.97]"
                        style={{
                            width: '100%', height: 52, borderRadius: 14,
                            background: canCheck ? '#F5F3EE' : '#F0EDE6',
                            color: canCheck ? '#3D2008' : '#A09882',
                            fontSize: 17, fontWeight: 700, border: canCheck ? '2px solid #E8E3D8' : '2px solid #F0EDE6',
                            cursor: canCheck ? 'pointer' : 'default',
                            marginTop: 16, transition: 'all 0.2s',
                        }}
                    >
                        {slugChecking ? '확인 중...' : '주소 사용 가능 여부 확인'}
                    </button>
                )}

                {/* ─── 사용 가능 확인 결과 + 확정 버튼 ─── */}
                {slugAvailable && !slugConfirmed && (
                    <div className="w-full mt-4 rounded-2xl p-5 text-center"
                        style={{ background: '#E8F5E9', border: '2px solid #4CAF50' }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#2E7D32', marginBottom: 4 }}>
                            사용 가능합니다!
                        </p>
                        <p style={{ fontSize: 14, color: '#4CAF50', marginBottom: 16 }}>
                            orgcell.com/<strong>{slug}</strong>
                        </p>
                        <button
                            onClick={handleConfirmSlug}
                            className="active:scale-[0.97]"
                            style={{
                                width: '100%', height: 48, borderRadius: 12,
                                background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                                color: '#fff', fontSize: 16, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(76,175,80,0.3)',
                            }}
                        >
                            이 주소로 할게요
                        </button>
                        <button
                            onClick={() => { setSlugAvailable(null); setSlugConfirmed(false); }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 14, color: '#7A6E5E', marginTop: 8,
                                padding: '6px 0',
                            }}
                        >
                            다른 주소 입력하기
                        </button>
                    </div>
                )}

                {/* ─── 확정 후 안내 ─── */}
                {slugConfirmed && (
                    <div className="w-full mt-4 rounded-xl p-3 flex items-center gap-3"
                        style={{ background: '#E8F5E9', border: '1px solid #C8E6C9' }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#2E7D32' }}>
                                orgcell.com/{slug}
                            </p>
                            <button
                                onClick={() => { setSlugAvailable(null); setSlugConfirmed(false); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 12, color: '#7A6E5E', padding: 0, marginTop: 2,
                                }}
                            >
                                변경하기
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── 다음 버튼 ─── */}
                <button
                    onClick={handleNext}
                    disabled={!canProceed || creating}
                    className="active:scale-[0.97]"
                    style={{
                        width: '100%', height: 60, borderRadius: 16,
                        background: canProceed ? 'linear-gradient(135deg, #4CAF50, #3D9B42)' : '#E8E3D8',
                        color: canProceed ? '#fff' : '#A09882',
                        fontSize: 20, fontWeight: 700, border: 'none',
                        cursor: canProceed ? 'pointer' : 'default',
                        marginTop: 24, transition: 'all 0.2s',
                        boxShadow: canProceed ? '0 6px 20px rgba(76,175,80,0.3)' : 'none',
                    }}
                >
                    {creating ? '만들고 있어요...' : '다음'}
                </button>
            </div>
        </div>
    );
}
