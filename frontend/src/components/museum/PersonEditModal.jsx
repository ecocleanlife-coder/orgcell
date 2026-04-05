/**
 * PersonEditModal.jsx — 인물 편집 모달
 *
 * 이름, 성별, 생년월일, 사망여부, 음력 편집
 * onSave(updatedPerson) 콜백으로 저장
 */
import React, { useState } from 'react';
import ModalBase from './ModalBase';

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

export default function PersonEditModal({ person, onSave, onClose, inline = false }) {
    const [form, setForm] = useState({
        name: person?.name || '',
        gender: person?.gender || 'male',
        birth_date: person?.birth_date || '',
        birth_lunar: person?.birth_lunar || false,
        is_deceased: person?.is_deceased || false,
        death_date: person?.death_date || '',
        death_lunar: person?.death_lunar || false,
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
            <form onSubmit={handleSubmit}>
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
