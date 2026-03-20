import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';

const TYPE_COLORS = {
    birthday:    { bg: '#fce7f3', border: '#ec4899', dot: '#ec4899', label: '' },
    anniversary: { bg: '#fef9c3', border: '#eab308', dot: '#eab308', label: '' },
    event:       { bg: '#dbeafe', border: '#3b82f6', dot: '#3b82f6', label: '' },
    memorial:    { bg: '#f3f4f6', border: '#6b7280', dot: '#6b7280', label: '' },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendarGrid(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

export default function FamilyCalendar({ siteId, role, t }) {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [form, setForm] = useState({
        title: '', event_date: '', event_type: 'event',
        description: '', is_recurring: false, person_name: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchEvents = useCallback(async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const { data } = await axios.get('/api/calendar', { params: { site_id: siteId, year, month } });
            if (data.success) setEvents(data.data);
        } catch (err) {
            console.error('fetchEvents error:', err);
        } finally {
            setLoading(false);
        }
    }, [siteId, year, month]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const prevMonth = () => {
        if (month === 1) { setYear(y => y - 1); setMonth(12); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setYear(y => y + 1); setMonth(1); }
        else setMonth(m => m + 1);
    };

    const openModal = (day) => {
        const pad = String(day).padStart(2, '0');
        const mPad = String(month).padStart(2, '0');
        setForm({ title: '', event_date: `${year}-${mPad}-${pad}`, event_type: 'event', description: '', is_recurring: false, person_name: '' });
        setSelectedDay(day);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.event_date) return;
        setSubmitting(true);
        try {
            await axios.post('/api/calendar', { ...form, site_id: siteId });
            setShowModal(false);
            fetchEvents();
        } catch (err) {
            console.error('createEvent error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t.calendarDeleteConfirm)) return;
        try {
            await axios.delete(`/api/calendar/${id}`);
            fetchEvents();
        } catch (err) {
            console.error('deleteEvent error:', err);
        }
    };

    // Map day → events
    const eventsByDay = {};
    events.forEach(ev => {
        const d = new Date(ev.event_date);
        // recurring: match by month/day regardless of stored year
        const key = ev.is_recurring
            ? d.getUTCDate()
            : (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month ? d.getUTCDate() : null);
        if (key) {
            if (!eventsByDay[key]) eventsByDay[key] = [];
            eventsByDay[key].push(ev);
        }
    });

    const cells = buildCalendarGrid(year, month);
    const canEdit = role === 'owner' || role === 'member';
    const today = now.getFullYear() === year && now.getMonth() + 1 === month ? now.getDate() : null;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-bold text-[#3D2008]" style={{ fontFamily: 'Georgia, serif' }}>
                    {t.calendarTitle}
                </h2>
                {canEdit && (
                    <button
                        onClick={() => openModal(today || 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110"
                        style={{ background: '#5a8a4a' }}
                    >
                        <Plus size={14} /> {t.calendarAddBtn}
                    </button>
                )}
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer">
                    <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <span className="font-bold text-[16px] text-[#3D2008]">{monthName} {year}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 cursor-pointer">
                    <ChevronRight size={18} className="text-slate-600" />
                </button>
            </div>

            {/* Day of week header */}
            <div className="grid grid-cols-7 mb-1">
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="text-center text-[11px] font-bold text-slate-400 py-1">{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-[#5a8a4a] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((day, i) => {
                        const dayEvents = day ? (eventsByDay[day] || []) : [];
                        const isToday = day === today;
                        return (
                            <div
                                key={i}
                                onClick={() => day && canEdit && openModal(day)}
                                className={`min-h-[64px] rounded-lg p-1 text-[12px] ${day ? 'hover:bg-[#f0ebe0] transition-colors' : ''} ${canEdit && day ? 'cursor-pointer' : ''}`}
                            >
                                {day && (
                                    <>
                                        <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[12px] font-semibold mb-0.5 ${isToday ? 'bg-[#5a8a4a] text-white' : 'text-slate-700'}`}>
                                            {day}
                                        </span>
                                        <div className="flex flex-col gap-0.5">
                                            {dayEvents.slice(0, 2).map(ev => {
                                                const c = TYPE_COLORS[ev.event_type] || TYPE_COLORS.event;
                                                return (
                                                    <div
                                                        key={ev.id}
                                                        className="flex items-center justify-between rounded px-1 py-0.5 text-[10px] font-medium group"
                                                        style={{ background: c.bg, border: `1px solid ${c.border}`, color: '#333' }}
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <span className="truncate">{ev.title}</span>
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleDelete(ev.id)}
                                                                className="hidden group-hover:flex ml-0.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {dayEvents.length > 2 && (
                                                <span className="text-[10px] text-slate-400">+{dayEvents.length - 2}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Upcoming events list */}
            {events.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-[13px] font-bold text-slate-500 mb-2 uppercase tracking-wide">This Month</h3>
                    <div className="space-y-2">
                        {[...events].sort((a, b) => {
                            const da = new Date(a.event_date).getUTCDate();
                            const db = new Date(b.event_date).getUTCDate();
                            return da - db;
                        }).map(ev => {
                            const c = TYPE_COLORS[ev.event_type] || TYPE_COLORS.event;
                            const d = new Date(ev.event_date);
                            return (
                                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: c.border, background: c.bg }}>
                                    <div className="w-[3px] self-stretch rounded-full flex-shrink-0" style={{ background: c.dot }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-semibold text-slate-800 truncate">{ev.title}</span>
                                            {ev.is_recurring && <span className="text-[10px] bg-white/70 rounded px-1 border border-current" style={{ color: c.dot }}>↻</span>}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            {String(d.getUTCMonth() + 1).padStart(2, '0')}/{String(d.getUTCDate()).padStart(2, '0')}
                                            {ev.person_name && <span className="ml-1">· {ev.person_name}</span>}
                                        </div>
                                        {ev.description && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ev.description}</p>}
                                    </div>
                                    {canEdit && (
                                        <button onClick={() => handleDelete(ev.id)} className="text-slate-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {events.length === 0 && !loading && (
                <p className="text-center text-slate-400 text-[13px] py-8">{t.calendarEmpty}</p>
            )}

            {/* Add Event Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-[420px] p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[16px] font-bold text-[#3D2008]">{t.calendarModalTitle}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarTitleLabel}</label>
                                <input
                                    type="text" required
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder={t.calendarTitlePlaceholder}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarDateLabel}</label>
                                    <input
                                        type="date" required
                                        value={form.event_date}
                                        onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarTypeLabel}</label>
                                    <select
                                        value={form.event_type}
                                        onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                    >
                                        <option value="birthday">{t.calendarTypeBirthday}</option>
                                        <option value="anniversary">{t.calendarTypeAnniversary}</option>
                                        <option value="event">{t.calendarTypeEvent}</option>
                                        <option value="memorial">{t.calendarTypeMemorial}</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarPersonLabel}</label>
                                <input
                                    type="text"
                                    value={form.person_name}
                                    onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                                    placeholder={t.calendarPersonPlaceholder}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarDescLabel}</label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder={t.calendarDescPlaceholder}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_recurring}
                                    onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                                    className="accent-[#5a8a4a]"
                                />
                                <span className="text-[13px] text-slate-600">{t.calendarRecurringLabel}</span>
                            </label>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-600 cursor-pointer hover:bg-slate-50">
                                    {t.calendarCancelBtn}
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2.5 rounded-full text-[13px] font-semibold text-white cursor-pointer hover:brightness-110 disabled:opacity-60"
                                    style={{ background: '#5a8a4a' }}>
                                    {submitting ? t.calendarAdding : t.calendarSubmitBtn}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
