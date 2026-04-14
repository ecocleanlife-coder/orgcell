/**
 * FamilyPanel.jsx — §8/§9 가족 관리
 *
 * 구조:
 *   1. 180×180 사진박스 (클릭 업로드, 드래그 이동, 확대 조정)
 *   2. [부모][자녀][배우자][형제자매] 탭 + [남][여] 성별 선택
 *   3. 성/이름/영문/생년월일/사망(년월일) 폼
 *   4. [저장] [제거] 버튼
 *   5. 간이 가계도 (부/모 - 관장 - 배우자 - 자녀들)
 */

import { useState, useRef, useEffect } from 'react';
import { toast }                        from 'react-hot-toast';
import { useTreeStore }                 from '../../../store/treeStore';
import KoreanDateInput                  from './KoreanDateInput';
import {
  createPerson,
  savePerson,
  uploadPhoto,
  deleteRelation,
  deletePerson,
  apiFetch,
} from './archiveApi';

// ── 상수 ─────────────────────────────────────────────────────────────────────
const REL_TABS = [
  { key: 'parent',  label: '부모'     },
  { key: 'child',   label: '자녀'     },
  { key: 'spouse',  label: '배우자'   },
  { key: 'sibling', label: '형제자매' },
  { key: 'divorce', label: '이혼'     },
];

// ── 관계 필터 ─────────────────────────────────────────────────────────────────
function filterRels(relations, personId, tab) {
  if (!personId) return [];
  const id = Number(personId);
  switch (tab) {
    case 'parent':  return relations.filter(r => r.relation_type === 'parent'  && Number(r.person2_id) === id);
    case 'child':   return relations.filter(r => r.relation_type === 'parent'  && Number(r.person1_id) === id);
    case 'spouse':  return relations.filter(r => r.relation_type === 'spouse'  && (Number(r.person1_id) === id || Number(r.person2_id) === id));
    case 'sibling': return relations.filter(r => r.relation_type === 'sibling' && (Number(r.person1_id) === id || Number(r.person2_id) === id));
    case 'divorce': return relations.filter(r => r.relation_type === 'spouse' && r.status === 'divorced' && (Number(r.person1_id) === id || Number(r.person2_id) === id));
    default: return [];
  }
}

function otherPersonId(rel, personId, tab) {
  if (tab === 'parent') return rel.person1_id;
  if (tab === 'child')  return rel.person2_id;
  return Number(rel.person1_id) === Number(personId) ? rel.person2_id : rel.person1_id;
}

// ── 간이 가계도 ───────────────────────────────────────────────────────────────
function MiniTree({ curatorNode, relations, nodes, personId }) {
  const getNode = id => {
    if (!id) return null;
    const n = Number(id);
    return nodes.find(x => Number(x.id) === n) ?? null;
  };
  // nodes에 없으면 relations의 person1/person2 데이터에서 찾기
  const getPersonData = id => {
    const node = getNode(id);
    if (node) return node;
    const n = Number(id);
    for (const r of relations) {
      if (Number(r.person1?.id) === n) return r.person1;
      if (Number(r.person2?.id) === n) return r.person2;
    }
    return null;
  };
  const getName = id => {
    const p = getPersonData(id);
    return p ? (p.name ?? `${p.last_name ?? ''}${p.first_name ?? ''}`) : null;
  };

  const id = Number(personId);
  const parents  = relations.filter(r => r.relation_type === 'parent'  && Number(r.person2_id) === id);
  const spouses  = relations.filter(r => r.relation_type === 'spouse'  && (Number(r.person1_id) === id || Number(r.person2_id) === id));
  const children = relations.filter(r => r.relation_type === 'parent'  && Number(r.person1_id) === id);

  const curatorName = curatorNode?.name ?? `${curatorNode?.last_name ?? ''}${curatorNode?.first_name ?? ''}`;
  const spouseName  = spouses.length > 0 ? getName(otherPersonId(spouses[0], personId, 'spouse')) : null;
  const curatorGender = curatorNode?.gender;
  const isFemaleCurator = curatorGender === 'F' || curatorGender === 'female';

  return (
    <div style={mt.wrap}>
      <div style={mt.title}>간이 가계도</div>

      {/* 부모 행 */}
      {parents.length > 0 && (
        <div style={mt.row}>
          {parents.map(r => {
            const pid = otherPersonId(r, personId, 'parent');
            const name = getName(pid);
            return name ? <div key={r.id} style={mt.box}>{name}</div> : null;
          })}
        </div>
      )}

      {/* 연결선 */}
      {parents.length > 0 && <div style={mt.line}>|</div>}

      {/* 관장 + 배우자 행 */}
      <div style={mt.row}>
        {isFemaleCurator && spouseName && <div style={mt.box}>{spouseName}</div>}
        {isFemaleCurator && spouseName && <div style={mt.dash}>—</div>}
        <div style={{ ...mt.box, ...mt.boxMe }}>{curatorName}</div>
        {!isFemaleCurator && spouseName && <div style={mt.dash}>—</div>}
        {!isFemaleCurator && spouseName && <div style={mt.box}>{spouseName}</div>}
      </div>

      {/* 자녀 연결선 */}
      {children.length > 0 && <div style={mt.line}>|</div>}

      {/* 자녀 행 */}
      {children.length > 0 && (
        <div style={mt.row}>
          {children.map(r => {
            const cid = otherPersonId(r, personId, 'child');
            const name = getName(cid);
            return name ? <div key={r.id} style={mt.box}>{name}</div> : null;
          })}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function FamilyPanel({ curatorNode, personId, siteId, relations, refreshRelations }) {
  const { nodes, invalidate } = useTreeStore();
  const fileRef = useRef(null);

  const [relTab,    setRelTab]    = useState('parent');
  const [gender,    setGender]    = useState('M');
  const [preview,   setPreview]   = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPersonCache, setSelectedPersonCache] = useState(null);
  const [confirmDel,     setConfirmDel]     = useState(null);
  const [confirmDivorce, setConfirmDivorce] = useState(null);

  const [form, setForm] = useState({
    lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '',
    birthDate: '', birthLunar: false, isDeceased: false, deathDate: '',
  });

  // 현재 탭의 관계 목록
  const tabRels = filterRels(relations, personId, relTab);

  // 노드 찾기
  const getNode = id => {
    if (id == null) return null;
    const n = Number(id);
    return nodes.find(x => Number(x.id) === n || x.personId === String(id)) ?? null;
  };

  // 선택된 인물 (nodes에 없으면 relation person 데이터 사용)
  const selectedNode = selectedId ? (getNode(selectedId) ?? selectedPersonCache) : null;

  // 탭 변경 시 선택 초기화 + 새 입력 폼으로
  function handleTabChange(key) {
    setRelTab(key);
    setSelectedId(null);
    setSelectedPersonCache(null);
    resetForm();
  }

  function resetForm() {
    setPreview(null);
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoScale(1);
    setForm({ lastName: '', firstName: '', nameEnLast: '', nameEnFirst: '', birthDate: '', isDeceased: false, deathDate: '' });
  }

  // 인물 선택 시 폼에 데이터 로드
  useEffect(() => {
    if (!selectedNode) { resetForm(); return; }
    const ph = selectedNode.photoUrl ?? selectedNode.photo_url ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    setPhotoOffset({ x: 0, y: 0 });
    setPhotoScale(1);

    const rawGender = selectedNode.gender ?? 'M';
    setGender(rawGender === 'male' ? 'M' : rawGender === 'female' ? 'F' : rawGender || 'M');

    const enFull  = selectedNode.name_en ?? selectedNode.nameEn ?? '';
    const enParts = enFull.trim().split(/\s+/);

    setForm({
      lastName:   selectedNode.last_name  ?? selectedNode.lastName  ?? '',
      firstName:  selectedNode.first_name ?? selectedNode.firstName ?? selectedNode.name ?? '',
      nameEnLast:  selectedNode.name_en_last  ?? (enParts[0] || ''),
      nameEnFirst: selectedNode.name_en_first ?? (enParts.slice(1).join(' ') || ''),
      birthDate:  (selectedNode.birthDate ?? selectedNode.birth_date ?? '').split('T')[0] || '',
      birthLunar: selectedNode.birthLunar ?? selectedNode.birth_lunar ?? false,
      isDeceased: selectedNode.isDeceased ?? selectedNode.is_deceased ?? false,
      deathDate:  (selectedNode.deathDate ?? selectedNode.death_date ?? '').split('T')[0] || '',
    });
  }, [selectedNode]);

  // 사진 드래그
  function handleDragStart(e) {
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX - photoOffset.x;
    const sy = e.clientY - photoOffset.y;
    const onMove = ev => {
      ev.preventDefault();
      setPhotoOffset({ x: ev.clientX - sx, y: ev.clientY - sy });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // 사진 업로드
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedId && siteId) {
      // 기존 인물 사진 업로드
      setUploading(true);
      try {
        const json = await uploadPhoto(siteId, selectedId, file);
        const rawUrl = json.data?.photo_url ?? URL.createObjectURL(file);
        setPreview(rawUrl.startsWith('blob:') ? rawUrl : `${rawUrl}?v=${Date.now()}`);
        toast.success('사진이 저장됐습니다.');
      } catch { toast.error('사진 업로드 실패'); }
      finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
    } else {
      // 새 인물 - 로컬 미리보기만
      setPreview(URL.createObjectURL(file));
    }
  }

  // 저장 (기존 인물 수정 또는 새 인물 생성)
  async function handleSave() {
    if (!siteId) return;
    if (!form.firstName.trim()) { toast.error('이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const genderDb = gender;
      const fields = {
        name:        `${(form.lastName||'').trim()}${form.firstName.trim()}`,
        first_name:  form.firstName.trim(),
        last_name:   form.lastName.trim() || null,
        name_en:     [form.nameEnLast, form.nameEnFirst].filter(Boolean).join(' ') || null,
        gender:      genderDb,
        birth_date:  form.birthDate || null,
        birth_lunar: form.birthLunar || false,
        is_deceased: form.isDeceased,
        death_date:  form.deathDate || null,
      };

      if (selectedId && Number(selectedId) > 0) {
        // 기존 인물 수정
        await savePerson(siteId, Number(selectedId), fields);
        toast.success('저장됐습니다.');
      } else {
        // 새 인물 생성
        const res = await createPerson(siteId, {
          ...fields,
          relation_type: relTab === 'child' ? 'parent' : relTab,
          relative_id:   personId,
        });
        // 새로 생성된 인물 선택 상태로
        const newId = res.data?.id ?? res.id;
        if (newId && preview && preview.startsWith('blob:')) {
          // 로컬 미리보기가 있으면 사진 업로드
          const blob = await fetch(preview).then(r => r.blob());
          const file = new File([blob], 'profile.jpg', { type: blob.type });
          await uploadPhoto(siteId, newId, file);
        }
        toast.success('추가됐습니다.');
        // 생성 후 폼 클리어
        resetForm();
        setSelectedId(null);
        setSelectedPersonCache(null);
      }
      await refreshRelations();
      await invalidate();
    } catch (err) {
      toast.error(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  // 제거
  async function handleRemove() {
    if (!selectedId || !siteId) return;
    // 관계 해제
    const rel = tabRels.find(r => Number(otherPersonId(r, personId, relTab)) === Number(selectedId));
    if (rel) {
      await deleteRelation(siteId, rel.id).catch(() => {});
    }
    await invalidate();
    await refreshRelations();
    setSelectedId(null);
    setSelectedPersonCache(null);
    resetForm();
    toast.success('제거됐습니다.');
    setConfirmDel(null);
  }

  return (
    <div style={s.wrap}>
      {/* 사진 박스 180×180 */}
      <div style={s.photoWrap}>
        <div
          style={{ ...s.cardFrame, cursor: preview ? 'grab' : 'pointer' }}
          onPointerDown={preview ? handleDragStart : undefined}
          onClick={preview ? undefined : () => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }); }}
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
            <div style={s.cardEmpty}>
              <span style={{ fontSize: 32, color: '#C4A882' }}>📷</span>
              <p style={{ color: '#8B7355', fontSize: 11, margin: '8px 0 0', textAlign: 'center' }}>
                {uploading ? '업로드 중...' : '클릭 또는 끌어다 놓기'}
              </p>
            </div>
          )}
        </div>
        {preview && (
          <button style={s.changePhotoBtn} onClick={() => fileRef.current?.click()}>사진 변경</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onInput={handleFile} />
      </div>

      {/* 탭 + 성별 */}
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
        <div style={s.genderBtns}>
          {[{ v: 'M', l: '남' }, { v: 'F', l: '여' }].map(g => (
            <button
              key={g.v}
              style={{ ...s.genderBtn, ...(gender === g.v ? s.genderOn : {}) }}
              onClick={() => setGender(g.v)}
            >
              {g.l}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 탭 인물 목록 */}
      {tabRels.length > 0 && (
        <div style={s.relBody}>
          {tabRels.map(rel => {
            const otherId   = otherPersonId(rel, personId, relTab);
            const relPerson = Number(rel.person1?.id) === Number(otherId) ? rel.person1 : rel.person2;
            const node      = getNode(otherId) ?? relPerson ?? null;
            const name      = node ? (node.name ?? `${node.last_name ?? ''}${node.first_name ?? ''}`) : `#${otherId}`;
            const photo     = node?.photoUrl ?? node?.photo_url;
            const isSel     = Number(selectedId) === Number(otherId);
            return (
              <div
                key={rel.id}
                style={{ ...s.relRow, ...(isSel ? s.relRowOn : {}) }}
                onClick={() => {
                  if (isSel) { setSelectedId(null); setSelectedPersonCache(null); }
                  else { setSelectedId(otherId); setSelectedPersonCache(node); }
                }}
              >
                <div style={s.thumb}>
                  {photo ? <img src={photo} alt={name} style={s.thumbImg} /> : <span style={{ fontSize: 16, color: '#C4A882' }}>👤</span>}
                </div>
                <span style={{ fontSize: 13, color: '#3a2a1a', flex: 1 }}>{name}</span>
                <button
                  style={{ ...s.btnDng, padding: '2px 7px', fontSize: 11 }}
                  onClick={e => { e.stopPropagation(); setConfirmDel({ id: rel.id, name }); }}
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 정보 폼 */}
      <div style={s.form}>
        <div style={s.row2}>
          <div>
            <label style={s.lbl}>성 (姓)</label>
            <input style={s.inp} value={form.lastName}   onChange={e => setForm(f => ({ ...f, lastName:   e.target.value }))} placeholder="이" />
          </div>
          <div>
            <label style={s.lbl}>이름</label>
            <input style={s.inp} value={form.firstName}  onChange={e => setForm(f => ({ ...f, firstName:  e.target.value }))} placeholder="상훈" />
          </div>
        </div>
        <div style={s.row2}>
          <div>
            <label style={s.lbl}>영문 성</label>
            <input style={s.inp} value={form.nameEnLast}  onChange={e => setForm(f => ({ ...f, nameEnLast:  e.target.value }))} placeholder="LEE" />
          </div>
          <div>
            <label style={s.lbl}>영문 이름</label>
            <input style={s.inp} value={form.nameEnFirst} onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="SANGHUN" />
          </div>
        </div>

        <label style={s.lbl}>생년월일</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KoreanDateInput
            value={form.birthDate}
            onChange={v => setForm(f => ({ ...f, birthDate: v }))}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={form.birthLunar} onChange={e => setForm(f => ({ ...f, birthLunar: e.target.checked }))} />
            음력
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', margin: '8px 0 4px' }}>
          <input type="checkbox" checked={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))} />
          사망
        </label>
        {form.isDeceased && (
          <>
            <label style={s.lbl}>사망일</label>
            <KoreanDateInput
              value={form.deathDate}
              onChange={v => setForm(f => ({ ...f, deathDate: v }))}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            style={{ ...s.btnPri, flex: 1, opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? '저장 중...' : selectedId ? '수정/저장' : '생성/저장'}
          </button>
          {selectedId && relTab === 'spouse' && (
            <button
              style={{ ...s.btnWarn, flex: 1 }}
              onClick={() => setConfirmDivorce({ id: selectedId, name: form.firstName || form.lastName })}
            >
              이혼
            </button>
          )}
          {selectedId && (
            <button
              style={{ ...s.btnDng, flex: 1 }}
              onClick={() => setConfirmDel({ id: null, name: form.firstName })}
            >
              제거
            </button>
          )}
        </div>
      </div>

      {/* 간이 가계도 */}
      <MiniTree
        key={relations.length}
        curatorNode={curatorNode}
        relations={relations}
        nodes={nodes}
        personId={personId}
      />

      {/* 이혼 확인 모달 */}
      {confirmDivorce && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <p style={{ fontSize: 14, color: '#3a2a1a', marginBottom: 8 }}>
              "{confirmDivorce.name}"와의 이혼을 처리하시겠습니까?
            </p>
            <p style={{ fontSize: 12, color: '#8B7355', marginBottom: 20 }}>
              이혼 이력은 보존되며 [이혼] 탭에서 확인할 수 있습니다.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button style={s.btnWarn} onClick={handleDivorce}>이혼 처리</button>
              <button style={s.btnSec} onClick={() => setConfirmDivorce(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 제거 확인 모달 */}
      {confirmDel && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <p style={{ fontSize: 14, color: '#3a2a1a', marginBottom: 20 }}>
              "{confirmDel.name}"와의 관계를 해제하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button style={s.btnDng} onClick={handleRemove}>해제</button>
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
  wrap:         { display: 'flex', flexDirection: 'column', gap: 10 },
  photoWrap:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  cardFrame:    { width: 180, height: 180, borderRadius: 8, border: '2px solid #C4A882', background: '#2a2a2a', overflow: 'hidden', position: 'relative' },
  photoImg:     { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, background: '#C4A882', borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  cardEmpty:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  changePhotoBtn: { padding: '3px 12px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 11, color: '#8B7355', cursor: 'pointer' },
  tabRow:       { display: 'flex', gap: 8, alignItems: 'center' },
  relTabs:      { display: 'flex', gap: 4, flex: 1 },
  relTab:       { flex: 1, padding: '5px 0', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  relTabOn:     { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  genderBtns:   { display: 'flex', gap: 4 },
  genderBtn:    { padding: '5px 10px', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  genderOn:     { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  relBody:      { border: '1px solid #E8DFD0', borderRadius: 4, padding: 6 },
  relRow:       { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', borderRadius: 4, cursor: 'pointer', marginBottom: 2 },
  relRowOn:     { background: '#F0EAE0' },
  thumb:        { width: 28, height: 28, borderRadius: 4, overflow: 'hidden', background: '#F0EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  thumbImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  form:         { display: 'flex', flexDirection: 'column', gap: 2 },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 },
  lbl:          { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 3, marginTop: 6 },
  inp:          { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#FDFBF7', outline: 'none' },
  btnPri:       { padding: '9px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec:       { padding: '6px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng:       { padding: '9px 0', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnWarn:      { padding: '9px 0', background: '#E67E22', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:        { background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};

// ── 간이 가계도 스타일 ────────────────────────────────────────────────────────
const mt = {
  wrap:  { marginTop: 16, padding: 12, background: '#F5F0E8', borderRadius: 8, border: '1px solid #E8DFD0' },
  title: { fontSize: 11, color: '#8B7355', marginBottom: 10, fontWeight: 600 },
  row:   { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  box:   { padding: '4px 10px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#3a2a1a', background: '#FDFBF7' },
  boxMe: { background: '#8B7355', color: '#fff', borderColor: '#8B7355', fontWeight: 600 },
  line:  { textAlign: 'center', color: '#C4A882', fontSize: 16, lineHeight: 1.2, margin: '2px 0' },
  dash:  { display: 'flex', alignItems: 'center', color: '#C4A882', fontSize: 16 },
};
