/**
 * panels/FamilyPanel.jsx — §8/§9 가족 관리
 *
 * - 관계 탭: 부모 / 자녀 / 배우자 / 형제자매
 * - 탭의 인물 행 클릭 → 우측에 해당 인물 편집 패널 표시
 *   (사진 업로드 §19, 이름/성별/생년월일/사망 수정, 저장)
 * - [새 가족 추가]: 성/이름/성별/생년월일 입력 후 추가 → invalidate() 트리 즉시 갱신
 * - [가족 관계 삭제]: 확인 모달 후 person_relations 삭제 (§8/§9)
 */

import { useState, useRef, useEffect } from 'react';
import { toast }                        from 'react-hot-toast';
import { useTreeStore }                 from '../../../store/treeStore';
import {
  createPerson,
  savePerson,
  deletePerson,
  deleteRelation,
  uploadPhoto,
} from './archiveApi';

// ── 상수 ─────────────────────────────────────────────────────────────────────
const REL_TABS = [
  { key: 'parent',  label: '부모'     },
  { key: 'child',   label: '자녀'     },
  { key: 'spouse',  label: '배우자'   },
  { key: 'sibling', label: '형제자매' },
];

const GENDER_OPTS = [
  { value: 'M', label: '남' },
  { value: 'F', label: '여' },
];

// ── 관계 필터 헬퍼 ────────────────────────────────────────────────────────────
function filterRels(relations, personId, tab) {
  if (!personId) return [];
  switch (tab) {
    case 'parent':  return relations.filter(r => r.relation_type === 'parent'  && r.person2_id === personId);
    case 'child':   return relations.filter(r => r.relation_type === 'parent'  && r.person1_id === personId);
    case 'spouse':  return relations.filter(r => r.relation_type === 'spouse'  && (r.person1_id === personId || r.person2_id === personId));
    case 'sibling': return relations.filter(r => r.relation_type === 'sibling' && (r.person1_id === personId || r.person2_id === personId));
    default: return [];
  }
}

function otherPersonId(rel, personId, tab) {
  if (tab === 'parent') return rel.person1_id;
  if (tab === 'child')  return rel.person2_id;
  return rel.person1_id === personId ? rel.person2_id : rel.person1_id;
}

// ── 인물 편집 서브패널 ────────────────────────────────────────────────────────
function PersonEditPanel({ node, siteId, onSaved, onClose }) {
  const fileRef = useRef(null);
  const [preview,     setPreview]     = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form, setForm] = useState({
    lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '',
    gender: 'M', birthYear: '', birthMonth: '', birthDay: '',
    isDeceased: false, deathDate: '',
  });

  // node → 폼 동기화
  useEffect(() => {
    if (!node) return;
    const ph = node.photoUrl ?? node.photo_url ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoScale(1);

    const bdate = node.birthDate ?? node.birth_date ?? '';
    const [by = '', bm = '', bd = ''] = bdate ? bdate.split('T')[0].split('-') : [];

    // name_en 파싱
    const enFull  = node.name_en ?? '';
    const enParts = enFull.trim().split(/\s+/);
    const enLast  = node.name_en_last  ?? (enParts[0] || '');
    const enFirst = node.name_en_first ?? (enParts.slice(1).join(' ') || '');

    const rawGender = node.gender ?? 'M';
    const gender = rawGender === 'male' ? 'M' : rawGender === 'female' ? 'F' : rawGender || 'M';

    setForm({
      lastName:  node.last_name  ?? node.lastName  ?? '',
      firstName: node.first_name ?? node.firstName ?? node.name ?? '',
      nameEnLast:  enLast,
      nameEnFirst: enFirst,
      gender,
      birthYear:  by,
      birthMonth: bm,
      birthDay:   bd,
      isDeceased: node.isDeceased ?? node.is_deceased ?? false,
      deathDate:  node.deathDate  ?? node.death_date  ?? '',
    });
  }, [node]);

  // 사진 드래그
  function handleDragStart(e) {
    e.preventDefault();
    const sx = e.clientX - photoOffset.x;
    const sy = e.clientY - photoOffset.y;
    const onMove = ev => setPhotoOffset({ x: ev.clientX - sx, y: ev.clientY - sy });
    const onUp   = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // 사진 업로드
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !siteId || !node?.id) return;
    setUploading(true);
    try {
      const json = await uploadPhoto(siteId, node.id, file);
      const rawUrl = json.data?.photo_url ?? URL.createObjectURL(file);
      setPreview(rawUrl.startsWith('blob:') ? rawUrl : `${rawUrl}?v=${Date.now()}`);
      toast.success('사진이 저장됐습니다.');
    } catch {
      toast.error('사진 업로드 실패');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // 저장
  async function handleSave() {
    if (!siteId || !node?.id) return;
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2,'0'), form.birthDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      const genderDb = form.gender === 'male' ? 'M' : form.gender === 'female' ? 'F' : form.gender;
      await savePerson(siteId, node.id, {
        name:       `${(form.lastName||'').trim()}${(form.firstName||'').trim()}`,
        first_name: form.firstName?.trim() || null,
        last_name:  form.lastName?.trim()  || null,
        name_en:    [form.nameEnLast, form.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:     genderDb,
        birth_date: birthDate,
        is_deceased: form.isDeceased,
        death_date: form.deathDate || null,
      });
      toast.success('저장됐습니다.');
      onSaved?.();
    } catch {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  }

  if (!node) return null;

  return (
    <div style={ep.wrap}>
      <div style={ep.header}>
        <span style={ep.title}>{node.name ?? `${node.last_name}${node.first_name}`}</span>
        <button style={ep.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* 사진 에디터 */}
      <div
        style={{ ...ep.cardFrame, cursor: preview ? 'grab' : 'pointer' }}
        onPointerDown={preview ? handleDragStart : undefined}
        onClick={preview ? undefined : () => fileRef.current?.click()}
        onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }); }}
        onDragOver={e => e.preventDefault()}
      >
        {preview ? (
          <>
            <img
              src={preview} alt="프로필" draggable={false}
              style={{ ...ep.photoImg, transform: `translate(${photoOffset.x}px,${photoOffset.y}px) scale(${photoScale})` }}
            />
            <div
              style={ep.resizeHandle}
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
          <div style={ep.cardEmpty}>
            <span style={{ fontSize: 28, color: '#C4A882' }}>📷</span>
            <p style={{ color: '#8B7355', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
              {uploading ? '업로드 중...' : '클릭 또는 끌어다 놓기'}
            </p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onInput={handleFile} />
      {preview && (
        <button style={ep.changePhotoBtn} onClick={() => fileRef.current?.click()}>
          사진 변경
        </button>
      )}

      {/* 정보 폼 */}
      <div style={ep.row2}>
        <div>
          <label style={ep.lbl}>성 (姓)</label>
          <input style={ep.inp} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="이" />
        </div>
        <div>
          <label style={ep.lbl}>이름</label>
          <input style={ep.inp} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="상훈" />
        </div>
      </div>
      <div style={ep.row2}>
        <div>
          <label style={ep.lbl}>영문 성</label>
          <input style={ep.inp} value={form.nameEnLast} onChange={e => setForm(f => ({ ...f, nameEnLast: e.target.value }))} placeholder="LEE" />
        </div>
        <div>
          <label style={ep.lbl}>영문 이름</label>
          <input style={ep.inp} value={form.nameEnFirst} onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="SANGHUN" />
        </div>
      </div>

      <label style={ep.lbl}>성별</label>
      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        {GENDER_OPTS.map(g => (
          <label key={g.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input type="radio" value={g.value} checked={form.gender === g.value} onChange={() => setForm(f => ({ ...f, gender: g.value }))} />
            {g.label}
          </label>
        ))}
      </div>

      <label style={ep.lbl}>생년월일</label>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <input style={{ ...ep.inp, width: 64 }} value={form.birthYear}  onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))}  placeholder="년" maxLength={4} />
        <input style={{ ...ep.inp, width: 44 }} value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} placeholder="월" maxLength={2} />
        <input style={{ ...ep.inp, width: 44 }} value={form.birthDay}   onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))}   placeholder="일" maxLength={2} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginBottom: 4 }}>
        <input type="checkbox" checked={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))} />
        사망
      </label>
      {form.isDeceased && (
        <>
          <label style={ep.lbl}>사망일</label>
          <input style={ep.inp} type="date" value={form.deathDate} onChange={e => setForm(f => ({ ...f, deathDate: e.target.value }))} />
        </>
      )}

      <button
        style={{ ...ep.saveBtn, opacity: saving ? 0.6 : 1, marginTop: 10 }}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FamilyPanel({ curatorNode, personId, siteId, relations, refreshRelations }) {
  const { nodes, invalidate } = useTreeStore();

  const [relTab,      setRelTab]      = useState('parent');
  const [selectedId,  setSelectedId]  = useState(null); // 편집 중인 인물 node id
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedNodeCache, setSelectedNodeCache] = useState(null);

  const [newForm, setNewForm] = useState({
    lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '',
    gender: 'M', birthYear: '', birthMonth: '', birthDay: '',
  });

  const tabRels     = filterRels(relations, personId, relTab);

  // treeStore에 없으면 relation 내장 person1/person2 fallback (z>0 인물 대응)
  const getNode = id => {
    const n = nodes.find(n => n.id === Number(id) || n.personId === String(id));
    if (n) return n;
    for (const rel of relations) {
      if (Number(rel.person1_id) === Number(id) && rel.person1) return rel.person1;
      if (Number(rel.person2_id) === Number(id) && rel.person2) return rel.person2;
    }
    return null;
  };

  const getNodeName = id => { const n = getNode(id); return n ? (n.name ?? `${n.last_name??''}${n.first_name??''}`) : `#${id}`; };
  const selectedNode = selectedId ? (getNode(selectedId) ?? selectedNodeCache) : null;

  // 탭 변경 시 선택 초기화
  function handleTabChange(key) {
    setRelTab(key);
    setSelectedId(null);
    setShowAddForm(false);
  }

  // 새 가족 추가
  async function handleCreatePerson() {
    if (!siteId || !newForm.firstName.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const birthDate = newForm.birthYear
        ? [newForm.birthYear, newForm.birthMonth?.padStart(2,'0'), newForm.birthDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      const fullName = `${newForm.lastName.trim()}${newForm.firstName.trim()}`;
      await createPerson(siteId, {
        name:          fullName,
        first_name:    newForm.firstName.trim(),
        last_name:     newForm.lastName.trim() || null,
        name_en:       [newForm.nameEnLast, newForm.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:        newForm.gender,
        birth_date:    birthDate,
        relation_type: relTab === 'child' ? 'parent' : relTab,
        relative_id:   personId,
      });
      await invalidate();
      await refreshRelations();
      setNewForm({ lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '', gender: 'M', birthYear: '', birthMonth: '', birthDay: '' });
      setShowAddForm(false);
      toast.success('새 가족이 추가됐습니다. 트리에 바로 표시됩니다.');
    } catch (err) {
      toast.error(err.message || '추가 실패');
    } finally {
      setSaving(false);
    }
  }

  // 관계 해제
  async function handleDeleteRelation(relationId) {
    try {
      await deleteRelation(siteId, relationId);
      await invalidate();
      await refreshRelations();
      setSelectedId(null);
      toast.success('관계가 해제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    } finally {
      setConfirmDel(null);
    }
  }

  return (
    <div style={s.wrap}>
      {/* 관계 탭 */}
      <div style={s.relTabs}>
        {REL_TABS.map(t => (
          <button
            key={t.key}
            style={{ ...s.relTab, ...(relTab === t.key ? s.relTabOn : {}) }}
            onClick={() => handleTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        {/* 좌: 관계 목록 */}
        <div style={s.listCol}>
          <div style={s.relBody}>
            {tabRels.length === 0 ? (
              <p style={{ fontSize: 12, color: '#B09060', textAlign: 'center', margin: '12px 0' }}>
                등록된 {REL_TABS.find(t => t.key === relTab)?.label} 없음
              </p>
            ) : (
              tabRels.map(rel => {
                const otherId = otherPersonId(rel, personId, relTab);
                const node    = getNode(otherId);
                const name    = getNodeName(otherId);
                const photo   = node?.photoUrl ?? node?.photo_url;
                const isSelected = selectedId === otherId;
                return (
                  <div
                    key={rel.id}
                    style={{ ...s.relRow, ...(isSelected ? s.relRowOn : {}) }}
                    onClick={() => { setSelectedId(isSelected ? null : otherId); setShowAddForm(false); setSelectedNodeCache(node); }}
                  >
                    {/* 썸네일 */}
                    <div style={s.thumb}>
                      {photo
                        ? <img src={photo} alt={name} style={s.thumbImg} />
                        : <span style={{ fontSize: 18, color: '#C4A882' }}>👤</span>
                      }
                    </div>
                    <span style={{ fontSize: 13, color: '#3a2a1a', flex: 1 }}>{name}</span>
                    <button
                      style={{ ...s.btnDng, padding: '2px 7px', fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); setConfirmDel({ id: rel.id, name }); }}
                    >×</button>
                  </div>
                );
              })
            )}
          </div>

          {/* 새 가족 추가 버튼 */}
          <button
            style={{ ...s.btnPri, width: '100%', marginTop: 8 }}
            onClick={() => { setShowAddForm(v => !v); setSelectedId(null); }}
          >
            {showAddForm ? '취소' : `+ ${REL_TABS.find(t=>t.key===relTab)?.label} 추가`}
          </button>

          {/* 새 가족 추가 폼 */}
          {showAddForm && (
            <div style={s.addForm}>
              <div style={s.row2}>
                <div>
                  <label style={s.lbl}>성 (姓)</label>
                  <input style={s.inp} value={newForm.lastName}  onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))}  placeholder="이" />
                </div>
                <div>
                  <label style={s.lbl}>이름 *</label>
                  <input style={s.inp} value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder="상훈" />
                </div>
              </div>
              <div style={s.row2}>
                <div>
                  <label style={s.lbl}>영문 성</label>
                  <input style={s.inp} value={newForm.nameEnLast}  onChange={e => setNewForm(f => ({ ...f, nameEnLast: e.target.value }))}  placeholder="LEE" />
                </div>
                <div>
                  <label style={s.lbl}>영문 이름</label>
                  <input style={s.inp} value={newForm.nameEnFirst} onChange={e => setNewForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="SANGHUN" />
                </div>
              </div>
              <div style={s.row2}>
                <div>
                  <label style={s.lbl}>성별</label>
                  <select style={{ ...s.inp, cursor: 'pointer' }} value={newForm.gender} onChange={e => setNewForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="M">남</option>
                    <option value="F">여</option>
                  </select>
                </div>
                <div>
                  <label style={s.lbl}>출생년도</label>
                  <input style={s.inp} value={newForm.birthYear} onChange={e => setNewForm(f => ({ ...f, birthYear: e.target.value }))} placeholder="1990" maxLength={4} />
                </div>
              </div>
              <button
                style={{ ...s.btnPri, width: '100%', marginTop: 8, opacity: saving ? 0.6 : 1 }}
                disabled={saving}
                onClick={handleCreatePerson}
              >
                {saving ? '추가 중...' : '추가'}
              </button>
            </div>
          )}
        </div>

        {/* 우: 선택된 인물 편집 패널 */}
        {selectedNode && (
          <PersonEditPanel
            node={selectedNode}
            siteId={siteId}
            onSaved={async () => { await invalidate(); await refreshRelations(); }}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* 관계 해제 확인 모달 */}
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
  wrap:     { display: 'flex', flexDirection: 'column', height: '100%' },
  relTabs:  { display: 'flex', gap: 4, marginBottom: 8 },
  relTab:   { flex: 1, padding: '5px 0', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  relTabOn: { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  body:     { display: 'flex', gap: 12, flex: 1, minHeight: 0 },
  listCol:  { display: 'flex', flexDirection: 'column', width: 180, flexShrink: 0 },
  relBody:  { border: '1px solid #E8DFD0', borderRadius: 4, padding: 6, minHeight: 60, overflowY: 'auto' },
  relRow:   { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  relRowOn: { background: '#F0EAE0' },
  thumb:    { width: 32, height: 32, borderRadius: 4, overflow: 'hidden', background: '#F0EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  addForm:  { marginTop: 8, padding: 8, background: '#FDF8F0', border: '1px solid #E8DFD0', borderRadius: 6 },
  row2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 },
  lbl:      { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 2 },
  inp:      { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '5px 7px', fontSize: 12, background: '#FDFBF7', outline: 'none' },
  btnPri:   { padding: '7px 12px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSec:   { padding: '6px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng:   { padding: '5px 8px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:    { background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};

// PersonEditPanel 스타일
const ep = {
  wrap:          { flex: 1, border: '1px solid #E8DFD0', borderRadius: 6, padding: 12, background: '#FDFBF7', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:         { fontSize: 13, fontWeight: 600, color: '#5a4a35' },
  closeBtn:      { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#8B7355' },
  cardFrame:     { width: 120, height: 120, borderRadius: 6, border: '2px solid #C4A882', background: '#2a2a2a', overflow: 'hidden', position: 'relative', flexShrink: 0, alignSelf: 'center' },
  photoImg:      { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle:  { position: 'absolute', bottom: 3, right: 3, width: 10, height: 10, background: '#C4A882', borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  cardEmpty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  changePhotoBtn:{ alignSelf: 'center', padding: '3px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 11, color: '#8B7355', cursor: 'pointer', marginTop: 2 },
  row2:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  lbl:           { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 2 },
  inp:           { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '5px 7px', fontSize: 12, background: '#FAFAF5', outline: 'none' },
  saveBtn:       { width: '100%', padding: '8px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
