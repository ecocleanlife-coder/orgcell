import { Globe, Lock, User } from 'lucide-react';

export const VISIBILITY = {
    PUBLIC: 'public',
    FAMILY: 'family',
    PRIVATE: 'private',
};

const INFO = {
    public: {
        label: '일반공개',
        shortLabel: '공개',
        icon: Globe,
        bg: '#e8f5e0',
        color: '#3a7a2a',
        description: '누구나 방문 가능',
    },
    family: {
        label: '가족공개',
        shortLabel: '가족만',
        icon: Lock,
        bg: '#f0eaf8',
        color: '#7a3a9a',
        description: '초대된 가족만 열람',
    },
    private: {
        label: '나만 보기',
        shortLabel: '나만',
        icon: User,
        bg: '#f0f0f0',
        color: '#5a5a5a',
        description: '나만 열람 가능',
    },
};

const FALLBACK = INFO.private;

/**
 * 열람 가능 여부 판단
 * @param {'public'|'family'|'private'} visibility - 콘텐츠 공개범위
 * @param {'owner'|'family'|'public'} userRole - 현재 사용자 역할
 */
export function canView(visibility, userRole) {
    if (userRole === 'owner') return true;
    if (visibility === 'public') return true;
    if (visibility === 'family' && (userRole === 'family' || userRole === 'owner')) return true;
    return false;
}

/**
 * visibility에 해당하는 라벨, 아이콘, 색상 반환
 * @param {'public'|'family'|'private'} visibility
 */
export function getVisibilityInfo(visibility) {
    return INFO[visibility] || FALLBACK;
}

/**
 * React 훅 — 컴포넌트 내에서 사용
 */
export function useVisibility() {
    return { canView, getVisibilityInfo, VISIBILITY, VIS_OPTIONS: INFO };
}

export default useVisibility;
