import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, X, BookOpen, ChevronRight, Image as ImageIcon, Flame, Link, Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// 관계 아이콘 매핑
const RELATION_ICONS = {
    '할아버지': '👴', '할머니': '👵', '아버지': '👨', '어머니': '👩',
    '증조부': '🏛️', '증조모': '🏛️', '고조부': '🏛️', '고조모': '🏛️',
    grandpa: '👴', grandma: '👵', father: '👨', mother: '👩',
};

function getRelationIcon(relation) {
    if (!relation) return '🕯️';
    const lower = relation.toLowerCase();
    for (const [key, icon] of Object.entries(RELATION_ICONS)) {
        if (lower.includes(key.toLowerCase())) return icon;
    }
    return '🕯️';
}

const EMPTY_FORM = {
    title: '', description: '', visibility: 'family',
    birth_year: '', death_year: '', memoir: '', relation: '',
    person_id: '', biography: '',
    featured_photo_1: '', featured_photo_2: '', featured_photo_3: '',
};

export default function AncestorHallTab({ siteId, subdomain, role, t }) {
    const navigate = useNavigate();
    const [ancestors, setAncestors] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchAncestors = useCallback(async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const [ancRes, perRes] = await Promise.all([
                axios.get('/api/exhibitions', { params: { site_id: siteId, hall_type: 'ancestor' } }),
                axios.get(`/api/persons/${siteId}`),
            ]);
            if (ancRes.data.success) setAncestors(ancRes.data.data);
            if (perRes.data.success) setPersons(perRes.data.data);
        } catch (err) {
            console.error('fetchAncestors error:', err);
        } finally {
            setLoading(false);
        }
    }, [siteId]);

    useEffect(() => { fetchAncestors(); }, [fetchAncestors]);

    const openAddModal = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEditModal = (anc) => {
        const photos = Array.isArray(anc.featured_photos) ? anc.featured_photos : [];
        setEditTarget(anc);
        setForm({
            title: anc.title || '',
            description: anc.description || '',
            visibility: anc.visibility || 'family',
            birth_year: anc.birth_year || '',
            death_year: anc.death_year || '',
            memoir: anc.memoir || '',
            relation: anc.relation || '',
            person_id: anc.person_id || '',
            biography: anc.biography || '',
            featured_photo_1: photos[0] || '',
            featured_photo_2: photos[1] || '',
            featured_photo_3: photos[2] || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) return;
        setSubmitting(true);

        const featured_photos = [form.featured_photo_1, form.featured_photo_2, form.featured_photo_3].filter(Boolean);
        const payload = {
            site_id: siteId,
            title: form.title,
            description: form.description,
            visibility: form.visibility,
            hall_type: 'ancestor',
            birth_year: form.birth_year ? parseInt(form.birth_year) : null,
            death_year: form.death_year ? parseInt(form.death_year) : null,
            memoir: form.memoir || null,
            relation: form.relation || null,
            person_id: form.person_id ? parseInt(form.person_id) : null,
            biography: form.biography || null,
            featured_photos,
        };

        try {
            if (editTarget) {
                await axios.put(`/api/exhibitions/${editTarget.id}`, payload);
            } else {
                await axios.post('/api/exhibitions', payload);
            }
            setShowModal(false);
            fetchAncestors();
        } catch (err) {
            console.error('saveAncestor error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/exhibitions/${id}`);
            setDeleteConfirm(null);
            fetchAncestors();
        } catch (err) {
            console.error('deleteAncestor error:', err);
        }
    };

    const canEdit = role === 'owner' || role === 'member';

    const getLinkedPerson = (personId) => {
        if (!personId) return null;
        return persons.find((p) => p.id === personId);
    };

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Flame size={20} style={{ color: '#c4813a' }} />
                    <h2 className="text-[18px] font-bold" style={{ color: '#3D2008', fontFamily: 'Georgia, serif' }}>
                        {t.ancestorTitle}
                    </h2>
                </div>
                {canEdit && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110"
                        style={{ background: '#7a5a3a' }}
                    >
                        <Plus size={14} /> {t.ancestorAddBtn}
                    </button>
                )}
            </div>

            {/* Ancestor cards */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-[#7a5a3a] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : ancestors.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center rounded-2xl"
                    style={{ background: 'linear-gradient(180deg, #faf6f0 0%, #f5ede0 100%)', border: '1px dashed #d8c8a8' }}>
                    <div className="text-[48px] mb-3">🕯️</div>
                    <p className="text-[15px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>
                        {t.ancestorEmpty}
                    </p>
                    <p className="text-[12px] mb-5" style={{ color: '#a09080' }}>
                        {t.ancestorEmptySub || '소중한 분들의 이야기를 기록해보세요'}
                    </p>
                    {canEdit && (
                        <button
                            onClick={openAddModal}
                            className="px-5 py-2 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110"
                            style={{ background: '#7a5a3a' }}
                        >
                            {t.ancestorAddBtn}
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {ancestors.map((anc) => {
                        const photos = Array.isArray(anc.featured_photos) ? anc.featured_photos : [];
                        const linkedPerson = getLinkedPerson(anc.person_id);

                        return (
                            <div key={anc.id} className="rounded-2xl bg-white overflow-hidden group relative"
                                style={{ border: '1px solid #e8dfd0' }}>

                                {/* Featured Photos — 3-photo layout */}
                                {photos.length > 0 ? (
                                    <div className="relative">
                                        {photos.length === 1 ? (
                                            <img src={photos[0]} alt="" className="w-full h-[220px] object-cover" />
                                        ) : photos.length === 2 ? (
                                            <div className="flex gap-0.5 h-[220px]">
                                                <img src={photos[0]} alt="" className="w-1/2 h-full object-cover" />
                                                <img src={photos[1]} alt="" className="w-1/2 h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="flex gap-0.5 h-[220px]">
                                                <img src={photos[0]} alt="" className="w-1/2 h-full object-cover" />
                                                <div className="w-1/2 flex flex-col gap-0.5">
                                                    <img src={photos[1]} alt="" className="h-1/2 w-full object-cover" />
                                                    <img src={photos[2]} alt="" className="h-1/2 w-full object-cover" />
                                                </div>
                                            </div>
                                        )}
                                        {/* Overlay gradient */}
                                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                                    </div>
                                ) : (
                                    /* No photos — icon fallback */
                                    <div className="h-[120px] flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg, #f5ede0, #ede0cc)' }}>
                                        <span className="text-[56px] opacity-60">{getRelationIcon(anc.relation)}</span>
                                    </div>
                                )}

                                {/* Info section */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <button
                                            onClick={() => navigate(`/${subdomain}/gallery/${anc.id}`)}
                                            className="font-bold text-[17px] truncate hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
                                            style={{ color: '#3D2008' }}
                                        >
                                            {anc.title}
                                        </button>
                                        <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5 group-hover:text-[#7a5a3a] transition-colors" />
                                    </div>

                                    {/* Badges: relation, years, person link */}
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        {anc.relation && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: '#f5ede0', color: '#7a5a3a' }}>
                                                {anc.relation}
                                            </span>
                                        )}
                                        {(anc.birth_year || anc.death_year) && (
                                            <span className="text-[11px] font-medium" style={{ color: '#a09080' }}>
                                                {anc.birth_year || '?'} – {anc.death_year || ''}
                                            </span>
                                        )}
                                        {linkedPerson && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                                                style={{ background: '#e8f4ff', color: '#2563eb' }}>
                                                <Link size={10} /> {linkedPerson.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Biography preview */}
                                    {anc.biography && (
                                        <p className="text-[13px] leading-relaxed mb-2 line-clamp-3" style={{ color: '#5a4a3a' }}>
                                            {anc.biography}
                                        </p>
                                    )}

                                    {/* Memoir preview */}
                                    {anc.memoir && !anc.biography && (
                                        <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: '#6a5a4a' }}>
                                            {anc.memoir}
                                        </p>
                                    )}

                                    {/* Footer: guestbook, visibility, edit/delete */}
                                    <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: '#f0ece4' }}>
                                        <div className="flex items-center gap-3">
                                            {anc.guestbook_count > 0 && (
                                                <span className="flex items-center gap-1 text-[11px]" style={{ color: '#7a5a3a' }}>
                                                    <BookOpen size={12} />
                                                    {anc.guestbook_count} {t.exhGuestbook || 'messages'}
                                                </span>
                                            )}
                                            <span className="text-[11px]" style={{ color: '#aaa' }}>
                                                {anc.visibility === 'public' ? '🌐 ' + (t.exhVisPublic || 'Public') : '🔒 ' + (t.exhVisFamily || 'Family')}
                                            </span>
                                        </div>
                                        {canEdit && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(anc); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer hover:bg-amber-50"
                                                    title={t.ancestorEditBtn || '수정'}
                                                >
                                                    <Edit2 size={13} style={{ color: '#7a5a3a' }} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(anc.id); }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer hover:bg-red-50"
                                                    title={t.ancestorDeleteBtn || '삭제'}
                                                >
                                                    <Trash2 size={13} style={{ color: '#c44' }} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Delete confirmation */}
                                {deleteConfirm === anc.id && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
                                        <div className="text-center p-4">
                                            <p className="text-[14px] font-bold mb-3" style={{ color: '#3D2008' }}>
                                                {t.ancestorDeleteConfirm || '정말 삭제하시겠습니까?'}
                                            </p>
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer"
                                                    style={{ background: '#f0ece4', color: '#5a5a4a' }}
                                                >
                                                    {t.ancestorCancelBtn}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(anc.id)}
                                                    className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white cursor-pointer"
                                                    style={{ background: '#c44' }}
                                                >
                                                    {t.ancestorDeleteBtn || '삭제'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Ancestor Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={{ background: 'rgba(30,25,20,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-[520px] p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        style={{ border: '1.5px solid #e8dfd0' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🕯️</span>
                                <h3 className="text-[16px] font-bold" style={{ color: '#3D2008' }}>
                                    {editTarget ? (t.ancestorEditTitle || '조상 수정') : t.ancestorModalTitle}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
                                style={{ background: '#f0ece4' }}>
                                <X size={14} style={{ color: '#7a7a6a' }} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Name */}
                            <div>
                                <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorNameLabel} *</label>
                                <input
                                    type="text" required
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder={t.ancestorNamePlaceholder}
                                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none transition-colors"
                                    style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                />
                            </div>

                            {/* Relation + Visibility */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorRelationLabel}</label>
                                    <input
                                        type="text"
                                        value={form.relation}
                                        onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                                        placeholder={t.ancestorRelationPlaceholder}
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                                        style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorVisLabel}</label>
                                    <select
                                        value={form.visibility}
                                        onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                                        style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                    >
                                        <option value="family">{t.exhVisFamily || 'Family only'}</option>
                                        <option value="public">{t.exhVisPublic || 'Public'}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Birth / Death year */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorBirthLabel}</label>
                                    <input
                                        type="number" min="1000" max="2100"
                                        value={form.birth_year}
                                        onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                                        placeholder="1920"
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                                        style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorDeathLabel}</label>
                                    <input
                                        type="number" min="1000" max="2100"
                                        value={form.death_year}
                                        onChange={e => setForm(f => ({ ...f, death_year: e.target.value }))}
                                        placeholder="1995"
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                                        style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                    />
                                </div>
                            </div>

                            {/* Person link (가족트리 연결) */}
                            {persons.length > 0 && (
                                <div>
                                    <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>
                                        <Link size={11} className="inline mr-1" />
                                        {t.ancestorPersonLink || '가족트리 인물 연결'}
                                    </label>
                                    <select
                                        value={form.person_id}
                                        onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                                        style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                    >
                                        <option value="">{t.ancestorPersonNone || '연결 안함'}</option>
                                        {persons.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.birth_year ? `(${p.birth_year})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Featured Photos (URLs) */}
                            <div>
                                <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>
                                    <ImageIcon size={11} className="inline mr-1" />
                                    {t.ancestorFeaturedPhotos || '대표 사진 (최대 3장, URL)'}
                                </label>
                                <div className="space-y-2">
                                    {[1, 2, 3].map((n) => (
                                        <input
                                            key={n}
                                            type="url"
                                            value={form[`featured_photo_${n}`]}
                                            onChange={e => setForm(f => ({ ...f, [`featured_photo_${n}`]: e.target.value }))}
                                            placeholder={`${t.ancestorPhotoPlaceholder || '사진 URL'} ${n}`}
                                            className="w-full rounded-xl px-3 py-2 text-[12px] outline-none"
                                            style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                        />
                                    ))}
                                </div>
                                {/* Photo preview */}
                                {(form.featured_photo_1 || form.featured_photo_2 || form.featured_photo_3) && (
                                    <div className="flex gap-1 mt-2">
                                        {[form.featured_photo_1, form.featured_photo_2, form.featured_photo_3].filter(Boolean).map((url, i) => (
                                            <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; }} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Biography */}
                            <div>
                                <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>
                                    {t.ancestorBiographyLabel || '이력 / 약력'}
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.biography}
                                    onChange={e => setForm(f => ({ ...f, biography: e.target.value }))}
                                    placeholder={t.ancestorBiographyPlaceholder || '학력, 경력, 주요 이력 등'}
                                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                                    style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                />
                            </div>

                            {/* Memoir */}
                            <div>
                                <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorMemoirLabel}</label>
                                <textarea
                                    rows={3}
                                    value={form.memoir}
                                    onChange={e => setForm(f => ({ ...f, memoir: e.target.value }))}
                                    placeholder={t.ancestorMemoirPlaceholder}
                                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                                    style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                                    style={{ background: '#f0ece4', color: '#5a5a4a' }}>
                                    {t.ancestorCancelBtn}
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer hover:brightness-110 disabled:opacity-60"
                                    style={{ background: '#7a5a3a' }}>
                                    {submitting ? t.ancestorCreating : (editTarget ? (t.ancestorUpdateBtn || '수정') : t.ancestorSubmitBtn)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
