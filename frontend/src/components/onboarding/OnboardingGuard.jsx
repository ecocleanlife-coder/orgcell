import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

// 로그인 없이 접근 가능한 온보딩 페이지
const PUBLIC_STEPS = ['/onboarding/service', '/onboarding/storage'];

export default function OnboardingGuard({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    const isPublic = PUBLIC_STEPS.some(p => location.pathname.startsWith(p));

    useEffect(() => {
        if (!isAuthenticated && !isPublic) {
            // 로그인 후 원래 페이지로 돌아오기
            const returnUrl = location.pathname + location.search;
            navigate(`/auth/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
        }
    }, [isAuthenticated, isPublic, location, navigate]);

    // 비로그인 + 보호된 페이지 → 렌더링 안 함
    if (!isAuthenticated && !isPublic) {
        return null;
    }

    return children;
}
