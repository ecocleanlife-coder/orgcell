import React, { useState } from 'react';
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

    return (
        <>
            {/* ── 미니 위젯 ── */}
            <section id="section-calendar" className="min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold" style={{ color: '#3a3a2a' }}>
                        <CalendarDays size={16} className="inline mr-1.5 -mt-0.5" />
                        일정표 및 가족 게시판
                    </h2>
                    <button
                        onClick={() => setFullscreen(true)}
                        className="text-xs font-bold px-2.5 py-1 rounded-full transition-all hover:brightness-95"
                        style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                    >
                        전체보기
                    </button>
                </div>
                <div
                    onClick={() => setFullscreen(true)}
                    className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative"
                    style={{ border: '1px solid #e8e0d0', minHeight: 320 }}
                >
                    {/* 달력 아이콘 패턴 배경 */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ctext x='10' y='40' font-size='30' opacity='0.4'%3E📅%3C/text%3E%3C/svg%3E")`,
                        backgroundSize: '60px 60px',
                    }} />
                    <FamilyCalendar siteId={siteId} role={role} t={t} />
                </div>
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
