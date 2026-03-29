import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// 로그인 없이 접근 가능한 온보딩 페이지
const PUBLIC_STEPS = ['/onboarding/service', '/onboarding/storage'];

export default function OnboardingGuard({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore(state => state.token);

    const isPublic = PUBLIC_STEPS.some(p => location.pathname.startsWith(p));

    useEffect(() => {
        if (!token && !isPublic) {
            // 로그인 후 원래 페이지로 돌아오기
            const returnUrl = location.pathname + location.search;
            navigate(`/auth/login?redirect=${encodeURIComponent(returnUrl)}`, { replace: true });
        }
    }, [token, isPublic, location, navigate]);

    // 비로그인 + 보호된 페이지 → 렌더링 안 함
    if (!token && !isPublic) {
        return null;
    }

    return children;
}
