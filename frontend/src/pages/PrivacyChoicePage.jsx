/**
 * PrivacyChoicePage.jsx — 초대받은 가족의 노출 선택 페이지
 *
 * 초대 링크를 타고 들어온 가족에게:
 * 1. 박물관 노출 수락/거절 선택
 * 2. 거절 시 최소 노출 옵션 (이름전체 / 성만 / 익명)
 * 3. 선택 후 → 사진 공유, 정보 수정, 본인 박물관 시작 가이드
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield, Eye, EyeOff, User, UserX, ArrowRight, Camera, Edit3, TreePine } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// 노출 선택 옵션
const PRIVACY_OPTIONS = [
    {
        key: 'full',
        icon: Eye,
        title: '이름 전체 노출',
        desc: '가계도에 본명이 표시됩니다',
        example: '예: 이지섭',
        color: '#4CAF50',
    },
    {
        key: 'surname_only',
        icon: User,
        title: '성만 노출',
        desc: '성씨만 표시되고 이름은 숨겨집니다',
        example: '예: 이씨',
        color: '#FF9800',
    },
    {
        key: 'anonymous',
        icon: UserX,
        title: '익명 처리',
        desc: '이름 없이 관장과의 관계만 표시됩니다',
        example: '예: 장남',
        color: '#9E9E9E',
    },
];

// 선택 후 가이드 액션
const NEXT_ACTIONS = [
    { key: 'photo', icon: Camera, title: '사진 공유하기', desc: '가족 사진을 공유해보세요', path: null },
    { key: 'edit', icon: Edit3, title: '내 정보 수정', desc: '생년월일, 사진 등을 수정하세요', path: null },
    { key: 'museum', icon: TreePine, title: '내 박물관 만들기', desc: '나만의 가족유산박물관을 시작하세요', path: '/onboarding/name' },
];

export default function PrivacyChoicePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('code') || searchParams.get('token');

    const [step, setStep] = useState('choice'); // 'choice' | 'minimal' | 'done'
    const [personInfo, setPersonInfo] = useState(null);
    const [curatorInfo, setCuratorInfo] = useState(null);
    const [museumInfo, setMuseumInfo] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // 초대 정보 로드 (토큰 기반)
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        (async () => {
            try {
                const res = await axios.get(`/api/invite/${token}/info`);
                const data = res.data?.data;
                setPersonInfo(data?.person || { name: '가족 구성원' });
                setCuratorInfo(data?.curator || { name: '관장' });
                setMuseumInfo(data?.museum || {});
            } catch {
                setPersonInfo({ name: '가족 구성원', relationLabel: '' });
                setCuratorInfo({ name: '관장' });
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    // 노출 수락
    const handleAccept = () => {
        setSelectedOption('full');
        handleSubmit('full', true);
    };

    // 노출 거절 → 최소 노출 선택 단계
    const handleRefuse = () => {
        setStep('minimal');
    };

    // 프라이버시 선택 제출
    const handleSubmit = async (option, accepted = false) => {
        setSubmitting(true);
        try {
            await axios.post(`/api/invite/${token}/privacy-choice`, {
                accepted,
                privacy_variant: option,
                relation_label: personInfo?.relationLabel || null,
            });
            setSelectedOption(option);
            setStep('done');
            toast.success('선택이 저장되었습니다');
        } catch {
            // API 없어도 UI 진행 (데모 호환)
            setSelectedOption(option);
            setStep('done');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
                <div className="text-gray-400 text-sm">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans" style={{ background: '#FAFAF7' }}>
            <Helmet>
                <title>박물관 초대 — Orgcell</title>
            </Helmet>

            <div className="max-w-lg mx-auto px-4 py-8">
                {/* 헤더 */}
                <div className="text-center mb-8">
                    <img
                        src="/logo-full.png"
                        alt="Orgcell"
                        style={{ height: 48, objectFit: 'contain', marginBottom: 8 }}
                    />
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                        style={{ background: 'linear-gradient(135deg, #C4A84F, #A88E3A)' }}
                    >
                        <Shield size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#3D2008]">
                        {museumInfo?.name || `${curatorInfo?.name}님의 박물관`}
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        {personInfo?.name}님, 환영합니다
                    </p>
                </div>

                {/* ── Step 1: 수락/거절 ── */}
                {step === 'choice' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #e8e0d0' }}>
                            <p className="text-[15px] text-gray-700 leading-relaxed">
                                <strong>{curatorInfo?.name}</strong>님이 가족유산박물관에 당신의 자리를 마련했습니다.
                                <br /><br />
                                박물관에서 당신의 정보를 어떻게 표시할지 선택해주세요.
                                <br />
                                <span className="text-gray-400 text-xs mt-2 block">
                                    선택은 언제든 변경할 수 있습니다.
                                </span>
                            </p>
                        </div>

                        <button
                            onClick={handleAccept}
                            className="w-full py-4 rounded-xl text-white font-bold text-[15px] transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #C4A84F, #A88E3A)', boxShadow: '0 4px 12px rgba(196,168,79,0.3)' }}
                        >
                            <Eye size={18} />
                            박물관에 참여하기
                        </button>

                        <button
                            onClick={handleRefuse}
                            className="w-full py-4 rounded-xl font-bold text-[15px] transition-all hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center gap-2"
                            style={{ background: '#f5f5f5', color: '#666', border: '1px solid #e0e0e0' }}
                        >
                            <EyeOff size={18} />
                            노출을 원하지 않습니다
                        </button>
                    </div>
                )}

                {/* ── Step 2: 최소 노출 선택 ── */}
                {step === 'minimal' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #e8e0d0' }}>
                            <p className="text-[14px] text-gray-600 leading-relaxed">
                                가계도의 구조를 유지하기 위해,<br />
                                <strong>최소한의 표시 방식</strong>을 선택해주세요.
                            </p>
                        </div>

                        {PRIVACY_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.key}
                                    onClick={() => handleSubmit(opt.key)}
                                    disabled={submitting}
                                    className="w-full bg-white rounded-xl p-4 text-left transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50 flex items-start gap-4"
                                    style={{ border: '1px solid #e8e0d0' }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                        style={{ background: `${opt.color}15`, color: opt.color }}
                                    >
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[14px] text-[#3D2008]">{opt.title}</div>
                                        <div className="text-[12px] text-gray-500 mt-0.5">{opt.desc}</div>
                                        <div
                                            className="mt-2 px-2.5 py-1 rounded-md text-[11px] font-mono inline-block"
                                            style={{ background: '#FAFAF2', color: '#7a6e5e', border: '1px solid #e8e0d0' }}
                                        >
                                            {opt.example}
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-gray-300 mt-3 shrink-0" />
                                </button>
                            );
                        })}

                        <button
                            onClick={() => setStep('choice')}
                            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ← 돌아가기
                        </button>
                    </div>
                )}

                {/* ── Step 3: 완료 + 다음 액션 가이드 ── */}
                {step === 'done' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-6 text-center shadow-sm" style={{ border: '1px solid #e8e0d0' }}>
                            <div className="text-4xl mb-3">
                                {selectedOption === 'full' ? '🎉' : selectedOption === 'surname_only' ? '🔒' : '👤'}
                            </div>
                            <h3 className="text-lg font-bold text-[#3D2008] mb-1">선택이 완료되었습니다</h3>
                            <p className="text-sm text-gray-500">
                                {selectedOption === 'full' && '박물관에서 본명으로 표시됩니다'}
                                {selectedOption === 'surname_only' && '성씨만 표시됩니다'}
                                {selectedOption === 'anonymous' && '관계만 표시되며 이름은 숨겨집니다'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                                다음으로 해보세요
                            </h4>
                            {NEXT_ACTIONS.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.key}
                                        onClick={() => {
                                            if (action.path) navigate(action.path);
                                            else toast('곧 지원될 기능입니다', { icon: '🔜' });
                                        }}
                                        className="w-full bg-white rounded-xl p-4 mb-2 text-left transition-all hover:shadow-md active:scale-[0.98] flex items-center gap-3"
                                        style={{ border: '1px solid #e8e0d0' }}
                                    >
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FFF8E7', color: '#C4A84F' }}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-[13px] text-[#3D2008]">{action.title}</div>
                                            <div className="text-[11px] text-gray-400">{action.desc}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-300 shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
