/**
 * WormholeTransition.jsx — 가문 전환 애니메이션
 *
 * 타가문 클릭 시:
 *   1단계 (0.3s): 현재 카드들 회전+흩어짐 (scatter)
 *   2단계 (0.1s): 빈 화면
 *   3단계 (0.4s): 새 카드들이 사방에서 날아와 착지 (gather, staggered)
 *
 * @media prefers-reduced-motion 적용
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';

const SCATTER_MS = 300;
const BLANK_MS = 100;
const GATHER_MS = 400;
const TOTAL_MS = SCATTER_MS + BLANK_MS + GATHER_MS;

// ── 랜덤 흩어짐 방향 생성 ──
function randomScatter() {
    const angle = Math.random() * 360;
    const dist = 300 + Math.random() * 400;
    const tx = Math.cos(angle * Math.PI / 180) * dist;
    const ty = Math.sin(angle * Math.PI / 180) * dist;
    const rotY = (Math.random() - 0.5) * 180;
    return { tx, ty, rotY };
}

// ── 착지 방향 (위/아래/좌/우) ──
const GATHER_DIRS = [
    { tx: 0, ty: -600 },   // 위
    { tx: 0, ty: 600 },    // 아래
    { tx: -600, ty: 0 },   // 좌
    { tx: 600, ty: 0 },    // 우
];

function randomGather() {
    const dir = GATHER_DIRS[Math.floor(Math.random() * GATHER_DIRS.length)];
    return { ...dir };
}

/**
 * Wormhole 전환 상태 관리 Hook
 * @param {function} onTransition - (newMainId) => void, 트리 재구성 콜백
 */
export function useWormholeTransition(onTransition) {
    const [phase, setPhase] = useState('idle'); // idle | scatter | blank | gather
    const [pendingMainId, setPendingMainId] = useState(null);

    const trigger = useCallback((newMainId) => {
        if (phase !== 'idle') return;

        setPendingMainId(newMainId);
        setPhase('scatter');

        // 1단계: scatter (0.3s)
        setTimeout(() => {
            setPhase('blank');
            // 데이터 교체
            onTransition(newMainId);

            // 2단계: blank (0.1s)
            setTimeout(() => {
                setPhase('gather');

                // 3단계: gather (0.4s)
                setTimeout(() => {
                    setPhase('idle');
                    setPendingMainId(null);
                }, GATHER_MS);
            }, BLANK_MS);
        }, SCATTER_MS);
    }, [phase, onTransition]);

    return { phase, pendingMainId, trigger };
}

/**
 * WormholeWrapper — 캔버스에 scatter/gather 애니메이션 적용
 *
 * children은 FamilyTreeCanvas 전체.
 * scatter/gather 시 CSS 클래스로 개별 카드에 애니메이션 적용.
 */
export function WormholeWrapper({ phase, children }) {
    const wrapperRef = useRef(null);
    const scatterMapRef = useRef(new Map());
    const gatherMapRef = useRef(new Map());

    // prefers-reduced-motion 체크
    const [reducedMotion, setReducedMotion] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // scatter 시작 시 각 카드에 랜덤 방향 부여
    useEffect(() => {
        if (phase !== 'scatter' || !wrapperRef.current || reducedMotion) return;
        const cards = wrapperRef.current.querySelectorAll('[data-person-id]');
        const map = new Map();
        cards.forEach(card => {
            map.set(card.dataset.personId, randomScatter());
        });
        scatterMapRef.current = map;
    }, [phase, reducedMotion]);

    // gather 시작 시 각 카드에 출발 방향 부여
    useEffect(() => {
        if (phase !== 'gather' || !wrapperRef.current || reducedMotion) return;
        const cards = wrapperRef.current.querySelectorAll('[data-person-id]');
        const map = new Map();
        let idx = 0;
        cards.forEach(card => {
            map.set(card.dataset.personId, { ...randomGather(), delay: idx * 30 });
            idx++;
        });
        gatherMapRef.current = map;
    }, [phase, reducedMotion]);

    // reduced motion: 단순 opacity 전환
    if (reducedMotion) {
        return (
            <div
                ref={wrapperRef}
                style={{
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    opacity: phase === 'blank' ? 0 : 1,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {children}
            </div>
        );
    }

    return (
        <div
            ref={wrapperRef}
            style={{
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
            }}
        >
            <style>{`
                @keyframes wormhole-scatter {
                    0% {
                        transform: translate(0, 0) rotateY(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(var(--scatter-tx), var(--scatter-ty)) rotateY(var(--scatter-rot));
                        opacity: 0;
                    }
                }
                @keyframes wormhole-gather {
                    0% {
                        transform: translate(var(--gather-tx), var(--gather-ty)) scale(0.8);
                        opacity: 0;
                    }
                    70% {
                        opacity: 1;
                    }
                    100% {
                        transform: translate(0, 0) scale(1);
                        opacity: 1;
                    }
                }
            `}</style>
            <WormholeAnimator
                phase={phase}
                wrapperRef={wrapperRef}
                scatterMap={scatterMapRef.current}
                gatherMap={gatherMapRef.current}
            />
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    opacity: phase === 'blank' ? 0 : 1,
                    transition: phase === 'blank' ? 'opacity 0.05s' : 'none',
                }}
            >
                {children}
            </div>
        </div>
    );
}

/**
 * WormholeAnimator — DOM에 직접 animation style 주입
 */
function WormholeAnimator({ phase, wrapperRef, scatterMap, gatherMap }) {
    useEffect(() => {
        if (!wrapperRef.current) return;
        const cards = wrapperRef.current.querySelectorAll('[data-person-id]');

        if (phase === 'scatter') {
            cards.forEach(card => {
                const pid = card.dataset.personId;
                const s = scatterMap.get(pid) || randomScatter();
                card.style.setProperty('--scatter-tx', `${s.tx}px`);
                card.style.setProperty('--scatter-ty', `${s.ty}px`);
                card.style.setProperty('--scatter-rot', `${s.rotY}deg`);
                card.style.animation = `wormhole-scatter ${SCATTER_MS}ms ease-in forwards`;
            });
        } else if (phase === 'gather') {
            cards.forEach(card => {
                const pid = card.dataset.personId;
                const g = gatherMap.get(pid) || randomGather();
                card.style.setProperty('--gather-tx', `${g.tx}px`);
                card.style.setProperty('--gather-ty', `${g.ty}px`);
                card.style.animation = `wormhole-gather ${GATHER_MS}ms ease-out ${g.delay || 0}ms forwards`;
            });
        } else if (phase === 'idle') {
            cards.forEach(card => {
                card.style.animation = '';
                card.style.removeProperty('--scatter-tx');
                card.style.removeProperty('--scatter-ty');
                card.style.removeProperty('--scatter-rot');
                card.style.removeProperty('--gather-tx');
                card.style.removeProperty('--gather-ty');
            });
        }
    }, [phase, wrapperRef, scatterMap, gatherMap]);

    return null;
}

/**
 * 부모 데이터 없는 인물에 placeholder 부모 자동 생성
 *
 * @param {Array} persons - 인물 배열
 * @param {Array} relations - 관계 배열
 * @param {string|number} targetId - 부모가 없는 인물 ID
 * @returns {{ persons: Array, relations: Array }} - placeholder 추가된 데이터
 */
export function generatePlaceholderParents(persons, relations, targetId) {
    const target = persons.find(p => String(p.id) === String(targetId));
    if (!target) return { persons, relations };

    // 이미 부모가 있는지 확인
    const hasParent = relations.some(
        r => r.relation_type === 'parent' && String(r.person2_id) === String(targetId)
    );
    if (hasParent) return { persons, relations };

    const maxId = Math.max(...persons.map(p => Number(p.id) || 0), 0);

    const fatherId = maxId + 9001;
    const motherId = maxId + 9002;

    const father = {
        id: fatherId,
        name: `${target.name}의 부`,
        gender: 'male',
        generation: (target.generation || 0) + 1,
        is_placeholder: true,
        privacy_level: 'private',
    };

    const mother = {
        id: motherId,
        name: `${target.name}의 모`,
        gender: 'female',
        generation: (target.generation || 0) + 1,
        is_placeholder: true,
        privacy_level: 'private',
    };

    const newRelations = [
        { person1_id: fatherId, person2_id: targetId, relation_type: 'parent' },
        { person1_id: motherId, person2_id: targetId, relation_type: 'parent' },
        { person1_id: fatherId, person2_id: motherId, relation_type: 'spouse' },
    ];

    return {
        persons: [...persons, father, mother],
        relations: [...relations, ...newRelations],
    };
}
