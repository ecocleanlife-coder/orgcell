import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Camera, User, Calendar, Building2, ChevronRight, Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const SUBDOMAIN_REGEX = /^[a-z0-9]{2,30}$/;

export default function OnboardingSetupPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuthStore();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '',
        birth_date: '',
        gender: '',
        bio1: '',
        bio2: '',
        bio3: '',
        subdomain: '',
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [subdomainStatus, setSubdomainStatus] = useState(null); // null | 'checking' | 'ok' | 'taken' | 'invalid'

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/auth/login', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // 서브도메인 중복 확인 (debounce)
    useEffect(() => {
        if (!form.subdomain) { setSubdomainStatus(null); return; }
        if (!SUBDOMAIN_REGEX.test(form.subdomain)) { setSubdomainStatus('invalid'); return; }

        setSubdomainStatus('checking');
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/domain/check?subdomain=${form.subdomain}`);
                setSubdomainStatus(res.data.available ? 'ok' : 'taken');
            } catch {
                setSubdomainStatus(null);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.subdomain]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        if (!form.birth_date)  return setError('생년월일을 입력해주세요.');
        if (!form.gender)      return setError('성별을 선택해주세요.');
        if (!form.subdomain)   return setError('박물관 주소를 입력해주세요.');
        if (subdomainStatus !== 'ok') return setError('박물관 주소를 확인해주세요.');

        setSubmitting(true);
        try {
            // 1. 박물관 + 관장 person 생성
            const res = await axios.post('/api/sites', {
                subdomain: form.subdomain,
                curator_name: form.name.trim(),
                curator_gender: form.gender,
                birth_date: form.birth_date,
                bio1: form.bio1 || null,
                bio2: form.bio2 || null,
                bio3: form.bio3 || null,
                display_name: form.name.trim(),
            });

            const siteData = res.data.data;
            const siteId = siteData.id;
            const curatorIntId = siteData.curator_int_id;

            // 2. 프로필 사진 업로드 (선택)
            if (photo && siteId && curatorIntId) {
                try {
                    const fd = new FormData();
                    fd.append('photo', photo);
                    await axios.post(`/api/persons/${siteId}/${curatorIntId}/photo`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                } catch (photoErr) {
                    console.warn('사진 업로드 실패 (계속 진행):', photoErr.message);
                }
            }

            // 3. 자료실로 이동
            navigate(`/${form.subdomain}/archive`, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || '박물관 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    const subdomainHint = {
        null:      null,
        checking:  { color: '#A09888', text: '확인 중...' },
        ok:        { color: '#4a7a3a', text: '✓ 사용 가능한 주소입니다' },
        taken:     { color: '#c0392b', text: '이미 사용 중인 주소입니다' },
        invalid:   { color: '#c0392b', text: '영문 소문자와 숫자만, 2~30자' },
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

            {/* 헤더 */}
            <div className="text-center mb-8">
                <div className="text-3xl mb-2" style={{ fontFamily: 'Georgia, serif', color: '#3D2008', fontWeight: 800 }}>
                    Orgcell
                </div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: '#3D2008' }}>
                    나의 박물관을 시작합니다
                </h1>
                <p style={{ color: '#8a7a60', fontSize: 15 }}>
                    가족의 역사를 기록하는 첫 걸음입니다
                </p>
            </div>

            {/* 카드 */}
            <div className="w-full max-w-md rounded-2xl p-8 shadow-sm"
                style={{ background: '#FFFFFF', border: '1px solid #E8E0D0' }}>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* 프로필 사진 */}
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                            style={{ background: '#F0EBE0', border: '2px dashed #C8BCA8' }}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="프로필" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <Camera size={22} style={{ color: '#A09888' }} />
                                    <span style={{ fontSize: 10, color: '#A09888' }}>사진 추가</span>
                                </div>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoChange}
                        />
                    </div>

                    {/* 이름 */}
                    <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                            이름 <span style={{ color: '#c0392b' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="홍길동"
                            className="w-full px-4 py-2.5 rounded-xl outline-none text-sm transition-all"
                            style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: '#3D2008' }}
                            onFocus={e => e.target.style.borderColor = '#8a7040'}
                            onBlur={e => e.target.style.borderColor = '#DDD5C8'}
                        />
                    </div>

                    {/* 생년월일 + 성별 */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                                생년월일 <span style={{ color: '#c0392b' }}>*</span>
                            </label>
                            <input
                                type="date"
                                value={form.birth_date}
                                onChange={e => set('birth_date', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                                style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: '#3D2008' }}
                                onFocus={e => e.target.style.borderColor = '#8a7040'}
                                onBlur={e => e.target.style.borderColor = '#DDD5C8'}
                            />
                        </div>
                        <div className="w-28">
                            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                                성별 <span style={{ color: '#c0392b' }}>*</span>
                            </label>
                            <select
                                value={form.gender}
                                onChange={e => set('gender', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                                style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: form.gender ? '#3D2008' : '#A09888' }}
                            >
                                <option value="" disabled>선택</option>
                                <option value="male">남성</option>
                                <option value="female">여성</option>
                            </select>
                        </div>
                    </div>

                    {/* 대표정보 */}
                    <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                            대표정보 <span style={{ fontSize: 12, color: '#A09888', fontWeight: 400 }}>(선택 · 직업, 별칭, 고향 등)</span>
                        </label>
                        <div className="space-y-2">
                            {['bio1', 'bio2', 'bio3'].map((key, i) => (
                                <input
                                    key={key}
                                    type="text"
                                    value={form[key]}
                                    onChange={e => set(key, e.target.value)}
                                    placeholder={['예: 교사, 의사, 농부...', '예: 서울 출생', '예: 홍씨 종중 23세손'][i]}
                                    className="w-full px-4 py-2 rounded-xl outline-none text-sm"
                                    style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: '#3D2008' }}
                                    onFocus={e => e.target.style.borderColor = '#8a7040'}
                                    onBlur={e => e.target.style.borderColor = '#DDD5C8'}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 구분선 */}
                    <div style={{ borderTop: '1px solid #EDE7D9', paddingTop: 4 }} />

                    {/* 박물관 주소 */}
                    <div>
                        <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                            박물관 주소 <span style={{ color: '#c0392b' }}>*</span>
                        </label>
                        <div className="flex items-center rounded-xl overflow-hidden"
                            style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7' }}>
                            <span className="px-3 py-2.5 text-sm shrink-0" style={{ color: '#A09888', borderRight: '1px solid #DDD5C8', background: '#F0EBE0' }}>
                                orgcell.com/
                            </span>
                            <input
                                type="text"
                                value={form.subdomain}
                                onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                                placeholder="lee, kim, park..."
                                className="flex-1 px-3 py-2.5 outline-none text-sm bg-transparent"
                                style={{ color: '#3D2008' }}
                                maxLength={30}
                            />
                        </div>
                        {subdomainHint && (
                            <p className="mt-1 text-xs" style={{ color: subdomainHint.color }}>
                                {subdomainHint.text}
                            </p>
                        )}
                        <p className="mt-1 text-xs" style={{ color: '#B0A090' }}>
                            영문 소문자·숫자만 사용 가능 · 변경 불가
                        </p>
                    </div>

                    {/* 에러 */}
                    {error && (
                        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#FDF0EE', color: '#c0392b', border: '1px solid #F5C6C0' }}>
                            {error}
                        </div>
                    )}

                    {/* 제출 버튼 */}
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

            {/* 하단 안내 */}
            <p className="mt-6 text-xs text-center" style={{ color: '#B0A090', maxWidth: 360 }}>
                박물관을 만들면 가족 구성원을 초대하고 사진·영상·음성 기록을 함께 보관할 수 있습니다.
            </p>
        </div>
    );
}
