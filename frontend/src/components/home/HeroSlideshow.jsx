import React, { useState, useEffect, useCallback } from 'react';

const SLIDES = [
    {
        url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
        alt: '가족 사진 - 함께하는 시간',
        badge: '가족공개',
        badgeColor: '#27AE60',
    },
    {
        url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600&h=400&fit=crop',
        alt: '가족 사진 - 세대를 잇는 기록',
        badge: '일반공개',
        badgeColor: '#3498DB',
    },
    {
        url: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=400&fit=crop',
        alt: '가족 사진 - 소중한 순간',
        badge: '가족공개',
        badgeColor: '#27AE60',
    },
    {
        url: 'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=600&h=400&fit=crop',
        alt: '가족 사진 - 추억의 기록',
        badge: '본인보관',
        badgeColor: '#95A5A6',
    },
];

export default function HeroSlideshow() {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => {
        setCurrent(prev => (prev + 1) % SLIDES.length);
    }, []);

    useEffect(() => {
        const timer = setInterval(next, 3500);
        return () => clearInterval(timer);
    }, [next]);

    return (
        <div style={{
            position: 'relative', maxWidth: 380, width: '100%',
            margin: '0 auto', borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(61,32,8,0.1)',
            border: '1px solid #E8E3D8',
            aspectRatio: '3 / 2',
        }}>
            {SLIDES.map((slide, i) => (
                <div key={i} style={{
                    position: 'absolute', inset: 0,
                    opacity: i === current ? 1 : 0,
                    transition: 'opacity 0.8s ease',
                }}>
                    <img
                        src={slide.url}
                        alt={slide.alt}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* 공개범위 뱃지 */}
                    <span style={{
                        position: 'absolute', top: 12, right: 12,
                        background: slide.badgeColor,
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                        {slide.badge}
                    </span>
                </div>
            ))}

            {/* 하단 그라디언트 */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.3))',
                pointerEvents: 'none',
            }} />

            {/* 인디케이터 */}
            <div style={{
                position: 'absolute', bottom: 10, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 6,
            }}>
                {SLIDES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrent(i)}
                        style={{
                            width: i === current ? 20 : 6, height: 6,
                            borderRadius: 3, border: 'none', cursor: 'pointer',
                            background: i === current ? '#fff' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.3s',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
