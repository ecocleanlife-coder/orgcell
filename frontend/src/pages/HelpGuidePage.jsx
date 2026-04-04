/**
 * HelpGuidePage.jsx — 사용 안내 도움말
 *
 * 카드 버튼 사용법, 권한 안내, 자료실 메뉴 설명
 * 한국어/영어 전환 지원
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, HelpCircle, MousePointer, Smartphone,
    Eye, Lock, FolderOpen, RefreshCw, ShieldCheck,
    Camera, MessageSquare, Mic, Mail,
} from 'lucide-react';

const content = {
    ko: {
        title: '사용 안내',
        lastUpdated: '최종 수정: 2026년 4월 4일',
        switchLang: 'English',
        back: '돌아가기',
        sections: [
            {
                icon: <MousePointer size={20} />,
                title: '카드 위 버튼 사용법',
                body: null,
                custom: 'cardButtons',
            },
            {
                icon: <ShieldCheck size={20} />,
                title: '권한 안내',
                body: `"권한이 없습니다" 메시지가 나타나면 관장에게 접근 요청을 보낼 수 있습니다.

요청 시 입력 사항:
• 이름
• 관계 (예: 손녀, 조카 등)
• 메시지 (선택)

관장이 확인 후 승인하면 해당 영역에 접근할 수 있습니다.

승인 범위:
• ���반전시관만
• + 가족전시관
• + 자료실`,
            },
            {
                icon: <FolderOpen size={20} />,
                title: '자료실 메뉴',
                body: null,
                custom: 'archiveMenu',
            },
        ],
        cardButtonsContent: {
            intro_pc: 'PC: 카드에 마우스를 올리면 3개 표지판이 나타납니다.',
            intro_mobile: '모바일: 카드를 터치하면 표지판이 나타납니다.',
            items: [
                {
                    icon: '◀',
                    label: '일반전시관',
                    desc: '공개 사진과 기록. 누구나 방문 가능.',
                    color: '#4A8DB7',
                },
                {
                    icon: '▶',
                    label: '가족전시관',
                    desc: '가족만 볼 수 있는 기록. 관장 승인 필요.',
                    color: '#9b59b6',
                },
                {
                    icon: '▼',
                    label: '자료실',
                    desc: '인물 수정, 사진 불러���기, 게시판, 육성녹음, 초대하기. 관장/본인만 입장.',
                    color: '#e67e22',
                },
                {
                    icon: '⊕',
                    label: '가문전환',
                    desc: '배우자 카드에만 표시. 해당 가문 중심으로 트리 재배치. 🏠 버튼으로 원래 가문 복귀.',
                    color: '#2ecc71',
                },
            ],
        },
        archiveMenuContent: {
            left: '왼쪽: 인물 수정 및 추가',
            right: '오른쪽 4개 버튼:',
            items: [
                { icon: <Camera size={16} />, label: '사진 불러오기', desc: 'PC/Drive/OneDrive에서 불러오기, 중복제거, 년도별 정리, 프라이버시 분류' },
                { icon: <MessageSquare size={16} />, label: '게시판', desc: '가족끼리 글쓰기/댓글' },
                { icon: <Mic size={16} />, label: '육성녹음', desc: '가족 목소리 녹음, 인물에 연결' },
                { icon: <Mail size={16} />, label: '초대하기', desc: '이메일/SMS/링크 복사' },
            ],
        },
    },
    en: {
        title: 'Help Guide',
        lastUpdated: 'Last updated: April 4, 2026',
        switchLang: '한국어',
        back: 'Go back',
        sections: [
            {
                icon: <MousePointer size={20} />,
                title: 'Card Button Guide',
                body: null,
                custom: 'cardButtons',
            },
            {
                icon: <ShieldCheck size={20} />,
                title: 'Access Permissions',
                body: `If you see "Access denied", you can send an access request to the curator.

Required information:
• Your name
• Relationship (e.g., grandchild, nephew, etc.)
• Message (optional)

Once the curator approves, you can access the area.

Approval scope:
• Public exhibition only
• + Family exhibition
• + Archive`,
            },
            {
                icon: <FolderOpen size={20} />,
                title: 'Archive Menu',
                body: null,
                custom: 'archiveMenu',
            },
        ],
        cardButtonsContent: {
            intro_pc: 'PC: Hover over a card to reveal 3 signboard buttons.',
            intro_mobile: 'Mobile: Tap a card to show the signboard buttons.',
            items: [
                {
                    icon: '◀',
                    label: 'Public Exhibition',
                    desc: 'Public photos and records. Anyone can visit.',
                    color: '#4A8DB7',
                },
                {
                    icon: '▶',
                    label: 'Family Exhibition',
                    desc: 'Family-only records. Curator approval required.',
                    color: '#9b59b6',
                },
                {
                    icon: '▼',
                    label: 'Archive',
                    desc: 'Edit person, import photos, bulletin board, voice recording, invite. Curator/self only.',
                    color: '#e67e22',
                },
                {
                    icon: '⊕',
                    label: 'Family Switch',
                    desc: 'Shows on spouse cards only. Re-centers tree around that family. Use 🏠 to return.',
                    color: '#2ecc71',
                },
            ],
        },
        archiveMenuContent: {
            left: 'Left: Edit and add persons',
            right: 'Right side — 4 buttons:',
            items: [
                { icon: <Camera size={16} />, label: 'Import Photos', desc: 'From PC/Drive/OneDrive. Deduplication, year sorting, privacy classification.' },
                { icon: <MessageSquare size={16} />, label: 'Bulletin Board', desc: 'Family posts and comments' },
                { icon: <Mic size={16} />, label: 'Voice Recording', desc: 'Record family voices, link to persons' },
                { icon: <Mail size={16} />, label: 'Invite', desc: 'Email / SMS / copy link' },
            ],
        },
    },
};

export default function HelpGuidePage() {
    const navigate = useNavigate();
    const [lang, setLang] = useState('ko');
    const t = content[lang];

    const renderCardButtons = () => {
        const cb = t.cardButtonsContent;
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-2 text-[14px] text-[#5A5A4A]">
                    <MousePointer size={15} className="mt-0.5 shrink-0" style={{ color: '#4A8DB7' }} />
                    <span>{cb.intro_pc}</span>
                </div>
                <div className="flex items-start gap-2 text-[14px] text-[#5A5A4A]">
                    <Smartphone size={15} className="mt-0.5 shrink-0" style={{ color: '#4A8DB7' }} />
                    <span>{cb.intro_mobile}</span>
                </div>
                <div className="space-y-3 mt-4">
                    {cb.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#F8F6F2' }}>
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                                style={{ background: item.color }}
                            >
                                {item.icon}
                            </div>
                            <div>
                                <span className="text-[14px] font-bold text-[#3D2008]">{item.label}</span>
                                <p className="text-[13px] text-[#5A5A4A] mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderArchiveMenu = () => {
        const am = t.archiveMenuContent;
        return (
            <div className="space-y-3">
                <p className="text-[14px] text-[#5A5A4A] font-medium">{am.left}</p>
                <p className="text-[14px] text-[#5A5A4A] font-medium">{am.right}</p>
                <div className="space-y-2">
                    {am.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#F8F6F2' }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EBF4FB', color: '#4A8DB7' }}>
                                {item.icon}
                            </div>
                            <div>
                                <span className="text-[14px] font-bold text-[#3D2008]">{item.label}</span>
                                <p className="text-[13px] text-[#5A5A4A] mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#E8E3D8]">
                <div className="max-w-[720px] mx-auto px-5 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-[14px] text-[#5A5A4A] hover:text-[#3D2008] transition"
                    >
                        <ArrowLeft size={16} />
                        {t.back}
                    </button>
                    <button
                        onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
                        className="text-[13px] px-3 py-1.5 rounded-full border border-[#E8E3D8] text-[#5A5A4A] hover:bg-[#F0EDE6] transition"
                    >
                        {t.switchLang}
                    </button>
                </div>
            </div>

            <div className="max-w-[720px] mx-auto px-5 py-10">
                <div className="flex items-center gap-3 mb-2">
                    <HelpCircle size={28} style={{ color: '#C4A84F' }} />
                    <h1
                        className="text-[28px] font-bold text-[#3D2008]"
                        style={{ fontFamily: 'Georgia, serif' }}
                    >
                        {t.title}
                    </h1>
                </div>
                <p className="text-[13px] text-[#8A8070] mb-10">{t.lastUpdated}</p>

                <div className="space-y-8">
                    {t.sections.map((section, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-[#E8E3D8] p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F0EDE6', color: '#7A6E5E' }}>
                                    {section.icon}
                                </div>
                                <h2 className="text-[17px] font-bold text-[#3D2008]">{section.title}</h2>
                            </div>
                            {section.custom === 'cardButtons' && renderCardButtons()}
                            {section.custom === 'archiveMenu' && renderArchiveMenu()}
                            {section.body && (
                                <div className="text-[14px] leading-relaxed text-[#5A5A4A] whitespace-pre-line">
                                    {section.body}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* 조상찾기 안내 링크 */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/ancestry-guide')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold border transition hover:bg-[#F0EDE6]"
                        style={{ color: '#5A5A4A', borderColor: '#E8E3D8' }}
                    >
                        {lang === 'ko' ? '조상찾기 안내' : 'Ancestry Research Guide'}
                    </button>
                </div>
            </div>
        </div>
    );
}
