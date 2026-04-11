/**
 * panels/FamilyPanel.jsx — §8/§9 가족 관리
 *
 * - 관계 탭: 부모 / 자녀 / 배우자 / 형제자매
 * - 탭 선택 시 해당 인물 기존 데이터 자동 로드 (§9)
 * - 등록된 인물 → [선택한 가족 정보 수정][가족 관계 삭제] 활성, [새 가족 추가] 비활성
 * - 미등록 인물 → [새 가족 추가] 활성, 나머지 비활성
 * - [가족 관계 삭제]: "정말 관계를 해제하시겠습니까?" 확인 후 person_relations 삭제 (§8/§9)
 * - 새 가족 추가 후 invalidate() → 트리 즉시 갱신 (§19/§24-4)
 */

import { useState }           from 'react';
import { toast }              from 'react-hot-toast';
import { useTreeStore }       from '../../store/treeStore';
import {
  createPerson,
  savePerson,
  deletePerson,
  deleteRelation,
} from '../hooks/archiveApi';

// ── 상수 ─────────────────────────────────────────────────────────────────────
const REL_TABS = [
  { key: 'parent',  label: '부모'   },
  { key: 'child',   label: '자녀'   },
  { key: 'spouse',  label: '배우자' },
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

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function FamilyPanel({
  curatorNode,
  personId,
  siteId,
  relations,
  refreshRelations,
}) {
  const { nodes, invalidate } = useTreeStore();

  const [relTab,     setRelTab]     = useState('parent');
  const [confirmDel, setConfirmDel] = useState(null); // { id, name }
  const [saving,     setSaving]     = useState(false);

  // 새 가족 추가용 폼 (탭 내 간략 입력)
  const [newForm, setNewForm] = useState({
    name: '', nameEnFirst: '', nameEnLast: '',
    gender: 'male', birthYear: '',
  });

  const tabRels     = filterRels(relations, personId, relTab);
  const hasRels     = tabRels.length > 0;
  const getNodeName = id => nodes.find(n => n.personId === id)?.name ?? `#${id}`;

  // ── 새 가족 추가 (구: 생성) ────────────────────────────────────────────────
  // §19: person_relations 기반. 생성 후 invalidate() → 트리 즉시 갱신 (§24-4)
  async function handleCreatePerson() {
    if (!siteId || !newForm.name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    try {
      const birthDate = newForm.birthYear ? `${newForm.birthYear}-01-01` : null;
      await createPerson(siteId, {
        name:          newForm.name,
        name_en_first: newForm.nameEnFirst || null,
        name_en_last:  newForm.nameEnLast  || null,
        name_en:       [newForm.nameEnFirst, newForm.nameEnLast].filter(Boolean).join(' ') || null,
        gender:        newForm.gender,
        birth_date:    birthDate,
        relation_type: relTab === 'child' ? 'parent' : relTab, // 탭 기준 관계
        relative_id:   personId,                               // 기준 인물
      });
      // §19/§24-4: 트리 캐시 무효화 → FamilyTreeCanvas 즉시 갱신
      await invalidate();
      await refreshRelations();
      setNewForm({ name: '', nameEnFirst: '', nameEnLast: '', gender: 'male', birthYear: '' });
      toast.success('새 가족이 추가됐습니다. 트리에 바로 표시됩니다.');
    } catch (err) {
      toast.error(err.message || '추가 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 선택한 가족 정보 수정 (구: 수정) ──────────────────────────────────────
  // 등록된 인물 선택 시 활성. 현재는 curatorNode 기준으로 동작.
  // TODO: 탭에서 특정 인물을 선택하는 UI 추가 시 selectedPersonId로 교체.
  async function handleEditSelected() {
    if (!siteId || !personId) return;
    toast('선택한 가족 정보 수정 모달 준비 중');
  }

  // ── 가족 관계 삭제 (구: 제거) ──────────────────────────────────────────────
  async function handleDeletePerson() {
    if (!siteId || !personId) return;
    if (!window.confirm('이 인물을 트리에서 제거하시겠습니까?')) return;
    try {
      await deletePerson(siteId, personId);
      await invalidate();
      await refreshRelations();
      toast.success('인물이 제거됐습니다.');
    } catch {
      toast.error('제거 실패');
    }
  }

  // ── 관계 해제 (§8/§9: 확인 모달 후 삭제) ──────────────────────────────────
  async function handleDeleteRelation(relationId) {
    try {
      await deleteRelation(siteId, relationId);
      await invalidate();
      await refreshRelations();
      toast.success('관계가 해제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    } finally {
      setConfirmDel(null);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* 관계 탭 §8/§9 */}
      <div style={s.relTabs}>
        {REL_TABS.map(t => (
          <button
            key={t.key}
            style={{ ...s.relTab, ...(relTab === t.key ? s.relTabOn : {}) }}
            onClick={() => setRelTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 관계 목록 */}
      <div style={s.relBody}>
        {tabRels.length === 0 ? (
          <p style={{ fontSize: 12, color: '#B09060', textAlign: 'center', margin: '12px 0' }}>
            등록된 {REL_TABS.find(t => t.key === relTab)?.label} 없음
          </p>
        ) : (
          tabRels.map(rel => {
            const otherId = otherPersonId(rel, personId, relTab);
            const name    = getNodeName(otherId);
            return (
              <div key={rel.id} style={s.relRow} data-testid="relation-row">
                <span style={{ fontSize: 13, color: '#3a2a1a' }}>{name}</span>
                <button
                  data-testid="relation-remove-btn"
                  style={{ ...s.btnDng, padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setConfirmDel({ id: rel.id, name })}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 새 가족 추가 폼 (미등록 시 활성) */}
      <div style={s.addForm}>
        <label style={s.lbl}>이름</label>
        <input
          style={s.inp}
          value={newForm.name}
          onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
          placeholder={`추가할 ${REL_TABS.find(t => t.key === relTab)?.label} 이름`}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>성 (영문)</label>
            <input
              style={s.inp}
              value={newForm.nameEnLast}
              onChange={e => setNewForm(f => ({ ...f, nameEnLast: e.target.value }))}
              placeholder="Hong"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>이름 (영문)</label>
            <input
              style={s.inp}
              value={newForm.nameEnFirst}
              onChange={e => setNewForm(f => ({ ...f, nameEnFirst: e.target.value }))}
              placeholder="Gildong"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>성별</label>
            <select
              style={{ ...s.inp, cursor: 'pointer' }}
              value={newForm.gender}
              onChange={e => setNewForm(f => ({ ...f, gender: e.target.value }))}
            >
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>출생년도</label>
            <input
              style={s.inp}
              value={newForm.birthYear}
              onChange={e => setNewForm(f => ({ ...f, birthYear: e.target.value }))}
              placeholder="1990" maxLength={4}
            />
          </div>
        </div>
      </div>

      {/* 인물 CRUD 버튼 — §8/§9 규칙 적용 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
        {/* [새 가족 추가] — 미등록 시 활성 */}
        <button
          data-testid="relation-create-btn"
          style={{ ...s.btnPri, width: '100%', opacity: saving ? 0.6 : 1 }}
          disabled={saving || hasRels}
          onClick={handleCreatePerson}
        >
          {saving ? '추가 중...' : '새 가족 추가'}
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          {/* [선택한 가족 정보 수정] — 등록된 인물 선택 시 활성 */}
          <button
            style={{ ...s.btnSec, flex: 1, opacity: hasRels ? 1 : 0.4 }}
            disabled={!hasRels}
            onClick={handleEditSelected}
          >
            선택한 가족 정보 수정
          </button>

          {/* [가족 관계 삭제] — 등록된 인물 선택 시 활성 */}
          <button
            style={{ ...s.btnDng, flex: 1, opacity: hasRels ? 1 : 0.4 }}
            disabled={!hasRels}
            onClick={handleDeletePerson}
          >
            가족 관계 삭제
          </button>
        </div>
      </div>

      {/* 관계 해제 확인 모달 §8/§9 */}
      {confirmDel && (
        <div style={s.overlay} data-testid="confirm-delete-modal">
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
  wrap:      { display: 'flex', flexDirection: 'column', height: '100%' },

  // 관계 탭
  relTabs:   { display: 'flex', gap: 4 },
  relTab:    { flex: 1, padding: '5px 0', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  relTabOn:  { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  relBody:   { marginTop: 6, minHeight: 56, border: '1px solid #E8DFD0', borderRadius: 4, padding: 8 },
  relRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },

  // 새 가족 추가 폼
  addForm:   { marginTop: 14 },
  lbl:       { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 3, marginTop: 8 },
  inp:       { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#FDFBF7', outline: 'none' },

  // 버튼
  btnPri:    { padding: '8px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnSec:    { padding: '6px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng:    { padding: '6px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },

  // 모달
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:     { background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};
