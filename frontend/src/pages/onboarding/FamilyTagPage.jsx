import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

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

export default function FamilyTagPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const storage = searchParams.get('storage') || 'google';

    // scanning → tagging → classified → manual → creating → done
    const [phase, setPhase] = useState('scanning');
    const [clusters, setClusters] = useState([]);
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [scanProgress, setScanProgress] = useState(0);

    // 분류 결과 (classified phase)
    const [classifiedFolders, setClassifiedFolders] = useState([]);
    const [unclassifiedPhotos, setUnclassifiedPhotos] = useState([]);

    // 수동 분류 (manual phase)
    const [selectedPhotos, setSelectedPhotos] = useState(new Set());
    const [manualTarget, setManualTarget] = useState(null); // 이동할 폴더

    // === 스캔 시뮬레이션 ===
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

    // === 관계 지정 ===
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

    // === 태그 완료 → 분류 결과 생성 ===
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

        // 미분류 사진 (시뮬레이션)
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

    // === 수동 분류 ===
    const togglePhotoSelect = (photoId) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (next.has(photoId)) {
                next.delete(photoId);
            } else {
                next.add(photoId);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedPhotos(new Set(unclassifiedPhotos.map(p => p.id)));
    };

    const deselectAll = () => {
        setSelectedPhotos(new Set());
    };

    const moveToFolder = (folderId) => {
        if (selectedPhotos.size === 0) return;
        const movedIds = selectedPhotos;

        // 해당 폴더 카운트 증가
        setClassifiedFolders(prev =>
            prev.map(f =>
                f.id === folderId
                    ? { ...f, photoCount: f.photoCount + movedIds.size }
                    : f
            )
        );

        // 미분류에서 제거
        setUnclassifiedPhotos(prev => prev.filter(p => !movedIds.has(p.id)));
        setSelectedPhotos(new Set());
        setManualTarget(null);
        setPhase('classified');
    };

    // === 최종 완료 ===
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

        // 서버에 가족 구성원 등록 (실패해도 진행)
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
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #FAFAF7 0%, #F0EDE6 100%)' }}>
            {/* Header */}
            <OnboardingProgress current="family" />
            <div className="relative text-center pt-4 pb-4 px-4">
                <button onClick={() => navigate(-1)} className="absolute left-4 top-4 text-gray-400 text-2xl">
                    &lsaquo;
                </button>
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {phase === 'manual' ? '수동 분류' : '가족 태그'}
                </h1>
                <p className="text-sm text-gray-500">
                    {phase === 'manual'
                        ? '사진을 선택하고 폴더를 지정하세요'
                        : 'AI가 감지한 얼굴에 관계를 지정하세요'
                    }
                </p>
            </div>

            <div className="flex-1 flex flex-col px-5 max-w-md mx-auto w-full overflow-y-auto">
                {/* ====== SCANNING ====== */}
                {phase === 'scanning' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4 animate-pulse">🔍</span>
                        <p className="text-lg font-bold text-gray-900 mb-2">사진에서 얼굴을 찾는 중...</p>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                            <div className="h-3 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                        </div>
                        <p className="text-sm text-emerald-600 font-semibold">{scanProgress}%</p>
                    </div>
                )}

                {/* ====== TAGGING ====== */}
                {phase === 'tagging' && (
                    <div className="w-full">
                        <div className="flex flex-wrap justify-center gap-4 mb-6">
                            {clusters.map((cluster) => (
                                <button
                                    key={cluster.id}
                                    onClick={() => setSelectedCluster(selectedCluster === cluster.id ? null : cluster.id)}
                                    className={`flex flex-col items-center transition-all ${selectedCluster === cluster.id ? 'scale-110' : ''}`}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-3 transition-all ${
                                        selectedCluster === cluster.id
                                            ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                            : cluster.assignedRelation
                                                ? 'border-emerald-300 bg-emerald-50'
                                                : 'border-gray-300 bg-gray-100'
                                    }`}>
                                        {cluster.assignedRelation
                                            ? RELATIONS.find(r => r.id === cluster.assignedRelation)?.icon || '👤'
                                            : '❓'}
                                    </div>
                                    <span className="text-xs text-gray-600 mt-1">
                                        {cluster.assignedRelation ? getRelationLabel(cluster.assignedRelation) : `인물 ${cluster.id}`}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{cluster.faceCount}장</span>
                                </button>
                            ))}
                        </div>

                        {selectedCluster !== null && (
                            <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                                    인물 {selectedCluster}의 관계를 선택하세요
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {RELATIONS.map((rel) => {
                                        const isUsed = clusters.some(c => c.assignedRelation === rel.id && c.id !== selectedCluster);
                                        const isSelected = clusters.find(c => c.id === selectedCluster)?.assignedRelation === rel.id;
                                        return (
                                            <button
                                                key={rel.id}
                                                onClick={() => assignRelation(rel)}
                                                disabled={isUsed}
                                                className={`p-2 rounded-xl text-center transition-all ${
                                                    isSelected ? 'bg-emerald-100 border-2 border-emerald-500'
                                                    : isUsed ? 'bg-gray-100 opacity-40 cursor-not-allowed'
                                                    : 'bg-gray-50 border border-gray-200 hover:border-emerald-300 active:scale-95'
                                                }`}
                                            >
                                                <span className="text-xl block">{rel.icon}</span>
                                                <span className="text-[10px] text-gray-600">{rel.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleTagComplete}
                            disabled={assignedCount === 0}
                            className={`w-full py-4 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${
                                assignedCount > 0 ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            분류 결과 보기 ({assignedCount}명)
                        </button>
                    </div>
                )}

                {/* ====== CLASSIFIED RESULTS ====== */}
                {phase === 'classified' && (
                    <div className="w-full">
                        {/* AI 경고 메시지 */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-amber-800 mb-1">
                                ⚠️ AI는 실수할 수 있어요
                            </p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                자동 분류 결과를 확인하고 잘못된 사진은 직접 수정해주세요.
                                특히 오래된 사진이나 흐린 사진은 확인이 필요할 수 있어요.
                            </p>
                        </div>

                        {/* 분류된 폴더 목록 */}
                        <div className="space-y-3 mb-4">
                            {classifiedFolders.map((folder) => (
                                <div key={folder.id} className="bg-white rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">{folder.icon}</span>
                                            <div>
                                                <span className="text-sm font-bold text-gray-900">{folder.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">사진 {folder.photoCount}장</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
                                            사진 보기
                                        </button>
                                        <button
                                            onClick={() => {
                                                setManualTarget(folder.id);
                                                setPhase('manual');
                                            }}
                                            className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                                        >
                                            수동 추가
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* 미분류 폴더 */}
                            {unclassifiedPhotos.length > 0 && (
                                <div className="bg-white rounded-xl p-4 border border-amber-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">📁</span>
                                            <div>
                                                <span className="text-sm font-bold text-gray-900">미분류</span>
                                                <span className="text-xs text-amber-600 ml-2">사진 {unclassifiedPhotos.length}장</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setManualTarget(null);
                                            setPhase('manual');
                                        }}
                                        className="text-xs text-amber-700 font-medium bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                                    >
                                        직접 분류하기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 완료 버튼 */}
                        <div className="space-y-3 mt-6">
                            <button
                                onClick={handleComplete}
                                className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                            >
                                🌳 분류 완료 → 박물관으로 이동
                            </button>
                            {unclassifiedPhotos.length > 0 && (
                                <p className="text-center text-xs text-gray-400">
                                    미분류 {unclassifiedPhotos.length}장은 나중에 분류할 수 있습니다
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ====== MANUAL CLASSIFICATION ====== */}
                {phase === 'manual' && (
                    <div className="w-full">
                        {/* 선택 도구 */}
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-600">
                                {selectedPhotos.size > 0
                                    ? `${selectedPhotos.size}장 선택됨`
                                    : `미분류 ${unclassifiedPhotos.length}장`
                                }
                            </p>
                            <div className="flex gap-2">
                                <button onClick={selectAll} className="text-xs text-blue-600 font-medium px-2 py-1 rounded hover:bg-blue-50">
                                    전체 선택
                                </button>
                                <button onClick={deselectAll} className="text-xs text-gray-500 font-medium px-2 py-1 rounded hover:bg-gray-100">
                                    선택 해제
                                </button>
                            </div>
                        </div>

                        {/* 사진 그리드 */}
                        <div className="grid grid-cols-4 gap-1.5 mb-4 max-h-[40vh] overflow-y-auto rounded-xl">
                            {unclassifiedPhotos.slice(0, 48).map((photo) => (
                                <button
                                    key={photo.id}
                                    onClick={() => togglePhotoSelect(photo.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                                        selectedPhotos.has(photo.id)
                                            ? 'ring-2 ring-emerald-500 scale-95'
                                            : 'hover:opacity-80'
                                    }`}
                                >
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                        {photo.idx}
                                    </div>
                                    {selectedPhotos.has(photo.id) && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold">✓</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {unclassifiedPhotos.length > 48 && (
                            <p className="text-xs text-center text-gray-400 mb-3">
                                + {unclassifiedPhotos.length - 48}장 더 있음
                            </p>
                        )}

                        {/* 폴더 선택 버튼 */}
                        {selectedPhotos.size > 0 && (
                            <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
                                <p className="text-xs text-gray-600 mb-2 text-center">이동할 폴더를 선택하세요</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {classifiedFolders.map((folder) => (
                                        <button
                                            key={folder.id}
                                            onClick={() => moveToFolder(folder.id)}
                                            className="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg hover:bg-emerald-100 active:scale-95 transition-all"
                                        >
                                            <span>{folder.icon}</span>
                                            <span>{folder.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 돌아가기 */}
                        <button
                            onClick={() => {
                                setPhase('classified');
                                setSelectedPhotos(new Set());
                            }}
                            className="w-full py-3 rounded-xl text-sm text-gray-500 border border-gray-200"
                        >
                            ← 분류 결과로 돌아가기
                        </button>
                    </div>
                )}

                {/* ====== CREATING ====== */}
                {phase === 'creating' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4 animate-bounce">🌳</span>
                        <p className="text-lg font-bold text-gray-900 mb-2">패밀리트리 생성 중...</p>
                        <p className="text-sm text-gray-500">구성원 폴더를 자동으로 만들고 있습니다</p>
                    </div>
                )}

                {/* ====== DONE ====== */}
                {phase === 'done' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-6xl block mb-4">🎉</span>
                        <p className="text-xl font-bold text-gray-900 mb-2">온보딩 완료!</p>
                        <p className="text-sm text-gray-500 mb-8">
                            {classifiedFolders.length}명의 가족이 등록되었습니다
                        </p>

                        <div className="w-full bg-white rounded-2xl p-5 border border-gray-200 mb-6 text-left">
                            <p className="text-sm font-medium text-gray-700 mb-3">생성된 항목:</p>
                            <ul className="space-y-2">
                                {classifiedFolders.map(f => (
                                    <li key={f.id} className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="text-base">{f.icon}</span>
                                        <span>{f.name}</span>
                                        <span className="text-xs text-gray-400 ml-auto">{f.photoCount}장 자동 분류</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="w-full bg-emerald-50 rounded-xl p-4 mb-6">
                            <p className="text-xs text-emerald-700 font-medium mb-1">
                                🔒 사진은 {storage === 'google' ? 'Google Drive' : storage === 'onedrive' ? 'OneDrive' : 'Orgcell 서버'}에만 저장됩니다
                            </p>
                            <p className="text-xs text-emerald-600">
                                서버에는 경로(URL)만 저장됩니다 (특허 기술)
                            </p>
                        </div>

                        <button
                            onClick={() => navigate(`/onboarding/privacy?storage=${storage}`)}
                            className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all"
                        >
                            🏛️ 가족 박물관 시작하기
                        </button>
                    </div>
                )}
            </div>

            {/* Skip footer */}
            {(phase === 'tagging' || phase === 'scanning') && (
                <div className="text-center pb-6">
                    <button onClick={() => navigate(`/onboarding/privacy?storage=${storage}`)} className="text-sm text-gray-400 py-2">
                        나중에 하기 →
                    </button>
                </div>
            )}
        </div>
    );
}
