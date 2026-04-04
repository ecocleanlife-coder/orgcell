/**
 * AncestryGuidePage.jsx — 조상찾기 안내 페이지
 *
 * 전 세계 조상찾기/가계도 서비스 안내
 * 비로그인 접근 가능, 한국어/영어 전환
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Link2 } from 'lucide-react';

const SERVICES = {
    global: {
        ko: '글로벌 서비스 (Big 4)',
        en: 'Global Services (Big 4)',
        items: [
            {
                name: 'FamilySearch.org',
                icon: '\uD83C\uDF10',
                url: 'https://www.familysearch.org',
                ko: { desc: '무료 | LDS 교회 운영', detail: '수십억 건 역사 기록' },
                en: { desc: 'Free | Operated by LDS Church', detail: 'Billions of historical records' },
                orgcellLink: true,
            },
            {
                name: 'Ancestry.com',
                icon: '\uD83C\uDF10',
                url: 'https://www.ancestry.com',
                ko: { desc: '유료 (월 $25~$50)', detail: '최대 DNA 데이터베이스 1,600만 샘플. 미국 1위 가계도 서비스' },
                en: { desc: 'Paid ($25-$50/mo)', detail: 'Largest DNA database with 16M samples. #1 genealogy service in the US' },
            },
            {
                name: 'MyHeritage.com',
                icon: '\uD83C\uDF10',
                url: 'https://www.myheritage.com',
                ko: { desc: '유료 | 유럽 강세', detail: 'DNA + 사진 AI 복원 (딥노스탈지아)' },
                en: { desc: 'Paid | Strong in Europe', detail: 'DNA + AI photo restoration (Deep Nostalgia)' },
            },
            {
                name: 'Findmypast.com',
                icon: '\uD83C\uDF10',
                url: 'https://www.findmypast.com',
                ko: { desc: '유료 | 영국/아일랜드 최강', detail: '80억 건 역사 기록' },
                en: { desc: 'Paid | Best for UK/Ireland', detail: '8 billion historical records' },
            },
        ],
    },
    collab: {
        ko: '협업형 서비스',
        en: 'Collaborative Services',
        items: [
            {
                name: 'Geni.com',
                icon: '\uD83E\uDD1D',
                url: 'https://www.geni.com',
                ko: { desc: '무료/유료 | World Family Tree', detail: '2억 프로필, MyHeritage 소유' },
                en: { desc: 'Free/Paid | World Family Tree', detail: '200M profiles, owned by MyHeritage' },
            },
            {
                name: 'WikiTree.com',
                icon: '\uD83E\uDD1D',
                url: 'https://www.wikitree.com',
                ko: { desc: '무료 | 위키 방식 협업, 비영리', detail: '' },
                en: { desc: 'Free | Wiki-style collaboration, nonprofit', detail: '' },
            },
        ],
    },
    dna: {
        ko: 'DNA 검사 서비스',
        en: 'DNA Testing Services',
        items: [
            {
                name: '23andMe.com',
                icon: '\uD83E\uDDEC',
                url: 'https://www.23andme.com',
                ko: { desc: 'DNA 검사 + 건강 정보', detail: '' },
                en: { desc: 'DNA testing + health reports', detail: '' },
            },
            {
                name: 'FamilyTreeDNA.com',
                icon: '\uD83E\uDDEC',
                url: 'https://www.familytreedna.com',
                ko: { desc: 'Y-DNA, mtDNA 전문', detail: '' },
                en: { desc: 'Specializes in Y-DNA, mtDNA', detail: '' },
            },
            {
                name: 'LivingDNA.com',
                icon: '\uD83E\uDDEC',
                url: 'https://www.livingdna.com',
                ko: { desc: '영국 기반 DNA 검사', detail: '' },
                en: { desc: 'UK-based DNA testing', detail: '' },
            },
        ],
    },
    other: {
        ko: '기타 글로벌',
        en: 'Other Global Services',
        items: [
            {
                name: 'Geneanet.org',
                icon: '\uD83C\uDF0D',
                url: 'https://www.geneanet.org',
                ko: { desc: '프랑스 기반 | 90억 인물', detail: '유럽 강세' },
                en: { desc: 'France-based | 9 billion persons', detail: 'Strong in Europe' },
            },
            {
                name: 'FamilyTreeNow.com',
                icon: '\uD83C\uDF0D',
                url: 'https://www.familytreenow.com',
                ko: { desc: '완전 무료 | 미국 현재 인물 검색', detail: '' },
                en: { desc: 'Completely free | US people search', detail: '' },
            },
            {
                name: 'Storied.com',
                icon: '\uD83C\uDF0D',
                url: 'https://www.storied.com',
                ko: { desc: '스토리텔링 중심 (사진 + 이야기)', detail: '' },
                en: { desc: 'Storytelling focus (photos + stories)', detail: '' },
            },
        ],
    },
    korea: {
        ko: '\uD55C\uAD6D \uC871\uBCF4 \uC11C\uBE44\uC2A4',
        en: 'Korean Genealogy Services',
        items: [
            {
                name: 'FamilySearch \uD55C\uAD6D',
                icon: '\uD83C\uDDF0\uD83C\uDDF7',
                url: 'https://www.familysearch.org/ko/korea',
                ko: { desc: '\uD55C\uAD6D \uC131\uC528/\uBCF8\uAD00\uBCC4 \uC871\uBCF4 \uAC80\uC0C9', detail: '\uBB34\uB8CC' },
                en: { desc: 'Korean clan/surname genealogy search', detail: 'Free' },
            },
            {
                name: '\uC778\uC81C\uB300 \uB514\uC9C0\uD138\uC871\uBCF4\uB3C4\uC11C\uAD00',
                icon: '\uD83C\uDDF0\uD83C\uDDF7',
                url: 'https://genealogy.inje.ac.kr',
                ko: { desc: '\uC131\uC528\uBCC4 \uC871\uBCF4 e-book \uC5F4\uB78C', detail: '' },
                en: { desc: 'Digital genealogy library by surname', detail: '' },
            },
            {
                name: '\uD55C\uAD6D\uC778\uC758\uC871\uBCF4',
                icon: '\uD83C\uDDF0\uD83C\uDDF7',
                url: 'https://xn--2z1bw8tk0fgsd89e5uc.com',
                ko: { desc: '\uC131\uC528 \uC790\uB8CC, \uC871\uBCF4 e-book', detail: '' },
                en: { desc: 'Surname records, genealogy e-books', detail: '' },
            },
            {
                name: '\uC871\uBCF4\uCC3E\uAE30',
                icon: '\uD83C\uDDF0\uD83C\uDDF7',
                url: 'https://gok.kr',
                ko: { desc: '\uBCF8\uAD00/\uC131\uC528\uBCC4 \uC871\uBCF4 \uAC80\uC0C9, \uAC00\uBB38 \uC815\uBCF4', detail: '' },
                en: { desc: 'Search by clan/surname, family info', detail: '' },
            },
            {
                name: '\uBFCC\uB9AC\uC815\uBCF4\uBBF8\uB514\uC5B4',
                icon: '\uD83C\uDDF0\uD83C\uDDF7',
                url: 'https://yesjokbo.com',
                ko: { desc: '\uC885\uCE5C\uD68C \uC778\uD130\uB137\uC871\uBCF4 \uAD6C\uCD95 \uB300\uD589', detail: '' },
                en: { desc: 'Internet genealogy construction for clan associations', detail: '' },
            },
        ],
    },
};

const TEXT = {
    ko: {
        title: '\uC804 \uC138\uACC4 \uC870\uC0C1\uCC3E\uAE30 \uC11C\uBE44\uC2A4 \uC548\uB0B4',
        subtitle: 'Orgcell\uACFC \uD568\uAED8 \uD65C\uC6A9\uD558\uBA74 \uB354 \uD48D\uC131\uD55C\n\uAC00\uC871\uC720\uC0B0\uBC15\uBB3C\uAD00\uC744 \uB9CC\uB4E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        visit: '\uC0AC\uC774\uD2B8 \uBC29\uBB38',
        orgcellLink: 'Orgcell\uC5D0\uC11C \uC5F0\uB3D9\uD558\uAE30',
        back: '\uB3CC\uC544\uAC00\uAE30',
        switchLang: 'English',
        footer: '\uC704 \uC11C\uBE44\uC2A4\uB4E4\uC740 \uAE30\uB85D \uAC80\uC0C9\uACFC \uAC00\uACC4\uB3C4 \uADF8\uB9AC\uAE30\uC5D0 \uC9D1\uC911\uD569\uB2C8\uB2E4.\n\nOrgcell\uC740 \uB2E4\uB985\uB2C8\uB2E4.\n\uC0B4\uC544\uC788\uB294 \uAC00\uC871\uC758 \uC0AC\uC9C4, \uBAA9\uC18C\uB9AC, \uC774\uC57C\uAE30\uB97C\n\uBC15\uBB3C\uAD00\uC73C\uB85C \uB9CC\uB4E4\uACE0, \uAC00\uBB38\uACFC \uAC00\uBB38\uC744 \uC5F0\uACB0\uD569\uB2C8\uB2E4.\n\n\uC870\uC0C1 \uAE30\uB85D\uC740 \uC704 \uC11C\uBE44\uC2A4\uC5D0\uC11C \uCC3E\uACE0,\n\uC0B4\uC544\uC788\uB294 \uAC00\uC871\uC758 \uC720\uC0B0\uC740 Orgcell\uC5D0\uC11C \uBCF4\uC874\uD558\uC138\uC694.',
    },
    en: {
        title: 'Global Ancestry Research Guide',
        subtitle: 'Use these services alongside Orgcell\nto build a richer Family Heritage Museum.',
        visit: 'Visit Site',
        orgcellLink: 'Connect in Orgcell',
        back: 'Go Back',
        switchLang: '\uD55C\uAD6D\uC5B4',
        footer: 'The services above focus on record searching\nand building family trees.\n\nOrgcell is different.\nWe turn your living family\'s photos, voices,\nand stories into a museum,\nconnecting families across generations.\n\nFind ancestral records with the services above.\nPreserve your living family\'s heritage with Orgcell.',
    },
};

function ServiceCard({ item, lang, texts }) {
    const t = item[lang];

    return (
        <div
            className="rounded-xl border p-4"
            style={{ background: '#fff', borderColor: '#e8e0d0' }}
        >
            <div className="flex items-start gap-3">
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: '#3a3a2a' }}>
                        {item.name}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: '#7a6e5e' }}>{t.desc}</p>
                    {t.detail && (
                        <p className="text-xs mt-1" style={{ color: '#999' }}>{t.detail}</p>
                    )}
                    {item.orgcellLink && (
                        <span
                            className="inline-flex items-center gap-1 mt-1 text-xs font-medium"
                            style={{ color: '#4a7a3a' }}
                        >
                            <Link2 size={11} /> Orgcell {lang === 'ko' ? '\uC5F0\uB3D9 \uC9C0\uC6D0' : 'integration supported'}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex gap-2 mt-3">
                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{ color: '#3a3a2a', borderColor: '#e8e0d0', background: '#FAFAF7' }}
                >
                    <ExternalLink size={12} />
                    {texts.visit}
                </a>
                {item.orgcellLink && (
                    <a
                        href="/familysearch-import"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: '#4a7a3a' }}
                    >
                        <Link2 size={12} />
                        {texts.orgcellLink}
                    </a>
                )}
            </div>
        </div>
    );
}

export default function AncestryGuidePage() {
    const navigate = useNavigate();
    const [lang, setLang] = useState(() => {
        const saved = localStorage.getItem('orgcell_lang');
        return saved === 'en' ? 'en' : 'ko';
    });
    const t = TEXT[lang];

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            {/* \uC0C1\uB2E8 \uD5E4\uB354 */}
            <header
                className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(250,250,247,0.96)', borderColor: '#e8e0d0', backdropFilter: 'blur(8px)' }}
            >
                <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm"
                        style={{ color: '#7a6e5e' }}
                    >
                        <ArrowLeft size={16} />
                        {t.back}
                    </button>
                    <button
                        onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
                        className="px-3 py-1 rounded-full text-xs font-medium border"
                        style={{ color: '#7a6e5e', borderColor: '#e8e0d0' }}
                    >
                        {t.switchLang}
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* \uC0C1\uB2E8 \uC548\uB0B4 */}
                <div className="text-center mb-8">
                    <h1
                        className="text-xl font-bold mb-3"
                        style={{ color: '#3a3a2a' }}
                    >
                        {t.title}
                    </h1>
                    <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: '#7a6e5e' }}
                    >
                        {t.subtitle}
                    </p>
                </div>

                {/* \uC11C\uBE44\uC2A4 \uC139\uC158\uB4E4 */}
                {Object.entries(SERVICES).map(([key, section]) => (
                    <div key={key} className="mb-8">
                        <h2
                            className="text-sm font-bold mb-3 px-1"
                            style={{ color: '#A09888' }}
                        >
                            {section[lang]}
                        </h2>
                        <div className="flex flex-col gap-3">
                            {section.items.map((item) => (
                                <ServiceCard
                                    key={item.name}
                                    item={item}
                                    lang={lang}
                                    texts={t}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* \uD558\uB2E8 \uBE44\uAD50 \uC548\uB0B4 */}
                <div
                    className="rounded-2xl p-6 text-center mt-4 mb-8"
                    style={{ background: '#F0EDE6', border: '1px solid #e8e0d0' }}
                >
                    <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: '#5a5a4a' }}
                    >
                        {t.footer}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #C4A84F, #A88E3A)' }}
                    >
                        Orgcell {lang === 'ko' ? '\uC2DC\uC791\uD558\uAE30' : 'Get Started'}
                    </button>
                </div>
            </main>
        </div>
    );
}
