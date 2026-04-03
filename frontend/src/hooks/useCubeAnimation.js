/**
 * useCubeAnimation.js — 3D 큐브 간판 자동 순환 애니메이션
 *
 * 모바일에서 hover가 없으므로 간판 메뉴를 자동 순환:
 * - active=true 시 interval마다 다음 아이템 하이라이트
 * - active=false 시 정지 (인덱스 리셋)
 * - 사용자가 터치하면 순환 일시정지 (pause)
 */
import { useState, useEffect, useCallback } from 'react';

export default function useCubeAnimation(itemCount, {
    interval = 2500,
    active = false,
    pauseOnInteract = true,
} = {}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    // 활성화 해제 시 리셋
    useEffect(() => {
        if (!active) {
            setActiveIndex(0);
            setPaused(false);
        }
    }, [active]);

    // 자동 순환
    useEffect(() => {
        if (!active || paused || itemCount <= 0) return;
        const id = setInterval(() => {
            setActiveIndex((i) => (i + 1) % itemCount);
        }, interval);
        return () => clearInterval(id);
    }, [active, paused, itemCount, interval]);

    // 터치 시 일시정지 → 3초 후 자동 재개
    const handleInteract = useCallback(() => {
        if (!pauseOnInteract) return;
        setPaused(true);
        const id = setTimeout(() => setPaused(false), 3000);
        return () => clearTimeout(id);
    }, [pauseOnInteract]);

    return { activeIndex, paused, handleInteract };
}
