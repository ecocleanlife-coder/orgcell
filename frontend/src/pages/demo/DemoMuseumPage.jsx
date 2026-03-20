import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TreePine, MessageSquare, CalendarDays, BookOpen, Images, Plus } from 'lucide-react';

// ── 토스트 컴포넌트 ──
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-white text-[13px] font-semibold shadow-lg"
      style={{ background: 'rgba(30,30,30,0.88)', backdropFilter: 'blur(8px)' }}>
      {msg}
    </div>
  );
}

// ── 인물 폴더 ──
const AVATAR_COLORS = [
  '#e57373','#f06292','#ba68c8','#7986cb',
  '#4fc3f7','#4db6ac','#81c784','#ffb74d',
  '#a1887f','#90a4ae',
];
function PersonFolder({ initials, name, colorIdx = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl transition-all hover:scale-105 cursor-pointer group"
      style={{ background: '#FFF9E6', border: '2px solid #E5A823', minWidth: '72px' }}
    >
      {/* 원형 아바타 */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] shadow-sm"
        style={{ background: AVATAR_COLORS[colorIdx % AVATAR_COLORS.length] }}>
        {initials}
      </div>
      {/* 이름 */}
      <span className="text-[11px] font-semibold text-[#3D2008] text-center leading-tight whitespace-nowrap">{name}</span>
      {/* 공개 범위 뱃지 3개 */}
      <div className="flex gap-0.5">
        <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: '#dcfce7', color: '#166534' }}>공개</span>
        <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: '#dbeafe', color: '#1e40af' }}>가족</span>
        <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: '#f3f4f6', color: '#6b7280' }}>본인</span>
      </div>
    </button>
  );
}

// ── + 버튼 ──
function AddButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[20px] cursor-pointer hover:brightness-110 transition-all shadow-md"
      style={{ background: '#f472b6' }}>
      +
    </button>
  );
}

// ── 황금 연결선 SVG (수직) ──
function VLine({ height = 24 }) {
  return <div className="mx-auto" style={{ width: '2px', height, background: '#E5A823', borderRadius: '1px' }} />;
}
function HLine({ width = 160 }) {
  return <div style={{ width, height: '2px', background: '#E5A823', borderRadius: '1px' }} />;
}

// ── 조부모 쌍 컴포넌트 ──
function GrandparentPair({ label, badge, people, startColor, onPersonClick }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-bold text-[#6b5d4d]">{label}</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#dcfce7', color: '#166534' }}>{badge}</span>
      </div>
      <div className="flex gap-3">
        {people.map((p, i) => (
          <PersonFolder key={p.name} initials={p.initials} name={p.name} colorIdx={startColor + i} onClick={onPersonClick} />
        ))}
      </div>
    </div>
  );
}

export default function DemoMuseumPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };
  const loginToast = () => showToast('로그인 후 이용 가능합니다');

  const TABS = [
    { label: '가족 게시판', icon: MessageSquare, badge: '가족만 입장', badgeColor: '#1e40af', badgeBg: '#dbeafe' },
    { label: '가족 달력',   icon: CalendarDays,  badge: '자동 연동',   badgeColor: '#166534', badgeBg: '#dcfce7' },
    { label: '조상전시관',  icon: BookOpen,       badge: '전시 구성',   badgeColor: '#92400e', badgeBg: '#fef9c3' },
    { label: '가족행사관',  icon: Images,         badge: '자유 생성',   badgeColor: '#5b21b6', badgeBg: '#ede9fe' },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: '#F5F2EC' }}>
      <Helmet>
        <title>Kim Family Museum — Orgcell 예시</title>
        <meta name="description" content="Orgcell 가족 박물관 예시 페이지. 직접 만들어보세요." />
      </Helmet>

      <Toast msg={toast} />

      {/* ── 상단 배너 ── */}
      <div className="w-full py-3 px-5" style={{ background: '#4a7f4a' }}>
        <div className="max-w-[960px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-white text-[13px] font-semibold">
            ✨ 이것은 예시 박물관입니다 — 나만의 박물관을 무료로 만들어보세요
          </span>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer hover:brightness-110 transition-all whitespace-nowrap"
            style={{ background: '#fff', color: '#3a6e3a' }}
          >
            무료로 시작하기 →
          </button>
        </div>
      </div>

      {/* ── 헤드라인 ── */}
      <div className="max-w-[960px] mx-auto px-5 pt-8 pb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TreePine size={28} className="text-[#5a8a4a]" />
          <h1 className="text-[28px] font-black text-[#3D2008]" style={{ fontFamily: 'Georgia, serif' }}>
            Kim Family Museum
          </h1>
        </div>
        <p className="text-[14px] text-[#7a6e5e]">
          폴더를 클릭하면 사진, 전시관, 개인 공간을 볼 수 있습니다
        </p>
      </div>

      {/* ── 상단 탭 4개 ── */}
      <div className="max-w-[960px] mx-auto px-5 mb-6">
        <div className="flex gap-2 flex-wrap justify-center">
          {TABS.map(({ label, icon: Icon, badge, badgeColor, badgeBg }) => (
            <button
              key={label}
              onClick={loginToast}
              className="flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer hover:shadow-md transition-all"
              style={{ background: '#fff', border: '1.5px solid #e8e2d6' }}
            >
              <Icon size={14} className="text-slate-500" />
              <span className="text-[13px] font-semibold text-slate-700">{label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ background: badgeBg, color: badgeColor }}>{badge}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 패밀리 트리 ── */}
      <div className="max-w-[960px] mx-auto px-5 pb-10">
        <div className="rounded-3xl p-6 overflow-x-auto"
          style={{ background: '#fff', border: '1.5px solid #e8e2d6', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          <div className="min-w-[700px]">

            {/* ── 조부모 행 ── */}
            <div className="flex justify-around items-start mb-2">
              <GrandparentPair
                label="John's Parents" badge="Birth Parents"
                people={[{ initials: 'JD', name: "John's Dad" }, { initials: 'JM', name: "John's Mom" }]}
                startColor={0} onPersonClick={loginToast}
              />
              <GrandparentPair
                label="Jane's Parents" badge="Birth Parents"
                people={[{ initials: 'JD', name: "Jane's Dad" }, { initials: 'JM', name: "Jane's Mom" }]}
                startColor={2} onPersonClick={loginToast}
              />
            </div>

            {/* 조부모 → 부모 연결선 */}
            <div className="flex justify-around mb-0">
              <VLine height={20} />
              <VLine height={20} />
            </div>

            {/* ── 부모 행 ── */}
            <div className="flex items-center justify-center gap-6 mb-1">
              <PersonFolder initials="JO" name="John" colorIdx={4} onClick={loginToast} />

              {/* + 연결 버튼 */}
              <div className="flex flex-col items-center gap-0.5">
                <HLine width={48} />
                <AddButton onClick={loginToast} />
                <HLine width={48} />
              </div>

              <PersonFolder initials="JA" name="Jane" colorIdx={5} onClick={loginToast} />
            </div>

            {/* 부모 → 자녀 연결선 */}
            <div className="flex justify-center mb-0">
              <VLine height={20} />
            </div>

            {/* ── 자녀 행 ── */}
            <div className="flex justify-center gap-6 flex-wrap mb-1">
              {/* Son1 + Wife */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-2 items-center">
                  <PersonFolder initials="S1" name="Son1" colorIdx={6} onClick={loginToast} />
                  <div className="flex flex-col items-center">
                    <HLine width={20} />
                    <AddButton onClick={loginToast} />
                    <HLine width={20} />
                  </div>
                  <PersonFolder initials="SW" name="Son1's Wife" colorIdx={1} onClick={loginToast} />
                </div>
                <VLine height={20} />
                {/* 손자 */}
                <PersonFolder initials="SS" name="Son1's Son" colorIdx={9} onClick={loginToast} />
              </div>

              {/* Daughter1 + Husband */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-2 items-center">
                  <PersonFolder initials="D1" name="Daughter1" colorIdx={7} onClick={loginToast} />
                  <div className="flex flex-col items-center">
                    <HLine width={20} />
                    <AddButton onClick={loginToast} />
                    <HLine width={20} />
                  </div>
                  <PersonFolder initials="DH" name="D1's Husband" colorIdx={3} onClick={loginToast} />
                </div>
                <VLine height={20} />
                {/* 손녀 2명 */}
                <div className="flex gap-3">
                  <PersonFolder initials="DD" name="D1's Daughter1" colorIdx={1} onClick={loginToast} />
                  <PersonFolder initials="DD" name="D1's Daughter2" colorIdx={5} onClick={loginToast} />
                </div>
              </div>

              {/* Son2 단독 */}
              <div className="flex flex-col items-center justify-start">
                <PersonFolder initials="S2" name="Son2" colorIdx={8} onClick={loginToast} />
              </div>

              {/* Daughter2 단독 */}
              <div className="flex flex-col items-center justify-start">
                <PersonFolder initials="D2" name="Daughter2" colorIdx={2} onClick={loginToast} />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── 하단 CTA ── */}
      <div className="px-5 pb-20 pt-4">
        <div className="max-w-[700px] mx-auto rounded-3xl py-12 px-8 text-center"
          style={{ background: 'linear-gradient(135deg, #f5f0e4 0%, #ede7d9 100%)', border: '1px solid #e3ddd0' }}>
          <h2 className="text-[22px] font-bold text-[#2a1c08] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            우리 가족만의 디지털 박물관을 만들어보세요
          </h2>
          <p className="text-[13px] text-[#7a6e5e] mb-6">
            100장까지 무료 · 신용카드 불필요 · 가족 무제한 초대
          </p>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-8 py-3 rounded-full font-bold text-[15px] text-white cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-md"
            style={{ background: '#8DB86B' }}
          >
            무료로 시작하기
          </button>
          <div className="mt-3">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-[12px] text-[#7a6e5e] hover:underline cursor-pointer"
            >
              예시 더 보기 ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
