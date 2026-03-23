import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Network, Plus, UserPlus, ExternalLink,
    Edit3, Trash2, Globe, Lock, Eye,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    Link2,
} from 'lucide-react';
import axios from 'axios';
import FamilyBanner from '../common/FamilyBanner';
import WormholePortal from './WormholePortal';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';

// ── Flat DB rows → nested tree conversion ──
function buildTreeFromPersons(persons, relations = []) {
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
            siblings: [],
            exSpouses: [],
            _raw: p,
            _relationTypes: {},
        };
    }

    // parent1_id → children
    for (const p of persons) {
        if (p.parent1_id && byId[p.parent1_id]) {
            const parent = byId[p.parent1_id];
            if (!parent.children.find(c => c.id === String(p.id))) {
                parent.children.push(byId[p.id]);
            }
        }
    }

    // spouse_id → spouse
    for (const p of persons) {
        if (p.spouse_id && byId[p.spouse_id]) {
            byId[p.id].spouse = byId[p.spouse_id];
        }
    }

    // parentPairs (birth parents from DB columns)
    for (const p of persons) {
        if (p.parent1_id && p.parent2_id && byId[p.parent1_id] && byId[p.parent2_id]) {
            const node = byId[p.id];
            const exists = node.parentPairs.find(pp =>
                pp.parent1?.id === String(p.parent1_id) && pp.parent2?.id === String(p.parent2_id)
            );
            if (!exists) {
                node.parentPairs.push({
                    id: `pp_${p.parent1_id}_${p.parent2_id}`,
                    label: 'Birth Parents',
                    type: 'birth',
                    parent1: byId[p.parent1_id],
                    parent2: byId[p.parent2_id],
                });
            }
        }
    }

    // person_relations → enrich tree
    for (const rel of relations) {
        const p1 = byId[rel.person1_id];
        const p2 = byId[rel.person2_id];
        if (!p1 || !p2) continue;

        switch (rel.relation_type) {
            case 'sibling':
            case 'half_sibling':
                if (!p1.siblings.find(s => s.id === p2.id)) p1.siblings.push(p2);
                if (!p2.siblings.find(s => s.id === p1.id)) p2.siblings.push(p1);
                p1._relationTypes[p2.id] = rel.relation_type;
                p2._relationTypes[p1.id] = rel.relation_type;
                break;
            case 'ex_spouse':
                if (!p1.exSpouses.find(s => s.id === p2.id)) p1.exSpouses.push(p2);
                if (!p2.exSpouses.find(s => s.id === p1.id)) p2.exSpouses.push(p1);
                break;
            case 'adopted':
            case 'step_parent': {
                const childNode = p2;
                const parentNode = p1;
                const pairLabel = rel.relation_type === 'adopted' ? 'Adoptive Parents' : 'Step-Parents';
                const exists = childNode.parentPairs.find(pp =>
                    pp.type === rel.relation_type && (pp.parent1?.id === parentNode.id || pp.parent2?.id === parentNode.id)
                );
                if (!exists) {
                    childNode.parentPairs.push({
                        id: `rel_${rel.id}`,
                        label: rel.label || pairLabel,
                        type: rel.relation_type,
                        parent1: parentNode,
                        parent2: null,
                    });
                }
                break;
            }
        }
    }

    // Find root: gen 1 first, else no-parent
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

// ── Person Card (folder style) with 4-direction buttons ──
function FolderNode({ person, onEdit, size = 'md', canEdit = false, onAddParent, onAddSpouse, onAddChild, onAddSibling, onWormhole }) {
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

    const dirBtnCls = 'absolute w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-600 flex items-center justify-center shadow-md hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-500 transition-all z-10 opacity-0 group-hover:opacity-100';

    return (
        <div
            className={`relative group ${s.w} ${s.h} cursor-pointer transition-all hover:-translate-y-0.5 flex-shrink-0`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* 4-direction + buttons (hover only, canEdit only) */}
            {canEdit && (
                <>
                    {onAddParent && (
                        <button onClick={(e) => { e.stopPropagation(); onAddParent(); }}
                            className={`${dirBtnCls}`}
                            style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}
                            title="부모 추가">
                            <ChevronUp size={12} className="text-blue-500" />
                        </button>
                    )}
                    {onAddChild && (
                        <button onClick={(e) => { e.stopPropagation(); onAddChild(); }}
                            className={`${dirBtnCls}`}
                            style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }}
                            title="자녀 추가">
                            <ChevronDown size={12} className="text-blue-500" />
                        </button>
                    )}
                    {onAddSpouse && (
                        <button onClick={(e) => { e.stopPropagation(); onAddSpouse(); }}
                            className={`${dirBtnCls}`}
                            style={{ right: -8, top: '50%', transform: 'translateY(-50%)' }}
                            title="배우자 추가">
                            <ChevronRight size={12} className="text-blue-500" />
                        </button>
                    )}
                    {onAddSibling && (
                        <button onClick={(e) => { e.stopPropagation(); onAddSibling(); }}
                            className={`${dirBtnCls}`}
                            style={{ left: -8, top: '50%', transform: 'translateY(-50%)' }}
                            title="형제 추가">
                            <ChevronLeft size={12} className="text-blue-500" />
                        </button>
                    )}
                </>
            )}

            <div className={`absolute top-0 left-2 ${s.tab} bg-amber-300 dark:bg-amber-700 rounded-t-lg border-t border-x border-amber-400 dark:border-amber-600 group-hover:bg-amber-400 transition-colors`} />
            <div className={`absolute ${s.top} inset-x-0 bottom-0 bg-amber-100 dark:bg-amber-900/60 border-2 border-amber-300 dark:border-amber-700 rounded-xl shadow-lg group-hover:border-amber-400 group-hover:shadow-xl transition-all flex flex-col items-center justify-center p-2 gap-0.5 relative`}>
                <PrivBadge level={person.privacy_level || 'family'} />

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

                <span className={`${s.text} font-bold text-amber-900 dark:text-amber-100 text-center leading-tight truncate w-full`}>
                    {person.name}
                </span>

                {birthLabel && (
                    <span className={`${s.sub} text-amber-600 dark:text-amber-400`}>
                        {birthLabel}
                    </span>
                )}

                {canEdit && hovered && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(person); }}
                        className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                        <Edit3 size={10} style={{ color: '#fff' }} />
                    </button>
                )}
                {onWormhole && hovered && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onWormhole(); }}
                        className="absolute bottom-1 left-1 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                        style={{ background: 'rgba(142,68,173,0.7)' }}
                        title="연결된 박물관 보기"
                    >
                        <Link2 size={10} style={{ color: '#fff' }} />
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

function PlusConnector({ dashed = false }) {
    const border = dashed ? 'border-dashed border-gray-400 dark:border-gray-500' : 'border-rose-300 dark:border-rose-700';
    const bg = dashed ? 'bg-gray-100 dark:bg-gray-800' : 'bg-rose-100 dark:bg-rose-900/40';
    return (
        <div className={`flex items-center justify-center w-7 h-7 rounded-full ${bg} border-2 ${border} self-center mx-0.5 flex-shrink-0`}>
            <span className={`${dashed ? 'text-gray-400' : 'text-rose-500'} font-black text-sm leading-none select-none`}>+</span>
        </div>
    );
}

function VLine({ h = 8, dashed = false }) {
    if (dashed) return <div style={{ height: h, borderLeft: '2px dashed #9ca3af' }} className="mx-auto flex-shrink-0" />;
    return <div style={{ height: h }} className="w-0.5 bg-amber-300 dark:bg-amber-700 mx-auto flex-shrink-0" />;
}

function HLine({ dashed = false }) {
    if (dashed) return <div className="h-0 flex-1 min-w-[16px] border-t-2 border-dashed border-gray-400 dark:border-gray-500" />;
    return <div className="h-0.5 bg-amber-300 dark:bg-amber-700 flex-1 min-w-[16px]" />;
}

function PairLabel({ label, type }) {
    const colors = {
        birth: 'text-indigo-500 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-800',
        adopted: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800',
        step_parent: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800',
        foster: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-800',
    };
    const cls = colors[type] || colors.birth;
    return (
        <div className={`text-[9px] font-bold ${cls} border px-2 py-0.5 rounded-full text-center mb-1 whitespace-nowrap`}>
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
    const [relations, setRelations] = useState([]);
    const [root, setRoot] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [federations, setFederations] = useState([]);
    const [portalFed, setPortalFed] = useState(null);

    const canEdit = !readOnly && (role === 'owner' || role === 'member');

    // 인물에 연결된 페더레이션 찾기
    const getFederationForPerson = (personId) => {
        return federations.find(f =>
            String(f.source_node_id) === String(personId) || String(f.target_node_id) === String(personId)
        );
    };

    // ── Fetch persons + relations from API ──
    const fetchPersons = useCallback(async () => {
        if (!siteId) { setIsLoading(false); return; }
        try {
            setIsLoading(true);
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const [personsRes, relationsRes, fedRes] = await Promise.all([
                axios.get(`/api/persons/${siteId}`, config),
                axios.get(`/api/persons/${siteId}/relations`, config).catch(() => ({ data: { data: [] } })),
                token ? axios.get('/api/federation/list', config).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
            ]);
            const personsData = personsRes.data?.data || [];
            const relationsData = relationsRes.data?.data || [];
            setPersons(personsData);
            setRelations(relationsData);
            setFederations((fedRes.data?.data || []).filter(f => f.status === 'accepted'));
            const tree = buildTreeFromPersons(personsData, relationsData);
            setRoot(tree);
        } catch (err) {
            console.error('Failed to load persons:', err);
        } finally {
            setIsLoading(false);
        }
    }, [siteId, token]);

    useEffect(() => { fetchPersons(); }, [fetchPersons]);

    // ── Modal state ──
    const [modal, setModal] = useState(null);
    const [newName, setNewName] = useState('');
    const [newRelation, setNewRelation] = useState('');
    const [newBirthDate, setNewBirthDate] = useState('');
    const [newGender, setNewGender] = useState('');
    const [newPrivacy, setNewPrivacy] = useState('family');

    const [parentType, setParentType] = useState('birth');
    const [parent1Name, setParent1Name] = useState('');
    const [parent2Name, setParent2Name] = useState('');
    const [singleParent, setSingleParent] = useState(false);

    const [editPerson, setEditPerson] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editPrivacy, setEditPrivacy] = useState('family');
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── API helpers ──
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

    const apiCreateRelation = async (data) => {
        if (!siteId || !token) return null;
        try {
            const res = await axios.post(`/api/persons/${siteId}/relations`, data, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data?.data || null;
        } catch (err) {
            console.error('createRelation error:', err);
            return null;
        }
    };

    // ── Modal openers ──
    const openMemberModal = (parentId, relation) => {
        setModal({ mode: 'member', parentId, relation });
        setNewName('');
        setNewRelation(relation);
        setNewBirthDate('');
        setNewGender('');
        setNewPrivacy('family');
    };

    const openAddFirst = (placeholderRole) => {
        setModal({ mode: 'addFirst', placeholderRole });
        setNewName('');
        setNewBirthDate('');
        setNewGender('');
        setNewPrivacy('family');
    };

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

    const openParentsModal = (childId) => {
        setModal({ mode: 'parents', childId });
        setParentType('birth');
        setParent1Name('');
        setParent2Name('');
        setSingleParent(false);
    };

    // ── Submits ──
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
            await apiUpdatePerson(modal.parentId, { spouse_id: created.id });
            await apiUpdatePerson(created.id, { spouse_id: parseInt(modal.parentId) });
        }

        if (created && modal.relation === 'sibling' && modal.parentId) {
            await apiCreateRelation({
                person1_id: parseInt(modal.parentId),
                person2_id: created.id,
                relation_type: 'sibling',
            });
        }

        setSubmitting(false);
        setModal(null);
        fetchPersons();
    };

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

    const handleDelete = async () => {
        if (!editPerson) return;
        setSubmitting(true);
        await apiDeletePerson(editPerson.id);
        setSubmitting(false);
        setModal(null);
        setEditPerson(null);
        fetchPersons();
    };

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

        if (p1 && p2) {
            await apiUpdatePerson(p1.id, { spouse_id: p2.id });
            await apiUpdatePerson(p2.id, { spouse_id: p1.id });
        }

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

                    <div className="flex flex-col items-center min-w-max px-4 pb-8">
                        <div className="flex items-end justify-center gap-10">
                            <div className="flex items-center gap-1">
                                {ph('grandpa', lang === 'ko' ? '할아버지' : 'Grandfather')}
                                <PlusConnector />
                                {ph('grandma', lang === 'ko' ? '할머니' : 'Grandmother')}
                            </div>
                        </div>

                        <VLine h={24} dashed />

                        <div className="flex items-center gap-1">
                            {ph('father', lang === 'ko' ? '아버지' : 'Father')}
                            <PlusConnector />
                            {ph('mother', lang === 'ko' ? '어머니' : 'Mother')}
                        </div>

                        <VLine h={24} dashed />

                        {ph('me', lang === 'ko' ? '나' : 'Me')}
                    </div>
                </div>

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
        const isDashed = pair.type === 'adopted' || pair.type === 'step_parent';
        return (
            <div className="flex flex-col items-center">
                <PairLabel label={pair.label} type={pair.type} />
                <div className="flex items-end justify-center gap-6 mb-0">
                    {pair.parent1 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent1.parentPairs || []).map((gp) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, depth + 1)}
                                    <VLine h={6} dashed={gp.type === 'adopted' || gp.type === 'step_parent'} />
                                </div>
                            ))}
                        </div>
                    )}
                    {pair.parent2 && (
                        <div className="flex flex-col items-center">
                            {(pair.parent2.parentPairs || []).map((gp) => (
                                <div key={gp.id} className="flex flex-col items-center mb-1">
                                    {renderParentPair(gp, depth + 1)}
                                    <VLine h={6} dashed={gp.type === 'adopted' || gp.type === 'step_parent'} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {pair.parent1 && (
                        <FolderNode
                            person={pair.parent1}
                            onEdit={openEditModal}
                            size="md"
                            canEdit={canEdit}
                            onAddParent={() => openParentsModal(pair.parent1.id)}
                            onAddChild={() => openMemberModal(pair.parent1.id, 'child')}
                            onAddSpouse={!pair.parent1.spouse ? () => openMemberModal(pair.parent1.id, 'spouse') : undefined}
                        />
                    )}
                    {pair.parent1 && pair.parent2 && <PlusConnector dashed={isDashed} />}
                    {pair.parent2 && (
                        <FolderNode
                            person={pair.parent2}
                            onEdit={openEditModal}
                            size="md"
                            canEdit={canEdit}
                            onAddParent={() => openParentsModal(pair.parent2.id)}
                        />
                    )}
                </div>
            </div>
        );
    };

    // ── Root parents ──
    const renderRootParents = () => {
        const myPairs = treeRoot.parentPairs || [];
        const spousePairs = treeRoot.spouse?.parentPairs || [];

        if (myPairs.length === 0 && spousePairs.length === 0 && !canEdit) return null;

        return (
            <div className="flex items-end justify-center gap-10 md:gap-16">
                <div className="flex flex-col items-center">
                    {myPairs.length > 0 && (
                        <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.name}{t.parentsOf}</div>
                    )}
                    <div className="flex items-end gap-6">
                        {myPairs.map((pair) => (
                            <div key={pair.id} className="flex flex-col items-center">
                                {renderParentPair(pair)}
                            </div>
                        ))}
                    </div>
                </div>
                {treeRoot.spouse && spousePairs.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] font-bold text-gray-500 mb-2">{treeRoot.spouse.name}{t.parentsOf}</div>
                        <div className="flex items-end gap-6">
                            {spousePairs.map((pair) => (
                                <div key={pair.id} className="flex flex-col items-center">
                                    {renderParentPair(pair)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Render siblings row ──
    const renderSiblings = (person) => {
        const sibs = person.siblings || [];
        if (sibs.length === 0 && !canEdit) return null;
        if (sibs.length === 0) return null;

        return (
            <div className="flex items-center gap-2 mt-1">
                {sibs.map((sib) => {
                    const relType = person._relationTypes?.[sib.id];
                    const isDashed = relType === 'half_sibling';
                    return (
                        <div key={sib.id} className="flex items-center gap-1">
                            {isDashed ? <HLine dashed /> : <HLine />}
                            <FolderNode
                                person={sib}
                                onEdit={openEditModal}
                                size="sm"
                                canEdit={canEdit}
                                onAddSpouse={!sib.spouse ? () => openMemberModal(sib.id, 'spouse') : undefined}
                                onAddChild={() => openMemberModal(sib.id, 'child')}
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Recursive child renderer ──
    const renderChild = (child) => {
        const hasSpouse = !!child.spouse;
        const hasExSpouses = (child.exSpouses || []).length > 0;
        const kids = child.children || [];

        return (
            <div key={child.id} className="flex flex-col items-center">
                <VLine h={20} />
                <div className="flex items-center gap-1">
                    {/* Ex-spouses (left side, dashed) */}
                    {hasExSpouses && child.exSpouses.map((ex) => (
                        <React.Fragment key={ex.id}>
                            <FolderNode
                                person={ex}
                                onEdit={openEditModal}
                                size="sm"
                                canEdit={canEdit}
                            />
                            <PlusConnector dashed />
                        </React.Fragment>
                    ))}

                    <FolderNode
                        person={child}
                        onEdit={openEditModal}
                        size="md"
                        canEdit={canEdit}
                        onAddParent={!child._raw?.parent1_id ? () => openParentsModal(child.id) : undefined}
                        onAddSpouse={!hasSpouse ? () => openMemberModal(child.id, 'spouse') : undefined}
                        onAddChild={() => openMemberModal(child.id, 'child')}
                        onAddSibling={() => openMemberModal(child.id, 'sibling')}
                        onWormhole={getFederationForPerson(child.id) ? () => setPortalFed(getFederationForPerson(child.id)) : undefined}
                    />
                    {hasSpouse && (
                        <>
                            <PlusConnector />
                            <FolderNode
                                person={child.spouse}
                                onEdit={openEditModal}
                                size="md"
                                canEdit={canEdit}
                                onAddParent={!child.spouse._raw?.parent1_id ? () => openParentsModal(child.spouse.id) : undefined}
                            />
                        </>
                    )}
                </div>

                {/* Siblings row */}
                {renderSiblings(child)}

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
            </div>
        );
    };

    // ── Person form modal (shared for addFirst, member, sibling) ──
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

                    {(treeRoot.parentPairs?.length > 0 || treeRoot.spouse?.parentPairs?.length > 0) && (
                        <>
                            <VLine h={24} />
                            <div className="flex items-center justify-center w-full max-w-2xl">
                                <HLine />
                                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                                <HLine />
                            </div>
                            <VLine h={16} />
                        </>
                    )}

                    {/* Center couple + ex-spouses */}
                    <div className="flex items-center gap-1">
                        {/* Ex-spouses on left */}
                        {(treeRoot.exSpouses || []).map((ex) => (
                            <React.Fragment key={ex.id}>
                                <FolderNode
                                    person={ex}
                                    onEdit={openEditModal}
                                    size="sm"
                                    canEdit={canEdit}
                                />
                                <PlusConnector dashed />
                            </React.Fragment>
                        ))}

                        <FolderNode
                            person={treeRoot}
                            onEdit={openEditModal}
                            size="lg"
                            canEdit={canEdit}
                            onAddParent={!treeRoot._raw?.parent1_id ? () => openParentsModal(treeRoot.id) : undefined}
                            onAddSpouse={!treeRoot.spouse ? () => openMemberModal(treeRoot.id, 'spouse') : undefined}
                            onAddChild={() => openMemberModal(treeRoot.id, 'child')}
                            onAddSibling={() => openMemberModal(treeRoot.id, 'sibling')}
                            onWormhole={getFederationForPerson(treeRoot.id) ? () => setPortalFed(getFederationForPerson(treeRoot.id)) : undefined}
                        />
                        {treeRoot.spouse ? (
                            <>
                                <PlusConnector />
                                <FolderNode
                                    person={treeRoot.spouse}
                                    onEdit={openEditModal}
                                    size="lg"
                                    canEdit={canEdit}
                                    onAddParent={!treeRoot.spouse._raw?.parent1_id ? () => openParentsModal(treeRoot.spouse.id) : undefined}
                                />
                            </>
                        ) : null}
                    </div>

                    {/* Siblings row */}
                    {renderSiblings(treeRoot)}

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
                </div>

                {/* ── Member Modal (child/spouse/sibling) ── */}
                {modal?.mode === 'member' && renderPersonFormModal(
                    modal.relation === 'spouse'
                        ? (t.addSpouse || 'Add Spouse')
                        : modal.relation === 'sibling'
                            ? (lang === 'ko' ? '형제/자매 추가' : 'Add Sibling')
                            : (t.addChild || 'Add Child'),
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

            {/* WormholePortal */}
            {portalFed && (
                <WormholePortal federation={portalFed} onClose={() => setPortalFed(null)} />
            )}
        </div>
    );
}
