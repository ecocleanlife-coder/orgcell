/**
 * ArchivePage.jsx — 자료실 (§8, §9)
 * 관계 탭 + 좌60% 인물입력 + 우40% 메뉴 + 하단 MiniTree
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, LogOut, Plus, QrCode } from 'lucide-react';
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
    borderRadius: 8,
};

// §12 자판기 버튼
const MENU_BTN_STYLE = {
    background: '#FDF8F0',
    border: `1px solid ${GOLD}`,
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '1px 1px 0 #c4a87a',
    color: TEXT_DARK,
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 20,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.1s',
};

// ── 탭 정의 (anchor 기준) ────────────────────────────────────────────
// 첫 등록 (관장 미등록)
const INIT_TAB = { key: 'self', label: '본인', numbered: false };

// anchor 선택 후 사용 (anchor 기준 관계 탭)
const ANCHOR_TABS = [
    { key: 'spouse',   label: '배우자', numbered: false },
    { key: 'son',      label: '아들',   numbered: true  },
    { key: 'daughter', label: '딸',     numbered: true  },
    { key: 'father',   label: '부',     numbered: false },
    { key: 'mother',   label: '모',     numbered: false },
    { key: 'hyeong',   label: '형',     numbered: true  },
    { key: 'je',       label: '제',     numbered: true  },
    { key: 'ja',       label: '자',     numbered: true  },
    { key: 'mae',      label: '매',     numbered: true  },
];

const EMPTY_FORM = {
    name: '', birth_date: '', birth_lunar: false, gender: '',
    is_deceased: false, death_date: '',
    bio1: '', bio2: '', bio3: '',
};

// 탭별 기본 성별
function getDefaultGender(tabKey) {
    if (['father', 'hyeong', 'je', 'son', 'birthfather'].includes(tabKey)) return 'male';
    if (['mother', 'ja', 'mae', 'daughter', 'birthmother'].includes(tabKey)) return 'female';
    return '';
}

// ── 관계 탐색 헬퍼 (anchor 기준) ────────────────────────────────────
function findPersonForTab(tabKey, tabIndex, anchor, persons, relations) {
    if (!anchor) return null;
    const aid = anchor.id;

    switch (tabKey) {
        case 'self': return anchor;
        case 'spouse': {
            // anchor의 배우자 (spouse_id 우선, 없으면 relations 검색)
            if (anchor.spouse_id) {
                return persons.find(p => p.id === anchor.spouse_id) || null;
            }
            const rel = relations.find(r =>
                r.relation_type === 'spouse' && (r.person1_id === aid || r.person2_id === aid)
            );
            if (!rel) return null;
            const sid = rel.person1_id === aid ? rel.person2_id : rel.person1_id;
            return persons.find(p => p.id === sid) || null;
        }
        case 'father':
            return persons.find(p => p.id === anchor.parent1_id && p.gender === 'male') ||
                   persons.find(p => p.id === anchor.parent2_id && p.gender === 'male') ||
                   (() => {
                       const pRel = relations.find(r => r.relation_type === 'parent' && r.person2_id === aid);
                       if (!pRel) return null;
                       return persons.find(p => p.id === pRel.person1_id && p.gender === 'male') || null;
                   })();
        case 'mother':
            return persons.find(p => p.id === anchor.parent2_id && p.gender === 'female') ||
                   persons.find(p => p.id === anchor.parent1_id && p.gender === 'female') ||
                   (() => {
                       const pRels = relations.filter(r => r.relation_type === 'parent' && r.person2_id === aid);
                       return pRels.map(r => persons.find(p => p.id === r.person1_id)).find(p => p?.gender === 'female') || null;
                   })();
        case 'son': {
            const sons = persons.filter(p =>
                (p.parent1_id === aid || p.parent2_id === aid) && p.gender === 'male'
            );
            return sons[tabIndex] || null;
        }
        case 'daughter': {
            const daughters = persons.filter(p =>
                (p.parent1_id === aid || p.parent2_id === aid) && p.gender === 'female'
            );
            return daughters[tabIndex] || null;
        }
        case 'hyeong':
        case 'je':
        case 'ja':
        case 'mae': {
            const isMale = tabKey === 'hyeong' || tabKey === 'je';
            const sibRels = relations.filter(r =>
                r.relation_type === 'sibling' && (r.person1_id === aid || r.person2_id === aid)
            );
            const siblings = sibRels.map(r => {
                const pid = r.person1_id === aid ? r.person2_id : r.person1_id;
                return persons.find(p => p.id === pid);
            }).filter(p => p && (isMale ? p.gender === 'male' : p.gender === 'female'));
            return siblings[tabIndex] || null;
        }
        default: return null;
    }
}

// 트리 카드 클릭 → 해당 인물을 anchor로 설정 (탭 위치는 별도 계산 불필요)
// (anchor 기반 UX에서는 클릭한 인물 자체가 새 anchor가 됨)

function personToForm(p) {
    if (!p) return { ...EMPTY_FORM };
    return {
        name: p.name || '',
        birth_date: p.birth_date ? p.birth_date.slice(0, 10) : '',
        birth_lunar: p.birth_lunar || false,
        gender: p.gender || '',
        is_deceased: p.is_deceased || false,
        death_date: p.death_date ? p.death_date.slice(0, 10) : '',
        bio1: p.bio1 || '',
        bio2: p.bio2 || '',
        bio3: p.bio3 || '',
    };
}

// 입력 스타일 공통
const INPUT_STYLE = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1.5px solid #DDD5C8',
    background: '#FAFAF7',
    fontSize: 22,
    color: TEXT_DARK,
    outline: 'none',
    boxSizing: 'border-box',
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────
export default function ArchivePage() {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const { logout } = useAuthStore();

    const [site, setSite] = useState(null);
    const [persons, setPersons] = useState([]);
    const [relations, setRelations] = useState([]);
    const [curator, setCurator] = useState(null);
    const [loading, setLoading] = useState(true);

    const [anchorPerson, setAnchorPerson] = useState(null); // 관계 기준 인물 (기본: 관장)
    const [activeTab, setActiveTab] = useState({ key: 'self', index: 0 });
    const [tabCounts, setTabCounts] = useState({
        hyeong: 1, je: 1, ja: 1, mae: 1, son: 1, daughter: 1,
    });

    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // 입장권 발급 상태
    const [showPassForm, setShowPassForm] = useState(false);
    const [passName, setPassName] = useState('');
    const [passDuration, setPassDuration] = useState('7days');
    const [passQRUrl, setPassQRUrl] = useState(null);

    const fileInputRef = useRef(null);
    const formRef = useRef(null);
    const skipNextFormSync = useRef(false);

    // anchor 기준 tabCounts 재계산
    const updateTabCountsForAnchor = useCallback((anchor, ps, rels) => {
        if (!anchor) return;
        const aid = anchor.id;
        const sons = ps.filter(p => (p.parent1_id === aid || p.parent2_id === aid) && p.gender === 'male');
        const daughters = ps.filter(p => (p.parent1_id === aid || p.parent2_id === aid) && p.gender === 'female');
        const sibRels = rels.filter(r => r.relation_type === 'sibling' && (r.person1_id === aid || r.person2_id === aid));
        const maleSibs = sibRels.filter(r => {
            const pid = r.person1_id === aid ? r.person2_id : r.person1_id;
            return ps.find(p => p.id === pid)?.gender === 'male';
        });
        const femaleSibs = sibRels.filter(r => {
            const pid = r.person1_id === aid ? r.person2_id : r.person1_id;
            return ps.find(p => p.id === pid)?.gender === 'female';
        });
        setTabCounts({
            hyeong: Math.max(1, maleSibs.length),
            je: Math.max(1, maleSibs.length),
            ja: Math.max(1, femaleSibs.length),
            mae: Math.max(1, femaleSibs.length),
            son: Math.max(1, sons.length),
            daughter: Math.max(1, daughters.length),
        });
    }, []);

    // ── 데이터 로드 ──────────────────────────────────────────────────
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

            // anchor: 이미 설정된 anchor 유지. 첫 로드 시 curator로 초기화
            const nextAnchor = cur || null;
            setAnchorPerson(prev => prev || nextAnchor);

            if (cur) {
                updateTabCountsForAnchor(cur, ps, rels);
            }
        } catch (err) {
            console.error('ArchivePage loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [subdomain]);

    useEffect(() => { loadData(); }, [loadData]);

    // anchor 변경 시 탭/폼 초기화
    useEffect(() => {
        if (!anchorPerson) return;
        updateTabCountsForAnchor(anchorPerson, persons, relations);
        // curator와 같으면 self 탭, 아니면 배우자 탭으로
        const isCurator = curator && anchorPerson.id === curator.id;
        if (!isCurator) {
            setActiveTab({ key: 'spouse', index: 0 });
        }
    }, [anchorPerson]); // eslint-disable-line react-hooks/exhaustive-deps

    // 탭 전환 시 폼 동기화 (버그2: skipNextFormSync, 버그4: 성별 자동)
    useEffect(() => {
        if (skipNextFormSync.current) {
            skipNextFormSync.current = false;
            return;
        }
        const person = findPersonForTab(activeTab.key, activeTab.index, anchorPerson, persons, relations);
        const base = personToForm(person);
        if (!person) base.gender = getDefaultGender(activeTab.key);
        setForm(base);
        setPhoto(null);
        setPhotoPreview(person?.photo_url || null);
        setError('');
    }, [activeTab, anchorPerson, persons, relations]);

    const currentPerson = findPersonForTab(activeTab.key, activeTab.index, anchorPerson, persons, relations);
    const isRegistered = !!currentPerson;

    // 폼 초기화 (버그2)
    const resetForm = () => {
        skipNextFormSync.current = true;
        setForm({ ...EMPTY_FORM, gender: getDefaultGender(activeTab.key) });
        setPhoto(null);
        setPhotoPreview(null);
        setError('');
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    // ── [생성] ──────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        if (!site?.id) return;
        setSubmitting(true);
        setError('');
        try {
            const anchor = activeTab.key === 'self' ? null : anchorPerson;
            const payload = buildCreatePayload(activeTab.key, form, anchor);
            const res = await axios.post(`/api/persons/${site.id}`, payload);
            const newPerson = res.data.data;
            await linkRelation(activeTab.key, newPerson, site.id, anchor);
            if (photo && newPerson.id) {
                const fd = new FormData();
                fd.append('photo', photo);
                await axios.post(`/api/persons/${site.id}/${newPerson.id}/photo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }).catch(() => {});
            }
            await loadData();
            // self 탭이었으면 새로 생성된 인물을 anchor로 설정
            if (activeTab.key === 'self') {
                setAnchorPerson(newPerson);
            }
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || '생성에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── [수정] ──────────────────────────────────────────────────────
    const handleUpdate = async () => {
        if (!currentPerson || !site?.id) return;
        if (!form.name.trim()) return setError('이름을 입력해주세요.');
        setSubmitting(true);
        setError('');
        try {
            await axios.put(`/api/persons/${site.id}/${currentPerson.id}`, {
                name: form.name.trim(),
                birth_date: form.birth_date || null,
                birth_lunar: form.birth_lunar,
                gender: form.gender || null,
                is_deceased: form.is_deceased,
                death_date: form.is_deceased ? form.death_date || null : null,
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

    // ── [제거] ──────────────────────────────────────────────────────
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

    // 트리 카드 클릭 → anchor 변경 (anchor 기반 UX)
    const handleTreePersonClick = useCallback((personId) => {
        const person = persons.find(p => String(p.id) === String(personId));
        if (!person) return;
        setAnchorPerson(person);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [persons]);

    // 입장권 QR 생성 (버그9)
    const handleGeneratePass = () => {
        const token = Math.random().toString(36).slice(2, 14).toUpperCase();
        const passUrl = `https://orgcell.com/${subdomain}/visit?pass=${token}&dur=${passDuration}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(passUrl)}&size=200x200`;
        setPassQRUrl(qrUrl);
    };

    // ── 탭 목록 생성 ────────────────────────────────────────────────
    const hasCurator = !!curator;
    const tabDefs = hasCurator ? ANCHOR_TABS : [INIT_TAB];
    const tabList = [];
    for (const t of tabDefs) {
        if (!t.numbered) {
            tabList.push({ key: t.key, label: t.label, index: 0 });
        } else {
            const count = tabCounts[t.key] || 1;
            for (let i = 0; i < count; i++) {
                tabList.push({ key: t.key, label: count > 1 ? `${t.label}${i + 1}` : t.label, index: i });
            }
            tabList.push({ key: t.key, label: '+', index: count, isAdd: true });
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: BG_PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: '#8a7040' }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: BG_PAGE, fontFamily: 'system-ui, sans-serif' }}>
            {/* ── 헤더 ── */}
            <div style={{
                background: '#FEFCF8', borderBottom: `1px solid ${GOLD}`,
                padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ fontFamily: 'Georgia, serif', color: TEXT_DARK, fontWeight: 800, fontSize: 22, cursor: 'pointer' }}
                    onClick={() => navigate(`/${subdomain}`)}>
                    Orgcell
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* [완료] 버튼 (버그6) */}
                    <button
                        onClick={() => navigate(`/${subdomain}`)}
                        style={{
                            padding: '6px 18px', borderRadius: 6, fontSize: 18, fontWeight: 600,
                            background: '#4A7F4A', color: '#fff', border: 'none', cursor: 'pointer',
                            borderBottom: '2px solid #3a6a3a',
                        }}
                    >완료</button>
                    {/* 로그아웃 (버그8) */}
                    <button
                        onClick={async () => { await logout(); navigate('/auth/login'); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'none', border: `1px solid ${GOLD}`, borderRadius: 6,
                            padding: '6px 12px', cursor: 'pointer', color: TEXT_MID, fontSize: 16,
                        }}
                        title="로그아웃"
                    >
                        <LogOut size={16} /> 로그아웃
                    </button>
                </div>
            </div>

            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 20px 0' }}>
                {/* 안내문 */}
                {curator && (!curator.name || curator.name === subdomain) && (
                    <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 20, color: TEXT_MID }}>
                        본인과 가족들의 정보를 입력해 주세요
                    </div>
                )}

                {/* ── anchor 헤더 ── */}
                {hasCurator && anchorPerson && (
                    <div style={{
                        marginBottom: 10, padding: '6px 14px',
                        background: anchorPerson.id === curator?.id ? '#FDF0DC' : '#EEF4FF',
                        border: `1px solid ${GOLD}`, borderRadius: 6,
                        fontSize: 18, color: TEXT_MID, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontWeight: 700, color: TEXT_DARK }}>{anchorPerson.name}</span>
                        <span>님과의 관계</span>
                        {anchorPerson.id !== curator?.id && (
                            <button
                                onClick={() => setAnchorPerson(curator)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 14, color: TEXT_LIGHT, cursor: 'pointer' }}
                            >
                                ← 본인으로 돌아가기
                            </button>
                        )}
                    </div>
                )}

                {/* ── 관계 탭 ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {tabList.map((t) => {
                        const isActive = !t.isAdd && activeTab.key === t.key && activeTab.index === t.index;
                        const hasData = !t.isAdd && !!findPersonForTab(t.key, t.index, anchorPerson, persons, relations);

                        if (t.isAdd) {
                            return (
                                <button
                                    key={`${t.key}-add`}
                                    onClick={() => {
                                        const newCount = (tabCounts[t.key] || 1) + 1;
                                        setTabCounts(prev => ({ ...prev, [t.key]: newCount }));
                                        setActiveTab({ key: t.key, index: newCount - 1 });
                                    }}
                                    style={{
                                        padding: '5px 10px', fontSize: 16, borderRadius: 6,
                                        border: `1px solid ${GOLD}`, background: '#F5F0E8',
                                        color: TEXT_LIGHT, cursor: 'pointer',
                                        borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50',
                                    }}
                                    title="탭 추가"
                                >
                                    <Plus size={12} />
                                </button>
                            );
                        }

                        return (
                            <button
                                key={`${t.key}-${t.index}`}
                                onClick={() => setActiveTab({ key: t.key, index: t.index })}
                                style={{
                                    padding: '7px 14px', fontSize: 20, fontWeight: isActive ? 700 : 500,
                                    borderRadius: 6,
                                    border: `1.5px solid ${GOLD}`,
                                    borderRight: '2px solid #b09060',
                                    borderBottom: isActive ? '0' : '2px solid #9a7a50',
                                    borderTop: isActive ? '2px solid #9a7a50' : `1.5px solid ${GOLD}`,
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

                {/* ── 메인 영역 ── */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    {/* 좌측 60% */}
                    <div ref={formRef} style={{ flex: '0 0 60%', ...BLOCK_STYLE, padding: 20 }}>
                        {/* 사진 + 이름/날짜/성별 */}
                        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: 96, height: 96, borderRadius: '50%', flexShrink: 0,
                                    border: `2px dashed ${GOLD}`, background: '#F0EBE0',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                                }}
                            >
                                {photoPreview
                                    ? <img src={photoPreview} alt="사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <><Camera size={24} style={{ color: TEXT_LIGHT }} /><span style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 3 }}>사진</span></>
                                }
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="이름"
                                    style={INPUT_STYLE}
                                />
                                {/* 생년월일 + 양력/음력 + 성별 (버그1) */}
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="date"
                                        value={form.birth_date}
                                        onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                                        style={{ ...INPUT_STYLE, flex: 1, minWidth: 140, width: 'auto' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 18, color: TEXT_MID, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        <input type="radio" name="lunar" checked={!form.birth_lunar} onChange={() => setForm(f => ({ ...f, birth_lunar: false }))} />
                                        양력
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 18, color: TEXT_MID, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        <input type="radio" name="lunar" checked={form.birth_lunar} onChange={() => setForm(f => ({ ...f, birth_lunar: true }))} />
                                        음력
                                    </label>
                                    <select
                                        value={form.gender}
                                        onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                                        style={{ ...INPUT_STYLE, width: 90, flex: 'none' }}
                                    >
                                        <option value="">성별</option>
                                        <option value="male">남</option>
                                        <option value="female">여</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 사망 체크 (버그2: death_date 연동) */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 20, color: TEXT_MID, cursor: 'pointer' }}>
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
                                    style={{ ...INPUT_STYLE, width: 'auto', marginLeft: 8 }}
                                />
                            )}
                        </label>

                        {/* 대표정보 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {[
                                { k: 'bio1', ph: '대표정보1 (직업, 별칭 등)' },
                                { k: 'bio2', ph: '대표정보2 (출생지 등)' },
                                { k: 'bio3', ph: '대표정보3 (가문 정보 등)' },
                            ].map(({ k, ph }) => (
                                <input key={k} type="text" value={form[k]}
                                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                    placeholder={ph} style={INPUT_STYLE} />
                            ))}
                        </div>

                        {error && (
                            <div style={{ background: '#FDF0EE', color: '#c0392b', border: '1px solid #F5C6C0', borderRadius: 6, padding: '10px 14px', fontSize: 18, marginBottom: 12 }}>
                                {error}
                            </div>
                        )}

                        {/* 액션 버튼 */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <ActionBtn label="생성" disabled={isRegistered || submitting} onClick={handleCreate} color="#4A7F4A" />
                            <ActionBtn label="수정" disabled={!isRegistered || submitting} onClick={handleUpdate} color="#5A6A8A" />
                            <ActionBtn label="제거" disabled={!isRegistered || activeTab.key === 'self' || submitting} onClick={handleDelete} color="#8A4A4A" />
                        </div>
                    </div>

                    {/* 우측 40% — 메뉴 + 입장권 */}
                    <div style={{ flex: '0 0 calc(40% - 14px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {['사진자료실', '주요자료실', '주요약력', '자서전', '작품실', '육성녹음', '공유앨범'].map(label => (
                            <button key={label} style={MENU_BTN_STYLE}
                                onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = 'none'; }}
                                onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '1px 1px 0 #c4a87a'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '1px 1px 0 #c4a87a'; }}
                            >{label}</button>
                        ))}
                        <div style={{ borderTop: `1px solid ${GOLD}`, margin: '4px 0' }} />
                        {/* 초대하기 */}
                        <button style={MENU_BTN_STYLE}
                            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                        >초대하기</button>
                        {/* 입장권 발급 (버그9) */}
                        <button
                            style={{ ...MENU_BTN_STYLE, display: 'flex', alignItems: 'center', gap: 8 }}
                            onClick={() => { setShowPassForm(p => !p); setPassQRUrl(null); }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                        >
                            <QrCode size={18} /> 입장권 발급
                        </button>
                        <button style={MENU_BTN_STYLE}
                            onMouseDown={e => { e.currentTarget.style.transform = 'translateY(2px)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'none'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                        >접근요청관리</button>

                        {/* 입장권 폼 */}
                        {showPassForm && (
                            <div style={{ ...BLOCK_STYLE, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_DARK, marginBottom: 4 }}>입장권 발급</div>
                                <input
                                    type="text"
                                    value={passName}
                                    onChange={e => setPassName(e.target.value)}
                                    placeholder="방문자 이름 (선택)"
                                    style={{ ...INPUT_STYLE, fontSize: 18 }}
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 18 }}>
                                    {[{ v: '3days', l: '3일' }, { v: '7days', l: '1주' }, { v: '30days', l: '1개월' }, { v: 'unlimited', l: '무제한' }].map(({ v, l }) => (
                                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: TEXT_MID }}>
                                            <input type="radio" name="passDur" value={v} checked={passDuration === v} onChange={() => setPassDuration(v)} />
                                            {l}
                                        </label>
                                    ))}
                                </div>
                                <button
                                    onClick={handleGeneratePass}
                                    style={{ ...MENU_BTN_STYLE, background: '#5A6A8A', color: '#fff', textAlign: 'center', fontSize: 18 }}
                                >QR코드 생성</button>
                                {passQRUrl && (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={passQRUrl} alt="입장권 QR" style={{ width: 160, height: 160, border: `1px solid ${GOLD}`, borderRadius: 6 }} />
                                        <div style={{ fontSize: 14, color: TEXT_LIGHT, marginTop: 4 }}>
                                            {passName || '방문자'} · {({ '3days': '3일', '7days': '1주', '30days': '1개월', unlimited: '무제한' })[passDuration]}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 하단 MiniTree ── */}
                <div style={{ marginTop: 20, ...BLOCK_STYLE, padding: 20, minHeight: 140 }}>
                    <div style={{ fontSize: 16, color: TEXT_LIGHT, marginBottom: 10 }}>가족나무 미리보기</div>
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
                                    onPersonClick={handleTreePersonClick}
                                />
                            </motion.div>
                        ) : (
                            <div style={{ textAlign: 'center', color: TEXT_LIGHT, fontSize: 20, paddingTop: 30 }}>
                                첫 가족을 등록해보세요
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={{ height: 40 }} />
            </div>
        </div>
    );
}

// ── 액션 버튼 ────────────────────────────────────────────────────────
function ActionBtn({ label, disabled, onClick, color }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                flex: 1, padding: '10px 0', borderRadius: 6, fontSize: 20, fontWeight: 600,
                border: disabled ? '1px solid #DDD5C8' : `1px solid ${color}`,
                borderRight: disabled ? '2px solid #C8BCA8' : `2px solid ${color}88`,
                borderBottom: disabled ? '2px solid #C8BCA8' : `2px solid ${color}BB`,
                background: disabled ? '#F0EBE0' : color,
                color: disabled ? TEXT_LIGHT : '#fff',
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: disabled ? 'none' : '1px 2px 0 rgba(0,0,0,0.12)',
                transition: 'all 0.1s',
            }}
        >
            {label}
        </button>
    );
}

// ── 생성 payload ──────────────────────────────────────────────────────
function buildCreatePayload(tabKey, form, anchor) {
    const base = {
        name: form.name.trim(),
        birth_date: form.birth_date || null,
        birth_lunar: form.birth_lunar,
        gender: form.gender || null,
        is_deceased: form.is_deceased,
        death_date: form.is_deceased ? form.death_date || null : null,
        bio1: form.bio1 || null,
        bio2: form.bio2 || null,
        bio3: form.bio3 || null,
    };
    if (!anchor) return base; // 본인(self) 등록 시 anchor 없음
    const aid = anchor.id;
    switch (tabKey) {
        case 'father':   return { ...base, gender: 'male' };
        case 'mother':   return { ...base, gender: 'female' };
        case 'son':      return { ...base, gender: 'male',   parent1_id: aid };
        case 'daughter': return { ...base, gender: 'female', parent1_id: aid };
        case 'hyeong':   return { ...base, gender: 'male' };
        case 'je':       return { ...base, gender: 'male' };
        case 'ja':       return { ...base, gender: 'female' };
        case 'mae':      return { ...base, gender: 'female' };
        default:         return base;
    }
}

// ── 관계 연결 (anchor 기준) ───────────────────────────────────────────
async function linkRelation(tabKey, newPerson, siteId, anchor) {
    if (!anchor) return; // self 등록 시 링크 없음
    const aid = anchor.id;
    const nid = newPerson.id;
    try {
        switch (tabKey) {
            case 'spouse':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: Math.min(aid, nid), person2_id: Math.max(aid, nid), relation_type: 'spouse',
                });
                await axios.put(`/api/persons/${siteId}/${aid}`, { spouse_id: nid });
                break;
            case 'father':
                await axios.put(`/api/persons/${siteId}/${aid}`, { parent1_id: nid });
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: nid, person2_id: aid, relation_type: 'parent',
                });
                break;
            case 'mother':
                await axios.put(`/api/persons/${siteId}/${aid}`, { parent2_id: nid });
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: nid, person2_id: aid, relation_type: 'parent',
                });
                break;
            case 'hyeong': case 'je': case 'ja': case 'mae':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: Math.min(aid, nid), person2_id: Math.max(aid, nid), relation_type: 'sibling',
                });
                break;
            case 'son': case 'daughter':
                await axios.post(`/api/persons/${siteId}/relations`, {
                    person1_id: aid, person2_id: nid, relation_type: 'parent',
                });
                break;
            default: break;
        }
    } catch (err) {
        console.warn('linkRelation error (non-fatal):', err.message);
    }
}
