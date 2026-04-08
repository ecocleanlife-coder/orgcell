/**
 * ArchivePage.jsx — 자료실 (§8, §9)
 * 관계 탭 + 좌측 인물 입력(60%) + 우측 메뉴(40%) + 하단 MiniTree
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, LogOut, Plus } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import MiniTree from '../../components/museum/MiniTree';

// ── 스타일 상수 ──────────────────────────────────────────────────────
const GOLD = '#C4A882';
const BG_PAGE = '#F5F0E8';
const BG_CARD = '#FAFAF5';
const TEXT_DARK = '#3D2008';
const TEXT_MID = '#5a4a3a';
const TEXT_LIGHT = '#A09888';

const BLOCK_STYLE = {
    border: `1px solid ${GOLD}`,
    background: BG_CARD,
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '2px 2px 0 #c4a87a',
};

// 자판기 버튼 스타일 (§12)
const MENU_BTN = {
    background: '#FDF8F0',
    border: `1px solid ${GOLD}`,
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '1px 1px 0 #c4a87a',
    color: TEXT_DARK,
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.1s, box-shadow 0.1s',
};

// ── 탭 정의 ──────────────────────────────────────────────────────────
const STATIC_TABS = [
    { key: 'self',        label: '본인',      numbered: false },
    { key: 'spouse',      label: '배우자',    numbered: false },
    { key: 'father',      label: '부',        numbered: false },
    { key: 'mother',      label: '모',        numbered: false },
    { key: 'hyeong',      label: '형',        numbered: true  },
    { key: 'je',          label: '제',        numbered: true  },
    { key: 'ja',          label: '자',        numbered: true  },
    { key: 'mae',         label: '매',        numbered: true  },
    { key: 'son',         label: '아들',      numbered: true  },
    { key: 'daughter',    label: '딸',        numbered: true  },
    { key: 'birthfather', label: '입적전친부', numbered: false },
    { key: 'birthmother', label: '입적전친모', numbered: false },
];

const EMPTY_FORM = {
    name: '', birth_date: '', gender: '',
    is_deceased: false, death_date: '',
    bio1: '', bio2: '', bio3: '',
};

// ── 관계 탐색 헬퍼 ────────────────────────────────────────────────────
function findPersonForTab(tabKey, tabIndex, curator, persons, relations) {
    if (!curator) return null;
    const cid = curator.id;

    const spouseRel = relations.find(r =>
        r.relation_type === 'spouse' &&
        (r.person1_id === cid || r.person2_id === cid)
    );

    switch (tabKey) {
        case 'self': return curator;
        case 'spouse': {
            if (!spouseRel) return null;
            const sid = spouseRel.person1_id === cid ? spouseRel.person2_id : spouseRel.person1_id;
            return persons.find(p => p.id === sid) || null;
        }
        case 'father': return persons.find(p => p.id === curator.parent1_id && p.gender === 'male') || null;
        case 'mother': return persons.find(p => p.id === curator.parent2_id && p.gender === 'female') || null;
        case 'son': {
            const sons = persons.filter(p =>
                (p.parent1_id === cid || p.parent2_id === cid) && p.gender === 'male'
            );
            return sons[tabIndex] || null;
        }
        case 'daughter': {
            const daughters = persons.filter(p =>
                (p.parent1_id === cid || p.parent2_id === cid) && p.gender === 'female'
            );
            return daughters[tabIndex] || null;
        }
        case 'hyeong':
        case 'je':
        case 'ja':
        case 'mae': {
            const siblingGender = (tabKey === 'hyeong' || tabKey === 'je') ? 'male' : 'female';
            const siblingRels = relations.filter(r =>
                r.relation_type === 'sibling' &&
                (r.person1_id === cid || r.person2_id === cid)
            );
            const siblings = siblingRels.map(r => {
                const pid = r.person1_id === cid ? r.person2_id : r.person1_id;
                return persons.find(p => p.id === pid);
            }).filter(p => p && p.gender === siblingGender);
            return siblings[tabIndex] || null;
        }
        case 'birthfather':
        case 'birthmother': {
            const bpGender = tabKey === 'birthfather' ? 'male' : 'female';
            const bpRels = relations.filter(r =>
                r.relation_type === 'birth-parent' && r.person2_id === cid
            );
            const bpPersons = bpRels.map(r => persons.find(p => p.id === r.person1_id))
                .filter(p => p && p.gender === bpGender);
            return bpPersons[0] || null;
        }
        default: return null;
    }
}

function personToForm(p) {
    if (!p) return { ...EMPTY_FORM };
    return {
        name: p.name || '',
        birth_date: p.birth_date ? p.birth_date.slice(0, 10) : '',
        gender: p.gender || '',
        is_deceased: p.is_deceased || false,
        death_date: p.death_date ? p.death_date.slice(0, 10) : '',
        bio1: p.bio1 || '',
        bio2: p.bio2 || '',
        bio3: p.bio3 || '',
    };
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export default function ArchivePage() {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuthStore();

    const [site, setSite] = useState(null);
    const [persons, setPersons] = useState([]);
    const [relations, setRelations] = useState([]);
    const [curator, setCurator] = useState(null);
    const [loading, setLoading] = useState(true);

    // 탭: { key, index }
    const [activeTab, setActiveTab] = useState({ key: 'self', index: 0 });
    // numbered 탭 인스턴스 수: { hyeong: 1, son: 2, ... }
    const [tabCounts, setTabCounts] = useState({
        hyeong: 1, je: 1, ja: 1, mae: 1, son: 1, daughter: 1,
    });

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    // ── 데이터 로드 ──
    const loadData = useCallback(async () => {
        try {
            const [siteRes, personsRes] = await Promise.all([
                axios.get('/api/sites/mine'),
                axios.get(`/api/persons/${subdomain}`),
            ]);

            const siteData = siteRes.data.data;
            setSite(siteData);

            const ps = personsRes.data.data || [];
            setPersons(ps);

            // relations 로드
            let rels = [];
            if (siteData?.id) {
                try {
                    const rRes = await axios.get(`/api/persons/${siteData.id}/relations`);
                    rels = rRes.data.data || [];
                } catch { /* 없으면 무시 */ }
            }
            setRelations(rels);

            const cur = ps.find(p => p.match_status === 'linked');
            setCurator(cur || null);

            // numbered tab counts 동기화
            if (cur) {
                const cid = cur.id;
                const sons = ps.filter(p => (p.parent1_id === cid || p.parent2_id === cid) && p.gender === 'male');
                const daughters = ps.filter(p => (p.parent1_id === cid || p.parent2_id === cid) && p.gender === 'female');
                const maleRels = rels.filter(r => r.relation_type === 'sibling' && (r.person1_id === cid || r.person2_id === cid));
                const maleSiblings = maleRels.filter(r => {
                    const pid = r.person1_id === cid ? r.person2_id : r.person1_id;
                    return ps.find(p => p.id === pid)?.gender === 'male';
                });
                const femaleSiblings = maleRels.filter(r => {
                    const pid = r.person1_id === cid ? r.person2_id : r.person1_id;
                    return ps.find(p => p.id === pid)?.gender === 'female';
                });
                setTabCounts({
                    hyeong: Math.max(1, Math.ceil(maleSiblings.length / 2)),
                    je: Math.max(1, Math.floor(maleSiblings.length / 2) + (maleSiblings.length % 2)),
                    ja: Math.max(1, Math.ceil(femaleSiblings.length / 2)),
                    mae: Math.max(1, Math.floor(femaleSiblings.length / 2)),
                    son: Math.max(1, sons.length),
                    daughter: Math.max(1, daughters.length),
                });
            }
        } catch (err) {
            console.error('ArchivePage loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [subdomain]);

    useEffect(() => { loadData(); }, [loadData]);

    // 탭 전환 시 폼 동기화
    useEffect(() => {
        const person = findPersonForTab(activeTab.key, activeTab.index, curator, persons, relations);
        setForm(personToForm(person));
        setPhoto(null);
        setPhotoPreview(person?.photo_url || null);
        setError('');
    }, [activeTab, curator, persons, relations]);

    const currentPerson = findPersonForTab(activeTab.key, activeTab.index, curator, persons, relations);
    const isRegistered = !!currentPerson;

    // ── 폼 초기화 ──
    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setPhoto(null);
        setPhotoPreview(null);
        setError('');
    };

    // ── 사진 처리 ──
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    // ── [생성] ──
    const handleCreate = async () => {
        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        if (!site?.id) return;
        setSubmitting(true);
        setError('');
        try {
            const payload = buildCreatePayload(activeTab.key, form, curator, persons);
            const res = await axios.post(`/api/persons/${site.id}`, payload);
            const newPerson = res.data.data;

            // 관계 연결
            await linkRelation(activeTab.key, newPerson, site.id, curator);

            // 사진 업로드
            if (photo && newPerson.id) {
                const fd = new FormData();
                fd.append('photo', photo);
                await axios.post(`/api/persons/${site.id}/${newPerson.id}/photo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }).catch(() => {});
            }

            await loadData();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || '생성에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── [수정] ──
    const handleUpdate = async () => {
        if (!currentPerson || !site?.id) return;
        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        setSubmitting(true);
        setError('');
        try {
            await axios.put(`/api/persons/${site.id}/${currentPerson.id}`, {
                name: form.name.trim(),
                birth_date: form.birth_date || null,
                gender: form.gender || null,
                is_deceased: form.is_deceased,
                death_date: form.is_deceased ? (form.death_date || null) : null,
                bio1: form.bio1 || null,
                bio2: form.bio2 || null,
                bio3: form.bio3 || null,
            });

            if (photo && currentPerson.id) {
                const fd = new FormData();
                fd.append('photo', photo);
                await axios.post(`/api/persons/${site.id}/${currentPerson.id}/photo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }).catch(() => {});
            }

            await loadData();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || '수정에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── [제거] ──
    const handleDelete = async () => {
        if (!currentPerson || !site?.id) return;
        if (!window.confirm('정말 관계를 해제하시겠습니까?')) return;
        setSubmitting(true);
        setError('');
        try {
            await axios.delete(`/api/persons/${site.id}/${currentPerson.id}`);
            await loadData();
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || '삭제에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── 탭 목록 생성 ──
    const tabList = [];
    for (const t of STATIC_TABS) {
        if (t.numbered) {
            const count = tabCounts[t.key] || 1;
            for (let i = 0; i < count; i++) {
                tabList.push({ key: t.key, label: count > 1 ? `${t.label}${i + 1}` : t.label, index: i });
            }
            tabList.push({ key: t.key, label: '+', index: count, isAdd: true });
        } else {
            tabList.push({ key: t.key, label: t.label, index: 0 });
        }
    }

    const registeredKeys = new Set(
        persons.filter(p => p.id !== curator?.id).map(p => {
            // 간단히 관계 있는 person들의 id → tab key 매핑은 생략, 탭 강조는 currentPerson 기준
            return null;
        })
    );

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: BG_PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#8a7040' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: BG_PAGE, fontFamily: 'system-ui, sans-serif' }}>
            {/* 헤더 */}
            <div style={{
                background: '#FEFCF8',
                borderBottom: `1px solid ${GOLD}`,
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ fontFamily: 'Georgia, serif', color: TEXT_DARK, fontWeight: 800, fontSize: 18, cursor: 'pointer' }}
                    onClick={() => navigate(`/${subdomain}`)}>
                    Orgcell
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: TEXT_MID }}>{subdomain} 자료실</span>
                    <button
                        onClick={async () => { await logout(); navigate('/auth/login'); }}
                        style={{ fontSize: 12, color: TEXT_LIGHT, background: 'none', border: 'none', cursor: 'pointer' }}
                        title="로그아웃"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 16px 0' }}>
                {/* 안내문 (첫 방문 시: curator 이름이 없거나 subdomain과 같을 때) */}
                {curator && (!curator.name || curator.name === subdomain) && (
                    <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 14, color: TEXT_MID }}>
                        본인과 가족들의 정보를 입력해 주세요
                    </div>
                )}

                {/* ─── 관계 탭 ─── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {tabList.map((t, idx) => {
                        const isActive = activeTab.key === t.key && activeTab.index === t.index && !t.isAdd;
                        const tabPerson = t.isAdd ? null : findPersonForTab(t.key, t.index, curator, persons, relations);
                        const hasData = !!tabPerson;

                        if (t.isAdd) {
                            return (
                                <button
                                    key={`${t.key}-add`}
                                    onClick={() => setTabCounts(prev => ({ ...prev, [t.key]: (prev[t.key] || 1) + 1 }))}
                                    style={{
                                        ...MENU_BTN,
                                        width: 'auto',
                                        padding: '4px 8px',
                                        fontSize: 12,
                                        color: TEXT_LIGHT,
                                        background: '#F5F0E8',
                                    }}
                                    title={`${STATIC_TABS.find(s => s.key === t.key)?.label} 추가`}
                                >
                                    <Plus size={10} />
                                </button>
                            );
                        }

                        return (
                            <button
                                key={`${t.key}-${t.index}`}
                                onClick={() => setActiveTab({ key: t.key, index: t.index })}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: 13,
                                    fontWeight: isActive ? 700 : 500,
                                    borderRadius: 6,
                                    border: `1px solid ${GOLD}`,
                                    borderRight: '2px solid #b09060',
                                    borderBottom: isActive ? '0px' : '2px solid #9a7a50',
                                    borderTop: isActive ? '2px solid #9a7a50' : '1px solid #C4A882',
                                    background: isActive ? GOLD : (hasData ? '#FDF0DC' : '#FDF8F0'),
                                    color: isActive ? '#fff' : TEXT_DARK,
                                    cursor: 'pointer',
                                    transform: isActive ? 'translateY(1px)' : 'none',
                                    boxShadow: isActive ? 'none' : '1px 1px 0 #c4a87a',
                                    transition: 'all 0.1s',
                                }}
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* ─── 메인 영역 ─── */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* 좌측 60% — 인물 입력 */}
                    <div style={{ flex: '0 0 60%', ...BLOCK_STYLE, borderRadius: 8, padding: 16 }}>
                        {/* 사진 + 기본정보 */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                            {/* 사진 */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                                    border: `2px dashed ${GOLD}`, background: '#F0EBE0',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                                }}
                            >
                                {photoPreview ? (
                                    <img src={photoPreview} alt="사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>
                                        <Camera size={20} style={{ color: TEXT_LIGHT }} />
                                        <span style={{ fontSize: 9, color: TEXT_LIGHT, marginTop: 2 }}>사진</span>
                                    </>
                                )}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

                            {/* 이름 + 생년월일 + 성별 */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="이름"
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid #DDD5C8`, background: '#FAFAF7', fontSize: 14, color: TEXT_DARK, outline: 'none', boxSizing: 'border-box' }}
                                />
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="date"
                                        value={form.birth_date}
                                        onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                                        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid #DDD5C8`, background: '#FAFAF7', fontSize: 13, color: TEXT_DARK, outline: 'none' }}
                                    />
                                    <select
                                        value={form.gender}
                                        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                                        style={{ width: 72, padding: '6px 6px', borderRadius: 6, border: `1px solid #DDD5C8`, background: '#FAFAF7', fontSize: 13, color: form.gender ? TEXT_DARK : TEXT_LIGHT, outline: 'none' }}
                                    >
                                        <option value="">성별</option>
                                        <option value="male">남</option>
                                        <option value="female">여</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 사망 체크 */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, color: TEXT_MID, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.is_deceased}
                                onChange={e => setForm(f => ({ ...f, is_deceased: e.target.checked }))}
                            />
                            사망
                            {form.is_deceased && (
                                <input
                                    type="date"
                                    value={form.death_date}
                                    onChange={e => setForm(f => ({ ...f, death_date: e.target.value }))}
                                    style={{ marginLeft: 8, padding: '3px 8px', borderRadius: 6, border: `1px solid #DDD5C8`, background: '#FAFAF7', fontSize: 13, color: TEXT_DARK, outline: 'none' }}
                                />
                            )}
                        </label>

                        {/* 대표정보 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                            {[
                                { key: 'bio1', ph: '대표정보1 (직업, 별칭 등)' },
                                { key: 'bio2', ph: '대표정보2 (출생지 등)' },
                                { key: 'bio3', ph: '대표정보3 (가문 정보 등)' },
                            ].map(({ key, ph }) => (
                                <input
                                    key={key}
                                    type="text"
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    placeholder={ph}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid #DDD5C8`, background: '#FAFAF7', fontSize: 13, color: TEXT_DARK, outline: 'none', boxSizing: 'border-box' }}
                                />
                            ))}
                        </div>

                        {/* 에러 */}
                        {error && (
                            <div style={{ background: '#FDF0EE', color: '#c0392b', border: '1px solid #F5C6C0', borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
                                {error}
                            </div>
                        )}

                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <ActionBtn
                                label="생성"
                                disabled={isRegistered || submitting}
                                onClick={handleCreate}
                                color="#4A7F4A"
                            />
                            <ActionBtn
                                label="수정"
                                disabled={!isRegistered || submitting}
                                onClick={handleUpdate}
                                color="#5A6A8A"
                            />
                            <ActionBtn
                                label="제거"
                                disabled={!isRegistered || activeTab.key === 'self' || submitting}
                                onClick={handleDelete}
                                color="#8A4A4A"
                            />
                        </div>
                    </div>

                    {/* 우측 40% — 메뉴 */}
                    <div style={{ flex: '0 0 calc(40% - 12px)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            '사진자료실', '주요자료실', '주요약력', '자서전',
                            '작품실', '육성녹음', '공유앨범',
                        ].map(label => (
                            <button key={label} style={MENU_BTN}
                                onMouseDown={e => e.currentTarget.style.transform = 'translateY(2px)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                {label}
                            </button>
                        ))}
                        <div style={{ borderTop: `1px solid ${GOLD}`, margin: '4px 0' }} />
                        {['초대하기', '접근요청관리'].map(label => (
                            <button key={label} style={{ ...MENU_BTN, color: '#7a5a3a' }}
                                onMouseDown={e => e.currentTarget.style.transform = 'translateY(2px)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'none'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── 하단 MiniTree ─── */}
                <div style={{ marginTop: 16, ...BLOCK_STYLE, borderRadius: 8, padding: 16, minHeight: 120 }}>
                    <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 8 }}>가족나무 미리보기</div>
                    <AnimatePresence>
                        {curator ? (
                            <motion.div
                                key="tree"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: 0.3 }}
                            >
                                <MiniTree
                                    persons={persons}
                                    relations={relations}
                                    currentPersonId={curator.id}
                                    subdomain={subdomain}
                                />
                            </motion.div>
                        ) : (
                            <div style={{ textAlign: 'center', color: TEXT_LIGHT, fontSize: 13, paddingTop: 24 }}>
                                첫 가족을 등록해보세요
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={{ height: 32 }} />
            </div>
        </div>
    );
}

// ── 액션 버튼 ─────────────────────────────────────────────────────────
function ActionBtn({ label, disabled, onClick, color }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 6,
                border: disabled ? '1px solid #DDD5C8' : `1px solid ${color}`,
                borderRight: disabled ? '2px solid #C8BCA8' : `2px solid ${color}88`,
                borderBottom: disabled ? '2px solid #C8BCA8' : `2px solid ${color}AA`,
                background: disabled ? '#F0EBE0' : color,
                color: disabled ? TEXT_LIGHT : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: disabled ? 'none' : '1px 1px 0 rgba(0,0,0,0.15)',
                transition: 'all 0.1s',
            }}
        >
            {label}
        </button>
    );
}

// ── 생성 payload 빌더 ─────────────────────────────────────────────────
function buildCreatePayload(tabKey, form, curator, persons) {
    const base = {
        name: form.name.trim(),
        birth_date: form.birth_date || null,
        gender: form.gender || null,
        is_deceased: form.is_deceased,
        death_date: form.is_deceased ? form.death_date || null : null,
        bio1: form.bio1 || null,
        bio2: form.bio2 || null,
        bio3: form.bio3 || null,
    };

    if (!curator) return base;
    const cid = curator.id;

    switch (tabKey) {
        case 'father':  return { ...base, gender: 'male' };
        case 'mother':  return { ...base, gender: 'female' };
        case 'son':     return { ...base, gender: 'male',   parent1_id: cid };
        case 'daughter':return { ...base, gender: 'female', parent1_id: cid };
        default:        return base;
    }
}

// ── 관계 연결 ─────────────────────────────────────────────────────────
async function linkRelation(tabKey, newPerson, siteId, curator) {
    if (!curator) return;
    const cid = curator.id;
    const nid = newPerson.id;

    try {
        switch (tabKey) {
            case 'spouse':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: Math.min(cid, nid),
                    person2_id: Math.max(cid, nid),
                    relation_type: 'spouse',
                });
                // curator spouse_id 업데이트
                await axios.put(`/api/persons/${siteId}/${cid}`, { spouse_id: nid });
                break;
            case 'father':
                await axios.put(`/api/persons/${siteId}/${cid}`, { parent1_id: nid });
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: nid, person2_id: cid, relation_type: 'parent',
                });
                break;
            case 'mother':
                await axios.put(`/api/persons/${siteId}/${cid}`, { parent2_id: nid });
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: nid, person2_id: cid, relation_type: 'parent',
                });
                break;
            case 'hyeong':
            case 'je':
            case 'ja':
            case 'mae':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: Math.min(cid, nid),
                    person2_id: Math.max(cid, nid),
                    relation_type: 'sibling',
                });
                break;
            case 'birthfather':
            case 'birthmother':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: nid, person2_id: cid, relation_type: 'birth-parent',
                });
                break;
            // son, daughter: parent1_id already set in payload, but also add to relations
            case 'son':
            case 'daughter':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: cid, person2_id: nid, relation_type: 'parent',
                });
                break;
            default:
                break;
        }
    } catch (err) {
        console.warn('linkRelation error (non-fatal):', err.message);
    }
}
