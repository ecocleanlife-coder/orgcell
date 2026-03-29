import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Shield, Link2, Users, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 체인 탐색 상태
    const [chainHistory, setChainHistory] = useState([]);
    // 각 항목: { person, federation, outgoingWormholes, effectiveScope }

    useEffect(() => {
        if (!federation) return;
        resolveTarget();
    }, [federation]);

    const resolveTarget = async () => {
        if (!federation?.id || !federation?.target_node_id) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const tokenRes = await axios.post('/api/federation/token',
                { federationId: federation.id }
            );
            const fedJWT = tokenRes.data?.data?.token;
            if (!fedJWT) throw new Error('토큰 발급 실패');

            const resolveRes = await axios.get(
                `/api/federation/resolve/${federation.id}/${federation.target_node_id}`,
                { headers: { 'X-Federation-Token': fedJWT } }
            );
            const data = resolveRes.data?.data;
            setChainHistory([{
                person: data?.person || null,
                federation: data?.federation || {},
                outgoingWormholes: data?.outgoingWormholes || [],
                effectiveScope: data?.federation?.scope || [],
            }]);
        } catch (err) {
            console.error('Wormhole resolve error:', err);
            setError(err.response?.data?.message || '웜홀 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    // 체인 탐색: outgoing wormhole 클릭 시 다음 홉 resolve
    const resolveNextHop = useCallback(async (wormhole) => {
        setLoading(true);
        setError(null);
        try {
            // 첫 홉 JWT 발급 (원래 federation의 토큰)
            const tokenRes = await axios.post('/api/federation/token',
                { federationId: federation.id }
            );
            const firstJWT = tokenRes.data?.data?.token;
            if (!firstJWT) throw new Error('토큰 발급 실패');

            // 체인 구성: 기존 history + 새 홉
            const chain = [
                { federationId: federation.id, nodeId: federation.target_node_id },
                ...chainHistory.slice(1).map(h => ({
                    federationId: h.federation.id,
                    nodeId: h.person?.id,
                })),
                { federationId: wormhole.federationId, nodeId: wormhole.targetNodeId },
            ];

            const resolveRes = await axios.post('/api/federation/chain-resolve',
                { chain },
                { headers: { 'X-Federation-Token': firstJWT } }
            );

            const data = resolveRes.data?.data;
            if (!data?.hops?.length) throw new Error('체인 탐색 결과 없음');

            // 전체 히스토리 재구성
            const newHistory = data.hops.map(hop => ({
                person: hop.person,
                federation: hop.federation,
                outgoingWormholes: hop.outgoingWormholes || [],
                effectiveScope: hop.effectiveScope || [],
            }));
            setChainHistory(newHistory);
        } catch (err) {
            console.error('Chain resolve error:', err);
            setError(err.response?.data?.message || '체인 탐색 실패');
        } finally {
            setLoading(false);
        }
    }, [federation, chainHistory]);

    // breadcrumb에서 이전 홉으로 돌아가기
    const goBackToHop = useCallback((hopIndex) => {
        setChainHistory(prev => prev.slice(0, hopIndex + 1));
    }, []);

    if (!federation) return null;

    const rel = RELATION_LABELS[federation.relation_type] || RELATION_LABELS.collateral;
    const currentHop = chainHistory[chainHistory.length - 1];
    const currentScopes = currentHop?.effectiveScope || federation.agreed_scope || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shrink-0">
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
                            <p className="text-sm text-white/70">
                                {chainHistory.length > 1 ? `체인 탐색 (${chainHistory.length}홉)` : '연결된 가족 박물관'}
                            </p>
                        </div>
                    </div>

                    {/* Breadcrumb — 체인 경로 */}
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                            {federation.source_domain}
                        </span>
                        {chainHistory.map((hop, idx) => (
                            <React.Fragment key={hop.federation.id || idx}>
                                <ChevronRight size={14} className="text-white/40" />
                                <button
                                    onClick={() => idx < chainHistory.length - 1 && goBackToHop(idx)}
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                                        idx === chainHistory.length - 1
                                            ? 'bg-white/30 text-white'
                                            : 'bg-white/10 text-white/60 hover:bg-white/20 cursor-pointer'
                                    }`}
                                >
                                    {hop.federation.targetDomain}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Body — 스크롤 가능 */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* 관계 정보 */}
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                            <div className="font-bold text-indigo-700 dark:text-indigo-300">{rel.ko} 관계</div>
                            <div className="text-xs text-indigo-500">
                                상태: <span className="font-bold text-emerald-600">승인됨</span>
                                {chainHistory.length > 1 && (
                                    <span className="ml-2 text-purple-500">· {chainHistory.length}홉 체인</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 유효 Scope — 체인에서 축소 표시 */}
                    <div>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Shield size={14} />
                            {chainHistory.length > 1 ? '유효 접근 범위 (교집합)' : '합의된 접근 범위'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {currentScopes.map((scope) => (
                                <span key={scope}
                                    className="px-2 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                                    {SCOPE_LABELS[scope] || scope}
                                </span>
                            ))}
                            {currentScopes.length === 0 && (
                                <span className="text-xs text-gray-400">접근 가능한 범위 없음</span>
                            )}
                        </div>
                    </div>

                    {/* 로딩 */}
                    {loading && (
                        <div className="flex items-center justify-center py-6">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    )}

                    {/* 에러 */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* 현재 resolve 결과 */}
                    {currentHop?.person && (
                        <PersonCard person={currentHop.person} />
                    )}

                    {/* 연결된 웜홀 (outgoing) — 체인 탐색 가능 */}
                    {currentHop?.outgoingWormholes?.length > 0 && (
                        <div>
                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <Link2 size={14} /> 연결된 웜홀 ({currentHop.outgoingWormholes.length})
                            </div>
                            <div className="space-y-2">
                                {currentHop.outgoingWormholes.map((wh) => (
                                    <button
                                        key={wh.federationId}
                                        onClick={() => resolveNextHop(wh)}
                                        disabled={loading}
                                        className="w-full text-left p-3 border border-purple-200 dark:border-purple-800 rounded-xl
                                                   hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors
                                                   disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                    {wh.targetDomain}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {(RELATION_LABELS[wh.relationType] || {}).ko || wh.relationType}
                                                    {' · '}
                                                    {wh.scope.map(s => SCOPE_LABELS[s] || s).join(', ')}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-purple-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-2 shrink-0">
                    {chainHistory.length > 1 ? (
                        <button onClick={() => goBackToHop(chainHistory.length - 2)}
                            className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center gap-1">
                            <ArrowLeft size={16} /> 이전 홉
                        </button>
                    ) : (
                        <button onClick={onClose}
                            className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">
                            닫기
                        </button>
                    )}
                    {currentHop?.federation?.targetDomain && (
                        <button
                            onClick={() => navigate(`/${currentHop.federation.targetDomain}`)}
                            className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                            <ExternalLink size={16} /> 박물관 방문
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── 인물 카드 서브 컴포넌트 ──
function PersonCard({ person }) {
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
                {person.photo_url ? (
                    <img src={person.photo_url} alt=""
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-300" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center border-2 border-amber-300">
                        <Users size={24} className="text-amber-700 dark:text-amber-300" />
                    </div>
                )}
                <div>
                    <div className="font-bold text-lg dark:text-white">{person.name}</div>
                    {person.birth_date && (
                        <div className="text-sm text-gray-500">{person.birth_date}</div>
                    )}
                </div>
            </div>

            {person.publicPhotos?.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Eye size={14} /> 공개 사진 {person.publicPhotos.length}장
                </div>
            )}

            {person.exhibitions?.length > 0 && (
                <div>
                    <div className="text-xs font-bold text-gray-500 mb-1">전시회</div>
                    {person.exhibitions.slice(0, 3).map((ex) => (
                        <div key={ex.id} className="text-sm text-gray-600 dark:text-gray-400">
                            · {ex.title}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
