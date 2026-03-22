import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { Solar } from 'lunar-javascript';

const TYPE_COLORS = {
    birthday:    { bg: '#fce7f3', border: '#ec4899', dot: '#ec4899', label: '' },
    anniversary: { bg: '#fef9c3', border: '#eab308', dot: '#eab308', label: '' },
    event:       { bg: '#dbeafe', border: '#3b82f6', dot: '#3b82f6', label: '' },
    memorial:    { bg: '#f3f4f6', border: '#6b7280', dot: '#6b7280', label: '' },
    trip:        { bg: '#e0f2fe', border: '#0ea5e9', dot: '#0ea5e9', label: '' },
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

// 음력 공휴일 (month, day)
const LUNAR_HOLIDAYS = [
    { m: 1, d: 1, emoji: '🎊', key: 'seollal' },      // 설날
    { m: 1, d: 15, emoji: '🏮', key: 'daeboreum' },    // 정월대보름
    { m: 5, d: 5, emoji: '🎏', key: 'dano' },           // 단오
    { m: 8, d: 15, emoji: '🌕', key: 'chuseok' },      // 추석
];

function getLunarInfo(year, month, day) {
    try {
        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();
        const lm = lunar.getMonth();
        const ld = lunar.getDay();
        const holiday = LUNAR_HOLIDAYS.find(h => h.m === lm && h.d === ld);
        return { month: lm, day: ld, holiday };
    } catch {
        return null;
    }
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
        title: '', event_date: '', end_date: '', event_type: 'event',
        description: '', is_recurring: false, person_name: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [showLunar, setShowLunar] = useState(() => {
        try { return localStorage.getItem('orgcell_lunar') !== 'false'; } catch { return true; }
    });

    const toggleLunar = () => {
        setShowLunar(prev => {
            const next = !prev;
            try { localStorage.setItem('orgcell_lunar', String(next)); } catch {}
            return next;
        });
    };

    // 월별 음력 정보 메모이제이션
    const lunarData = useMemo(() => {
        if (!showLunar) return {};
        const data = {};
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            data[d] = getLunarInfo(year, month, d);
        }
        return data;
    }, [year, month, showLunar]);

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
        setForm({ title: '', event_date: `${year}-${mPad}-${pad}`, end_date: '', event_type: 'event', description: '', is_recurring: false, person_name: '' });
        setSelectedDay(day);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.event_date) return;
        if (form.end_date && form.end_date < form.event_date) return;
        setSubmitting(true);
        try {
            const payload = { ...form, site_id: siteId };
            if (!payload.end_date) delete payload.end_date;
            await axios.post('/api/calendar', payload);
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

    // Map day → events (기간 이벤트는 여러 날에 걸쳐 표시)
    const eventsByDay = {};
    const rangeEventDays = {}; // day → true (기간 이벤트 배경 표시용)
    events.forEach(ev => {
        const d = new Date(ev.event_date);
        if (ev.end_date && !ev.is_recurring) {
            // 기간 이벤트: start_date~end_date 사이 모든 날에 표시
            const start = new Date(ev.event_date);
            const end = new Date(ev.end_date);
            const daysInMonth = new Date(year, month, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const current = new Date(year, month - 1, day);
                if (current >= start && current <= end) {
                    if (!eventsByDay[day]) eventsByDay[day] = [];
                    // 시작일에만 이벤트 라벨 표시, 나머지는 배경만
                    if (current.getTime() === start.getTime() ||
                        (day === 1 && current > start)) {
                        eventsByDay[day].push(ev);
                    }
                    rangeEventDays[day] = TYPE_COLORS[ev.event_type] || TYPE_COLORS.event;
                }
            }
        } else {
            const key = ev.is_recurring
                ? d.getUTCDate()
                : (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month ? d.getUTCDate() : null);
            if (key) {
                if (!eventsByDay[key]) eventsByDay[key] = [];
                eventsByDay[key].push(ev);
            }
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleLunar}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${showLunar ? 'bg-[#5a8a4a] text-white' : 'bg-slate-100 text-slate-500'}`}
                    >
                        🌙 {t.calendarLunarToggle}
                    </button>
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
                        const rangeColor = day ? rangeEventDays[day] : null;
                        return (
                            <div
                                key={i}
                                onClick={() => day && canEdit && openModal(day)}
                                className={`min-h-[64px] rounded-lg p-1 text-[12px] ${day ? 'hover:bg-[#f0ebe0] transition-colors' : ''} ${canEdit && day ? 'cursor-pointer' : ''}`}
                                style={rangeColor ? { background: rangeColor.bg } : undefined}
                            >
                                {day && (
                                    <>
                                        <div className="flex items-center gap-0.5">
                                            <span className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[12px] font-semibold ${isToday ? 'bg-[#5a8a4a] text-white' : 'text-slate-700'}`}>
                                                {day}
                                            </span>
                                            {showLunar && lunarData[day]?.holiday && (
                                                <span className="text-[10px]">{lunarData[day].holiday.emoji}</span>
                                            )}
                                        </div>
                                        {showLunar && lunarData[day] && (
                                            <span className={`text-[9px] leading-tight ${lunarData[day].day === 1 ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                                                {lunarData[day].day === 1 ? `${lunarData[day].month}월` : lunarData[day].day}
                                            </span>
                                        )}
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
                                                        {canEdit && !ev.auto_generated && (
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
                                            {ev.end_date && (() => {
                                                const ed = new Date(ev.end_date);
                                                return ` ~ ${String(ed.getUTCMonth() + 1).padStart(2, '0')}/${String(ed.getUTCDate()).padStart(2, '0')}`;
                                            })()}
                                            {ev.person_name && <span className="ml-1">· {ev.person_name}</span>}
                                        </div>
                                        {ev.description && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{ev.description}</p>}
                                    </div>
                                    {canEdit && !ev.auto_generated && (
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
                                        <option value="trip">{t.calendarTypeTrip}</option>
                                    </select>
                                </div>
                            </div>
                            {(form.event_type === 'trip' || form.event_type === 'event') && (
                                <div>
                                    <label className="block text-[12px] font-semibold text-slate-600 mb-1">{t.calendarEndDateLabel}</label>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        min={form.event_date}
                                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#5a8a4a]"
                                    />
                                    {form.end_date && form.end_date < form.event_date && (
                                        <p className="text-[11px] text-red-500 mt-1">{t.calendarEndDateError}</p>
                                    )}
                                </div>
                            )}
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
