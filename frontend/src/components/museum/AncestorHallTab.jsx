import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, X, BookOpen, ChevronRight, Image as ImageIcon, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function AncestorHallTab({ siteId, subdomain, role, t }) {
    const navigate = useNavigate();
    const [ancestors, setAncestors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        title: '', description: '', visibility: 'family',
        birth_year: '', death_year: '', memoir: '', relation: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchAncestors = useCallback(async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const { data } = await axios.get('/api/exhibitions', {
                params: { site_id: siteId, hall_type: 'ancestor' },
            });
            if (data.success) setAncestors(data.data);
        } catch (err) {
            console.error('fetchAncestors error:', err);
        } finally {
            setLoading(false);
        }
    }, [siteId]);

    useEffect(() => { fetchAncestors(); }, [fetchAncestors]);

    const openModal = () => {
        setForm({ title: '', description: '', visibility: 'family', birth_year: '', death_year: '', memoir: '', relation: '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) return;
        setSubmitting(true);
        try {
            await axios.post('/api/exhibitions', {
                site_id: siteId,
                title: form.title,
                description: form.description,
                visibility: form.visibility,
                hall_type: 'ancestor',
                birth_year: form.birth_year ? parseInt(form.birth_year) : null,
                death_year: form.death_year ? parseInt(form.death_year) : null,
                memoir: form.memoir || null,
                relation: form.relation || null,
            });
            setShowModal(false);
            fetchAncestors();
        } catch (err) {
            console.error('createAncestor error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const canEdit = role === 'owner' || role === 'member';

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
                        onClick={openModal}
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
                            onClick={openModal}
                            className="px-5 py-2 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110"
                            style={{ background: '#7a5a3a' }}
                        >
                            {t.ancestorAddBtn}
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {ancestors.map((anc, idx) => (
                        <button
                            key={anc.id}
                            onClick={() => navigate(`/${subdomain}/gallery/${anc.id}`)}
                            className="w-full text-left rounded-2xl bg-white hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
                            style={{ border: '1px solid #e8dfd0' }}
                        >
                            <div className="flex">
                                {/* 좌측: 사진 영역 */}
                                <div className="w-[140px] sm:w-[180px] shrink-0 relative overflow-hidden"
                                    style={{ background: 'linear-gradient(135deg, #f5ede0, #ede0cc)' }}>
                                    {anc.cover_photo_url ? (
                                        <img
                                            src={anc.cover_photo_url}
                                            alt={anc.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            style={{ minHeight: 160 }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full" style={{ minHeight: 160 }}>
                                            <span className="text-[56px] opacity-60">
                                                {getRelationIcon(anc.relation)}
                                            </span>
                                        </div>
                                    )}
                                    {/* 사진 수 뱃지 */}
                                    {anc.photo_count > 0 && (
                                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            <ImageIcon size={10} /> {anc.photo_count}
                                        </div>
                                    )}
                                </div>

                                {/* 우측: 정보 영역 */}
                                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                                    <div>
                                        {/* 이름 + 관계 */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-bold text-[16px] truncate" style={{ color: '#3D2008' }}>
                                                {anc.title}
                                            </h3>
                                            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5 group-hover:text-[#7a5a3a] transition-colors" />
                                        </div>

                                        {/* 관계 + 연도 뱃지 */}
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
                                        </div>

                                        {/* 회고록 미리보기 */}
                                        {anc.memoir && (
                                            <p className="text-[12px] leading-relaxed line-clamp-3" style={{ color: '#6a5a4a' }}>
                                                {anc.memoir}
                                            </p>
                                        )}
                                    </div>

                                    {/* 하단: 방명록 + 공개범위 */}
                                    <div className="flex items-center gap-3 mt-3 pt-2 border-t" style={{ borderColor: '#f0ece4' }}>
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
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Add Ancestor Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
                    style={{ background: 'rgba(30,25,20,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                        style={{ border: '1.5px solid #e8dfd0' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🕯️</span>
                                <h3 className="text-[16px] font-bold" style={{ color: '#3D2008' }}>{t.ancestorModalTitle}</h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
                                style={{ background: '#f0ece4' }}>
                                <X size={14} style={{ color: '#7a7a6a' }} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
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
                            <div>
                                <label className="block text-[12px] font-semibold mb-1" style={{ color: '#7a5a3a' }}>{t.ancestorMemoirLabel}</label>
                                <textarea
                                    rows={4}
                                    value={form.memoir}
                                    onChange={e => setForm(f => ({ ...f, memoir: e.target.value }))}
                                    placeholder={t.ancestorMemoirPlaceholder}
                                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                                    style={{ border: '1.5px solid #e8dfd0', color: '#3D2008' }}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold cursor-pointer"
                                    style={{ background: '#f0ece4', color: '#5a5a4a' }}>
                                    {t.ancestorCancelBtn}
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white cursor-pointer hover:brightness-110 disabled:opacity-60"
                                    style={{ background: '#7a5a3a' }}>
                                    {submitting ? t.ancestorCreating : t.ancestorSubmitBtn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
