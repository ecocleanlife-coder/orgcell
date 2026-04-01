import React, { useState, useMemo } from 'react';
import { CalendarDays, ClipboardList, X, ChevronRight, Pencil, Bell, Star, Calendar, MessageSquare } from 'lucide-react';
import FamilyCalendar from './FamilyCalendar';

const CATEGORY_META = {
    notice: { icon: Bell,          color: '#e67e22' },
    daily:  { icon: Star,          color: '#2ecc71' },
    event:  { icon: Calendar,      color: '#3498db' },
    memory: { icon: MessageSquare, color: '#9b59b6' },
};

function PostRow({ post, t, onClick }) {
    const meta = CATEGORY_META[post.category] || CATEGORY_META.daily;
    const Icon = meta.icon;
    const date = new Date(post.created_at).toLocaleDateString();
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
            style={{ borderColor: '#f0ece4' }}
        >
            <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: meta.color + '20' }}>
                <Icon size={14} style={{ color: meta.color }} />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#3a3a2a' }}>{post.title}</p>
                <p className="text-xs" style={{ color: '#9a9a8a' }}>{post.author_name} · {date}</p>
            </div>
            {post.comment_count > 0 && (
                <span className="text-xs shrink-0" style={{ color: '#aaa' }}>{post.comment_count} {t.boardComments}</span>
            )}
            <ChevronRight size={14} style={{ color: '#ccc' }} />
        </div>
    );
}

export default function DashboardCalendarWidget({ siteId, role, t, posts, boardLoading, onPostClick, onWritePost, canEdit }) {
    const [fullscreen, setFullscreen] = useState(false);

    // 오늘 날짜 포맷
    const today = useMemo(() => {
        const d = new Date();
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        return {
            month: d.getMonth() + 1,
            day: d.getDate(),
            weekday: weekdays[d.getDay()],
            full: `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`,
        };
    }, []);

    // 다가오는 일정 1개 (event 카테고리 최신)
    const nextEvent = useMemo(() => {
        const events = posts.filter((p) => p.category === 'event' || p.category === 'notice');
        return events.length > 0 ? events[0] : null;
    }, [posts]);

    return (
        <>
            {/* ── 대형 카드 버튼 ── */}
            <section id="section-calendar" className="min-w-0">
                <button
                    onClick={() => setFullscreen(true)}
                    className="w-full h-48 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left group"
                    style={{ border: '1px solid #e8e0d0' }}
                >
                    {/* 달력 패턴 배경 */}
                    <div className="absolute inset-0" style={{
                        background: 'linear-gradient(135deg, #f0f7ed 0%, #e0eed8 50%, #d8e8d0 100%)',
                    }} />
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ctext x='15' y='50' font-size='40' opacity='0.5'%3E%F0%9F%93%85%3C/text%3E%3C/svg%3E")`,
                        backgroundSize: '80px 80px',
                    }} />

                    {/* 콘텐츠 */}
                    <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
                        {/* 상단: 제목 + 아이콘 */}
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <CalendarDays size={18} style={{ color: '#3a7a2a' }} />
                                    <h2 className="text-base font-bold" style={{ color: '#2a5a1a' }}>
                                        일정표 및 가족 게시판
                                    </h2>
                                </div>
                                <p className="text-xs" style={{ color: '#6a8a5a' }}>
                                    {posts.length > 0 ? `${posts.length}개 게시글` : '게시글을 써보세요'}
                                </p>
                            </div>
                            <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1" style={{ color: '#3a7a2a' }} />
                        </div>

                        {/* 하단: 오늘 날짜 + 다가오는 일정 */}
                        <div>
                            <div className="flex items-end gap-3">
                                <div className="bg-white/80 rounded-xl px-3 py-2 backdrop-blur-sm" style={{ border: '1px solid rgba(58,122,42,0.15)' }}>
                                    <p className="text-2xl font-black leading-none" style={{ color: '#2a5a1a' }}>{today.day}</p>
                                    <p className="text-xs font-bold mt-0.5" style={{ color: '#5a8a4a' }}>{today.month}월 {today.weekday}요일</p>
                                </div>
                                {nextEvent && (
                                    <div className="flex-1 min-w-0 mb-0.5">
                                        <p className="text-xs font-bold truncate" style={{ color: '#3a6a2a' }}>
                                            {nextEvent.title}
                                        </p>
                                        <p className="text-xs" style={{ color: '#7a9a6a' }}>
                                            {new Date(nextEvent.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </button>
            </section>

            {/* ── 전체화면 모달 ── */}
            {fullscreen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col"
                    style={{ background: 'rgba(40,35,50,0.6)', backdropFilter: 'blur(6px)' }}
                >
                    <div className="bg-white w-full max-w-6xl mx-auto mt-4 mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 2rem)', border: '1.5px solid #e8e0d0' }}>
                        {/* 헤더 */}
                        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#e8e0d0', background: '#fafaf7' }}>
                            <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>
                                <CalendarDays size={18} className="inline mr-2 -mt-0.5" />
                                일정표 및 가족 게시판
                            </h2>
                            <button
                                onClick={() => setFullscreen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                                style={{ background: '#f0ece4' }}
                            >
                                <X size={16} style={{ color: '#5a5a4a' }} />
                            </button>
                        </div>

                        {/* 본문: 데스크탑 2열, 모바일 세로 */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
                            {/* 좌: 달력 */}
                            <div className="overflow-y-auto border-r" style={{ borderColor: '#f0ece4' }}>
                                <FamilyCalendar siteId={siteId} role={role} t={t} />
                            </div>

                            {/* 우: 게시판 */}
                            <div className="overflow-y-auto flex flex-col">
                                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#f0ece4' }}>
                                    <h3 className="text-sm font-bold" style={{ color: '#3a3a2a' }}>
                                        <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                                        가족 게시판
                                    </h3>
                                    {canEdit && (
                                        <button
                                            onClick={onWritePost}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
                                            style={{ background: '#3a3a2a', color: '#fff' }}
                                        >
                                            <Pencil size={11} />
                                            {t.boardWriteBtn}
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {boardLoading ? (
                                        <div className="p-8 text-center">
                                            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                                        </div>
                                    ) : posts.length === 0 ? (
                                        <div className="text-center py-12" style={{ color: '#9a9a8a' }}>
                                            <span className="text-4xl block mb-3">✏️</span>
                                            <p className="text-sm">첫 글을 써보세요</p>
                                        </div>
                                    ) : (
                                        posts.map((post) => (
                                            <PostRow key={post.id} post={post} t={t} onClick={() => onPostClick(post.id)} />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
