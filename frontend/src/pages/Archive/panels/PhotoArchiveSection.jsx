/**
 * PhotoArchiveSection.jsx — §8-A 사진자료실
 *
 * 폴더 생성/삭제/이름변경/드래그순서 + 사진 업로드/메모/태그/대표 설정
 * ArchivePanel.jsx 에서 activeMenu === 'photo' 일 때 렌더링
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchPhotoFolders,
  createPhotoFolder,
  renamePhotoFolder,
  deletePhotoFolder,
  reorderPhotoFolders,
  getPhotoCount,
  fetchFolderPhotos,
  uploadFolderPhotos,
  updateFolderPhoto,
  deleteFolderPhoto,
} from './archiveApi';

const THEME_OPTIONS = [
  { value: '', label: '태그 없음' },
  { value: 'family',  label: '가족' },
  { value: 'career',  label: '직업' },
  { value: 'hobby',   label: '취미' },
  { value: 'travel',  label: '여행' },
  { value: 'other',   label: '기타' },
];

const STAGE_TEMPLATE  = ['유아기', '유년기·청소년기', '청년기', '중년기', '노년기'];
const DECADE_TEMPLATE = ['1980년대', '1990년대', '2000년대', '2010년대', '2020년대'];

// ══════════════════════════════════════════════════════════════════════════════
export default function PhotoArchiveSection({ siteId }) {
  const [folders,     setFolders]     = useState([]);
  const [selFolder,   setSelFolder]   = useState(null);
  const [photos,      setPhotos]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTmpl,    setShowTmpl]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showNewRow,  setShowNewRow]  = useState(false);
  const [renamingId,  setRenamingId]  = useState(null);
  const [renameVal,   setRenameVal]   = useState('');
  const [editMemo,    setEditMemo]    = useState(null); // { photoId, text }
  const [lightbox,    setLightbox]    = useState(null); // photo object
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef = useRef(null);
  const exceeded10 = useRef(new Set()); // folder ids already warned
  const dragIdx    = useRef(null);

  // ── 초기화 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    loadFolders();
    if (!localStorage.getItem(`photoWelcomed_${siteId}`)) setShowWelcome(true);
  }, [siteId]);

  useEffect(() => {
    if (!selFolder) { setPhotos([]); return; }
    loadPhotos(selFolder.id);
  }, [selFolder?.id]);

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    try {
      const data = await fetchPhotoFolders(siteId);
      setFolders(data);
    } catch { setFolders([]); }
  }, [siteId]);

  const loadPhotos = useCallback(async (folderId) => {
    setLoading(true);
    try {
      setPhotos(await fetchFolderPhotos(siteId, folderId));
    } catch { setPhotos([]); }
    setLoading(false);
  }, [siteId]);

  // ── 폴더 CRUD ─────────────────────────────────────────────────────────────
  async function handleCreate(name) {
    if (!name.trim()) { toast.error('폴더 이름을 입력해주세요'); return; }
    try {
      await createPhotoFolder(siteId, name.trim(), folders.length);
      setNewName(''); setShowNewRow(false);
      await loadFolders();
    } catch { toast.error('폴더 생성 실패'); }
  }

  async function handleRenameConfirm(folderId) {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      await renamePhotoFolder(siteId, folderId, renameVal.trim());
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: renameVal.trim() } : f));
      if (selFolder?.id === folderId) setSelFolder(f => ({ ...f, name: renameVal.trim() }));
    } catch { toast.error('이름 변경 실패'); }
    setRenamingId(null);
  }

  async function handleDeleteFolder(folder) {
    if (!window.confirm(`"${folder.name}" 폴더와 이 폴더의 사진도 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
    try {
      await deletePhotoFolder(siteId, folder.id);
      if (selFolder?.id === folder.id) setSelFolder(null);
      await loadFolders();
    } catch { toast.error('삭제 실패'); }
  }

  // ── 템플릿 생성 ───────────────────────────────────────────────────────────
  async function handleTemplate(names) {
    for (let i = 0; i < names.length; i++) {
      await createPhotoFolder(siteId, names[i], i);
    }
    localStorage.setItem(`photoTemplated_${siteId}`, '1');
    setShowTmpl(false);
    await loadFolders();
  }

  // ── 사진 업로드 ───────────────────────────────────────────────────────────
  async function handleUpload(files) {
    if (!selFolder) { toast.error('먼저 폴더를 선택하세요'); return; }
    const imgFiles = files.filter(f => f.type.startsWith('image/'));
    if (!imgFiles.length) { toast.error('이미지 파일만 업로드 가능합니다'); return; }

    // 200장 검증
    try {
      const cnt = await getPhotoCount(siteId);
      if (cnt + imgFiles.length > 200) {
        toast('200장은 한 사람의 일생을 충분히 담을 수 있는 분량입니다.\n더 많은 사진을 등록하려면 유료 플랜을 이용해주세요.', { duration: 5000 });
        return;
      }
    } catch { /* 계속 */ }

    try {
      await uploadFolderPhotos(siteId, selFolder.id, imgFiles);
      await loadPhotos(selFolder.id);
      await loadFolders();
      toast.success('업로드됐습니다.');
      // 10장 초과 토스트 (폴더당 1회)
      const updated = await fetchFolderPhotos(siteId, selFolder.id);
      if (updated.length > 10 && !exceeded10.current.has(selFolder.id)) {
        exceeded10.current.add(selFolder.id);
        toast('방문자가 한 폴더에서 집중력을 유지하는 사진은 보통 10장 내외입니다.\n가장 중요한 순간들을 남겨주세요.', { duration: 5000 });
      }
      setPhotos(updated);
    } catch (err) {
      toast.error(err.message || '업로드 실패');
    }
  }

  // ── 사진 편집 ─────────────────────────────────────────────────────────────
  async function handleRepresentative(photoId) {
    try {
      await updateFolderPhoto(siteId, selFolder.id, photoId, { is_representative: true });
      setPhotos(prev => prev.map(p => ({ ...p, is_representative: p.id === photoId })));
    } catch { toast.error('대표 사진 설정 실패'); }
  }

  async function handleThemeTag(photoId, tag) {
    try {
      await updateFolderPhoto(siteId, selFolder.id, photoId, { theme_tag: tag || null });
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, theme_tag: tag || null } : p));
    } catch { toast.error('태그 저장 실패'); }
  }

  async function handleMemoSave(photoId, memo) {
    try {
      await updateFolderPhoto(siteId, selFolder.id, photoId, { memo });
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, memo } : p));
      setEditMemo(null);
    } catch { toast.error('메모 저장 실패'); }
  }

  async function handleDeletePhoto(photoId) {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    try {
      await deleteFolderPhoto(siteId, selFolder.id, photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      await loadFolders();
    } catch { toast.error('삭제 실패'); }
  }

  // ── 드래그 순서 ───────────────────────────────────────────────────────────
  async function handleDrop(dropIdx) {
    const from = dragIdx.current;
    if (from === null || from === dropIdx) return;
    const reordered = [...folders];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIdx, 0, moved);
    const orders = reordered.map((f, i) => ({ id: f.id, sort_order: i }));
    setFolders(reordered.map((f, i) => ({ ...f, sort_order: i })));
    try { await reorderPhotoFolders(siteId, orders); }
    catch { loadFolders(); }
  }

  // ── 모달 dismiss ─────────────────────────────────────────────────────────
  function dismissWelcome() {
    localStorage.setItem(`photoWelcomed_${siteId}`, '1');
    setShowWelcome(false);
    if (!localStorage.getItem(`photoTemplated_${siteId}`)) setShowTmpl(true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={s.wrap}>
      {/* 첫 진입 안내 모달 */}
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      {/* 템플릿 선택 모달 */}
      {showTmpl && (
        <TemplateModal
          onSelect={handleTemplate}
          onSkip={() => { localStorage.setItem(`photoTemplated_${siteId}`, '1'); setShowTmpl(false); }}
        />
      )}
      {/* 라이트박스 */}
      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}

      <div style={s.layout}>
        {/* 폴더 목록 */}
        <div style={s.folderCol}>
          <div style={s.folderHead}>
            <span style={s.folderTitle}>폴더</span>
            <button style={s.iconBtn} onClick={() => setShowNewRow(v => !v)} title="폴더 추가">＋</button>
          </div>

          {showNewRow && (
            <div style={s.newRow}>
              <input
                autoFocus
                style={s.newInput}
                placeholder="폴더 이름"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate(newName);
                  if (e.key === 'Escape') setShowNewRow(false);
                }}
              />
              <button style={s.okBtn} onClick={() => handleCreate(newName)}>추가</button>
            </div>
          )}

          {folders.length === 0 && !showNewRow && (
            <p style={s.emptyHint}>폴더가 없습니다.<br />＋ 버튼으로 추가하세요</p>
          )}

          {folders.map((f, idx) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
              style={{
                ...s.folderItem,
                ...(selFolder?.id === f.id ? s.folderOn : {}),
              }}
            >
              {renamingId === f.id ? (
                <input
                  autoFocus
                  style={s.renameInput}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => handleRenameConfirm(f.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRenameConfirm(f.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                />
              ) : (
                <span
                  style={s.folderName}
                  onClick={() => setSelFolder(f)}
                  onDoubleClick={() => { setRenamingId(f.id); setRenameVal(f.name); }}
                  title="클릭: 선택 / 더블클릭: 이름 변경"
                >
                  📁 {f.name}
                  <span style={s.folderCnt}>{f.photo_count ?? 0}</span>
                </span>
              )}
              <button
                style={s.delBtn}
                onClick={e => { e.stopPropagation(); handleDeleteFolder(f); }}
                title="폴더 삭제"
              >×</button>
            </div>
          ))}
        </div>

        {/* 사진 그리드 */}
        <div style={s.photoCol}>
          {!selFolder && (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36, opacity: 0.22 }}>🖼️</span>
              <p style={{ color: '#B09060', fontSize: 13 }}>폴더를 선택하세요</p>
            </div>
          )}

          {selFolder && (
            <>
              <div style={s.photoHead}>
                <span style={s.photoTitle}>{selFolder.name}</span>
                <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>
                  사진 추가
                </button>
              </div>

              {/* 드롭 존 */}
              <div
                style={{ ...s.dropZone, ...(dragOver ? s.dropActive : {}) }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false);
                  handleUpload(Array.from(e.dataTransfer.files));
                }}
                onClick={() => fileRef.current?.click()}
              >
                <p style={{ fontSize: 12, color: '#B09060', margin: 0 }}>
                  클릭하거나 사진을 끌어다 놓으세요
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  handleUpload(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />

              {loading && <p style={s.hint}>불러오는 중...</p>}
              {!loading && photos.length === 0 && <p style={s.hint}>사진을 추가해보세요.</p>}

              {!loading && photos.length > 0 && (
                <div style={s.grid}>
                  {photos.map(photo => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      editMemo={editMemo}
                      onView={() => setLightbox(photo)}
                      onRepresentative={() => handleRepresentative(photo.id)}
                      onThemeTag={tag => handleThemeTag(photo.id, tag)}
                      onMemoEdit={() => setEditMemo({ photoId: photo.id, text: photo.memo || '' })}
                      onMemoChange={text => setEditMemo(m => ({ ...m, text }))}
                      onMemoSave={() => handleMemoSave(photo.id, editMemo?.text ?? '')}
                      onMemoCancel={() => setEditMemo(null)}
                      onDelete={() => handleDeletePhoto(photo.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WelcomeModal ──────────────────────────────────────────────────────────────
function WelcomeModal({ onClose }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <p style={s.modalTitle}>사진자료실에 오신 것을 환영합니다</p>
        <p style={s.modalBody}>
          가장 소중한 순간들을 골라 담아주세요.<br />
          폴더를 직접 만들어 본인만의 방식으로 정리할 수 있습니다.<br /><br />
          방문자들이 집중해서 볼 수 있도록 각 폴더는 핵심적인 사진들로
          채워두시면 더욱 의미 있는 유산이 됩니다.
        </p>
        <button style={s.confirmBtn} onClick={onClose}>확인</button>
      </div>
    </div>
  );
}

// ── TemplateModal ─────────────────────────────────────────────────────────────
function TemplateModal({ onSelect, onSkip }) {
  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <p style={s.modalTitle}>폴더 구성을 선택하세요</p>
        <p style={{ ...s.modalBody, marginBottom: 20 }}>
          템플릿으로 시작하거나 직접 만들 수 있습니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TemplateOption
            label="인생 단계별"
            desc={STAGE_TEMPLATE.join(' · ')}
            onClick={() => onSelect(STAGE_TEMPLATE)}
          />
          <TemplateOption
            label="연도별"
            desc={DECADE_TEMPLATE.join(' · ')}
            onClick={() => onSelect(DECADE_TEMPLATE)}
          />
          <button style={s.skipBtn} onClick={onSkip}>
            직접 만들기 (빈 폴더에서 시작)
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateOption({ label, desc, onClick }) {
  return (
    <button style={s.tmplBtn} onClick={onClick}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>{desc}</span>
    </button>
  );
}

// ── PhotoCard ─────────────────────────────────────────────────────────────────
function PhotoCard({ photo, editMemo, onView, onRepresentative, onThemeTag, onMemoEdit, onMemoChange, onMemoSave, onMemoCancel, onDelete }) {
  const isEditing = editMemo?.photoId === photo.id;

  return (
    <div style={s.card}>
      {/* 이미지 */}
      <div style={s.imgWrap} onClick={onView}>
        <img src={photo.url} alt={photo.original_name} style={s.img} />
        {photo.is_representative && <span style={s.repBadge}>대표</span>}
      </div>

      {/* 메모 영역 */}
      {isEditing ? (
        <div style={s.memoEdit}>
          <textarea
            autoFocus
            style={s.memoTextarea}
            value={editMemo.text}
            onChange={e => onMemoChange(e.target.value)}
            placeholder="한 줄 설명을 남겨보세요"
            rows={2}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={s.memoSaveBtn} onClick={onMemoSave}>저장</button>
            <button style={s.memoCancelBtn} onClick={onMemoCancel}>취소</button>
          </div>
        </div>
      ) : (
        <div
          style={{ ...s.memoText, color: photo.memo ? '#5a4a35' : '#C4A882' }}
          onClick={onMemoEdit}
          title="클릭해서 메모 작성"
        >
          {photo.memo || '이 사진에 한 줄 설명을 남겨보세요'}
        </div>
      )}

      {/* 태그 선택 */}
      <select
        style={s.tagSelect}
        value={photo.theme_tag || ''}
        onChange={e => onThemeTag(e.target.value)}
      >
        {THEME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* 액션 버튼 */}
      <div style={s.cardActions}>
        <button
          style={{ ...s.actionBtn, ...(photo.is_representative ? s.actionOn : {}) }}
          onClick={onRepresentative}
          title="대표 사진으로 설정"
        >
          ★
        </button>
        <button style={s.actionBtn} onClick={onDelete} title="삭제">🗑</button>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div style={s.lbOverlay} onClick={onClose}>
      <div style={s.lbBox} onClick={e => e.stopPropagation()}>
        <button style={s.lbClose} onClick={onClose}>✕</button>
        <img src={photo.url} alt={photo.original_name} style={s.lbImg} />
        {photo.memo && <p style={s.lbCaption}>{photo.memo}</p>}
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:       { display: 'flex', flexDirection: 'column' },
  layout:     { display: 'flex', gap: 16, alignItems: 'flex-start' },

  // 폴더 패널
  folderCol:  { width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  folderHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  folderTitle:{ fontSize: 12, fontWeight: 600, color: '#5a4a35' },
  iconBtn:    { width: 22, height: 22, border: '1px solid #C4A882', borderRadius: 4, background: '#FAFAF5', cursor: 'pointer', fontSize: 14, lineHeight: '20px', textAlign: 'center', padding: 0, color: '#8B7355' },
  newRow:     { display: 'flex', gap: 4 },
  newInput:   { flex: 1, border: '1px solid #C4A882', borderRadius: 4, padding: '4px 6px', fontSize: 11, outline: 'none', background: '#FDFBF7', minWidth: 0 },
  okBtn:      { padding: '4px 8px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' },
  emptyHint:  { fontSize: 11, color: '#B09060', textAlign: 'center', lineHeight: 1.6, padding: '10px 0' },
  folderItem: { display: 'flex', alignItems: 'center', borderRadius: 4, padding: '5px 6px', cursor: 'grab', border: '1px solid transparent', userSelect: 'none' },
  folderOn:   { background: '#F0E8D8', border: '1px solid #C4A882' },
  folderName: { flex: 1, fontSize: 12, color: '#5a4a35', wordBreak: 'break-all', lineHeight: 1.4, cursor: 'pointer' },
  folderCnt:  { marginLeft: 4, fontSize: 10, color: '#B09060', background: '#F5F0E8', borderRadius: 8, padding: '0 5px' },
  renameInput:{ flex: 1, border: '1px solid #C4A882', borderRadius: 3, padding: '2px 4px', fontSize: 12, outline: 'none' },
  delBtn:     { width: 16, height: 16, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, lineHeight: '16px', color: '#C4A882', padding: 0, flexShrink: 0, opacity: 0.7 },

  // 사진 영역
  photoCol:   { flex: 1, minWidth: 0 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 },
  photoHead:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  photoTitle: { fontSize: 14, fontWeight: 600, color: '#5a4a35' },
  uploadBtn:  { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  dropZone:   { border: '2px dashed #C4A882', borderRadius: 6, padding: '14px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FDFBF7', transition: 'background 0.15s' },
  dropActive: { background: '#FDF0E0', borderColor: '#8B7355' },
  hint:       { fontSize: 13, color: '#B09060', textAlign: 'center', padding: '20px 0' },
  grid:       { display: 'flex', flexWrap: 'wrap', gap: 10 },

  // PhotoCard
  card:       { width: 110, display: 'flex', flexDirection: 'column', gap: 4 },
  imgWrap:    { position: 'relative', cursor: 'zoom-in' },
  img:        { width: 110, height: 110, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD0', display: 'block' },
  repBadge:   { position: 'absolute', top: 4, left: 4, background: '#8B7355', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700 },
  memoText:   { fontSize: 10, lineHeight: 1.4, cursor: 'pointer', minHeight: 28, wordBreak: 'break-all' },
  memoEdit:   { display: 'flex', flexDirection: 'column', gap: 4 },
  memoTextarea:{ width: '100%', border: '1px solid #C4A882', borderRadius: 3, padding: '3px 5px', fontSize: 10, resize: 'none', outline: 'none', boxSizing: 'border-box' },
  memoSaveBtn:{ padding: '2px 8px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer' },
  memoCancelBtn:{ padding: '2px 8px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 3, fontSize: 10, cursor: 'pointer' },
  tagSelect:  { width: '100%', border: '1px solid #E8DFD0', borderRadius: 3, padding: '2px 4px', fontSize: 10, color: '#5a4a35', background: '#FDFBF7', outline: 'none' },
  cardActions:{ display: 'flex', justifyContent: 'space-between' },
  actionBtn:  { border: '1px solid #E8DFD0', background: '#FDFBF7', borderRadius: 3, cursor: 'pointer', fontSize: 12, padding: '2px 6px', color: '#B09060' },
  actionOn:   { background: '#F0E8D8', color: '#8B7355', borderColor: '#C4A882' },

  // 모달 공통
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  modal:      { background: '#FDFBF7', borderRadius: 10, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#5a4a35', margin: '0 0 12px', textAlign: 'center' },
  modalBody:  { fontSize: 13, color: '#8B7355', lineHeight: 1.7, margin: '0 0 20px', textAlign: 'center' },
  confirmBtn: { width: '100%', padding: '10px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  skipBtn:    { padding: '10px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  tmplBtn:    { display: 'flex', flexDirection: 'column', padding: '10px 14px', background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 6, cursor: 'pointer', textAlign: 'left', color: '#5a4a35' },

  // 라이트박스
  lbOverlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 },
  lbBox:      { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  lbClose:    { position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 22, cursor: 'pointer' },
  lbImg:      { maxWidth: '90vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 4 },
  lbCaption:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '10px 0 0', textAlign: 'center' },
};
