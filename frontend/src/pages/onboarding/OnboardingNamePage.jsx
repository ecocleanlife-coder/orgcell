import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

// 한글 → 영문 로마자 변환 (간이)
const KOREAN_MAP = {
    '이': 'lee', '김': 'kim', '박': 'park', '최': 'choi', '정': 'jung',
    '조': 'cho', '강': 'kang', '윤': 'yoon', '장': 'jang', '임': 'lim',
    '한': 'han', '오': 'oh', '서': 'seo', '신': 'shin', '권': 'kwon',
    '황': 'hwang', '안': 'ahn', '송': 'song', '류': 'ryu', '전': 'jeon',
    '홍': 'hong', '고': 'ko', '문': 'moon', '양': 'yang', '손': 'son',
    '배': 'bae', '백': 'baek', '허': 'heo', '유': 'yoo', '남': 'nam',
    '심': 'shim', '노': 'noh', '하': 'ha', '곽': 'kwak', '성': 'sung',
    '차': 'cha', '주': 'joo', '우': 'woo', '구': 'koo', '민': 'min',
    '탁': 'tak', '방': 'bang', '천': 'chun', '봉': 'bong', '옥': 'ok',
    '가족': 'family', '박물관': 'museum', '의': '',
};

function toSlug(name) {
    let result = name.trim().toLowerCase();

    // 한글 단어 → 영문 변환
    Object.entries(KOREAN_MAP).forEach(([kr, en]) => {
        result = result.replace(new RegExp(kr, 'g'), en);
    });

    // 남은 한글 제거, 영문/숫자/하이픈만 유지
    result = result
        .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20);

    return result;
}

export default function OnboardingNamePage() {
    const navigate = useNavigate();
    const { startOnboarding, setCurrentStep, completeStep, setMuseumName } = useOnboardingStore();
    const { user, isAuthenticated } = useAuthStore();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
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

    // 이름 변경 → slug 자동 생성 (API 호출 없음)
    const handleNameChange = (val) => {
        setName(val);
        setError('');
        if (!slugEdited) {
            setSlug(toSlug(val));
            setSlugError('');
        }
    };

    // slug 직접 편집
    const handleSlugChange = (val) => {
        const clean = val.toLowerCase()
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .slice(0, 20);
        setSlug(clean);
        setSlugEdited(true);
        setSlugError('');
    };

    // [다음] 클릭 시에만 중복 체크 + 생성
    const handleNext = async () => {
        if (!name.trim() || creating) return;

        const finalSlug = slug.length >= 3
            ? slug
            : (user?.name || 'family').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'myfamily';

        if (finalSlug.length < 3) {
            setSlugError('주소는 3자 이상이어야 합니다');
            return;
        }

        setCreating(true);
        setError('');
        setSlugError('');

        try {
            // 중복 체크
            const checkRes = await axios.get(`/api/domain/check?subdomain=${finalSlug}`);
            if (checkRes.data?.success && !checkRes.data.available) {
                setSlugError('이미 사용 중인 주소예요. 다른 주소를 입력해주세요.');
                setCreating(false);
                return;
            }

            // 사이트 생성
            const res = await axios.post('/api/sites', {
                subdomain: finalSlug,
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

                {/* 박물관 이름 입력 */}
                <label className="block w-full mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: '#5A5A4A' }}>
                    박물관 이름
                </label>
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

                {error && (
                    <p style={{ fontSize: 13, color: '#E74C3C', marginTop: 6, textAlign: 'center' }}>
                        {error}
                    </p>
                )}

                {/* 박물관 주소 입력 */}
                <label className="block w-full mt-5 mb-1.5" style={{ fontSize: 13, fontWeight: 600, color: '#5A5A4A' }}>
                    박물관 주소
                </label>
                <div className="flex items-center w-full rounded-xl overflow-hidden"
                    style={{ border: slugError ? '2px solid #E74C3C' : '2px solid #E8E3D8', background: '#fff' }}>
                    <span className="shrink-0 px-3 py-3 text-sm" style={{ color: '#A09882', background: '#F5F3EE', borderRight: '1px solid #E8E3D8' }}>
                        orgcell.com /
                    </span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="my-family"
                        maxLength={20}
                        style={{
                            flex: 1, height: 48, border: 'none', outline: 'none',
                            padding: '0 12px', fontSize: 15, color: '#3D2008',
                            background: 'transparent',
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleNext(); }}
                    />
                </div>

                <p className="w-full mt-1.5" style={{ fontSize: 11, color: '#A09882' }}>
                    영문 소문자, 숫자, 하이픈만 사용 (3~20자)
                </p>

                {slugError && (
                    <p className="w-full" style={{ fontSize: 13, color: '#E74C3C', marginTop: 4 }}>
                        {slugError}
                    </p>
                )}

                <p className="w-full mt-1" style={{ fontSize: 11, color: '#D97706' }}>
                    ⚠️ 주소는 한번 정하면 변경이 어렵습니다
                </p>

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
