/**
 * AutobiographySection.jsx — §8-D 자서전
 *
 * 좌우 분할:
 *   좌측: 챕터 목록 + 드래그 + 공개/비공개 + [+ 챕터 추가] + [파일 업로드]
 *   우측: TipTap 에디터 (제목 + 툴바 + 본문) + 저장 상태
 *
 * 자동저장: 30초 간격
 * 저장 형식: TipTap HTML 문자열
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent }                  from '@tiptap/react';
import StarterKit                                     from '@tiptap/starter-kit';
import Underline                                      from '@tiptap/extension-underline';
import { toast }                                      from 'react-hot-toast';
import {
  fetchAutoChapters,
  createAutoChapter,
  updateAutoChapter,
  deleteAutoChapter,
  reorderAutoChapters,
  uploadAutoFile,
} from './archiveApi';

const WELCOME_KEY = (siteId) => `autoWelcomed_${siteId}`;
const SAVE_INTERVAL_MS = 30_000;

// ══════════════════════════════════════════════════════════════════════════════
export default function AutobiographySection({ siteId, personId }) {
  const [chapters,    setChapters]    = useState([]);
  const [files,       setFiles]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeId,    setActiveId]    = useState(null); // 현재 편집 중 챕터 id
  const [saveStatus,  setSaveStatus]  = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [editTitle,   setEditTitle]   = useState('');

  const dragIdx    = useRef(null);
  const autoSaveRef= useRef(null);
  const fileRef    = useRef(null);

  // ── TipTap 에디터 ────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content:    '',
    onUpdate:   () => setSaveStatus('unsaved'),
  });

  // ── 초기 로드 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    fetchAutoChapters(siteId)
      .then(data => {
        setChapters(data.chapters ?? []);
        setFiles(data.files ?? []);
        if (!localStorage.getItem(WELCOME_KEY(siteId))) setShowWelcome(true);
      })
      .catch(() => toast.error('자서전 로드 실패'))
      .finally(() => setLoading(false));
  }, [siteId]);

  // ── 활성 챕터 변경 시 에디터 내용 교체 ───────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const ch = chapters.find(c => c.id === activeId);
    if (ch) {
      editor.commands.setContent(ch.content ?? '');
      setEditTitle(ch.title);
      setSaveStatus('saved');
    } else {
      editor.commands.setContent('');
      setEditTitle('');
    }
  }, [activeId, editor]);

  // ── 자동저장 30초 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (!activeId) return;
    autoSaveRef.current = setInterval(() => {
      if (saveStatus === 'unsaved') handleSave();
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(autoSaveRef.current);
  }, [activeId, saveStatus]);

  // ── 저장 ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!activeId || !editor) return;
    setSaveStatus('saving');
    try {
      const html = editor.getHTML();
      const res  = await updateAutoChapter(siteId, activeId, { title: editTitle, content: html });
      setChapters(prev => prev.map(c => c.id === activeId ? res.chapter : c));
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
      toast.error('저장 실패');
    }
  }, [activeId, editor, editTitle, siteId]);

  // ── 챕터 추가 ────────────────────────────────────────────────────────────
  async function handleAddChapter() {
    try {
      const res = await createAutoChapter(siteId, {
        person_id: personId ?? 0,
        title:     `챕터 ${chapters.length + 1}`,
        content:   '',
        is_public: false,
      });
      setChapters(prev => [...prev, res.chapter]);
      setActiveId(res.chapter.id);
    } catch (err) {
      toast.error(err.message || '챕터 추가 실패');
    }
  }

  // ── 챕터 삭제 ────────────────────────────────────────────────────────────
  async function handleDeleteChapter(id) {
    if (!window.confirm('이 챕터를 삭제하시겠습니까?')) return;
    try {
      await deleteAutoChapter(siteId, id);
      setChapters(prev => prev.filter(c => c.id !== id));
      if (activeId === id) setActiveId(null);
    } catch { toast.error('삭제 실패'); }
  }

  // ── 공개 토글 ────────────────────────────────────────────────────────────
  async function handleTogglePublic(ch) {
    try {
      const res = await updateAutoChapter(siteId, ch.id, { is_public: !ch.is_public });
      setChapters(prev => prev.map(c => c.id === ch.id ? res.chapter : c));
    } catch { toast.error('설정 변경 실패'); }
  }

  // ── 드래그 순서변경 ──────────────────────────────────────────────────────
  function onDragStart(i)    { dragIdx.current = i; }
  function onDragOver(e, i) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...chapters];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setChapters(next);
  }
  async function onDragEnd() {
    dragIdx.current = null;
    try { await reorderAutoChapters(siteId, chapters.map(c => c.id)); }
    catch { toast.error('순서 저장 실패'); }
  }

  // ── 파일 업로드 ──────────────────────────────────────────────────────────
  async function handleFileUpload(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      toast.loading('파일 처리 중...');
      const res = await uploadAutoFile(siteId, personId, file);
      toast.dismiss();
      if (res.chapter) {
        setChapters(prev => [...prev, res.chapter]);
        setActiveId(res.chapter.id);
        toast.success('텍스트를 추출하여 챕터를 생성했습니다.');
      } else if (res.hwpWarning) {
        setFiles(prev => [...prev, { id: res.fileId, file_url: res.fileUrl, file_type: ext, file_name: file.name, is_extracted: false }]);
        toast.success('HWP 파일이 업로드됐습니다.');
      } else {
        toast(res.message || 'PDF 추출 실패 — 원본 보관', { icon: '⚠️' });
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.message || '업로드 실패');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── 안내 모달 닫기 ───────────────────────────────────────────────────────
  function closeWelcome() {
    localStorage.setItem(WELCOME_KEY(siteId), '1');
    setShowWelcome(false);
  }

  const activeChapter = chapters.find(c => c.id === activeId);

  if (loading) return <p style={s.hint}>불러오는 중...</p>;

  return (
    <div style={s.wrap}>

      {/* 안내 모달 */}
      {showWelcome && (
        <div style={s.overlay} onClick={closeWelcome}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <p style={s.modalTitle}>📖 자서전 작성</p>
            <p style={s.modalBody}>
              당신의 이야기를 직접 써주세요.<br />
              파일이 있다면 업로드해서 이어 쓸 수 있습니다.<br />
              챕터를 나눠 정리하면 후세가<br />
              읽기 더 편합니다.
            </p>
            <button style={s.modalBtn} onClick={closeWelcome}>시작하기</button>
          </div>
        </div>
      )}

      <div style={s.layout}>

        {/* ── 좌측 챕터 목록 ───────────────────────────────────────────── */}
        <div style={s.sidebar}>
          <div style={s.sidebarBtns}>
            <button style={s.addBtn} onClick={handleAddChapter}>＋ 챕터 추가</button>
            <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>↑ 파일 업로드</button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.doc,.docx,.hwp,.hwpx,.pdf"
              style={{ display: 'none' }}
              onChange={e => handleFileUpload(e.target.files?.[0])}
            />
          </div>

          {chapters.length === 0 && (
            <p style={s.hint}>챕터가 없습니다</p>
          )}

          {chapters.map((ch, i) => (
            <div
              key={ch.id}
              style={{
                ...s.chapterItem,
                ...(activeId === ch.id ? s.chapterActive : {}),
                opacity: ch.is_public ? 1 : 0.5,
              }}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              onClick={() => {
                if (saveStatus === 'unsaved' && activeId) handleSave();
                setActiveId(ch.id);
              }}
            >
              <span style={s.chapterTitle}>{ch.title}</span>
              <div style={s.chapterActions}>
                <button
                  style={s.lockBtn}
                  onClick={e => { e.stopPropagation(); handleTogglePublic(ch); }}
                  title={ch.is_public ? '공개 중' : '비공개'}
                >
                  {ch.is_public ? '🔓' : '🔒'}
                </button>
                <button
                  style={s.delBtn}
                  onClick={e => { e.stopPropagation(); handleDeleteChapter(ch.id); }}
                  title="삭제"
                >×</button>
              </div>
            </div>
          ))}

          {/* HWP 파일 목록 */}
          {files.filter(f => f.file_type === 'hwp' || f.file_type === 'hwpx').map(f => (
            <div key={f.id} style={s.hwpItem}>
              <span style={s.hwpName} title={f.file_name}>{f.file_name}</span>
              <a href={f.file_url} download={f.file_name} style={s.hwpDownload}>↓</a>
            </div>
          ))}
        </div>

        {/* ── 우측 에디터 영역 ──────────────────────────────────────────── */}
        <div style={s.editorWrap}>
          {!activeChapter ? (
            <div style={s.editorEmpty}>
              <span style={{ fontSize: 36, opacity: 0.2 }}>📖</span>
              <p style={{ color: '#B09060', fontSize: 13, margin: '8px 0 0' }}>
                좌측에서 챕터를 선택하거나 새 챕터를 추가하세요
              </p>
            </div>
          ) : (
            <>
              {/* 저장 상태 */}
              <div style={s.saveBar}>
                <SaveStatus status={saveStatus} onSave={handleSave} />
              </div>

              {/* 챕터 제목 */}
              <input
                style={s.titleInput}
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); setSaveStatus('unsaved'); }}
                placeholder="챕터 제목"
              />

              {/* 툴바 */}
              {editor && <Toolbar editor={editor} />}

              {/* TipTap 에디터 */}
              <div style={s.editorBody}>
                <EditorContent editor={editor} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 저장 상태 표시 ────────────────────────────────────────────────────────────
function SaveStatus({ status, onSave }) {
  const label =
    status === 'saved'   ? '저장됨 ✓' :
    status === 'saving'  ? '저장 중...' :
    '미저장 변경사항';
  const color =
    status === 'saved'   ? '#4CAF50' :
    status === 'saving'  ? '#FF9800' :
    '#E57373';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color }}>{label}</span>
      {status === 'unsaved' && (
        <button style={s.saveNowBtn} onClick={onSave}>지금 저장</button>
      )}
    </div>
  );
}

// ── TipTap 툴바 ───────────────────────────────────────────────────────────────
function Toolbar({ editor }) {
  if (!editor) return null;
  const btn = (label, action, active) => (
    <button
      key={label}
      style={{ ...s.toolBtn, ...(active ? s.toolBtnOn : {}) }}
      onMouseDown={e => { e.preventDefault(); action(); }}
    >
      {label}
    </button>
  );
  return (
    <div style={s.toolbar}>
      {btn('B',  () => editor.chain().focus().toggleBold().run(),      editor.isActive('bold'))}
      {btn('I',  () => editor.chain().focus().toggleItalic().run(),    editor.isActive('italic'))}
      {btn('U',  () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
      <div style={s.toolSep} />
      {btn('¶',  () => editor.chain().focus().setParagraph().run(),    false)}
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:          { display: 'flex', flexDirection: 'column', height: '100%' },
  hint:          { fontSize: 13, color: '#B09060', margin: 0, textAlign: 'center', padding: '20px 0' },
  layout:        { display: 'flex', gap: 0, flex: 1, minHeight: 0 },

  // 좌측 사이드바
  sidebar:       { width: 180, flexShrink: 0, borderRight: '1px solid #E8DFD0', display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 6px', overflowY: 'auto' },
  sidebarBtns:   { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 },
  addBtn:        { padding: '6px 10px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' },
  uploadBtn:     { padding: '6px 10px', background: '#FAFAF5', color: '#5a4a35', border: '1px solid #C4A882', borderRadius: 4, fontSize: 11, cursor: 'pointer', textAlign: 'left' },

  chapterItem:   { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#3a2e1e', userSelect: 'none' },
  chapterActive: { background: '#F0E8D8' },
  chapterTitle:  { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chapterActions:{ display: 'flex', gap: 2, flexShrink: 0 },
  lockBtn:       { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '1px 2px' },
  delBtn:        { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#B09060', padding: '1px 2px', lineHeight: 1 },

  hwpItem:       { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px', borderRadius: 4, background: '#F5F0E8', marginTop: 4 },
  hwpName:       { flex: 1, fontSize: 11, color: '#8B7355', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  hwpDownload:   { fontSize: 13, color: '#8B7355', textDecoration: 'none', flexShrink: 0 },

  // 우측 에디터
  editorWrap:    { flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 16px', minWidth: 0 },
  editorEmpty:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

  saveBar:       { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 },
  saveNowBtn:    { padding: '3px 10px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' },

  titleInput:    { width: '100%', border: 'none', borderBottom: '1px solid #E8DFD0', padding: '6px 0', fontSize: 18, fontWeight: 700, color: '#3a2e1e', outline: 'none', background: 'transparent', marginBottom: 10, boxSizing: 'border-box' },

  toolbar:       { display: 'flex', alignItems: 'center', gap: 2, padding: '4px 0', borderBottom: '1px solid #E8DFD0', marginBottom: 8 },
  toolBtn:       { padding: '3px 9px', background: 'none', border: '1px solid #C4A882', borderRadius: 3, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#5a4a35' },
  toolBtnOn:     { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },
  toolSep:       { width: 1, height: 16, background: '#C4A882', margin: '0 4px' },

  editorBody:    { flex: 1, overflowY: 'auto', lineHeight: 1.8, fontSize: 14, color: '#3a2e1e' },

  // 안내 모달
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  modal:         { background: '#FDF8F0', borderRadius: 10, padding: '32px 28px', maxWidth: 340, width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: 700, color: '#5a4a35', margin: '0 0 14px' },
  modalBody:     { fontSize: 13, color: '#6a5a45', lineHeight: 1.8, margin: '0 0 20px' },
  modalBtn:      { padding: '9px 28px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
