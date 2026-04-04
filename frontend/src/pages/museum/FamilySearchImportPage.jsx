/**
 * FamilySearchImportPage.jsx — FamilySearch 가족트리 가져오기
 *
 * 흐름:
 *   1. loading    — GET /tree/import 호출, 진행 상황 표시
 *   2. results    — 매칭 결과 표시, 관장이 확인/수정
 *   3. saving     — POST /tree/add 호출
 *   4. done       — 저장 완료 + Memories 가져오기 옵션
 *   5. mem_load   — GET /memories/list 호출
 *   6. memories   — 사진/문서 미리보기 + 선택
 *   7. mem_save   — POST /memories/import 호출
 *   8. complete   — 최종 완료
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Check, X, Link2, UserPlus, SkipForward,
    ChevronDown, ChevronUp, Search, Users, TreePine, Loader2,
    Image, FileText, Download, Eye,
} from 'lucide-react';
import axios from 'axios';

// ── 매칭 상태 배지 ──
function MatchBadge({ status, score, reason }) {
    if (status === 'suggest') {
        const pct = Math.round((score || 0) * 100);
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFEEBA' }}
                title={reason || ''}
            >
                <Link2 size={11} />
                유사 {pct}%
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: '#e8f5e0', color: '#2a6a2a', border: '1px solid #b8ddb0' }}
        >
            <UserPlus size={11} />
            새 인물
        </span>
    );
}

// ── 세대 라벨 ──
function genLabel(gen) {
    const labels = ['본인', '부모', '조부모', '증조부모', '고조부모', '5대조'];
    return labels[gen] || `${gen}대조`;
}

// ── 로딩 애니메이션 ──
function ImportLoader({ message, sub }) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
                <div
                    className="w-16 h-16 rounded-full border-4 animate-spin"
                    style={{ borderColor: '#e8e0d0', borderTopColor: '#4A8DB7' }}
                />
                <TreePine
                    size={24}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ color: '#4A8DB7' }}
                />
            </div>
            <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>{message}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#9a9a8a' }}>{sub}</p>}
            <p className="text-xs mt-3" style={{ color: '#b0a090' }}>
                세대가 많을수록 시간이 걸릴 수 있습니다
            </p>
        </div>
    );
}

// ── 인물 카드 ──
function PersonCard({ person, decision, onDecisionChange }) {
    const [expanded, setExpanded] = useState(false);
    const { match, relations } = person;
    const isSuggest = match.status === 'suggest';
    const currentAction = decision?.action || (isSuggest ? 'link' : 'create');

    const handleAction = (action) => {
        onDecisionChange({
            ...person,
            action,
            person_id: action === 'link' ? match.person_id : null,
        });
    };

    return (
        <div
            className="rounded-xl overflow-hidden transition-all"
            style={{
                background: '#fff',
                border: `1.5px solid ${currentAction === 'skip' ? '#e8e0d0' : isSuggest ? '#FFEEBA' : '#b8ddb0'}`,
                opacity: currentAction === 'skip' ? 0.5 : 1,
            }}
        >
            <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded((v) => !v)}
            >
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ background: person.gender === 'male' ? '#e0eaf5' : '#f5e0ea' }}
                >
                    {person.gender === 'male' ? '👨' : '👩'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: '#3a3a2a' }}>{person.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0ece4', color: '#7a6e5e' }}>
                            {genLabel(person.generation)}
                        </span>
                        <MatchBadge {...match} />
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#9a9a8a' }}>
                        {person.birth_year ? `${person.birth_year}년생` : ''}
                        {person.death_year ? ` — ${person.death_year}년 사망` : ''}
                        {person.birth_place ? ` · ${person.birth_place}` : ''}
                    </div>
                    {isSuggest && match.person_name && (
                        <div className="text-xs mt-0.5" style={{ color: '#856404' }}>
                            기존 인물 "{match.person_name}"과 유사 — {match.reason}
                        </div>
                    )}
                </div>
                {expanded ? <ChevronUp size={16} style={{ color: '#9a9a8a' }} /> : <ChevronDown size={16} style={{ color: '#9a9a8a' }} />}
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: '#f0ece4' }}>
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {isSuggest && (
                            <button
                                onClick={() => handleAction('link')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{
                                    background: currentAction === 'link' ? '#4A8DB7' : '#f0ece4',
                                    color: currentAction === 'link' ? '#fff' : '#5a5a4a',
                                    border: currentAction === 'link' ? '1px solid #4A8DB7' : '1px solid #e8e0d0',
                                }}
                            >
                                <Link2 size={12} /> 기존 인물에 연결
                            </button>
                        )}
                        <button
                            onClick={() => handleAction('create')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                                background: currentAction === 'create' ? '#2a6a2a' : '#f0ece4',
                                color: currentAction === 'create' ? '#fff' : '#5a5a4a',
                                border: currentAction === 'create' ? '1px solid #2a6a2a' : '1px solid #e8e0d0',
                            }}
                        >
                            <UserPlus size={12} /> 새 인물로 추가
                        </button>
                        <button
                            onClick={() => handleAction('skip')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{
                                background: currentAction === 'skip' ? '#e74c3c' : '#f0ece4',
                                color: currentAction === 'skip' ? '#fff' : '#5a5a4a',
                                border: currentAction === 'skip' ? '1px solid #e74c3c' : '1px solid #e8e0d0',
                            }}
                        >
                            <SkipForward size={12} /> 건너뛰기
                        </button>
                    </div>
                    {relations && (
                        <div className="text-xs space-y-1" style={{ color: '#7a6e5e' }}>
                            {relations.parents?.length > 0 && <p>부모: {relations.parents.map((p) => p.name || p.fs_id).join(', ')}</p>}
                            {relations.spouses?.length > 0 && <p>배우자: {relations.spouses.map((s) => s.name || s.fs_id).join(', ')}</p>}
                            {relations.children?.length > 0 && <p>자녀: {relations.children.map((c) => c.name || c.fs_id).join(', ')}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════��═══════════════════════════
export default function FamilySearchImportPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const siteId = searchParams.get('siteId');
    const subdomain = searchParams.get('subdomain');
    const maxGen = parseInt(searchParams.get('maxGen') || '5', 10);

    // ── 상태 ──
    const [step, setStep] = useState('loading');
    const [persons, setPersons] = useState([]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [decisions, setDecisions] = useState({});
    const [genFilter, setGenFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [saveResult, setSaveResult] = useState(null);

    // Memories
    const [memoriesData, setMemoriesData] = useState([]);
    const [memorySelections, setMemorySelections] = useState({});
    const [memoriesSaveResult, setMemoriesSaveResult] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // ── 1단계: 가져오기 ──
    useEffect(() => {
        if (!siteId) { setError('siteId가 필요합니다.'); setStep('error'); return; }

        let cancelled = false;
        async function doImport() {
            try {
                const res = await axios.get('/api/familysearch/tree/import', {
                    params: { siteId, maxGen },
                    timeout: 120000,
                });
                if (cancelled) return;
                if (res.data?.success) {
                    const { persons: imported, stats: importStats } = res.data.data;
                    setPersons(imported);
                    setStats(importStats);
                    const defaultDecisions = {};
                    for (const p of imported) {
                        defaultDecisions[p.fs_id] = {
                            ...p,
                            action: p.match.status === 'suggest' ? 'link' : 'create',
                            person_id: p.match.person_id || null,
                        };
                    }
                    setDecisions(defaultDecisions);
                    setStep('results');
                } else {
                    throw new Error(res.data?.message || '가져오기 실패');
                }
            } catch (err) {
                if (cancelled) return;
                if (err.response?.status === 401) {
                    try {
                        const authRes = await axios.get('/api/familysearch/auth');
                        if (authRes.data?.authUrl) { window.location.href = authRes.data.authUrl; return; }
                    } catch { /* ignore */ }
                }
                setError(err.response?.data?.message || err.message || '가져오기에 실패했습니다.');
                setStep('error');
            }
        }
        doImport();
        return () => { cancelled = true; };
    }, [siteId, maxGen]);

    // ── 필터링 ──
    const filtered = useMemo(() => {
        let list = persons;
        if (genFilter !== 'all') list = list.filter((p) => p.generation === parseInt(genFilter, 10));
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.fs_id?.toLowerCase().includes(q));
        }
        return list;
    }, [persons, genFilter, searchQuery]);

    const actionCounts = useMemo(() => {
        const counts = { link: 0, create: 0, skip: 0 };
        for (const d of Object.values(decisions)) { if (d.action) counts[d.action]++; }
        return counts;
    }, [decisions]);

    const generations = useMemo(() => {
        return [...new Set(persons.map((p) => p.generation))].sort((a, b) => a - b);
    }, [persons]);

    const handleDecisionChange = (updated) => {
        setDecisions((prev) => ({ ...prev, [updated.fs_id]: updated }));
    };

    const handleBulkAction = (action) => {
        setDecisions((prev) => {
            const next = { ...prev };
            for (const p of filtered) {
                next[p.fs_id] = { ...next[p.fs_id], action, person_id: action === 'link' ? (next[p.fs_id]?.match?.person_id || next[p.fs_id]?.person_id) : null };
            }
            return next;
        });
    };

    // ── 3단계: 저장 ──
    const handleSave = async () => {
        setStep('saving');
        try {
            const personsToSave = Object.values(decisions).map((d) => ({
                fs_id: d.fs_id, action: d.action, person_id: d.person_id || null,
                name: d.name, gender: d.gender, birth_year: d.birth_year, death_year: d.death_year,
                living: d.living, relations: d.relations,
            }));
            const res = await axios.post('/api/familysearch/tree/add', { siteId: parseInt(siteId, 10), persons: personsToSave });
            if (res.data?.success) { setSaveResult(res.data.data); setStep('done'); }
            else throw new Error(res.data?.message || '저장 실패');
        } catch (err) {
            setError(err.response?.data?.message || err.message || '저장에 실패했습니다.');
            setStep('error');
        }
    };

    // ── Memories 가져오기 ──
    const handleLoadMemories = useCallback(async () => {
        setStep('mem_load');
        try {
            const res = await axios.get('/api/familysearch/memories/list', { params: { siteId }, timeout: 120000 });
            if (res.data?.success) {
                const { persons: memPersons } = res.data.data;
                setMemoriesData(memPersons);
                // 기본: 모든 사진 선택
                const selections = {};
                for (const mp of memPersons) {
                    for (const m of mp.memories) {
                        selections[m.fs_memory_id] = true;
                    }
                }
                setMemorySelections(selections);
                setStep('memories');
            } else {
                throw new Error(res.data?.message || 'Memories 조회 실패');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                try {
                    const authRes = await axios.get('/api/familysearch/auth');
                    if (authRes.data?.authUrl) { window.location.href = authRes.data.authUrl; return; }
                } catch { /* ignore */ }
            }
            setError(err.response?.data?.message || err.message || 'Memories 조회에 실패했습니다.');
            setStep('error');
        }
    }, [siteId]);

    const handleSaveMemories = async () => {
        setStep('mem_save');
        try {
            const selected = [];
            for (const mp of memoriesData) {
                for (const m of mp.memories) {
                    if (memorySelections[m.fs_memory_id]) {
                        selected.push({ ...m, person_id: mp.person_id });
                    }
                }
            }
            const res = await axios.post('/api/familysearch/memories/import', { siteId: parseInt(siteId, 10), memories: selected });
            if (res.data?.success) { setMemoriesSaveResult(res.data.data); setStep('complete'); }
            else throw new Error(res.data?.message || 'Memories 저장 실패');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Memories 저장에 실패했습니다.');
            setStep('error');
        }
    };

    const toggleMemory = (fsMemoryId) => {
        setMemorySelections((prev) => ({ ...prev, [fsMemoryId]: !prev[fsMemoryId] }));
    };

    const totalMemories = memoriesData.reduce((sum, mp) => sum + mp.memories.length, 0);
    const selectedCount = Object.values(memorySelections).filter(Boolean).length;

    const goBack = () => { subdomain ? navigate(`/${subdomain}`) : navigate(-1); };

    return (
        <div className="min-h-screen font-sans" style={{ background: '#FAFAF7' }}>
            {/* ── 헤더 ── */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(250,250,247,0.96)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={goBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft size={20} style={{ color: '#5a5040' }} />
                        </button>
                        <TreePine size={20} style={{ color: '#4A8DB7' }} />
                        <h1 className="font-bold text-base" style={{ color: '#3a3a2a' }}>FamilySearch 연동</h1>
                    </div>
                    {step === 'results' && <div className="text-xs" style={{ color: '#9a9a8a' }}>{persons.length}명 발견</div>}
                    {step === 'memories' && <div className="text-xs" style={{ color: '#9a9a8a' }}>{totalMemories}건 발견</div>}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
                {/* ══ 로딩 ══ */}
                {step === 'loading' && <ImportLoader message="조상 데이터를 가져오는 중..." sub="FamilySearch에서 조상 데이터를 가져오는 중..." />}

                {/* ══ 에러 ══ */}
                {step === 'error' && (
                    <div className="text-center py-16">
                        <X size={48} className="mx-auto mb-4" style={{ color: '#e74c3c' }} />
                        <p className="text-sm font-bold mb-2" style={{ color: '#3a3a2a' }}>{error}</p>
                        <div className="flex gap-3 justify-center mt-4">
                            <button onClick={goBack} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#f0ece4', color: '#5a5a4a' }}>돌아가기</button>
                            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#4A8DB7' }}>다시 시도</button>
                        </div>
                    </div>
                )}

                {/* ══ 매칭 결과 ══ */}
                {step === 'results' && (
                    <>
                        <div className="rounded-2xl p-4 mb-5" style={{ background: '#EBF4FB', border: '1px solid #D0E8F5' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <Users size={18} style={{ color: '#4A8DB7' }} />
                                <span className="text-sm font-bold" style={{ color: '#2A6B8A' }}>FamilySearch에서 {stats?.total || 0}명 발견</span>
                            </div>
                            <div className="flex gap-4 text-xs" style={{ color: '#4A8DB7' }}>
                                <span>유사 매칭: {stats?.suggest || 0}명</span>
                                <span>새 인물: {stats?.new || 0}명</span>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4 flex-wrap items-center">
                            <div className="flex gap-1">
                                <button onClick={() => setGenFilter('all')} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                    style={{ background: genFilter === 'all' ? '#4A8DB7' : '#f0ece4', color: genFilter === 'all' ? '#fff' : '#5a5a4a' }}>전체</button>
                                {generations.map((g) => (
                                    <button key={g} onClick={() => setGenFilter(String(g))} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                        style={{ background: genFilter === String(g) ? '#4A8DB7' : '#f0ece4', color: genFilter === String(g) ? '#fff' : '#5a5a4a' }}>{genLabel(g)}</button>
                                ))}
                            </div>
                            <div className="flex-1 min-w-[120px] relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#b0a090' }} />
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="이름 검색..."
                                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none" style={{ border: '1px solid #e8e0d0', color: '#3a3a2a' }} />
                            </div>
                        </div>

                        <div className="flex gap-2 mb-3">
                            <button onClick={() => handleBulkAction('create')} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                style={{ background: '#e8f5e0', color: '#2a6a2a', border: '1px solid #b8ddb0' }}>전체 추���</button>
                            <button onClick={() => handleBulkAction('skip')} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                style={{ background: '#f0ece4', color: '#7a6e5e', border: '1px solid #e8e0d0' }}>전체 건너뛰기</button>
                        </div>

                        {/* ── 유사 인물 / 새 인물 분리 표시 ── */}
                        {(() => {
                            const suggestList = filtered.filter((p) => p.match.status === 'suggest');
                            const newList = filtered.filter((p) => p.match.status === 'new');
                            return (
                                <>
                                    {suggestList.length > 0 && (
                                        <div className="mb-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Link2 size={14} style={{ color: '#856404' }} />
                                                <h3 className="text-sm font-bold" style={{ color: '#856404' }}>
                                                    유사 인물 ({suggestList.length}명)
                                                </h3>
                                                <span className="text-xs" style={{ color: '#b0a090' }}>기존 인물과 유사합니다. 확인해 주세요.</span>
                                            </div>
                                            <div className="space-y-2">
                                                {suggestList.map((person) => (
                                                    <PersonCard key={person.fs_id} person={person} decision={decisions[person.fs_id]} onDecisionChange={handleDecisionChange} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {newList.length > 0 && (
                                        <div className="mb-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <UserPlus size={14} style={{ color: '#2a6a2a' }} />
                                                <h3 className="text-sm font-bold" style={{ color: '#2a6a2a' }}>
                                                    새로 발견된 조상 ({newList.length}명)
                                                </h3>
                                            </div>
                                            <div className="space-y-2">
                                                {newList.map((person) => (
                                                    <PersonCard key={person.fs_id} person={person} decision={decisions[person.fs_id]} onDecisionChange={handleDecisionChange} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {suggestList.length === 0 && newList.length === 0 && (
                                        <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
                                            <Search size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">검색 결과가 없습니다</p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}

                {/* ══ 저장 중 ══ */}
                {step === 'saving' && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#4A8DB7' }} />
                        <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>인물 데이터를 저장하는 중...</p>
                    </div>
                )}

                {/* ══ 인물 저장 완료 + Memories 옵션 ══ */}
                {step === 'done' && saveResult && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f5e0' }}>
                            <Check size={32} style={{ color: '#2a6a2a' }} />
                        </div>
                        <h2 className="text-lg font-bold mb-2" style={{ color: '#3a3a2a' }}>인물 추가 완료!</h2>
                        <div className="text-sm space-y-1 mb-6" style={{ color: '#7a6e5e' }}>
                            <p>{saveResult.added}명 추가, {saveResult.linked}명 연결, {saveResult.skipped}명 건너뜀</p>
                        </div>

                        {/* Memories 카드 */}
                        <div
                            className="rounded-2xl p-5 mx-auto max-w-sm text-left mb-6"
                            style={{ background: '#fff', border: '1.5px solid #D0E8F5', boxShadow: '0 2px 8px rgba(74,141,183,0.08)' }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#EBF4FB' }}>
                                    <Image size={20} style={{ color: '#4A8DB7' }} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>FamilySearch에 조상 사진/문서가 있습니다</p>
                                    <p className="text-xs" style={{ color: '#9a9a8a' }}>전시관에 추가할 수 있습니다</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleLoadMemories}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
                                    style={{ background: '#4A8DB7' }}
                                >
                                    <Eye size={13} /> 미리보기
                                </button>
                                <button
                                    onClick={goBack}
                                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                                    style={{ background: '#f0ece4', color: '#7a6e5e' }}
                                >
                                    나중에
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={goBack}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                            style={{ background: '#5a8a4a' }}
                        >
                            <TreePine size={14} className="inline mr-1.5" />
                            가족트리 보기
                        </button>
                    </div>
                )}

                {/* ══ Memories 로딩 ══ */}
                {step === 'mem_load' && <ImportLoader message="사진/문서를 가져오는 중..." sub="FamilySearch에서 Memories를 조회합니다" />}

                {/* ══ Memories 미리보기 ══ */}
                {step === 'memories' && (
                    <>
                        <div className="rounded-2xl p-4 mb-5" style={{ background: '#EBF4FB', border: '1px solid #D0E8F5' }}>
                            <div className="flex items-center gap-3">
                                <Image size={18} style={{ color: '#4A8DB7' }} />
                                <span className="text-sm font-bold" style={{ color: '#2A6B8A' }}>
                                    {memoriesData.length}명의 인물에서 {totalMemories}건 발견
                                </span>
                            </div>
                        </div>

                        {memoriesData.length === 0 ? (
                            <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
                                <Image size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm mb-4">FamilySearch에 사진/문서가 없습니��</p>
                                <button onClick={goBack} className="px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#5a8a4a' }}>
                                    가족트리 보기
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {memoriesData.map((mp) => (
                                    <div key={mp.person_id}>
                                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#3a3a2a' }}>
                                            <span>{mp.person_name}</span>
                                            <span className="text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: '#f0ece4', color: '#7a6e5e' }}>
                                                {mp.memories.length}건
                                            </span>
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {mp.memories.map((m) => {
                                                const isSelected = memorySelections[m.fs_memory_id];
                                                const isPhoto = m.type === 'photo';
                                                return (
                                                    <div
                                                        key={m.fs_memory_id}
                                                        className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
                                                        style={{
                                                            aspectRatio: '1',
                                                            background: isPhoto ? '#f0ece4' : '#EBF4FB',
                                                            border: isSelected ? '2px solid #4A8DB7' : '2px solid transparent',
                                                            opacity: isSelected ? 1 : 0.5,
                                                        }}
                                                        onClick={() => toggleMemory(m.fs_memory_id)}
                                                    >
                                                        {isPhoto && m.url ? (
                                                            <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                                <FileText size={24} style={{ color: '#4A8DB7' }} />
                                                                <span className="text-xs mt-1 text-center truncate w-full" style={{ color: '#7a6e5e' }}>
                                                                    {m.title || '문서'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* 선택 체크 */}
                                                        <div
                                                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                                            style={{
                                                                background: isSelected ? '#4A8DB7' : 'rgba(0,0,0,0.3)',
                                                            }}
                                                        >
                                                            {isSelected && <Check size={12} color="#fff" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ══ Memories 저장 중 ══ */}
                {step === 'mem_save' && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#4A8DB7' }} />
                        <p className="text-sm font-bold" style={{ color: '#3a3a2a' }}>사진/문서를 전시관에 추가하는 중...</p>
                    </div>
                )}

                {/* ══ 최종 완료 ══ */}
                {step === 'complete' && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f5e0' }}>
                            <Check size={32} style={{ color: '#2a6a2a' }} />
                        </div>
                        <h2 className="text-lg font-bold mb-2" style={{ color: '#3a3a2a' }}>FamilySearch 연동 완료!</h2>
                        <div className="text-sm space-y-1 mb-6" style={{ color: '#7a6e5e' }}>
                            <p>{saveResult?.added || 0}명 추가, {saveResult?.linked || 0}명 연결</p>
                            {memoriesSaveResult && (
                                <p>사진/문서 {memoriesSaveResult.imported}건 저장</p>
                            )}
                        </div>
                        <button onClick={goBack} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110" style={{ background: '#5a8a4a' }}>
                            <TreePine size={14} className="inline mr-1.5" />
                            가족트리 보기
                        </button>
                    </div>
                )}
            </main>

            {/* ══ 하단 고정 바 — 매칭 결과 ══ */}
            {step === 'results' && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t"
                    style={{ background: 'rgba(250,250,247,0.97)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}>
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="text-xs" style={{ color: '#7a6e5e' }}>
                            <span style={{ color: '#2a6a2a', fontWeight: 700 }}>{actionCounts.create}</span> 추가
                            {' · '}<span style={{ color: '#4A8DB7', fontWeight: 700 }}>{actionCounts.link}</span> 연결
                            {' · '}<span>{actionCounts.skip}</span> 건너뛰기
                        </div>
                        <button onClick={handleSave} disabled={actionCounts.create + actionCounts.link === 0}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                            style={{ background: '#4A8DB7' }}>
                            <Check size={14} className="inline mr-1" />{actionCounts.create + actionCounts.link}명 저장
                        </button>
                    </div>
                </div>
            )}

            {/* ══ 하단 고정 바 — Memories ══ */}
            {step === 'memories' && totalMemories > 0 && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t"
                    style={{ background: 'rgba(250,250,247,0.97)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}>
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="text-xs" style={{ color: '#7a6e5e' }}>
                            {selectedCount} / {totalMemories}건 선택
                        </div>
                        <div className="flex gap-2">
                            <button onClick={goBack} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: '#f0ece4', color: '#7a6e5e' }}>
                                나중에
                            </button>
                            <button onClick={handleSaveMemories} disabled={selectedCount === 0}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                                style={{ background: '#4A8DB7' }}>
                                <Download size={14} className="inline mr-1" />전시관에 추가
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ 사진 미리보기 오버레이 ══ */}
            {previewUrl && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewUrl(null)}>
                    <img src={previewUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
                    <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setPreviewUrl(null)}>
                        <X size={28} />
                    </button>
                </div>
            )}
        </div>
    );
}
