import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Network, Plus, UserPlus, ExternalLink,
    Edit3, Trash2, Globe, Lock, Eye,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    Link2, Camera,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';

import WormholePortal from './WormholePortal';
import useUiStore from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { getT } from '../../i18n/translations';
import { personsToFamilyChart, getMainPersonId, filterConnectedNodes } from '../../utils/familyChartAdapter';

// ── Constants ──
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

const PARENT_TYPE_KEYS = [
    { value: 'birth', tKey: 'birthParents' },
    { value: 'adoptive', tKey: 'adoptiveParents' },
    { value: 'step', tKey: 'stepParents' },
    { value: 'foster', tKey: 'fosterParents' },
    { value: 'other', tKey: 'other' },
];

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function FamilyTreeView({ siteId, readOnly = false, role = 'viewer' }) {
    const navigate = useNavigate();
    const lang = useUiStore((s) => s.lang);
    const t = getT('familyTree', lang);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    const [persons, setPersons] = useState([]);
    const [relations, setRelations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [federations, setFederations] = useState([]);
    const [portalFed, setPortalFed] = useState(null);
    const [fsSyncing, setFsSyncing] = useState(false);

    const canEdit = !readOnly && (role === 'owner' || role === 'member');

    // family-chart refs
    const chartContRef = useRef(null);
    const chartRef = useRef(null);
    const mainIdRef = useRef(null);

    const getFederationForPerson = (personId) => {
        return federations.find(f =>
            String(f.source_node_id) === String(personId) || String(f.target_node_id) === String(personId)
        );
    };

    // ── Fetch persons + relations from API ──
    const fetchPersons = useCallback(async (retry = 0) => {
        if (!siteId) { setIsLoading(false); return; }
        try {
            setIsLoading(true);
            const noCache = { headers: { 'Cache-Control': 'no-cache' } };
            const [personsRes, relationsRes, fedRes] = await Promise.all([
                axios.get(`/api/persons/${siteId}`, noCache),
                axios.get(`/api/persons/${siteId}/relations`, noCache).catch(() => ({ data: { data: [] } })),
                isAuthenticated ? axios.get('/api/federation/list', noCache).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
            ]);
            const personsData = personsRes.data?.data || [];
            const relationsData = relationsRes.data?.data || [];
            setPersons(personsData);
            setRelations(relationsData);
            setFederations((fedRes.data?.data || []).filter(f => f.status === 'accepted'));
            return personsData;
        } catch (err) {
            console.error('Failed to load persons:', err);
            // 첫 실패 시 1회 재시도 (incognito 등 초기 로딩 실패 대비)
            if (retry < 1) {
                return fetchPersons(retry + 1);
            }
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [siteId, isAuthenticated]);

    useEffect(() => { fetchPersons(); }, [fetchPersons]);

    // ── FamilySearch 연동 ──
    const handleFamilySearchSync = async () => {
        try {
            setFsSyncing(true);
            // 연결 상태 확인
            const statusRes = await axios.get('/api/familysearch/status');
            if (!statusRes.data?.connected) {
                // OAuth 로그인 필요
                const authRes = await axios.get('/api/familysearch/auth');
                if (authRes.data?.authUrl) {
                    window.location.href = authRes.data.authUrl;
                    return;
                }
            }
            // 가계도 가져오기
            const treeRes = await axios.get(`/api/familysearch/tree/${siteId}`);
            if (treeRes.data?.success) {
                const count = treeRes.data.data?.importedCount || 0;
                alert(`FamilySearch에서 ${count}명의 인물을 가져왔습니다.`);
                fetchPersons();
            }
        } catch (err) {
            console.error('FamilySearch sync error:', err);
            if (err.response?.status === 401) {
                // 토큰 만료 → 재인증
                try {
                    const authRes = await axios.get('/api/familysearch/auth');
                    if (authRes.data?.authUrl) {
                        window.location.href = authRes.data.authUrl;
                        return;
                    }
                } catch { /* ignore */ }
            }
            alert(err.response?.data?.message || 'FamilySearch 연동에 실패했습니다.');
        } finally {
            setFsSyncing(false);
        }
    };

    // ── 슬라이드쇼 & 개인사 편집 모달 상태 ──
    const [slideshowPerson, setSlideshowPerson] = useState(null);
    const [slideshowPhotos, setSlideshowPhotos] = useState([]);
    const [slideshowIdx, setSlideshowIdx] = useState(0);
    const [slideshowLoading, setSlideshowLoading] = useState(false);

    const [bioPerson, setBioPerson] = useState(null);
    const [bioText, setBioText] = useState('');
    const [bioSaving, setBioSaving] = useState(false);

    // ── family-chart 카드 클릭 핸들러 (hover 버튼용) ──
    const handleCardAction = useCallback((personId, action) => {
        const raw = persons.find(p => String(p.id) === String(personId));
        if (!raw) return;
        if (action === 'edit') openEditModal(raw);
        else if (action === 'parent') openParentsModal(raw.id);
        else if (action === 'spouse') openMemberModal(raw.id, 'spouse');
        else if (action === 'child') openMemberModal(raw.id, 'child');
        else if (action === 'sibling') openMemberModal(raw.id, 'sibling');
        else if (action === 'slideshow') {
            setSlideshowPerson(raw);
            setSlideshowIdx(0);
            setSlideshowLoading(true);
            axios.get(`/api/persons/${siteId}/${raw.id}/photos`)
                .then(r => setSlideshowPhotos(r.data?.data || []))
                .catch(() => setSlideshowPhotos([]))
                .finally(() => setSlideshowLoading(false));
        }
        else if (action === 'bio') {
            setBioPerson(raw);
            setBioText(raw.biography || '');
        }
    }, [persons, siteId]);

    // 글로벌 핸들러 등록 (family-chart HTML에서 호출)
    useEffect(() => {
        window.__fcAction = handleCardAction;
        return () => { delete window.__fcAction; };
    }, [handleCardAction]);

    // ── 카드 HTML 생성 함수 (초기화/업데이트 공용) ──
    const createCardHtml = useCallback((d) => {
        const data = d.data.data || d.data;
        const fn = data['first name'] || '';
        const ln = data['last name'] || '';
        const displayName = data.display_name || `${ln}${fn}`.trim() || '?';
        const isDeceased = data.is_deceased;
        const dateLabel = data.date_label || '';
        const photoUrl = data.avatar;
        const initials = data.initials || '?';
        const fsId = data.fs_person_id;
        const pos = data.photo_position || { x: 50, y: 50 };
        const personId = d.data.id;
        const gender = data.gender;

        const btnStyle = 'width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid #93c5fd;display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;box-shadow:0 1px 3px rgba(0,0,0,0.15);font-size:12px;color:#3b82f6;';
        const hoverBtns = canEdit ? `
            <div class="fc-hover-btns" style="position:absolute;inset:-14px;pointer-events:none;opacity:0;transition:opacity 0.2s;">
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','parent')" style="position:absolute;top:0;left:50%;transform:translateX(-50%);${btnStyle}" title="부모 추가">▲</button>
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','child')" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);${btnStyle}" title="자녀 추가">▼</button>
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','sibling')" style="position:absolute;left:0;top:50%;transform:translateY(-50%);${btnStyle}" title="형제 추가">◀</button>
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','spouse')" style="position:absolute;right:0;top:50%;transform:translateY(-50%);${btnStyle}" title="배우자 추가">▶</button>
            </div>
        ` : '';

        // 멀티미디어 아이콘 (TV 슬라이드쇼 + 펜 편집) — hover 시 표시
        const mediaIconStyle = 'width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,0.85);backdrop-filter:blur(4px);border:1px solid rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;font-size:11px;transition:all 0.2s;box-shadow:0 1px 4px rgba(0,0,0,0.12);';
        const mediaIcons = `
            <div class="fc-media-icons" style="position:absolute;top:14px;right:4px;display:flex;flex-direction:column;gap:3px;opacity:0;transition:opacity 0.25s ease;pointer-events:none;z-index:5;">
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','slideshow')" style="${mediaIconStyle}" title="사진 슬라이드쇼">📺</button>
                <button onclick="event.stopPropagation();window.__fcAction('${personId}','bio')" style="${mediaIconStyle}" title="개인사 편집">✏️</button>
            </div>
        `;

        return `
            <div class="fc-card-inner" style="position:relative;width:130px;cursor:pointer;">
                <div style="position:absolute;top:0;left:8px;width:40px;height:14px;background:${gender === 'F' ? '#f9a8d4' : '#fcd34d'};border-radius:6px 6px 0 0;border:1px solid ${gender === 'F' ? '#f472b6' : '#fbbf24'};border-bottom:none;z-index:1;"></div>
                <div style="position:relative;top:10px;background:#FFFBF0;border:2px solid ${gender === 'F' ? '#f9a8d4' : '#fbbf24'};border-radius:12px;padding:12px 8px 8px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    ${fsId ? `<a href="https://www.familysearch.org/tree/person/${fsId}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="position:absolute;top:4px;left:4px;width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,0.9);border:1px solid #4a8c3f;display:flex;align-items:center;justify-content:center;z-index:2;text-decoration:none;"><span style="font-size:7px;font-weight:900;color:#4a8c3f;">FS</span></a>` : ''}
                    <div style="width:64px;height:64px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.15);overflow:hidden;background:${photoUrl ? '#e8e0d0' : '#d4a574'};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;">
                        ${photoUrl
                            ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;object-position:${pos.x}% ${pos.y}%;" />`
                            : `<span style="color:#fff;font-weight:700;font-size:18px;">${initials}</span>`
                        }
                    </div>
                    <div style="font-size:13px;font-weight:600;color:#5C4033;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 auto;line-height:1.3;">
                        ${isDeceased ? '🕯️ ' : ''}${displayName}
                    </div>
                    ${dateLabel ? `<div style="font-size:10px;color:#9E8A78;margin-top:2px;">${dateLabel}</div>` : ''}
                    ${mediaIcons}
                </div>
                ${hoverBtns}
            </div>
        `;
    }, [canEdit]);

    // ── family-chart 초기화 및 업데이트 ──
    useEffect(() => {
        if (isLoading || persons.length === 0 || !chartContRef.current) return;

        // mainId는 첫 로드 시에만 결정
        if (!mainIdRef.current) {
            mainIdRef.current = getMainPersonId(persons);
        }

        const rawData = personsToFamilyChart(persons, relations);
        // 메인 인물에서 도달 불가능한 단절 노드 제거 (크래시 방지)
        const chartData = filterConnectedNodes(rawData, mainIdRef.current);
        if (chartData.length === 0) return;

        // 기존 차트가 있으면 파괴 후 재생성 (updateData는 내부 mutation으로 불안정)
        if (chartRef.current) {
            chartRef.current = null;
            if (chartContRef.current) chartContRef.current.innerHTML = '';
        }

        // 차트 DOM 초기화 (첫 생성 시에만)
        chartContRef.current.innerHTML = '';

        try {
            // 재생성 시에도 deep copy 사용 (이전 시도에서 mutation 되었을 수 있음)
            const freshData = JSON.parse(JSON.stringify(chartData));
            const chart = f3.createChart(chartContRef.current, freshData);

            chart.setCardXSpacing(180);
            chart.setCardYSpacing(200);

            chart.setCardHtml()
                .setCardDisplay([['display_name'], ['date_label']])
                .setStyle('rect')
                .setCardDim({ w: 130, h: 160 })
                .setMiniTree(false)
                .setOnCardClick((e, d) => {
                    if (canEdit) {
                        const raw = persons.find(p => String(p.id) === String(d.data.id));
                        if (raw) openEditModal(raw);
                    }
                })
                .setCardInnerHtmlCreator(createCardHtml);

            chart.setShowSiblingsOfMain(true);
            chart.setLinkSpouseText(() => '💑');

            if (mainIdRef.current) {
                chart.updateMainId(mainIdRef.current);
            }

            chart.setTransitionTime(0);
            chart.updateTree({ initial: true, tree_position: 'fit' });

            // SVG 크기를 컨테이너에 맞게 강제 설정
            const svgEl = chartContRef.current.querySelector('svg.main_svg');
            if (svgEl) {
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
                setTimeout(() => {
                    chart.setTransitionTime(500);
                    chart.updateTree({ tree_position: 'fit' });
                }, 50);
            }

            chartRef.current = chart;
        } catch (err) {
            console.error('family-chart init error:', err);
            // 차트 생성 실패 시 빈 화면 방지 — 리로드 버튼 표시
            if (chartContRef.current) {
                chartContRef.current.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;color:#666;">
                        <p style="font-size:14px;margin-bottom:12px;">트리 로딩 중 오류가 발생했습니다</p>
                        <button onclick="location.reload()" style="padding:8px 20px;background:#4a7a3a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">새로고침</button>
                    </div>`;
            }
        }
    }, [persons, relations, isLoading, canEdit, createCardHtml]);

    // ── Modal state ──
    const [modal, setModal] = useState(null);
    const [newName, setNewName] = useState('');
    const [newRelation, setNewRelation] = useState('');
    const [newBirthDate, setNewBirthDate] = useState('');
    const [newBirthLunar, setNewBirthLunar] = useState(false);
    const [newDeceased, setNewDeceased] = useState(false);
    const [newDeathDate, setNewDeathDate] = useState('');
    const [newDeathLunar, setNewDeathLunar] = useState(false);
    const [newGender, setNewGender] = useState('');
    const [newPrivacy, setNewPrivacy] = useState('family');

    const [parentType, setParentType] = useState('birth');
    const [parent1Name, setParent1Name] = useState('');
    const [parent2Name, setParent2Name] = useState('');
    const [singleParent, setSingleParent] = useState(false);

    const [editPerson, setEditPerson] = useState(null);
    const [editName, setEditName] = useState('');
    const [editBirthDate, setEditBirthDate] = useState('');
    const [editBirthLunar, setEditBirthLunar] = useState(false);
    const [editDeceased, setEditDeceased] = useState(false);
    const [editDeathDate, setEditDeathDate] = useState('');
    const [editDeathLunar, setEditDeathLunar] = useState(false);
    const [editGender, setEditGender] = useState('');
    const [editPrivacy, setEditPrivacy] = useState('family');
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── API helpers ──
    const apiCreatePerson = async (data) => {
        if (!siteId) return null;
        try {
            const res = await axios.post(`/api/persons/${siteId}`, data);
            return res.data?.data || null;
        } catch (err) {
            console.error('createPerson error:', err);
            return null;
        }
    };

    const apiUpdatePerson = async (personId, data) => {
        if (!siteId) return null;
        try {
            const res = await axios.put(`/api/persons/${siteId}/${personId}`, data);
            return res.data?.data || null;
        } catch (err) {
            console.error('updatePerson error:', err);
            return null;
        }
    };

    const apiDeletePerson = async (personId) => {
        if (!siteId) return false;
        try {
            await axios.delete(`/api/persons/${siteId}/${personId}`);
            return true;
        } catch (err) {
            console.error('deletePerson error:', err);
            return false;
        }
    };

    const apiCreateRelation = async (data) => {
        if (!siteId) return null;
        try {
            const res = await axios.post(`/api/persons/${siteId}/relations`, data);
            return res.data?.data || null;
        } catch (err) {
            console.error('createRelation error:', err);
            return null;
        }
    };

    // ── Modal openers ──
    const openMemberModal = (parentId, relation, returnToEdit = null) => {
        setModal({ mode: 'member', parentId, relation, returnToEdit });
        setNewName('');
        setNewRelation(relation);
        setNewBirthDate('');
        setNewBirthLunar(false);
        setNewDeceased(false);
        setNewDeathDate('');
        setNewDeathLunar(false);
        setNewGender('');
        setNewPrivacy('family');
    };

    const openAddFirst = (placeholderRole) => {
        setModal({ mode: 'addFirst', placeholderRole });
        setNewName('');
        setNewBirthDate('');
        setNewBirthLunar(false);
        setNewDeceased(false);
        setNewDeathDate('');
        setNewDeathLunar(false);
        setNewGender('');
        setNewPrivacy('family');
    };

    const openEditModal = (person) => {
        const raw = person._raw || person;
        setEditPerson(raw);
        setEditName(raw.name || '');
        setEditBirthDate(raw.birth_date ? raw.birth_date.slice(0, 10) : '');
        setEditBirthLunar(raw.birth_lunar || false);
        setEditDeceased(raw.is_deceased || !!raw.death_date);
        setEditDeathDate(raw.death_date ? raw.death_date.slice(0, 10) : '');
        setEditDeathLunar(raw.death_lunar || false);
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

        try {
            const parentNode = persons.find(p => String(p.id) === String(modal.parentId));
            const parentGen = parentNode?.generation || 1;
            let gen = parentGen;
            if (modal.relation === 'child') gen = parentGen + 1;
            if (modal.relation === 'spouse' || modal.relation === 'sibling') gen = parentGen;

            const data = {
                name: newName.trim(),
                birth_date: newBirthDate || null,
                birth_lunar: newBirthLunar,
                is_deceased: newDeceased,
                death_date: newDeceased ? (newDeathDate || null) : null,
                death_lunar: newDeceased ? newDeathLunar : false,
                gender: newGender || null,
                privacy_level: newPrivacy,
                generation: gen,
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
                if (parentNode?.parent1_id) {
                    // 부모가 있으면 같은 부모 공유
                    await apiUpdatePerson(created.id, {
                        parent1_id: parentNode.parent1_id,
                        parent2_id: parentNode.parent2_id || null,
                    });
                } else {
                    // 부모가 없으면 임시 부모 자동 생성
                    const tempParentGen = parentGen + 1;
                    const personName = parentNode?.name || '?';
                    const tempFather = await apiCreatePerson({
                        name: lang === 'ko' ? `${personName}의 아버지` : `${personName}'s Father`,
                        gender: 'male',
                        generation: tempParentGen,
                        privacy_level: 'family',
                    });
                    const tempMother = await apiCreatePerson({
                        name: lang === 'ko' ? `${personName}의 어머니` : `${personName}'s Mother`,
                        gender: 'female',
                        generation: tempParentGen,
                        privacy_level: 'family',
                    });
                    if (tempFather && tempMother) {
                        await apiUpdatePerson(tempFather.id, { spouse_id: tempMother.id });
                        await apiUpdatePerson(tempMother.id, { spouse_id: tempFather.id });
                        // 기존 인물에 부모 연결
                        await apiUpdatePerson(modal.parentId, {
                            parent1_id: tempFather.id,
                            parent2_id: tempMother.id,
                        });
                        // 새 형제에도 같은 부모 연결
                        await apiUpdatePerson(created.id, {
                            parent1_id: tempFather.id,
                            parent2_id: tempMother.id,
                        });
                    }
                    toast(lang === 'ko'
                        ? `"${personName}의 아버지/어머니"가 임시로 생성되었습니다. 이름을 수정해주세요.`
                        : `Temporary parents created for "${personName}". Please update their names.`,
                        { icon: '📝', duration: 5000 });
                }
                await apiCreateRelation({
                    person1_id: parseInt(modal.parentId),
                    person2_id: created.id,
                    relation_type: 'sibling',
                });
            }
        } catch (err) {
            console.error('handleMemberSubmit error:', err);
            toast(lang === 'ko' ? '저장 중 오류가 발생했습니다.' : 'Error saving.', { icon: '❌' });
        } finally {
            await fetchPersons();
            setSubmitting(false);
            setModal(null);
        }
    };

    const handleAddFirstSubmit = async () => {
        if (!newName.trim()) return;
        setSubmitting(true);

        const genMap = { grandpa: 3, grandma: 3, father: 2, mother: 2, me: 1 };
        const data = {
            name: newName.trim(),
            birth_date: newBirthDate || null,
            birth_lunar: newBirthLunar,
            is_deceased: newDeceased,
            death_date: newDeceased ? (newDeathDate || null) : null,
            death_lunar: newDeceased ? newDeathLunar : false,
            gender: newGender || null,
            privacy_level: newPrivacy,
            generation: genMap[modal.placeholderRole] || 1,
        };

        await apiCreatePerson(data);
        await fetchPersons();
        setSubmitting(false);
        setModal(null);
    };

    const handleEditSubmit = async () => {
        if (!editPerson || !editName.trim()) return;
        setSubmitting(true);
        await apiUpdatePerson(editPerson.id, {
            name: editName.trim(),
            birth_date: editBirthDate || null,
            birth_lunar: editBirthLunar,
            is_deceased: editDeceased,
            death_date: editDeceased ? (editDeathDate || null) : null,
            death_lunar: editDeceased ? editDeathLunar : false,
            gender: editGender || null,
            privacy_level: editPrivacy,
            photo_position: editPerson.photo_position || { x: 50, y: 50 },
        });
        await fetchPersons();
        setSubmitting(false);
        setModal(null);
        setEditPerson(null);
    };

    const handleDelete = async () => {
        if (!editPerson) return;
        setSubmitting(true);
        await apiDeletePerson(editPerson.id);
        await fetchPersons();
        setSubmitting(false);
        setModal(null);
        setEditPerson(null);
    };

    const handleParentsSubmit = async () => {
        if (!parent1Name.trim()) return;
        setSubmitting(true);

        try {
            const childNode = persons.find(p => String(p.id) === String(modal.childId));

            // 이미 부모가 있으면 중복 생성 방지
            if (childNode?.parent1_id) {
                toast(lang === 'ko' ? '이미 부모가 등록되어 있습니다.' : 'Parents already registered.', { icon: '⚠️' });
                setSubmitting(false);
                setModal(null);
                return;
            }

            // 부모는 자녀보다 한 세대 위 (숫자가 큰 쪽이 윗세대)
            const parentGen = (childNode?.generation || 0) + 1;

            const p1 = await apiCreatePerson({
                name: parent1Name.trim(),
                gender: 'male',
                generation: parentGen,
                privacy_level: 'family',
            });

            let p2 = null;
            if (!singleParent && parent2Name.trim()) {
                p2 = await apiCreatePerson({
                    name: parent2Name.trim(),
                    gender: 'female',
                    generation: parentGen,
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
        } catch (err) {
            console.error('handleParentsSubmit error:', err);
            toast(lang === 'ko' ? '부모 등록 중 오류가 발생했습니다.' : 'Error registering parents.', { icon: '❌' });
        } finally {
            await fetchPersons();
            setSubmitting(false);
            setModal(null);
        }
    };

    // ── Person form modal ──
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
                            <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                                <input type="checkbox" checked={newBirthLunar} onChange={e => setNewBirthLunar(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ko' ? '음력' : 'Lunar'}</span>
                            </label>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={newDeceased} onChange={e => setNewDeceased(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    🕯️ {lang === 'ko' ? '고인' : 'Deceased'}
                                </span>
                            </label>
                            {newDeceased && (
                                <div className="mt-2">
                                    <input type="date" value={newDeathDate} onChange={e => setNewDeathDate(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-gray-400 dark:text-white" />
                                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                                        <input type="checkbox" checked={newDeathLunar} onChange={e => setNewDeathLunar(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-gray-500 focus:ring-gray-400" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ko' ? '음력' : 'Lunar'}</span>
                                    </label>
                                </div>
                            )}
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

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="w-full min-h-[40vh] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
        );
    }

    // ════════════════════════════════════════
    // Phase 1: Empty tree — placeholder
    // ════════════════════════════════════════
    if (persons.length === 0 && siteId) {
        const PlaceholderNode = ({ label, onClick }) => (
            <button onClick={onClick}
                className="w-32 h-36 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-amber-400 flex items-center justify-center mb-1">
                    <Plus size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-amber-500" />
                </div>
                <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 group-hover:text-amber-600">{label}</span>
            </button>
        );

        const PlusConn = () => (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 border-2 border-rose-300 dark:border-rose-700 self-center mx-0.5">
                <span className="text-rose-500 font-black text-sm leading-none select-none">+</span>
            </div>
        );

        const VLine = () => <div className="w-0.5 h-6 bg-gray-300 mx-auto" style={{ borderLeft: '2px dashed #9ca3af' }} />;

        return (
            <div className="w-full min-h-[70vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
                {/* FamilyBanner 제거됨 */}
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
                                <PlaceholderNode label={lang === 'ko' ? '할아버지' : 'Grandfather'} onClick={canEdit ? () => openAddFirst('grandpa') : undefined} />
                                <PlusConn />
                                <PlaceholderNode label={lang === 'ko' ? '할머니' : 'Grandmother'} onClick={canEdit ? () => openAddFirst('grandma') : undefined} />
                            </div>
                        </div>
                        <VLine />
                        <div className="flex items-center gap-1">
                            <PlaceholderNode label={lang === 'ko' ? '아버지' : 'Father'} onClick={canEdit ? () => openAddFirst('father') : undefined} />
                            <PlusConn />
                            <PlaceholderNode label={lang === 'ko' ? '어머니' : 'Mother'} onClick={canEdit ? () => openAddFirst('mother') : undefined} />
                        </div>
                        <VLine />
                        <PlaceholderNode label={lang === 'ko' ? '나' : 'Me'} onClick={canEdit ? () => openAddFirst('me') : undefined} />
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
    // Existing tree — family-chart 렌더링
    // ════════════════════════════════════════
    return (
        <div className="w-full min-h-[70vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
            {/* FamilyBanner 제거됨 */}

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
                    {canEdit && (
                        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                            <button
                                onClick={() => openAddFirst('me')}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow transition-colors flex items-center gap-1"
                            >
                                <Plus size={16} /> {lang === 'ko' ? '인물 추가' : 'Add Person'}
                            </button>
                            <button
                                onClick={handleFamilySearchSync}
                                disabled={fsSyncing}
                                className="px-4 py-2 text-white text-sm font-bold rounded-xl shadow transition-colors flex items-center gap-1 disabled:opacity-50"
                                style={{ background: fsSyncing ? '#9CA3AF' : 'linear-gradient(135deg, #4a8c3f, #3d7434)' }}
                            >
                                {fsSyncing ? '동기화 중...' : '🌳 FamilySearch 연동'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* family-chart 커스텀 스타일 */}
            <style>{`
                .fc-card-inner:hover .fc-hover-btns { opacity: 1 !important; }
                .fc-card-inner:hover .fc-media-icons { opacity: 1 !important; pointer-events: auto !important; }
                .fc-media-icons button:hover { background: #fff !important; transform: scale(1.15); box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important; }
                svg.main_svg { width: 100% !important; height: 100% !important; display: block; }
                .links_view path.link { stroke: #C4956A !important; stroke-width: 2 !important; stroke-opacity: 0.7 !important; }
                .card { overflow: visible !important; background: none !important; border: none !important; box-shadow: none !important; }
                .card-body { overflow: visible !important; background: none !important; }
                .card-inner { overflow: visible !important; }
                .card.card-male, .card.card-female, .card.card-genderless { background: none !important; border: none !important; box-shadow: none !important; }
            `}</style>

            {/* family-chart 컨테이너 */}
            <div
                ref={chartContRef}
                className="w-full"
                style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}
            />

            {/* ── Modals ── */}
            <div>
                {modal?.mode === 'member' && renderPersonFormModal(
                    modal.relation === 'spouse'
                        ? (t.addSpouse || 'Add Spouse')
                        : modal.relation === 'sibling'
                            ? (lang === 'ko' ? '형제/자매 추가' : 'Add Sibling')
                            : (t.addChild || 'Add Child'),
                    handleMemberSubmit,
                )}

                {modal?.mode === 'addFirst' && renderPersonFormModal(
                    lang === 'ko' ? '인물 추가' : 'Add Person',
                    handleAddFirstSubmit,
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
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                                <Edit3 className="text-amber-500" /> {lang === 'ko' ? '인물 수정 및 추가' : 'Edit & Add Person'}
                            </h3>
                            <div className="space-y-3">
                                {/* 사진 업로드 + 위치 조정 */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-16 h-16 rounded-full border-2 border-amber-300 overflow-hidden flex-shrink-0 flex items-center justify-center relative select-none"
                                        style={{ background: editPerson?.photo_url ? '#e8e0d0' : '#d4a574', cursor: editPerson?.photo_url ? 'move' : 'default' }}
                                        onMouseDown={(e) => {
                                            if (!editPerson?.photo_url) return;
                                            e.preventDefault();
                                            const startX = e.clientX;
                                            const startY = e.clientY;
                                            const pos = editPerson.photo_position || { x: 50, y: 50 };
                                            const startPosX = pos.x;
                                            const startPosY = pos.y;
                                            const onMove = (me) => {
                                                const dx = (me.clientX - startX) * -0.5;
                                                const dy = (me.clientY - startY) * -0.5;
                                                const nx = Math.max(0, Math.min(100, startPosX + dx));
                                                const ny = Math.max(0, Math.min(100, startPosY + dy));
                                                setEditPerson(p => ({ ...p, photo_position: { x: Math.round(nx), y: Math.round(ny) } }));
                                            };
                                            const onUp = () => {
                                                document.removeEventListener('mousemove', onMove);
                                                document.removeEventListener('mouseup', onUp);
                                            };
                                            document.addEventListener('mousemove', onMove);
                                            document.addEventListener('mouseup', onUp);
                                        }}
                                        onTouchStart={(e) => {
                                            if (!editPerson?.photo_url) return;
                                            const touch = e.touches[0];
                                            const startX = touch.clientX;
                                            const startY = touch.clientY;
                                            const pos = editPerson.photo_position || { x: 50, y: 50 };
                                            const startPosX = pos.x;
                                            const startPosY = pos.y;
                                            const onMove = (te) => {
                                                const t2 = te.touches[0];
                                                const dx = (t2.clientX - startX) * -0.5;
                                                const dy = (t2.clientY - startY) * -0.5;
                                                const nx = Math.max(0, Math.min(100, startPosX + dx));
                                                const ny = Math.max(0, Math.min(100, startPosY + dy));
                                                setEditPerson(p => ({ ...p, photo_position: { x: Math.round(nx), y: Math.round(ny) } }));
                                            };
                                            const onEnd = () => {
                                                document.removeEventListener('touchmove', onMove);
                                                document.removeEventListener('touchend', onEnd);
                                            };
                                            document.addEventListener('touchmove', onMove, { passive: true });
                                            document.addEventListener('touchend', onEnd);
                                        }}
                                    >
                                        {editPerson?.photo_url ? (
                                            <img src={editPerson.photo_url} alt="" className="w-full h-full object-cover pointer-events-none"
                                                style={{ objectPosition: `${editPerson.photo_position?.x ?? 50}% ${editPerson.photo_position?.y ?? 50}%` }} />
                                        ) : (
                                            <Camera size={24} className="text-white/70" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="cursor-pointer">
                                            <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg hover:bg-amber-200 transition-colors">
                                                {lang === 'ko' ? '사진 변경' : 'Change Photo'}
                                            </span>
                                            <input type="file" accept="image/*,.heic,.heif,.HEIC,.HEIF" className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file || !editPerson || !siteId) return;
                                                    const fd = new FormData();
                                                    fd.append('photo', file);
                                                    try {
                                                        const res = await axios.post(
                                                            `/api/persons/${siteId}/${editPerson.id}/photo`,
                                                            fd
                                                        );
                                                        if (res.data?.data?.photo_url) {
                                                            setEditPerson({ ...editPerson, photo_url: res.data.data.photo_url });
                                                            fetchPersons();
                                                        }
                                                    } catch (err) {
                                                        console.error('Photo upload error:', err);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {editPerson?.photo_url && (
                                            <span className="text-[9px] text-gray-400 dark:text-gray-500">
                                                {lang === 'ko' ? '사진 드래그로 위치 조정' : 'Drag photo to adjust'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 관계 추가 버튼 */}
                                {canEdit && (
                                    <div className="flex gap-1.5 flex-wrap">
                                        <button onClick={() => { const eid = editPerson.id; setEditPerson(null); setModal(null); setTimeout(() => openParentsModal(eid), 100); }}
                                            className="px-2 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-0.5">
                                            <ChevronUp size={10} /> {lang === 'ko' ? '부모' : 'Parent'}
                                        </button>
                                        <button onClick={() => { const eid = editPerson.id; setEditPerson(null); setModal(null); setTimeout(() => openMemberModal(eid, 'spouse', eid), 100); }}
                                            className="px-2 py-1 text-[10px] font-bold bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-0.5">
                                            <ChevronRight size={10} /> {lang === 'ko' ? '배우자' : 'Spouse'}
                                        </button>
                                        <button onClick={() => { const eid = editPerson.id; setEditPerson(null); setModal(null); setTimeout(() => openMemberModal(eid, 'child', eid), 100); }}
                                            className="px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-0.5">
                                            <ChevronDown size={10} /> {lang === 'ko' ? '자녀' : 'Child'}
                                        </button>
                                        <button onClick={() => { const eid = editPerson.id; setEditPerson(null); setModal(null); setTimeout(() => openMemberModal(eid, 'sibling', eid), 100); }}
                                            className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-0.5">
                                            <ChevronLeft size={10} /> {lang === 'ko' ? '형제' : 'Sibling'}
                                        </button>
                                    </div>
                                )}

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
                                    <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                                        <input type="checkbox" checked={editBirthLunar} onChange={e => setEditBirthLunar(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ko' ? '음력' : 'Lunar'}</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input type="checkbox" checked={editDeceased} onChange={e => setEditDeceased(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500" />
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            🕯️ {lang === 'ko' ? '고인' : 'Deceased'}
                                        </span>
                                    </label>
                                    {editDeceased && (
                                        <div className="mt-2">
                                            <input type="date" value={editDeathDate} onChange={e => setEditDeathDate(e.target.value)}
                                                className="w-full bg-gray-100 dark:bg-gray-700 px-4 py-2.5 rounded-xl outline-none border focus:border-gray-400 dark:text-white" />
                                            <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                                                <input type="checkbox" checked={editDeathLunar} onChange={e => setEditDeathLunar(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-gray-500 focus:ring-gray-400" />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ko' ? '음력' : 'Lunar'}</span>
                                            </label>
                                        </div>
                                    )}
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

            {/* ── 슬라이드쇼 모달 (전체화면) ── */}
            {slideshowPerson && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90"
                    onClick={() => setSlideshowPerson(null)}
                >
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                        <h3 className="text-white text-lg font-bold drop-shadow">
                            📺 {slideshowPerson.name}
                        </h3>
                        <button
                            onClick={() => setSlideshowPerson(null)}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {slideshowLoading ? (
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                    ) : slideshowPhotos.length === 0 ? (
                        <div className="text-center text-white/70">
                            <p className="text-5xl mb-4">📷</p>
                            <p className="text-lg">{lang === 'ko' ? '등록된 사진이 없습니다' : 'No photos yet'}</p>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={slideshowPhotos[slideshowIdx]?.url || slideshowPhotos[slideshowIdx]?.photo_url}
                                alt=""
                                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            />
                            {slideshowPhotos.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setSlideshowIdx((i) => (i - 1 + slideshowPhotos.length) % slideshowPhotos.length)}
                                        className="absolute left-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-2xl transition-colors"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setSlideshowIdx((i) => (i + 1) % slideshowPhotos.length)}
                                        className="absolute right-4 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-2xl transition-colors"
                                    >
                                        ›
                                    </button>
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                                        {slideshowIdx + 1} / {slideshowPhotos.length}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── 개인사/업적 편집 모달 ── */}
            {bioPerson && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                            ✏️ {bioPerson.name} — {lang === 'ko' ? '개인사 / 업적' : 'Biography'}
                        </h3>
                        <textarea
                            value={bioText}
                            onChange={(e) => setBioText(e.target.value)}
                            rows={12}
                            className="w-full bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-xl outline-none border focus:border-amber-500 dark:text-white text-sm resize-none"
                            placeholder={lang === 'ko'
                                ? '이 분의 이야기, 업적, 추억 등을 기록해주세요...'
                                : 'Write about this person\'s story, achievements, memories...'}
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => { setBioPerson(null); setBioText(''); }}
                                className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 rounded-xl"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={async () => {
                                    setBioSaving(true);
                                    try {
                                        await apiUpdatePerson(bioPerson.id, { biography: bioText });
                                        await fetchPersons();
                                    } catch { /* silent */ }
                                    setBioSaving(false);
                                    setBioPerson(null);
                                    setBioText('');
                                }}
                                disabled={bioSaving}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50"
                            >
                                {bioSaving ? '...' : (lang === 'ko' ? '저장' : 'Save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WormholePortal */}
            {portalFed && (
                <WormholePortal federation={portalFed} onClose={() => setPortalFed(null)} />
            )}
        </div>
    );
}
