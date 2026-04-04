/**
 * DemoMuseumPage.jsx — 이한봉 가족유산박물관 체험 페이지
 *
 * 비로그인 사용자가 실제 박물관 구조를 체험할 수 있는 데모 페이지
 * - 실제 FamilyTreeCanvas (드래그/줌/웜홀 작동)
 * - 샘플 데이터 21명 (이한봉 가족)
 * - 달력/전시관 탭 (샘플 데이터)
 * - 편집 기능 숨김, 열람 전용
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    TreePine, CalendarDays, Image, Network,
    ChevronRight, Star, Camera, MapPin, X,
} from 'lucide-react';
import FamilyTreeCanvas from '../../components/museum/FamilyTreeCanvas';
import { buildTree } from '../../utils/buildTree';

// ════════════════════════════════════════
// 실제 데이터: 이한봉 가족 (DB site_id=2 기반)
// ════════════════════════════════════════
const DEMO_PERSONS = [
    // 조부모 (부계: 이순호+임윤님)
    { id: '33', name: '이순호', gender: 'M', generation: 2 },
    { id: '34', name: '임윤님', gender: 'F', generation: 2 },
    // 조부모 (모계: 공석환+민임분)
    { id: '37', name: '공석환', gender: 'M', generation: 2 },
    { id: '38', name: '민임분', gender: 'F', generation: 2 },
    // 부모세대
    { id: '16', name: '이한봉', gender: 'M', generation: 1 },
    { id: '17', name: '공우영', gender: 'F', generation: 1 },
    { id: '35', name: '이은미', gender: 'F', generation: 1 },
    { id: '36', name: '이선미', gender: 'F', generation: 1 },
    { id: '24', name: '공인영', gender: 'M', generation: 1 },
    { id: '25', name: '공진영', gender: 'M', generation: 1 },
    { id: '26', name: '공수자', gender: 'F', generation: 1, privacy_level: 'private', is_refused: true, privacy_variant: 'surname_only' },
    { id: '27', name: '공정영', gender: 'F', generation: 1, privacy_level: 'private', is_refused: true, privacy_variant: 'anonymous', relation_label: '공우영의 동생' },
    // 자녀세대
    { id: '18', name: '이슬기', gender: 'F', is_deceased: true, generation: 0 },
    { id: '19', name: '이상훈', gender: 'M', generation: 0 },
    { id: '22', name: '신세라', gender: 'F', generation: 0 },
    { id: '20', name: '이하영', gender: 'F', generation: 0 },
    { id: '23', name: 'John Lambert', gender: 'M', generation: 0 },
    { id: '21', name: '이유경', gender: 'F', generation: 0 },
    { id: '28', name: '이지섭', gender: 'M', generation: 0 },
    { id: '29', name: '이은섭', gender: 'M', generation: 0 },
    // 이은미 남편
    { id: '40', name: '배상기', gender: 'M', generation: 1 },
    // 이선미 남편
    { id: '41', name: '정홍교', gender: 'M', generation: 1 },
    // 배상기+이은미 자녀
    { id: '42', name: '배정일', gender: 'M', generation: 0 },
    { id: '43', name: '배창일', gender: 'M', generation: 0 },
    // 정홍교+이선미 자녀
    { id: '44', name: '정애현', gender: 'F', generation: 0 },
    { id: '45', name: '정의건', gender: 'M', generation: 0 },
    { id: '46', name: '정의준', gender: 'M', generation: 0 },
    // 손자
    { id: '32', name: 'Daniel Lee Lambert', gender: 'M', generation: -1 },
];

const DEMO_RELATIONS = [
    // ── 부계 조부모 부부 ──
    { person1_id: '33', person2_id: '34', relation_type: 'spouse' },
    // 이순호+임윤님 → 이한봉, 이은미, 이선미
    { person1_id: '33', person2_id: '16', relation_type: 'parent' },
    { person1_id: '34', person2_id: '16', relation_type: 'parent' },
    { person1_id: '33', person2_id: '35', relation_type: 'parent' },
    { person1_id: '34', person2_id: '35', relation_type: 'parent' },
    { person1_id: '33', person2_id: '36', relation_type: 'parent' },
    { person1_id: '34', person2_id: '36', relation_type: 'parent' },
    // ── 모계 조부모 부부 ──
    { person1_id: '37', person2_id: '38', relation_type: 'spouse' },
    // 공석환+민임분 → 공우영, 공인영, 공진영, 공수자, 공정영
    { person1_id: '37', person2_id: '17', relation_type: 'parent' },
    { person1_id: '38', person2_id: '17', relation_type: 'parent' },
    { person1_id: '37', person2_id: '24', relation_type: 'parent' },
    { person1_id: '38', person2_id: '24', relation_type: 'parent' },
    { person1_id: '37', person2_id: '25', relation_type: 'parent' },
    { person1_id: '38', person2_id: '25', relation_type: 'parent' },
    { person1_id: '37', person2_id: '26', relation_type: 'parent' },
    { person1_id: '38', person2_id: '26', relation_type: 'parent' },
    { person1_id: '37', person2_id: '27', relation_type: 'parent' },
    { person1_id: '38', person2_id: '27', relation_type: 'parent' },
    // ── 이한봉+공우영 부부 ──
    { person1_id: '16', person2_id: '17', relation_type: 'spouse' },
    // 이한봉+공우영 → 자녀: 이슬기, 이상훈, 이하영, 이유경
    { person1_id: '16', person2_id: '18', relation_type: 'parent' },
    { person1_id: '17', person2_id: '18', relation_type: 'parent' },
    { person1_id: '16', person2_id: '19', relation_type: 'parent' },
    { person1_id: '17', person2_id: '19', relation_type: 'parent' },
    { person1_id: '16', person2_id: '20', relation_type: 'parent' },
    { person1_id: '17', person2_id: '20', relation_type: 'parent' },
    { person1_id: '16', person2_id: '21', relation_type: 'parent' },
    { person1_id: '17', person2_id: '21', relation_type: 'parent' },
    // ── 이상훈+신세라 부부 ──
    { person1_id: '19', person2_id: '22', relation_type: 'spouse' },
    // 이상훈+신세라 → 이지섭, 이은섭
    { person1_id: '19', person2_id: '28', relation_type: 'parent' },
    { person1_id: '22', person2_id: '28', relation_type: 'parent' },
    { person1_id: '19', person2_id: '29', relation_type: 'parent' },
    { person1_id: '22', person2_id: '29', relation_type: 'parent' },
    // ── 이하영+John Lambert 부부 ──
    { person1_id: '20', person2_id: '23', relation_type: 'spouse' },
    // 이하영+John Lambert → Daniel Lee Lambert
    { person1_id: '23', person2_id: '32', relation_type: 'parent' },
    { person1_id: '20', person2_id: '32', relation_type: 'parent' },
    // ── 배상기+이은미 부부 ──
    { person1_id: '35', person2_id: '40', relation_type: 'spouse' },
    // 배상기+이은미 → 배정일, 배창일
    { person1_id: '35', person2_id: '42', relation_type: 'parent' },
    { person1_id: '40', person2_id: '42', relation_type: 'parent' },
    { person1_id: '35', person2_id: '43', relation_type: 'parent' },
    { person1_id: '40', person2_id: '43', relation_type: 'parent' },
    // ── 정홍교+이선미 부부 ──
    { person1_id: '36', person2_id: '41', relation_type: 'spouse' },
    // 정홍교+이선미 → 정애현, 정의건, 정의준
    { person1_id: '36', person2_id: '44', relation_type: 'parent' },
    { person1_id: '41', person2_id: '44', relation_type: 'parent' },
    { person1_id: '36', person2_id: '45', relation_type: 'parent' },
    { person1_id: '41', person2_id: '45', relation_type: 'parent' },
    { person1_id: '36', person2_id: '46', relation_type: 'parent' },
    { person1_id: '41', person2_id: '46', relation_type: 'parent' },
];

// ── 샘플 행사 데이터 ──
const DEMO_EVENTS = [
    { id: 1, title: '이슬기 추모일', date: '2026-04-15', type: 'memorial', person: '이슬기' },
    { id: 2, title: '이한봉·공우영 결혼기념일', date: '2026-06-10', type: 'anniversary', person: '이한봉 & 공우영' },
    { id: 3, title: 'Daniel 생일', date: '2026-08-12', type: 'birthday', person: 'Daniel Lee Lambert' },
    { id: 4, title: '이지섭 생일', date: '2026-05-20', type: 'birthday', person: '이지섭' },
    { id: 5, title: '가족 여름 모임', date: '2026-07-25', type: 'event', person: '전체 가족' },
    { id: 6, title: '이은섭 졸업식', date: '2026-03-02', type: 'event', person: '이은섭' },
];

// ── 샘플 전시 데이터 ──
const DEMO_EXHIBITIONS = [
    { id: 1, title: '2025 추석 가족 모임', desc: '온 가족이 모인 추석 명절', count: 24, cover: '🏠' },
    { id: 2, title: '이슬기 추모 앨범', desc: '슬기의 아름다운 기억들', count: 18, cover: '🕊️' },
    { id: 3, title: '이한봉·공우영 결혼식', desc: '두 가족이 하나가 된 날', count: 42, cover: '💍' },
    { id: 4, title: '2024 가족 여행', desc: '함께한 행복한 시간', count: 38, cover: '✈️' },
];

// ── 탭 정의 ──
const TABS = [
    { key: 'tree', label: '가족트리', icon: Network },
    { key: 'calendar', label: '행사', icon: CalendarDays },
    { key: 'gallery', label: '전시관', icon: Image },
];

// ── 이벤트 타입 색상 ──
const EVENT_COLORS = {
    birthday: { bg: '#fef3c7', color: '#92400e', icon: '🎂' },
    anniversary: { bg: '#fce7f3', color: '#9d174d', icon: '💐' },
    memorial: { bg: '#e0e7ff', color: '#3730a3', icon: '🕯️' },
    event: { bg: '#dcfce7', color: '#166534', icon: '🎉' },
};

// ── CTA 모달 (비로그인 제한) ──
function DemoCtaModal({ onClose, onNavigate }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative">
                <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
                    <X size={18} />
                </button>
                <div className="text-4xl mb-4">🏛️</div>
                <h3 className="text-lg font-bold text-[#3D2008] mb-2">
                    내 박물관을 만들면<br />직접 편집할 수 있어요
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    가족 사진, 행사, 가계도를<br />나만의 공간에서 관리하세요
                </p>
                <button
                    onClick={() => onNavigate('/onboarding/name')}
                    className="w-full py-3 rounded-xl font-bold text-white text-[15px] active:scale-[0.98] transition-all"
                    style={{ background: 'linear-gradient(135deg, #C4A84F, #A88E3A)', boxShadow: '0 4px 12px rgba(196,168,79,0.3)' }}
                >
                    박물관 만들기
                </button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════
// 메인 컴포넌트
// ════════════════════════════════════════
export default function DemoMuseumPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tree');
    const [showCtaModal, setShowCtaModal] = useState(false);
    const [mainPersonId, setMainPersonId] = useState(null);

    // buildTree로 실제 트리 데이터 생성
    const treeData = useMemo(() => {
        return buildTree(DEMO_PERSONS, DEMO_RELATIONS, mainPersonId || '16');
    }, [mainPersonId]);

    const handleCardClick = () => {
        setShowCtaModal(true);
    };

    const handleAction = (personId, actionKey) => {
        if (actionKey === 'wormhole') {
            setMainPersonId(String(personId));
        } else {
            setShowCtaModal(true);
        }
    };

    return (
        <div className="min-h-screen font-sans flex flex-col" style={{ background: '#FAFAF7' }}>
            <Helmet>
                <title>이한봉 가족유산박물관 — Orgcell 체험</title>
                <meta name="description" content="Orgcell 가족유산박물관 데모. 실제 가계도를 둘러보세요." />
            </Helmet>

            {/* ── 상단 고정 배너 ── */}
            <div
                className="sticky top-0 z-50 w-full py-2.5 px-4"
                style={{ background: 'rgba(42, 26, 8, 0.92)', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <TreePine size={16} className="text-[#C4A84F] shrink-0" />
                        <span className="text-[13px] font-semibold text-[#e8e0d0] truncate">
                            이한봉 가족유산박물관 체험 중
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/onboarding/name')}
                        className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all hover:brightness-110 active:scale-95"
                        style={{ background: '#C4A84F', color: '#2a1a08' }}
                    >
                        내 박물관 만들기
                    </button>
                </div>
            </div>

            {/* ── 하단 탭 메뉴 ── */}
            <div className="sticky top-[41px] z-40 bg-white border-b" style={{ borderColor: '#e8e0d0' }}>
                <div className="max-w-5xl mx-auto flex">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold transition-colors relative"
                            style={{
                                color: activeTab === key ? '#C4A84F' : '#7a6e5e',
                                background: activeTab === key ? '#fffdf5' : 'transparent',
                            }}
                        >
                            <Icon size={15} />
                            {label}
                            {activeTab === key && (
                                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: '#C4A84F' }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 탭 콘텐츠 ── */}
            <div className="flex-1">
                {/* 가족트리 탭 */}
                {activeTab === 'tree' && (
                    <div className="w-full relative" style={{ height: 'calc(100vh - 130px)', minHeight: '500px' }}>
                        {mainPersonId && (
                            <button
                                onClick={() => setMainPersonId(null)}
                                className="absolute top-4 left-4 z-10 px-4 py-2 bg-white/90 rounded-xl shadow-lg border text-sm font-bold text-gray-700 hover:bg-white transition-colors"
                                style={{ borderColor: '#e8e0d0' }}
                            >
                                원래 가문으로 돌아가기
                            </button>
                        )}
                        <FamilyTreeCanvas
                            nodes={treeData.nodes}
                            links={treeData.links}
                            mainId={treeData.mainId}
                            onCardClick={handleCardClick}
                            onWormhole={(personId) => setMainPersonId(String(personId))}
                            onAction={handleAction}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                )}

                {/* 행사 탭 */}
                {activeTab === 'calendar' && (
                    <div className="max-w-2xl mx-auto px-4 py-6">
                        <h2 className="text-lg font-bold text-[#3D2008] mb-4 flex items-center gap-2">
                            <CalendarDays size={20} className="text-[#C4A84F]" />
                            가족 행사
                        </h2>
                        <div className="space-y-3">
                            {DEMO_EVENTS.map(ev => {
                                const style = EVENT_COLORS[ev.type] || EVENT_COLORS.event;
                                return (
                                    <button
                                        key={ev.id}
                                        onClick={() => setShowCtaModal(true)}
                                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border transition-all hover:shadow-md text-left"
                                        style={{ borderColor: '#e8e0d0' }}
                                    >
                                        <div className="text-2xl">{style.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-[14px] text-[#3D2008]">{ev.title}</div>
                                            <div className="text-[12px] text-[#7a6e5e] mt-0.5">{ev.date} · {ev.person}</div>
                                        </div>
                                        <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: style.bg, color: style.color }}>
                                            {ev.type === 'birthday' ? '생일' : ev.type === 'anniversary' ? '기념일' : ev.type === 'memorial' ? '추모' : '행사'}
                                        </span>
                                        <ChevronRight size={16} className="text-gray-300" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 전시관 탭 */}
                {activeTab === 'gallery' && (
                    <div className="max-w-2xl mx-auto px-4 py-6">
                        <h2 className="text-lg font-bold text-[#3D2008] mb-4 flex items-center gap-2">
                            <Image size={20} className="text-[#C4A84F]" />
                            전시관
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {DEMO_EXHIBITIONS.map(exh => (
                                <button
                                    key={exh.id}
                                    onClick={() => setShowCtaModal(true)}
                                    className="rounded-xl bg-white border overflow-hidden transition-all hover:shadow-md text-left"
                                    style={{ borderColor: '#e8e0d0' }}
                                >
                                    <div className="h-28 flex items-center justify-center text-5xl" style={{ background: '#f5f0e4' }}>
                                        {exh.cover}
                                    </div>
                                    <div className="p-3">
                                        <div className="font-bold text-[13px] text-[#3D2008] truncate">{exh.title}</div>
                                        <div className="text-[11px] text-[#7a6e5e] mt-1 truncate">{exh.desc}</div>
                                        <div className="flex items-center gap-1 mt-2">
                                            <Camera size={11} className="text-[#C4A84F]" />
                                            <span className="text-[10px] font-semibold text-[#7a6e5e]">{exh.count}장</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── CTA 모달 ── */}
            {showCtaModal && (
                <DemoCtaModal
                    onClose={() => setShowCtaModal(false)}
                    onNavigate={(path) => navigate(path)}
                />
            )}
        </div>
    );
}
