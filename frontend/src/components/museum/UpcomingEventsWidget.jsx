import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CalendarDays } from 'lucide-react';

const TYPE_COLORS = {
    birthday:    { bg: '#fce7f3', dot: '#ec4899' },
    anniversary: { bg: '#fef9c3', dot: '#eab308' },
    event:       { bg: '#dbeafe', dot: '#3b82f6' },
    memorial:    { bg: '#f3f4f6', dot: '#6b7280' },
};

export default function UpcomingEventsWidget({ siteId, t }) {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (!siteId) return;
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;

        // 이번 달 + 다음 달 이벤트 가져오기
        Promise.all([
            axios.get('/api/calendar', { params: { site_id: siteId, year: y, month: m } }),
            axios.get('/api/calendar', { params: { site_id: siteId, year: m === 12 ? y + 1 : y, month: m === 12 ? 1 : m + 1 } }),
        ]).then(([r1, r2]) => {
            const all = [...(r1.data?.data || []), ...(r2.data?.data || [])];
            // 30일 이내 필터링
            const today = new Date(y, m - 1, now.getDate());
            const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

            const upcoming = all.filter(ev => {
                const d = new Date(ev.event_date);
                if (ev.is_recurring) {
                    // 반복 이벤트: 올해 날짜로 비교
                    const thisYear = new Date(y, d.getUTCMonth(), d.getUTCDate());
                    return thisYear >= today && thisYear <= limit;
                }
                return d >= today && d <= limit;
            }).sort((a, b) => {
                const da = new Date(a.event_date);
                const db = new Date(b.event_date);
                return da.getUTCDate() - db.getUTCDate();
            });

            setEvents(upcoming.slice(0, 5));
        }).catch(() => {});
    }, [siteId]);

    if (events.length === 0) return null;

    return (
        <div className="mb-4 p-4 rounded-2xl" style={{ background: '#f8f6f0', border: '1px solid #e8e0d0' }}>
            <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={16} style={{ color: '#5a8a4a' }} />
                <span className="text-[13px] font-bold" style={{ color: '#3a3a2a' }}>
                    {t?.upcomingTitle || 'Upcoming Events'}
                </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {events.map((ev) => {
                    const c = TYPE_COLORS[ev.event_type] || TYPE_COLORS.event;
                    const d = new Date(ev.event_date);
                    return (
                        <div
                            key={ev.id}
                            className="shrink-0 px-3 py-2 rounded-xl text-[12px]"
                            style={{ background: c.bg, border: `1px solid ${c.dot}30` }}
                        >
                            <span className="font-semibold" style={{ color: '#333' }}>{ev.title}</span>
                            <span className="ml-1.5" style={{ color: '#888' }}>
                                {String(d.getUTCMonth() + 1).padStart(2, '0')}/{String(d.getUTCDate()).padStart(2, '0')}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
