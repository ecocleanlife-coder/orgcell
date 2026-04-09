/**
 * OnboardingSetupPage.jsx — 3단계 온보딩 흐름
 *
 * 1단계: 본인 확인 (법적이름/영문이름/다른이름/생년월일음양력/본관/부모이름)
 * 2단계: 검색 결과 처리 (후보 있음 → 추가확인 / 후보 없음 → 바로 생성)
 * 3단계: 박물관 생성 확인 (subdomain 자동배정 결과 표시, 1단계 정보 그대로 표시)
 *
 * §26-1-1, §26-3, §27
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Building2, ChevronRight, ChevronLeft, Loader2, Search, User, CheckCircle, Plus, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';

// ── 공통 스타일 ──
const PAGE_BG    = '#FAFAF5';
const CARD_BG    = '#FFFFFF';
const BORDER     = '#E8E0D0';
const TEXT_MAIN  = '#3D2008';
const TEXT_SUB   = '#8a7a60';
const TEXT_MUTED = '#B0A090';
const GOLD       = '#8B7355';
const BTN_OK     = 'linear-gradient(135deg, #5A9460, #4A7F4A)';
const BTN_DIS    = '#C8BCA8';
const ERROR_BG   = '#FDF0EE';
const ERROR_CLR  = '#c0392b';

const NAME_TYPES = ['어릴때', '개명전', '별명', '영문명', '기타'];

function Field({ label, required, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#5a4a3a' }}>
                {label} {required && <span style={{ color: ERROR_CLR }}>*</span>}
            </label>
            {hint && <p className="text-xs mb-1.5" style={{ color: TEXT_MUTED }}>{hint}</p>}
            {children}
        </div>
    );
}

function Input({ value, onChange, placeholder, maxLength, type = 'text', autoFocus }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            className="w-full rounded-xl px-3 py-2.5 outline-none text-sm"
            style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }}
        />
    );
}

// 다른 이름 항목 하나
function OtherNameRow({ item, onChange, onRemove }) {
    return (
        <div className="flex gap-2 items-center">
            <input
                value={item.name}
                onChange={(e) => onChange({ ...item, name: e.target.value })}
                placeholder="이름"
                maxLength={30}
                className="flex-1 rounded-lg px-3 py-2 outline-none text-sm"
                style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }}
            />
            <select
                value={item.type}
                onChange={(e) => onChange({ ...item, type: e.target.value })}
                className="rounded-lg px-2 py-2 outline-none text-sm"
                style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_SUB }}>
                {NAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" onClick={onRemove}
                className="p-1 rounded-lg"
                style={{ color: TEXT_MUTED, background: '#F5F0EA' }}>
                <X size={14} />
            </button>
        </div>
    );
}

// ── 생년월일 년/월/일 헬퍼 ──
function birthPartsToDate(y, m, d) {
    if (!y) return '';
    const mm = (m || '').padStart(2, '0');
    const dd = (d || '').padStart(2, '0');
    if (m && d) return `${y}-${mm}-${dd}`;
    if (m) return `${y}-${mm}-01`;
    return `${y}-01-01`;
}

// ── Step 1: 본인 확인 ────────────────────────────────────────────────────────
function Step1({ onNext, initialForm }) {
    const [form, setForm] = useState(() => initialForm || {
        surname_ko: '', given_name: '', name_en: '',
        birth_year: '', birth_month: '', birth_day: '', birth_lunar: false,
        bon_gwan_ko: '',
        parent1_surname: '', parent1_given: '',
        parent2_surname: '', parent2_given: '',
    });
    const [otherNames, setOtherNames] = useState(initialForm?.name_other || []);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const toggle = (k) => () => setForm(f => ({ ...f, [k]: !f[k] }));

    const addOtherName = () => setOtherNames(n => [...n, { name: '', type: '어릴때' }]);
    const updateOtherName = (i, val) => setOtherNames(n => n.map((x, idx) => idx === i ? val : x));
    const removeOtherName = (i) => setOtherNames(n => n.filter((_, idx) => idx !== i));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.surname_ko.trim()) return setError('성(姓)을 입력해주세요.');
        if (!form.given_name.trim()) return setError('이름을 입력해주세요.');

        const birthDate = birthPartsToDate(form.birth_year, form.birth_month, form.birth_day);
        const parent1Full = [form.parent1_surname, form.parent1_given].map(s => s.trim()).filter(Boolean).join('');
        const parent2Full = [form.parent2_surname, form.parent2_given].map(s => s.trim()).filter(Boolean).join('');

        setLoading(true);
        try {
            const validOtherNames = otherNames.filter(n => n.name.trim());
            const res = await axios.post('/api/persons/search', {
                surname_ko:   form.surname_ko.trim(),
                given_name:   form.given_name.trim(),
                birth_date:   birthDate || null,
                birth_lunar:  form.birth_lunar,
                bon_gwan_ko:  form.bon_gwan_ko.trim() || null,
                parent_name1: parent1Full || null,
                parent_name2: parent2Full || null,
                name_other:   validOtherNames,
            });
            onNext({
                form: { ...form, birth_date: birthDate, name_other: validOtherNames },
                candidates: res.data.candidates || [],
            });
        } catch (err) {
            setError(err.response?.data?.message || '검색 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 년도 옵션 생성 (1900 ~ 올해)
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = currentYear; y >= 1900; y--) yearOptions.push(y);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-center mb-4" style={{ color: TEXT_SUB }}>
                기존에 생성된 본인이나 가족의 박물관이 있는지 확인하겠습니다.
            </p>

            {/* 법적 이름 */}
            <div className="flex gap-3">
                <div className="w-1/3">
                    <Field label="성(姓)" required>
                        <Input value={form.surname_ko} onChange={set('surname_ko')}
                            placeholder="이" maxLength={10} autoFocus />
                    </Field>
                </div>
                <div className="flex-1">
                    <Field label="이름" required hint="여권/주민등록상 정확한 이름">
                        <Input value={form.given_name} onChange={set('given_name')}
                            placeholder="한봉" maxLength={20} />
                    </Field>
                </div>
            </div>

            {/* 영문이름 */}
            <Field label="영문이름 (선택)" hint="여권 기재 영문명">
                <Input value={form.name_en} onChange={set('name_en')}
                    placeholder="예: Hanbong Lee" maxLength={60} />
            </Field>

            {/* 다른 이름 */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold" style={{ color: '#5a4a3a' }}>
                        다른 이름 <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>(선택)</span>
                    </label>
                    <button type="button" onClick={addOtherName}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                        style={{ color: GOLD, background: '#F5EFE5', border: `1px solid ${BORDER}` }}>
                        <Plus size={12} /> 추가
                    </button>
                </div>
                {otherNames.length === 0 && (
                    <p className="text-xs" style={{ color: TEXT_MUTED }}>
                        어릴 때 이름, 개명 전 이름, 별명 등
                    </p>
                )}
                <div className="space-y-2 mt-1">
                    {otherNames.map((item, i) => (
                        <OtherNameRow key={i} item={item}
                            onChange={(val) => updateOtherName(i, val)}
                            onRemove={() => removeOtherName(i)} />
                    ))}
                </div>
            </div>

            {/* 생년월일 년/월/일 + 음양력 */}
            <Field label="생년월일">
                <div className="flex gap-2 items-center">
                    <select value={form.birth_year} onChange={set('birth_year')}
                        className="flex-1 rounded-xl px-2 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: form.birth_year ? TEXT_MAIN : TEXT_MUTED }}>
                        <option value="">년</option>
                        {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                    <select value={form.birth_month} onChange={set('birth_month')}
                        className="w-[70px] rounded-xl px-2 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: form.birth_month ? TEXT_MAIN : TEXT_MUTED }}>
                        <option value="">월</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                            <option key={m} value={String(m).padStart(2, '0')}>{m}</option>)}
                    </select>
                    <select value={form.birth_day} onChange={set('birth_day')}
                        className="w-[70px] rounded-xl px-2 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: form.birth_day ? TEXT_MAIN : TEXT_MUTED }}>
                        <option value="">일</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d =>
                            <option key={d} value={String(d).padStart(2, '0')}>{d}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={toggle('birth_lunar')}
                        className="px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                        style={{
                            background: form.birth_lunar ? GOLD : '#F0EBE3',
                            color: form.birth_lunar ? '#fff' : TEXT_SUB,
                            border: form.birth_lunar ? 'none' : `1.5px solid ${BORDER}`,
                        }}>
                        {form.birth_lunar ? '음력 ✓' : '양력'}
                    </button>
                </div>
            </Field>

            {/* 본관 */}
            <Field label="본관 (선택)">
                <Input value={form.bon_gwan_ko} onChange={set('bon_gwan_ko')}
                    placeholder="예: 전주, 경주, 김해…" maxLength={30} />
                <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
                    모르면 비워두세요 — 나중에 입력 가능
                </p>
            </Field>

            {/* 부(父) 이름 — 성/이름 분리 */}
            <Field label="부(父) 이름 (선택)">
                <div className="flex gap-2">
                    <input value={form.parent1_surname} onChange={set('parent1_surname')}
                        placeholder="성" maxLength={10}
                        className="w-1/3 rounded-xl px-3 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }} />
                    <input value={form.parent1_given} onChange={set('parent1_given')}
                        placeholder="이름" maxLength={20}
                        className="flex-1 rounded-xl px-3 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }} />
                </div>
            </Field>

            {/* 모(母) 이름 — 성/이름 분리 */}
            <Field label="모(母) 이름 (선택)">
                <div className="flex gap-2">
                    <input value={form.parent2_surname} onChange={set('parent2_surname')}
                        placeholder="성" maxLength={10}
                        className="w-1/3 rounded-xl px-3 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }} />
                    <input value={form.parent2_given} onChange={set('parent2_given')}
                        placeholder="이름" maxLength={20}
                        className="flex-1 rounded-xl px-3 py-2.5 outline-none text-sm"
                        style={{ border: '1.5px solid #DDD5C8', background: '#FAFAF7', color: TEXT_MAIN }} />
                </div>
            </Field>

            {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: ERROR_BG, color: ERROR_CLR, border: `1px solid #F5C6C0` }}>
                    {error}
                </div>
            )}

            <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2 transition-all"
                style={{ background: loading ? BTN_DIS : BTN_OK, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading
                    ? <><Loader2 size={18} className="animate-spin" /> 확인 중...</>
                    : <><Search size={18} /> 기존 박물관 확인하기 <ChevronRight size={16} /></>}
            </button>
        </form>
    );
}

// ── Step 2: 검색 결과 처리 ───────────────────────────────────────────────────
function Step2({ data, onSelectExisting, onCreateNew, onBack }) {
    const { candidates } = data;
    const [extra, setExtra]       = useState({ birth_place: '', spouse_name: '', children: '', siblings: '' });
    const [selected, setSelected] = useState(null);
    const setE = (k) => (e) => setExtra(f => ({ ...f, [k]: e.target.value }));

    const hasStrongMatch = candidates.some(c => c.match_strength === 'strong' || c.match_strength === 'medium');

    return (
        <div className="space-y-5">
            {candidates.length > 0 ? (
                <>
                    <p className="text-sm font-semibold text-center" style={{ color: GOLD }}>
                        {candidates.length}개의 일치 기록을 찾았습니다.
                    </p>
                    <p className="text-xs text-center" style={{ color: TEXT_SUB }}>
                        아래 정보를 추가로 확인해주세요.
                    </p>

                    {/* 후보 목록 */}
                    <div className="space-y-2">
                        {candidates.map((c) => (
                            <button key={c.person_id}
                                onClick={() => setSelected(c)}
                                className="w-full text-left rounded-xl px-4 py-3 transition-all"
                                style={{
                                    border: selected?.person_id === c.person_id
                                        ? `2px solid ${GOLD}` : '1.5px solid #DDD5C8',
                                    background: selected?.person_id === c.person_id ? '#FDF8F0' : '#FAFAF7',
                                }}>
                                <div className="flex items-center gap-2">
                                    {selected?.person_id === c.person_id &&
                                        <CheckCircle size={16} style={{ color: GOLD }} />}
                                    <div>
                                        <p className="font-semibold text-sm" style={{ color: TEXT_MAIN }}>
                                            {c.name}
                                        </p>
                                        <p className="text-xs" style={{ color: TEXT_SUB }}>
                                            {c.birth_date
                                                ? `${new Date(c.birth_date).getFullYear()}년생${c.birth_lunar ? ' (음력)' : ''}`
                                                : '생년 미상'}
                                            {' · '}
                                            <span style={{ color: GOLD }}>orgcell.com/{c.subdomain}</span>
                                            {' · '}
                                            <span style={{
                                                color: c.match_strength === 'strong' ? '#4a7a3a'
                                                     : c.match_strength === 'medium' ? '#8B7355'
                                                     : TEXT_MUTED,
                                            }}>
                                                {c.match_strength === 'strong' ? '이름+생년 일치'
                                                : c.match_strength === 'medium' ? '이름+날짜 유사'
                                                : '이름 유사'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* 추가 질문 */}
                    {hasStrongMatch && (
                        <div className="space-y-3 rounded-xl p-4" style={{ background: '#F9F7F2', border: '1px solid #E8E0D0' }}>
                            <p className="text-xs font-semibold" style={{ color: GOLD }}>
                                추가 확인 (선택)
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input value={extra.birth_place} onChange={setE('birth_place')}
                                        placeholder="출생지" maxLength={50} />
                                </div>
                                <div className="flex-1">
                                    <Input value={extra.spouse_name} onChange={setE('spouse_name')}
                                        placeholder="배우자 이름" maxLength={30} />
                                </div>
                            </div>
                            <Input value={extra.children} onChange={setE('children')}
                                placeholder="자녀 이름 (쉼표로 구분)" maxLength={100} />
                            <Input value={extra.siblings} onChange={setE('siblings')}
                                placeholder="형제/자매 이름 (쉼표로 구분)" maxLength={100} />
                        </div>
                    )}

                    <button
                        disabled={!selected}
                        onClick={() => selected && onSelectExisting(selected)}
                        className="w-full py-3 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2"
                        style={{ background: selected ? BTN_OK : BTN_DIS, cursor: selected ? 'pointer' : 'not-allowed' }}>
                        <CheckCircle size={18} /> 이 박물관이 맞습니다 <ChevronRight size={16} />
                    </button>

                    <button onClick={onCreateNew}
                        className="w-full py-2 rounded-xl text-sm font-semibold"
                        style={{ background: 'transparent', color: TEXT_SUB, border: '1.5px solid #DDD5C8' }}>
                        아닙니다, 새로 만듭니다
                    </button>

                    <button onClick={onBack}
                        className="w-full py-2 rounded-xl text-sm flex items-center justify-center gap-1"
                        style={{ background: 'transparent', color: TEXT_MUTED }}>
                        <ChevronLeft size={14} /> 정보 수정하기
                    </button>
                </>
            ) : (
                <>
                    <div className="text-center py-4">
                        <User size={40} className="mx-auto mb-3" style={{ color: '#DDD5C8' }} />
                        <p className="font-semibold" style={{ color: TEXT_MAIN }}>
                            일치하는 기록을 찾지 못했습니다.
                        </p>
                        <p className="text-sm mt-1" style={{ color: TEXT_SUB }}>
                            새 박물관을 만들어 드리겠습니다.
                        </p>
                    </div>
                    <button onClick={onCreateNew}
                        className="w-full py-3 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2"
                        style={{ background: BTN_OK, cursor: 'pointer' }}>
                        <Building2 size={18} /> 새 박물관 만들기 <ChevronRight size={16} />
                    </button>

                    <button onClick={onBack}
                        className="w-full py-2 rounded-xl text-sm flex items-center justify-center gap-1"
                        style={{ background: 'transparent', color: TEXT_MUTED }}>
                        <ChevronLeft size={14} /> 정보 수정하기
                    </button>
                </>
            )}
        </div>
    );
}

// ── Step 3: 박물관 생성 확인 ─────────────────────────────────────────────────
function Step3({ form, previewSubdomain, onConfirm, onBack, submitting, error }) {
    const parent1 = [form.parent1_surname, form.parent1_given].filter(Boolean);
    const parent2 = [form.parent2_surname, form.parent2_given].filter(Boolean);
    const birthDisplay = form.birth_date
        ? form.birth_date.replace(/-/g, '.') + (form.birth_lunar ? ' (음력)' : ' (양력)')
        : '';

    return (
        <div className="space-y-5">
            <div className="text-center py-2">
                <p className="text-sm" style={{ color: TEXT_SUB }}>
                    회원님의 박물관 주소
                </p>
                <p className="text-2xl font-bold mt-2" style={{ color: TEXT_MAIN, fontFamily: 'Georgia, serif' }}>
                    {previewSubdomain
                        ? <span style={{ color: GOLD }}>{previewSubdomain}</span>
                        : <Loader2 size={20} className="animate-spin inline" style={{ color: GOLD }} />}
                </p>
                <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>
                    orgcell.com/<span style={{ color: GOLD }}>{previewSubdomain}</span>
                </p>
            </div>

            <div className="rounded-xl px-4 py-3 space-y-1.5 text-sm"
                style={{ background: '#F9F7F2', border: '1px solid #E8E0D0' }}>
                <div className="flex justify-between">
                    <span style={{ color: TEXT_SUB }}>이름</span>
                    <span style={{ color: TEXT_MAIN, fontWeight: 600 }}>
                        {form.surname_ko} {form.given_name}
                    </span>
                </div>
                {form.name_en && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>영문이름</span>
                        <span style={{ color: TEXT_MAIN }}>{form.name_en}</span>
                    </div>
                )}
                {birthDisplay && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>생년월일</span>
                        <span style={{ color: TEXT_MAIN }}>{birthDisplay}</span>
                    </div>
                )}
                {form.bon_gwan_ko && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>본관</span>
                        <span style={{ color: TEXT_MAIN }}>{form.bon_gwan_ko}</span>
                    </div>
                )}
                {form.name_other && form.name_other.length > 0 && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>다른 이름</span>
                        <span style={{ color: TEXT_MAIN }}>
                            {form.name_other.map(n => `${n.name}(${n.type})`).join(', ')}
                        </span>
                    </div>
                )}
                {parent1.length > 0 && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>부(父)</span>
                        <span style={{ color: TEXT_MAIN }}>
                            {parent1.join(' ')}
                        </span>
                    </div>
                )}
                {parent2.length > 0 && (
                    <div className="flex justify-between">
                        <span style={{ color: TEXT_SUB }}>모(母)</span>
                        <span style={{ color: TEXT_MAIN }}>
                            {parent2.join(' ')}
                        </span>
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                    style={{ background: ERROR_BG, color: ERROR_CLR, border: '1px solid #F5C6C0' }}>
                    {error}
                </div>
            )}

            <button onClick={onConfirm} disabled={submitting || !previewSubdomain}
                className="w-full py-3 rounded-xl font-bold text-white text-[15px] flex items-center justify-center gap-2 transition-all"
                style={{
                    background: submitting || !previewSubdomain ? BTN_DIS : BTN_OK,
                    cursor: submitting || !previewSubdomain ? 'not-allowed' : 'pointer',
                }}>
                {submitting
                    ? <><Loader2 size={18} className="animate-spin" /> 만드는 중...</>
                    : <><Building2 size={18} /> 박물관 만들기 <ChevronRight size={16} /></>}
            </button>

            <button onClick={onBack}
                className="w-full py-2 rounded-xl text-sm flex items-center justify-center gap-1"
                style={{ background: 'transparent', color: TEXT_MUTED }}>
                <ChevronLeft size={14} /> 정보 수정하기
            </button>
        </div>
    );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function OnboardingSetupPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useAuthStore();

    const [step, setStep]                         = useState(1); // 1 | 2 | 3
    const [searchData, setSearchData]             = useState(null);  // { form, candidates }
    const [previewSubdomain, setPreviewSubdomain] = useState('');
    const [submitting, setSubmitting]             = useState(false);
    const [error, setError]                       = useState('');

    useEffect(() => {
        if (!isLoading && !isAuthenticated) navigate('/auth/login', { replace: true });
    }, [isAuthenticated, isLoading, navigate]);

    // Step1 완료 → Step2
    const handleSearchDone = (data) => {
        setSearchData(data);
        setStep(2);
    };

    // 이전 단계로 돌아가기
    const handleBackToStep1 = () => {
        setError('');
        setStep(1);
    };
    const handleBackToStep2 = () => {
        setError('');
        setStep(2);
    };

    // Step2: 기존 박물관 연결
    const handleSelectExisting = (candidate) => {
        navigate(`/${candidate.subdomain}/archive`, { replace: true });
    };

    // Step2: 새로 만들기 → subdomain 미리 배정 후 Step3
    const handleCreateNew = async () => {
        setError('');
        const { form } = searchData;
        try {
            const res = await axios.post('/api/subdomain/assign', {
                surnameKo:  form.surname_ko.trim(),
                bonGwanKo:  form.bon_gwan_ko?.trim() || null,
                nationality: 'KR',
            });
            setPreviewSubdomain(res.data.subdomain || 'lee-1');
        } catch {
            setPreviewSubdomain('lee-1');
        }
        setStep(3);
    };

    // Step3: 박물관 생성 확정
    const handleConfirm = async () => {
        if (submitting || !previewSubdomain) return;
        setError('');
        setSubmitting(true);
        const { form } = searchData;
        try {
            const res = await axios.post('/api/sites', {
                subdomain:      previewSubdomain,
                surname_ko:     form.surname_ko.trim(),
                bon_gwan_ko:    form.bon_gwan_ko?.trim() || null,
                given_name:     form.given_name.trim(),
                birth_date:     form.birth_date || null,
                birth_lunar:    form.birth_lunar,
                name_other:     form.name_other || [],
                name_en:        form.name_en?.trim() || null,
            });
            const subdomain = res.data?.data?.subdomain || previewSubdomain;
            navigate(`/${subdomain}/archive`, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || '박물관 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
                <Loader2 size={32} className="animate-spin" style={{ color: GOLD }} />
            </div>
        );
    }

    const STEP_LABELS = ['본인 확인', '기록 검색', '박물관 생성'];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4"
            style={{ background: PAGE_BG, fontFamily: 'system-ui, sans-serif' }}>

            {/* 헤더 */}
            <div className="text-center mb-6">
                <div className="text-3xl mb-2" style={{ fontFamily: 'Georgia, serif', color: TEXT_MAIN, fontWeight: 800 }}>
                    Orgcell
                </div>
                <h1 className="text-xl font-bold mb-1" style={{ color: TEXT_MAIN }}>
                    나의 박물관을 시작합니다
                </h1>
            </div>

            {/* 스텝 인디케이터 */}
            <div className="flex items-center gap-2 mb-6">
                {STEP_LABELS.map((label, i) => {
                    const n = i + 1;
                    const active = step === n;
                    const done   = step > n;
                    return (
                        <React.Fragment key={n}>
                            <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: done || active ? GOLD : '#E8E0D0',
                                        color: done || active ? '#fff' : TEXT_MUTED,
                                    }}>
                                    {done ? '✓' : n}
                                </div>
                                <span className="text-xs hidden sm:inline"
                                    style={{ color: active ? GOLD : TEXT_MUTED, fontWeight: active ? 600 : 400 }}>
                                    {label}
                                </span>
                            </div>
                            {i < STEP_LABELS.length - 1 && (
                                <div className="w-8 h-px" style={{ background: step > n ? GOLD : '#E8E0D0' }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* 카드 */}
            <div className="w-full max-w-sm rounded-2xl p-8 shadow-sm"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>

                {step === 1 && (
                    <Step1
                        onNext={handleSearchDone}
                        initialForm={searchData?.form}
                    />
                )}

                {step === 2 && searchData && (
                    <Step2
                        data={searchData}
                        onSelectExisting={handleSelectExisting}
                        onCreateNew={handleCreateNew}
                        onBack={handleBackToStep1}
                    />
                )}

                {step === 3 && searchData && (
                    <Step3
                        form={searchData.form}
                        previewSubdomain={previewSubdomain}
                        onConfirm={handleConfirm}
                        onBack={handleBackToStep2}
                        submitting={submitting}
                        error={error}
                    />
                )}
            </div>

            <p className="mt-6 text-xs text-center" style={{ color: TEXT_MUTED, maxWidth: 320 }}>
                박물관 생성 후 자료실에서 이름·생년월일·가족을 등록하세요
            </p>
        </div>
    );
}
