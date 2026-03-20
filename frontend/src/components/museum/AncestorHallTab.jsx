import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, X, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] font-bold text-[#3D2008]" style={{ fontFamily: 'Georgia, serif' }}>
                    {t.ancestorTitle}
                </h2>
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
                <div className="flex flex-col items-center py-16 text-center">
                    <BookOpen size={40} className="text-slate-200 mb-3" />
                    <p className="text-slate-400 text-[14px]">{t.ancestorEmpty}</p>
                    {canEdit && (
                        <button
                            onClick={openModal}
                            className="mt-4 px-5 py-2 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110"
                            style={{ background: '#7a5a3a' }}
                        >
                            {t.ancestorAddBtn}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ancestors.map(anc => (
                        <button
                            key={anc.id}
                            onClick={() => navigate(`/${subdomain}/gallery/${anc.id}`)}
                            className="text-left rounded-2xl border border-[#e8dfd0] bg-white hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
                        >
                            {/* Photo area */}
                            <div className="h-[120px] bg-gradient-to-br from-[#f5ede0] to-[#ede0cc] flex items-center justify-center relative overflow-hidden">
                                {anc.cover_photo_url ? (
                                    <img src={anc.cover_photo_url} alt={anc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <span className="text-[48px]">👴</span>
                                )}
                                {/* Year badge */}
                                {(anc.birth_year || anc.death_year) && (
                                    <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                                        {anc.birth_year || '?'} – {anc.death_year || ''}
                                    </div>
                                )}
                            </div>
                            {/* Info */}
                            <div className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-[14px] text-[#3D2008] truncate">{anc.title}</h3>
                                        {anc.relation && (
                                            <span className="inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: '#f5ede0', color: '#7a5a3a' }}>
                                                {anc.relation}
                                            </span>
                                        )}
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                </div>
                                {anc.memoir && (
                                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{anc.memoir}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[11px] text-slate-400">
                                        {anc.guestbook_count > 0 && `${anc.guestbook_count} ${t.exhGuestbook || 'messages'}`}
                                    </span>
                                    <span className="text-[11px] text-slate-300">
                                        {anc.visibility === 'public' ? '🌐' : '🔒'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Add Ancestor Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[16px] font-bold text-[#3D2008]">{t.ancestorModalTitle}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorNameLabel} *</label>
                                <input
                                    type="text" required
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder={t.ancestorNamePlaceholder}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorRelationLabel}</label>
                                    <input
                                        type="text"
                                        value={form.relation}
                                        onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
                                        placeholder={t.ancestorRelationPlaceholder}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorVisLabel}</label>
                                    <select
                                        value={form.visibility}
                                        onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a]"
                                    >
                                        <option value="family">{t.exhVisFamily || 'Family only'}</option>
                                        <option value="public">{t.exhVisPublic || 'Public'}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorBirthLabel}</label>
                                    <input
                                        type="number" min="1000" max="2100"
                                        value={form.birth_year}
                                        onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))}
                                        placeholder="1920"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorDeathLabel}</label>
                                    <input
                                        type="number" min="1000" max="2100"
                                        value={form.death_year}
                                        onChange={e => setForm(f => ({ ...f, death_year: e.target.value }))}
                                        placeholder="1995"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.ancestorMemoirLabel}</label>
                                <textarea
                                    rows={4}
                                    value={form.memoir}
                                    onChange={e => setForm(f => ({ ...f, memoir: e.target.value }))}
                                    placeholder={t.ancestorMemoirPlaceholder}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#7a5a3a] resize-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
                                    {t.ancestorCancelBtn}
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110 disabled:opacity-60"
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
