import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';
import useOnboardingStore from '../../store/onboardingStore';

const RELATIONS = [
    { id: 'me', label: '나', icon: '👤' },
    { id: 'father', label: '아버지', icon: '👨' },
    { id: 'mother', label: '어머니', icon: '👩' },
    { id: 'spouse', label: '배우자', icon: '💑' },
    { id: 'child1', label: '자녀1', icon: '👧' },
    { id: 'child2', label: '자녀2', icon: '👦' },
    { id: 'child3', label: '자녀3', icon: '🧒' },
    { id: 'sibling', label: '형제/자매', icon: '👫' },
];

/* 스캔 로딩 애니메이션 */
function ScanAnimation({ progress }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center">
            {/* 원형 스캔 애니메이션 */}
            <div className="relative w-32 h-32 mb-8">
                {/* 외곽 회전 링 */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        border: '3px solid transparent',
                        borderTopColor: '#5A9460',
                        borderRightColor: '#5A9460',
                        animation: 'spin 1.2s linear infinite',
                    }}
                />
                {/* 내부 스캔 아이콘 */}
                <div className="absolute inset-3 rounded-full bg-[#F0EDE6] flex items-center justify-center">
                    <div className="text-center">
                        <span className="text-4xl block">🔍</span>
                        <span className="text-xs font-bold text-[#5A9460] mt-1 block">{progress}%</span>
                    </div>
                </div>
                {/* 작은 얼굴 아이콘들 (주변 회전) */}
                {['👤', '👩', '👨'].map((face, i) => {
                    const angle = (i * 120 + progress * 3.6) * (Math.PI / 180);
                    const x = Math.cos(angle) * 56 + 56;
                    const y = Math.sin(angle) * 56 + 56;
                    return (
                        <span
                            key={i}
                            className="absolute text-lg transition-all duration-300"
                            style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                        >
                            {face}
                        </span>
                    );
                })}
            </div>
            <p className="text-lg font-bold text-[#3D2008] mb-2">사진에서 얼굴을 찾는 중...</p>
            <div className="w-48 bg-[#E8E3D8] rounded-full h-2 mb-2">
                <div
                    className="h-2 rounded-full bg-[#5A9460] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <p className="text-xs text-[#A09882]">AI가 가족 얼굴을 분석하고 있습니다</p>
        </div>
    );
}

/* 바텀시트 */
function RelationBottomSheet({ open, clusterId, clusters, onSelect, onClose }) {
    if (!open) return null;
    return (
        <>
            {/* 배경 오버레이 */}
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
            {/* 바텀시트 */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl px-5 pb-8 pt-4 max-w-md mx-auto"
                 style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="w-10 h-1 bg-[#E8E3D8] rounded-full mx-auto mb-4" />
                <p className="text-sm font-bold text-[#3D2008] mb-4 text-center">
                    이 인물의 관계를 선택하세요
                </p>
                <div className="grid grid-cols-4 gap-3">
                    {RELATIONS.map((rel) => {
                        const isUsed = clusters.some(c => c.assignedRelation === rel.id && c.id !== clusterId);
                        const isSelected = clusters.find(c => c.id === clusterId)?.assignedRelation === rel.id;
                        return (
                            <button
                                key={rel.id}
                                onClick={() => onSelect(rel)}
                                disabled={isUsed}
                                className={`p-3 rounded-2xl text-center transition-all active:scale-95 ${
                                    isSelected ? 'bg-[#D4F5D8]'
                                    : isUsed ? 'bg-[#F5F0E8] opacity-40 cursor-not-allowed'
                                    : 'bg-white hover:bg-[#F5F0E8]'
                                }`}
                                style={{ border: isSelected ? '2px solid #5A9460' : '0.5px solid #E8E3D8' }}
                            >
                                <span className="text-2xl block mb-1">{rel.icon}</span>
                                <span className="text-[11px] text-[#3D2008] font-medium">{rel.label}</span>
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={onClose}
                    className="w-full mt-4 py-3 rounded-xl text-sm text-[#7A6E5E]"
                >
                    닫기
                </button>
            </div>
        </>
    );
}

export default function FamilyTagPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';

    const { setCurrentStep, completeStep: completeOnboardingStep } = useOnboardingStore();
    useEffect(() => { setCurrentStep('family'); }, []);

    const [phase, setPhase] = useState('scanning');
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [scanProgress, setScanProgress] = useState(0);

    const [classifiedFolders, setClassifiedFolders] = useState([]);
    const [unclassifiedPhotos, setUnclassifiedPhotos] = useState([]);

    const [selectedPhotos, setSelectedPhotos] = useState(new Set());
    const [manualTarget, setManualTarget] = useState(null);

    // 스캔 시뮬레이션
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('orgcell_face_descriptors') || '{}');
        const hasMyFace = stored.current && stored.current.length > 0;

        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setScanProgress(Math.min(progress, 100));
            if (progress >= 100) {
                clearInterval(interval);
                const demoClusters = [
                    { id: 1, faceCount: 45, assignedRelation: hasMyFace ? 'me' : null },
                    { id: 2, faceCount: 32, assignedRelation: null },
                    { id: 3, faceCount: 28, assignedRelation: null },
                    { id: 4, faceCount: 15, assignedRelation: null },
                    { id: 5, faceCount: 8, assignedRelation: null },
                ];
                setClusters(demoClusters);
                setPhase('tagging');
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const assignRelation = (relation) => {
        if (selectedCluster === null) return;
        setClusters(prev =>
            prev.map(c =>
                c.id === selectedCluster
                    ? { ...c, assignedRelation: relation.id }
                    : c.assignedRelation === relation.id
                        ? { ...c, assignedRelation: null }
                        : c
            )
        );
        setSelectedCluster(null);
    };

    const getRelationLabel = (relationId) => {
        const r = RELATIONS.find(r => r.id === relationId);
        return r ? `${r.icon} ${r.label}` : null;
    };

    const assignedCount = clusters.filter(c => c.assignedRelation).length;

    const handleTagComplete = () => {
        const folders = clusters
            .filter(c => c.assignedRelation)
            .map(c => {
                const rel = RELATIONS.find(r => r.id === c.assignedRelation);
                return {
                    id: c.id,
                    relation: c.assignedRelation,
                    label: rel?.label || c.assignedRelation,
                    icon: rel?.icon || '👤',
                    name: rel?.label || `인물 ${c.id}`,
                    photoCount: c.faceCount,
                };
            });

        const totalTagged = folders.reduce((sum, f) => sum + f.photoCount, 0);
        const unclassifiedCount = Math.max(0, 234 - totalTagged + 100);
        const unclassified = Array.from({ length: unclassifiedCount }, (_, i) => ({
            id: `photo_${i + 1}`,
            thumbnail: null,
            idx: i + 1,
        }));

        setClassifiedFolders(folders);
        setUnclassifiedPhotos(unclassified);
        setPhase('classified');
    };

    const togglePhotoSelect = (photoId) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) next.delete(photoId);
            else next.add(photoId);
            return next;
        });
    };

    const selectAll = () => setSelectedPhotos(new Set(unclassifiedPhotos.map(p => p.id)));
    const deselectAll = () => setSelectedPhotos(new Set());

    const moveToFolder = (folderId) => {
        if (selectedPhotos.size === 0) return;
        const movedIds = selectedPhotos;

        setClassifiedFolders(prev =>
            prev.map(f =>
                f.id === folderId
                    ? { ...f, photoCount: f.photoCount + movedIds.size }
                    : f
            )
        );
        setUnclassifiedPhotos(prev => prev.filter(p => !movedIds.has(p.id)));
        setSelectedPhotos(new Set());
        setManualTarget(null);
        setPhase('classified');
    };

    const handleComplete = async () => {
        setPhase('creating');

        const familyMembers = classifiedFolders.map(f => ({
            relation: f.relation,
            label: f.label,
            faceCount: f.photoCount,
        }));

        localStorage.setItem('orgcell_family_setup', JSON.stringify({
            members: familyMembers,
            storage,
            createdAt: Date.now(),
        }));

        try {
            const token = localStorage.getItem('orgcell_token');
            if (token) {
                for (const member of familyMembers) {
                    await axios.post('/api/face/register', {
                        label: member.label,
                        descriptor: new Array(128).fill(0),
                        is_reference: true,
                    }).catch(() => null);
                }
            }
        } catch {
            // 무시
        }

        setTimeout(() => setPhase('done'), 1500);
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FFFBF0' }}>
            {/* CSS 애니메이션 */}
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>

            <OnboardingProgress current="family" />
            <div className="relative text-center pt-4 pb-3 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-[#A09882] text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-xl font-bold text-[#3D2008] mb-1">
                    {phase === 'manual' ? '수동 분류' : '가족 태그'}
                </h1>
                <p className="text-sm text-[#7A6E5E]">
                    {phase === 'manual'
                        ? '사진을 선택하고 폴더를 지정하세요'
                        : 'AI가 감지한 얼굴에 관계를 지정하세요'}
                </p>
            </div>

            <div className="flex-1 flex flex-col px-5 max-w-md mx-auto w-full overflow-y-auto">
                {/* ====== SCANNING ====== */}
                {phase === 'scanning' && (
                    <ScanAnimation progress={scanProgress} />
                )}

                {/* ====== TAGGING — 원형 클러스터 카드 ====== */}
                {phase === 'tagging' && (
                    <div className="w-full">
                        <div className="flex flex-wrap justify-center gap-5 mb-6">
                            {clusters.map((cluster) => (
                                <button
                                    key={cluster.id}
                                    onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
                                    className="flex flex-col items-center transition-all"
                                >
                                    <div
                                        className={`w-[72px] h-[72px] rounded-full flex items-center justify-center text-2xl transition-all ${
                                            selectedCluster === cluster.id ? 'scale-110' : ''
                                        }`}
                                        style={{
                                            border: selectedCluster === cluster.id
                                                ? '3px solid #5A9460'
                                                : cluster.assignedRelation
                                                ? '2px solid #5A9460'
                                                : '2px solid #E8E3D8',
                                            background: cluster.assignedRelation ? '#D4F5D8' : '#F5F0E8',
                                            boxShadow: selectedCluster === cluster.id
                                                ? '0 4px 16px rgba(90,148,96,0.3)' : 'none',
                                        }}
                                    >
                                        {cluster.assignedRelation
                                            ? RELATIONS.find(r => r.id === cluster.assignedRelation)?.icon || '👤'
                                            : '❓'}
                                    </div>
                                    <span className="text-xs text-[#3D2008] mt-1.5 font-medium">
                                        {cluster.assignedRelation ? getRelationLabel(cluster.assignedRelation) : `인물 ${cluster.id}`}
                                    </span>
                                    <span className="text-[10px] text-[#A09882]">{cluster.faceCount}장</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleTagComplete}
                            disabled={assignedCount === 0}
                            className={`w-full rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${
                                assignedCount === 0 ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            style={{
                                height: 56,
                                background: assignedCount > 0
                                    ? 'linear-gradient(135deg, #5A9460, #4A8450)'
                                    : '#ccc',
                            }}
                        >
                            분류 결과 보기 ({assignedCount}명)
                        </button>
                    </div>
                )}

                {/* 바텀시트 */}
                <RelationBottomSheet
                    open={selectedCluster !== null && phase === 'tagging'}
                    clusterId={selectedCluster}
                    clusters={clusters}
                    onSelect={assignRelation}
                    onClose={() => setSelectedCluster(null)}
                />

                {/* ====== CLASSIFIED RESULTS ====== */}
                {phase === 'classified' && (
                    <div className="w-full">
                        <div className="bg-amber-50 rounded-2xl p-4 mb-4" style={{ border: '0.5px solid #E8D5A0' }}>
                            <p className="text-sm font-bold text-amber-800 mb-1">
                                ⚠️ AI는 실수할 수 있어요
                            </p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                자동 분류 결과를 확인하고 잘못된 사진은 직접 수정해주세요.
                            </p>
                        </div>

                        <div className="space-y-3 mb-4">
                            {classifiedFolders.map((folder) => (
                                <div key={folder.id} className="bg-white rounded-2xl p-4" style={{ border: '0.5px solid #E8E3D8' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#D4F5D8] flex items-center justify-center text-xl">
                                                {folder.icon}
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-[#3D2008]">{folder.name}</span>
                                                <span className="text-xs text-[#A09882] ml-2">{folder.photoCount}장</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-13">
                                        <button className="text-xs text-[#5A9460] font-medium bg-[#F0EDE6] px-3 py-1.5 rounded-lg">
                                            사진 보기
                                        </button>
                                        <button
                                            onClick={() => { setManualTarget(folder.id); setPhase('manual'); }}
                                            className="text-xs text-[#4A7FB5] font-medium bg-blue-50 px-3 py-1.5 rounded-lg"
                                        >
                                            수동 추가
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {unclassifiedPhotos.length > 0 && (
                                <div className="bg-white rounded-2xl p-4" style={{ border: '0.5px solid #E8D5A0' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
                                                📁
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-[#3D2008]">미분류</span>
                                                <span className="text-xs text-amber-600 ml-2">{unclassifiedPhotos.length}장</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setManualTarget(null); setPhase('manual'); }}
                                        className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg ml-13"
                                    >
                                        직접 분류하기
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <button
                                onClick={handleComplete}
                                className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                                style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                            >
                                분류 완료 → 다음 단계
                            </button>
                            {unclassifiedPhotos.length > 0 && (
                                <p className="text-center text-xs text-[#A09882] mt-2">
                                    미분류 {unclassifiedPhotos.length}장은 나중에 분류할 수 있습니다
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ====== MANUAL CLASSIFICATION ====== */}
                {phase === 'manual' && (
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-[#7A6E5E]">
                                {selectedPhotos.size > 0
                                    ? `${selectedPhotos.size}장 선택됨`
                                    : `미분류 ${unclassifiedPhotos.length}장`}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-[#4A7FB5] font-medium px-2 py-1 rounded hover:bg-blue-50">
                                    전체 선택
                                </button>
                                <button onClick={deselectAll} className="text-xs text-[#7A6E5E] font-medium px-2 py-1 rounded hover:bg-[#F5F0E8]">
                                    선택 해제
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 mb-4 max-h-[40vh] overflow-y-auto rounded-xl">
                            {unclassifiedPhotos.slice(0, 48).map((photo) => (
                                <button
                                    key={photo.id}
                                    onClick={() => togglePhotoSelect(photo.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                                        selectedPhotos.has(photo.id)
                                            ? 'ring-2 ring-[#5A9460] scale-95'
                                            : 'hover:opacity-80'
                                    }`}
                                >
                                    <div className="w-full h-full bg-[#F0EDE6] flex items-center justify-center text-xs text-[#A09882]">
                                        {photo.idx}
                                    </div>
                                    {selectedPhotos.has(photo.id) && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-[#5A9460] rounded-full flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold">✓</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {unclassifiedPhotos.length > 48 && (
                            <p className="text-xs text-center text-[#A09882] mb-3">
                                + {unclassifiedPhotos.length - 48}장 더 있음
                            </p>
                        )}

                        {selectedPhotos.size > 0 && (
                            <div className="bg-white rounded-2xl p-3 mb-4" style={{ border: '0.5px solid #E8E3D8' }}>
                                <p className="text-xs text-[#7A6E5E] mb-2 text-center">이동할 폴더를 선택하세요</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {classifiedFolders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            onClick={() => moveToFolder(folder.id)}
                                            className="flex items-center gap-1 text-xs font-medium bg-[#D4F5D8] text-[#5A9460] px-3 py-2 rounded-lg active:scale-95 transition-all"
                                        >
                                            <span>{folder.icon}</span>
                                            <span>{folder.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setPhase('classified'); setSelectedPhotos(new Set()); }}
                            className="w-full py-3 rounded-2xl text-sm text-[#7A6E5E]"
                            style={{ border: '0.5px solid #E8E3D8' }}
                        >
                            ← 분류 결과로 돌아가기
                        </button>
                    </div>
                )}

                {/* ====== CREATING ====== */}
                {phase === 'creating' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 rounded-full"
                                 style={{ border: '3px solid transparent', borderTopColor: '#5A9460', animation: 'spin 1s linear infinite' }} />
                            <div className="absolute inset-2 rounded-full bg-[#F0EDE6] flex items-center justify-center">
                                <span className="text-4xl">🌳</span>
                            </div>
                        </div>
                        <p className="text-lg font-bold text-[#3D2008] mb-2">패밀리트리 생성 중...</p>
                        <p className="text-sm text-[#7A6E5E]">구성원 폴더를 자동으로 만들고 있습니다</p>
                    </div>
                )}

                {/* ====== DONE ====== */}
                {phase === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4">🎉</span>
                        <p className="text-xl font-bold text-[#3D2008] mb-2">분류 완료!</p>
                        <p className="text-sm text-[#7A6E5E] mb-8">
                            {classifiedFolders.length}명의 가족이 등록되었습니다
                        </p>

                        <div className="w-full bg-white rounded-2xl p-5 mb-6 text-left" style={{ border: '0.5px solid #E8E3D8' }}>
                            <p className="text-sm font-medium text-[#7A6E5E] mb-3">생성된 항목:</p>
                            <ul className="space-y-2">
                                {classifiedFolders.map(f => (
                                    <li key={f.id} className="flex items-center gap-3 text-sm text-[#3D2008]">
                                        <div className="w-8 h-8 rounded-full bg-[#D4F5D8] flex items-center justify-center text-base">
                                            {f.icon}
                                        </div>
                                        <span className="font-medium">{f.name}</span>
                                        <span className="text-xs text-[#A09882] ml-auto">{f.photoCount}장</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="w-full bg-[#F0EDE6] rounded-xl p-4 mb-6">
                            <p className="text-xs text-[#5A9460] font-medium mb-1">
                                🔒 사진은 {storage === 'google' ? 'Google Drive' : storage === 'onedrive' ? 'OneDrive' : 'Orgcell 서버'}에만 저장됩니다
                            </p>
                            <p className="text-xs text-[#7A6E5E]">
                                서버에는 경로(URL)만 저장됩니다 (특허 기술)
                            </p>
                        </div>

                        <button
                            onClick={() => { completeOnboardingStep('family'); navigate(`/onboarding/privacy?storage=${storage}`); }}
                            className="w-full rounded-2xl font-bold text-white active:scale-[0.98] transition-all"
                            style={{ height: 56, background: 'linear-gradient(135deg, #5A9460, #4A8450)' }}
                        >
                            다음 단계 →
                        </button>
                    </div>
                )}
            </div>

            {/* Skip footer */}
            {(phase === 'tagging' || phase === 'scanning') && (
                <div className="text-center pb-6">
                    <button onClick={() => { completeOnboardingStep('family'); navigate(`/onboarding/privacy?storage=${storage}`); }}
                            className="text-sm text-[#A09882] py-2">
                        나중에 하기 →
                    </button>
                </div>
            )}
        </div>
    );
}
