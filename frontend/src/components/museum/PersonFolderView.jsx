/**
 * PersonFolderView.jsx — 인물 자료실
 * 규칙서 8번 레이아웃 준수 (좌: 인물정보폼 / 우: 메뉴버튼 / 하단: 컨텐츠)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User,
    Play, Pause, X, ChevronLeft, ChevronRight, Maximize2, Image,
} from 'lucide-react';
import MiniTree from './MiniTree';
import axios from 'axios';
import useUiStore from '../../store/uiStore';
import { toast } from 'react-hot-toast';

import PhotoEditor from './PhotoEditor';
import PhotoImportModal from './PhotoImportModal';
import VoiceRecordingModal from './VoiceRecordingModal';
import InvitationModal from './InvitationModal';
import AccessRequestManager from './AccessRequestManager';

// ── 색상 상수 ────────────────────────────────────────────────────────────────
const GOLD      = '#C4A882';
const GOLD_DARK = '#8B7355';
const GOLD_LIGHT = 'rgba(196,168,130,0.15)';
const BG        = '#FDF8F0';
const BG_CARD   = '#FAFAF5';
const TEXT      = '#3a3020';
const TEXT_SUB  = '#7a6a50';

// ── Fullscreen 슬라이드쇼 ────────────────────────────────────────────────────
function FullscreenPlayer({ items, startIndex, onClose }) {
    const [idx, setIdx] = useState(startIndex);
    const [playing, setPlaying] = useState(true);
    const item = items[idx];

    useEffect(() => {
        if (item?.type !== 'photo' || !playing) return;
        const timer = setTimeout(() => setIdx(prev => (prev + 1) % items.length), 4000);
        return () => clearTimeout(timer);
    }, [idx, playing, item, items.length]);

    const prev = () => setIdx((idx - 1 + items.length) % items.length);
    const next = () => setIdx((idx + 1) % items.length);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
            if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [idx, onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                <span className="text-white/80 text-sm">{item?.caption || ''} ({idx + 1}/{items.length})</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => setPlaying(p => !p)} className="text-white/80 hover:text-white p-2">
                        {playing ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-2"><X size={24} /></button>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
                <img src={item?.url} alt={item?.caption || ''} className="max-w-full max-h-full object-contain" />
                {items.length > 1 && (
                    <>
                        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full">
                            <ChevronLeft size={28} />
                        </button>
                        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full">
                            <ChevronRight size={28} />
                        </button>
                    </>
                )}
            </div>
            {items.length > 1 && (
                <div className="bg-black/90 p-3 flex items-center gap-2 overflow-x-auto">
                    {items.map((it, i) => (
                        <button key={it.id} onClick={() => setIdx(i)}
                            className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === idx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                            <img src={it.url} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── 메뉴 버튼 컴포넌트 ───────────────────────────────────────────────────────
function MenuBtn({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                padding: '10px 14px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: active ? '700' : '500',
                fontFamily: 'Georgia, "Noto Serif KR", serif',
                background: active ? GOLD_LIGHT : BG_CARD,
                border: `1px solid ${GOLD}`,
                borderRight: `2px solid ${GOLD_DARK}`,
                borderBottom: `2px solid ${GOLD_DARK}`,
                borderRadius: '6px',
                color: active ? GOLD_DARK : TEXT,
                cursor: 'pointer',
                boxShadow: active ? 'inset 1px 1px 3px rgba(0,0,0,0.1)' : `1px 1px 0 ${GOLD}`,
                transition: 'all 0.1s',
                transform: active ? 'translate(1px, 1px)' : 'none',
            }}
        >
            {label}
        </button>
    );
}

// ── 로딩 스피너 ──────────────────────────────────────────────────────────────
function PageLoader() {
    return (
        <div style={{ display: 'flex', height: '256px', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `4px solid ${GOLD}`, borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        </div>
    );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PersonFolderView() {
    const { subdomain, id } = useParams();
    const navigate = useNavigate();
    const role = useUiStore((s) => s.role);

    const [person, setPerson]           = useState(null);
    const [photos, setPhotos]           = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [siteId, setSiteId]           = useState(null);
    const [fullscreenIdx, setFullscreenIdx] = useState(null);
    const [activeTool, setActiveTool]   = useState(null); // null = 빈 하단

    // ── 폼 상태 ──────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        name: '', maiden_name: '', former_name: '', gender: 'male',
        birth_date: '', birth_lunar: false,
        is_deceased: false, death_date: '', death_lunar: false,
        display_info1: '', display_info2: '', display_info3: '',
    });
    const [photoUrl, setPhotoUrl]               = useState('');
    const [pendingPhotoFile, setPendingPhotoFile] = useState(null);

    // ── 가족 추가 상태 ───────────────────────────────────────────────────────
    const [showFamilyAdd, setShowFamilyAdd]     = useState(false);
    const [addRelationType, setAddRelationType] = useState(null);
    const [relationName, setRelationName]       = useState('');
    const [relationGender, setRelationGender]   = useState('male');
    const [existingPersonSearch, setExistingPersonSearch] = useState('');
    const [allPersons, setAllPersons]           = useState([]);
    const [submittingRelation, setSubmittingRelation] = useState(false);

    // 1) siteId 조회
    useEffect(() => {
        if (!subdomain) return;
        axios.get(`/api/museum/${subdomain}`)
            .then(r => { if (r.data?.success) setSiteId(r.data.data.id); else setError('박물관을 찾을 수 없습니다'); })
            .catch(() => setError('박물관을 찾을 수 없습니다'));
    }, [subdomain]);

    // 2) 전체 인물 목록 (관계 연결용)
    useEffect(() => {
        if (siteId && !allPersons.length)
            axios.get(`/api/persons/${siteId}`).then(r => setAllPersons(r.data?.data || []));
    }, [siteId]);

    // 3) 사진 새로고침
    const fetchPhotos = useCallback(() => {
        if (!siteId || !id) return;
        axios.get(`/api/persons/${siteId}/${id}/photos`).then(r => setPhotos(r.data?.data || [])).catch(() => {});
    }, [siteId, id]);

    // 4) 인물 + 사진 초기 로드
    useEffect(() => {
        if (!siteId || !id) return;
        setLoading(true);
        Promise.all([
            axios.get(`/api/persons/${siteId}`),
            axios.get(`/api/persons/${siteId}/${id}/photos`),
        ])
            .then(([personsRes, photosRes]) => {
                const persons = personsRes.data?.data || [];
                const found = persons.find(p => String(p.id) === String(id));
                if (found) {
                    setPerson(found);
                    setPhotoUrl(found.photo_url || '');
                    setForm({
                        name:          found.name || '',
                        maiden_name:   found.maiden_name || '',
                        former_name:   found.former_name || '',
                        gender:        found.gender || 'male',
                        birth_date:    found.birth_date || '',
                        birth_lunar:   found.birth_lunar || false,
                        is_deceased:   found.is_deceased || false,
                        death_date:    found.death_date || '',
                        death_lunar:   found.death_lunar || false,
                        display_info1: found.display_info1 || '',
                        display_info2: found.display_info2 || '',
                        display_info3: found.display_info3 || '',
                    });
                } else {
                    setError('인물을 찾을 수 없습니다');
                }
                setPhotos(photosRes.data?.data || []);
            })
            .catch(() => setError('데이터를 불러올 수 없습니다'))
            .finally(() => setLoading(false));
    }, [siteId, id]);

    const upd = (field, value) => setForm(f => ({ ...f, [field]: value }));

    // ── 저장 ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('이름을 입력하세요'); return; }
        try {
            await axios.put(`/api/persons/${siteId}/${person.id}`, { ...person, ...form });
            setPerson(prev => ({ ...prev, ...form }));
            toast.success('저장되었습니다');
        } catch {
            toast.error('저장에 실패했습니다');
        }
    };

    // ── 가족 관계 연결 공통 함수 ─────────────────────────────────────────────
    const connectRelation = async (targetId) => {
        const type = addRelationType;
        if (type === 'parent' || type === 'birth-parent') {
            await axios.put(`/api/persons/${siteId}/${person.id}`, { parent1_id: targetId });
        } else if (type === 'child' || type === 'adoption') {
            await axios.put(`/api/persons/${siteId}/${targetId}`, { parent1_id: person.id });
        } else if (type === 'spouse') {
            await axios.put(`/api/persons/${siteId}/${person.id}`, { spouse_id: targetId });
        } else if (type === 'sibling') {
            await axios.put(`/api/persons/${siteId}/${targetId}`, { parent1_id: person.parent1_id || null, parent2_id: person.parent2_id || null });
        }
    };

    // ── [생성] 버튼: 새 인물 생성 후 연결 ────────────────────────────────────
    const handleCreateAndConnect = async () => {
        if (!person || !siteId) return;
        if (!addRelationType) { toast.error('관계 유형을 선택하세요'); return; }
        if (!relationName.trim()) { toast.error('이름을 입력하세요'); return; }
        setSubmittingRelation(true);
        try {
            let gen = person.generation || 1;
            if (addRelationType === 'parent' || addRelationType === 'birth-parent') gen += 1;
            if (addRelationType === 'child' || addRelationType === 'adoption') gen -= 1;
            const res = await axios.post(`/api/persons/${siteId}`, {
                name: relationName.trim(), gender: relationGender, generation: gen, privacy_level: 'family',
            });
            const targetId = res.data?.data?.id;
            if (!targetId) { toast.error('생성 실패'); setSubmittingRelation(false); return; }
            await connectRelation(targetId);
            toast.success(`${relationName.trim()}이(가) 생성되었습니다`);
            setRelationName('');
        } catch {
            toast.error('생성에 실패했습니다');
        }
        setSubmittingRelation(false);
    };

    // ── [연결] 버튼: 기존 인물 검색 후 연결 ──────────────────────────────────
    const handleConnectExisting = async () => {
        if (!person || !siteId) return;
        if (!addRelationType) { toast.error('관계 유형을 선택하세요'); return; }
        const q = existingPersonSearch.trim().toLowerCase();
        if (!q) { toast.error('검색어를 입력하세요'); return; }
        const found = allPersons.find(p =>
            String(p.id) !== String(person?.id) && (
                p.name?.toLowerCase().includes(q) ||
                p.oc_id?.toLowerCase() === q
            )
        );
        if (!found) { toast.error('일치하는 인물을 찾을 수 없습니다'); return; }
        setSubmittingRelation(true);
        try {
            await connectRelation(found.id);
            toast.success(`${found.name}과(와) 연결되었습니다`);
            setExistingPersonSearch('');
            setAddRelationType(null);
        } catch {
            toast.error('연결에 실패했습니다');
        }
        setSubmittingRelation(false);
    };

    // ── 공통 스타일 ──────────────────────────────────────────────────────────
    const inputSt = {
        width: '100%', padding: '6px 10px',
        background: '#fff', border: `1px solid ${GOLD}`, borderRadius: '4px',
        color: TEXT, fontSize: '13px', fontFamily: 'Georgia, "Noto Serif KR", serif',
        boxSizing: 'border-box',
    };
    const labelSt = {
        display: 'block', color: GOLD_DARK, fontSize: '11px',
        marginBottom: '3px', fontFamily: 'Georgia, "Noto Serif KR", serif',
    };
    const rowSt = { marginBottom: '10px' };

    // ── 에러 / 로딩 ──────────────────────────────────────────────────────────
    if (error) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG }}>
                <p style={{ color: TEXT_SUB, marginBottom: '16px' }}>{error}</p>
                <button onClick={() => navigate(-1)} style={{ padding: '8px 20px', background: GOLD_LIGHT, border: `1px solid ${GOLD}`, borderRadius: '20px', color: GOLD_DARK, cursor: 'pointer' }}>돌아가기</button>
            </div>
        );
    }
    if (loading || !person) return <PageLoader />;

    const personName = person.name || '가족 구성원';
    const toggleTool = (key) => setActiveTool(activeTool === key ? null : key);

    return (
        <div style={{ minHeight: '100vh', background: BG }}>

            {/* PhotoEditor 오버레이 */}
            {pendingPhotoFile && (
                <PhotoEditor
                    src={URL.createObjectURL(pendingPhotoFile)}
                    initialPosition={person?.photo_position || { x: 50, y: 50 }}
                    onSave={async (blob, position) => {
                        if (!person || !siteId) return;
                        const fd = new FormData();
                        fd.append('photo', blob, 'edited.jpg');
                        try {
                            const res = await axios.post(`/api/persons/${siteId}/${person.id}/photo`, fd);
                            if (res.data?.data?.photo_url) {
                                setPhotoUrl(res.data.data.photo_url);
                                setPendingPhotoFile(null);
                                setPerson(prev => ({ ...prev, photo_url: res.data.data.photo_url, photo_position: position }));
                                toast.success('사진이 저장되었습니다');
                            }
                        } catch {
                            toast.error('사진 저장 실패');
                        }
                    }}
                    onCancel={() => setPendingPhotoFile(null)}
                />
            )}

            {/* ── 헤더 ─────────────────────────────────────────────────────── */}
            <header style={{ background: BG, borderBottom: `1px solid ${GOLD}`, position: 'sticky', top: 0, zIndex: 40 }}>
                <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate(-1)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }}>
                        <ArrowLeft size={20} style={{ color: TEXT_SUB }} />
                    </button>
                    {photoUrl
                        ? <img src={photoUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${GOLD}` }} />
                        : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: GOLD_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} style={{ color: GOLD }} /></div>
                    }
                    <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: TEXT, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                        {personName} 자료실
                    </h1>
                </div>
            </header>

            <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                    {/* ── 최좌측: 간이 직계 트리 ──────────────────────────── */}
                    <div style={{
                        width: 160,
                        flexShrink: 0,
                        background: '#FAFAF5',
                        border: `1px solid ${GOLD}`,
                        borderRight: `2px solid ${GOLD_DARK}`,
                        borderBottom: `2px solid ${GOLD_DARK}`,
                        borderRadius: '8px',
                        padding: '16px 10px',
                        boxShadow: `2px 2px 0 ${GOLD}`,
                    }}>
                        <div style={{ fontSize: 10, color: TEXT_SUB, textAlign: 'center', marginBottom: 10, fontFamily: 'Georgia, "Noto Serif KR", serif', letterSpacing: '0.5px' }}>직계 가족</div>
                        <MiniTree
                            persons={allPersons}
                            currentPersonId={id}
                            subdomain={subdomain}
                        />
                    </div>

                    {/* ── 중앙: 인물 정보 폼 ──────────────────────────────── */}
                    <div style={{
                        flex: 1,
                        background: BG_CARD,
                        border: `1px solid ${GOLD}`,
                        borderRight: `2px solid ${GOLD_DARK}`,
                        borderBottom: `2px solid ${GOLD_DARK}`,
                        borderRadius: '8px',
                        padding: '20px',
                        boxShadow: `2px 2px 0 ${GOLD}`,
                    }}>
                        {/* 사진 + 폼 필드 */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '4px' }}>

                            {/* 사진 열 */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '90px' }}>
                                <div style={{ width: '80px', height: '90px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${GOLD}`, background: GOLD_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {photoUrl
                                        ? <img src={photoUrl} alt={personName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <User size={32} style={{ color: GOLD }} />
                                    }
                                </div>
                                <label style={{
                                    padding: '4px 8px',
                                    background: BG,
                                    border: `1px solid ${GOLD}`,
                                    borderRight: `2px solid ${GOLD_DARK}`,
                                    borderBottom: `2px solid ${GOLD_DARK}`,
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    color: GOLD_DARK,
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                                    userSelect: 'none',
                                }}>
                                    사진불러오기
                                    <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" style={{ display: 'none' }}
                                        onChange={e => { const f = e.target.files?.[0]; if (f) setPendingPhotoFile(f); }} />
                                </label>
                                <div style={{ fontSize: '10px', color: TEXT_SUB, textAlign: 'center', lineHeight: '1.5' }}>
                                    마우스/손가락으로<br />크기·위치 조정
                                </div>
                            </div>

                            {/* 폼 필드 열 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={rowSt}>
                                    <label style={labelSt}>이름</label>
                                    <input style={inputSt} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="이름 입력" />
                                </div>
                                <div style={rowSt}>
                                    <label style={labelSt}>결혼 전 성 (Maiden Name)</label>
                                    <input style={inputSt} value={form.maiden_name} onChange={e => upd('maiden_name', e.target.value)} placeholder="예) 김, Smith" maxLength={50} />
                                </div>
                                <div style={rowSt}>
                                    <label style={labelSt}>이전 이름 (개명 전)</label>
                                    <input style={inputSt} value={form.former_name} onChange={e => upd('former_name', e.target.value)} placeholder="개명 이전 이름" maxLength={50} />
                                </div>
                                <div style={{ ...rowSt, fontSize: '11px', color: TEXT_SUB, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                                    ID: {person.oc_id || '—'}
                                </div>
                                <div style={rowSt}>
                                    <label style={labelSt}>생년월일</label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="date" style={{ ...inputSt, flex: 1 }} value={form.birth_date} onChange={e => upd('birth_date', e.target.value)} />
                                        <label style={{ fontSize: '11px', color: TEXT_SUB, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            <input type="checkbox" checked={form.birth_lunar} onChange={e => upd('birth_lunar', e.target.checked)} style={{ marginRight: '3px' }} />음력
                                        </label>
                                    </div>
                                </div>
                                <div style={rowSt}>
                                    <label style={{ fontSize: '11px', color: TEXT_SUB, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                        <input type="checkbox" checked={form.is_deceased} onChange={e => upd('is_deceased', e.target.checked)} />
                                        <span style={{ color: GOLD_DARK, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>사망</span>
                                        {form.is_deceased && <span style={{ color: TEXT_SUB }}> → 사망일:</span>}
                                    </label>
                                    {form.is_deceased && (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <input type="date" style={{ ...inputSt, flex: 1 }} value={form.death_date} onChange={e => upd('death_date', e.target.value)} />
                                            <label style={{ fontSize: '11px', color: TEXT_SUB, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                <input type="checkbox" checked={form.death_lunar} onChange={e => upd('death_lunar', e.target.checked)} style={{ marginRight: '3px' }} />음력
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div style={rowSt}>
                                    <label style={labelSt}>대표정보1</label>
                                    <input style={inputSt} value={form.display_info1} onChange={e => upd('display_info1', e.target.value)} placeholder="예) 대표이사" maxLength={50} />
                                </div>
                                <div style={rowSt}>
                                    <label style={labelSt}>대표정보2</label>
                                    <input style={inputSt} value={form.display_info2} onChange={e => upd('display_info2', e.target.value)} placeholder="예) 서울대학교 졸업" maxLength={50} />
                                </div>
                                <div style={{ ...rowSt, marginBottom: 0 }}>
                                    <label style={labelSt}>대표정보3</label>
                                    <input style={inputSt} value={form.display_info3} onChange={e => upd('display_info3', e.target.value)} placeholder="예) 서울 거주" maxLength={50} />
                                </div>
                            </div>
                        </div>

                        {/* [가족 추가] [저장] 버튼 */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: `1px solid rgba(196,168,130,0.3)` }}>
                            <button
                                type="button"
                                onClick={() => setShowFamilyAdd(v => !v)}
                                style={{
                                    padding: '8px 16px',
                                    background: showFamilyAdd ? GOLD_LIGHT : BG,
                                    border: `1px solid ${GOLD}`,
                                    borderRight: `2px solid ${GOLD_DARK}`,
                                    borderBottom: `2px solid ${GOLD_DARK}`,
                                    borderRadius: '6px',
                                    color: GOLD_DARK,
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                                }}
                            >
                                가족 추가
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                style={{
                                    padding: '8px 20px',
                                    background: GOLD,
                                    border: 'none',
                                    borderRight: `2px solid ${GOLD_DARK}`,
                                    borderBottom: `2px solid ${GOLD_DARK}`,
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontFamily: 'Georgia, "Noto Serif KR", serif',
                                }}
                            >
                                저장
                            </button>
                        </div>

                        {/* 가족 추가 폼 (§9 레이아웃) */}
                        {showFamilyAdd && (
                            <div style={{ marginTop: '16px', padding: '16px', background: GOLD_LIGHT, borderRadius: '6px', border: `1px solid ${GOLD}` }}>
                                {/* 이름 입력 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ color: GOLD_DARK, fontSize: '12px', whiteSpace: 'nowrap', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>이름:</span>
                                    <input
                                        value={relationName}
                                        onChange={e => setRelationName(e.target.value)}
                                        placeholder="이름을 입력하세요"
                                        style={{ ...inputSt, flex: 1 }}
                                    />
                                </div>

                                {/* 관계 유형 체크박스 */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                    {[
                                        { type: 'parent', label: '부모' },
                                        { type: 'sibling', label: '형제' },
                                        { type: 'child', label: '자녀' },
                                    ].map(({ type, label }) => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: TEXT, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                                            <input
                                                type="checkbox"
                                                checked={addRelationType === type}
                                                onChange={() => setAddRelationType(addRelationType === type ? null : type)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>

                                {/* 성별 체크박스 */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                                    {[{ v: 'male', l: '남' }, { v: 'female', l: '녀' }].map(({ v, l }) => (
                                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: TEXT, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                                            <input
                                                type="checkbox"
                                                checked={relationGender === v}
                                                onChange={() => setRelationGender(v)}
                                            />
                                            {l}
                                        </label>
                                    ))}
                                </div>

                                {/* 입양 체크박스 */}
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                                    {[
                                        { type: 'birth-parent', label: '입양후 친부모' },
                                        { type: 'adoption', label: '입양' },
                                    ].map(({ type, label }) => (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: TEXT, fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                                            <input
                                                type="checkbox"
                                                checked={addRelationType === type}
                                                onChange={() => setAddRelationType(addRelationType === type ? null : type)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>

                                {/* 기존 인물 검색 + 연결 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span style={{ color: GOLD_DARK, fontSize: '12px', whiteSpace: 'nowrap', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>기존 인물 검색:</span>
                                    <input
                                        value={existingPersonSearch}
                                        onChange={e => setExistingPersonSearch(e.target.value)}
                                        placeholder="이름 또는 ID"
                                        style={{ ...inputSt, flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleConnectExisting}
                                        disabled={submittingRelation}
                                        style={{ padding: '6px 14px', background: GOLD, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: submittingRelation ? 'wait' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'Georgia, "Noto Serif KR", serif' }}
                                    >
                                        연결
                                    </button>
                                </div>

                                {/* 또는 생성 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: TEXT_SUB, fontSize: '12px' }}>또는</span>
                                    <button
                                        type="button"
                                        onClick={handleCreateAndConnect}
                                        disabled={submittingRelation}
                                        style={{ padding: '6px 20px', background: GOLD_DARK, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: submittingRelation ? 'wait' : 'pointer', fontFamily: 'Georgia, "Noto Serif KR", serif' }}
                                    >
                                        {submittingRelation ? '처리 중...' : '생성'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 우측: 메뉴 버튼 (세로 배치) ────────────────────── */}
                    <div style={{ width: '156px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                        <MenuBtn label="사진자료실"   active={activeTool === 'photos'}       onClick={() => toggleTool('photos')} />
                        <MenuBtn label="주요자료실"   active={activeTool === 'major'}        onClick={() => toggleTool('major')} />
                        <MenuBtn label="주요약력"     active={activeTool === 'history'}      onClick={() => toggleTool('history')} />
                        <MenuBtn label="자서전"       active={activeTool === 'autobiography'} onClick={() => toggleTool('autobiography')} />
                        <MenuBtn label="작품실"       active={activeTool === 'works'}        onClick={() => toggleTool('works')} />
                        <MenuBtn label="육성녹음"     active={activeTool === 'voice'}        onClick={() => toggleTool('voice')} />
                        <MenuBtn label="공유앨범"     active={activeTool === 'album'}        onClick={() => toggleTool('album')} />
                        <div style={{ borderTop: `1px solid ${GOLD}`, margin: '4px 0' }} />
                        <MenuBtn label="초대하기"     active={activeTool === 'invite'}       onClick={() => toggleTool('invite')} />
                        {role === 'owner' && (
                            <MenuBtn label="접근요청관리" active={activeTool === 'access'} onClick={() => toggleTool('access')} />
                        )}
                    </div>
                </div>

                {/* ── 하단: 컨텐츠 (버튼 클릭 시만 표시) ──────────────── */}
                {activeTool && (
                    <div style={{ marginTop: '20px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${GOLD}`, borderRight: `2px solid ${GOLD_DARK}`, borderBottom: `2px solid ${GOLD_DARK}`, background: BG_CARD, boxShadow: `2px 2px 0 ${GOLD}` }}>

                        {/* 사진자료실 */}
                        {activeTool === 'photos' && (
                            <div>
                                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${GOLD}`, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: TEXT, fontWeight: 'bold', fontSize: '14px', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>
                                        사진자료실 ({photos.length}장)
                                    </span>
                                    {photos.length > 0 && (
                                        <button onClick={() => setFullscreenIdx(0)} style={{ padding: '6px 14px', background: GOLD, border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                            ▶ 슬라이드쇼
                                        </button>
                                    )}
                                </div>
                                <div style={{ padding: '16px' }}>
                                    {photos.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '32px 0', color: TEXT_SUB }}>
                                            <Image size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                                            <p style={{ fontSize: '13px' }}>등록된 사진이 없습니다</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                                            {photos.map((photo, i) => (
                                                <div key={photo.id} onClick={() => setFullscreenIdx(i)}
                                                    style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: `1px solid ${GOLD}` }}>
                                                    <img src={photo.url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <PhotoImportModal siteId={siteId} inline={true} onDone={fetchPhotos} onClose={() => {}} />
                                </div>
                            </div>
                        )}

                        {/* 육성녹음 */}
                        {activeTool === 'voice' && (
                            <VoiceRecordingModal siteId={siteId} persons={[person]} inline={true} onClose={() => setActiveTool(null)} />
                        )}

                        {/* 초대하기 */}
                        {activeTool === 'invite' && (
                            <InvitationModal siteId={siteId} personId={person.id} personName={personName} museumName={`${personName} 자료실`} inline={true} onClose={() => setActiveTool(null)} />
                        )}

                        {/* 접근요청관리 */}
                        {activeTool === 'access' && (
                            <AccessRequestManager siteId={siteId} inline={true} onClose={() => setActiveTool(null)} />
                        )}

                        {/* 준비 중 항목 */}
                        {['major', 'history', 'autobiography', 'works', 'album'].includes(activeTool) && (
                            <div style={{ padding: '48px', textAlign: 'center', color: TEXT_SUB }}>
                                <p style={{ fontSize: '14px', fontFamily: 'Georgia, "Noto Serif KR", serif' }}>준비 중입니다</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* 풀스크린 플레이어 */}
            {fullscreenIdx !== null && photos.length > 0 && (
                <FullscreenPlayer
                    items={photos.map(p => ({ ...p, type: 'photo' }))}
                    startIndex={fullscreenIdx}
                    onClose={() => setFullscreenIdx(null)}
                />
            )}
        </div>
    );
}
