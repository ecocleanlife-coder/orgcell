import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import axios from 'axios';

const SURNAME_DATA = {
    '김': 3200000, '이': 2800000, '박': 1900000,
    '최': 980000, '정': 870000, '강': 540000,
    '조': 480000, '윤': 420000, '장': 390000,
    '임': 360000, '한': 320000, '오': 280000,
    '서': 260000, '신': 240000, '권': 220000,
    '황': 200000, '안': 190000, '송': 180000,
    '류': 170000, '전': 160000, '홍': 150000,
    '고': 140000, '문': 130000, '양': 120000,
    '손': 110000, '배': 100000, '백': 95000,
    '허': 90000, '유': 85000, '남': 80000,
    '심': 75000, '노': 70000, '하': 65000,
    smith: 4200000, johnson: 3800000,
    lee: 2100000, kim: 1900000,
    park: 1200000, choi: 890000,
    wang: 1100000, chen: 950000,
    nguyen: 820000, garcia: 760000,
};

const DEFAULT_COUNT = 50000;

function useCountUp(target, duration = 1000) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (target <= 0) { setValue(0); return; }
        const start = performance.now();
        const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(target * eased));
            if (progress < 1) rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target, duration]);

    return value;
}

function formatNumber(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}K`;
    return n.toLocaleString();
}

export default function FamilySearchModal({ onClose }) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [surname, setSurname] = useState('');
    const [targetCount, setTargetCount] = useState(0);
    const [hasSite, setHasSite] = useState(null);
    const animatedCount = useCountUp(targetCount);

    // 로그인 상태면 사이트 확인
    useEffect(() => {
        if (!isAuthenticated) { setHasSite(false); return; }
        axios.get('/api/sites/mine', { _skipAuthToast: true })
            .then(({ data }) => setHasSite(!!data.data?.subdomain))
            .catch(() => setHasSite(false));
    }, [isAuthenticated]);

    const handleSurnameChange = (val) => {
        setSurname(val);
        const key = val.trim().toLowerCase();
        const match = SURNAME_DATA[key] || SURNAME_DATA[val.trim()];
        setTargetCount(match || (key.length > 0 ? DEFAULT_COUNT : 0));
    };

    const handleAction = () => {
        onClose();
        if (!isAuthenticated) {
            navigate('/onboarding/name');
        } else if (hasSite) {
            navigate('/familysearch-callback');
        } else {
            navigate('/onboarding/name');
        }
    };

    const actionLabel = !isAuthenticated
        ? '무료로 시작하기'
        : hasSite
            ? '내 가족트리에 연동'
            : '박물관 먼저 만들기';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'fsmFadeIn 0.3s ease' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
                style={{ background: '#FAFAF7', border: '1px solid #E8E3D8', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 닫기 */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10"
                    style={{ background: 'rgba(0,0,0,0.05)' }}
                >
                    <X size={16} style={{ color: '#7A6E5E' }} />
                </button>

                {/* 상단 일러스트 영역 */}
                <div className="text-center pt-8 pb-4 px-6" style={{ background: 'linear-gradient(180deg, #EBF4FB, #FAFAF7)' }}>
                    <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>🌳</div>
                    <h2 style={{
                        fontSize: 22, fontWeight: 800, color: '#1E2A0E',
                        fontFamily: 'Georgia, serif', lineHeight: 1.35,
                    }}>
                        수백 년 전 조상까지<br />자동으로 연결됩니다
                    </h2>
                    <p style={{ fontSize: 14, color: '#7A6E5E', marginTop: 8, lineHeight: 1.6 }}>
                        FamilySearch.org의 10억 건 이상<br />전 세계 족보 데이터베이스
                    </p>
                </div>

                {/* 성씨 입력 + 동적 프리뷰 */}
                <div className="px-6 pb-6">
                    <label className="block mb-2 mt-2" style={{ fontSize: 14, fontWeight: 600, color: '#3D2008' }}>
                        성씨를 입력해보세요
                    </label>
                    <input
                        type="text"
                        value={surname}
                        onChange={(e) => handleSurnameChange(e.target.value)}
                        placeholder="예: 김, Lee, Smith"
                        maxLength={20}
                        className="w-full"
                        style={{
                            height: 52, borderRadius: 14,
                            border: '2px solid #E8E3D8', padding: '0 16px',
                            fontSize: 18, fontFamily: 'Georgia, serif',
                            color: '#3D2008', background: '#fff', outline: 'none',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#4A8DB7'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#E8E3D8'; }}
                    />

                    {/* 건수 프리뷰 */}
                    {targetCount > 0 && (
                        <div
                            className="mt-4 rounded-xl p-4 text-center"
                            style={{ background: '#EBF4FB', border: '1px solid #D0E8F5', animation: 'fsmSlideUp 0.4s ease' }}
                        >
                            <p style={{ fontSize: 13, color: '#4A8DB7', marginBottom: 4, fontWeight: 600 }}>
                                "{surname.trim()}" 관련 기록
                            </p>
                            <p style={{
                                fontSize: 36, fontWeight: 800, color: '#2A6B8A',
                                fontFamily: 'Georgia, serif', lineHeight: 1,
                            }}>
                                {animatedCount > 0 ? formatNumber(animatedCount) : '...'}
                            </p>
                            <p style={{ fontSize: 12, color: '#7EB8D4', marginTop: 4 }}>
                                건 이상의 조상 기록이 발견되었습니다
                            </p>
                        </div>
                    )}

                    {/* CTA 버튼 */}
                    <button
                        onClick={handleAction}
                        className="w-full active:scale-[0.97] mt-5"
                        style={{
                            height: 54, borderRadius: 14,
                            background: 'linear-gradient(135deg, #4A8DB7, #3A7DA7)',
                            color: '#fff', fontSize: 17, fontWeight: 700,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(74,141,183,0.3)',
                        }}
                    >
                        {actionLabel}
                    </button>

                    <p className="text-center mt-3" style={{ fontSize: 11, color: '#A09882', lineHeight: 1.5 }}>
                        FamilySearch.org는 비영리 단체가 운영하는<br />무료 족보 서비스입니다
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes fsmFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fsmSlideUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
