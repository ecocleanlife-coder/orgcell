/**
 * CareerSection.jsx — §8-C 주요약력
 *
 * 타임라인 UI: 좌측 연도 | 세로선 | 우측 내용 + 보조설명
 * - 항목 추가 / 인라인 편집 / 드래그 순서변경
 * - 항목별 공개/비공개 토글 (자물쇠 아이콘)
 * - 연도 오름차순 자동 정렬 토글
 * - 첫 진입 안내 모달 (localStorage 1회)
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  fetchCareerItems,
  createCareerItem,
  updateCareerItem,
  deleteCareerItem,
  reorderCareerItems,
} from './archiveApi';

const WELCOME_KEY = (siteId) => `careerWelcomed_${siteId}`;

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function CareerSection({ siteId, personId }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [autoSort,    setAutoSort]    = useState(false);

  // 새 항목 입력 폼 상태
  const [adding,    setAdding]    = useState(false);
  const [newYear,   setNewYear]   = useState('');
  const [newContent,setNewContent]= useState('');
  const [newDesc,   setNewDesc]   = useState('');

  // 인라인 편집 상태 { id, year, content, description }
  const [editing,   setEditing]   = useState(null);

  // 드래그 상태
  const dragIdx = useRef(null);

  // ── 초기 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    fetchCareerItems(siteId)
      .then(data => {
        setItems(data);
        if (!localStorage.getItem(WELCOME_KEY(siteId))) {
          setShowWelcome(true);
        }
      })
      .catch(() => toast.error('약력 로드 실패'))
      .finally(() => setLoading(false));
  }, [siteId]);

  // ── 자동 정렬 적용 ─────────────────────────────────────────────────────────
  const displayItems = autoSort
    ? [...items].sort((a, b) => a.year - b.year)
    : items;

  // ── 항목 추가 ──────────────────────────────────────────────────────────────
  async function handleAdd() {
    const yr = parseInt(newYear, 10);
    if (!yr || yr < 1000 || yr > 2100) { toast.error('연도는 1000~2100 사이 숫자입니다'); return; }
    if (!newContent.trim()) { toast.error('내용을 입력해주세요'); return; }

    try {
      const res = await createCareerItem(siteId, {
        person_id:   personId ?? 0,
        year:        yr,
        content:     newContent.trim(),
        description: newDesc.trim() || null,
        is_public:   false,
      });
      setItems(prev => [...prev, res.item]);
      setNewYear(''); setNewContent(''); setNewDesc('');
      setAdding(false);
    } catch (err) {
      toast.error(err.message || '추가 실패');
    }
  }

  // ── 인라인 편집 저장 ───────────────────────────────────────────────────────
  async function handleEditSave() {
    if (!editing) return;
    const yr = parseInt(editing.year, 10);
    if (!yr || yr < 1000 || yr > 2100) { toast.error('연도 오류'); return; }
    if (!editing.content.trim()) { toast.error('내용 필수'); return; }

    try {
      const res = await updateCareerItem(siteId, editing.id, {
        year:        yr,
        content:     editing.content.trim(),
        description: editing.description?.trim() || null,
      });
      setItems(prev => prev.map(it => it.id === editing.id ? res.item : it));
      setEditing(null);
    } catch (err) {
      toast.error(err.message || '수정 실패');
    }
  }

  // ── 공개 토글 ──────────────────────────────────────────────────────────────
  async function handleTogglePublic(item) {
    try {
      const res = await updateCareerItem(siteId, item.id, { is_public: !item.is_public });
      setItems(prev => prev.map(it => it.id === item.id ? res.item : it));
    } catch {
      toast.error('설정 변경 실패');
    }
  }

  // ── 삭제 ───────────────────────────────────────────────────────────────────
  async function handleDelete(itemId) {
    try {
      await deleteCareerItem(siteId, itemId);
      setItems(prev => prev.filter(it => it.id !== itemId));
    } catch {
      toast.error('삭제 실패');
    }
  }

  // ── 드래그 순서 변경 ───────────────────────────────────────────────────────
  function onDragStart(i) { dragIdx.current = i; }
  function onDragOver(e, i) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setItems(next);
  }
  async function onDragEnd() {
    dragIdx.current = null;
    try {
      await reorderCareerItems(siteId, items.map(it => it.id));
    } catch {
      toast.error('순서 저장 실패');
    }
  }

  // ── 안내 모달 닫기 ─────────────────────────────────────────────────────────
  function closeWelcome() {
    localStorage.setItem(WELCOME_KEY(siteId), '1');
    setShowWelcome(false);
  }

  if (loading) return <p style={s.hint}>불러오는 중...</p>;

  return (
    <div style={s.wrap}>
      {/* 안내 모달 */}
      {showWelcome && (
        <div style={s.overlay} onClick={closeWelcome}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>📜 주요약력이란?</p>
            <p style={s.modalBody}>
              살아온 발자취를 연도별로 기록해주세요.<br />
              학력, 경력, 가족 행사, 수상 등<br />
              어떤 내용이든 괜찮습니다.<br /><br />
              후세에게 삶의 흐름을 전해주는<br />
              가장 간결한 유산이 됩니다.
            </p>
            <button style={s.modalBtn} onClick={closeWelcome}>시작하기</button>
          </div>
        </div>
      )}

      {/* 툴바 */}
      <div style={s.toolbar}>
        <button style={s.addBtn} onClick={() => setAdding(true)}>＋ 항목 추가</button>
        <label style={s.sortToggle}>
          <input
            type="checkbox"
            checked={autoSort}
            onChange={e => setAutoSort(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          연도 오름차순 정렬
        </label>
      </div>

      {/* 새 항목 입력 행 */}
      {adding && (
        <div style={s.addRow}>
          <input
            style={{ ...s.inp, width: 70 }}
            placeholder="연도"
            maxLength={4}
            value={newYear}
            onChange={e => setNewYear(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <input
            style={{ ...s.inp, flex: 2 }}
            placeholder="내용 (필수)"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <input
            style={{ ...s.inp, flex: 3 }}
            placeholder="보조설명 (선택)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <button style={s.saveBtn} onClick={handleAdd}>저장</button>
          <button style={s.cancelBtn} onClick={() => { setAdding(false); setNewYear(''); setNewContent(''); setNewDesc(''); }}>취소</button>
        </div>
      )}

      {/* 타임라인 */}
      {displayItems.length === 0 && !adding && (
        <p style={s.hint}>약력 항목이 없습니다. [＋ 항목 추가]를 눌러 시작하세요.</p>
      )}

      <div style={s.timeline}>
        {displayItems.map((item, i) => {
          const isEditing = editing?.id === item.id;
          return (
            <div
              key={item.id}
              style={{ ...s.row, opacity: item.is_public ? 1 : 0.45 }}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={onDragEnd}
            >
              {/* 연도 */}
              <div style={s.yearCol}>
                {isEditing ? (
                  <input
                    style={{ ...s.inp, width: 60, textAlign: 'center' }}
                    value={editing.year}
                    maxLength={4}
                    onChange={e => setEditing(v => ({ ...v, year: e.target.value.replace(/\D/g, '') }))}
                  />
                ) : (
                  <span style={s.yearText}>{item.year}</span>
                )}
              </div>

              {/* 세로선 */}
              <div style={s.lineCol}>
                <div style={s.dot} />
                {i < displayItems.length - 1 && <div style={s.line} />}
              </div>

              {/* 내용 */}
              <div style={s.contentCol}>
                {isEditing ? (
                  <>
                    <input
                      style={{ ...s.inp, width: '100%' }}
                      value={editing.content}
                      onChange={e => setEditing(v => ({ ...v, content: e.target.value }))}
                      placeholder="내용"
                    />
                    <input
                      style={{ ...s.inp, width: '100%', marginTop: 4 }}
                      value={editing.description ?? ''}
                      onChange={e => setEditing(v => ({ ...v, description: e.target.value }))}
                      placeholder="보조설명 (선택)"
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button style={s.saveBtn} onClick={handleEditSave}>저장</button>
                      <button style={s.cancelBtn} onClick={() => setEditing(null)}>취소</button>
                    </div>
                  </>
                ) : (
                  <div
                    style={s.contentBox}
                    onClick={() => setEditing({ id: item.id, year: String(item.year), content: item.content, description: item.description ?? '' })}
                    title="클릭하여 편집"
                  >
                    <span style={s.contentText}>{item.content}</span>
                    {item.description && (
                      <span style={s.descText}>{item.description}</span>
                    )}
                  </div>
                )}
              </div>

              {/* 우측 액션 */}
              {!isEditing && (
                <div style={s.actions}>
                  <button
                    style={s.lockBtn}
                    onClick={() => handleTogglePublic(item)}
                    title={item.is_public ? '공개 중 — 클릭하면 비공개' : '비공개 — 클릭하면 공개'}
                  >
                    {item.is_public ? '🔓' : '🔒'}
                  </button>
                  <button style={s.delBtn} onClick={() => handleDelete(item.id)} title="삭제">×</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:        { display: 'flex', flexDirection: 'column', gap: 12 },
  hint:        { fontSize: 13, color: '#B09060', margin: 0, textAlign: 'center', padding: '20px 0' },

  // 툴바
  toolbar:     { display: 'flex', alignItems: 'center', gap: 12 },
  addBtn:      { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  sortToggle:  { display: 'flex', alignItems: 'center', fontSize: 12, color: '#5a4a35', cursor: 'pointer' },

  // 추가 입력 행
  addRow:      { display: 'flex', gap: 6, alignItems: 'center', background: '#FDF8F0', border: '1px solid #E8DFD0', borderRadius: 6, padding: '8px 10px', flexWrap: 'wrap' },
  inp:         { border: '1px solid #C4A882', borderRadius: 4, padding: '5px 8px', fontSize: 12, background: '#FDFBF7', outline: 'none', boxSizing: 'border-box' },
  saveBtn:     { padding: '5px 12px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  cancelBtn:   { padding: '5px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },

  // 타임라인
  timeline:    { display: 'flex', flexDirection: 'column' },
  row:         { display: 'flex', alignItems: 'flex-start', cursor: 'grab', userSelect: 'none' },

  yearCol:     { width: 52, flexShrink: 0, textAlign: 'right', paddingRight: 8, paddingTop: 10 },
  yearText:    { fontSize: 13, fontWeight: 700, color: '#8B7355' },

  lineCol:     { width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 },
  dot:         { width: 9, height: 9, borderRadius: '50%', background: '#C4A882', flexShrink: 0 },
  line:        { width: 2, flex: 1, minHeight: 20, background: '#E8DFD0', marginTop: 2 },

  contentCol:  { flex: 1, paddingLeft: 10, paddingTop: 6, paddingBottom: 14 },
  contentBox:  { cursor: 'pointer', padding: '4px 6px', borderRadius: 4, transition: 'background 0.15s', display: 'inline-block', minWidth: 0 },
  contentText: { fontSize: 14, color: '#3a2e1e', display: 'block' },
  descText:    { fontSize: 12, color: '#8B7355', display: 'block', marginTop: 2 },

  actions:     { display: 'flex', alignItems: 'center', gap: 4, paddingTop: 8, flexShrink: 0 },
  lockBtn:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px' },
  delBtn:      { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#B09060', padding: '2px 4px', lineHeight: 1 },

  // 안내 모달
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal:       { background: '#FDF8F0', borderRadius: 10, padding: '32px 28px', maxWidth: 340, width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' },
  modalTitle:  { fontSize: 17, fontWeight: 700, color: '#5a4a35', margin: '0 0 14px' },
  modalBody:   { fontSize: 13, color: '#6a5a45', lineHeight: 1.8, margin: '0 0 20px' },
  modalBtn:    { padding: '9px 28px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
