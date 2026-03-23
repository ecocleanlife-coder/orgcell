import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Shield, Link2, Users, Eye } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';

const RELATION_LABELS = {
    direct: { ko: '직계', en: 'Direct', icon: '👨‍👩‍👧‍👦' },
    collateral: { ko: '방계', en: 'Collateral', icon: '🌿' },
    spouse: { ko: '배우자', en: 'Spouse', icon: '💑' },
};

const SCOPE_LABELS = {
    profile: '프로필',
    'photos.public': '공개 사진',
    'photos.family': '가족 사진',
    exhibitions: '전시회',
};

export default function WormholePortal({ federation, onClose }) {
    const navigate = useNavigate();
    const token = useAuthStore((s) => s.token);
    const [resolvedData, setResolvedData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!federation) return;
        resolveTarget();
    }, [federation]);

    const resolveTarget = async () => {
        if (!federation?.id || !federation?.target_node_id) {
            setResolvedData(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // 1. 페더레이션 JWT 발급
            const tokenRes = await axios.post('/api/federation/token',
                { federationId: federation.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const fedJWT = tokenRes.data?.data?.token;
            if (!fedJWT) throw new Error('토큰 발급 실패');

            // 2. 웜홀 resolve
            const resolveRes = await axios.get(
                `/api/federation/resolve/${federation.id}/${federation.target_node_id}`,
                { headers: { 'X-Federation-Token': fedJWT } }
            );
            setResolvedData(resolveRes.data?.data || null);
        } catch (err) {
            console.error('Wormhole resolve error:', err);
            setError(err.response?.data?.message || '웜홀 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    if (!federation) return null;

    const rel = RELATION_LABELS[federation.relation_type] || RELATION_LABELS.collateral;
    const scopes = federation.agreed_scope || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <button onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Link2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">웜홀 포털</h3>
                            <p className="text-sm text-white/70">연결된 가족 박물관</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                            {federation.source_domain}
                        </span>
                        <span className="text-white/50">→</span>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                            {federation.target_domain}
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* 관계 정보 */}
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                            <div className="font-bold text-indigo-700 dark:text-indigo-300">{rel.ko} 관계</div>
                            <div className="text-xs text-indigo-500">
                                상태: <span className={`font-bold ${federation.status === 'accepted' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {federation.status === 'accepted' ? '승인됨' : federation.status === 'pending' ? '대기중' : '거절됨'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 권한 범위 */}
                    <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Shield size={14} /> 합의된 접근 범위
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {scopes.map((scope) => (
                                <span key={scope}
                                    className="px-2 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                                    {SCOPE_LABELS[scope] || scope}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 조회 결과 */}
                    {loading && (
                        <div className="flex items-center justify-center py-6">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {resolvedData?.person && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                {resolvedData.person.photo_url ? (
                                    <img src={resolvedData.person.photo_url} alt=""
                                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-300" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center border-2 border-amber-300">
                                        <Users size={24} className="text-amber-700 dark:text-amber-300" />
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold text-lg dark:text-white">{resolvedData.person.name}</div>
                                    {resolvedData.person.birth_date && (
                                        <div className="text-sm text-gray-500">{resolvedData.person.birth_date}</div>
                                    )}
                                </div>
                            </div>

                            {/* 공개 사진 요약 */}
                            {resolvedData.person.publicPhotos?.length > 0 && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Eye size={14} /> 공개 사진 {resolvedData.person.publicPhotos.length}장
                                </div>
                            )}

                            {/* 전시회 목록 */}
                            {resolvedData.person.exhibitions?.length > 0 && (
                                <div>
                                    <div className="text-xs font-bold text-gray-500 mb-1">전시회</div>
                                    {resolvedData.person.exhibitions.slice(0, 3).map((ex) => (
                                        <div key={ex.id} className="text-sm text-gray-600 dark:text-gray-400">
                                            · {ex.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-2">
                    <button onClick={onClose}
                        className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">
                        닫기
                    </button>
                    {federation.status === 'accepted' && (
                        <button
                            onClick={() => navigate(`/${federation.target_domain}`)}
                            className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                            <ExternalLink size={16} /> 박물관 방문
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
