/**
 * useMediaQuery.js — 미디어 쿼리 반응형 훅
 *
 * PC/모바일 감지:
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const isTouch  = useMediaQuery('(pointer: coarse)');
 */
import { useState, useEffect } from 'react';

export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        const mql = window.matchMedia(query);
        const handler = (e) => setMatches(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [query]);

    return matches;
}
