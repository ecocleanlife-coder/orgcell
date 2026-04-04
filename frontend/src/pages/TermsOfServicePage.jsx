import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, DollarSign, Gift, AlertTriangle } from 'lucide-react';

export default function TermsOfServicePage() {
    const navigate = useNavigate();
    const [lang, setLang] = useState('ko');

    const content = {
        ko: {
            title: '이용약관',
            lastUpdated: '최종 수정: 2026년 3월 30일',
            switchLang: 'English',
            back: '돌아가기',
            sections: [
                {
                    icon: <FileText size={20} />,
                    title: '1. 서비스 개요',
                    body: `Orgcell은 AI 기반 사진 정리 및 가족 공유 플랫폼입니다.\n\n• 운영자: ITS Construction LLC\n• 서비스 도메인: orgcell.com\n• 서비스 내용: AI 사진 분류, 얼굴 인식, 가족 웹사이트, 실시간 공유, 가계도\n\n본 약관에 동의함으로써 서비스 이용이 가능합니다.`,
                },
                {
                    icon: <Gift size={20} />,
                    title: '2. 무료 서비스 범위',
                    body: `다음 기능은 무료로 제공됩니다:\n\n• AI 스마트 분류 (사진 자동 정리)\n• 얼굴 인식 및 인물별 분류\n• 기본 가계도 (5인 이하)\n• BYOS 클라우드 연동 (Google Drive, OneDrive, Dropbox)\n• 실시간 사진 공유 (Friend Call)\n\n무료 서비스는 사전 공지 후 변경될 수 있습니다.`,
                },
                {
                    icon: <DollarSign size={20} />,
                    title: '3. 유료 서비스',
                    body: `가족 웹사이트 운영에는 연간 요금이 부과됩니다:\n\n• 가격: $10/년 (USD)\n• 포함 사항:\n  - 가족 전용 서브도메인 (예: lee.orgcell.com)\n  - 사진 2,000장 갤러리\n  - 전시관 무제한 생성\n  - 가족 게시판\n  - 가계도 무제한 인물\n  - 디지털 유산 승계\n\n• 결제: Stripe (신용카드/체크카드)\n• 환불: 구매 후 14일 이내 전액 환불 가능\n• 갱신: 매년 자동 갱신 (갱신 30일 전 이메일 안내)`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '4. 이용 제한 및 면책',
                    body: `다음 행위는 금지됩니다:\n\n• 타인의 사진을 무단으로 업로드하는 행위\n• 불법 콘텐츠 업로드\n• 서비스 인프라에 대한 공격 시도\n• 자동화된 대량 데이터 수집\n\n면책 사항:\n• Orgcell은 사용자 클라우드(Google Drive 등)의 장애에 대해 책임지지 않습니다\n• 사용자의 클라우드 계정 분실로 인한 데이터 손실은 사용자 책임입니다\n• 서비스 점검 시 사전 공지 후 일시 중단될 수 있습니다`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '5. 박물관 콘텐츠 책임',
                    body: `가족유산박물관(가계도, 전시관, 사진 갤러리 등)에 등록되는 모든 콘텐츠의 등록 및 공개 책임은 전적으로 해당 박물관의 관장(사이트 소유자)에게 있습니다.\n\n• 박물관에 게시된 사진, 텍스트, 가계도 정보의 정확성과 적법성은 관장이 보증합니다\n• 타인의 초상권, 개인정보를 침해하는 콘텐츠 게시에 대한 법적 책임은 관장에게 있습니다\n• Orgcell은 플랫폼 제공자로서 사용자가 등록한 콘텐츠의 내용에 대해 책임을 지지 않습니다\n• 부적절한 콘텐츠 신고 시 Orgcell은 해당 콘텐츠를 검토 후 삭제할 수 있습니다`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '6. 저작권 및 지적재산권',
                    body: `사용자가 Orgcell에 업로드한 모든 콘텐츠(사진, 기록, 음성, 텍스트 등)의 저작권은 해당 사용자에게 귀속됩니다.\n\n• 사용자 콘텐츠 소유권: 사용자가 업로드한 모든 콘텐츠의 저작권은 사용자 본인에게 있습니다\n• Orgcell의 사용 범위: Orgcell은 서비스 제공 목적(AI 분류, 표시, 백업)으로만 사용자 콘텐츠를 처리하며, 이를 제3자에게 판매, 양도, 공유하지 않습니다\n• 무단 복제/배포 금지: 타인의 박물관에 게시된 사진, 기록, 음성 등을 무단으로 복제, 복사, 배포, 상업적으로 사용하는 행위는 엄격히 금지됩니다\n• 위반 시 조치: 저작권 위반이 확인될 경우 해당 계정의 즉시 정지 및 법적 조치가 진행될 수 있습니다\n• DMCA 대응: 저작권 침해 신고는 ecocleanlife@gmail.com으로 접수하며, DMCA 절차에 따라 신속히 처리합니다. 침해 콘텐츠는 확인 즉시 제거됩니다`,
                },
                {
                    icon: <FileText size={20} />,
                    title: '7. 약관 변경',
                    body: `본 약관은 서비스 개선에 따라 변경될 수 있습니다.\n\n• 중요 변경 시 이메일로 30일 전 사전 고지\n• 변경 후 서비스 계속 이용 시 변경에 동의한 것으로 간주\n• 동의하지 않을 경우 계정 삭제를 통해 서비스 이용 중단 가능\n\n문의: ecocleanlife@gmail.com`,
                },
            ],
        },
        en: {
            title: 'Terms of Service',
            lastUpdated: 'Last updated: March 30, 2026',
            switchLang: '한국어',
            back: 'Go back',
            sections: [
                {
                    icon: <FileText size={20} />,
                    title: '1. Service Overview',
                    body: `Orgcell is an AI-powered photo organization and family sharing platform.\n\n• Operator: ITS Construction LLC\n• Service domain: orgcell.com\n• Features: AI photo classification, face recognition, family websites, live sharing, family tree\n\nBy agreeing to these terms, you may use the service.`,
                },
                {
                    icon: <Gift size={20} />,
                    title: '2. Free Services',
                    body: `The following features are available for free:\n\n• AI Smart Sort (automatic photo organization)\n• Face recognition and person-based classification\n• Basic family tree (up to 5 members)\n• BYOS cloud integration (Google Drive, OneDrive, Dropbox)\n• Live photo sharing (Friend Call)\n\nFree services may change with prior notice.`,
                },
                {
                    icon: <DollarSign size={20} />,
                    title: '3. Paid Services',
                    body: `An annual fee applies for family website hosting:\n\n• Price: $10/year (USD)\n• Includes:\n  - Dedicated family subdomain (e.g., lee.orgcell.com)\n  - 2,000 photo gallery\n  - Unlimited exhibitions\n  - Family bulletin board\n  - Unlimited family tree members\n  - Digital heritage succession\n\n• Payment: Stripe (credit/debit card)\n• Refund: Full refund within 14 days of purchase\n• Renewal: Annual auto-renewal (email notice 30 days before)`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '4. Usage Restrictions & Disclaimers',
                    body: `The following activities are prohibited:\n\n• Uploading others' photos without permission\n• Uploading illegal content\n• Attempting attacks on service infrastructure\n• Automated mass data collection\n\nDisclaimers:\n• Orgcell is not responsible for outages in user cloud services (Google Drive, etc.)\n• Data loss due to user cloud account issues is the user's responsibility\n• Service may be temporarily suspended for maintenance with prior notice`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '5. Museum Content Responsibility',
                    body: `The registration and publication of all content in the Family Digital Museum (family tree, exhibitions, photo galleries, etc.) is solely the responsibility of the museum curator (site owner).\n\n• The curator guarantees the accuracy and legality of photos, text, and family tree information posted in the museum\n• Legal responsibility for content that infringes on others' portrait rights or personal information lies with the curator\n• As a platform provider, Orgcell is not responsible for the content registered by users\n• Upon receiving reports of inappropriate content, Orgcell may review and remove such content`,
                },
                {
                    icon: <AlertTriangle size={20} />,
                    title: '6. Copyright & Intellectual Property',
                    body: `All content uploaded to Orgcell (photos, records, voice recordings, text, etc.) remains the intellectual property of the uploading user.\n\n• User Content Ownership: Copyright for all uploaded content belongs to the user\n• Orgcell's Usage Scope: Orgcell processes user content solely for service delivery (AI classification, display, backup) and does not sell, transfer, or share it with third parties\n• Unauthorized Reproduction Prohibited: Unauthorized copying, reproduction, distribution, or commercial use of photos, records, or voice recordings from others' museums is strictly prohibited\n• Violation Consequences: Confirmed copyright violations may result in immediate account suspension and legal action\n• DMCA Response: Copyright infringement reports should be submitted to ecocleanlife@gmail.com and will be promptly processed per DMCA procedures. Infringing content will be removed immediately upon verification`,
                },
                {
                    icon: <FileText size={20} />,
                    title: '7. Changes to Terms',
                    body: `These terms may be updated as the service evolves.\n\n• Major changes will be notified by email 30 days in advance\n• Continued use after changes constitutes agreement\n• If you disagree, you may stop using the service by deleting your account\n\nContact: ecocleanlife@gmail.com`,
                },
            ],
        },
    };

    const t = content[lang];

    return (
        <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
            {/* Header */}
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

            {/* Content */}
            <div className="max-w-[720px] mx-auto px-5 py-10">
                <h1
                    className="text-[28px] font-bold text-[#3D2008] mb-2"
                    style={{ fontFamily: 'Georgia, serif' }}
                >
                    {t.title}
                </h1>
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
                            <div className="text-[14px] leading-relaxed text-[#5A5A4A] whitespace-pre-line">
                                {section.body}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
