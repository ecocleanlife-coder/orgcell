/**
 * PersonEditModal.jsx — 인물 편집 모달
 *
 * 이름, 성별, 생년월일, 사망여부, 음력 편집
 * onSave(updatedPerson) 콜백으로 저장
 */
import React, { useState } from 'react';
import ModalBase from './ModalBase';
import PhotoEditor from './PhotoEditor';
import { Camera } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const FRAME_COLOR = '#C4A84F';

const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    background: '#1E1A14',
    border: '1px solid rgba(196,168,79,0.3)',
    borderRadius: '4px',
    color: '#F5DEB3',
    fontSize: '14px',
    fontFamily: 'Georgia, "Noto Serif KR", serif',
    boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block',
    color: '#C4A84F',
    fontSize: '12px',
    marginBottom: '4px',
    fontFamily: 'Georgia, "Noto Serif KR", serif',
};

const rowStyle = { marginBottom: '16px' };

export default function PersonEditModal({ siteId, person, onSave, onClose, inline = false }) {
    const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
    const [photoUrl, setPhotoUrl] = useState(person?.photo_url || '');
    
    // Relation States
    const [addRelationType, setAddRelationType] = useState(null);
    const [relationMode, setRelationMode] = useState('new');
    const [relationName, setRelationName] = useState('');
    const [relationGender, setRelationGender] = useState('male');
    const [existingPersonId, setExistingPersonId] = useState('');
    const [allPersons, setAllPersons] = useState([]);
    const [submittingRelation, setSubmittingRelation] = useState(false);

    React.useEffect(() => {
        if (siteId && !allPersons.length) {
            axios.get(`/api/persons/${siteId}`).then(r => setAllPersons(r.data?.data || []));
        }
    }, [siteId]);

    const handleAddRelation = async () => {
        if (!person || !siteId) return;
        setSubmittingRelation(true);
        try {
            let targetId = existingPersonId;
            // 1. 만약 신규 생성 모드라면 먼저 인물 생성
            if (relationMode === 'new') {
                if (!relationName.trim()) {
                    toast.error('이름을 입력하세요');
                    setSubmittingRelation(false);
                    return;
                }
                let gen = person.generation || 1;
                if (addRelationType === 'parent' || addRelationType === 'birth-parent') gen += 1;
                if (addRelationType === 'child') gen -= 1;
                
                const res = await axios.post(`/api/persons/${siteId}`, {
                    name: relationName.trim(),
                    gender: relationGender,
                    generation: gen,
                    privacy_level: 'family'
                });
                targetId = res.data?.data?.id;
            }

            if (!targetId) {
                toast.error('대상을 지정하세요');
                setSubmittingRelation(false);
                return;
            }

            // 2. 관계 연결
            if (addRelationType === 'parent' || addRelationType === 'birth-parent') {
                // 부모를 추가하면 대상(person.id)의 parentX_id 업데이트
                // 여기서는 간략하게 put으로 던지거나(관계 생성 컨트롤러가 있다면) axios.put으로 전달
                await axios.put(`/api/persons/${siteId}/${person.id}`, {
                    parent1_id: targetId 
                });
            } else if (addRelationType === 'child') {
                // 자녀를 추가하면 자녀(targetId)의 parent1_id 업데이트
                await axios.put(`/api/persons/${siteId}/${targetId}`, {
                    parent1_id: person.id
                });
            } else if (addRelationType === 'spouse') {
                await axios.put(`/api/persons/${siteId}/${person.id}`, {
                    spouse_id: targetId
                });
            } else if (addRelationType === 'sibling') {
                await axios.put(`/api/persons/${siteId}/${targetId}`, {
                    parent1_id: person.parent1_id || null,
                    parent2_id: person.parent2_id || null
                });
            }

            toast.success('관계가 추가되었습니다.');
            setAddRelationType(null); // 폼 닫기
            if (onSave) onSave(person); // trigger reload
        } catch (err) {
            toast.error('관계 연결에 실패했습니다');
            console.error(err);
        }
        setSubmittingRelation(false);
    };

    const [form, setForm] = useState({
        name: person?.name || '',
        gender: person?.gender || 'male',
        birth_date: person?.birth_date || '',
        birth_lunar: person?.birth_lunar || false,
        is_deceased: person?.is_deceased || false,
        death_date: person?.death_date || '',
        death_lunar: person?.death_lunar || false,
        display_info1: person?.display_info1 || '',
        display_info2: person?.display_info2 || '',
        display_info3: person?.display_info3 || '',
    });

    const update = (field, value) => {
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSave({ ...person, ...form });
    };

    return (
        <ModalBase title="인물 편집" onClose={onClose} inline={inline}>
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
                                onSave({ ...person, ...form, photo_url: res.data.data.photo_url, photo_position: position });
                                toast.success('사진이 저장되었습니다');
                            }
                        } catch (err) {
                            console.error('Photo save error:', err);
                            toast.error('사진 저장 실패');
                        }
                    }}
                    onCancel={() => setPendingPhotoFile(null)}
                />
            )}
            <form onSubmit={handleSubmit}>
                <div style={{ ...rowStyle, display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        {photoUrl ? (
                            <img src={photoUrl} alt="profile" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${FRAME_COLOR}` }} />
                        ) : (
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1E1A14', border: `2px solid ${FRAME_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Camera size={24} color="#C4A84F" />
                            </div>
                        )}
                        <label style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#C4A84F', borderRadius: '50%', padding: '4px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            <Camera size={14} color="#fff" />
                            <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" style={{ display: 'none' }} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setPendingPhotoFile(file);
                            }} />
                        </label>
                    </div>
                    <div>
                        <div style={{ color: '#C4A84F', fontSize: '14px', fontWeight: 'bold' }}>프로필 사진 변경</div>
                        <div style={{ color: '#7A6E5E', fontSize: '12px' }}>원하는 방식으로 사진을 크롭하고 회전하세요.</div>
                    </div>
                </div>

                <div style={rowStyle}>
                    <label style={labelStyle}>이름</label>
                    <input
                        style={inputStyle}
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="이름 입력"
                        autoFocus
                    />
                </div>

                <div style={rowStyle}>
                    <label style={labelStyle}>성별</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {[{ value: 'male', label: '남 ♂' }, { value: 'female', label: '여 ♀' }].map(opt => (
                            <label key={opt.value} style={{
                                color: form.gender === opt.value ? FRAME_COLOR : '#7A6E5E',
                                cursor: 'pointer', fontSize: '14px',
                            }}>
                                <input
                                    type="radio"
                                    name="gender"
                                    value={opt.value}
                                    checked={form.gender === opt.value}
                                    onChange={() => update('gender', opt.value)}
                                    style={{ marginRight: '4px' }}
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                <div style={rowStyle}>
                    <label style={labelStyle}>생년월일</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="date"
                            style={{ ...inputStyle, flex: 1 }}
                            value={form.birth_date}
                            onChange={(e) => update('birth_date', e.target.value)}
                        />
                        <label style={{ color: '#7A6E5E', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input
                                type="checkbox"
                                checked={form.birth_lunar}
                                onChange={(e) => update('birth_lunar', e.target.checked)}
                                style={{ marginRight: '4px' }}
                            />
                            음력
                        </label>
                    </div>
                </div>

                <div style={rowStyle}>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            checked={form.is_deceased}
                            onChange={(e) => update('is_deceased', e.target.checked)}
                        />
                        사망
                    </label>
                    {form.is_deceased && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                            <input
                                type="date"
                                style={{ ...inputStyle, flex: 1 }}
                                value={form.death_date}
                                onChange={(e) => update('death_date', e.target.value)}
                            />
                            <label style={{ color: '#7A6E5E', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input
                                    type="checkbox"
                                    checked={form.death_lunar}
                                    onChange={(e) => update('death_lunar', e.target.checked)}
                                    style={{ marginRight: '4px' }}
                                />
                                음력
                            </label>
                        </div>
                    )}
                </div>

                <div style={rowStyle}>
                    <label style={labelStyle}>대표정보 1 (직책 등 최대 50자)</label>
                    <input
                        style={inputStyle}
                        value={form.display_info1}
                        onChange={(e) => update('display_info1', e.target.value)}
                        placeholder="예) 대표이사"
                        maxLength={50}
                    />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>대표정보 2 (학력 등 최대 50자)</label>
                    <input
                        style={inputStyle}
                        value={form.display_info2}
                        onChange={(e) => update('display_info2', e.target.value)}
                        placeholder="예) 서울대학교 졸업"
                        maxLength={50}
                    />
                </div>
                <div style={rowStyle}>
                    <label style={labelStyle}>대표정보 3 (거주지 등 최대 50자)</label>
                    <input
                        style={inputStyle}
                        value={form.display_info3}
                        onChange={(e) => update('display_info3', e.target.value)}
                        placeholder="예) 서울 거주"
                        maxLength={50}
                    />
                </div>

                {/* 가족 추가 (아코디언/인라인) */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(196,168,79,0.3)' }}>
                    <div style={{ color: FRAME_COLOR, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                        가족 관계 추가
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {[
                            { id: 'parent', label: '부모 추가' },
                            { id: 'birth-parent', label: '친부모 추가' },
                            { id: 'spouse', label: '배우자 추가' },
                            { id: 'child', label: '자녀 추가' },
                            { id: 'sibling', label: '형제 추가' }
                        ].map(type => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setAddRelationType(addRelationType === type.id ? null : type.id)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    border: `1px solid ${FRAME_COLOR}`,
                                    background: addRelationType === type.id ? FRAME_COLOR : 'transparent',
                                    color: addRelationType === type.id ? '#1E1A14' : FRAME_COLOR,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    {addRelationType && (
                        <div style={{ padding: '16px', background: 'rgba(196,168,79,0.05)', borderRadius: '8px', border: '1px solid rgba(196,168,79,0.2)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#F5DEB3', cursor: 'pointer' }}>
                                    <input type="radio" checked={relationMode === 'new'} onChange={() => setRelationMode('new')} />
                                    신규 인물 생성
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#F5DEB3', cursor: 'pointer' }}>
                                    <input type="radio" checked={relationMode === 'existing'} onChange={() => setRelationMode('existing')} />
                                    박물관 기존 인물 검색
                                </label>
                            </div>

                            {relationMode === 'new' ? (
                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    <input
                                        placeholder="이름"
                                        style={inputStyle}
                                        value={relationName}
                                        onChange={e => setRelationName(e.target.value)}
                                    />
                                    <select style={inputStyle} value={relationGender} onChange={e => setRelationGender(e.target.value)}>
                                        <option value="male">남성</option>
                                        <option value="female">여성</option>
                                    </select>
                                </div>
                            ) : (
                                <select 
                                    style={inputStyle} 
                                    value={existingPersonId} 
                                    onChange={e => setExistingPersonId(e.target.value)}
                                >
                                    <option value="">인물을 선택하세요</option>
                                    {allPersons.filter(p => String(p.id) !== String(person?.id)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (oc_{p.oc_id})</option>
                                    ))}
                                </select>
                            )}

                            <button
                                type="button"
                                onClick={handleAddRelation}
                                disabled={submittingRelation}
                                style={{
                                    marginTop: '12px',
                                    width: '100%',
                                    padding: '8px',
                                    background: FRAME_COLOR,
                                    color: '#1E1A14',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: submittingRelation ? 'wait' : 'pointer'
                                }}
                            >
                                {submittingRelation ? '처리 중...' : '연결하기'}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 20px',
                            background: 'transparent',
                            border: '1px solid #7A6E5E',
                            borderRadius: '4px',
                            color: '#7A6E5E',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: '8px 20px',
                            background: FRAME_COLOR,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#1E1A14',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 700,
                        }}
                    >
                        저장
                    </button>
                </div>
            </form>
        </ModalBase>
    );
}
