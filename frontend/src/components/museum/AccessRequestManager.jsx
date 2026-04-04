/**
 * AccessRequestManager.jsx — 관장용 접근 요청 관리 모달
 *
 * 관장이 수신한 접근 요청을 승인/거절 처리:
 * - 대기 중(pending) 목록
 * - 처리 완료(approved/rejected) 목록
 * - 요청자 이름, 대상 인물, 메시지 표시
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, XCircle, Clock, Shield, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const STATUS_TABS = [
    { key: 'pending', label: '대기 중', icon: Clock, color: '#e67e22' },
    { key: 'approved', label: '승인됨', icon: Check, color: '#2ecc71' },
    { key: 'rejected', label: '거절됨', icon: XCircle, color: '#e74c3c' },
];

export default function AccessRequestManager({ siteId, onClose }) {
    const [tab, setTab] = useState('pending');
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(null); // requestId being processed

    const fetchRequests = useCallback(async () => {
        if (!siteId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/access/${siteId}/requests`, {
                params: { status: tab },
            });
            setRequests(res.data?.data || []);
        } catch (err) {
            console.error('[AccessRequestManager] fetch error:', err);
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [siteId, tab]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const handleRespond = useCallback(async (requestId, action) => {
        setProcessing(requestId);
        try {
            await axios.put(`/api/access/respond/${requestId}`, { action });
            toast.success(action === 'approve' ? '승인되었습니다' : '거절되었습니다');
            fetchRequests();
        } catch (err) {
            console.error('[AccessRequestManager] respond error:', err);
            toast.error('처리에 실패했습니다');
        } finally {
            setProcessing(null);
        }
    }, [fetchRequests]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${month}/${day} ${hours}:${mins}`;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div
                    className="px-6 py-4 flex items-center justify-between shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2A1A08, #3D2008)' }}
                >
                    <div className="flex items-center gap-2">
                        <Shield size={20} className="text-[#C4A84F]" />
                        <div>
                            <h3 className="text-lg font-bold text-[#C4A84F]">접근 요청 관리</h3>
                            <p className="text-xs text-[#e8e0d0] mt-0.5">자료실/전시관 접근 요청을 관리합니다</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#C4A84F] hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex border-b shrink-0" style={{ borderColor: '#e8e0d0' }}>
                    {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold transition-all"
                            style={{
                                color: tab === key ? color : '#9a9a8a',
                                borderBottom: tab === key ? `2px solid ${color}` : '2px solid transparent',
                                background: tab === key ? `${color}08` : 'transparent',
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* 목록 */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-6 w-6 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl block mb-3">
                                {tab === 'pending' ? '📭' : tab === 'approved' ? '✅' : '🚫'}
                            </span>
                            <p className="text-sm text-gray-400">
                                {tab === 'pending' ? '대기 중인 요청이 없습니다' :
                                 tab === 'approved' ? '승인된 요청이 없습니다' :
                                 '거절된 요청이 없습니다'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => (
                                <div
                                    key={req.id}
                                    className="rounded-xl p-4 transition-all"
                                    style={{
                                        background: '#FAFAF2',
                                        border: '1px solid #e8e0d0',
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold" style={{ color: '#3a3a2a' }}>
                                                    {req.requester_name || req.requester_email || '알 수 없음'}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                                    style={{ background: '#e8e0d0', color: '#7a6e5e' }}>
                                                    {req.request_type === 'exhibit' ? '전시관' : '열람'}
                                                </span>
                                            </div>
                                            <p className="text-xs mt-1" style={{ color: '#7a7a6a' }}>
                                                대상: <strong>{req.person_name || '알 수 없음'}</strong>
                                            </p>
                                            {req.message && (
                                                <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: '#f0ece4', color: '#5a5040' }}>
                                                    "{req.message}"
                                                </p>
                                            )}
                                            <p className="text-[10px] mt-2" style={{ color: '#b0a898' }}>
                                                {formatDate(req.created_at)}
                                                {req.responded_at && ` → ${formatDate(req.responded_at)}`}
                                            </p>
                                        </div>

                                        {/* 승인/거절 버튼 (pending만) */}
                                        {tab === 'pending' && (
                                            <div className="flex gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleRespond(req.id, 'approve')}
                                                    disabled={processing === req.id}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                                                    style={{ background: '#2ecc71' }}
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(req.id, 'reject')}
                                                    disabled={processing === req.id}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                                                    style={{ background: '#e74c3c' }}
                                                >
                                                    거절
                                                </button>
                                            </div>
                                        )}

                                        {/* 상태 뱃지 (approved/rejected) */}
                                        {tab !== 'pending' && (
                                            <span
                                                className="px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                                                style={{
                                                    background: tab === 'approved' ? '#eafaf1' : '#fdedec',
                                                    color: tab === 'approved' ? '#2ecc71' : '#e74c3c',
                                                }}
                                            >
                                                {tab === 'approved' ? '승인됨' : '거절됨'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="px-6 py-3 text-center shrink-0" style={{ background: '#FAFAF2', borderTop: '1px solid #e8e0d0' }}>
                    <p className="text-[11px] text-gray-400">
                        승인된 사용자는 해당 인물의 자료실/전시관에 접근할 수 있습니다
                    </p>
                </div>
            </div>
        </div>
    );
}
