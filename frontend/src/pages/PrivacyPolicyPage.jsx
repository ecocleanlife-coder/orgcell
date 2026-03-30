import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Trash2, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();
    const [lang, setLang] = useState('ko');

    const content = {
        ko: {
            title: '개인정보 처리방침',
            lastUpdated: '최종 수정: 2026년 3월 30일',
            switchLang: 'English',
            back: '돌아가기',
            sections: [
                {
                    icon: <Shield size={20} />,
                    title: '1. 수집하는 정보',
                    body: `Orgcell은 서비스 제공을 위해 다음 정보를 수집합니다:\n\n• 이름 (프로필 표시용)\n• 이메일 주소 (로그인 및 알림)\n• 사진 메타데이터 (EXIF: 촬영 날짜, 위치 — AI 분류용)\n• 얼굴 특징 벡터 (128차원 수치 데이터 — 인물 분류용)\n\n얼굴 특징 벡터는 원본 사진에서 추출된 수학적 데이터이며, 원본 이미지로 복원할 수 없습니다.`,
                },
                {
                    icon: <Database size={20} />,
                    title: '2. 저장 방식 — BYOS (Bring Your Own Storage)',
                    body: `Orgcell은 사용자의 원본 사진을 서버에 저장하지 않습니다.\n\n• 원본 사진: 사용자의 Google Drive, OneDrive, 또는 Dropbox에만 저장\n• 서버 저장 데이터: 계정 정보, 메타데이터, 얼굴 벡터 (암호화)\n• 서버에 저장되는 모든 민감 데이터는 AES-256으로 암호화됩니다\n\nOrgcell 서버가 해킹되더라도 원본 사진은 안전합니다. 사진은 오직 사용자의 클라우드에만 존재합니다.`,
                },
                {
                    icon: <Trash2 size={20} />,
                    title: '3. 데이터 삭제',
                    body: `사용자는 언제든지 자신의 데이터를 삭제할 수 있습니다:\n\n• 계정 삭제: 설정 > 계정 삭제 — 모든 서버 데이터가 영구 삭제됩니다\n• 얼굴 데이터 삭제: 설정 > 얼굴 데이터 관리에서 개별 삭제 가능\n• 클라우드 사진: 사용자의 클라우드 계정에서 직접 관리\n\n계정 삭제 요청 후 30일 이내에 모든 데이터가 완전히 삭제됩니다.`,
                },
                {
                    icon: <Mail size={20} />,
                    title: '4. 문의',
                    body: `개인정보 관련 문의:\n\n• 이메일: ecocleanlife@gmail.com\n• 운영: ITS Construction LLC\n• 소재지: Virginia, United States`,
                },
            ],
        },
        en: {
            title: 'Privacy Policy',
            lastUpdated: 'Last updated: March 30, 2026',
            switchLang: '한국어',
            back: 'Go back',
            sections: [
                {
                    icon: <Shield size={20} />,
                    title: '1. Information We Collect',
                    body: `Orgcell collects the following information to provide our services:\n\n• Name (for profile display)\n• Email address (for login and notifications)\n• Photo metadata (EXIF: date taken, location — for AI classification)\n• Facial feature vectors (128-dimensional numerical data — for person classification)\n\nFacial feature vectors are mathematical data extracted from photos and cannot be reversed to reconstruct original images.`,
                },
                {
                    icon: <Database size={20} />,
                    title: '2. Storage — BYOS (Bring Your Own Storage)',
                    body: `Orgcell does not store your original photos on our servers.\n\n• Original photos: Stored only in your Google Drive, OneDrive, or Dropbox\n• Server-stored data: Account info, metadata, facial vectors (encrypted)\n• All sensitive data on our servers is encrypted with AES-256\n\nEven if Orgcell servers are compromised, your original photos remain safe. Photos exist only in your cloud storage.`,
                },
                {
                    icon: <Trash2 size={20} />,
                    title: '3. Data Deletion',
                    body: `You can delete your data at any time:\n\n• Account deletion: Settings > Delete Account — all server data is permanently deleted\n• Face data deletion: Settings > Face Data Management for individual deletion\n• Cloud photos: Managed directly in your cloud storage account\n\nAll data is completely deleted within 30 days of an account deletion request.`,
                },
                {
                    icon: <Mail size={20} />,
                    title: '4. Contact',
                    body: `For privacy-related inquiries:\n\n• Email: ecocleanlife@gmail.com\n• Operated by: ITS Construction LLC\n• Location: Virginia, United States`,
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
