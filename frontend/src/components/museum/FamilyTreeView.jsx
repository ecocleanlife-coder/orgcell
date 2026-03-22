import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Network, Plus, User, UserPlus, ExternalLink,
    X, Edit3, Trash2, Globe, Lock, Eye,
} from 'lucide-react';
import axios from 'axios';
import FamilyBanner from '../common/FamilyBanner';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ── Flat DB rows → nested tree conversion ──
function buildTreeFromPersons(persons) {
    if (!persons || persons.length === 0) return null;

    const byId = {};
    for (const p of persons) {
        byId[p.id] = {
            id: String(p.id),
            name: p.name,
            coverUrl: p.photo_url || null,
            birth_date: p.birth_date || null,
            birth_year: p.birth_year || null,
            privacy_level: p.privacy_level || 'family',
            gender: p.gender || null,
            generation: p.generation || 0,
            parentPairs: [],
            children: [],
            spouse: null,
            _raw: p,
        };
    }

    for (const p of persons) {
        if (p.parent1_id && byId[p.parent1_id]) {
            const parent = byId[p.parent1_id];
            if (!parent.children.find(c => c.id === String(p.id))) {
                parent.children.push(byId[p.id]);
            }
        }
    }

    for (const p of persons) {
        if (p.spouse_id && byId[p.spouse_id]) {
            byId[p.id].spouse = byId[p.spouse_id];
        }
    }

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

    const gen1 = persons.filter(p => p.generation === 1);
    if (gen1.length > 0) return byId[gen1[0].id];

    const roots = persons.filter(p => !p.parent1_id);
    if (roots.length > 0) return byId[roots[0].id];

    return byId[persons[0].id];
}

// ── Privacy badge ──
const PRIV_ICON = { public: Globe, family: Lock, private: Eye };
const PRIV_COLOR = { public: '#3a7a2a', family: '#7a3a9a', private: '#5a5a5a' };

function PrivBadge({ level }) {
    const Icon = PRIV_ICON[level] || Lock;
    return (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.85)' }}>
            <Icon size={9} style={{ color: PRIV_COLOR[level] || '#5a5a5a' }} />
        </span>
    );
}

// ── Initials helper ──
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// ── Person Card (folder style) ──
function FolderNode({ person, onClick, onEdit, size = 'md', canEdit = false }) {
    const [hovered, setHovered] = useState(false);
    const sizes = {
        sm: { w: 'w-24', h: 'h-28', img: 'w-12 h-12', text: 'text-[9px]', sub: 'text-[8px]', tab: 'w-10 h-3', top: 'top-2' },
        md: { w: 'w-32', h: 'h-36', img: 'w-16 h-16', text: 'text-[11px]', sub: 'text-[9px]', tab: 'w-12 h-4', top: 'top-3' },
        lg: { w: 'w-36', h: 'h-40', img: 'w-20 h-20', text: 'text-xs', sub: 'text-[10px]', tab: 'w-14 h-4', top: 'top-3' },
    };
    const s = sizes[size];
    const initials = getInitials(person.name);
    const birthLabel = person.birth_date
        ? new Date(person.birth_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' })
        : person.birth_year ? String(person.birth_year) : null;

    return (
        <div
            className={`relative group ${s.w} ${s.h} cursor-pointer transition-all hover:-translate-y-1 flex-shrink-0`}
            onClick={() => onClick?.(person.id)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className={`absolute top-0 left-2 ${s.tab} bg-amber-300 dark:bg-amber-700 rounded-t-lg border-t border-x border-amber-400 dark:border-amber-600 group-hover:bg-amber-400 transition-colors`} />
            <div className={`absolute ${s.top} inset-x-0 bottom-0 bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg group-hover:border-amber-400 group-hover:shadow-xl transition-all flex flex-col items-center justify-center p-2 gap-0.5 relative`}>
                {/* Privacy badge */}
                <PrivBadge level={person.privacy_level || 'family'} />

                {/* Photo or Initials */}
                <div className={`${s.img} rounded-full border-2 border-white dark:border-amber-800 shadow overflow-hidden flex-shrink-0 flex items-center justify-center`}
                    style={{ background: person.coverUrl ? '#e8e0d0' : '#d4a574' }}>
                    {person.coverUrl ? (
                        <img src={person.coverUrl} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white font-bold" style={{ fontSize: size === 'lg' ? 18 : size === 'md' ? 14 : 10 }}>
                            {initials}
                        </span>
                    )}
                </div>

                {/* Name */}
                <span className={`${s.text} font-bold text-amber-900 dark:text-amber-100 text-center leading-tight truncate w-full`}>
                    {person.name}
                </span>

                {/* Birth info */}
                {birthLabel && (
                    <span className={`${s.sub} text-amber-600 dark:text-amber-400`}>
                        {birthLabel}
                    </span>
                )}

                {/* Hover edit button */}
                {canEdit && hovered && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(person); }}
                        className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                        <Edit3 size={10} style={{ color: '#fff' }} />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Placeholder Node (dotted, for empty tree) ──
function PlaceholderNode({ label, onClick, size = 'md' }) {
    const sizes = {
        sm: { w: 'w-24', h: 'h-28', text: 'text-[9px]' },
        md: { w: 'w-32', h: 'h-36', text: 'text-[11px]' },
        lg: { w: 'w-36', h: 'h-40', text: 'text-xs' },
    };
    const s = sizes[size];
    return (
        <button
            onClick={onClick}
            className={`${s.w} ${s.h} flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all cursor-pointer flex-shrink-0 group`}
        >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-amber-400 flex items-center justify-center mb-1">
                <Plus size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-amber-500" />
            </div>
            <span className={`${s.text} font-bold text-gray-400 dark:text-gray-500 group-hover:text-amber-600`}>
                {label}
            </span>
        </button>
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

function VLineDashed({ h = 8 }) {
    return <div style={{ height: h, borderLeft: '2px dashed #d1d5db' }} className="mx-auto flex-shrink-0" />;
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

function PairLabel({ label }) {
    return (
        <div className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full text-center mb-1 whitespace-nowrap">
            {label}
        </div>
    );
}

const PARENT_TYPE_KEYS = [
    { value: 'birth', tKey: 'birthParents' },
    { value: 'adoptive', tKey: 'adoptiveParents' },
    { value: 'step', tKey: 'stepParents' },
    { value: 'foster', tKey: 'fosterParents' },
    { value: 'other', tKey: 'other' },
];

const GENDER_OPTIONS = [
    { value: 'male', label: '남성 / Male' },
    { value: 'female', label: '여성 / Female' },
    { value: 'other', label: '기타 / Other' },
];

const PRIVACY_OPTIONS = [
    { value: 'public', label: '공개', icon: '🌐' },
    { value: 'family', label: '가족', icon: '🔒' },
    { value: 'private', label: '본인', icon: '👤' },
];

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function FamilyTreeView({ siteId, readOnly = false, role = 'viewer' }) {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);
    const token = useAuthStore((s) => s.token);

    const [persons, setPersons] = useState([]);
    const [root, setRoot] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const canEdit = !readOnly && (role === 'owner' || role === 'member');

    // ── Fetch persons from API ──
    const fetchPersons = useCallback(async () => {
        if (!siteId) { setIsLoading(false); return; }
        try {
            setIsLoading(true);
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const res = await axios.get(`/api/persons/${siteId}`, config);
            if (res.data?.success) {
                setPersons(res.data.data || []);
                const tree = buildTreeFromPersons(res.data.data);
                setRoot(tree);
            }
        } catch (err) {
            console.error('Failed to load persons:', err);
        } finally {
            setIsLoading(false);
        }
    }, [siteId, token]);

    useEffect(() => { fetchPersons(); }, [fetchPersons]);

    // ── Modal state ──
    const [modal, setModal] = useState(null);
    // modal types: 'member' (add child/spouse), 'parents' (add parent pair), 'edit' (edit person), 'addFirst' (empty tree placeholder)
    const [newName, setNewName] = useState('');
    const [newRelation, setNewRelation] = useState('');
    const [newBirthDate, setNewBirthDate] = useState('');
    const [newGender, setNewGender] = useState('');
    const [newPrivacy, setNewPrivacy] = useState('family');

    const [parentType, setParentType] = useState('birth');
    const [parent1Name, setParent1Name] = useState('');
    const [parent2Name, setParent2Name] = useState('');
    const [singleParent, setSingleParent] = useState(false);

    // Edit modal
    const [editPerson, setEditPerson] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editPrivacy, setEditPrivacy] = useState('family');
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── API: Create person ──
    const apiCreatePerson = async (data) => {
        if (!siteId || !token) return null;
        try {
            const res = await axios.post(`/api/persons/${siteId}`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data || null;
        } catch (err) {
            console.error('createPerson error:', err);
            return null;
        }
    };

    // ── API: Update person ──
    const apiUpdatePerson = async (personId, data) => {
        if (!siteId || !token) return null;
        try {
            const res = await axios.put(`/api/persons/${siteId}/${personId}`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data || null;
        } catch (err) {
            console.error('updatePerson error:', err);
            return null;
        }
    };

    // ── API: Delete person ──
    const apiDeletePerson = async (personId) => {
        if (!siteId || !token) return false;
        try {
            await axios.delete(`/api/persons/${siteId}/${personId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return true;
        } catch (err) {
            console.error('deletePerson error:', err);
            return false;
        }
    };

    // ── Open add member modal ──
    const openMemberModal = (parentId, relation) => {
        setModal({ mode: 'member', parentId, relation });
        setNewName('');
        setNewRelation(relation);
        setNewBirthDate('');
        setNewGender('');
        setNewPrivacy('family');
    };

    // ── Open add from placeholder (empty tree) ──
    const openAddFirst = (placeholderRole) => {
        setModal({ mode: 'addFirst', placeholderRole });
        setNewName('');
        setNewBirthDate('');
        setNewGender('');
        setNewPrivacy('family');
    };

    // ── Open edit modal ──
    const openEditModal = (person) => {
        const raw = person._raw || person;
        setEditPerson(raw);
        setEditName(raw.name || '');
        setEditBirthDate(raw.birth_date ? raw.birth_date.slice(0, 10) : '');
        setEditGender(raw.gender || '');
        setEditPrivacy(raw.privacy_level || 'family');
        setConfirmDelete(false);
        setModal({ mode: 'edit' });
    };

    // ── Submit: Add member ──
    const handleMemberSubmit = async () => {
        if (!newName.trim()) return;
        setSubmitting(true);

        const data = {
            name: newName.trim(),
            birth_date: newBirthDate || null,
            gender: newGender || null,
            privacy_level: newPrivacy,
            generation: 0,
        };

        if (modal.relation === 'child' && modal.parentId) {
            data.parent1_id = parseInt(modal.parentId);
        }

        const created = await apiCreatePerson(data);

        if (created && modal.relation === 'spouse' && modal.parentId) {
            // 배우자 관계 설정: 기존 인물의 spouse_id를 업데이트
            await apiUpdatePerson(modal.parentId, { spouse_id: created.id });
            // 새 인물의 spouse_id도 설정
            await apiUpdatePerson(created.id, { spouse_id: parseInt(modal.parentId) });
        }

        setSubmitting(false);
        setModal(null);
        fetchPersons();
    };

    // ── Submit: Add first person (empty tree placeholder) ──
    const handleAddFirstSubmit = async () => {
        if (!newName.trim()) return;
        setSubmitting(true);

        const genMap = { grandpa: 3, grandma: 3, father: 2, mother: 2, me: 1 };
        const data = {
            name: newName.trim(),
            birth_date: newBirthDate || null,
            gender: newGender || null,
            privacy_level: newPrivacy,
            generation: genMap[modal.placeholderRole] || 1,
        };

        await apiCreatePerson(data);
        setSubmitting(false);
        setModal(null);
        fetchPersons();
    };

    // ── Submit: Edit person ──
    const handleEditSubmit = async () => {
        if (!editPerson || !editName.trim()) return;
        setSubmitting(true);
        await apiUpdatePerson(editPerson.id, {
            name: editName.trim(),
            birth_date: editBirthDate || null,
            gender: editGender || null,
            privacy_level: editPrivacy,
        });
        setSubmitting(false);
        setModal(null);
        setEditPerson(null);
        fetchPersons();
    };

    // ── Delete person ──
    const handleDelete = async () => {
        if (!editPerson) return;
        setSubmitting(true);
        await apiDeletePerson(editPerson.id);
        setSubmitting(false);
        setModal(null);
        setEditPerson(null);
        fetchPersons();
    };

    // ── Open parents modal ──
    const openParentsModal = (childId) => {
        setModal({ mode: 'parents', childId });
        setParentType('birth');
        setParent1Name('');
        setParent2Name('');
        setSingleParent(false);
    };

    // ── Submit: Add parents ──
    const handleParentsSubmit = async () => {
        if (!parent1Name.trim()) return;
        setSubmitting(true);

        const p1 = await apiCreatePerson({
            name: parent1Name.trim(),
            generation: 0,
            privacy_level: 'family',
        });

        let p2 = null;
        if (!singleParent && parent2Name.trim()) {
            p2 = await apiCreatePerson({
                name: parent2Name.trim(),
                generation: 0,
                privacy_level: 'family',
            });
        }

        // 배우자 관계 설정
        if (p1 && p2) {
            await apiUpdatePerson(p1.id, { spouse_id: p2.id });
            await apiUpdatePerson(p2.id, { spouse_id: p1.id });
        }

        // 자녀의 parent1_id, parent2_id 설정
        if (modal.childId && p1) {
            await apiUpdatePerson(modal.childId, {
                parent1_id: p1.id,
                parent2_id: p2?.id || null,
            });
        }

        setSubmitting(false);
        setModal(null);
        fetchPersons();
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="w-full min-h-[40vh] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
        );
    }

    // ════════════════════════════════════════
    // Phase 1: Empty tree — 3-gen placeholder
    // ════════════════════════════════════════
    if (persons.length === 0 && siteId) {
        const ph = (role, label) => (
            <PlaceholderNode
                label={label}
                onClick={canEdit ? () => openAddFirst(role) : undefined}
                size="md"
            />
        );

        return (
            <div className="w-full min-h-[70vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto">
                <FamilyBanner />
                <div className="p-6">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-3">
                            <Network className="text-emerald-500" size={28} />
                            {t.museumTitle}
                        </h2>
                        <p className="text-slate-500 text-sm mt-2">
                            {lang === 'ko' ? '가족을 추가해서 나만의 패밀리트리를 만들어보세요!' : 'Add your family members to build your family tree!'}
                        </p>
                    </div>

                    {/* 3-generation placeholder */}
                    <div className="flex flex-col items-center min-w-max px-4 pb-8">
                        {/* 조부모 */}
                        <div className="flex items-end justify-center gap-10">
                            <div className="flex items-center gap-1">
                                {ph('grandpa', lang === 'ko' ? '할아버지' : 'Grandfather')}
                                <PlusConnector />
                                {ph('grandma', lang === 'ko' ? '할머니' : 'Grandmother')}
                            </div>
                        </div>

                        <VLineDashed h={24} />

                        {/* 부모 */}
                        <div className="flex items-center gap-1">
                            {ph('father', lang === 'ko' ? '아버지' : 'Father')}
                            <PlusConnector />
                            {ph('mother', lang === 'ko' ? '어머니' : 'Mother')}
                        </div>

                        <VLineDashed h={24} />

                        {/* 나 */}
                        {ph('me', lang === 'ko' ? '나' : 'Me')}
                    </div>
                </div>

                {/* Add first modal */}
                {modal?.mode === 'addFirst' && renderPersonFormModal(
                    lang === 'ko' ? '가족 추가' : 'Add Family Member',
                    handleAddFirstSubmit,
                )}
            </div>
        );
    }

    // ════════════════════════════════════════
    // Existing tree rendering
    // ════════════════════════════════════════
    const treeRoot = root;

    if (!treeRoot) {
        return (
            <div className="w-full min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center p-8">
                <Network className="text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">
                    {lang === 'ko' ? '트리를 표시할 수 없습니다' : 'Cannot display tree'}
                </h3>
            </div>
        );
    }

    // ── Render a single parent pair (recursive upward) ──
    const renderParentPair = (pair, depth = 0) => {
        return (
            <div className="flex flex-col items-center">
                <PairLabel label={pair.label} />
                <div className="flex items-end justify-center gap-6 mb-0">
                    {pair.parent1 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent1.parentPairs || []).map((gp) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, depth + 1)}
                                    <VLine h={6} />
                                </div>
                            ))}
                            {canEdit && (
                                <>
                                    <AddBtn onClick={() => openParentsModal(pair.parent1.id)} title={t.addParentsAbove} direction="up" />
                                    <VLine h={4} />
                                </>
                            )}
                        </div>
                    )}
                    {pair.parent2 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent2.parentPairs || []).map((gp) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, depth + 1)}
                                    <VLine h={6} />
                                </div>
                            ))}
                            {canEdit && (
                                <>
                                    <AddBtn onClick={() => openParentsModal(pair.parent2.id)} title={t.addParentsAbove} direction="up" />
                                    <VLine h={4} />
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {pair.parent1 && <FolderNode person={pair.parent1} onClick={() => {}} onEdit={openEditModal} size="md" canEdit={canEdit} />}
                    {pair.parent1 && pair.parent2 && <PlusConnector />}
                    {pair.parent2 && <FolderNode person={pair.parent2} onClick={() => {}} onEdit={openEditModal} size="md" canEdit={canEdit} />}
                </div>
            </div>
        );
    };

    // ── Root parents ──
    const renderRootParents = () => {
        const myPairs = treeRoot.parentPairs || [];
        const spousePairs = treeRoot.spouse?.parentPairs || [];

        return (
            <div className="flex items-end justify-center gap-10 md:gap-16">
                <div className="flex flex-col items-center">
                    <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.name}{t.parentsOf}</div>
                    <div className="flex items-end gap-6">
                        {myPairs.map((pair) => (
                            <div key={pair.id} className="flex flex-col items-center">
                                {renderParentPair(pair)}
                            </div>
                        ))}
                        {canEdit && <AddBtn onClick={() => openParentsModal(treeRoot.id)} title={t.addParentsAbove} direction="up" />}
                    </div>
                </div>
                {treeRoot.spouse && (
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.spouse.name}{t.parentsOf}</div>
                        <div className="flex items-end gap-6">
                            {spousePairs.map((pair) => (
                                <div key={pair.id} className="flex flex-col items-center">
                                    {renderParentPair(pair)}
                                </div>
                            ))}
                            {canEdit && <AddBtn onClick={() => openParentsModal(treeRoot.spouse.id)} title={t.addParentsAbove} direction="up" />}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Recursive child renderer ──
    const renderChild = (child) => {
        const hasSpouse = !!child.spouse;
        const kids = child.children || [];

        return (
            <div key={child.id} className="flex flex-col items-center">
                <VLine h={20} />
                <div className="flex items-center gap-1">
                    <FolderNode person={child} onClick={() => {}} onEdit={openEditModal} size="md" canEdit={canEdit} />
                    {hasSpouse ? (
                        <>
                            <PlusConnector />
                            <FolderNode person={child.spouse} onClick={() => {}} onEdit={openEditModal} size="md" canEdit={canEdit} />
                        </>
                    ) : canEdit ? (
                        <AddBtn onClick={() => openMemberModal(child.id, 'spouse')} title={t.addSpouse} direction="right" />
                    ) : null}
                </div>

                {kids.length > 0 && (
                    <>
                        <VLine h={16} />
                        {kids.length > 1 && (
                            <div className="flex items-center" style={{ width: `${kids.length * 120}px` }}>
                                <HLine />
                            </div>
                        )}
                        <div className="flex items-start justify-center gap-3">
                            {kids.map((gc) => renderChild(gc))}
                        </div>
                    </>
                )}

                {canEdit && (
                    <AddBtn onClick={() => openMemberModal(child.id, 'child')} title={t.addChild} direction="down" />
                )}
            </div>
        );
    };

    // ── Person form modal (shared for addFirst & member) ──
    function renderPersonFormModal(title, onSubmit) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                        <UserPlus className="text-emerald-500" /> {title}
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.nameLabel} *</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-emerald-500 dark:text-white"
                                placeholder={t.namePlaceholder} autoFocus />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {lang === 'ko' ? '생년월일' : 'Birth Date'}
                            </label>
                            <input type="date" value={newBirthDate} onChange={e => setNewBirthDate(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-emerald-500 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {lang === 'ko' ? '성별' : 'Gender'}
                            </label>
                            <div className="flex gap-2">
                                {GENDER_OPTIONS.map(g => (
                                    <button key={g.value} onClick={() => setNewGender(g.value)}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: newGender === g.value ? '#059669' : '#f0f0f0',
                                            color: newGender === g.value ? '#fff' : '#666',
                                        }}>
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                {lang === 'ko' ? '공개 범위' : 'Privacy'}
                            </label>
                            <div className="flex gap-2">
                                {PRIVACY_OPTIONS.map(p => (
                                    <button key={p.value} onClick={() => setNewPrivacy(p.value)}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={{
                                            background: newPrivacy === p.value ? '#3a3a2a' : '#f0f0f0',
                                            color: newPrivacy === p.value ? '#fff' : '#666',
                                        }}>
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setModal(null)} disabled={submitting}
                            className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                        <button onClick={onSubmit} disabled={submitting || !newName.trim()}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50">
                            {submitting ? '...' : t.add}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[70vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto custom-scrollbar">
            <FamilyBanner />

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
            </div>

            {/* === TREE === */}
            <div className="px-6 pb-6">
                <div className="flex flex-col items-center min-w-max px-4 pb-16">
                    {renderRootParents()}

                    <VLine h={24} />
                    <div className="flex items-center justify-center w-full max-w-2xl">
                        <HLine />
                        <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <HLine />
                    </div>
                    <VLine h={16} />

                    {/* Center couple */}
                    <div className="flex items-center gap-1">
                        <FolderNode person={treeRoot} onClick={() => {}} onEdit={openEditModal} size="lg" canEdit={canEdit} />
                        {treeRoot.spouse ? (
                            <>
                                <PlusConnector />
                                <FolderNode person={treeRoot.spouse} onClick={() => {}} onEdit={openEditModal} size="lg" canEdit={canEdit} />
                            </>
                        ) : canEdit ? (
                            <AddBtn onClick={() => openMemberModal(treeRoot.id, 'spouse')} title={t.addSpouse} direction="right" />
                        ) : null}
                    </div>

                    <VLine h={24} />

                    {(treeRoot.children || []).length > 0 && (
                        <>
                            <div className="flex items-center" style={{ width: `${Math.max(treeRoot.children.length * 160, 200)}px` }}>
                                <HLine />
                            </div>
                            <div className="flex items-start justify-center gap-4 md:gap-8">
                                {treeRoot.children.map((child) => renderChild(child))}
                            </div>
                        </>
                    )}

                    {canEdit && (
                        <AddBtn onClick={() => openMemberModal(treeRoot.id, 'child')} title={t.addChild} direction="down" />
                    )}
                </div>

                {/* ── Member Modal (child/spouse) ── */}
                {modal?.mode === 'member' && renderPersonFormModal(
                    modal.relation === 'spouse' ? (t.addSpouse || 'Add Spouse') : (t.addChild || 'Add Child'),
                    handleMemberSubmit,
                )}

                {/* ── Parents Modal ── */}
                {modal?.mode === 'parents' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <UserPlus className="text-indigo-500" /> {t.addParentPair}
                            </h3>
                            <div className="space-y-4">
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
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={singleParent} onChange={e => setSingleParent(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t.singleParentLabel}</span>
                                </label>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        {singleParent ? t.parentName : t.fatherLabel}
                                    </label>
                                    <input type="text" value={parent1Name} onChange={e => setParent1Name(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-indigo-500 dark:text-white"
                                        placeholder={lang === 'ko' ? '이름 입력' : 'Enter name'} autoFocus />
                                </div>
                                {!singleParent && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.motherLabel}</label>
                                        <input type="text" value={parent2Name} onChange={e => setParent2Name(e.target.value)}
                                            className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-indigo-500 dark:text-white"
                                            placeholder={lang === 'ko' ? '이름 입력' : 'Enter name'} />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button onClick={() => setModal(null)} disabled={submitting}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                                <button onClick={handleParentsSubmit} disabled={submitting || !parent1Name.trim()}
                                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50">
                                    {submitting ? '...' : t.addParents}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Edit Person Modal ── */}
                {modal?.mode === 'edit' && editPerson && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <Edit3 className="text-amber-500" /> {lang === 'ko' ? '인물 수정' : 'Edit Person'}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t.nameLabel} *</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-amber-500 dark:text-white" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        {lang === 'ko' ? '생년월일' : 'Birth Date'}
                                    </label>
                                    <input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-amber-500 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        {lang === 'ko' ? '성별' : 'Gender'}
                                    </label>
                                    <div className="flex gap-2">
                                        {GENDER_OPTIONS.map(g => (
                                            <button key={g.value} onClick={() => setEditGender(g.value)}
                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                                style={{
                                                    background: editGender === g.value ? '#d97706' : '#f0f0f0',
                                                    color: editGender === g.value ? '#fff' : '#666',
                                                }}>
                                                {g.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                                        {lang === 'ko' ? '공개 범위' : 'Privacy'}
                                    </label>
                                    <div className="flex gap-2">
                                        {PRIVACY_OPTIONS.map(p => (
                                            <button key={p.value} onClick={() => setEditPrivacy(p.value)}
                                                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                                                style={{
                                                    background: editPrivacy === p.value ? '#3a3a2a' : '#f0f0f0',
                                                    color: editPrivacy === p.value ? '#fff' : '#666',
                                                }}>
                                                {p.icon} {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Delete section */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                {!confirmDelete ? (
                                    <button onClick={() => setConfirmDelete(true)}
                                        className="w-full flex items-center justify-center gap-1 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                        <Trash2 size={14} /> {lang === 'ko' ? '이 인물 삭제' : 'Delete this person'}
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setConfirmDelete(false)}
                                            className="flex-1 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl">
                                            {t.cancel}
                                        </button>
                                        <button onClick={handleDelete} disabled={submitting}
                                            className="flex-1 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50">
                                            {lang === 'ko' ? '정말 삭제' : 'Confirm Delete'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button onClick={() => { setModal(null); setEditPerson(null); }} disabled={submitting}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl">{t.cancel}</button>
                                <button onClick={handleEditSubmit} disabled={submitting || !editName.trim()}
                                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50">
                                    {submitting ? '...' : (lang === 'ko' ? '저장' : 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
