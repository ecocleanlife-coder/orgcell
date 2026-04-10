/**
 * SharedAlbum.jsx — §11 공유앨범
 *
 * §11 규칙:
 *   - 로그인 없이 사진 업로드 + 다운로드 가능
 *   - 체크박스 → 선택 다운로드
 *   - 중복 사진 자동 감지 + 제거
 *   - 생성 즉시 박물관 상단 메뉴에 노출 (ArchivePage에서 처리)
 *   - 공개범위: 전체공개 / 가족만 / 링크만 (ArchivePage에서 설정)
 *
 * Props:
 *   subdomain  — string (박물관 식별자)
 *   readOnly   — boolean (방문자: true, 관장: false)
 *
 * API:
 *   GET  /api/album/shared/:subdomain/photos           → { photos: Photo[] }
 *   POST /api/album/shared/:subdomain/upload           → { photo: Photo } (인증 불필요)
 *   GET  /api/album/shared/:subdomain/download?ids=... → zip (인증 불필요)
 *
 * Photo: { id, url, filename, size, uploadedAt, uploaderName? }
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ── 중복 감지 키 ──────────────────────────────────────────────────────────────
function dupKey(filename, size) {
  return `${filename.toLowerCase()}::${size}`;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function SharedAlbum({ subdomain, readOnly = false }) {
  const [photos,      setPhotos]      = useState([]);
  const [selected,    setSelected]    = useState(new Set());
  const [uploading,   setUploading]   = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]); // { name, status:'pending'|'done'|'dup'|'error' }
  const [loading,     setLoading]     = useState(true);
  const [dragOver,    setDragOver]    = useState(false);
  const [lightbox,    setLightbox]    = useState(null); // Photo | null
  const fileInputRef = useRef(null);

  // ── 기존 사진 로드 ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/album/shared/${subdomain}/photos`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setPhotos(Array.isArray(d) ? d : (d.photos ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain]);

  // ── 중복 감지 (파일명 + 크기) ───────────────────────────────────────────────
  const existingKeys = new Set(photos.map(p => dupKey(p.filename, p.size)));

  // ── 파일 업로드 처리 ────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;

    // 큐 초기화
    const queue = files.map(f => ({
      name:   f.name,
      status: existingKeys.has(dupKey(f.name, f.size)) ? 'dup' : 'pending',
    }));
    setUploadQueue(queue);
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const key  = dupKey(file.name, file.size);

      // 중복 → 스킵
      if (existingKeys.has(key)) {
        setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, status: 'dup' } : q));
        continue;
      }

      try {
        const fd = new FormData();
        fd.append('photo', file);
        // §11: 로그인 없이 업로드 가능 — credentials omit 방식이지만 있어도 무방
        const res = await fetch(`/api/album/shared/${subdomain}/upload`, {
          method: 'POST',
          body:   fd,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data  = await res.json();
        const photo = data.photo ?? data;

        setPhotos(prev => [...prev, photo]);
        existingKeys.add(key);
        setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, status: 'done' } : q));
      } catch {
        setUploadQueue(prev => prev.map((q, qi) => qi === i ? { ...q, status: 'error' } : q));
      }
    }

    setUploading(false);
  }, [subdomain, existingKeys]);

  // ── 드래그 & 드롭 ──────────────────────────────────────────────────────────
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragOver(true);  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // ── 선택 관련 ───────────────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAll()     { setSelected(new Set(photos.map(p => p.id))); }
  function clearSelection(){ setSelected(new Set()); }

  // ── 선택 다운로드 ──────────────────────────────────────────────────────────
  function downloadSelected() {
    if (!selected.size) return;
    const ids = [...selected].join(',');
    // 백엔드가 zip 반환: GET /api/album/shared/:subdomain/download?ids=...
    const a   = document.createElement('a');
    a.href    = `/api/album/shared/${subdomain}/download?ids=${ids}`;
    a.download= `shared_album_${subdomain}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── 개별 다운로드 ──────────────────────────────────────────────────────────
  function downloadOne(photo) {
    const a   = document.createElement('a');
    a.href    = photo.url;
    a.download= photo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  if (loading) return <div style={s.centerWrap}><div style={s.spinner} /></div>;

  return (
    <div style={s.wrap}>

      {/* ── 업로드 존 (§11: 로그인 없이 업로드 가능) ── */}
      <div
        style={{ ...s.dropzone, ...(dragOver ? s.dropzoneActive : {}) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => handleFiles(e.target.files)}
        />
        <div style={s.dropzoneInner}>
          <span style={s.dropIcon}>📷</span>
          <p style={s.dropTitle}>
            {uploading ? '업로드 중…' : '사진을 여기에 끌어다 놓거나 클릭하여 추가'}
          </p>
          <p style={s.dropHint}>로그인 없이 업로드 가능 · 중복 사진 자동 감지 (§11)</p>
        </div>
      </div>

      {/* ── 업로드 상태 큐 ── */}
      {uploadQueue.length > 0 && (
        <div style={s.queueBox}>
          {uploadQueue.map((q, i) => (
            <div key={i} style={s.queueItem}>
              <span style={s.queueName}>{q.name}</span>
              <span style={{ ...s.queueStatus, color: STATUS_COLOR[q.status] }}>
                {STATUS_LABEL[q.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 툴바 ── */}
      {photos.length > 0 && (
        <div style={s.toolbar}>
          <div style={s.toolbarLeft}>
            <button style={s.toolBtn} onClick={selectAll}>전체선택</button>
            <button style={s.toolBtn} onClick={clearSelection}>선택 해제</button>
            {selected.size > 0 && (
              <button style={{ ...s.toolBtn, ...s.toolBtnDownload }} onClick={downloadSelected}>
                ⬇ {selected.size}장 다운로드
              </button>
            )}
          </div>
          <span style={s.photoCount}>{photos.length}장</span>
        </div>
      )}

      {/* ── 사진 그리드 ── */}
      {photos.length === 0 ? (
        <div style={s.centerWrap}>
          <p style={s.emptyMsg}>아직 사진이 없습니다. 첫 사진을 올려주세요!</p>
        </div>
      ) : (
        <div style={s.grid}>
          {photos.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selected.has(photo.id)}
              onToggle={() => toggleSelect(photo.id)}
              onLightbox={() => setLightbox(photo)}
              onDownload={() => downloadOne(photo)}
            />
          ))}
        </div>
      )}

      {/* ── 라이트박스 ── */}
      {lightbox && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onDownload={() => downloadOne(lightbox)}
        />
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 사진 카드
// ══════════════════════════════════════════════════════════════════════════════
function PhotoCard({ photo, isSelected, onToggle, onLightbox, onDownload }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ ...s.card, outline: isSelected ? '3px solid #C4A882' : '3px solid transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 체크박스 */}
      <label style={s.checkLabel} onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          style={s.checkbox}
        />
      </label>

      {/* 사진 */}
      <img
        src={photo.url}
        alt={photo.filename}
        style={s.cardImg}
        onClick={onLightbox}
        loading="lazy"
      />

      {/* 호버 오버레이 */}
      {hovered && (
        <div style={s.hoverOverlay}>
          <button style={s.overlayBtn} onClick={onLightbox}>🔍 보기</button>
          <button style={s.overlayBtn} onClick={e => { e.stopPropagation(); onDownload(); }}>⬇ 저장</button>
        </div>
      )}

      {/* 파일명 */}
      <p style={s.cardFilename}>{photo.filename}</p>

      {/* 업로더명 (있을 경우) */}
      {photo.uploaderName && (
        <p style={s.cardUploader}>{photo.uploaderName}</p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 라이트박스
// ══════════════════════════════════════════════════════════════════════════════
function Lightbox({ photo, onClose, onDownload }) {
  // ESC 키로 닫기
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={s.lightboxOverlay} onClick={onClose}>
      <img
        src={photo.url}
        alt={photo.filename}
        style={s.lightboxImg}
        onClick={e => e.stopPropagation()}
      />
      <div style={s.lightboxInfo} onClick={e => e.stopPropagation()}>
        <span style={s.lightboxFilename}>{photo.filename}</span>
        {photo.uploadedAt && (
          <span style={s.lightboxDate}>
            {new Date(photo.uploadedAt).toLocaleDateString('ko-KR')}
          </span>
        )}
        {photo.uploaderName && (
          <span style={s.lightboxUploader}>{photo.uploaderName}</span>
        )}
        <button style={s.lightboxDl} onClick={onDownload}>⬇ 다운로드</button>
      </div>
      <button style={s.lightboxClose} onClick={onClose}>✕</button>
    </div>
  );
}

// ── 업로드 상태 상수 ──────────────────────────────────────────────────────────
const STATUS_LABEL = {
  pending: '대기 중…',
  done:    '완료 ✓',
  dup:     '중복 — 건너뜀',
  error:   '오류',
};
const STATUS_COLOR = {
  pending: '#9a8a75',
  done:    '#2d6b2d',
  dup:     '#b09060',
  error:   '#8B2020',
};

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  wrap:       { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 },
  centerWrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyMsg:   { fontSize: 14, color: '#9a8a75', textAlign: 'center' },
  spinner:    { width: 32, height: 32, borderRadius: '50%', border: '3px solid #E8DFD0', borderTop: '3px solid #C4A882', animation: 'albumSpin 0.8s linear infinite' },

  // ── 업로드 존 ─────────────────────────────────────────────────────────────
  dropzone: {
    border:         '2px dashed #C4A882',
    borderRadius:   10,
    background:     '#FAFAF7',
    cursor:         'pointer',
    transition:     'background 0.15s, border-color 0.15s',
    padding:        '28px 20px',
  },
  dropzoneActive: {
    background:   '#FDF8F0',
    borderColor:  '#8B7355',
    borderStyle:  'solid',
  },
  dropzoneInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  dropIcon:      { fontSize: 36 },
  dropTitle:     { fontSize: 14, fontWeight: 600, color: '#5a4a35', margin: 0 },
  dropHint:      { fontSize: 11, color: '#9a8a75', margin: 0, textAlign: 'center' },

  // ── 업로드 큐 ─────────────────────────────────────────────────────────────
  queueBox:    { background: '#FAFAF7', border: '1px solid #E8DFD0', borderRadius: 6, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  queueItem:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 },
  queueName:   { color: '#5a4a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' },
  queueStatus: { fontWeight: 600, flexShrink: 0 },

  // ── 툴바 ──────────────────────────────────────────────────────────────────
  toolbar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toolbarLeft:   { display: 'flex', gap: 8, flexWrap: 'wrap' },
  toolBtn:       { padding: '6px 12px', background: '#FAF7F2', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#7a5c38', cursor: 'pointer' },
  toolBtnDownload: { background: '#5a7a8a', color: '#fff', border: 'none' },
  photoCount:    { fontSize: 12, color: '#9a8a75' },

  // ── 그리드 ────────────────────────────────────────────────────────────────
  grid: {
    display:               'grid',
    gridTemplateColumns:   'repeat(auto-fill, minmax(180px, 1fr))',
    gap:                   12,
  },

  // ── 카드 ──────────────────────────────────────────────────────────────────
  card: {
    background:   '#FDFBF7',
    border:       '1px solid #E8DFD0',
    borderRadius:  8,
    overflow:     'hidden',
    position:     'relative',
    cursor:       'pointer',
    transition:   'outline 0.1s',
  },
  checkLabel: { position: 'absolute', top: 6, left: 6, zIndex: 2, cursor: 'pointer' },
  checkbox:   { width: 16, height: 16, accentColor: '#8B7355', cursor: 'pointer' },
  cardImg:    { width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' },
  cardFilename:{ fontSize: 10, color: '#8B7355', padding: '4px 8px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardUploader:{ fontSize: 10, color: '#b09a80', padding: '0 8px 4px', margin: 0 },

  // ── 호버 오버레이 ────────────────────────────────────────────────────────
  hoverOverlay: {
    position:       'absolute',
    inset:           0,
    background:     'rgba(40,30,20,0.5)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             8,
    zIndex:          1,
  },
  overlayBtn: {
    padding:      '6px 10px',
    background:   'rgba(255,255,255,0.9)',
    border:       'none',
    borderRadius:  4,
    fontSize:      12,
    fontWeight:    600,
    color:         '#3a2a1a',
    cursor:        'pointer',
  },

  // ── 라이트박스 ────────────────────────────────────────────────────────────
  lightboxOverlay: {
    position:       'fixed',
    inset:           0,
    background:     'rgba(0,0,0,0.88)',
    zIndex:          1000,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:         24,
  },
  lightboxImg: {
    maxWidth:   '90vw',
    maxHeight:  '75vh',
    objectFit:  'contain',
    borderRadius: 4,
  },
  lightboxInfo: {
    display:     'flex',
    alignItems:  'center',
    gap:          12,
    marginTop:    12,
    flexWrap:    'wrap',
    justifyContent: 'center',
  },
  lightboxFilename:{ color: '#fff', fontSize: 13 },
  lightboxDate:    { color: '#ccc', fontSize: 11 },
  lightboxUploader:{ color: '#ccc', fontSize: 11 },
  lightboxDl: {
    padding:      '6px 16px',
    background:   '#8B7355',
    color:        '#fff',
    border:       'none',
    borderRadius:  4,
    fontSize:      12,
    cursor:        'pointer',
  },
  lightboxClose: {
    position:   'absolute',
    top:         16,
    right:       20,
    background: 'none',
    border:     'none',
    color:      '#fff',
    fontSize:    28,
    cursor:     'pointer',
    lineHeight:  1,
  },
};

// 전역 spinner 애니메이션
if (typeof document !== 'undefined' && !document.getElementById('album-spin')) {
  const el = document.createElement('style');
  el.id = 'album-spin';
  el.textContent = '@keyframes albumSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(el);
}
