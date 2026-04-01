import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useOnboardingStore from '../../store/onboardingStore';
import useAuthStore from '../../store/authStore';
import OnboardingProgress from '../../components/onboarding/OnboardingProgress';

export default function OnboardingInvitePage() {
    const navigate = useNavigate();
    const { setCurrentStep, finishOnboarding } = useOnboardingStore();
    const { user, isAuthenticated } = useAuthStore();

    const [subdomain, setSubdomain] = useState('');
    const [copied, setCopied] = useState(false);
    const [finishing, setFinishing] = useState(false);

    // 온보딩 간소화: invite 페이지 접근 시 대시보드로 리다이렉트
    useEffect(() => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        if (setup.subdomain) {
            finishOnboarding();
            navigate(`/${setup.subdomain}`, { replace: true });
            return;
        }
        if (isAuthenticated) {
            axios.get('/api/sites/mine', { _skipAuthToast: true })
                .then(res => {
                    const sub = res.data?.data?.subdomain;
                    if (sub) {
                        finishOnboarding();
                        navigate(`/${sub}`, { replace: true });
                    }
                })
                .catch(() => {});
        }
    }, [isAuthenticated]);

    useEffect(() => { setCurrentStep('invite'); }, []);

    // 사이트 도메인 가져오기 (리다이렉트 실패 시 폴백)
    useEffect(() => {
        const setup = JSON.parse(localStorage.getItem('orgcell_family_setup') || '{}');
        if (setup.subdomain) {
            setSubdomain(setup.subdomain);
        } else if (isAuthenticated) {
            axios.get('/api/sites/mine', { _skipAuthToast: true })
                .then(res => {
                    const sub = res.data?.data?.subdomain;
                    if (sub) setSubdomain(sub);
                })
                .catch(() => {});
        }
    }, [isAuthenticated]);

    const museumUrl = subdomain ? `orgcell.com/${subdomain}` : 'orgcell.com';
    const fullUrl = `https://${museumUrl}`;

    const copyLink = () => {
        navigator.clipboard.writeText(fullUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    const shareNative = () => {
        if (navigator.share) {
            navigator.share({
                title: '우리 가족 박물관에 초대합니다',
                text: `우리 가족 디지털 박물관을 만들었어요! 방문해보세요: ${fullUrl}`,
                url: fullUrl,
            }).catch(() => {});
        } else {
            copyLink();
        }
    };

    const handleFinish = async () => {
        setFinishing(true);
        finishOnboarding();
        if (subdomain) {
            navigate(`/${subdomain}`, { replace: true });
        } else {
            navigate('/home', { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
            <OnboardingProgress current="invite" />

            <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
                {/* 아이콘 */}
                <div style={{ fontSize: 64, marginBottom: 24, lineHeight: 1 }}>👨‍👩‍👧‍👦</div>

                {/* 제목 */}
                <h1 style={{
                    fontSize: 24, fontWeight: 800, color: '#1E2A0E',
                    fontFamily: 'Georgia, serif', textAlign: 'center',
                    marginBottom: 8, lineHeight: 1.3,
                }}>
                    가족을 초대해볼까요?
                </h1>

                {/* 서브 */}
                <p style={{
                    fontSize: 14, color: '#7A6E5E', textAlign: 'center',
                    marginBottom: 32, lineHeight: 1.6,
                }}>
                    초대 링크를 공유하면<br />
                    가족 누구나 참여할 수 있어요
                </p>

                {/* 박물관 주소 */}
                <div style={{
                    width: '100%', background: '#fff', borderRadius: 14,
                    border: '1px solid #E8E3D8', padding: '16px 20px',
                    textAlign: 'center', marginBottom: 16,
                }}>
                    <p style={{ fontSize: 11, color: '#A09882', marginBottom: 6 }}>내 박물관 주소</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#5A9460', fontFamily: 'Georgia, serif' }}>
                        {museumUrl}
                    </p>
                </div>

                {/* 공유 버튼들 */}
                <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 20 }}>
                    <button
                        onClick={copyLink}
                        style={{
                            flex: 1, height: 44, borderRadius: 12,
                            background: copied ? '#E8F5E9' : '#F5F3EE',
                            border: 'none', fontSize: 14, fontWeight: 600,
                            color: copied ? '#27AE60' : '#3D2008',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        {copied ? '복사됨!' : '링크 복사'}
                    </button>
                    <button
                        onClick={shareNative}
                        style={{
                            flex: 1, height: 44, borderRadius: 12,
                            background: '#F5F3EE', border: 'none',
                            fontSize: 14, fontWeight: 600, color: '#3D2008',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        공유하기
                    </button>
                </div>

                {/* 안내 문구 */}
                <p style={{
                    fontSize: 12, color: '#A09882', textAlign: 'center',
                    lineHeight: 1.6, marginBottom: 32,
                }}>
                    카카오톡, 문자, 이메일 등 어디서든 링크를 보내보세요.<br />
                    나중에 박물관 안에서도 초대할 수 있어요.
                </p>

                {/* 박물관 시작하기 */}
                <button
                    onClick={handleFinish}
                    disabled={finishing}
                    className="active:scale-[0.98]"
                    style={{
                        width: '100%', height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, #4CAF50, #3D9B42)',
                        color: '#fff', fontSize: 17, fontWeight: 700,
                        border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(76,175,80,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    {finishing ? '입장 중...' : '박물관 시작하기'}
                </button>

                {/* 나중에 하기 */}
                <button
                    onClick={handleFinish}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 14, color: '#A09882', marginTop: 12,
                        padding: '8px 0',
                    }}
                >
                    나중에 초대하기
                </button>
            </div>
        </div>
    );
}
