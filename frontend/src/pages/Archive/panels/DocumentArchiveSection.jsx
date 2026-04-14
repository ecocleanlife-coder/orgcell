/**
 * DocumentArchiveSection.jsx — §8-B 주요자료실
 *
 * 폴더 생성/삭제/이름변경/드래그순서 + 자료 업로드/메모/대표 설정
 * ArchivePanel.jsx 에서 activeMenu === 'main' 일 때 렌더링
 *
 * 파일형식: jpg/png/heic/pdf/doc/docx/hwp/hwpx
 * HWP: 다운로드 전용 (썸네일 없음)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchDocFolders,
  createDocFolder,
  renameDocFolder,
  deleteDocFolder,
  reorderDocFolders,
  getDocUsage,
  fetchFolderDocuments,
  uploadFolderDocument,
  updateFolderDocument,
  deleteFolderDocument,
} from './archiveApi';

// ─── 템플릿 정의 ──────────────────────────────────────────────────────────────
const TEMPLATES = {
  official:  { label: '공식문서',  names: ['졸업·학위증', '수상·표창', '자격·면허', '임명·발령'] },
  family:    { label: '가족관계',  names: ['결혼·혼인', '출생·호적', '유언·상속'] },
  legal:     { label: '법적문서',  names: ['부동산·계약', '소송·판결', '기타법문서'] },
  press:     { label: '언론·기록', names: ['신문기사', '인터뷰·방송', '출판·저서'] },
  personal:  { label: '개인기록',  names: ['편지·서신', '일기·수필', '메모·스케치'] },
};

// ─── 파일 타입 유틸 ───────────────────────────────────────────────────────────
const IMG_TYPES  = new Set(['jpg', 'jpeg', 'png', 'heic']);
const HWP_TYPES  = new Set(['hwp', 'hwpx']);

function getFileType(doc) {
  return (doc.file_type || '').toLowerCase();
}

function isImage(doc) { return IMG_TYPES.has(getFileType(doc)); }
function isHwp(doc)   { return HWP_TYPES.has(getFileType(doc)); }

function FileIcon({ type }) {
  if (HWP_TYPES.has(type)) return <span style={fi.hwp}>HWP</span>;
  if (type === 'pdf')       return <span style={fi.pdf}>PDF</span>;
  if (type === 'doc' || type === 'docx') return <span style={fi.doc}>DOC</span>;
  return <span style={fi.img}>IMG</span>;
}

const fi = {
  hwp: { display:'inline-block', padding:'2px 6px', background:'#1a6bbf', color:'#fff', borderRadius:3, fontSize:10, fontWeight:700 },
  pdf: { display:'inline-block', padding:'2px 6px', background:'#e53e3e', color:'#fff', borderRadius:3, fontSize:10, fontWeight:700 },
  doc: { display:'inline-block', padding:'2px 6px', background:'#2b6cb0', color:'#fff', borderRadius:3, fontSize:10, fontWeight:700 },
  img: { display:'inline-block', padding:'2px 6px', background:'#38a169', color:'#fff', borderRadius:3, fontSize:10, fontWeight:700 },
};

// ══════════════════════════════════════════════════════════════════════════════
export default function DocumentArchiveSection({ siteId }) {
  const [folders,     setFolders]     = useState([]);
  const [selFolder,   setSelFolder]   = useState(null);
  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTmpl,    setShowTmpl]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [showNewRow,  setShowNewRow]  = useState(false);
  const [renamingId,  setRenamingId]  = useState(null);
  const [renameVal,   setRenameVal]   = useState('');
  const [editMemo,    setEditMemo]    = useState(null); // { docId, text }
  const [dragOver,    setDragOver]    = useState(false);
  const fileRef    = useRef(null);
  const exceeded20 = useRef(new Set());
  const dragIdx    = useRef(null);

  // ── 초기화 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    loadFolders();
    if (!localStorage.getItem(`docWelcomed_${siteId}`)) setShowWelcome(true);
  }, [siteId]);

  useEffect(() => {
    if (!selFolder) { setDocs([]); return; }
    loadDocs(selFolder.id);
  }, [selFolder?.id]);

  const loadFolders = useCallback(async () => {
    try { setFolders(await fetchDocFolders(siteId)); }
    catch { setFolders([]); }
  }, [siteId]);

  const loadDocs = useCallback(async (folderId) => {
    setLoading(true);
    try { setDocs(await fetchFolderDocuments(siteId, folderId)); }
    catch { setDocs([]); }
    setLoading(false);
  }, [siteId]);

  // ── 폴더 CRUD ─────────────────────────────────────────────────────────────
  async function handleCreate(name) {
    if (!name.trim()) { toast.error('폴더 이름을 입력해주세요'); return; }
    try {
      await createDocFolder(siteId, name.trim(), folders.length);
      setNewName(''); setShowNewRow(false);
      await loadFolders();
    } catch { toast.error('폴더 생성 실패'); }
  }

  async function handleRenameConfirm(folderId) {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    try {
      await renameDocFolder(siteId, folderId, renameVal.trim());
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: renameVal.trim() } : f));
      if (selFolder?.id === folderId) setSelFolder(f => ({ ...f, name: renameVal.trim() }));
    } catch { toast.error('이름 변경 실패'); }
    setRenamingId(null);
  }

  async function handleDeleteFolder(folder) {
    if (!window.confirm(`"${folder.name}" 폴더와 이 폴더의 자료도 함께 삭제됩니다.\n계속하시겠습니까?`)) return;
    try {
      await deleteDocFolder(siteId, folder.id);
      if (selFolder?.id === folder.id) setSelFolder(null);
      await loadFolders();
    } catch { toast.error('삭제 실패'); }
  }

  // ── 템플릿 생성 ───────────────────────────────────────────────────────────
  async function handleTemplate(names) {
    for (let i = 0; i < names.length; i++) {
      await createDocFolder(siteId, names[i], i);
    }
    localStorage.setItem(`docTemplated_${siteId}`, '1');
    setShowTmpl(false);
    await loadFolders();
  }

  // ── 업로드 ────────────────────────────────────────────────────────────────
  async function handleUpload(files) {
    if (!selFolder) { toast.error('먼저 폴더를 선택하세요'); return; }

    // 1GB 용량 검증
    try {
      const usage = await getDocUsage(siteId);
      const addSize = files.reduce((s, f) => s + f.size, 0);
      if (usage.used_bytes + addSize > usage.max_bytes) {
        toast('더 많은 자료를 등록하려면 본인의 클라우드를 연결하거나 유료 플랜을 이용해주세요.', { duration: 5000 });
        return;
      }
    } catch { /* 계속 */ }

    let uploaded = 0;
    for (const file of files) {
      try {
        await uploadFolderDocument(siteId, selFolder.id, file, null);
        uploaded++;
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`);
      }
    }

    if (uploaded > 0) {
      await loadDocs(selFolder.id);
      await loadFolders();
      toast.success(`${uploaded}건 업로드됐습니다.`);
      // 20건 초과 토스트 (폴더당 1회)
      const updated = await fetchFolderDocuments(siteId, selFolder.id);
      if (updated.length > 20 && !exceeded20.current.has(selFolder.id)) {
        exceeded20.current.add(selFolder.id);
        toast('한 폴더에 자료가 많아지면 방문자가 핵심을 찾기 어렵습니다.\n가장 중요한 것들 위주로 정리해주세요.', { duration: 5000 });
      }
      setDocs(updated);
    }
  }

  // ── 자료 편집 ─────────────────────────────────────────────────────────────
  async function handleRepresentative(docId) {
    try {
      await updateFolderDocument(siteId, selFolder.id, docId, { is_representative: true });
      setDocs(prev => prev.map(d => ({ ...d, is_representative: d.id === docId })));
    } catch { toast.error('대표 자료 설정 실패'); }
  }

  async function handleMemoSave(docId, memo) {
    try {
      await updateFolderDocument(siteId, selFolder.id, docId, { memo });
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, memo } : d));
      setEditMemo(null);
    } catch { toast.error('메모 저장 실패'); }
  }

  async function handleDeleteDoc(docId) {
    if (!window.confirm('이 자료를 삭제하시겠습니까?')) return;
    try {
      await deleteFolderDocument(siteId, selFolder.id, docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
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
    try { await reorderDocFolders(siteId, orders); }
    catch { loadFolders(); }
  }

  function dismissWelcome() {
    localStorage.setItem(`docWelcomed_${siteId}`, '1');
    setShowWelcome(false);
    if (!localStorage.getItem(`docTemplated_${siteId}`)) setShowTmpl(true);
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
      {showTmpl && (
        <TemplateModal
          onSelect={handleTemplate}
          onSkip={() => { localStorage.setItem(`docTemplated_${siteId}`, '1'); setShowTmpl(false); }}
        />
      )}

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
                  <span style={s.folderCnt}>{f.doc_count ?? 0}</span>
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

        {/* 자료 목록 */}
        <div style={s.docCol}>
          {!selFolder && (
            <div style={s.emptyState}>
              <span style={{ fontSize: 36, opacity: 0.22 }}>📂</span>
              <p style={{ color: '#B09060', fontSize: 13 }}>폴더를 선택하세요</p>
            </div>
          )}

          {selFolder && (
            <>
              <div style={s.docHead}>
                <span style={s.docTitle}>{selFolder.name}</span>
                <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>
                  자료 추가
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
                  클릭하거나 파일을 끌어다 놓으세요
                </p>
                <p style={{ fontSize: 11, color: '#C4A882', margin: '3px 0 0' }}>
                  JPG · PNG · PDF · DOC · HWP
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.heic,.pdf,.doc,.docx,.hwp,.hwpx"
                multiple
                style={{ display: 'none' }}
                onChange={e => {
                  handleUpload(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />

              {loading && <p style={s.hint}>불러오는 중...</p>}
              {!loading && docs.length === 0 && <p style={s.hint}>자료를 추가해보세요.</p>}

              {!loading && docs.length > 0 && (
                <div style={s.docList}>
                  {docs.map(doc => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      editMemo={editMemo}
                      onRepresentative={() => handleRepresentative(doc.id)}
                      onMemoEdit={() => setEditMemo({ docId: doc.id, text: doc.memo || '' })}
                      onMemoChange={text => setEditMemo(m => ({ ...m, text }))}
                      onMemoSave={() => handleMemoSave(doc.id, editMemo?.text ?? '')}
                      onMemoCancel={() => setEditMemo(null)}
                      onDelete={() => handleDeleteDoc(doc.id)}
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
        <p style={s.modalTitle}>주요자료실에 오신 것을 환영합니다</p>
        <p style={s.modalBody}>
          살아온 흔적을 기록으로 남겨주세요.<br />
          졸업장, 상장, 편지, 기사 등<br />
          어떤 형태의 자료든 괜찮습니다.<br /><br />
          후세가 당신의 삶을 이해하는 데<br />
          가장 중요한 단서가 됩니다.
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
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <p style={s.modalTitle}>폴더 구성을 선택하세요</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(TEMPLATES).map(t => (
            <button key={t.label} style={s.tmplBtn} onClick={() => onSelect(t.names)}>
              <span style={{ fontWeight: 600 }}>{t.label}</span>
              <span style={{ fontSize: 11, color: '#8B7355', marginTop: 2 }}>{t.names.join(' · ')}</span>
            </button>
          ))}
          <button style={s.skipBtn} onClick={onSkip}>
            직접 만들기 (빈 폴더에서 시작)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DocCard ───────────────────────────────────────────────────────────────────
function DocCard({ doc, editMemo, onRepresentative, onMemoEdit, onMemoChange, onMemoSave, onMemoCancel, onDelete }) {
  const isEditing = editMemo?.docId === doc.id;
  const type      = getFileType(doc);

  return (
    <div style={s.card}>
      {/* 미리보기 / 아이콘 영역 */}
      <div style={s.cardLeft}>
        {isImage(doc) ? (
          <img src={doc.file_url} alt={doc.title} style={s.thumb} />
        ) : (
          <div style={s.iconBox}>
            <FileIcon type={type} />
          </div>
        )}
        {doc.is_representative && <span style={s.repBadge}>대표</span>}
      </div>

      {/* 자료 정보 */}
      <div style={s.cardBody}>
        <div style={s.cardTitleRow}>
          <span style={s.cardTitle} title={doc.title}>{doc.title}</span>
          <span style={s.fileSize}>{formatSize(doc.file_size)}</span>
        </div>

        {/* HWP 다운로드 버튼 */}
        {isHwp(doc) && doc.file_url && (
          <a href={doc.file_url} download style={s.dlBtn}>⬇ 다운로드</a>
        )}

        {/* 메모 영역 */}
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <textarea
              autoFocus
              style={s.memoTextarea}
              value={editMemo.text}
              onChange={e => onMemoChange(e.target.value)}
              placeholder="이 자료에 대한 설명을 추가해주세요"
              rows={2}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={s.memoSaveBtn} onClick={onMemoSave}>저장</button>
              <button style={s.memoCancelBtn} onClick={onMemoCancel}>취소</button>
            </div>
          </div>
        ) : (
          <div
            style={{ ...s.memoText, color: doc.memo ? '#5a4a35' : '#C4A882' }}
            onClick={onMemoEdit}
            title="클릭해서 설명 작성"
          >
            {doc.memo || '이 자료에 대한 설명을 추가하면 더 의미 있는 기록이 됩니다'}
          </div>
        )}

        {/* 액션 */}
        <div style={s.cardActions}>
          <button
            style={{ ...s.actionBtn, ...(doc.is_representative ? s.actionOn : {}) }}
            onClick={onRepresentative}
            title="대표 자료로 설정"
          >★</button>
          {!isHwp(doc) && doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={s.viewLink}>보기</a>
          )}
          <button style={s.actionBtn} onClick={onDelete} title="삭제">🗑</button>
        </div>
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:       { display: 'flex', flexDirection: 'column' },
  layout:     { display: 'flex', gap: 16, alignItems: 'flex-start' },

  // 폴더 패널 (§8-A 동일 구조)
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

  // 자료 영역
  docCol:     { flex: 1, minWidth: 0 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8 },
  docHead:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  docTitle:   { fontSize: 14, fontWeight: 600, color: '#5a4a35' },
  uploadBtn:  { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  dropZone:   { border: '2px dashed #C4A882', borderRadius: 6, padding: '14px', textAlign: 'center', cursor: 'pointer', marginBottom: 12, background: '#FDFBF7', transition: 'background 0.15s' },
  dropActive: { background: '#FDF0E0', borderColor: '#8B7355' },
  hint:       { fontSize: 13, color: '#B09060', textAlign: 'center', padding: '20px 0' },
  docList:    { display: 'flex', flexDirection: 'column', gap: 8 },

  // DocCard
  card:       { display: 'flex', gap: 10, border: '1px solid #E8DFD0', borderRadius: 6, padding: 10, background: '#FDFBF7' },
  cardLeft:   { position: 'relative', flexShrink: 0 },
  thumb:      { width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD0', display: 'block' },
  iconBox:    { width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', borderRadius: 4, border: '1px solid #E8DFD0' },
  repBadge:   { position: 'absolute', top: 2, left: 2, background: '#8B7355', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 6, fontWeight: 700 },
  cardBody:   { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  cardTitleRow:{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 },
  cardTitle:  { fontSize: 12, fontWeight: 600, color: '#5a4a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileSize:   { fontSize: 10, color: '#B09060', flexShrink: 0 },
  dlBtn:      { display: 'inline-block', padding: '3px 8px', background: '#1a6bbf', color: '#fff', borderRadius: 3, fontSize: 11, textDecoration: 'none', width: 'fit-content' },
  memoText:   { fontSize: 11, lineHeight: 1.4, cursor: 'pointer', wordBreak: 'break-all' },
  memoTextarea:{ width: '100%', border: '1px solid #C4A882', borderRadius: 3, padding: '3px 5px', fontSize: 11, resize: 'none', outline: 'none', boxSizing: 'border-box' },
  memoSaveBtn:{ padding: '2px 8px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 3, fontSize: 10, cursor: 'pointer' },
  memoCancelBtn:{ padding: '2px 8px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 3, fontSize: 10, cursor: 'pointer' },
  cardActions:{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 },
  actionBtn:  { border: '1px solid #E8DFD0', background: '#FDFBF7', borderRadius: 3, cursor: 'pointer', fontSize: 12, padding: '2px 6px', color: '#B09060' },
  actionOn:   { background: '#F0E8D8', color: '#8B7355', borderColor: '#C4A882' },
  viewLink:   { fontSize: 11, color: '#8B7355', textDecoration: 'none', border: '1px solid #C4A882', borderRadius: 3, padding: '2px 6px', background: '#FDFBF7' },

  // 모달 공통
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  modal:      { background: '#FDFBF7', borderRadius: 10, padding: 28, maxWidth: 360, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#5a4a35', margin: '0 0 12px', textAlign: 'center' },
  modalBody:  { fontSize: 13, color: '#8B7355', lineHeight: 1.8, margin: '0 0 20px', textAlign: 'center' },
  confirmBtn: { width: '100%', padding: '10px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  skipBtn:    { padding: '10px', background: '#F5F0E8', color: '#8B7355', border: '1px solid #C4A882', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  tmplBtn:    { display: 'flex', flexDirection: 'column', padding: '8px 14px', background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 6, cursor: 'pointer', textAlign: 'left', color: '#5a4a35' },
};
