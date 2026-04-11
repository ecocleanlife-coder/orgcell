/**
 * ArchivePage.jsx — §8 자료실 레이아웃
 *
 * 좌: 180×180 사진 에디터 + 인물정보 폼 + [관계] 탭
 * 우: 메뉴 버튼 (세로 배치, §12 자판기 스타일)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTreeStore }  from '../store/treeStore';
import { useAuthStore }  from '../store/authStore';
import { toast }         from 'react-hot-toast';

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res  = await fetch(path, { credentials: 'include', ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(json.message || `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

// ── 상수 ─────────────────────────────────────────────────────────────────────
const REL_TABS = [
  { key: 'parent',  label: '부모' },
  { key: 'child',   label: '자녀' },
  { key: 'spouse',  label: '배우자' },
  { key: 'sibling', label: '형제자매' },
];

const MENU_BTNS = [
  { key: 'photo',   label: '사진자료실' },
  { key: 'main',    label: '주요자료실' },
  { key: 'career',  label: '주요약력'   },
  { key: 'memoir',  label: '자서전'     },
  { key: 'artwork', label: '작품실'     },
  { key: 'voice',   label: '육성녹음'   },
  { key: 'album',   label: '공유앨범'   },
  null,
  { key: 'invite',  label: '초대하기'     },
  { key: 'pass',    label: '입장권 발급'  },
  { key: 'access',  label: '접근요청관리' },
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

// ══════════════════════════════════════════════════════════════════════════════
export default function ArchivePage() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const { nodes, siteId, curatorId, fetchTree, setSiteId, invalidate } = useTreeStore();
  const { isAuthenticated, fetchMe } = useAuthStore();

  const [preview,     setPreview]     = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);
  const [form,        setForm]        = useState({
    name: '', nameEnFirst: '', nameEnLast: '',
    gender: 'male', birthYear: '', birthMonth: '', birthDay: '',
    isDeceased: false, deathDate: '',
  });
  const [relations,  setRelations]  = useState([]);
  const [relTab,     setRelTab]     = useState('parent');
  const [confirmDel, setConfirmDel] = useState(null); // { id, name }
  const [activeMenu, setActiveMenu] = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [uploading,       setUploading]       = useState(false);
  const [mergeNotifs,     setMergeNotifs]     = useState([]);

  const curatorNode = nodes.find(n => n.personId === curatorId) ?? null;
  const personId    = curatorNode?.id ?? null;
  const dataReady   = !!siteId;

  // ── 초기 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subdomain) return;
    (async () => {
      await fetchMe();
      try {
        const data = await apiFetch(`/api/museum/${subdomain}`);
        const m    = data.data ?? data.museum ?? data;
        const id   = m?.id ?? m?.site_id;
        if (id) setSiteId(id);
        await fetchTree(subdomain);
      } catch (err) {
        if (err.status === 403) navigate(`/${subdomain}`);
      }
    })();
  }, [subdomain]);

  // ── curatorNode → 폼 동기화 ────────────────────────────────────────────────
  useEffect(() => {
    // Bug 3: curatorNode null이어도 preview 초기화 실행
    const ph = curatorNode?.photoUrl ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    if (!curatorNode) return;
    // Bug 1: ISO 타임스탬프 ("1990-01-12T00:00:00.000Z") → T 기준 앞만 파싱
    const bdate = curatorNode.birthDate ?? curatorNode.birth_date ?? '';
    const [by = '', bm = '', bd = ''] = bdate ? bdate.split('T')[0].split('-') : [];
    setForm({
      name:        curatorNode.name                                    ?? '',
      nameEnFirst: curatorNode.nameEnFirst ?? curatorNode.name_en_first ?? '',
      nameEnLast:  curatorNode.nameEnLast  ?? curatorNode.name_en_last  ?? '',
      gender:      curatorNode.gender                                  ?? 'male',
      birthYear:   by,
      birthMonth:  bm,
      birthDay:    bd,
      isDeceased:  curatorNode.isDeceased                              ?? false,
      deathDate:   curatorNode.deathDate   ?? curatorNode.death_date    ?? '',
    });
  }, [curatorNode]); // Bug 3: curatorNode 전체를 의존성으로 추가

  // ── 관계 목록 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    apiFetch(`/api/persons/${siteId}/relations`)
      .then(d => setRelations(d.data ?? []))
      .catch(() => {});
  }, [siteId]);

  // ── 통합 알림 로드 (§26-3) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    apiFetch(`/api/notifications?siteId=${siteId}`)
      .then(d => setMergeNotifs((d.data ?? []).filter(n => n.mergedPersonId)))
      .catch(() => {});
  }, [siteId]);

  // ── 사진 업로드 ────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !siteId || !personId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const json = await apiFetch(`/api/persons/${siteId}/${personId}/photo`, { method: 'POST', body: fd });
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

  // ── 사진 드래그 ────────────────────────────────────────────────────────────
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

  // ── 인물정보 저장 ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!siteId || !personId) return;
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2, '0'), form.birthDay?.padStart(2, '0')].filter(Boolean).join('-')
        : null;
      await apiFetch(`/api/persons/${siteId}/${personId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          name_en_first: form.nameEnFirst || null,
          name_en_last:  form.nameEnLast  || null,
          gender:        form.gender,
          birth_date:    birthDate,
          is_deceased:   form.isDeceased,
          death_date:    form.deathDate   || null,
        }),
      });
      await invalidate();
      await refreshRelations(); // Bug 5
      toast.success('저장됐습니다.');
    } catch {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 인물 생성 (Bug 4: [생성] onClick) ─────────────────────────────────────
  async function handleCreatePerson() {
    if (!siteId || !form.name.trim()) { toast.error('이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [form.birthYear, form.birthMonth?.padStart(2, '0'), form.birthDay?.padStart(2, '0')].filter(Boolean).join('-')
        : null;
      await apiFetch(`/api/persons/${siteId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name,
          name_en:     [form.nameEnFirst, form.nameEnLast].filter(Boolean).join(' ') || null,
          gender:      form.gender,
          birth_date:  birthDate,
          is_deceased: form.isDeceased,
          death_date:  form.deathDate || null,
        }),
      });
      await invalidate();
      await refreshRelations();
      toast.success('인물이 생성됐습니다.');
    } catch (err) {
      toast.error(err.message || '생성 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 인물 제거 (Bug 4: [제거] onClick) ─────────────────────────────────────
  async function handleDeletePerson() {
    if (!siteId || !personId) return;
    if (!window.confirm('이 인물을 트리에서 제거하시겠습니까?')) return;
    try {
      await apiFetch(`/api/persons/${siteId}/${personId}`, { method: 'DELETE' });
      await invalidate();
      await refreshRelations();
      toast.success('인물이 제거됐습니다.');
    } catch {
      toast.error('제거 실패');
    }
  }

  // ── 관계 목록 재조회 (Bug 5: 생성/삭제 후 호출) ───────────────────────────
  async function refreshRelations() {
    if (!siteId) return;
    const d = await apiFetch(`/api/persons/${siteId}/relations`).catch(() => ({ data: [] }));
    setRelations(d.data ?? []);
  }

  // ── 관계 삭제 ──────────────────────────────────────────────────────────────
  async function handleDeleteRelation(relationId) {
    try {
      await apiFetch(`/api/persons/${siteId}/relations/${relationId}`, { method: 'DELETE' });
      await invalidate();
      await refreshRelations(); // Bug 5
      toast.success('관계가 해제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    } finally {
      setConfirmDel(null);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  const tabRels     = filterRels(relations, personId, relTab);
  const getNodeName = id => nodes.find(n => n.personId === id)?.name ?? `#${id}`;

  if (!isAuthenticated) return null;
  if (!dataReady) return <div style={s.loading}>데이터 로드 중...</div>;

  return (
    <div style={s.page}>
      {/* ← 돌아가기 */}
      <div style={s.backBar}>
        <button style={s.backBtn} onClick={() => navigate(`/${subdomain}`)}>← 돌아가기</button>
      </div>

      <div style={s.body}>
        {/* ── 좌측 패널 ──────────────────────────────────────────────────────── */}
        <div style={s.left}>

          {/* 사진 에디터 180×180 */}
          <div
            data-testid="photo-drag-area"
            style={{ ...s.cardFrame, cursor: preview ? 'grab' : 'pointer' }}
            onPointerDown={preview ? handleDragStart : undefined}
            onClick={preview ? undefined : () => fileRef.current?.click()}
            onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: fileRef.current }); }}
            onDragOver={e => e.preventDefault()}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="프로필"
                  draggable={false}
                  style={{ ...s.photoImg, transform: `translate(${photoOffset.x}px,${photoOffset.y}px) scale(${photoScale})` }}
                />
                <div
                  data-testid="photo-resize-handle"
                  style={s.resizeHandle}
                  onPointerDown={e => {
                    e.stopPropagation();
                    const sy = e.clientY, sc = photoScale;
                    const onMove = ev => setPhotoScale(Math.max(0.5, Math.min(3, sc + (ev.clientY - sy) * 0.005)));
                    const onUp   = () => {
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
                />
              </>
            ) : (
              <div style={s.cardEmpty}>
                <span style={{ fontSize: 32, color: '#C4A882' }}>📷</span>
                <p style={{ color: '#8B7355', fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>
                  클릭 또는 사진을 끌어다 놓으세요
                </p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onInput={handleFile} />

          {/* 통합 알림 §26-3 */}
          {mergeNotifs.length > 0 && (
            <div style={s.notifBanner}>
              <span style={{ fontSize: 12, color: '#8B3010' }}>자동 통합 알림 {mergeNotifs.length}건</span>
              <button style={s.btnWarn} onClick={() => toast('잘못된 통합 신고 기능 준비 중')}>
                잘못된 통합 신고
              </button>
            </div>
          )}

          {/* 인물정보 폼 */}
          <div style={s.form}>
            <label style={s.lbl}>이름</label>
            <input style={s.inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="성함" />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={s.lbl}>성 (영문)</label>
                <input style={s.inp} value={form.nameEnLast} onChange={e => setForm(f => ({ ...f, nameEnLast: e.target.value }))} placeholder="Hong" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.lbl}>이름 (영문)</label>
                <input style={s.inp} value={form.nameEnFirst} onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))} placeholder="Gildong" />
              </div>
            </div>

            <label style={s.lbl}>성별</label>
            <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
              {['male', 'female'].map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" value={g} checked={form.gender === g} onChange={() => setForm(f => ({ ...f, gender: g }))} />
                  {g === 'male' ? '남' : '여'}
                </label>
              ))}
            </div>

            <label style={s.lbl}>생년월일</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input style={{ ...s.inp, flex: 2 }} value={form.birthYear} onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))} placeholder="년" maxLength={4} />
              <input style={{ ...s.inp, flex: 1 }} value={form.birthMonth} onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))} placeholder="월" maxLength={2} />
              <input style={{ ...s.inp, flex: 1 }} value={form.birthDay} onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))} placeholder="일" maxLength={2} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', margin: '8px 0' }}>
              <input type="checkbox" checked={form.isDeceased} onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))} />
              사망
            </label>

            {form.isDeceased && (
              <>
                <label style={s.lbl}>사망일</label>
                <input style={s.inp} type="date" value={form.deathDate} onChange={e => setForm(f => ({ ...f, deathDate: e.target.value }))} />
              </>
            )}

            <button
              style={{ ...s.saveBtn, opacity: !saving ? 1 : 0.6 }}
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          {/* ── 관계 탭 §8/§9 ────────────────────────────────────────────────── */}
          <div style={s.relWrap}>
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

            <div style={s.relBody}>
              {tabRels.map(rel => {
                const otherId = otherPersonId(rel, personId, relTab);
                const name    = getNodeName(otherId);
                return (
                  <div key={rel.id} style={s.relRow} data-testid="relation-row">
                    <span style={{ fontSize: 13, color: '#3a2a1a' }}>{name}</span>
                    <button
                      data-testid="relation-remove-btn"
                      style={{ ...s.btnDng, padding: '3px 8px', fontSize: 11 }}
                      onClick={() => setConfirmDel({ id: rel.id, name })}
                    >×</button>
                  </div>
                );
              })}
            </div>

            {/* 인물 CRUD 버튼 — 항상 표시 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                data-testid="relation-create-btn"
                style={{ ...s.btnPri, flex: 1 }}
                disabled={!!curatorNode}
                onClick={handleCreatePerson}
              >생성</button>
              <button
                style={{ ...s.btnSec, flex: 1 }}
                disabled={!curatorNode}
                onClick={handleSave}
              >수정</button>
              <button
                style={{ ...s.btnDng, flex: 1 }}
                disabled={!curatorNode}
                onClick={handleDeletePerson}
              >제거</button>
            </div>
          </div>
        </div>

        {/* ── 우측 메뉴 버튼 ─────────────────────────────────────────────────── */}
        <aside style={s.right}>
          {MENU_BTNS.map((btn, i) =>
            btn === null
              ? <div key={`sep-${i}`} style={s.sep} />
              : (
                <button
                  key={btn.key}
                  style={{ ...s.menuBtn, ...(activeMenu === btn.key ? s.menuOn : {}) }}
                  onClick={() => setActiveMenu(k => k === btn.key ? null : btn.key)}
                >
                  {btn.label}
                </button>
              )
          )}
        </aside>
      </div>

      {/* ── 삭제 확인 모달 ──────────────────────────────────────────────────── */}
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
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B7355', fontSize: 14 },
  page:    { display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9F7F2' },
  backBar: { background: '#FDF8F0', borderBottom: '1px solid #C4A882', padding: '8px 16px', flexShrink: 0 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8B7355', fontWeight: 600 },
  body:    { display: 'flex', flex: 1, overflow: 'hidden' },

  // 좌측
  left: {
    width: 280, display: 'flex', flexDirection: 'column',
    overflowY: 'auto', background: '#FDFBF7',
    borderRight: '1px solid #E8DFD0', padding: 16,
  },

  // 사진 에디터
  cardFrame:    { width: 180, height: 180, borderRadius: 8, border: '2px solid #C4A882', background: '#2a2a2a', overflow: 'hidden', position: 'relative', flexShrink: 0, alignSelf: 'center' },
  photoImg:     { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, background: '#C4A882', borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  cardEmpty:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 12 },

  // 폼
  form:    { marginTop: 14 },
  lbl:     { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 3, marginTop: 8 },
  inp:     { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#FDFBF7', outline: 'none' },
  saveBtn: { marginTop: 12, width: '100%', padding: '9px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  // 관계 탭
  relWrap:  { marginTop: 16 },
  relTabs:  { display: 'flex', gap: 4 },
  relTab:   { flex: 1, padding: '5px 0', fontSize: 11, border: '1px solid #C4A882', background: '#FDFBF7', borderRadius: 4, cursor: 'pointer', color: '#8B7355' },
  relTabOn: { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  relBody:  { marginTop: 6, minHeight: 56, border: '1px solid #E8DFD0', borderRadius: 4, padding: 8 },
  relRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  relEmpty: { display: 'flex', justifyContent: 'center', paddingTop: 6 },

  // 버튼
  btnPri: { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnSec: { padding: '5px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  btnDng: { padding: '5px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },

  // 우측 메뉴 (§12 자판기 스타일)
  right:   { display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: '#FDF8F0', width: 140, borderLeft: '1px solid #E8DFD0', overflowY: 'auto' },
  menuBtn: { padding: '8px 12px', background: '#FAFAF5', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '1px 1px 0 #c4a87a', borderRadius: 4, fontSize: 12, cursor: 'pointer', textAlign: 'left', color: '#5a4a35' },
  menuOn:  { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  sep:     { height: 1, background: '#C4A882', margin: '4px 0' },

  // 알림 배너
  notifBanner: { marginTop: 10, padding: '8px 10px', background: '#FFF3EB', border: '1px solid #E8A87C', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 },
  btnWarn:     { padding: '6px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },

  // 모달
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:   { background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, padding: '28px 32px', minWidth: 280, textAlign: 'center' },
};
