import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Eye, Link2, Globe, ArrowDownToLine, RefreshCw } from 'lucide-react';

const SOURCE_LABELS = {
    direct: { label: '직접 방문', color: '#3498db', icon: Globe },
    invite_code: { label: '초대 코드', color: '#2ecc71', icon: Link2 },
    invite_link: { label: '초대 링크', color: '#9b59b6', icon: Link2 },
    public: { label: '공개 검색', color: '#e67e22', icon: Eye },
    friend: { label: '친구 요청', color: '#e74c3c', icon: Users },
};

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white rounded-xl border border-[#E8E3D8] p-4 flex items-center gap-3">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: color + '15' }}
            >
                <Icon size={18} style={{ color }} />
            </div>
            <div>
                <p className="text-[22px] font-bold text-[#3D2008]">{value}</p>
                <p className="text-[12px] text-[#8A8070]">{label}</p>
            </div>
        </div>
    );
}

function SourceBar({ source, uniqueVisitors, totalVisits, maxVisits }) {
    const meta = SOURCE_LABELS[source] || { label: source, color: '#999', icon: Eye };
    const width = maxVisits > 0 ? Math.max((totalVisits / maxVisits) * 100, 4) : 4;

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-20 text-[12px] font-medium text-[#5A5A4A] shrink-0 truncate">
                {meta.label}
            </div>
            <div className="flex-1 h-7 bg-[#F5F2EC] rounded-lg overflow-hidden relative">
                <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{ width: `${width}%`, background: meta.color }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#5A5A4A]">
                    {uniqueVisitors}명 / {totalVisits}회
                </span>
            </div>
        </div>
    );
}

export default function InviteDashboard() {
    const [stats, setStats] = useState(null);
    const [visitors, setVisitors] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('stats');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, visitorsRes, invitesRes] = await Promise.all([
                axios.get('/api/friends/visitor-stats'),
                axios.get('/api/friends/visitors'),
                axios.get('/api/invite/status'),
            ]);
            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (visitorsRes.data?.success) setVisitors(visitorsRes.data.data);
            if (invitesRes.data?.success) setInvites(invitesRes.data.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const inviteStats = {
        total: invites.length,
        accepted: invites.filter(i => i.status === 'accepted').length,
        pending: invites.filter(i => i.status === 'pending' && !i.is_expired).length,
        expired: invites.filter(i => i.is_expired && i.status !== 'accepted').length,
    };

    const exportCSV = () => {
        const header = '이름,유입경로,방문횟수,마지막방문\n';
        const rows = visitors.map(v =>
            `${v.name || ''},${SOURCE_LABELS[v.source]?.label || v.source},${v.visit_count || 1},${v.last_visited_at ? new Date(v.last_visited_at).toLocaleDateString('ko-KR') : ''}`
        ).join('\n');
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-gray-200 border-t-[#5A9460] rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    const maxVisits = stats?.bySource?.length
        ? Math.max(...stats.bySource.map(s => parseInt(s.total_visits, 10)))
        : 0;

    return (
        <div className="space-y-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-[#3D2008]" style={{ fontFamily: 'Georgia, serif' }}>
                    초대 & 방문 현황
                </h2>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-1.5 text-[12px] text-[#8A8070] hover:text-[#3D2008] transition"
                >
                    <RefreshCw size={13} />
                    새로고침
                </button>
            </div>

            {/* 탭 */}
            <div className="flex gap-2">
                {[
                    { key: 'stats', label: '통계' },
                    { key: 'visitors', label: '방문자' },
                    { key: 'invites', label: '초대' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSection(tab.key)}
                        className="px-4 py-1.5 rounded-full text-[13px] font-bold transition-all"
                        style={{
                            background: activeSection === tab.key ? '#3D2008' : '#fff',
                            color: activeSection === tab.key ? '#fff' : '#5A5A4A',
                            border: `1.5px solid ${activeSection === tab.key ? '#3D2008' : '#E8E3D8'}`,
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── 통계 섹션 ── */}
            {activeSection === 'stats' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon={Users} label="고유 방문자" value={stats?.uniqueVisitors || 0} color="#3498db" />
                        <StatCard icon={Eye} label="총 방문 횟수" value={stats?.totalVisits || 0} color="#2ecc71" />
                        <StatCard icon={Link2} label="초대 수락" value={inviteStats.accepted} color="#9b59b6" />
                        <StatCard icon={Globe} label="대기 중" value={inviteStats.pending} color="#f39c12" />
                    </div>

                    {/* 유입 경로 바 차트 */}
                    <div className="bg-white rounded-xl border border-[#E8E3D8] p-5">
                        <h3 className="text-[14px] font-bold text-[#3D2008] mb-4">유입 경로별 방문</h3>
                        {!stats?.bySource?.length ? (
                            <p className="text-[13px] text-[#8A8070] text-center py-6">아직 방문 데이터가 없습니다</p>
                        ) : (
                            <div className="space-y-1">
                                {stats.bySource.map(s => (
                                    <SourceBar
                                        key={s.source}
                                        source={s.source}
                                        uniqueVisitors={parseInt(s.unique_visitors, 10)}
                                        totalVisits={parseInt(s.total_visits, 10)}
                                        maxVisits={maxVisits}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 방문자 섹션 ── */}
            {activeSection === 'visitors' && (
                <div className="bg-white rounded-xl border border-[#E8E3D8] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0EDE6]">
                        <h3 className="text-[14px] font-bold text-[#3D2008]">최근 방문자</h3>
                        {visitors.length > 0 && (
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1 text-[11px] text-[#5A9460] font-bold hover:underline"
                            >
                                <ArrowDownToLine size={12} />
                                CSV
                            </button>
                        )}
                    </div>
                    {visitors.length === 0 ? (
                        <p className="text-[13px] text-[#8A8070] text-center py-10">아직 방문자가 없습니다</p>
                    ) : (
                        <div className="divide-y divide-[#F5F2EC]">
                            {visitors.map(v => {
                                const meta = SOURCE_LABELS[v.source] || SOURCE_LABELS.direct;
                                return (
                                    <div key={v.user_id} className="px-4 py-3 flex items-center gap-3">
                                        {v.picture ? (
                                            <img src={v.picture} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#F0EDE6] flex items-center justify-center text-[12px] font-bold text-[#8A8070] shrink-0">
                                                {(v.name || '?')[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-[#3D2008] truncate">{v.name || '방문자'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span
                                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                    style={{ background: meta.color + '15', color: meta.color }}
                                                >
                                                    {meta.label}
                                                </span>
                                                <span className="text-[10px] text-[#A89880]">
                                                    {v.visit_count || 1}회
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-[#A89880] shrink-0">
                                            {v.last_visited_at
                                                ? new Date(v.last_visited_at).toLocaleDateString('ko-KR')
                                                : new Date(v.visited_at).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── 초대 섹션 ── */}
            {activeSection === 'invites' && (
                <div className="space-y-4">
                    {/* 초대 통계 요약 */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: '전체', value: inviteStats.total, color: '#3498db' },
                            { label: '수락', value: inviteStats.accepted, color: '#2ecc71' },
                            { label: '대기', value: inviteStats.pending, color: '#f39c12' },
                            { label: '만료', value: inviteStats.expired, color: '#e74c3c' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-lg border border-[#E8E3D8] p-3 text-center">
                                <p className="text-[18px] font-bold" style={{ color: s.color }}>{s.value}</p>
                                <p className="text-[11px] text-[#8A8070]">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* 초대 목록 */}
                    <div className="bg-white rounded-xl border border-[#E8E3D8] overflow-hidden">
                        {invites.length === 0 ? (
                            <p className="text-[13px] text-[#8A8070] text-center py-10">아직 보낸 초대가 없습니다</p>
                        ) : (
                            <div className="divide-y divide-[#F5F2EC]">
                                {invites.map(inv => {
                                    const isExpired = inv.is_expired;
                                    const statusLabel = inv.status === 'accepted' ? '수락됨'
                                        : isExpired ? '만료됨'
                                        : '대기 중';
                                    const statusColor = inv.status === 'accepted' ? '#2ecc71'
                                        : isExpired ? '#e74c3c'
                                        : '#f39c12';

                                    return (
                                        <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-medium text-[#3D2008] truncate">
                                                    {inv.email || '(링크 공유)'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span
                                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                        style={{ background: statusColor + '20', color: statusColor }}
                                                    >
                                                        {statusLabel}
                                                    </span>
                                                    {inv.short_code && (
                                                        <span className="text-[10px] font-mono text-[#8A8070] bg-[#F5F2EC] px-1.5 py-0.5 rounded">
                                                            {inv.short_code}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-[#A89880]">
                                                        {new Date(inv.created_at).toLocaleDateString('ko-KR')}
                                                    </span>
                                                </div>
                                            </div>
                                            {inv.short_code && (
                                                <button
                                                    onClick={() => {
                                                        const url = `https://orgcell.com/invite?code=${inv.short_code}`;
                                                        navigator.clipboard.writeText(url).catch(() => {});
                                                    }}
                                                    className="text-[11px] text-[#3478F6] font-bold shrink-0"
                                                >
                                                    복사
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
