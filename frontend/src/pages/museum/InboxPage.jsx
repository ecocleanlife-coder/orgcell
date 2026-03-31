import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Check, Trash2, FolderInput, Image as ImageIcon, X,
    ChevronRight, Globe, Lock, User, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import axios from 'axios';

// ─── 이동 목적지 모달 ───
function MoveModal({ siteId, onMove, onClose }) {
    const [exhibitions, setExhibitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!siteId) return;
        axios.get('/api/exhibitions', { params: { site_id: siteId } })
            .then((r) => { if (r.data?.success) setExhibitions(r.data.data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [siteId]);

    const VIS_ICON = { public: Globe, family: Lock, private: User };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(40,35,50,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl max-h-[70vh] overflow-y-auto"
                style={{ border: '1.5px solid #e8e0d0' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold" style={{ color: '#3a3a2a' }}>어디에 전시할까요?</h3>
                    <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#f0ece4' }}>
                        <X size={14} style={{ color: '#7a7a6a' }} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-8 text-center">
                        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto" />
                    </div>
                ) : exhibitions.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#9a9a8a' }}>전시관이 없습니다.</p>
                ) : (
                    <div className="space-y-2">
                        {exhibitions.map((exh) => {
                            const Icon = VIS_ICON[exh.visibility] || Lock;
                            return (
                                <button
                                    key={exh.id}
                                    onClick={() => onMove(exh.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-gray-50"
                                    style={{ borderColor: '#e8e0d0' }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                        style={{
                                            background: exh.cover_photo ? `url(${exh.cover_photo}) center/cover` : '#e8e0d0',
                                        }}
                                    >
                                        {!exh.cover_photo && <ImageIcon size={16} style={{ color: '#9a9a8a' }} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: '#3a3a2a' }}>{exh.title}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Icon size={10} style={{ color: '#9a9a8a' }} />
                                            <span className="text-xs" style={{ color: '#9a9a8a' }}>{exh.photo_count}장</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} style={{ color: '#ccc' }} />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── 탭 정의 ───
const TABS = [
    { key: 'pending', label: '대기중', icon: Clock, color: '#D97706' },
    { key: 'accepted', label: '승인됨', icon: CheckCircle, color: '#16A34A' },
    { key: 'rejected', label: '거절됨', icon: XCircle, color: '#DC2626' },
];

// ─── 시간 포맷 ───
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
}

// ═══════════════════════════════════════════════
// InboxPage — 받은 사진함 (탭: 대기중 / 승인됨 / 거절됨)
// ═══════════════════════════════════════════════
export default function InboxPage() {
    const navigate = useNavigate();
    const [photos, setPhotos] = useState([]);
    const [counts, setCounts] = useState({ pending: 0, accepted: 0, rejected: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [siteId, setSiteId] = useState(null);

    // 내 사이트 가져오기
    useEffect(() => {
        axios.get('/api/sites/mine')
            .then((r) => {
                if (r.data?.success && r.data.data) setSiteId(r.data.data.id);
            })
            .catch(() => {});
    }, []);

    // inbox 사진 fetch
    const fetchInbox = useCallback(async (tab) => {
        if (!siteId) return;
        setLoading(true);
        try {
            const { data } = await axios.get('/api/inbox', { params: { site_id: siteId, status: tab || activeTab } });
            if (data.success) {
                setPhotos(data.data);
                if (data.counts) setCounts(data.counts);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [siteId, activeTab]);

    useEffect(() => { fetchInbox(); }, [fetchInbox]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSelectedIds(new Set());
        fetchInbox(tab);
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === photos.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(photos.map((p) => p.id)));
        }
    };

    // 전시하기 (accept + move to exhibition)
    const handleMove = async (exhibitionId) => {
        const ids = Array.from(selectedIds);
        try {
            await axios.post('/api/inbox/accept', {
                photo_ids: ids,
                exhibition_id: exhibitionId,
            });
            setSelectedIds(new Set());
            setShowMoveModal(false);
            fetchInbox();
        } catch {
            // silent
        }
    };

    // 거절 (reject)
    const handleReject = async () => {
        if (!window.confirm(`${selectedIds.size}장을 거절하시겠습니까? 파일이 삭제됩니다.`)) return;
        const ids = Array.from(selectedIds);
        try {
            await axios.post('/api/inbox/reject', { photo_ids: ids });
            setSelectedIds(new Set());
            fetchInbox();
        } catch {
            // silent
        }
    };

    // 완전 삭제 (accepted/rejected 탭에서)
    const handleDelete = async () => {
        if (!window.confirm(`${selectedIds.size}장을 완전히 삭제하시겠습니까?`)) return;
        const ids = Array.from(selectedIds);
        try {
            await Promise.all(ids.map((id) => axios.delete(`/api/inbox/${id}`)));
            setSelectedIds(new Set());
            fetchInbox();
        } catch {
            // silent
        }
    };

    const isPending = activeTab === 'pending';

    return (
        <div className="min-h-screen font-sans" style={{ background: '#FAFAF7' }}>
            {/* 헤더 */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(250,250,247,0.96)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} style={{ color: '#5a5a4a' }} />
                        </button>
                        <h1 className="font-bold text-base" style={{ color: '#3a3a2a' }}>
                            받은 사진함
                        </h1>
                    </div>
                    {photos.length > 0 && (
                        <button
                            onClick={selectAll}
                            className="text-xs font-bold px-3 py-1.5 rounded-full"
                            style={{ background: '#e8e0d0', color: '#5a5040' }}
                        >
                            {selectedIds.size === photos.length ? '선택 해제' : '전체 선택'}
                        </button>
                    )}
                </div>

                {/* 탭 */}
                <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        const count = counts[tab.key] || 0;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={{
                                    background: isActive ? tab.color : '#f0ece4',
                                    color: isActive ? '#fff' : '#7a7a6a',
                                }}
                            >
                                <Icon size={12} />
                                {tab.label} {count > 0 && <span>{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                    </div>
                ) : photos.length === 0 ? (
                    <div className="text-center py-20" style={{ color: '#9a9a8a' }}>
                        <ImageIcon size={48} className="mx-auto mb-3 opacity-25" />
                        <p className="text-sm">
                            {activeTab === 'pending' && '대기 중인 사진이 없습니다'}
                            {activeTab === 'accepted' && '승인한 사진이 없습니다'}
                            {activeTab === 'rejected' && '거절한 사진이 없습니다'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                        {photos.map((photo) => {
                            const isSelected = selectedIds.has(photo.id);
                            return (
                                <div
                                    key={photo.id}
                                    className="relative aspect-square rounded-lg overflow-hidden cursor-pointer"
                                    style={{ background: '#e8e0d0' }}
                                    onClick={() => toggleSelect(photo.id)}
                                >
                                    <img
                                        src={photo.url}
                                        alt={photo.original_name || ''}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {/* 선택 체크 */}
                                    <div
                                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2"
                                        style={{
                                            background: isSelected ? '#5a8a4a' : 'rgba(255,255,255,0.7)',
                                            borderColor: isSelected ? '#5a8a4a' : 'rgba(255,255,255,0.9)',
                                        }}
                                    >
                                        {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                                    </div>
                                    {/* 보낸 사람 + 시간 */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 px-2 py-1"
                                        style={{ background: 'rgba(0,0,0,0.5)' }}
                                    >
                                        <div className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
                                            {photo.sender_name || '알 수 없음'}
                                        </div>
                                        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                            {timeAgo(photo.created_at)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* 하단 액션바 */}
            {selectedIds.size > 0 && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-40 border-t"
                    style={{ background: 'rgba(255,255,255,0.97)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
                >
                    <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: '#3a3a2a' }}>
                            {selectedIds.size}장 선택됨
                        </span>
                        <div className="flex gap-2">
                            {isPending && (
                                <>
                                    <button
                                        onClick={() => setShowMoveModal(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                                        style={{ background: '#5a8a4a' }}
                                    >
                                        <CheckCircle size={14} />
                                        전시하기
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                                        style={{ background: '#fee2e2', color: '#dc2626' }}
                                    >
                                        <XCircle size={14} />
                                        삭제
                                    </button>
                                </>
                            )}
                            {!isPending && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                                    style={{ background: '#fee2e2', color: '#dc2626' }}
                                >
                                    <Trash2 size={14} />
                                    완전 삭제
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 이동 모달 */}
            {showMoveModal && (
                <MoveModal
                    siteId={siteId}
                    onMove={handleMove}
                    onClose={() => setShowMoveModal(false)}
                />
            )}
        </div>
    );
}
