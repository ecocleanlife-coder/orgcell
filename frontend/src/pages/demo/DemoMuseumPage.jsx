/**
 * DemoMuseumPage.jsx — 이한봉 가족 박물관 체험 페이지
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
// 샘플 데이터: 이한봉 가족 21명
// ════════════════════════════════════════
const DEMO_PERSONS = [
    // 조부모 (부계)
    { id: '1', name: '이종수', gender: 'M', birth_date: '1925-03-15', death_date: '1998-11-20', generation: -2 },
    { id: '2', name: '김순이', gender: 'F', birth_date: '1928-07-22', death_date: '2005-04-10', generation: -2 },
    // 조부모 (모계)
    { id: '3', name: '박영호', gender: 'M', birth_date: '1927-01-05', death_date: '2001-08-30', generation: -2 },
    { id: '4', name: '최옥순', gender: 'F', birth_date: '1930-12-18', death_date: '2010-06-15', generation: -2 },
    // 부모
    { id: '5', name: '이광호', gender: 'M', birth_date: '1955-06-10', generation: -1 },
    { id: '6', name: '박미영', gender: 'F', birth_date: '1958-09-25', generation: -1 },
    // 본인 (이한봉) + 배우자
    { id: '7', name: '이한봉', gender: 'M', birth_date: '1982-04-12', generation: 0 },
    { id: '8', name: '김지은', gender: 'F', birth_date: '1985-11-03', generation: 0 },
    // 형제자매
    { id: '9', name: '이선미', gender: 'F', birth_date: '1980-02-14', generation: 0 },
    { id: '10', name: '정홍교', gender: 'M', birth_date: '1979-08-20', generation: 0 },
    { id: '11', name: '이은미', gender: 'F', birth_date: '1984-07-30', generation: 0 },
    { id: '12', name: '배상기', gender: 'M', birth_date: '1983-03-17', generation: 0 },
    { id: '13', name: '이동수', gender: 'M', birth_date: '1987-12-05', generation: 0 },
    // 자녀
    { id: '14', name: '이서준', gender: 'M', birth_date: '2010-05-20', generation: 1 },
    { id: '15', name: '이서윤', gender: 'F', birth_date: '2012-09-15', generation: 1 },
    // 선미+홍교 자녀
    { id: '16', name: '정민서', gender: 'F', birth_date: '2005-03-12', generation: 1 },
    { id: '17', name: '정민준', gender: 'M', birth_date: '2008-11-28', generation: 1 },
    // 은미+상기 자녀
    { id: '18', name: '배수아', gender: 'F', birth_date: '2009-06-07', generation: 1 },
    { id: '19', name: '배준우', gender: 'M', birth_date: '2011-12-25', generation: 1 },
    // 외삼촌
    { id: '20', name: '박진호', gender: 'M', birth_date: '1960-04-15', generation: -1 },
    // 외삼촌 자녀
    { id: '21', name: '박하은', gender: 'F', birth_date: '1990-08-22', generation: 0 },
];

const DEMO_RELATIONS = [
    // 부계 조부모 → 아버지
    { person1_id: '1', person2_id: '5', relation_type: 'parent_child' },
    { person1_id: '2', person2_id: '5', relation_type: 'parent_child' },
    // 조부모 부부
    { person1_id: '1', person2_id: '2', relation_type: 'spouse' },
    // 모계 조부모 → 어머니
    { person1_id: '3', person2_id: '6', relation_type: 'parent_child' },
    { person1_id: '4', person2_id: '6', relation_type: 'parent_child' },
    // 모계 조부모 부부
    { person1_id: '3', person2_id: '4', relation_type: 'spouse' },
    // 모계 조부모 → 외삼촌
    { person1_id: '3', person2_id: '20', relation_type: 'parent_child' },
    { person1_id: '4', person2_id: '20', relation_type: 'parent_child' },
    // 부모 부부
    { person1_id: '5', person2_id: '6', relation_type: 'spouse' },
    // 부모 → 자녀들
    { person1_id: '5', person2_id: '7', relation_type: 'parent_child' },
    { person1_id: '6', person2_id: '7', relation_type: 'parent_child' },
    { person1_id: '5', person2_id: '9', relation_type: 'parent_child' },
    { person1_id: '6', person2_id: '9', relation_type: 'parent_child' },
    { person1_id: '5', person2_id: '11', relation_type: 'parent_child' },
    { person1_id: '6', person2_id: '11', relation_type: 'parent_child' },
    { person1_id: '5', person2_id: '13', relation_type: 'parent_child' },
    { person1_id: '6', person2_id: '13', relation_type: 'parent_child' },
    // 한봉+지은 부부
    { person1_id: '7', person2_id: '8', relation_type: 'spouse' },
    // 한봉+지은 → 자녀
    { person1_id: '7', person2_id: '14', relation_type: 'parent_child' },
    { person1_id: '8', person2_id: '14', relation_type: 'parent_child' },
    { person1_id: '7', person2_id: '15', relation_type: 'parent_child' },
    { person1_id: '8', person2_id: '15', relation_type: 'parent_child' },
    // 선미+홍교 부부
    { person1_id: '9', person2_id: '10', relation_type: 'spouse' },
    // 선미+홍교 → 자녀
    { person1_id: '9', person2_id: '16', relation_type: 'parent_child' },
    { person1_id: '10', person2_id: '16', relation_type: 'parent_child' },
    { person1_id: '9', person2_id: '17', relation_type: 'parent_child' },
    { person1_id: '10', person2_id: '17', relation_type: 'parent_child' },
    // 은미+상기 부부
    { person1_id: '11', person2_id: '12', relation_type: 'spouse' },
    // 은미+상기 → 자녀
    { person1_id: '11', person2_id: '18', relation_type: 'parent_child' },
    { person1_id: '12', person2_id: '18', relation_type: 'parent_child' },
    { person1_id: '11', person2_id: '19', relation_type: 'parent_child' },
    { person1_id: '12', person2_id: '19', relation_type: 'parent_child' },
    // 외삼촌 → 하은
    { person1_id: '20', person2_id: '21', relation_type: 'parent_child' },
];

// ── 샘플 행사 데이터 ──
const DEMO_EVENTS = [
    { id: 1, title: '이서준 생일', date: '2026-05-20', type: 'birthday', person: '이서준' },
    { id: 2, title: '이서윤 생일', date: '2026-09-15', type: 'birthday', person: '이서윤' },
    { id: 3, title: '부모님 결혼기념일', date: '2026-06-10', type: 'anniversary', person: '이광호 & 박미영' },
    { id: 4, title: '할아버지 제사', date: '2026-11-20', type: 'memorial', person: '이종수' },
    { id: 5, title: '가족 여름 여행', date: '2026-07-25', type: 'event', person: '전체 가족' },
    { id: 6, title: '정민서 대학 입학', date: '2026-03-02', type: 'event', person: '정민서' },
];

// ── 샘플 전시 데이터 ──
const DEMO_EXHIBITIONS = [
    { id: 1, title: '2025 추석 가족 모임', desc: '온 가족이 모인 추석 명절', count: 24, cover: '🏠' },
    { id: 2, title: '이서준 초등학교 졸업식', desc: '자랑스러운 졸업의 순간', count: 15, cover: '🎓' },
    { id: 3, title: '부모님 금혼식', desc: '50년 함께한 여정', count: 42, cover: '💍' },
    { id: 4, title: '2024 여름 가족 여행', desc: '제주도에서의 행복한 시간', count: 38, cover: '✈️' },
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
        return buildTree(DEMO_PERSONS, DEMO_RELATIONS, mainPersonId || '7');
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
                <title>이한봉 가족 박물관 — Orgcell 체험</title>
                <meta name="description" content="Orgcell 가족 박물관 데모. 실제 가계도를 둘러보세요." />
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
                            이한봉 가족 박물관 체험 중
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
