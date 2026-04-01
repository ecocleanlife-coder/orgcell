import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Plus, X, Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVisibilityInfo } from '../../hooks/useVisibility';
import AncestorHallTab from './AncestorHallTab';

function ExhibitionCard({ exh, t, onClick }) {
    return (
        <div
            onClick={onClick}
            className="rounded-2xl border bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            style={{ borderColor: '#e8e0d0' }}
        >
            <div
                className="h-28 flex items-center justify-center relative"
                style={{
                    background: exh.cover_photo
                        ? `url(${exh.cover_photo}) center/cover`
                        : 'linear-gradient(135deg, #d8cfe8, #c8e0c0)',
                }}
            >
                {!exh.cover_photo && <ImageIcon size={36} style={{ color: 'rgba(255,255,255,0.7)' }} />}
                {(() => { const vi = getVisibilityInfo(exh.visibility); const VIcon = vi.icon; return (
                <span
                    className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{ background: vi.bg, color: vi.color }}
                >
                    <VIcon size={10} />
                    {exh.visibility === 'public' ? t.subPublic : t.subFamily}
                </span>
                ); })()}
            </div>
            <div className="p-3">
                <h3 className="font-bold text-sm truncate" style={{ color: '#3a3a2a' }}>{exh.title}</h3>
                <p className="text-xs mt-1" style={{ color: '#8a8a7a' }}>
                    {exh.photo_count} {t.exhPhotos} &bull; {exh.guestbook_count} {t.exhGuestbook}
                </p>
            </div>
        </div>
    );
}

// 미니 슬라이드쇼
function MiniSlideshow({ exhibitions }) {
    const [idx, setIdx] = useState(0);
    const timerRef = useRef(null);
    const covers = exhibitions.filter((e) => e.cover_photo).slice(0, 5);

    useEffect(() => {
        if (covers.length <= 1) return;
        timerRef.current = setInterval(() => {
            setIdx((prev) => (prev + 1) % covers.length);
        }, 3000);
        return () => clearInterval(timerRef.current);
    }, [covers.length]);

    if (covers.length === 0) {
        return (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #e8e0f0, #d0e8d0)' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon size={48} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0">
            {covers.map((exh, i) => (
                <div
                    key={exh.id}
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{
                        backgroundImage: `url(${exh.cover_photo})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: i === idx ? 1 : 0,
                    }}
                />
            ))}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.45))' }} />
            {/* 인디케이터 */}
            {covers.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {covers.map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                </div>
            )}
        </div>
    );
}

const TABS = [
    { key: 'ancestor', label: '조상' },
    { key: 'family',   label: '가족공개' },
    { key: 'public',   label: '일반공개' },
];

function getDefaultTab(role) {
    if (role === 'owner' || role === 'member') return 'ancestor';
    if (role === 'family') return 'family';
    return 'public';
}

export default function DashboardExhibitionWidget({
    siteId, role, t, subdomain, exhibitions, exhLoading, canEdit,
    onUpload, onPrivateUpload, onNavigate,
}) {
    const [fullscreen, setFullscreen] = useState(false);
    const [activeTab, setActiveTab] = useState(() => getDefaultTab(role));

    const familyExhs = exhibitions.filter((e) => e.visibility !== 'public');
    const publicExhs = exhibitions.filter((e) => e.visibility === 'public');

    const visibleTabs = TABS.filter((tab) => {
        if (tab.key === 'ancestor') return role === 'owner' || role === 'member';
        if (tab.key === 'family') return true;
        return true;
    });

    return (
        <>
            {/* ── 대형 카드 버튼 ── */}
            <section id="section-exhibition" className="min-w-0">
                <button
                    onClick={() => setFullscreen(true)}
                    className="w-full h-48 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left group"
                    style={{ border: '1px solid #e8e0d0' }}
                >
                    {/* 슬라이드쇼 배경 */}
                    <MiniSlideshow exhibitions={exhibitions} />

                    {/* 반투명 오버레이 (가독성) */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%)' }} />

                    {/* 콘텐츠 */}
                    <div className="absolute inset-0 flex flex-col justify-between p-5 z-10">
                        {/* 상단: 제목 */}
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ImageIcon size={18} style={{ color: '#fff' }} />
                                    <h2 className="text-base font-bold text-white drop-shadow-md">
                                        우리 가족 전시관
                                    </h2>
                                </div>
                            </div>
                            <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-white drop-shadow" />
                        </div>

                        {/* 하단: 전시관 요약 */}
                        <div>
                            <p className="text-white text-2xl font-black drop-shadow-md leading-none">
                                {exhibitions.length > 0 ? `${exhibitions.length}개` : '0개'}
                            </p>
                            <p className="text-white/80 text-xs mt-1 drop-shadow font-medium">
                                {exhibitions.length > 0
                                    ? [
                                        familyExhs.length > 0 && `가족공개 ${familyExhs.length}`,
                                        publicExhs.length > 0 && `일반공개 ${publicExhs.length}`,
                                    ].filter(Boolean).join(' · ')
                                    : '전시관을 만들어보세요'
                                }
                            </p>
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
                        {/* 헤더 + 탭 */}
                        <div className="px-5 pt-3 pb-0 border-b" style={{ borderColor: '#e8e0d0', background: '#fafaf7' }}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold" style={{ color: '#3a3a2a' }}>
                                    우리 가족 전시관
                                </h2>
                                <div className="flex items-center gap-2">
                                    {canEdit && (
                                        <button
                                            onClick={onUpload}
                                            className="text-xs font-bold px-3 py-1.5 rounded-full"
                                            style={{ background: '#e8f5e0', color: '#3a7a2a' }}
                                        >
                                            <Plus size={12} className="inline -mt-0.5 mr-0.5" />
                                            새 전시관
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setFullscreen(false)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                                        style={{ background: '#f0ece4' }}
                                    >
                                        <X size={16} style={{ color: '#5a5a4a' }} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {visibleTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className="px-4 py-2 text-sm font-bold rounded-t-lg transition-all"
                                        style={{
                                            background: activeTab === tab.key ? '#fff' : 'transparent',
                                            color: activeTab === tab.key ? '#3a3a2a' : '#9a9a8a',
                                            borderBottom: activeTab === tab.key ? '2px solid #5a8a4a' : '2px solid transparent',
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 탭 본문 */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {activeTab === 'ancestor' && (
                                <AncestorHallTab siteId={siteId} subdomain={subdomain} role={role} t={t} />
                            )}
                            {activeTab === 'family' && (
                                <div>
                                    {familyExhs.length === 0 ? (
                                        <div className="text-center py-16" style={{ color: '#9a9a8a' }}>
                                            <span className="text-4xl block mb-3">🔒</span>
                                            <p className="text-sm">가족공개 전시관이 아직 없습니다</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {familyExhs.map((exh) => (
                                                <ExhibitionCard
                                                    key={exh.id}
                                                    exh={exh}
                                                    t={t}
                                                    onClick={() => onNavigate(`/${subdomain}/gallery/${exh.id}`)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'public' && (
                                <div>
                                    {publicExhs.length === 0 ? (
                                        <div className="text-center py-16" style={{ color: '#9a9a8a' }}>
                                            <span className="text-4xl block mb-3">🌐</span>
                                            <p className="text-sm">일반공개 전시관이 아직 없습니다</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {publicExhs.map((exh) => (
                                                <ExhibitionCard
                                                    key={exh.id}
                                                    exh={exh}
                                                    t={t}
                                                    onClick={() => onNavigate(`/${subdomain}/gallery/${exh.id}`)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
