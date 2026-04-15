/**
 * ArtworkSection.jsx — §8-E 작품실
 *
 * 지원: jpg/png/heic (이미지), pdf (문서), mp4 (영상 v1: 다운로드 전용)
 * 폴더 생성/삭제/이름변경/드래그순서 + 작품 업로드/제목/연도/설명/대표/공개
 * ArchivePanel.jsx 에서 activeMenu === 'artwork' 일 때 렌더링
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchArtworkFolders,
  createArtworkFolder,
  renameArtworkFolder,
  deleteArtworkFolder,
  reorderArtworkFolders,
  fetchFolderArtworks,
  uploadArtwork,
  updateArtwork,
  deleteArtwork,
} from './archiveApi';

const GENRE_TEMPLATE = ['그림·사진', '글·시', '공예·조각', '음악·악보', '기타'];

// ══════════════════════════════════════════════════════════════════════════════
export default function ArtworkSection({ siteId, personId }) {
  const [folders,     setFolders]     = useState([]);
  const [selFolder,   setSelFolder]   = useState(null);
  const [artworks,    setArtworks]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTmpl,    setShowTmpl]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showNewRow,  setShowNewRow]  = useState(false);
  const [renamingId,  setRenamingId]  = useState(null);
  const [renameVal,   setRenameVal]   = useState('');
  const [pendingItems, setPendingItems] = useState([]); // [{ uid, file, previewUrl, title, yearCreated, description, isPublic, uploading }]
  const [lightbox,    setLightbox]    = useState(null);
  const [editItem,    setEditItem]    = useState(null); // { artId, title, yearCreated, description }
  const fileRef    = useRef(null);
  const dragIdx    = useRef(null);
  const exceeded20 = useRef(new Set());

  // ── 초기화 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    loadFolders();
    if (!localStorage.getItem(`artworkWelcomed_${siteId}`)) setShowWelcome(true);
  }, [siteId]);

  useEffect(() => {
    if (!selFolder) { setArtworks([]); return; }
    loadArtworks(selFolder.id);
  }, [selFolder?.id]);

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    try { setFolders(await fetchArtworkFolders(siteId)); }
    catch { setFolders([]); }
  }, [siteId]);

  const loadArtworks = useCallback(async (folderId) => {
    setLoading(true);
    try { setArtworks(await fetchFolderArtworks(siteId, folderId)); }
    catch { setArtworks([]); }
    setLoading(false);
  }, [siteId]);

  // ── 폴더 CRUD ─────────────────────────────────────────────────────────────
  async function handleCreate(name) {
    if (!name.trim()) { toast.error('폴더 이름을 입력해주세요'); return; }
    try {
      await createArtworkFolder(siteId, name.trim(), folders.length, personId);
      setNewName(''); setShowNewRow(false);
      await loadFolders();
    } catch { toast.error('폴더 생성 실패'); }
  }

  async function handleRenameConfirm(folderId) {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      await renameArtworkFolder(siteId, folderId, renameVal.trim());
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: renameVal.trim() } : f));
      if (selFolder?.id === folderId) setSelFolder(f => ({ ...f, name: renameVal.trim() }));
    } catch { toast.error('이름 변경 실패'); }
    setRenamingId(null);
  }

  async function handleDeleteFolder(folder) {
    if (!window.confirm(`"${folder.name}" 폴더와 이 폴더의 작품도 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
    try {
      await deleteArtworkFolder(siteId, folder.id);
      if (selFolder?.id === folder.id) setSelFolder(null);
      await loadFolders();
    } catch { toast.error('삭제 실패'); }
  }

  // ── 폴더 드래그 순서 ──────────────────────────────────────────────────────
  async function handleFolderDrop(dropIdx) {
    const from = dragIdx.current;
    if (from === null || from === dropIdx) return;
    const reordered = [...folders];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIdx, 0, moved);
    const orders = reordered.map((f, i) => ({ id: f.id, sort_order: i }));
    setFolders(reordered.map((f, i) => ({ ...f, sort_order: i })));
    try { await reorderArtworkFolders(siteId, orders); }
    catch { loadFolders(); }
  }

  // ── 템플릿 생성 ───────────────────────────────────────────────────────────
  async function handleTemplate(names) {
    for (let i = 0; i < names.length; i++) {
      await createArtworkFolder(siteId, names[i], i, personId);
    }
    localStorage.setItem(`artworkTemplated_${siteId}`, '1');
    setShowTmpl(false);
    await loadFolders();
  }

  // ── 파일 선택 → 대기열 추가 ───────────────────────────────────────────────
  function handleFilesSelected(files) {
    if (!selFolder) { toast.error('먼저 폴더를 선택하세요'); return; }
    const ALLOWED = ['.jpg', '.jpeg', '.png', '.heic', '.pdf', '.mp4'];
    const arr = Array.from(files).filter(f => {
      const ext = f.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
      return ALLOWED.includes(ext) || f.type.startsWith('image/') || f.type === 'application/pdf' || f.type === 'video/mp4';
    });
    if (!arr.length) { toast.error('지원 형식: jpg/png/heic/pdf/mp4'); return; }

    const newItems = arr.map(file => ({
      uid:         Math.random().toString(36).slice(2),
      file,
      previewUrl:  file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      title:       file.name.replace(/\.[^.]+$/, ''),
      yearCreated: '',
      description: '',
      isPublic:    false,
      uploading:   false,
    }));
    setPendingItems(prev => [...prev, ...newItems]);
  }

  function removePendingItem(uid) {
    setPendingItems(prev => {
      const item = prev.find(p => p.uid === uid);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.uid !== uid);
    });
  }

  function updatePendingField(uid, field, value) {
    setPendingItems(prev => prev.map(p => p.uid === uid ? { ...p, [field]: value } : p));
  }

  async function handlePendingUpload(item) {
    if (!item.title.trim()) { toast.error('제목을 입력해주세요'); return; }
    setPendingItems(prev => prev.map(p => p.uid === item.uid ? { ...p, uploading: true } : p));
    try {
      await uploadArtwork(siteId, selFolder.id, item.file, {
        title:        item.title.trim(),
        year_created: item.yearCreated || undefined,
        description:  item.description || undefined,
        is_public:    item.isPublic,
        person_id:    personId,
      });
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      setPendingItems(prev => prev.filter(p => p.uid !== item.uid));
      const updated = await fetchFolderArtworks(siteId, selFolder.id);
      setArtworks(updated);
      await loadFolders();
      toast.success('업로드됐습니다.');
      // 20건 초과 토스트 (폴더당 1회)
      if (updated.length > 20 && !exceeded20.current.has(selFolder.id)) {
        exceeded20.current.add(selFolder.id);
        toast('작품이 많아지면 방문자가 핵심을 찾기 어렵습니다.\n대표작 위주로 정리해주세요.', { duration: 5000 });
      }
    } catch (err) {
      setPendingItems(prev => prev.map(p => p.uid === item.uid ? { ...p, uploading: false } : p));
      toast.error(err.message || '업로드 실패');
    }
  }

  // ── 작품 편집 ─────────────────────────────────────────────────────────────
  async function handleRepresentative(artId) {
    try {
      await updateArtwork(siteId, selFolder.id, artId, { is_representative: true });
      setArtworks(prev => prev.map(a => ({ ...a, is_representative: a.id === artId })));
    } catch { toast.error('대표 설정 실패'); }
  }

  async function handlePublicToggle(artId, isPublic) {
    try {
      await updateArtwork(siteId, selFolder.id, artId, { is_public: !isPublic });
      setArtworks(prev => prev.map(a => a.id === artId ? { ...a, is_public: !isPublic } : a));
    } catch { toast.error('공개 설정 실패'); }
  }

  async function handleEditSave(artId) {
    if (!editItem || editItem.artId !== artId) return;
    try {
      await updateArtwork(siteId, selFolder.id, artId, {
        title:        editItem.title,
        year_created: editItem.yearCreated || null,
        description:  editItem.description || null,
      });
      setArtworks(prev => prev.map(a => a.id === artId ? {
        ...a,
        title:        editItem.title,
        year_created: editItem.yearCreated || null,
        description:  editItem.description || null,
      } : a));
      setEditItem(null);
    } catch { toast.error('저장 실패'); }
  }

  async function handleDelete(artId) {
    if (!window.confirm('이 작품을 삭제하시겠습니까?')) return;
    try {
      await deleteArtwork(siteId, selFolder.id, artId);
      setArtworks(prev => prev.filter(a => a.id !== artId));
      await loadFolders();
    } catch { toast.error('삭제 실패'); }
  }

  // ── 모달 dismiss ─────────────────────────────────────────────────────────
  function dismissWelcome() {
    localStorage.setItem(`artworkWelcomed_${siteId}`, '1');
    setShowWelcome(false);
    if (!localStorage.getItem(`artworkTemplated_${siteId}`)) setShowTmpl(true);
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={s.wrap}>
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      {showTmpl && (
        <TemplateModal
          onSelect={handleTemplate}
          onSkip={() => { localStorage.setItem(`artworkTemplated_${siteId}`, '1'); setShowTmpl(false); }}
        />
      )}
      {lightbox && <Lightbox artwork={lightbox} onClose={() => setLightbox(null)} />}

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
                  if (e.key === 'Enter')  handleCreate(newName);
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
              onDrop={() => handleFolderDrop(idx)}
              style={{ ...s.folderItem, ...(selFolder?.id === f.id ? s.folderOn : {}) }}
            >
              {renamingId === f.id ? (
                <input
                  autoFocus
                  style={s.renameInput}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => handleRenameConfirm(f.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  handleRenameConfirm(f.id);
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
                  🎨 {f.name}
                  <span style={s.folderCnt}>{f.artwork_count ?? 0}</span>
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

        {/* 작품 영역 */}
        <div style={s.artCol}>
          {!selFolder ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36, opacity: 0.22 }}>🎨</span>
              <p style={{ color: '#B09060', fontSize: 13 }}>폴더를 선택하세요</p>
            </div>
          ) : (
            <>
              <div style={s.artHead}>
                <span style={s.artTitle}>{selFolder.name}</span>
                <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>
                  작품 추가
                </button>
              </div>

              {/* 드롭존 */}
              <div
                style={s.dropZone}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFilesSelected(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}
              >
                <p style={{ fontSize: 12, color: '#B09060', margin: 0 }}>
                  클릭하거나 파일을 끌어다 놓으세요 (jpg/png/heic/pdf/mp4)
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,.pdf,video/mp4,.mp4"
                multiple
                style={{ display: 'none' }}
                onChange={e => { handleFilesSelected(e.target.files); e.target.value = ''; }}
              />

              {/* 대기열 */}
              {pendingItems.length > 0 && (
                <div style={s.pendingSection}>
                  <p style={s.pendingLabel}>업로드 대기 {pendingItems.length}개</p>
                  {pendingItems.map(item => (
                    <PendingItem
                      key={item.uid}
                      item={item}
                      onFieldChange={(f, v) => updatePendingField(item.uid, f, v)}
                      onUpload={() => handlePendingUpload(item)}
                      onRemove={() => removePendingItem(item.uid)}
                    />
                  ))}
                </div>
              )}

              {loading && <p style={s.hint}>불러오는 중...</p>}
              {!loading && artworks.length === 0 && <p style={s.hint}>작품을 추가해보세요.</p>}

              {!loading && artworks.length > 0 && (
                <div style={s.grid}>
                  {artworks.map(art => (
                    <ArtworkCard
                      key={art.id}
                      artwork={art}
                      isEditing={editItem?.artId === art.id}
                      editData={editItem}
                      onEditStart={() => setEditItem({ artId: art.id, title: art.title, yearCreated: art.year_created ?? '', description: art.description ?? '' })}
                      onEditChange={(f, v) => setEditItem(prev => ({ ...prev, [f]: v }))}
                      onEditSave={() => handleEditSave(art.id)}
                      onEditCancel={() => setEditItem(null)}
                      onRepresentative={() => handleRepresentative(art.id)}
                      onPublicToggle={() => handlePublicToggle(art.id, art.is_public)}
                      onDelete={() => handleDelete(art.id)}
                      onView={() => setLightbox(art)}
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

// ── PendingItem ───────────────────────────────────────────────────────────────
function PendingItem({ item, onFieldChange, onUpload, onRemove }) {
  const fileExt = item.file.name.toLowerCase().match(/\.([^.]+)$/)?.[1] || '';
  const isPdf   = fileExt === 'pdf';
  const isMp4   = fileExt === 'mp4';

  return (
    <div style={s.pendingCard}>
      {/* 미리보기 */}
      <div style={s.pendingPreview}>
        {item.previewUrl
          ? <img src={item.previewUrl} alt={item.file.name} style={s.pendingImg} />
          : <div style={s.pendingIcon}>{isPdf ? '📄' : isMp4 ? '🎬' : '📁'}</div>
        }
      </div>
      {/* 메타 입력 */}
      <div style={s.pendingMeta}>
        <input
          style={{ ...s.metaInput, borderColor: !item.title ? '#e07070' : '#C4A882' }}
          placeholder="작품 제목 (필수)"
          value={item.title}
          onChange={e => onFieldChange('title', e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ ...s.metaInput, width: 80 }}
            placeholder="제작연도"
            maxLength={4}
            value={item.yearCreated}
            onChange={e => onFieldChange('yearCreated', e.target.value.replace(/\D/g, ''))}
          />
          <label style={s.publicLabel}>
            <input type="checkbox" checked={item.isPublic} onChange={e => onFieldChange('isPublic', e.target.checked)} />
            공개
          </label>
        </div>
        <textarea
          style={s.descInput}
          placeholder="작품 설명 (선택)"
          rows={2}
          value={item.description}
          onChange={e => onFieldChange('description', e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            style={{ ...s.uploadSmBtn, opacity: item.uploading ? 0.6 : 1 }}
            disabled={item.uploading}
            onClick={onUpload}
          >
            {item.uploading ? '업로드 중...' : '업로드'}
          </button>
          <button style={s.removeBtn} onClick={onRemove}>제거</button>
        </div>
      </div>
    </div>
  );
}

// ── ArtworkCard ───────────────────────────────────────────────────────────────
function ArtworkCard({ artwork, isEditing, editData, onEditStart, onEditChange, onEditSave, onEditCancel, onRepresentative, onPublicToggle, onDelete, onView }) {
  const { file_type, file_url, title, year_created, description, is_representative, is_public } = artwork;
  const isImage = ['jpg', 'jpeg', 'png', 'heic'].includes(file_type);
  const isPdf   = file_type === 'pdf';
  const isMp4   = file_type === 'mp4';

  return (
    <div style={s.card}>
      {/* 미리보기 영역 */}
      <div style={s.cardThumb}>
        {isImage ? (
          <img src={file_url} alt={title} style={s.cardImg} onClick={onView} title="클릭: 크게 보기" />
        ) : isPdf ? (
          <a href={file_url} download target="_blank" rel="noreferrer" style={s.cardIconWrap} title="PDF 다운로드">
            <span style={s.cardIcon}>📄</span>
          </a>
        ) : isMp4 ? (
          <div style={s.cardIconWrap}>
            <span style={s.cardIcon}>🎬</span>
          </div>
        ) : (
          <div style={s.cardIconWrap}><span style={s.cardIcon}>📁</span></div>
        )}
        {is_representative && <span style={s.repBadge}>대표</span>}
        {!is_public && <span style={s.privateBadge}>비공개</span>}
      </div>

      {/* mp4: 다운로드 버튼 */}
      {isMp4 && (
        <a href={file_url} download style={s.downloadBtn}>↓ 다운로드</a>
      )}

      {/* 작품 정보 (편집 or 표시) */}
      {isEditing ? (
        <div style={s.editForm}>
          <input
            autoFocus
            style={s.metaInput}
            placeholder="작품 제목"
            value={editData.title}
            onChange={e => onEditChange('title', e.target.value)}
          />
          <input
            style={{ ...s.metaInput, width: 80 }}
            placeholder="제작연도"
            maxLength={4}
            value={editData.yearCreated}
            onChange={e => onEditChange('yearCreated', e.target.value.replace(/\D/g, ''))}
          />
          <textarea
            style={s.descInput}
            placeholder="작품 설명"
            rows={2}
            value={editData.description}
            onChange={e => onEditChange('description', e.target.value)}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={s.uploadSmBtn} onClick={onEditSave}>저장</button>
            <button style={s.removeBtn} onClick={onEditCancel}>취소</button>
          </div>
        </div>
      ) : (
        <div style={s.cardInfo}>
          <p style={s.cardTitle}>{title}</p>
          {year_created && <p style={s.cardYear}>{year_created}년</p>}
          {description  && <p style={s.cardDesc}>{description}</p>}
        </div>
      )}

      {/* 액션 버튼 */}
      {!isEditing && (
        <div style={s.cardActions}>
          <button
            style={{ ...s.actionBtn, ...(is_representative ? s.actionOn : {}) }}
            onClick={onRepresentative}
            title="대표 작품으로 설정"
          >★</button>
          <button
            style={{ ...s.actionBtn, ...(is_public ? s.actionOn : {}) }}
            onClick={onPublicToggle}
            title={is_public ? '비공개로 전환' : '공개로 전환'}
          >{is_public ? '🔓' : '🔒'}</button>
          <button style={s.actionBtn} onClick={onEditStart} title="수정">✎</button>
          <button style={s.actionBtn} onClick={onDelete} title="삭제">🗑</button>
        </div>
      )}
    </div>
  );
}

// ── WelcomeModal ──────────────────────────────────────────────────────────────
function WelcomeModal({ onClose }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <p style={s.modalTitle}>작품전시관에 오신 것을 환영합니다</p>
        <p style={s.modalBody}>
          당신이 만든 것들을 남겨주세요.<br />
          그림, 글, 공예, 음악 등<br />
          어떤 형태의 작품이든 괜찮습니다.<br /><br />
          후세에게 당신의 재능과 열정을<br />
          전할 수 있습니다.
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
      <div style={{ ...s.modal, maxWidth: 380 }}>
        <p style={s.modalTitle}>폴더 구성을 선택하세요</p>
        <p style={{ ...s.modalBody, marginBottom: 20 }}>
          장르별로 시작하거나 직접 만들 수 있습니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={s.tmplBtn} onClick={() => onSelect(GENRE_TEMPLATE)}>
            <span style={{ fontWeight: 600 }}>장르별</span>
            <span style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>{GENRE_TEMPLATE.join(' · ')}</span>
          </button>
          <button style={s.skipBtn} onClick={onSkip}>
            직접 만들기 (빈 폴더에서 시작)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ artwork, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div style={s.lbOverlay} onClick={onClose}>
      <div style={s.lbBox} onClick={e => e.stopPropagation()}>
        <button style={s.lbClose} onClick={onClose}>✕</button>
        <img src={artwork.file_url} alt={artwork.title} style={s.lbImg} />
        <p style={s.lbCaption}>
          {artwork.title}
          {artwork.year_created ? ` (${artwork.year_created})` : ''}
          {artwork.description  ? ` — ${artwork.description}` : ''}
        </p>
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

  // 작품 영역
  artCol:     { flex: 1, minWidth: 0 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 },
  artHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  artTitle:   { fontSize: 14, fontWeight: 600, color: '#5a4a35' },
  uploadBtn:  { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  dropZone:   { border: '2px dashed #C4A882', borderRadius: 6, padding: '12px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FDFBF7' },
  hint:       { fontSize: 13, color: '#B09060', textAlign: 'center', padding: '20px 0' },

  // 대기열
  pendingSection: { background: '#FDF8F0', border: '1px solid #E8DFD0', borderRadius: 6, padding: 10, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  pendingLabel:   { fontSize: 12, fontWeight: 600, color: '#8B7355', margin: 0 },
  pendingCard:    { display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FDFBF7', border: '1px solid #E8DFD0', borderRadius: 4, padding: 8 },
  pendingPreview: { width: 64, height: 64, flexShrink: 0 },
  pendingImg:     { width: 64, height: 64, objectFit: 'cover', borderRadius: 3, display: 'block' },
  pendingIcon:    { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', borderRadius: 3, fontSize: 24 },
  pendingMeta:    { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 },

  // 입력 공통
  metaInput:  { border: '1px solid #C4A882', borderRadius: 4, padding: '4px 7px', fontSize: 12, outline: 'none', background: '#FDFBF7', boxSizing: 'border-box', width: '100%' },
  descInput:  { border: '1px solid #C4A882', borderRadius: 4, padding: '4px 7px', fontSize: 11, outline: 'none', background: '#FDFBF7', resize: 'none', width: '100%', boxSizing: 'border-box' },
  publicLabel:{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5a4a35', cursor: 'pointer', whiteSpace: 'nowrap' },
  uploadSmBtn:{ padding: '4px 12px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 },
  removeBtn:  { padding: '4px 10px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 4, fontSize: 11, cursor: 'pointer' },

  // 작품 그리드
  grid:       { display: 'flex', flexWrap: 'wrap', gap: 12 },
  card:       { width: 120, display: 'flex', flexDirection: 'column', gap: 5 },
  cardThumb:  { position: 'relative' },
  cardImg:    { width: 120, height: 120, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD0', display: 'block', cursor: 'zoom-in' },
  cardIconWrap:{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', borderRadius: 4, border: '1px solid #E8DFD0' },
  cardIcon:   { fontSize: 36 },
  repBadge:   { position: 'absolute', top: 4, left: 4, background: '#8B7355', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8, fontWeight: 700 },
  privateBadge:{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8 },
  downloadBtn:{ display: 'block', textAlign: 'center', fontSize: 11, color: '#8B7355', textDecoration: 'none', background: '#F5F0E8', border: '1px solid #C4A882', borderRadius: 3, padding: '3px 0' },
  cardInfo:   { display: 'flex', flexDirection: 'column', gap: 2 },
  cardTitle:  { fontSize: 11, fontWeight: 600, color: '#3a2a1a', margin: 0, wordBreak: 'break-all', lineHeight: 1.4 },
  cardYear:   { fontSize: 10, color: '#B09060', margin: 0 },
  cardDesc:   { fontSize: 10, color: '#5a4a35', margin: 0, lineHeight: 1.4, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  editForm:   { display: 'flex', flexDirection: 'column', gap: 4 },
  cardActions:{ display: 'flex', gap: 3 },
  actionBtn:  { flex: 1, border: '1px solid #E8DFD0', background: '#FDFBF7', borderRadius: 3, cursor: 'pointer', fontSize: 11, padding: '3px 0', color: '#B09060', textAlign: 'center' },
  actionOn:   { background: '#F0E8D8', color: '#8B7355', borderColor: '#C4A882' },

  // 모달 공통
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  modal:      { background: '#FDFBF7', borderRadius: 10, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#5a4a35', margin: '0 0 12px', textAlign: 'center' },
  modalBody:  { fontSize: 13, color: '#8B7355', lineHeight: 1.8, margin: '0 0 20px', textAlign: 'center' },
  confirmBtn: { width: '100%', padding: '10px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  skipBtn:    { padding: '10px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  tmplBtn:    { display: 'flex', flexDirection: 'column', padding: '10px 14px', background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 6, cursor: 'pointer', textAlign: 'left', color: '#5a4a35' },

  // 라이트박스
  lbOverlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 },
  lbBox:      { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  lbClose:    { position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 22, cursor: 'pointer' },
  lbImg:      { maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 4 },
  lbCaption:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '10px 0 0', textAlign: 'center', maxWidth: '80vw' },
};
