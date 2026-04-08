/**
 * ArchivePage.jsx — 자료실 (§8 §22 §23 §24)
 * 카드 중심 확장 방식. 화살표 클릭으로 가족 추가.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, LogOut, QrCode, Camera } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import CardTreeCanvas from '../../components/museum/CardTreeCanvas';

/* ─── 스타일 상수 ──────────────────────────────────────────── */
const GOLD     = '#C4A882';
const BG_PAGE  = '#F5F0E8';
const BG_CARD  = '#FAFAF5';
const TEXT_DARK = '#3D2008';
const TEXT_MID  = '#5a4a3a';
const TEXT_LIGHT = '#A09888';

const BLOCK_STYLE = {
    border: `1px solid ${GOLD}`,
    background: BG_CARD,
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '2px 2px 0 #c4a87a',
    borderRadius: 8,
};

const MENU_BTN = {
    background: '#FDF8F0',
    border: `1px solid ${GOLD}`,
    borderRight: '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow: '1px 1px 0 #c4a87a',
    color: TEXT_DARK,
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 18,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'transform 0.1s',
};

const INPUT_STYLE = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 6,
    border: '1.5px solid #DDD5C8',
    background: '#FAFAF7',
    fontSize: 15,
    color: TEXT_DARK,
    outline: 'none',
    boxSizing: 'border-box',
};

/* ─── 성별 기본값 (화살표 방향·역할 기반) ─────────────────── */
function defaultGenderFor(layoutRole, direction) {
    if (direction === 'up') return null; // 부모: 사용자 선택
    if (layoutRole === 'husb' && direction === 'right') return 'female'; // 배우자
    if (layoutRole === 'wife' && direction === 'right') return null;      // 형제
    if (layoutRole === 'child' && direction === 'right') return 'female'; // 며느리
    if (layoutRole === 'child_sp' && direction === 'right') return null;  // 형제
    return null;
}

/* ─── PersonModal ──────────────────────────────────────────── */
function PersonModal({ modal, onClose, onSave, onDelete }) {
    const { person } = modal;
    const initForm = {
        name: person?.name || '',
        birth_date: person?.birth_date ? person.birth_date.slice(0, 10) : '',
        birth_lunar: person?.birth_lunar || false,
        gender: person?.gender || modal.suggestGender || '',
        is_deceased: person?.is_deceased || false,
        death_date: person?.death_date ? person.death_date.slice(0, 10) : '',
        bio1: person?.bio1 || '',
        bio2: person?.bio2 || '',
        bio3: person?.bio3 || '',
    };
    const [form, setForm]             = useState(initForm);
    const [photo, setPhoto]           = useState(null);
    const [photoPreview, setPreview]  = useState(person?.photo_url || null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]           = useState('');
    const [confirmDel, setConfirmDel] = useState(false);
    const fileRef = useRef(null);

    const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('이름을 입력해주세요.'); return; }
        setSubmitting(true); setError('');
        try { await onSave(form, photo); }
        catch (e) { setError(e.response?.data?.message || '저장에 실패했습니다.'); }
        finally { setSubmitting(false); }
    };

    const handleDeleteConfirm = async () => {
        if (!person) { onClose(); return; }
        setSubmitting(true); setError('');
        try { await onDelete(person.id); onClose(); }
        catch (e) { setError('삭제에 실패했습니다.'); }
        finally { setSubmitting(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: BG_CARD, borderRadius: 12, padding: 24, width: 340, maxHeight: '90vh', overflowY: 'auto', ...BLOCK_STYLE }}>

                {confirmDel ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 20, color: TEXT_DARK }}>
                            정말 <strong>{person?.name}</strong>을(를) 제거하시겠습니까?<br />
                            <span style={{ fontSize: 13, color: TEXT_LIGHT }}>관계 정보도 모두 삭제됩니다.</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => setConfirmDel(false)} style={{ ...MENU_BTN, width: 'auto', padding: '8px 20px' }}>취소</button>
                            <button onClick={handleDeleteConfirm} disabled={submitting} style={{ ...MENU_BTN, width: 'auto', padding: '8px 20px', background: '#8A4A4A', color: '#fff', border: '1px solid #8A4A4A' }}>
                                {submitting ? '삭제중…' : '제거'}
                            </button>
                        </div>
                        {error && <div style={{ color: 'red', marginTop: 10, fontSize: 13 }}>{error}</div>}
                    </div>
                ) : (
                    <>
                        {/* 사진 */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                            <div
                                onClick={() => fileRef.current?.click()}
                                style={{ width: 80, height: 80, borderRadius: 40, background: '#EEE', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${GOLD}` }}
                            >
                                {photoPreview
                                    ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <Camera size={28} color={TEXT_LIGHT} />
                                }
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files[0]; if (f) { setPhoto(f); setPreview(URL.createObjectURL(f)); } }}
                            />
                        </div>

                        {/* 이름 */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>이름 *</div>
                            <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="이름을 입력하세요" style={INPUT_STYLE} autoFocus />
                        </div>

                        {/* 생년월일 */}
                        <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>생년월일</div>
                                <input type="date" value={form.birth_date} onChange={e => setF('birth_date', e.target.value)} style={INPUT_STYLE} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: TEXT_MID, marginBottom: 2, whiteSpace: 'nowrap' }}>
                                <input type="radio" name="lunar" checked={!form.birth_lunar} onChange={() => setF('birth_lunar', false)} /> 양력
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: TEXT_MID, marginBottom: 2, whiteSpace: 'nowrap' }}>
                                <input type="radio" name="lunar" checked={form.birth_lunar} onChange={() => setF('birth_lunar', true)} /> 음력
                            </label>
                        </div>

                        {/* 성별 */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>성별</div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                {[['male', '남'], ['female', '여']].map(([v, l]) => (
                                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 15, cursor: 'pointer' }}>
                                        <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={() => setF('gender', v)} /> {l}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 고인 */}
                        <div style={{ marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.is_deceased} onChange={e => setF('is_deceased', e.target.checked)} />
                                고인
                            </label>
                            {form.is_deceased && (
                                <input type="date" value={form.death_date} onChange={e => setF('death_date', e.target.value)}
                                    style={{ ...INPUT_STYLE, marginTop: 6 }} placeholder="사망일" />
                            )}
                        </div>

                        {/* 대표정보 */}
                        {[['bio1', '직업·별칭'], ['bio2', '출생지'], ['bio3', '기타']].map(([k, ph]) => (
                            <div key={k} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>{ph}</div>
                                <input value={form[k]} onChange={e => setF(k, e.target.value)} placeholder={ph} style={INPUT_STYLE} />
                            </div>
                        ))}

                        {error && <div style={{ color: '#c0392b', fontSize: 13, marginBottom: 8 }}>{error}</div>}

                        {/* 버튼 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                            <button onClick={onClose} style={{ ...MENU_BTN, flex: 1 }}>취소</button>
                            {person && (
                                <button onClick={() => setConfirmDel(true)} style={{ ...MENU_BTN, flex: 1, background: '#8A4A4A', color: '#fff', border: '1px solid #8A4A4A' }}>
                                    제거
                                </button>
                            )}
                            <button onClick={handleSave} disabled={submitting} style={{ ...MENU_BTN, flex: 1, background: '#4A7F4A', color: '#fff', border: '1px solid #4A7F4A' }}>
                                {submitting ? '저장중…' : '완성'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── 메인 컴포넌트 ────────────────────────────────────────── */
export default function ArchivePage() {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const { logout } = useAuthStore();

    const [site, setSite]         = useState(null);
    const [persons, setPersons]   = useState([]);
    const [relations, setRelations] = useState([]);
    const [curator, setCurator]   = useState(null);
    const [loading, setLoading]   = useState(true);

    // 대기 카드: { anchorId, anchorLayoutRole, direction, suggestGender }
    const [pendingCard, setPendingCard] = useState(null);
    // 모달: { person (편집 시), suggestGender, relation }
    const [modal, setModal]       = useState(null);
    // 입장권 폼
    const [showPassForm, setShowPassForm] = useState(false);
    const [passQRUrl, setPassQRUrl]       = useState(null);

    /* ─ 데이터 로드 ────────────────────────────────────────── */
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
                } catch { /* 무시 */ }
            }
            setRelations(rels);
            setCurator(ps.find(p => p.match_status === 'linked') || null);
        } catch (err) {
            console.error('ArchivePage loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [subdomain]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ─ 화살표 클릭 → 대기 카드 생성 ─────────────────────── */
    const handleArrowClick = useCallback((node, direction) => {
        if (pendingCard) return; // 이미 대기 카드 있으면 무시
        setPendingCard({
            anchorId: node.person.id,
            anchorLayoutRole: node.layoutRole,
            direction,
            suggestGender: defaultGenderFor(node.layoutRole, direction),
        });
    }, [pendingCard]);

    /* ─ 카드 더블클릭 → 모달 열기 ─────────────────────────── */
    const handleCardDoubleClick = useCallback((person) => {
        if (!person) {
            // 대기 카드 더블클릭 → 모달 열기 (대기 카드 정보 유지)
            if (!pendingCard) return;
            setModal({
                person: null,
                suggestGender: pendingCard.suggestGender,
                relation: pendingCard,
            });
        } else {
            // 완성 카드 더블클릭 → 편집 모달
            setModal({ person, suggestGender: null, relation: null });
        }
    }, [pendingCard]);

    const handleCardClick = useCallback((_person) => {
        // 단순 클릭은 별도 동작 없음 (선택 상태 표시용 예비)
    }, []);

    /* ─ [완성] 저장 ────────────────────────────────────────── */
    const handleSave = useCallback(async (form, photoFile) => {
        if (!site?.id) return;

        const { person: existingPerson, relation } = modal;
        const isNew = !existingPerson;

        const payload = {
            name: form.name.trim(),
            gender: form.gender || null,
            birth_date: form.birth_date || null,
            birth_lunar: form.birth_lunar,
            is_deceased: form.is_deceased,
            death_date: form.is_deceased ? form.death_date || null : null,
            bio1: form.bio1 || null,
            bio2: form.bio2 || null,
            bio3: form.bio3 || null,
        };

        if (isNew) {
            // 자녀인 경우 parent_id 주입
            if (relation?.direction === 'down') {
                payload.parent1_id = relation.anchorId;
                // co-parent: 관장 배우자
                const anchor = persons.find(p => p.id === relation.anchorId);
                if (anchor?.spouse_id) payload.parent2_id = anchor.spouse_id;
                else {
                    const spRel = relations.find(r =>
                        r.relation_type === 'spouse' && (r.person1_id === relation.anchorId || r.person2_id === relation.anchorId)
                    );
                    if (spRel) payload.parent2_id = spRel.person1_id === relation.anchorId ? spRel.person2_id : spRel.person1_id;
                }
            }

            const res = await axios.post(`/api/persons/${site.id}`, payload);
            const newPerson = res.data.data;

            // 관계 생성
            if (relation && relation.direction !== 'down') {
                let relType, p1, p2;
                const dir = relation.direction;
                const anchorId = relation.anchorId;
                const role = relation.anchorLayoutRole;

                if (dir === 'up') {
                    // 새 인물 = 부모, anchor = 자녀
                    relType = 'parent'; p1 = newPerson.id; p2 = anchorId;
                } else if (dir === 'left') {
                    relType = 'sibling'; p1 = anchorId; p2 = newPerson.id;
                } else if (dir === 'right') {
                    if (role === 'wife' || role === 'w_sib' || role === 'child_sp') {
                        relType = 'sibling'; p1 = anchorId; p2 = newPerson.id;
                    } else {
                        relType = 'spouse'; p1 = anchorId; p2 = newPerson.id;
                    }
                }
                if (relType) {
                    await axios.post(`/api/persons/${site.id}/relations`, {
                        person1_id: p1, person2_id: p2, relation_type: relType,
                    });
                }
            }

            // 사진 업로드
            if (photoFile) {
                const fd = new FormData(); fd.append('photo', photoFile);
                await axios.post(`/api/persons/${site.id}/${newPerson.id}/photo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }).catch(() => {});
            }
        } else {
            // 수정
            await axios.put(`/api/persons/${site.id}/${existingPerson.id}`, payload);
            if (photoFile) {
                const fd = new FormData(); fd.append('photo', photoFile);
                await axios.post(`/api/persons/${site.id}/${existingPerson.id}/photo`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                }).catch(() => {});
            }
        }

        await loadData();
        setModal(null);
        setPendingCard(null);
    }, [modal, site, persons, relations, loadData]);

    /* ─ [제거] 삭제 ────────────────────────────────────────── */
    const handleDelete = useCallback(async (personId) => {
        if (!site?.id) return;
        await axios.delete(`/api/persons/${site.id}/${personId}`);
        await loadData();
        setPendingCard(null);
    }, [site, loadData]);

    /* ─ 모달 닫기 ──────────────────────────────────────────── */
    const handleModalClose = () => {
        setModal(null);
        setPendingCard(null);
    };

    /* ─ 입장권 QR 생성 ────────────────────────────────────── */
    const handleGeneratePass = () => {
        const token = Math.random().toString(36).slice(2, 14).toUpperCase();
        const passUrl = `https://orgcell.com/${subdomain}/visit?pass=${token}`;
        setPassQRUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(passUrl)}&size=200x200`);
    };

    const menuPress = e => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = 'none'; };
    const menuRelease = e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '1px 1px 0 #c4a87a'; };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: BG_PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: '#8a7040' }} />
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: BG_PAGE, fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
            {/* ── 헤더 ── */}
            <div style={{ background: '#FEFCF8', borderBottom: `1px solid ${GOLD}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Georgia, serif', color: TEXT_DARK, fontWeight: 800, fontSize: 22, cursor: 'pointer' }}
                    onClick={() => navigate(`/${subdomain}`)}>
                    자료실
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {curator?.name && (
                        <span style={{ fontSize: 15, color: TEXT_MID }}>{curator.name}의 박물관</span>
                    )}
                    <button
                        onClick={() => navigate(`/${subdomain}`)}
                        style={{ padding: '6px 18px', borderRadius: 6, fontSize: 16, fontWeight: 600, background: '#4A7F4A', color: '#fff', border: 'none', cursor: 'pointer', borderBottom: '2px solid #3a6a3a' }}
                    >완료</button>
                    <button
                        onClick={async () => { await logout(); navigate('/auth/login'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${GOLD}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: TEXT_MID, fontSize: 14 }}
                    >
                        <LogOut size={14} /> 로그아웃
                    </button>
                </div>
            </div>

            {/* ── 메인 영역 ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* 캔버스 */}
                <CardTreeCanvas
                    persons={persons}
                    relations={relations}
                    curator={curator}
                    pendingCard={pendingCard}
                    onArrowClick={handleArrowClick}
                    onCardClick={handleCardClick}
                    onCardDoubleClick={handleCardDoubleClick}
                />

                {/* ── 우측 메뉴 패널 (§8) ── */}
                <div style={{ width: 200, flexShrink: 0, borderLeft: `1px solid ${GOLD}`, background: '#FEFCF8', padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['사진자료실', '주요자료실', '주요약력', '자서전', '작품실', '육성녹음', '공유앨범'].map(label => (
                        <button key={label} style={MENU_BTN} onMouseDown={menuPress} onMouseUp={menuRelease} onMouseLeave={menuRelease}>{label}</button>
                    ))}
                    <div style={{ borderTop: `1px solid ${GOLD}`, margin: '4px 0' }} />
                    <button style={MENU_BTN} onMouseDown={menuPress} onMouseUp={menuRelease} onMouseLeave={menuRelease}>초대하기</button>
                    <button
                        style={{ ...MENU_BTN, display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => { setShowPassForm(p => !p); setPassQRUrl(null); }}
                        onMouseDown={menuPress} onMouseUp={menuRelease} onMouseLeave={menuRelease}
                    >
                        <QrCode size={16} /> 입장권 발급
                    </button>
                    <button style={MENU_BTN} onMouseDown={menuPress} onMouseUp={menuRelease} onMouseLeave={menuRelease}>접근요청관리</button>

                    {/* 입장권 폼 */}
                    {showPassForm && (
                        <div style={{ ...BLOCK_STYLE, padding: 12, fontSize: 13 }}>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ color: TEXT_LIGHT, marginBottom: 4 }}>유효기간</div>
                                <select style={{ ...INPUT_STYLE, fontSize: 13 }}>
                                    <option value="3days">3일</option>
                                    <option value="7days">7일</option>
                                    <option value="30days">1개월</option>
                                    <option value="forever">무제한</option>
                                </select>
                            </div>
                            <button onClick={handleGeneratePass} style={{ ...MENU_BTN, fontSize: 13, padding: '7px 10px' }}>QR 생성</button>
                            {passQRUrl && <img src={passQRUrl} alt="QR" style={{ width: '100%', marginTop: 8, borderRadius: 4 }} />}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PersonModal ── */}
            {modal && (
                <PersonModal
                    modal={modal}
                    onClose={handleModalClose}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
