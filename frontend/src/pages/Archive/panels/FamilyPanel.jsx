/**
 * panels/FamilyPanel.jsx — §8/§9 가족 관리
 *
 * 확정 구조:
 *   1. 180×180 사진박스 (클릭 업로드, 드래그 이동, 확대 조정)
 *   2. [부모][자녀][배우자][형제자매] 탭  [남][여] 성별 선택
 *   3. 성/이름/영문성/영문이름/생년월일(년월일)/음력체크/사망체크/사망일(년월일)
 *   4. [저장] [제거]
 *   5. 구분선
 *   6. 간이 가계도 (MiniTree): 부모 → 관장 — 배우자 → 자녀들
 *
 * 기존 유지:
 *   - filterRels / otherPersonId 헬퍼
 *   - getNode (treeStore + relation fallback, selectedNodeCache)
 *   - createPerson / savePerson / deleteRelation / uploadPhoto API
 *   - invalidate() 후 refreshRelations() 트리 즉시 갱신
 */

import { useState, useRef, useEffect } from 'react';
import { toast }                        from 'react-hot-toast';
import { useTreeStore }                 from '../../../store/treeStore';
import {
  createPerson,
  savePerson,
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

// ── 간이 가계도 ───────────────────────────────────────────────────────────────
function MiniTree({ personId, relations, getNodeName }) {
  const parents  = filterRels(relations, personId, 'parent').map(r => r.person1_id);
  const spouses  = filterRels(relations, personId, 'spouse').map(r => otherPersonId(r, personId, 'spouse'));
  const children = filterRels(relations, personId, 'child').map(r => r.person2_id);

  if (!parents.length && !spouses.length && !children.length) return null;

  return (
    <div style={mt.wrap}>
      <div style={mt.divider} />

      {/* 부모 행 */}
      {parents.length > 0 && (
        <div style={mt.row}>
          {parents.map(id => (
            <div key={id} style={mt.box}>{getNodeName(id)}</div>
          ))}
        </div>
      )}

      {/* 부모↓ 연결선 */}
      {parents.length > 0 && <div style={mt.vline} />}

      {/* 관장 — 배우자 행 */}
      <div style={mt.row}>
        <div style={{ ...mt.box, ...mt.boxMain }}>{getNodeName(personId)}</div>
        {spouses.map(id => (
          <div key={id} style={mt.row}>
            <div style={mt.hline} />
            <div style={mt.box}>{getNodeName(id)}</div>
          </div>
        ))}
      </div>

      {/* 자녀↓ 연결선 */}
      {children.length > 0 && <div style={mt.vline} />}

      {/* 자녀 행 */}
      {children.length > 0 && (
        <div style={mt.row}>
          {children.map(id => (
            <div key={id} style={mt.box}>{getNodeName(id)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FamilyPanel({ curatorNode, personId, siteId, relations, refreshRelations }) {
  const { nodes, invalidate } = useTreeStore();

  const fileRef = useRef(null);

  // ── 현재 편집 대상 (선택된 기존 인물 or 새 인물 추가 모드)
  const [relTab,            setRelTab]            = useState('parent');
  const [selectedId,        setSelectedId]        = useState(null);
  const [selectedNodeCache, setSelectedNodeCache] = useState(null);
  const [isAddMode,         setIsAddMode]         = useState(false);
  const [confirmDel,        setConfirmDel]        = useState(null);
  const [saving,            setSaving]            = useState(false);
  const [uploading,         setUploading]         = useState(false);

  // ── 사진
  const [preview,     setPreview]     = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);

  // ── 폼
  const emptyForm = {
    lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '',
    gender: 'M',
    birthYear: '', birthMonth: '', birthDay: '', birthLunar: false,
    isDeceased: false, deathYear: '', deathMonth: '', deathDay: '',
  };
  const [form, setForm] = useState(emptyForm);

  // ── 노드 조회 헬퍼 (treeStore + relation fallback)
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

  const selectedNode = selectedId ? (getNode(selectedId) ?? selectedNodeCache) : null;
  const tabRels      = filterRels(relations, personId, relTab);

  // ── 선택 인물 → 폼 동기화
  useEffect(() => {
    if (!selectedNode) return;
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

    const rawGender = selectedNode.gender ?? 'M';
    const gender = rawGender === 'male' ? 'M' : rawGender === 'female' ? 'F' : rawGender || 'M';

    setForm({
      lastName:   selectedNode.last_name  ?? selectedNode.lastName  ?? '',
      firstName:  selectedNode.first_name ?? selectedNode.firstName ?? selectedNode.name ?? '',
      nameEnLast:  selectedNode.name_en_last  ?? enParts[0] ?? '',
      nameEnFirst: selectedNode.name_en_first ?? enParts.slice(1).join(' ') ?? '',
      gender,
      birthYear: by, birthMonth: bm, birthDay: bday,
      birthLunar: selectedNode.birth_lunar ?? false,
      isDeceased: selectedNode.isDeceased ?? selectedNode.is_deceased ?? false,
      deathYear: dy, deathMonth: dm, deathDay: dday,
    });
  }, [selectedNode]);

  // ── 탭 변경
  function handleTabChange(key) {
    setRelTab(key);
    setSelectedId(null);
    setSelectedNodeCache(null);
    setIsAddMode(false);
    setPreview(null);
    setForm(emptyForm);
  }

  // ── 추가 모드 전환
  function handleAddMode() {
    setSelectedId(null);
    setSelectedNodeCache(null);
    setIsAddMode(true);
    setPreview(null);
    setForm(emptyForm);
  }

  // ── 사진 드래그
  function handleDragStart(e) {
    e.preventDefault();
    const sx = e.clientX - photoOffset.x;
    const sy = e.clientY - photoOffset.y;
    const onMove = ev => setPhotoOffset({ x: ev.clientX - sx, y: ev.clientY - sy });
    const onUp   = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ── 사진 업로드
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAddMode && (!siteId || !selectedNode?.id)) return;
    setUploading(true);
    try {
      if (!isAddMode) {
        const json = await uploadPhoto(siteId, selectedNode.id, file);
        const rawUrl = json.data?.photo_url ?? URL.createObjectURL(file);
        setPreview(rawUrl.startsWith('blob:') ? rawUrl : `${rawUrl}?v=${Date.now()}`);
        toast.success('사진이 저장됐습니다.');
      } else {
        // 추가 모드: 미리보기만 (실제 업로드는 person 생성 후)
        setPreview(URL.createObjectURL(file));
      }
    } catch {
      toast.error('사진 업로드 실패');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── 저장 (기존 인물 수정)
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

  // ── 새 가족 추가 (추가 모드 저장)
  async function handleCreate() {
    if (!siteId || !form.firstName.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2,'0'), form.birthDay?.padStart(2,'0')].filter(Boolean).join('-')
        : null;
      const fullName = `${form.lastName.trim()}${form.firstName.trim()}`;
      await createPerson(siteId, {
        name:          fullName,
        first_name:    form.firstName.trim(),
        last_name:     form.lastName.trim() || null,
        name_en:       [form.nameEnLast, form.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:        form.gender,
        birth_date:    birthDate,
        birth_lunar:   form.birthLunar,
        relation_type: relTab === 'child' ? 'parent' : relTab,
        relative_id:   personId,
      });
      await invalidate();
      await refreshRelations();
      setIsAddMode(false);
      setPreview(null);
      setForm(emptyForm);
      toast.success('추가됐습니다.');
    } catch (err) {
      toast.error(err.message || '추가 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 관계 해제
  async function handleDeleteRelation(relationId) {
    try {
      await deleteRelation(siteId, relationId);
      await invalidate();
      await refreshRelations();
      setSelectedId(null);
      setSelectedNodeCache(null);
      toast.success('관계가 해제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    } finally {
      setConfirmDel(null);
    }
  }

  const showEditArea = selectedNode || isAddMode;

  return (
    <div style={s.wrap}>

      {/* ── 사진박스 180×180 ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div
          style={{ ...s.photoBox, cursor: preview ? 'grab' : 'pointer' }}
          onPointerDown={preview ? handleDragStart : undefined}
          onClick={preview ? undefined : () => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }); } }}
          onDragOver={e => e.preventDefault()}
        >
          {preview ? (
            <>
              <img
                src={preview} alt="프로필" draggable={false}
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
              <span style={{ fontSize: 36, color: '#C4A882' }}>📷</span>
              <p style={{ color: '#8B7355', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
                {uploading ? '업로드 중...' : '클릭 또는 끌어다 놓기'}
              </p>
            </div>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onInput={handleFile} />
      {preview && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <button style={s.btnSec} onClick={() => fileRef.current?.click()}>사진 변경</button>
        </div>
      )}

      {/* ── 관계 탭 + 성별 ── */}
      <div style={s.tabRow}>
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
        <div style={s.genderGroup}>
          {[{ v: 'M', l: '남' }, { v: 'F', l: '여' }].map(g => (
            <label key={g.v} style={s.genderLabel}>
              <input
                type="radio" value={g.v}
                checked={form.gender === g.v}
                onChange={() => setForm(f => ({ ...f, gender: g.v }))}
              />
              {g.l}
            </label>
          ))}
        </div>
      </div>

      {/* ── 관계 목록 ── */}
      <div style={s.relBody}>
        {tabRels.length === 0 ? (
          <p style={{ fontSize: 12, color: '#B09060', textAlign: 'center', margin: '8px 0' }}>
            등록된 {REL_TABS.find(t => t.key === relTab)?.label} 없음
          </p>
        ) : (
          tabRels.map(rel => {
            const otherId  = otherPersonId(rel, personId, relTab);
            const node     = getNode(otherId);
            const name     = getNodeName(otherId);
            const photo    = node?.photoUrl ?? node?.photo_url;
            const isSel    = selectedId === otherId;
            return (
              <div
                key={rel.id}
                style={{ ...s.relRow, ...(isSel ? s.relRowOn : {}) }}
                onClick={() => {
                  if (isSel) {
                    setSelectedId(null);
                    setSelectedNodeCache(null);
                    setPreview(null);
                    setForm(emptyForm);
                  } else {
                    setSelectedId(otherId);
                    setSelectedNodeCache(node);
                    setIsAddMode(false);
                  }
                }}
              >
                <div style={s.thumb}>
                  {photo
                    ? <img src={photo} alt={name} style={s.thumbImg} />
                    : <span style={{ fontSize: 16, color: '#C4A882' }}>👤</span>
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

      {/* ── 추가 버튼 ── */}
      <button
        style={{ ...s.btnPri, width: '100%', marginTop: 6 }}
        onClick={handleAddMode}
      >
        + {REL_TABS.find(t => t.key === relTab)?.label} 추가
      </button>

      {/* ── 편집/추가 폼 (선택 or 추가모드일 때만) ── */}
      {showEditArea && (
        <div style={s.editArea}>
          {/* 성/이름 */}
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
          {/* 영문 */}
          <div style={s.row2}>
            <div>
              <label style={s.lbl}>영문 성</label>
              <input style={s.inp} value={form.nameEnLast}  onChange={e => setForm(f => ({ ...f, nameEnLast: e.target.value }))}  placeholder="LEE" />
            </div>
            <div>
              <label style={s.lbl}>영문 이름</label>
              <input style={s.inp} value={form.nameEnFirst} onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="SANGHUN" />
            </div>
          </div>

          {/* 생년월일 */}
          <label style={s.lbl}>생년월일</label>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 4 }}>
            <input style={{ ...s.inp, width: 60 }} value={form.birthYear}  onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))}  placeholder="년" maxLength={4} />
            <input style={{ ...s.inp, width: 42 }} value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} placeholder="월" maxLength={2} />
            <input style={{ ...s.inp, width: 42 }} value={form.birthDay}   onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))}   placeholder="일" maxLength={2} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={form.birthLunar} onChange={e => setForm(f => ({ ...f, birthLunar: e.target.checked }))} />
              음력
            </label>
          </div>

          {/* 사망 */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', marginBottom: 4 }}>
            <input type="checkbox" checked={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))} />
            사망
          </label>
          {form.isDeceased && (
            <>
              <label style={s.lbl}>사망일</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input style={{ ...s.inp, width: 60 }} value={form.deathYear}  onChange={e => setForm(f => ({ ...f, deathYear: e.target.value }))}  placeholder="년" maxLength={4} />
                <input style={{ ...s.inp, width: 42 }} value={form.deathMonth} onChange={e => setForm(f => ({ ...f, deathMonth: e.target.value }))} placeholder="월" maxLength={2} />
                <input style={{ ...s.inp, width: 42 }} value={form.deathDay}   onChange={e => setForm(f => ({ ...f, deathDay: e.target.value }))}   placeholder="일" maxLength={2} />
              </div>
            </>
          )}

          {/* 저장/제거 버튼 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              style={{ ...s.btnPri, flex: 1, opacity: saving ? 0.6 : 1 }}
              disabled={saving}
              onClick={isAddMode ? handleCreate : handleSave}
            >
              {saving ? '처리 중...' : isAddMode ? '생성' : '저장'}
            </button>
            {!isAddMode && selectedNode && (
              <button
                style={{ ...s.btnDng, flex: 1 }}
                onClick={() => {
                  const rel = tabRels.find(r => otherPersonId(r, personId, relTab) === selectedId);
                  if (rel) setConfirmDel({ id: rel.id, name: getNodeName(selectedId) });
                }}
              >
                제거
              </button>
            )}
            <button
              style={{ ...s.btnSec }}
              onClick={() => { setSelectedId(null); setSelectedNodeCache(null); setIsAddMode(false); setPreview(null); setForm(emptyForm); }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 간이 가계도 ── */}
      <MiniTree
        personId={personId}
        relations={relations}
        getNodeName={getNodeName}
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
  wrap:        { display: 'flex', flexDirection: 'column' },

  // 사진박스
  photoBox:    { width: 180, height: 180, borderRadius: 8, border: '2px solid #C4A882', background: '#2a2a2a', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  photoImg:    { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle:{ position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, background: '#C4A882', borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  photoEmpty:  { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },

  // 탭 + 성별
  tabRow:      { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  relTabs:     { display: 'flex', gap: 3, flex: 1 },
  relTab:      { flex: 1, padding: '5px 0', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  relTabOn:    { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  genderGroup: { display: 'flex', gap: 8, flexShrink: 0 },
  genderLabel: { display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, cursor: 'pointer' },

  // 목록
  relBody:     { border: '1px solid #E8DFD0', borderRadius: 4, padding: 6, minHeight: 50 },
  relRow:      { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  relRowOn:    { background: '#F0EAE0' },
  thumb:       { width: 32, height: 32, borderRadius: 4, overflow: 'hidden', background: '#F0EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbImg:    { width: '100%', height: '100%', objectFit: 'cover' },

  // 편집 영역
  editArea:    { marginTop: 10, padding: 10, background: '#FDF8F0', border: '1px solid #E8DFD0', borderRadius: 6 },
  row2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 },
  lbl:         { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 2 },
  inp:         { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '5px 7px', fontSize: 12, background: '#FAFAF5', outline: 'none' },

  // 버튼
  btnPri:      { padding: '8px 12px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSec:      { padding: '7px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng:      { padding: '7px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },

  // 모달
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:       { background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};

// 간이 가계도 스타일
const mt = {
  wrap:    { marginTop: 16 },
  divider: { height: 1, background: '#E8DFD0', marginBottom: 12 },
  row:     { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 4 },
  box:     { padding: '4px 10px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#3a2a1a', background: '#FDFBF7', whiteSpace: 'nowrap' },
  boxMain: { background: '#F0EAE0', fontWeight: 600, borderColor: '#8B7355' },
  vline:   { width: 1, height: 16, background: '#C4A882', margin: '0 auto' },
  hline:   { width: 16, height: 1, background: '#C4A882' },
};
