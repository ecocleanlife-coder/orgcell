import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Plus, User, UserPlus, ExternalLink, MessageSquare, Image as ImageIcon, Send, X, ChevronLeft, ChevronRight, Play, Heart } from 'lucide-react';
import axios from 'axios';
import FamilyBanner from '../common/FamilyBanner';
import useUiStore from '../../store/uiStore';
import { getT } from '../../i18n/translations';

/*
  Recursive family tree with multiple parent pairs support.

  Node = {
    id, name, coverUrl,
    spouse: Node | null,
    parentPairs: [{ id, label, parent1: Node, parent2: Node|null }],
    children: [Node]
  }

  parentPairs labels: Birth Parents, Adoptive Parents, Step-Parents, Foster Parents, etc.
  Users can add multiple parent pairs per person (e.g. birth + adoptive).
*/

const uid = () => 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

const INITIAL = {
    id: 'me', name: 'John',
    coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    spouse: {
        id: 'spouse', name: 'Jane',
        coverUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        parentPairs: [
            {
                id: 'jp1', label: 'Birth Parents',
                parent1: { id: 'herDad', name: "Jane's Dad", coverUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
                parent2: { id: 'herMom', name: "Jane's Mom", coverUrl: 'https://images.unsplash.com/photo-1546961342-ea1f71b193f3?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
            }
        ],
        children: [],
    },
    parentPairs: [
        {
            id: 'mp1', label: 'Birth Parents',
            parent1: { id: 'myDad', name: "John's Dad", coverUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
            parent2: { id: 'myMom', name: "John's Mom", coverUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
        }
    ],
    children: [
        {
            id: 'son1', name: 'Son1',
            coverUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
            spouse: { id: 'son1wife', name: "Son1's Wife", coverUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
            parentPairs: [],
            children: [
                { id: 'son1son', name: "Son1's Son", coverUrl: null, parentPairs: [], children: [] },
            ]
        },
        {
            id: 'daughter1', name: 'Daughter1',
            coverUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
            spouse: { id: 'daughter1hub', name: "D1's Husband", coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
            parentPairs: [],
            children: [
                { id: 'd1d1', name: "D1's Daughter1", coverUrl: null, parentPairs: [], children: [] },
                { id: 'd1d2', name: "D1's Daughter2", coverUrl: null, parentPairs: [], children: [] },
            ]
        },
        { id: 'son2', name: 'Son2', coverUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
        { id: 'daughter2', name: 'Daughter2', coverUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', parentPairs: [], children: [] },
    ]
};

// ── Flat DB rows → nested tree conversion ──
function buildTreeFromPersons(persons) {
    if (!persons || persons.length === 0) return null;

    const byId = {};
    for (const p of persons) {
        byId[p.id] = {
            id: String(p.id),
            name: p.name,
            coverUrl: p.photo_url || null,
            parentPairs: [],
            children: [],
            spouse: null,
            _raw: p,
        };
    }

    // 자녀 관계 설정 (parent1_id 기준)
    for (const p of persons) {
        if (p.parent1_id && byId[p.parent1_id]) {
            const parent = byId[p.parent1_id];
            // 이미 추가된 자녀인지 확인
            if (!parent.children.find(c => c.id === String(p.id))) {
                parent.children.push(byId[p.id]);
            }
        }
    }

    // 배우자 관계 설정
    for (const p of persons) {
        if (p.spouse_id && byId[p.spouse_id]) {
            byId[p.id].spouse = byId[p.spouse_id];
        }
    }

    // 부모 관계 → parentPairs 설정
    for (const p of persons) {
        if (p.parent1_id && p.parent2_id && byId[p.parent1_id] && byId[p.parent2_id]) {
            const node = byId[p.id];
            const existingPair = node.parentPairs.find(pp =>
                pp.parent1?.id === String(p.parent1_id) && pp.parent2?.id === String(p.parent2_id)
            );
            if (!existingPair) {
                node.parentPairs.push({
                    id: `pp_${p.parent1_id}_${p.parent2_id}`,
                    label: 'Birth Parents',
                    parent1: byId[p.parent1_id],
                    parent2: byId[p.parent2_id],
                });
            }
        }
    }

    // 루트 찾기: parent1_id가 없는 generation 1 노드 (또는 가장 낮은 generation의 부모)
    // 중심 인물 = generation 1 중 parent가 있는 첫 번째 (부모 세대)
    const gen1 = persons.filter(p => p.generation === 1);
    if (gen1.length > 0) {
        const mainPerson = byId[gen1[0].id];
        return mainPerson;
    }

    // generation 1이 없으면 parent가 없는 첫 번째 사람
    const roots = persons.filter(p => !p.parent1_id);
    if (roots.length > 0) return byId[roots[0].id];

    return byId[persons[0].id];
}

// ── UI Components ──

function FolderNode({ person, onClick, size = 'md' }) {
    const sizes = {
        sm: { w: 'w-24', h: 'h-28', img: 'w-12 h-12', text: 'text-[9px]', tab: 'w-10 h-3', top: 'top-2' },
        md: { w: 'w-32', h: 'h-36', img: 'w-16 h-16', text: 'text-[11px]', tab: 'w-12 h-4', top: 'top-3' },
        lg: { w: 'w-36', h: 'h-40', img: 'w-20 h-20', text: 'text-xs', tab: 'w-14 h-4', top: 'top-3' },
    };
    const s = sizes[size];
    return (
        <div className={`relative group ${s.w} ${s.h} cursor-pointer transition-all hover:-translate-y-1 flex-shrink-0`}
            onClick={() => onClick?.(person.id)}>
            <div className={`absolute top-0 left-2 ${s.tab} bg-amber-300 dark:bg-amber-700 rounded-t-lg border-t border-x border-amber-400 dark:border-amber-600 group-hover:bg-amber-400 transition-colors`} />
            <div className={`absolute ${s.top} inset-x-0 bottom-0 bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg group-hover:border-amber-400 group-hover:shadow-xl transition-all flex flex-col items-center justify-center p-2 gap-1`}>
                <div className={`${s.img} rounded-full border-2 border-white dark:border-amber-800 shadow overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0`}>
                    {person.coverUrl ? (
                        <img src={person.coverUrl} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-full h-full p-2 text-gray-400" />
                    )}
                </div>
                <span className={`${s.text} font-bold text-amber-900 dark:text-amber-100 text-center leading-tight truncate w-full`}>
                    {person.name}
                </span>
            </div>
        </div>
    );
}

function PlusConnector() {
    return (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-300 dark:border-rose-700 self-center mx-0.5 flex-shrink-0">
            <span className="text-rose-500 font-black text-sm leading-none select-none">+</span>
        </div>
    );
}

function VLine({ h = 8 }) {
    return <div style={{ height: h }} className="w-0.5 bg-amber-300 dark:bg-amber-700 mx-auto flex-shrink-0" />;
}

function HLine() {
    return <div className="h-0.5 bg-amber-300 dark:bg-amber-700 flex-1 min-w-[16px]" />;
}

function AddBtn({ onClick, title = 'Add', direction = 'down', label }) {
    const cls = direction === 'right' ? 'ml-1 self-center' : direction === 'up' ? 'mb-1' : 'mt-1';
    return (
        <button onClick={onClick} title={title}
            className={`${cls} flex items-center gap-1 px-1.5 h-6 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0`}>
            <Plus size={12} />
            {label && <span className="text-[9px] font-bold whitespace-nowrap">{label}</span>}
        </button>
    );
}

// Parent pair label badge
function PairLabel({ label }) {
    return (
        <div className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-center mb-1 whitespace-nowrap">
            {label}
        </div>
    );
}

// ── Constants ──
const PARENT_TYPE_KEYS = [
    { value: 'birth', tKey: 'birthParents' },
    { value: 'adoptive', tKey: 'adoptiveParents' },
    { value: 'step', tKey: 'stepParents' },
    { value: 'foster', tKey: 'fosterParents' },
    { value: 'other', tKey: 'other' },
];

export default function FamilyTreeView({ siteId, readOnly }) {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);
    const [root, setRoot] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // DB에서 persons 로드
    useEffect(() => {
        if (!siteId) {
            setRoot(INITIAL);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setIsLoading(true);
                const res = await axios.get(`/api/persons/${siteId}`);
                if (cancelled) return;
                if (res.data?.success && res.data.data?.length > 0) {
                    const tree = buildTreeFromPersons(res.data.data);
                    setRoot(tree || INITIAL);
                } else {
                    setRoot(null);
                }
            } catch (err) {
                if (cancelled) return;
                console.error('Failed to load persons:', err);
                setLoadError(err.message);
                setRoot(INITIAL);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [siteId]);

    // Modal state
    const [modal, setModal] = useState(null);
    // modal = { mode: 'member'|'parents', path, relations } or { mode: 'parents', path }
    const [newName, setNewName] = useState('');
    const [newRelation, setNewRelation] = useState('');
    // For parents modal
    const [parentType, setParentType] = useState('birth');
    const [parent1Name, setParent1Name] = useState('');
    const [parent2Name, setParent2Name] = useState('');
    const [singleParent, setSingleParent] = useState(false);

    // Chat & Exhibition state
    const [activePanel, setActivePanel] = useState(null); // 'chat' | 'exhibition' | null
    const [chatMessages, setChatMessages] = useState([
        { id: 1, sender: 'Mom', text: 'Welcome to our family museum!', time: '10:00 AM' },
        { id: 2, sender: 'Dad', text: 'I uploaded old photos from the 80s.', time: '10:05 AM' },
        { id: 3, sender: 'Me', text: 'Great! The kids will love seeing those.', time: '10:12 AM' },
    ]);
    const [chatInput, setChatInput] = useState('');
    const [exhibitIdx, setExhibitIdx] = useState(null); // fullscreen exhibit index

    const EXHIBIT_ITEMS = [
        { id: 1, url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=60', title: 'Family Reunion 2024', desc: 'Everyone gathered for grandma\'s 80th birthday' },
        { id: 2, url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&q=60', title: 'Holiday Dinner', desc: 'Thanksgiving at the lake house' },
        { id: 3, url: 'https://images.unsplash.com/photo-1506869640319-fea1a278e0ec?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1506869640319-fea1a278e0ec?w=300&q=60', title: 'Grand Canyon Trip', desc: 'Summer road trip with the whole family' },
        { id: 4, url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=300&q=60', title: 'Beach Sunset', desc: 'Last day of vacation in Hawaii' },
        { id: 5, url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=300&q=60', title: 'Wedding Anniversary', desc: 'Mom & Dad\'s 35th anniversary celebration' },
        { id: 6, url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80', thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=60', title: 'Home Movies', desc: 'Digitized VHS tapes from the 90s' },
    ];

    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, { id: Date.now(), sender: 'Me', text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setChatInput('');
    };

    const goToPerson = (id) => navigate(`/person/${id}`);

    // Deep update helper
    const updateAtPath = useCallback((tree, path, updater) => {
        if (!tree) return tree;
        if (!path || path.length === 0) return updater(tree);
        const [key, ...rest] = path;
        if (key === 'spouse') return { ...tree, spouse: updateAtPath(tree.spouse, rest, updater) };
        if (key === 'parent1') return { ...tree, parent1: updateAtPath(tree.parent1, rest, updater) };
        if (key === 'parent2') return { ...tree, parent2: updateAtPath(tree.parent2, rest, updater) };
        if (key.startsWith('children[')) {
            const idx = parseInt(key.match(/\d+/)[0]);
            return { ...tree, children: (tree.children || []).map((c, i) => i === idx ? updateAtPath(c, rest, updater) : c) };
        }
        if (key.startsWith('parentPairs[')) {
            const idx = parseInt(key.match(/\d+/)[0]);
            return { ...tree, parentPairs: (tree.parentPairs || []).map((p, i) => i === idx ? updateAtPath(p, rest, updater) : p) };
        }
        return tree;
    }, []);

    // Open member add modal (child / spouse)
    const openMemberModal = (path, relations) => {
        setModal({ mode: 'member', path, relations });
        setNewName('');
        setNewRelation(relations[0]?.value || '');
    };

    // Open parents add modal
    const openParentsModal = (path) => {
        setModal({ mode: 'parents', path });
        setParentType('birth');
        setParent1Name('');
        setParent2Name('');
        setSingleParent(false);
    };

    const handleMemberSubmit = () => {
        if (!newName.trim() || !modal) return;
        const person = { id: uid(), name: newName, coverUrl: null, parentPairs: [], children: [] };
        setRoot(prev => {
            if (newRelation === 'child') {
                return updateAtPath(prev, modal.path, node => ({
                    ...node, children: [...(node.children || []), person]
                }));
            }
            if (newRelation === 'spouse') {
                return updateAtPath(prev, modal.path, node => ({ ...node, spouse: person }));
            }
            return prev;
        });
        setModal(null);
    };

    const handleParentsSubmit = () => {
        if (!parent1Name.trim()) return;
        const ptKey = PARENT_TYPE_KEYS.find(pt => pt.value === parentType);
        const label = ptKey ? t[ptKey.tKey] : t.birthParents;
        const newPair = {
            id: uid(),
            label,
            parent1: { id: uid(), name: parent1Name, coverUrl: null, parentPairs: [], children: [] },
            parent2: singleParent ? null : { id: uid(), name: parent2Name || parent1Name + "'s spouse", coverUrl: null, parentPairs: [], children: [] },
        };
        setRoot(prev => updateAtPath(prev, modal.path, node => ({
            ...node, parentPairs: [...(node.parentPairs || []), newPair]
        })));
        setModal(null);
    };

    // ── Render a single parent pair (recursive upward) ──
    const renderParentPair = (pair, pairPath) => {
        return (
            <div className="flex flex-col items-center">
                <PairLabel label={pair.label} />
                {/* Recursively render grandparents above each parent */}
                <div className="flex items-end justify-center gap-6 mb-0">
                    {/* Parent1's parents */}
                    {pair.parent1 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent1.parentPairs || []).map((gp, gi) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, [...pairPath, 'parent1', `parentPairs[${gi}]`])}
                                    <VLine h={6} />
                                </div>
                            ))}
                            <AddBtn onClick={() => openParentsModal([...pairPath, 'parent1'])} title={t.addParentsAbove} direction="up" />
                            <VLine h={4} />
                        </div>
                    )}
                    {/* Parent2's parents */}
                    {pair.parent2 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent2.parentPairs || []).map((gp, gi) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, [...pairPath, 'parent2', `parentPairs[${gi}]`])}
                                    <VLine h={6} />
                                </div>
                            ))}
                            <AddBtn onClick={() => openParentsModal([...pairPath, 'parent2'])} title={t.addParentsAbove} direction="up" />
                            <VLine h={4} />
                        </div>
                    )}
                </div>
                {/* The parent couple/single */}
                <div className="flex items-center gap-1">
                    {pair.parent1 && <FolderNode person={pair.parent1} onClick={goToPerson} size="md" />}
                    {pair.parent1 && pair.parent2 && <PlusConnector />}
                    {pair.parent2 && <FolderNode person={pair.parent2} onClick={goToPerson} size="md" />}
                </div>
            </div>
        );
    };

    // ── Render all parent pairs for a person (multiple pairs side by side) ──
    const renderAllParents = (node, basePath) => {
        const pairs = node.parentPairs || [];
        if (pairs.length === 0 && basePath.length === 0) {
            // Only show at root level with "+" even if no parents
            return (
                <div className="flex items-end justify-center gap-4">
                    <AddBtn onClick={() => openParentsModal(basePath)} title={t.addParentsAbove} direction="up" label={t.addParents} />
                </div>
            );
        }
        return (
            <div className="flex items-end justify-center gap-8 md:gap-12">
                {pairs.map((pair, pi) => (
                    <div key={pair.id} className="flex flex-col items-center">
                        {renderParentPair(pair, [...basePath, `parentPairs[${pi}]`])}
                    </div>
                ))}
                <AddBtn onClick={() => openParentsModal(basePath)} title={t.addParentsAbove} direction="up" />
            </div>
        );
    };

    // ── Recursive child renderer ──
    const renderChild = (child, path) => {
        const hasSpouse = !!child.spouse;
        const kids = child.children || [];

        return (
            <div key={child.id} className="flex flex-col items-center">
                <VLine h={20} />

                {/* Person + optional spouse */}
                <div className="flex items-center gap-1">
                    <FolderNode person={child} onClick={goToPerson} size="md" />
                    {hasSpouse ? (
                        <>
                            <PlusConnector />
                            <FolderNode person={child.spouse} onClick={goToPerson} size="md" />
                        </>
                    ) : (
                        <AddBtn onClick={() => openMemberModal(path, [{ value: 'spouse', label: t.spouseOption }])} title={t.addSpouse} direction="right" />
                    )}
                </div>

                {/* Children */}
                {kids.length > 0 && (
                    <>
                        <VLine h={16} />
                        {kids.length > 1 && (
                            <div className="flex items-center" style={{ width: `${kids.length * 120}px` }}>
                                <HLine />
                            </div>
                        )}
                        <div className="flex items-start justify-center gap-3">
                            {kids.map((gc, gi) => renderChild(gc, [...path, `children[${gi}]`]))}
                        </div>
                    </>
                )}

                {/* "+" add child below */}
                <AddBtn onClick={() => openMemberModal(path, [{ value: 'child', label: t.childOption }])} title={t.addChild} direction="down" />
            </div>
        );
    };

    // ── Main root person's parents (both own + spouse's) ──
    const renderRootParents = () => {
        const myPairs = treeRoot.parentPairs || [];
        const spousePairs = treeRoot.spouse?.parentPairs || [];

        return (
            <div className="flex items-end justify-center gap-10 md:gap-16">
                {/* My parents */}
                <div className="flex flex-col items-center">
                    <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.name}{t.parentsOf}</div>
                    <div className="flex items-end gap-6">
                        {myPairs.map((pair, pi) => (
                            <div key={pair.id} className="flex flex-col items-center">
                                {renderParentPair(pair, [`parentPairs[${pi}]`])}
                            </div>
                        ))}
                        <AddBtn onClick={() => openParentsModal([])} title={t.addParentsAbove} direction="up" />
                    </div>
                </div>
                {/* Spouse's parents */}
                {treeRoot.spouse && (
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.spouse.name}{t.parentsOf}</div>
                        <div className="flex items-end gap-6">
                            {spousePairs.map((pair, pi) => (
                                <div key={pair.id} className="flex flex-col items-center">
                                    {renderParentPair(pair, ['spouse', `parentPairs[${pi}]`])}
                                </div>
                            ))}
                            <AddBtn onClick={() => openParentsModal(['spouse'])} title={t.addParentsAbove} direction="up" />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // 로딩 중
    if (isLoading) {
        return (
            <div className="w-full min-h-[40vh] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
        );
    }

    // 데이터 없음 (siteId는 있지만 persons 없음)
    if (!root && siteId) {
        return (
            <div className="w-full min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center p-8">
                <Network className="text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">
                    {lang === 'ko' ? '아직 가족 구성원이 없습니다' : 'No family members yet'}
                </h3>
                <p className="text-slate-400 text-sm">
                    {lang === 'ko' ? '가족을 추가해서 나만의 패밀리트리를 만들어보세요!' : 'Add your family members to build your family tree!'}
                </p>
            </div>
        );
    }

    // root가 null이고 siteId도 없으면 INITIAL 사용
    const treeRoot = root || INITIAL;

    return (
        <div className="w-full min-h-[70vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto custom-scrollbar">
            {/* ── Top Banner ── */}
            <FamilyBanner />

            {/* ── Title + Action Buttons ── */}
            <div className="p-6 pb-0">
                <div className="mb-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
                        <Network className="text-emerald-500" size={28} />
                        {t.museumTitle}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2">
                        {t.treeDesc}{' '}
                        <a href="https://www.familysearch.org" target="_blank" rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                            {t.ancestorLink} <ExternalLink size={12} />
                        </a>
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    <button onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activePanel === 'chat'
                            ? 'bg-blue-600 text-white shadow-blue-500/30'
                            : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                        <MessageSquare size={18} /> {t.familyChat}
                    </button>
                    <button onClick={() => setActivePanel(activePanel === 'exhibition' ? null : 'exhibition')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activePanel === 'exhibition'
                            ? 'bg-purple-600 text-white shadow-purple-500/30'
                            : 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}>
                        <ImageIcon size={18} /> {t.familyExhibition}
                    </button>
                </div>

                {/* ── Chat Panel ── */}
                {activePanel === 'chat' && (
                    <div className="max-w-2xl mx-auto mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fade-in-up">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
                            <h3 className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 text-sm"><MessageSquare size={16} /> {t.familyChat}</h3>
                            <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
                        </div>
                        <div className="h-52 overflow-y-auto p-3 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
                            {chatMessages.map(m => (
                                <div key={m.id} className={`flex flex-col ${m.sender === 'Me' ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-500 mb-0.5">{m.sender}</span>
                                    <div className={`px-3 py-1.5 rounded-2xl max-w-[80%] text-sm ${m.sender === 'Me' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-tl-none'}`}>
                                        {m.text}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-0.5">{m.time}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                placeholder={t.typePlaceholder}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 outline-none text-sm dark:text-white" />
                            <button onClick={handleSendChat} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"><Send size={16} /></button>
                        </div>
                    </div>
                )}

                {/* ── Exhibition Panel ── */}
                {activePanel === 'exhibition' && (
                    <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fade-in-up">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20 flex items-center justify-between">
                            <h3 className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2 text-sm"><ImageIcon size={16} /> {t.exhibitionHall}</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setExhibitIdx(0)}
                                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors">
                                    <Play size={12} fill="white" /> {t.slideshow}
                                </button>
                                <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
                            </div>
                        </div>
                        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                            {EXHIBIT_ITEMS.map((item, i) => (
                                <div key={item.id} onClick={() => setExhibitIdx(i)}
                                    className="group cursor-pointer rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 aspect-[4/3] relative">
                                    <img src={item.thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <h4 className="text-white font-bold text-sm">{item.title}</h4>
                                        <p className="text-white/70 text-xs">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* === TREE === */}
            <div className="px-6 pb-6">
            <div className="flex flex-col items-center min-w-max px-4 pb-16">

                {/* Parents row */}
                {renderRootParents()}

                {/* Lines down from parents */}
                <VLine h={24} />
                <div className="flex items-center justify-center w-full max-w-2xl">
                    <HLine />
                    <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <HLine />
                </div>
                <VLine h={16} />

                {/* Center couple */}
                <div className="flex items-center gap-1">
                    <FolderNode person={treeRoot} onClick={goToPerson} size="lg" />
                    {treeRoot.spouse ? (
                        <>
                            <PlusConnector />
                            <FolderNode person={treeRoot.spouse} onClick={goToPerson} size="lg" />
                        </>
                    ) : (
                        <AddBtn onClick={() => openMemberModal([], [{ value: 'spouse', label: t.spouseOption }])} title={t.addSpouse} direction="right" />
                    )}
                </div>

                {/* Down to children */}
                <VLine h={24} />

                {/* Children */}
                {(treeRoot.children || []).length > 0 && (
                    <>
                        <div className="flex items-center" style={{ width: `${Math.max(treeRoot.children.length * 160, 200)}px` }}>
                            <HLine />
                        </div>
                        <div className="flex items-start justify-center gap-4 md:gap-8">
                            {treeRoot.children.map((child, ci) => renderChild(child, [`children[${ci}]`]))}
                        </div>
                    </>
                )}

                <AddBtn onClick={() => openMemberModal([], [{ value: 'child', label: t.childOption }])} title={t.addChild} direction="down" />
            </div>

            {/* ── Member Modal (child/spouse) ── */}
            {modal?.mode === 'member' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                            <UserPlus className="text-emerald-500" /> {t.addMember}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.nameLabel}</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-emerald-500 dark:text-white"
                                    placeholder={t.namePlaceholder} autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleMemberSubmit()} />
                            </div>
                            {modal.relations.length > 1 && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.relationship}</label>
                                    <select value={newRelation} onChange={e => setNewRelation(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-emerald-500 dark:text-white">
                                        {modal.relations.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setModal(null)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                            <button onClick={handleMemberSubmit} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors">{t.add}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Parents Modal (multiple parent pairs) ── */}
            {modal?.mode === 'parents' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                            <UserPlus className="text-indigo-500" /> {t.addParentPair}
                        </h3>
                        <div className="space-y-4">
                            {/* Parent type selector */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t.parentType}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PARENT_TYPE_KEYS.map(pt => (
                                        <button key={pt.value} onClick={() => setParentType(pt.value)}
                                            className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${parentType === pt.value
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300'}`}>
                                            {t[pt.tKey]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Single parent toggle */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={singleParent} onChange={e => setSingleParent(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t.singleParentLabel}</span>
                            </label>

                            {/* Parent 1 name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                    {singleParent ? t.parentName : t.fatherLabel}
                                </label>
                                <input type="text" value={parent1Name} onChange={e => setParent1Name(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-indigo-500 dark:text-white"
                                    placeholder="e.g., Robert" autoFocus
                                    onKeyDown={e => e.key === 'Enter' && !singleParent && document.getElementById('parent2input')?.focus()} />
                            </div>

                            {/* Parent 2 name */}
                            {!singleParent && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.motherLabel}</label>
                                    <input id="parent2input" type="text" value={parent2Name} onChange={e => setParent2Name(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-indigo-500 dark:text-white"
                                        placeholder="e.g., Mary"
                                        onKeyDown={e => e.key === 'Enter' && handleParentsSubmit()} />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setModal(null)} className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                            <button onClick={handleParentsSubmit} className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-colors">{t.addParents}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Fullscreen Exhibition Viewer ── */}
            {exhibitIdx !== null && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                        <div>
                            <h3 className="text-white font-bold">{EXHIBIT_ITEMS[exhibitIdx]?.title}</h3>
                            <p className="text-white/60 text-sm">{EXHIBIT_ITEMS[exhibitIdx]?.desc}</p>
                        </div>
                        <button onClick={() => setExhibitIdx(null)} className="text-white/80 hover:text-white p-2"><X size={24} /></button>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative">
                        <img src={EXHIBIT_ITEMS[exhibitIdx]?.url} alt="" className="max-w-full max-h-full object-contain" />
                        <button onClick={() => setExhibitIdx((exhibitIdx - 1 + EXHIBIT_ITEMS.length) % EXHIBIT_ITEMS.length)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                            <ChevronLeft size={28} />
                        </button>
                        <button onClick={() => setExhibitIdx((exhibitIdx + 1) % EXHIBIT_ITEMS.length)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                            <ChevronRight size={28} />
                        </button>
                    </div>
                    <div className="bg-black/90 p-3 flex items-center gap-2 overflow-x-auto">
                        {EXHIBIT_ITEMS.map((it, i) => (
                            <button key={it.id} onClick={() => setExhibitIdx(i)}
                                className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === exhibitIdx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                                <img src={it.thumb} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}
