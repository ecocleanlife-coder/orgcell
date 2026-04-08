/**
 * ArchivePage.jsx — 자료실 (§8 §22 §23 §24)
 * 카드 중심 확장 방식. 화살표 클릭으로 가족 추가.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, LogOut, QrCode, Camera } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import CardTreeCanvas from '../../components/museum/CardTreeCanvas';
import DateInputKo from '../../components/museum/DateInputKo';

/* ─── API URL (로컬 dev: 4000, 프로덕션: 상대경로) ───────── */
const API_URL = import.meta.env.VITE_API_URL || '';
const resolveUrl = (url) => (url && url.startsWith('/uploads')) ? `${API_URL}${url}` : (url || '');

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
function defaultGenderFor(_layoutRole, direction) {
    if (direction === 'up')    return null;     // 부모: 사용자 선택
    if (direction === 'right') return 'female'; // 남성 카드 → 배우자(여성)
    if (direction === 'left')  return 'male';   // 여성 카드 → 배우자(남성)
    return null;
}

/* ─── PersonModal ──────────────────────────────────────────── */
function PersonModal({ modal, onClose, onSave, onDelete }) {
    const { person } = modal;
    const initForm = {
        name: modal.isSelf ? '' : (person?.name || ''),
        name_en: person?.name_en || '',
        name_suffix: person?.name_suffix || '',
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
    const [photoPreview, setPreview]  = useState(person?.photo_url ? resolveUrl(person.photo_url) : null);
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
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>한글 이름 *</div>
                            <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="이름을 입력하세요" style={INPUT_STYLE} autoFocus />
                        </div>

                        {/* 영어 이름 */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>영어 이름 <span style={{ color: TEXT_LIGHT, fontWeight: 400 }}>(여권명, 선택)</span></div>
                            <input value={form.name_en} onChange={e => setF('name_en', e.target.value)} placeholder="예: Kim, Jisoo" style={INPUT_STYLE} />
                        </div>

                        {/* 별칭/구분 */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>별칭/구분 <span style={{ color: TEXT_LIGHT, fontWeight: 400 }}>(Jr., 2nd 등, 선택)</span></div>
                            <input value={form.name_suffix} onChange={e => setF('name_suffix', e.target.value)} placeholder="예: Jr., 2nd, 둘째" style={INPUT_STYLE} />
                        </div>

                        {/* 생년월일 */}
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>생년월일</div>
                            <DateInputKo value={form.birth_date} onChange={v => setF('birth_date', v)} />
                            <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: TEXT_MID, cursor: 'pointer' }}>
                                    <input type="radio" name="lunar" checked={!form.birth_lunar} onChange={() => setF('birth_lunar', false)} /> 양력
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: TEXT_MID, cursor: 'pointer' }}>
                                    <input type="radio" name="lunar" checked={form.birth_lunar} onChange={() => setF('birth_lunar', true)} /> 음력
                                </label>
                            </div>
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
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ fontSize: 12, color: TEXT_LIGHT, marginBottom: 3 }}>사망일</div>
                                    <DateInputKo value={form.death_date} onChange={v => setF('death_date', v)} />
                                </div>
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

/* ─── DuplicateModal ───────────────────────────────────────── */
function DuplicateModal({ existingPerson, pendingName, onChoice, onClose }) {
    const [customSuffix, setCustomSuffix] = useState('');
    const [showCustom, setShowCustom]     = useState(false);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: BG_CARD, borderRadius: 12, padding: 24, width: 340, ...BLOCK_STYLE }}>
                <div style={{ fontSize: 15, color: TEXT_DARK, marginBottom: 16, lineHeight: 1.6 }}>
                    <strong>{pendingName}</strong>님이 이미 등록되어 있습니다.<br />
                    <span style={{ fontSize: 13, color: TEXT_MID }}>같은 분인가요, 다른 분인가요?</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => onChoice('suffix', 'Jr.')} style={{ ...MENU_BTN }}>Jr. 로 등록</button>
                    <button onClick={() => onChoice('suffix', '2nd')} style={{ ...MENU_BTN }}>2nd 로 등록</button>
                    {showCustom ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input value={customSuffix} onChange={e => setCustomSuffix(e.target.value)}
                                placeholder="구분 입력 (예: 셋째)" style={{ ...INPUT_STYLE, flex: 1 }} autoFocus />
                            <button onClick={() => onChoice('suffix', customSuffix.trim())}
                                style={{ ...MENU_BTN, width: 'auto', padding: '7px 14px' }}>확인</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowCustom(true)} style={{ ...MENU_BTN }}>직접 구분 입력</button>
                    )}
                    <button onClick={() => onChoice('link', existingPerson.id)}
                        style={{ ...MENU_BTN, borderColor: GOLD }}>기존 인물과 연결</button>
                    <button onClick={onClose}
                        style={{ ...MENU_BTN, color: TEXT_LIGHT }}>취소</button>
                </div>
            </div>
        </div>
    );
}

/* ─── 메인 컴포넌트 ────────────────────────────────────────── */
export default function ArchivePage() {
    const { subdomain } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isSetup = searchParams.get('setup') === '1';
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
    // 중복 이름 확인: { existingPerson, pendingForm, pendingPhoto, pendingPayload }
    const [duplicateInfo, setDuplicateInfo] = useState(null);
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

            // Bug 2: 내 subdomain과 URL subdomain이 다르면 내 사이트로 리다이렉트
            if (siteData?.subdomain && siteData.subdomain !== subdomain) {
                navigate(`/${siteData.subdomain}/archive`, { replace: true });
                return;
            }

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
            // linked 우선, 없으면 첫 번째 인물을 관장으로 사용
            setCurator(ps.find(p => p.match_status === 'linked') || ps[0] || null);
        } catch (err) {
            console.error('ArchivePage loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, [subdomain]);

    useEffect(() => { loadData(); }, [loadData]);

    // 버그 2: 최초 설정 시 자동으로 본인 정보 입력 모달 열기
    useEffect(() => {
        if (!loading && isSetup && !modal) {
            setModal({ person: curator, suggestGender: null, relation: null, isSelf: true });
        }
    }, [loading, isSetup]); // curator/modal 의존성 제외 — 최초 1회만

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
        if (!person && !pendingCard) {
            // 최초 진입 (관장 미등록/fallback 카드): 관장 편집 또는 신규 생성
            setModal({ person: curator || null, suggestGender: null, relation: null, isSelf: true });
            return;
        }
        if (!person) {
            // 대기 카드 더블클릭 → 모달 열기
            setModal({
                person: null,
                suggestGender: pendingCard.suggestGender,
                relation: pendingCard,
            });
            return;
        }
        // 완성 카드 더블클릭 → 편집 모달
        setModal({ person, suggestGender: null, relation: null });
    }, [pendingCard, curator]);

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
            name_en: form.name_en?.trim() || null,
            name_suffix: form.name_suffix?.trim() || null,
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

            let postRes;
            try {
                postRes = await axios.post(`/api/persons/${site.id}`, payload);
            } catch (e) {
                if (e.response?.status === 409) {
                    setDuplicateInfo({ existingPerson: e.response.data.existingPerson, pendingForm: form, pendingPhoto: photoFile, pendingPayload: payload });
                    return;
                }
                throw e;
            }
            const newPerson = postRes.data.data;

            // 관계 생성
            if (relation && relation.direction !== 'down') {
                let relType, p1, p2;
                const dir = relation.direction;
                const anchorId = relation.anchorId;
                const role = relation.anchorLayoutRole;

                if (dir === 'up') {
                    // 새 인물 = 부모, anchor = 자녀
                    relType = 'parent'; p1 = newPerson.id; p2 = anchorId;
                } else if (dir === 'left' || dir === 'right') {
                    // ← 여성 카드의 배우자(남성) / → 남성 카드의 배우자(여성)
                    relType = 'spouse'; p1 = anchorId; p2 = newPerson.id;
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

    /* ─ 중복 이름 선택 처리 ─────────────────────────────────── */
    const handleDuplicateChoice = useCallback(async (type, value) => {
        if (!duplicateInfo || !site?.id) return;
        const { pendingForm, pendingPhoto, pendingPayload } = duplicateInfo;

        if (type === 'link') {
            // 기존 인물과 연결: 새 등록 없이 모달 닫기
            setDuplicateInfo(null);
            setModal(null);
            setPendingCard(null);
            return;
        }

        // 구분자 추가 후 force_create로 재시도
        const newPayload = { ...pendingPayload, name_suffix: value, force_create: true };
        try {
            const postRes = await axios.post(`/api/persons/${site.id}`, newPayload);
            const newPerson = postRes.data.data;

            const { relation } = modal || {};
            if (relation && relation.direction !== 'down') {
                let relType, p1, p2;
                const dir = relation.direction;
                const anchorId = relation.anchorId;
                if (dir === 'up') { relType = 'parent'; p1 = newPerson.id; p2 = anchorId; }
                else if (dir === 'left' || dir === 'right') { relType = 'spouse'; p1 = anchorId; p2 = newPerson.id; }
                if (relType) await axios.post(`/api/persons/${site.id}/relations`, { person1_id: p1, person2_id: p2, relation_type: relType });
            }
            if (pendingPhoto) {
                const fd = new FormData(); fd.append('photo', pendingPhoto);
                await axios.post(`/api/persons/${site.id}/${newPerson.id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
            }
        } catch { /* 실패는 무시 */ }

        setDuplicateInfo(null);
        await loadData();
        setModal(null);
        setPendingCard(null);
    }, [duplicateInfo, modal, site, loadData]);

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

            {/* ── DuplicateModal ── */}
            {duplicateInfo && (
                <DuplicateModal
                    existingPerson={duplicateInfo.existingPerson}
                    pendingName={duplicateInfo.pendingForm.name}
                    onChoice={handleDuplicateChoice}
                    onClose={() => setDuplicateInfo(null)}
                />
            )}
        </div>
    );
}
