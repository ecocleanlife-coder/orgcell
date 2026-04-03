/**
 * DevCardPreview — FolderCard 개발자 프리뷰 페이지
 * 경로: /dev/cards (인증 불필요)
 * 프로덕션 배포 전 제거할 것
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import FolderCard from '../components/museum/FolderCard';
import CoupleBlock from '../components/museum/CoupleBlock';
import FamilyTreeCanvas from '../components/museum/FamilyTreeCanvas';
import PersonEditModal from '../components/museum/PersonEditModal';
import ExhibitModal from '../components/museum/ExhibitModal';
import InviteModal from '../components/museum/InviteModal';
import { buildTree } from '../utils/buildTree';

// ── 공통 노드 데이터 팩토리 ──
function makeNode(id, overrides = {}) {
    const base = {
        id, x: 0, y: 0, depth: 0, z: 0, zOpacity: 1.0, zScale: 1.0,
        data: {
            displayName: '이한봉', firstName: '한봉', lastName: '이',
            gender: 'M', initials: '이한', birthday: '1964-01-12',
            avatar: '', photoPosition: { x: 50, y: 50 },
            dateLabel: '', isDeceased: false,
            birthLunar: false, deathLunar: false,
            fsPersonId: '', privacyLevel: 'family',
        },
        rels: { parents: [], spouses: [], children: [] },
    };
    return {
        ...base,
        ...overrides,
        data: { ...base.data, ...(overrides.data || {}) },
    };
}

// ── Photo Front 샘플 (Unsplash 무료 이미지) ──
const PHOTO_NODES = [
    makeNode('p1', {
        data: {
            displayName: '김영수',
            gender: 'M', initials: '김영',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
            dateLabel: '1958 ~ 2015', isDeceased: true,
        },
    }),
    makeNode('p2', {
        data: {
            displayName: '박은주',
            gender: 'F', initials: '박은',
            avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
            dateLabel: '',
        },
    }),
    makeNode('p3', {
        data: {
            displayName: 'John Lambert',
            gender: 'M', initials: 'JL',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
            dateLabel: '',
        },
    }),
];

// ── Canvas Front 샘플 (사진 없음) ──
const CANVAS_NODES = [
    makeNode('c1', {
        data: {
            displayName: '이한봉', gender: 'M', initials: '이한',
            dateLabel: '',
        },
    }),
    makeNode('c2', {
        data: {
            displayName: '공우영', gender: 'F', initials: '공우',
            dateLabel: '',
        },
    }),
    makeNode('c3', {
        data: {
            displayName: '이순호', gender: 'M', initials: '이순',
            dateLabel: '1936 ~ 2010', isDeceased: true,
        },
    }),
    makeNode('c4', {
        data: {
            displayName: '임윤님', gender: 'F', initials: '임윤',
            dateLabel: '1938 ~ 2018', isDeceased: true,
        },
    }),
];

// ── Z 레이어 비교 ──
const Z_NODES = [
    makeNode('z0', { z: 0, zOpacity: 1.0, zScale: 1.0, data: { displayName: '현재 가문 (Z=0)', gender: 'M' } }),
    makeNode('z1', { z: 1, zOpacity: 0.4, zScale: 0.85, data: { displayName: '사돈 가문 (Z=1)', gender: 'M', dateLabel: 'Silhouette' } }),
    makeNode('z2', { z: 2, zOpacity: 0.15, zScale: 0.7, data: { displayName: '먼 인연 (Z=2)', gender: 'M', dateLabel: 'Fog' } }),
];

// ── EC2 실제 데이터 (site_id=2, 이한봉 가족 28명) ──
const EC2_PERSONS = [
    { id: 16, name: '이한봉', gender: 'male', generation: 1, birth_date: '1964-01-12' },
    { id: 17, name: '공우영', gender: 'female', generation: 1, birth_date: '1960-04-02' },
    { id: 18, name: '이슬기', gender: 'female', generation: 0, birth_date: '1988-09-08', death_date: '1990-07-12', is_deceased: true },
    { id: 19, name: '이상훈', gender: 'male', generation: 0, birth_date: '1989-12-14' },
    { id: 20, name: '이하영', gender: 'female', generation: 0, birth_date: '1992-03-09' },
    { id: 21, name: '이유경', gender: 'female', generation: 0, birth_date: '1994-07-27' },
    { id: 22, name: '신세라', gender: 'female', generation: 0 },
    { id: 23, name: 'john Lambert', gender: 'male', generation: 0 },
    { id: 24, name: '공인영', gender: 'male', generation: 1 },
    { id: 25, name: '공진영', gender: 'male', generation: 1 },
    { id: 26, name: '공수자', gender: 'female', generation: 1 },
    { id: 27, name: '공정영', gender: 'female', generation: 1 },
    { id: 28, name: '이지섭 Peter', gender: 'male', generation: 0 },
    { id: 29, name: '이은섭/ Lucas', gender: 'male', generation: 0 },
    { id: 32, name: 'Daniel Lee Lambert', gender: 'male', generation: 0 },
    { id: 33, name: '이순호', gender: 'male', generation: 2 },
    { id: 34, name: '임윤님', gender: 'female', generation: 2, birth_date: '1936-03-21' },
    { id: 35, name: '이은미', gender: 'female', generation: 1 },
    { id: 36, name: '이선미', gender: 'female', generation: 1 },
    { id: 37, name: '공석환', gender: 'male', generation: 2 },
    { id: 38, name: '민임분', gender: 'female', generation: 2 },
    // ── 이은미 가족 ──
    { id: 40, name: '배상기', gender: 'male', generation: 1 },       // 이은미의 남편
    { id: 41, name: '배정일', gender: 'male', generation: 0 },       // 이은미+배상기 자녀
    { id: 42, name: '배창일', gender: 'male', generation: 0 },       // 이은미+배상기 자녀
    // ── 이선미 가족 ──
    { id: 43, name: '정홍교', gender: 'male', generation: 1 },       // 이선미의 남편
    { id: 44, name: '정애현', gender: 'female', generation: 0 },     // 이선미+정홍교 자녀
    { id: 45, name: '정의건', gender: 'male', generation: 0 },       // 이선미+정홍교 자녀
    { id: 46, name: '정의준', gender: 'male', generation: 0 },       // 이선미+정홍교 자녀
    // ── 신세라 가족 (Z=1 타가문, 웜홀 전환 대상) ──
    { id: 50, name: '신영근', gender: 'male', generation: 2 },       // 신세라의 아버지
    { id: 51, name: '김인자', gender: 'female', generation: 2 },     // 신세라의 어머니
    { id: 52, name: '신라라', gender: 'female', generation: 1 },     // 신세라의 자매
    { id: 53, name: '신희라', gender: 'female', generation: 1 },     // 신세라의 자매
    { id: 54, name: '신정인', gender: 'female', generation: 1 },     // 신세라의 자매
];

const EC2_RELATIONS = [
    { person1_id: 18, person2_id: 19, relation_type: 'sibling' },
    { person1_id: 18, person2_id: 20, relation_type: 'sibling' },
    { person1_id: 18, person2_id: 21, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 24, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 25, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 26, relation_type: 'sibling' },
    { person1_id: 17, person2_id: 27, relation_type: 'sibling' },
    { person1_id: 16, person2_id: 35, relation_type: 'sibling' },
    { person1_id: 16, person2_id: 36, relation_type: 'sibling' },
    { person1_id: 37, person2_id: 17, relation_type: 'parent' },
    { person1_id: 19, person2_id: 29, relation_type: 'parent' },
    { person1_id: 19, person2_id: 28, relation_type: 'parent' },
    { person1_id: 23, person2_id: 32, relation_type: 'parent' },
    { person1_id: 33, person2_id: 16, relation_type: 'parent' },
    { person1_id: 33, person2_id: 35, relation_type: 'parent' },
    { person1_id: 16, person2_id: 18, relation_type: 'parent' },
    { person1_id: 16, person2_id: 21, relation_type: 'parent' },
    { person1_id: 16, person2_id: 19, relation_type: 'parent' },
    { person1_id: 16, person2_id: 20, relation_type: 'parent' },
    { person1_id: 33, person2_id: 36, relation_type: 'parent' },
    { person1_id: 37, person2_id: 24, relation_type: 'parent' },
    { person1_id: 37, person2_id: 25, relation_type: 'parent' },
    { person1_id: 37, person2_id: 26, relation_type: 'parent' },
    { person1_id: 37, person2_id: 27, relation_type: 'parent' },
    { person1_id: 38, person2_id: 17, relation_type: 'parent' },
    { person1_id: 22, person2_id: 29, relation_type: 'parent' },
    { person1_id: 22, person2_id: 28, relation_type: 'parent' },
    { person1_id: 20, person2_id: 32, relation_type: 'parent' },
    { person1_id: 34, person2_id: 16, relation_type: 'parent' },
    { person1_id: 34, person2_id: 35, relation_type: 'parent' },
    { person1_id: 17, person2_id: 18, relation_type: 'parent' },
    { person1_id: 17, person2_id: 21, relation_type: 'parent' },
    { person1_id: 17, person2_id: 19, relation_type: 'parent' },
    { person1_id: 17, person2_id: 20, relation_type: 'parent' },
    { person1_id: 34, person2_id: 36, relation_type: 'parent' },
    { person1_id: 38, person2_id: 24, relation_type: 'parent' },
    { person1_id: 38, person2_id: 25, relation_type: 'parent' },
    { person1_id: 38, person2_id: 26, relation_type: 'parent' },
    { person1_id: 38, person2_id: 27, relation_type: 'parent' },
    { person1_id: 33, person2_id: 34, relation_type: 'spouse' },
    { person1_id: 16, person2_id: 17, relation_type: 'spouse' },
    { person1_id: 19, person2_id: 22, relation_type: 'spouse' },
    { person1_id: 20, person2_id: 23, relation_type: 'spouse' },
    { person1_id: 37, person2_id: 38, relation_type: 'spouse' },
    // ── 이은미+배상기 ──
    { person1_id: 35, person2_id: 40, relation_type: 'spouse' },     // 이은미 ↔ 배상기
    { person1_id: 35, person2_id: 41, relation_type: 'parent' },     // 이은미 → 배정일
    { person1_id: 40, person2_id: 41, relation_type: 'parent' },     // 배상기 → 배정일
    { person1_id: 35, person2_id: 42, relation_type: 'parent' },     // 이은미 → 배창일
    { person1_id: 40, person2_id: 42, relation_type: 'parent' },     // 배상기 → 배창일
    // ── 이선미+정홍교 ──
    { person1_id: 36, person2_id: 43, relation_type: 'spouse' },     // 이선미 ↔ 정홍교
    { person1_id: 36, person2_id: 44, relation_type: 'parent' },     // 이선미 → 정애현
    { person1_id: 43, person2_id: 44, relation_type: 'parent' },     // 정홍교 → 정애현
    { person1_id: 36, person2_id: 45, relation_type: 'parent' },     // 이선미 → 정의건
    { person1_id: 43, person2_id: 45, relation_type: 'parent' },     // 정홍교 → 정의건
    { person1_id: 36, person2_id: 46, relation_type: 'parent' },     // 이선미 → 정의준
    { person1_id: 43, person2_id: 46, relation_type: 'parent' },     // 정홍교 → 정의준
    // ── 신세라 가족 ──
    { person1_id: 50, person2_id: 51, relation_type: 'spouse' },     // 신영근 ↔ 김인자
    { person1_id: 50, person2_id: 22, relation_type: 'parent' },     // 신영근 → 신세라
    { person1_id: 51, person2_id: 22, relation_type: 'parent' },     // 김인자 → 신세라
    { person1_id: 50, person2_id: 52, relation_type: 'parent' },     // 신영근 → 신라라
    { person1_id: 51, person2_id: 52, relation_type: 'parent' },     // 김인자 → 신라라
    { person1_id: 50, person2_id: 53, relation_type: 'parent' },     // 신영근 → 신희라
    { person1_id: 51, person2_id: 53, relation_type: 'parent' },     // 김인자 → 신희라
    { person1_id: 50, person2_id: 54, relation_type: 'parent' },     // 신영근 → 신정인
    { person1_id: 51, person2_id: 54, relation_type: 'parent' },     // 김인자 → 신정인
];

export default function DevCardPreview() {
    const [searchParams] = useSearchParams();
    const siteId = searchParams.get('siteId');

    const [selectedId, setSelectedId] = useState(null);
    const [mainPersonId, setMainPersonId] = useState(null);
    const [persons, setPersons] = useState(siteId ? [] : EC2_PERSONS);
    const [relations, setRelations] = useState(siteId ? [] : EC2_RELATIONS);
    const [apiLoading, setApiLoading] = useState(!!siteId);

    // 실서버 API에서 데이터 로드 (siteId가 있을 때만)
    useEffect(() => {
        if (!siteId) return;
        setApiLoading(true);
        const noCache = { headers: { 'Cache-Control': 'no-cache' } };
        Promise.all([
            axios.get(`/api/persons/${siteId}`, noCache),
            axios.get(`/api/persons/${siteId}/relations`, noCache).catch(() => ({ data: { data: [] } })),
        ])
            .then(([personsRes, relationsRes]) => {
                setPersons(personsRes.data?.data || []);
                setRelations(relationsRes.data?.data || []);
            })
            .catch((err) => {
                console.error('DevCardPreview API fetch error:', err);
                // 폴백: 더미 데이터 사용
                setPersons(EC2_PERSONS);
                setRelations(EC2_RELATIONS);
            })
            .finally(() => setApiLoading(false));
    }, [siteId]);

    // 모달 state
    const [editModal, setEditModal] = useState(null);     // person object or null
    const [exhibitModal, setExhibitModal] = useState(null);
    const [inviteModal, setInviteModal] = useState(null);

    const treeData = useMemo(() => {
        if (persons.length === 0) return { nodes: [], links: [], mainId: null };
        return buildTree(persons, relations, mainPersonId);
    }, [persons, relations, mainPersonId]);

    const handleAction = useCallback((personId, actionKey) => {
        const person = persons.find(p => String(p.id) === String(personId));
        switch (actionKey) {
            case 'wormhole':
                setMainPersonId(personId);
                setSelectedId(null);
                break;
            case 'edit':
                if (person) setEditModal(person);
                break;
            case 'exhibit':
                if (person) setExhibitModal(person);
                break;
            case 'photo':
                // UploadModal은 siteId 필요 — DevCardPreview에서는 alert
                alert(`사진 업로드: ${person?.name || personId}`);
                break;
            case 'invite':
                if (person) setInviteModal(person);
                break;
            default:
                break;
        }
    }, [persons]);

    const handleEditSave = useCallback((updatedPerson) => {
        setPersons(prev => prev.map(p =>
            String(p.id) === String(updatedPerson.id) ? { ...p, ...updatedPerson } : p
        ));
        setEditModal(null);
    }, []);

    return (
        <div style={{ background: '#1E1A14', minHeight: '100vh', padding: '48px' }}>
            <h1 style={{ color: '#F5DEB3', fontSize: '28px', marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
                FolderCard — "기록의 블록"
            </h1>
            <p style={{ color: '#7A6E5E', fontSize: '12px', marginBottom: '40px' }}>
                /dev/cards — 인증 없이 접근. 프로덕션 배포 전 제거.
            </p>

            {/* ── 섹션 1: Photo Front vs Canvas Front ── */}
            <Section title="1. Photo Front — 사진이 전면을 채운다">
                <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                    {PHOTO_NODES.map(node => (
                        <CardSlot key={node.id}>
                            <FolderCard
                                node={node}
                                isSelected={selectedId === node.id}
                                onClick={setSelectedId}
                            />
                            <Label>{node.data.displayName}</Label>
                            <SubLabel>
                                {node.data.isDeceased ? '사망자 + grayscale' : '생존'}
                                {selectedId === node.id ? ' · 선택됨' : ''}
                            </SubLabel>
                        </CardSlot>
                    ))}
                </div>
            </Section>

            {/* ── 섹션 2: Canvas Front ── */}
            <Section title="2. Canvas Front — 린넨 질감 + Georgia 서체">
                <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                    {CANVAS_NODES.map(node => (
                        <CardSlot key={node.id}>
                            <FolderCard
                                node={node}
                                isMainPerson={node.id === 'c1'}
                                isSelected={selectedId === node.id}
                                onClick={setSelectedId}
                            />
                            <Label>{node.data.displayName}</Label>
                            <SubLabel>
                                {node.id === 'c1' ? '주인공' : ''}
                                {node.data.isDeceased ? '사망자' : ''}
                                {node.data.gender === 'M' ? ' ♂ 갈색' : ' ♀ 로즈'}
                            </SubLabel>
                        </CardSlot>
                    ))}
                </div>
            </Section>

            {/* ── 섹션 3: Photo + Canvas 나란히 ── */}
            <Section title="3. Photo vs Canvas 나란히 비교">
                <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
                    <CardSlot>
                        <FolderCard node={PHOTO_NODES[1]} />
                        <Label>Photo Front</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[1]} />
                        <Label>Canvas Front</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={PHOTO_NODES[0]} />
                        <Label>Photo + 사망자</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[2]} />
                        <Label>Canvas + 사망자</Label>
                    </CardSlot>
                </div>
            </Section>

            {/* ── 섹션 4: 상태별 비교 ── */}
            <Section title="4. 상태별 스타일 (기본/선택/주인공/사망자)">
                <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[0]} />
                        <Label>기본</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[0]} isSelected />
                        <Label>선택</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[0]} isMainPerson />
                        <Label>주인공</Label>
                    </CardSlot>
                    <CardSlot>
                        <FolderCard node={CANVAS_NODES[2]} />
                        <Label>사망자</Label>
                    </CardSlot>
                </div>
            </Section>

            {/* ── 섹션 5: Z축 LOD ── */}
            <Section title="5. Z축 LOD — 안개 효과 (Clear → Silhouette → Fog)">
                <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
                    {Z_NODES.map(node => (
                        <CardSlot key={node.id}>
                            <FolderCard node={node} />
                            <Label>Z={node.z}</Label>
                            <SubLabel>
                                opacity: {node.zOpacity} · scale: {node.zScale}
                                {node.z >= 1 && ` · blur: ${node.z === 1 ? 3 : 6}px`}
                            </SubLabel>
                        </CardSlot>
                    ))}
                </div>
            </Section>

            {/* ── 섹션 6: 규격 가이드라인 ── */}
            <Section title="6. 규격 확인 (180×180 카드 + 40×10 탭 + 20px 두께)">
                <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <FolderCard node={CANVAS_NODES[0]} isMainPerson />
                        {/* 180×180 가이드 */}
                        <div style={{
                            position: 'absolute', top: 10, left: 0,
                            width: 180, height: 180,
                            border: '1px dashed rgba(255,80,80,0.5)',
                            pointerEvents: 'none',
                        }} />
                        {/* 40×10 탭 가이드 */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0,
                            width: 40, height: 10,
                            border: '1px dashed rgba(80,255,80,0.6)',
                            pointerEvents: 'none',
                        }} />
                        <SubLabel style={{ marginTop: 12, maxWidth: 200 }}>
                            빨간: 카드 180×180 / 초록: 탭 40×10 / 그림자: 20px 두께감
                        </SubLabel>
                    </div>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <FolderCard node={PHOTO_NODES[1]} isMainPerson />
                        <div style={{
                            position: 'absolute', top: 10, left: 0,
                            width: 180, height: 180,
                            border: '1px dashed rgba(255,80,80,0.5)',
                            pointerEvents: 'none',
                        }} />
                        <SubLabel style={{ marginTop: 12 }}>Photo 규격</SubLabel>
                    </div>
                </div>
            </Section>

            {/* ══════ Phase 3: CoupleBlock ══════ */}

            {/* ── 섹션 7: 부부 박스 ── */}
            <Section title="7. CoupleBlock — 부부 박스 (Spouse 직선 커넥터)">
                <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <CardSlot>
                        <CoupleBlock
                            husbandNode={CANVAS_NODES[0]}
                            wifeNode={CANVAS_NODES[1]}
                            isMainCouple
                            selectedId={selectedId}
                            childrenIds={['c1', 'c2']}
                            onCardClick={setSelectedId}
                        />
                        <Label>주인공 부부 (Canvas) + 자녀 출발점</Label>
                    </CardSlot>
                    <CardSlot>
                        <CoupleBlock
                            husbandNode={PHOTO_NODES[2]}
                            wifeNode={PHOTO_NODES[1]}
                            selectedId={selectedId}
                            childrenIds={['c1']}
                            onCardClick={setSelectedId}
                        />
                        <Label>부부 (Photo) + 자녀 출발점</Label>
                    </CardSlot>
                </div>
            </Section>

            {/* ── 섹션 8: 솔로 vs 부부 비교 ── */}
            <Section title="8. 솔로 vs 부부 비교">
                <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <CardSlot>
                        <CoupleBlock
                            husbandNode={CANVAS_NODES[2]}
                            childrenIds={[]}
                            onCardClick={setSelectedId}
                        />
                        <Label>솔로 (사망자, 자녀 없음)</Label>
                    </CardSlot>
                    <CardSlot>
                        <CoupleBlock
                            husbandNode={CANVAS_NODES[0]}
                            childrenIds={['c1', 'c2', 'c3']}
                            onCardClick={setSelectedId}
                        />
                        <Label>솔로 + 자녀 출발점</Label>
                    </CardSlot>
                    <CardSlot>
                        <CoupleBlock
                            husbandNode={makeNode('deceased-h', { data: { displayName: '김영수', gender: 'M', dateLabel: '1958 ~ 2015', isDeceased: true } })}
                            wifeNode={makeNode('deceased-w', { data: { displayName: '임윤님', gender: 'F', dateLabel: '1938 ~ 2018', isDeceased: true } })}
                            childrenIds={['c1']}
                            onCardClick={setSelectedId}
                        />
                        <Label>사망자 부부</Label>
                    </CardSlot>
                </div>
            </Section>

            {/* ══════ Phase 4: FamilyTreeCanvas ══════ */}

            {/* ── 섹션 9: 가계도 (API 또는 더미 데이터) ── */}
            <Section title={`9. FamilyTreeCanvas — ${siteId ? `실서버 siteId=${siteId}` : '더미 데이터'} — ${mainPersonId ? persons.find(p => String(p.id) === String(mainPersonId))?.name || mainPersonId : persons[0]?.name || '?'} 가계도`}>
                {apiLoading && (
                    <div style={{ color: '#C4A84F', fontSize: 14, marginBottom: 12 }}>API 로딩 중...</div>
                )}
                {mainPersonId && (
                    <button
                        onClick={() => { setMainPersonId(null); setSelectedId(null); }}
                        style={{
                            marginBottom: 12, padding: '6px 16px',
                            background: 'rgba(196,168,79,0.15)', border: '1px solid #C4A84F',
                            borderRadius: 4, color: '#C4A84F', cursor: 'pointer', fontSize: 13,
                        }}
                    >
                        이한봉 가문으로 돌아가기
                    </button>
                )}
                <FamilyTreeCanvas
                    nodes={treeData.nodes}
                    links={treeData.links}
                    mainId={treeData.mainId}
                    selectedId={selectedId}
                    onCardClick={setSelectedId}
                    onWormhole={(personId) => { setMainPersonId(personId); setSelectedId(null); }}
                    onAction={handleAction}
                    style={{ height: 700, borderRadius: '8px', border: '1px solid #3A3020' }}
                />
                <SubLabel style={{ marginTop: 8 }}>
                    노드 {treeData.nodes.length}개 · 링크 {treeData.links.length}개 · mainId: {treeData.mainId}
                </SubLabel>
            </Section>

            {/* ══════ Phase 5: 모달 ══════ */}
            {editModal && (
                <PersonEditModal
                    person={editModal}
                    onSave={handleEditSave}
                    onClose={() => setEditModal(null)}
                />
            )}
            {exhibitModal && (
                <ExhibitModal
                    person={exhibitModal}
                    exhibits={[]}
                    onCreateExhibit={(p) => { alert(`새 전시: ${p.name}`); setExhibitModal(null); }}
                    onClose={() => setExhibitModal(null)}
                />
            )}
            {inviteModal && (
                <InviteModal
                    person={inviteModal}
                    onSendInvite={({ email }) => { alert(`초대 발송: ${email}`); setInviteModal(null); }}
                    onClose={() => setInviteModal(null)}
                />
            )}
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: '56px' }}>
            <h2 style={{
                color: '#C4A84F', fontSize: '15px', marginBottom: '20px',
                borderBottom: '1px solid #3A3020', paddingBottom: '8px',
                fontFamily: 'Georgia, serif', letterSpacing: '0.5px',
            }}>
                {title}
            </h2>
            {children}
        </div>
    );
}

function CardSlot({ children }) {
    return <div style={{ textAlign: 'center' }}>{children}</div>;
}

function Label({ children }) {
    return <div style={{ color: '#D4C5A0', fontSize: '12px', marginTop: '12px', fontFamily: 'Georgia, serif' }}>{children}</div>;
}

function SubLabel({ children, style: s }) {
    return <div style={{ color: '#7A6E5E', fontSize: '10px', marginTop: '3px', ...s }}>{children}</div>;
}
