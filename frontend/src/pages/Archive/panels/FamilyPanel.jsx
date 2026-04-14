/**
 * panels/FamilyPanel.jsx — §8/§9 가족 관리
 *
 * 레이아웃 (MyInfoPanel과 동일 구조):
 *   1. 180×180 사진박스 (항상 표시)
 *   2. 인물정보 폼 (항상 표시, 선택 인물에 따라 내용 변경)
 *   3. [저장/생성] 버튼
 *   ── 구분선 ──
 *   4. 간이 가계도 (MiniTree) — 하단 항상 표시
 *      클릭 → 해당 인물 폼에 로드 / + 버튼 → 추가 모드
 *
 * §23 연결선:
 *   - 단일 자녀: 수직선
 *   - 다자녀: width:fit-content 브래킷 + 개별 수직선
 *
 * 보완 구조: 마운트 시 관계 누락 인물 자동 복구
 */

import { useState, useRef, useEffect } from 'react';
import { toast }                        from 'react-hot-toast';
import { useTreeStore }                 from '../../../store/treeStore';
import {
  createPerson, savePerson, deleteRelation, uploadPhoto, repairRelations,
} from './archiveApi';

// ── 상수 ─────────────────────────────────────────────────────────────────────
const LINE      = '#C4A882';
const MINI_W    = 56;
const MINI_GAP  = 8;
const REL_LABEL = { parent: '부모', child: '자녀', spouse: '배우자', sibling: '형제자매' };

// ── 관계 필터 헬퍼 ────────────────────────────────────────────────────────────
function filterRels(relations, personId, tab) {
  if (!personId) return [];
  const id = Number(personId);
  switch (tab) {
    case 'parent':  return relations.filter(r => r.relation_type === 'parent'  && Number(r.person2_id) === id);
    case 'child':   return relations.filter(r => r.relation_type === 'parent'  && Number(r.person1_id) === id);
    case 'spouse':  return relations.filter(r => r.relation_type === 'spouse'  && (Number(r.person1_id) === id || Number(r.person2_id) === id));
    case 'sibling': return relations.filter(r => r.relation_type === 'sibling' && (Number(r.person1_id) === id || Number(r.person2_id) === id));
    default: return [];
  }
}

function otherOf(rel, personId) {
  return Number(rel.person1_id) === Number(personId) ? rel.person2_id : rel.person1_id;
}

// ── MiniNode ─────────────────────────────────────────────────────────────────
function MiniNode({ name, photo, isMain, isSelected, onClick, onRemove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: MINI_W }}>
      <div
        style={{
          ...mn.box,
          ...(isMain     ? mn.boxMain : {}),
          ...(isSelected ? mn.boxSel  : {}),
          cursor: isMain ? 'default' : 'pointer',
        }}
        onClick={!isMain ? onClick : undefined}
      >
        {photo
          ? <img src={photo} alt={name} style={mn.photo} />
          : <span style={mn.icon}>👤</span>
        }
        {!isMain && onRemove && (
          <button
            style={mn.rmBtn}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title="관계 해제"
          >×</button>
        )}
      </div>
      <span style={mn.name}>{name}</span>
    </div>
  );
}

const mn = {
  box:     { width: 40, height: 40, borderRadius: 6, border: `1px solid ${LINE}`, background: '#FDFBF7', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  boxMain: { background: '#F0EAE0', borderColor: '#8B7355', borderWidth: 2 },
  boxSel:  { background: '#E8DFD0', borderColor: '#5A3D1A', borderWidth: 2 },
  photo:   { width: '100%', height: '100%', objectFit: 'cover' },
  icon:    { fontSize: 18, color: LINE },
  rmBtn:   { position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: '#C0392B', color: '#fff', border: 'none', borderRadius: '0 4px 0 4px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 },
  name:    { fontSize: 10, color: '#3a2a1a', marginTop: 2, width: MINI_W, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};

// ── 간이 가계도 ───────────────────────────────────────────────────────────────
function MiniTree({ personId, relations, getNodeName, getNodePhoto, selectedId, onSelect, onAdd, onRemoveRel }) {
  const parents  = filterRels(relations, personId, 'parent');
  const spouses  = filterRels(relations, personId, 'spouse');
  const children = filterRels(relations, personId, 'child');
  const siblings = filterRels(relations, personId, 'sibling');

  const Vline = () => <div style={{ width: 1, height: 16, background: LINE, margin: '2px auto' }} />;

  return (
    <div style={mt.wrap}>
      <div style={mt.divider} />
      <div style={mt.title}>간이 가계도</div>

      {/* 부모 행 */}
      {parents.length > 0 && (
        <div style={{ display: 'flex', gap: MINI_GAP, justifyContent: 'center', marginBottom: 2 }}>
          {parents.map(r => {
            const id = Number(r.person1_id);
            return (
              <MiniNode key={id}
                name={getNodeName(id)} photo={getNodePhoto(id)}
                isSelected={selectedId === id}
                onClick={() => onSelect(id)}
                onRemove={() => onRemoveRel(r.id, getNodeName(id))}
              />
            );
          })}
        </div>
      )}
      {parents.length > 0 && <Vline />}

      {/* 관장 + 형제 + 배우자 행 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {siblings.map(r => {
          const id = Number(otherOf(r, personId));
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
              <MiniNode
                name={getNodeName(id)} photo={getNodePhoto(id)}
                isSelected={selectedId === id}
                onClick={() => onSelect(id)}
                onRemove={() => onRemoveRel(r.id, getNodeName(id))}
              />
              <div style={{ width: 12, height: 1, background: LINE }} />
            </div>
          );
        })}
        <MiniNode name={getNodeName(Number(personId))} photo={getNodePhoto(Number(personId))} isMain />
        {spouses.map(r => {
          const id = Number(otherOf(r, personId));
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 12, height: 1, background: LINE }} />
              <MiniNode
                name={getNodeName(id)} photo={getNodePhoto(id)}
                isSelected={selectedId === id}
                onClick={() => onSelect(id)}
                onRemove={() => onRemoveRel(r.id, getNodeName(id))}
              />
            </div>
          );
        })}
      </div>

      {/* 관계 추가 버튼 */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', margin: '6px 0' }}>
        <button style={mt.addBtn} onClick={() => onAdd('parent')}>+ 부모</button>
        <button style={mt.addBtn} onClick={() => onAdd('sibling')}>+ 형제</button>
        <button style={mt.addBtn} onClick={() => onAdd('spouse')}>+ 배우자</button>
      </div>

      {/* 자녀 연결선 */}
      {children.length > 0 && <Vline />}

      {/* 자녀 행 — §23 수평 브래킷 */}
      {children.length === 1 && (() => {
        const r = children[0];
        const id = Number(r.person2_id);
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MiniNode
              name={getNodeName(id)} photo={getNodePhoto(id)}
              isSelected={selectedId === id}
              onClick={() => onSelect(id)}
              onRemove={() => onRemoveRel(r.id, getNodeName(id))}
            />
          </div>
        );
      })()}

      {children.length > 1 && (
        <div style={{ position: 'relative', display: 'flex', gap: MINI_GAP, width: 'fit-content', margin: '0 auto', paddingTop: 10 }}>
          <div style={{ position: 'absolute', top: 0, left: MINI_W / 2, right: MINI_W / 2, height: 1, background: LINE }} />
          {children.map(r => {
            const id = Number(r.person2_id);
            return (
              <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: MINI_W }}>
                <div style={{ width: 1, height: 10, background: LINE }} />
                <MiniNode
                  name={getNodeName(id)} photo={getNodePhoto(id)}
                  isSelected={selectedId === id}
                  onClick={() => onSelect(id)}
                  onRemove={() => onRemoveRel(r.id, getNodeName(id))}
                />
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
        <button style={mt.addBtn} onClick={() => onAdd('child')}>+ 자녀</button>
      </div>
    </div>
  );
}

// ── 빈 폼 기본값 ──────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '',
  gender: 'M',
  birthYear: '', birthMonth: '', birthDay: '', birthLunar: false,
  isDeceased: false, deathYear: '', deathMonth: '', deathDay: '',
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FamilyPanel({ curatorNode, personId, siteId, relations, refreshRelations }) {
  const { nodes, invalidate } = useTreeStore();
  const fileRef = useRef(null);

  const [relTab,            setRelTab]            = useState('child');
  const [selectedId,        setSelectedId]        = useState(null);
  const [selectedNodeCache, setSelectedNodeCache] = useState(null);
  const [isAddMode,         setIsAddMode]         = useState(false);
  const [confirmDel,        setConfirmDel]        = useState(null);
  const [saving,            setSaving]            = useState(false);
  const [uploading,         setUploading]         = useState(false);

  const [preview,     setPreview]     = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);
  const [form,        setForm]        = useState(EMPTY_FORM);

  // ── 노드 조회 헬퍼 ─────────────────────────────────────────────────────────
  const getNode = id => {
    const n = nodes.find(n => n.id === Number(id) || n.personId === String(id));
    if (n) return n;
    for (const rel of relations) {
      if (Number(rel.person1_id) === Number(id) && rel.person1) return rel.person1;
      if (Number(rel.person2_id) === Number(id) && rel.person2) return rel.person2;
    }
    return null;
  };
  const getNodeName = id => {
    if (Number(id) === Number(personId)) return curatorNode?.name ?? '관장';
    const n = getNode(id);
    return n ? (n.name ?? `${n.last_name ?? ''}${n.first_name ?? ''}`) : `#${id}`;
  };
  const getNodePhoto = id => {
    if (Number(id) === Number(personId)) return curatorNode?.photoUrl ?? curatorNode?.photo_url ?? null;
    const n = getNode(id);
    return n?.photoUrl ?? n?.photo_url ?? null;
  };

  const selectedNode = selectedId ? (getNode(selectedId) ?? selectedNodeCache) : null;

  // ── 보완 구조: 마운트 시 관계 자동 복구 ────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    repairRelations(siteId)
      .then(r => { if (r?.created > 0) { invalidate(); refreshRelations(); } })
      .catch(() => {});
  }, [siteId]);

  // ── 선택 인물 → 폼 동기화 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedNode) {
      if (!isAddMode) { setPreview(null); setForm(EMPTY_FORM); }
      return;
    }
    const ph = selectedNode.photoUrl ?? selectedNode.photo_url ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoScale(1);

    const bd = (selectedNode.birthDate ?? selectedNode.birth_date ?? '').split('T')[0];
    const [by = '', bm = '', bday = ''] = bd ? bd.split('-') : [];
    const dd = (selectedNode.deathDate ?? selectedNode.death_date ?? '').split('T')[0];
    const [dy = '', dm = '', dday = ''] = dd ? dd.split('-') : [];

    const enFull  = selectedNode.name_en ?? '';
    const enParts = enFull.trim().split(/\s+/);
    const rawG    = selectedNode.gender ?? 'M';
    const gender  = rawG === 'male' ? 'M' : rawG === 'female' ? 'F' : rawG || 'M';

    setForm({
      lastName:    selectedNode.last_name  ?? selectedNode.lastName  ?? '',
      firstName:   selectedNode.first_name ?? selectedNode.firstName ?? selectedNode.name ?? '',
      nameEnLast:  selectedNode.name_en_last  ?? enParts[0] ?? '',
      nameEnFirst: selectedNode.name_en_first ?? enParts.slice(1).join(' ') ?? '',
      gender,
      birthYear: by, birthMonth: bm, birthDay: bday,
      birthLunar: selectedNode.birth_lunar ?? false,
      isDeceased: selectedNode.isDeceased ?? selectedNode.is_deceased ?? false,
      deathYear: dy, deathMonth: dm, deathDay: dday,
    });
  }, [selectedNode]);

  // ── 핸들러 ────────────────────────────────────────────────────────────────
  function handleSelectNode(id) {
    setSelectedId(id);
    setSelectedNodeCache(getNode(id));
    setIsAddMode(false);
  }

  function handleAddMode(relType) {
    setRelTab(relType);
    setSelectedId(null);
    setSelectedNodeCache(null);
    setIsAddMode(true);
    setPreview(null);
    setForm(EMPTY_FORM);
  }

  function cancelEdit() {
    setSelectedId(null);
    setSelectedNodeCache(null);
    setIsAddMode(false);
    setPreview(null);
    setForm(EMPTY_FORM);
  }

  function findRelation(otherId) {
    const myId = Number(personId);
    const oid  = Number(otherId);
    for (const rel of relations) {
      const p1 = Number(rel.person1_id);
      const p2 = Number(rel.person2_id);
      if ((p1 === myId && p2 === oid) || (p1 === oid && p2 === myId)) return rel;
    }
    return null;
  }

  // ── 사진 드래그 ────────────────────────────────────────────────────────────
  function handleDragStart(e) {
    e.preventDefault();
    const sx = e.clientX - photoOffset.x;
    const sy = e.clientY - photoOffset.y;
    const onMove = ev => setPhotoOffset({ x: ev.clientX - sx, y: ev.clientY - sy });
    const onUp   = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ── 사진 업로드 ────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !siteId || !selectedNode?.id) return;
    setUploading(true);
    try {
      const json   = await uploadPhoto(siteId, selectedNode.id, file);
      const rawUrl = json.data?.photo_url ?? URL.createObjectURL(file);
      setPreview(rawUrl.startsWith('blob:') ? rawUrl : `${rawUrl}?v=${Date.now()}`);
      invalidate();
      toast.success('사진이 저장됐습니다.');
    } catch {
      toast.error('사진 업로드 실패');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── 저장 ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!siteId || !selectedNode?.id) return;
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2,'0'), form.birthDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      const deathDate = form.isDeceased && form.deathYear
        ? [form.deathYear, form.deathMonth?.padStart(2,'0'), form.deathDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      const genderDb = form.gender === 'male' ? 'M' : form.gender === 'female' ? 'F' : form.gender;
      await savePerson(siteId, selectedNode.id, {
        name:        `${(form.lastName||'').trim()}${(form.firstName||'').trim()}`,
        first_name:  form.firstName?.trim() || null,
        last_name:   form.lastName?.trim()  || null,
        name_en:     [form.nameEnLast, form.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:      genderDb,
        birth_date:  birthDate,
        birth_lunar: form.birthLunar,
        is_deceased: form.isDeceased,
        death_date:  deathDate,
      });
      toast.success('저장됐습니다.');
      await invalidate();
      await refreshRelations();
    } catch {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 생성 ──────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!siteId || !form.firstName.trim()) { toast.error('이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2,'0'), form.birthDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      await createPerson(siteId, {
        name:          `${form.lastName.trim()}${form.firstName.trim()}`,
        first_name:    form.firstName.trim(),
        last_name:     form.lastName.trim() || null,
        name_en:       [form.nameEnLast, form.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:        form.gender,
        birth_date:    birthDate,
        birth_lunar:   form.birthLunar,
        relation_type: relTab,
        relative_id:   personId,
      });
      await invalidate();
      await refreshRelations();
      cancelEdit();
      toast.success('추가됐습니다.');
    } catch (err) {
      toast.error(err.message || '추가 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 관계 해제 ──────────────────────────────────────────────────────────────
  async function handleDeleteRelation(relationId) {
    try {
      await deleteRelation(siteId, relationId);
      await invalidate();
      await refreshRelations();
      cancelEdit();
      toast.success('관계가 해제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    } finally {
      setConfirmDel(null);
    }
  }

  // ── 헤더 레이블 결정 ────────────────────────────────────────────────────────
  const canPhotoUpload = !isAddMode && !!selectedNode;
  const headerLabel = isAddMode
    ? `+ ${REL_LABEL[relTab]} 추가`
    : selectedNode
      ? (selectedNode.name ?? getNodeName(selectedId))
      : '가족 구성원을 선택하거나 추가하세요';

  return (
    <div style={s.wrap}>

      {/* ── 헤더 ── */}
      <div style={s.header}>{headerLabel}</div>

      {/* ── 180×180 사진박스 ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div
          style={{ ...s.photoBox, cursor: (canPhotoUpload && preview) ? 'grab' : (canPhotoUpload ? 'pointer' : 'default') }}
          onPointerDown={(canPhotoUpload && preview) ? handleDragStart : undefined}
          onClick={canPhotoUpload ? () => fileRef.current?.click() : undefined}
          onDrop={canPhotoUpload ? e => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }); }
          } : undefined}
          onDragOver={canPhotoUpload ? e => e.preventDefault() : undefined}
        >
          {preview ? (
            <>
              <img src={preview} alt="프로필" draggable={false}
                style={{ ...s.photoImg, transform: `translate(${photoOffset.x}px,${photoOffset.y}px) scale(${photoScale})` }}
              />
              <div
                style={s.resizeHandle}
                onPointerDown={e => {
                  e.stopPropagation();
                  const sy = e.clientY, sc = photoScale;
                  const onMove = ev => setPhotoScale(Math.max(0.5, Math.min(3, sc + (ev.clientY - sy) * 0.005)));
                  const onUp   = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
              />
            </>
          ) : (
            <div style={s.photoEmpty}>
              <span style={{ fontSize: 32, color: LINE }}>📷</span>
              <p style={{ color: '#8B7355', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
                {isAddMode
                  ? '저장 후 사진 추가'
                  : selectedNode
                    ? (uploading ? '업로드 중...' : '클릭 또는 끌어다 놓기')
                    : '인물을 선택하면\n사진을 편집할 수 있습니다'}
              </p>
            </div>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onInput={handleFile} />
      {canPhotoUpload && preview && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <button style={s.btnSec} onClick={() => fileRef.current?.click()}>사진 변경</button>
        </div>
      )}

      {/* ── 인물정보 폼 ── */}
      <div style={s.form}>

        <div style={s.row2}>
          <div>
            <label style={s.lbl}>성 (姓)</label>
            <input style={s.inp} value={form.lastName}  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}  placeholder="이" />
          </div>
          <div>
            <label style={s.lbl}>이름 *</label>
            <input style={s.inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="상훈" />
          </div>
        </div>

        <div style={s.row2}>
          <div>
            <label style={s.lbl}>성 (영문)</label>
            <input style={s.inp} value={form.nameEnLast}  onChange={e => setForm(f => ({ ...f, nameEnLast: e.target.value }))}  placeholder="LEE" />
          </div>
          <div>
            <label style={s.lbl}>이름 (영문)</label>
            <input style={s.inp} value={form.nameEnFirst} onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="SANGHUN" />
          </div>
        </div>

        <label style={s.lbl}>성별</label>
        <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
          {[{ v: 'M', l: '남' }, { v: 'F', l: '여' }].map(g => (
            <label key={g.v} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" value={g.v} checked={form.gender === g.v} onChange={() => setForm(f => ({ ...f, gender: g.v }))} />
              {g.l}
            </label>
          ))}
        </div>

        <label style={s.lbl}>생년월일</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <input style={{ ...s.inp, flex: 2 }} value={form.birthYear}  onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))}  placeholder="년" maxLength={4} />
          <input style={{ ...s.inp, flex: 1 }} value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} placeholder="월" maxLength={2} />
          <input style={{ ...s.inp, flex: 1 }} value={form.birthDay}   onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))}   placeholder="일" maxLength={2} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.birthLunar} onChange={e => setForm(f => ({ ...f, birthLunar: e.target.checked }))} />
            음력
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', margin: '6px 0' }}>
          <input type="checkbox" checked={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))} />
          사망
        </label>
        {form.isDeceased && (
          <>
            <label style={s.lbl}>사망일</label>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <input style={{ ...s.inp, flex: 2 }} value={form.deathYear}  onChange={e => setForm(f => ({ ...f, deathYear: e.target.value }))}  placeholder="년" maxLength={4} />
              <input style={{ ...s.inp, flex: 1 }} value={form.deathMonth} onChange={e => setForm(f => ({ ...f, deathMonth: e.target.value }))} placeholder="월" maxLength={2} />
              <input style={{ ...s.inp, flex: 1 }} value={form.deathDay}   onChange={e => setForm(f => ({ ...f, deathDay: e.target.value }))}   placeholder="일" maxLength={2} />
            </div>
          </>
        )}

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {(isAddMode || selectedNode) && (
            <button
              style={{ ...s.btnPri, flex: 1, opacity: saving ? 0.6 : 1 }}
              disabled={saving}
              onClick={isAddMode ? handleCreate : handleSave}
            >
              {saving ? '처리 중...' : isAddMode ? '생성' : '저장'}
            </button>
          )}
          {!isAddMode && selectedNode && (
            <button
              style={s.btnDng}
              onClick={() => {
                const rel = findRelation(selectedId);
                if (rel) setConfirmDel({ id: rel.id, name: getNodeName(selectedId) });
              }}
            >제거</button>
          )}
          {(isAddMode || selectedNode) && (
            <button style={s.btnSec} onClick={cancelEdit}>취소</button>
          )}
        </div>
      </div>

      {/* ── 간이 가계도 (항상 하단 표시) ── */}
      <MiniTree
        personId={personId}
        relations={relations}
        getNodeName={getNodeName}
        getNodePhoto={getNodePhoto}
        selectedId={selectedId}
        onSelect={handleSelectNode}
        onAdd={handleAddMode}
        onRemoveRel={(relId, name) => setConfirmDel({ id: relId, name })}
      />

      {/* ── 관계 해제 확인 모달 ── */}
      {confirmDel && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <p style={{ fontSize: 14, color: '#3a2a1a', marginBottom: 20 }}>
              "{confirmDel.name}"와의 관계를 해제하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button style={s.btnDng} onClick={() => handleDeleteRelation(confirmDel.id)}>해제</button>
              <button style={s.btnSec} onClick={() => setConfirmDel(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:         { display: 'flex', flexDirection: 'column' },

  header:       { fontSize: 12, color: '#5A3D1A', fontWeight: 600, textAlign: 'center', marginBottom: 10, minHeight: 16 },

  photoBox:     { width: 180, height: 180, borderRadius: 8, border: `2px solid ${LINE}`, background: '#2a2a2a', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  photoImg:     { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, background: LINE, borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  photoEmpty:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 12 },

  form:         { marginTop: 4 },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 },
  lbl:          { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 2, marginTop: 6 },
  inp:          { width: '100%', boxSizing: 'border-box', border: `1px solid ${LINE}`, borderRadius: 4, padding: '5px 7px', fontSize: 12, background: '#FAFAF5', outline: 'none' },

  btnPri:       { padding: '8px 12px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSec:       { padding: '7px 10px', background: 'none', border: `1px solid ${LINE}`, borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng:       { padding: '7px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },

  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: '#FDFBF7', border: `1px solid ${LINE}`, borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};

const mt = {
  wrap:    { marginTop: 16 },
  divider: { height: 1, background: '#E8DFD0', marginBottom: 12 },
  title:   { fontSize: 11, color: '#8B7355', fontWeight: 600, textAlign: 'center', marginBottom: 10, letterSpacing: '0.05em' },
  addBtn:  { padding: '3px 8px', fontSize: 10, border: `1px solid ${LINE}`, background: '#FDFBF7', borderRadius: 3, cursor: 'pointer', color: '#8B7355' },
};
