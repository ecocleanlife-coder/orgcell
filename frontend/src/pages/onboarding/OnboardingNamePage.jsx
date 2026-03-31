import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

export default function OnboardingNamePage() {
    const navigate = useNavigate();
    const { startOnboarding, setCurrentStep, completeStep, setMuseumName } = useOnboardingStore();
    const { user, isAuthenticated } = useAuthStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [slugError, setSlugError] = useState('');

    useEffect(() => {
        startOnboarding();
        setCurrentStep('name');
    }, []);

    // 이미 사이트가 있으면 초대 단계로 (401 무시)
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get('/api/sites/mine', { _skipAuthToast: true })
            .then(({ data }) => {
                if (data.data?.subdomain) {
                    completeStep('name');
                    navigate('/onboarding/invite', { replace: true });
                }
            })
            .catch(() => {});
    }, [isAuthenticated]);

    const handleNameChange = (val) => {
        setName(val);
        setError('');
    };

    // 주소: 영문 소문자, 숫자, 하이픈만 허용
    const handleSlugChange = (val) => {
        const clean = val
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .slice(0, 20);
        setSlug(clean);
        setSlugError('');
    };

    // [다음] 클릭 시에만 중복 체크 + 생성
    const handleNext = async () => {
        if (!name.trim() || !slug.trim() || creating) return;

        if (slug.length < 3) {
            setSlugError('주소는 3자 이상이어야 합니다');
            return;
        }

        setCreating(true);
        setError('');
        setSlugError('');

        try {
            // 중복 체크
            const checkRes = await axios.get(`/api/domain/check?subdomain=${slug}`);
            if (checkRes.data?.success && !checkRes.data.available) {
                setSlugError('이미 사용 중인 주소예요. 다른 주소를 입력해주세요.');
                setCreating(false);
                return;
            }

            // 사이트 생성
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
                navigate('/onboarding/invite');
            } else {
                setError(res.data?.message || '생성에 실패했어요. 다시 시도해주세요.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || '생성에 실패했어요.';
            if (msg.includes('taken') || msg.includes('exists')) {
                setSlugError('이미 사용 중인 주소예요. 다른 주소를 입력해주세요.');
            } else {
                setError(msg);
            }
        } finally {
            setCreating(false);
        }
    };

    const canProceed = name.trim().length > 0 && slug.trim().length >= 3;

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
                    우리 가족 박물관<br />이름을 지어주세요
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
                    placeholder="예: 이한봉 가족 박물관"
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
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
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
                        border: slugError ? '2px solid #E74C3C' : '2px solid #E8E3D8',
                        background: '#fff',
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
                        style={{
                            flex: 1, height: 60, border: 'none', outline: 'none',
                            padding: '0 16px', fontSize: 20, color: '#3D2008',
                            background: 'transparent',
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                    />
                </div>

                <p className="w-full mt-2" style={{ fontSize: 14, color: '#A09882', lineHeight: 1.5 }}>
                    영문 소문자, 숫자, 하이픈만 사용 가능합니다 (3~20자)
                </p>

                {slugError && (
                    <p className="w-full mt-1" style={{ fontSize: 15, color: '#E74C3C' }}>
                        {slugError}
                    </p>
                )}

                <p className="w-full mt-2" style={{ fontSize: 14, color: '#D97706', fontWeight: 600 }}>
                    ⚠️ 주소는 한번 정하면 변경이 어렵습니다
                </p>

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
                        marginTop: 32, transition: 'all 0.2s',
                        boxShadow: canProceed ? '0 6px 20px rgba(76,175,80,0.3)' : 'none',
                    }}
                >
                    {creating ? '만들고 있어요...' : '다음'}
                </button>
            </div>
        </div>
    );
}
