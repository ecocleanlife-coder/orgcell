import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, ChevronRight, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const SUBDOMAIN_REGEX = /^[a-z0-9]{2,30}$/;

export default function OnboardingSetupPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuthStore();

    const [subdomain, setSubdomain] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [subdomainStatus, setSubdomainStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'invalid'
    const [koreanWarning, setKoreanWarning] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/auth/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // 서브도메인 중복 확인 (debounce)
    useEffect(() => {
        if (!subdomain) { setSubdomainStatus(null); return; }
        if (!SUBDOMAIN_REGEX.test(subdomain)) { setSubdomainStatus('invalid'); return; }

        setSubdomainStatus('checking');
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/domain/check?subdomain=${subdomain}`);
                setSubdomainStatus(res.data.available ? 'ok' : 'taken');
            } catch {
                setSubdomainStatus(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [subdomain]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!subdomain) return setError('박물관 주소를 입력해주세요.');
        if (subdomainStatus !== 'ok') return setError('박물관 주소를 확인해주세요.');

        setSubmitting(true);
        try {
            await axios.post('/api/sites', { subdomain });
            navigate(`/${subdomain}/archive`, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || '박물관 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    const hint = {
        null:     null,
        checking: { color: '#A09888', text: '확인 중...' },
        ok:       { color: '#4a7a3a', text: '✓ 사용 가능한 주소입니다' },
        taken:    { color: '#c0392b', text: '이미 사용 중인 주소입니다' },
        invalid:  { color: '#c0392b', text: '영문 소문자와 숫자만, 2~30자' },
    }[subdomainStatus];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF5' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#8a7040' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4"
            style={{ background: '#FAFAF5', fontFamily: 'system-ui, sans-serif' }}>

            <div className="text-center mb-8">
                <div className="text-3xl mb-2" style={{ fontFamily: 'Georgia, serif', color: '#3D2008', fontWeight: 800 }}>
                    Orgcell
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: '#3D2008' }}>
                    나의 박물관을 시작합니다
                </h1>
                <p style={{ color: '#8a7a60', fontSize: 15 }}>
                    주소를 정하면 바로 자료실로 이동합니다
                </p>
            </div>

            <div className="w-full max-w-sm rounded-2xl p-8 shadow-sm"
                style={{ background: '#FFFFFF', border: '1px solid #E8E0D0' }}>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                            박물관 주소 <span style={{ color: '#c0392b' }}>*</span>
                        </label>
                        <div className="flex items-center rounded-xl overflow-hidden"
                            style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7' }}>
                            <span className="px-3 py-2.5 text-sm shrink-0"
                                style={{ color: '#A09888', borderRight: '1px solid #DDD5C8', background: '#F0EBE0' }}>
                                orgcell.com/
                            </span>
                            <input
                                type="text"
                                value={subdomain}
                                onChange={e => {
                                    const raw = e.target.value;
                                    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(raw)) {
                                        setKoreanWarning(true);
                                        setTimeout(() => setKoreanWarning(false), 3000);
                                    } else {
                                        setKoreanWarning(false);
                                    }
                                    setSubdomain(raw.toLowerCase().replace(/[^a-z0-9]/g, ''));
                                }}
                                placeholder="lee, kim, park..."
                                className="flex-1 px-3 py-2.5 outline-none text-sm bg-transparent"
                                style={{ color: '#3D2008' }}
                                maxLength={30}
                                autoFocus
                            />
                        </div>
                        {koreanWarning && (
                            <p className="mt-1 text-xs" style={{ color: '#c0392b' }}>
                                도메인은 영문 소문자와 숫자만 입력해주세요
                            </p>
                        )}
                        {!koreanWarning && hint && (
                            <p className="mt-1 text-xs" style={{ color: hint.color }}>{hint.text}</p>
                        )}
                        <p className="mt-1 text-xs" style={{ color: '#B0A090' }}>
                            영문 소문자·숫자만 · 변경 불가
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-xl px-4 py-3 text-sm"
                            style={{ background: '#FDF0EE', color: '#c0392b', border: '1px solid #F5C6C0' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || subdomainStatus !== 'ok'}
                        className="w-full py-3 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2 transition-all"
                        style={{
                            background: submitting || subdomainStatus !== 'ok'
                                ? '#C8BCA8'
                                : 'linear-gradient(135deg, #5A9460, #4A7F4A)',
                            cursor: submitting || subdomainStatus !== 'ok' ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting ? (
                            <><Loader2 size={18} className="animate-spin" /> 만드는 중...</>
                        ) : (
                            <><Building2 size={18} /> 박물관 만들기 <ChevronRight size={16} /></>
                        )}
                    </button>
                </form>
            </div>

            <p className="mt-6 text-xs text-center" style={{ color: '#B0A090', maxWidth: 320 }}>
                주소 생성 후 자료실에서 이름·생년월일·가족을 등록하세요
            </p>
        </div>
    );
}
