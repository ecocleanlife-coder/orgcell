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
    const [subdomain, setSubdomain] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [checking, setChecking] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        startOnboarding();
        setCurrentStep('name');
    }, []);

    // 이미 사이트가 있으면 바로 초대 단계로
    useEffect(() => {
        if (!isAuthenticated) return;
        axios.get('/api/sites/mine')
            .then(({ data }) => {
                if (data.data?.subdomain) {
                    completeStep('name');
                    navigate('/onboarding/invite', { replace: true });
                }
            })
            .catch(() => {});
    }, [isAuthenticated]);

    // 이름 → subdomain 자동 생성
    const handleNameChange = (val) => {
        setName(val);
        setError('');
        setIsAvailable(null);

        // 한글 이름에서 subdomain 후보 생성
        const clean = val.trim().toLowerCase()
            .replace(/[가-힣]+/g, (match) => match) // 한글 유지
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9가-힣-]/g, '');

        // 영문 subdomain 자동 추출 (영문자/숫자만)
        const sub = val.trim().toLowerCase()
            .replace(/[^a-z0-9]/gi, '')
            .slice(0, 20);

        if (sub.length >= 3) {
            setSubdomain(sub);
            checkSubdomain(sub);
        } else {
            setSubdomain('');
        }
    };

    const checkSubdomain = async (val) => {
        if (val.length < 3) return;
        setChecking(true);
        try {
            const res = await axios.get(`/api/domain/check?subdomain=${val}`);
            if (res.data?.success) {
                setIsAvailable(res.data.available);
                if (!res.data.available) {
                    setError('이미 사용 중인 이름이에요. 다른 이름을 시도해보세요.');
                }
            }
        } catch {
            // 체크 실패 시 그냥 진행 가능하게
        } finally {
            setChecking(false);
        }
    };

    const handleNext = async () => {
        if (!name.trim() || creating) return;

        setCreating(true);
        setError('');

        try {
            // subdomain이 없거나 너무 짧으면 user name 기반 생성
            const finalSubdomain = subdomain.length >= 3
                ? subdomain
                : (user?.name || 'family').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'myfamily';

            const res = await axios.post('/api/sites', {
                subdomain: finalSubdomain,
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
                setError('이미 사용 중인 이름이에요. 다른 이름을 시도해보세요.');
            } else {
                setError(msg);
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
            <OnboardingProgress current="name" />

            <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
                {/* 아이콘 */}
                <div style={{ fontSize: 64, marginBottom: 24, lineHeight: 1 }}>🏛️</div>

                {/* 제목 */}
                <h1 style={{
                    fontSize: 24, fontWeight: 800, color: '#1E2A0E',
                    fontFamily: 'Georgia, serif', textAlign: 'center',
                    marginBottom: 8, lineHeight: 1.3,
                }}>
                    우리 가족 박물관<br />이름을 지어주세요
                </h1>

                {/* 서브 */}
                <p style={{ fontSize: 14, color: '#7A6E5E', textAlign: 'center', marginBottom: 32 }}>
                    나중에 언제든지 바꿀 수 있어요
                </p>

                {/* 입력창 */}
                <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="예: 이한봉 가족 박물관"
                    maxLength={30}
                    style={{
                        width: '100%', height: 52, borderRadius: 14,
                        border: error ? '2px solid #E74C3C' : '2px solid #E8E3D8',
                        padding: '0 16px', fontSize: 16,
                        fontFamily: 'Georgia, serif', color: '#3D2008',
                        background: '#fff', outline: 'none',
                        transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { if (!error) e.target.style.borderColor = '#3D2008'; }}
                    onBlur={(e) => { if (!error) e.target.style.borderColor = '#E8E3D8'; }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                />

                {/* 주소 미리보기 */}
                {subdomain && (
                    <p style={{ fontSize: 12, color: '#A09882', marginTop: 8, textAlign: 'center' }}>
                        주소: <strong style={{ color: '#5A9460' }}>{subdomain}.orgcell.com</strong>
                        {checking && <span style={{ marginLeft: 6 }}>확인 중...</span>}
                        {isAvailable === true && <span style={{ marginLeft: 6, color: '#27AE60' }}>사용 가능</span>}
                    </p>
                )}

                {/* 에러 */}
                {error && (
                    <p style={{ fontSize: 13, color: '#E74C3C', marginTop: 8, textAlign: 'center' }}>
                        {error}
                    </p>
                )}

                {/* 다음 버튼 */}
                <button
                    onClick={handleNext}
                    disabled={!name.trim() || creating}
                    className="active:scale-[0.98]"
                    style={{
                        width: '100%', height: 52, borderRadius: 14,
                        background: name.trim() ? 'linear-gradient(135deg, #4CAF50, #3D9B42)' : '#E8E3D8',
                        color: name.trim() ? '#fff' : '#A09882',
                        fontSize: 17, fontWeight: 700, border: 'none',
                        cursor: name.trim() ? 'pointer' : 'default',
                        marginTop: 24, transition: 'all 0.2s',
                        boxShadow: name.trim() ? '0 4px 16px rgba(76,175,80,0.3)' : 'none',
                    }}
                >
                    {creating ? '만들고 있어요...' : '다음'}
                </button>
            </div>
        </div>
    );
}
