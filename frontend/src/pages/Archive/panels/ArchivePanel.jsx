/**
 * panels/ArchivePanel.jsx — §8 자료실 관리 (업로드 전용)
 *
 * 역할: 7개 전시관의 자료를 업로드하고 관리한다.
 * 가족 추가/수정/삭제는 FamilyPanel.jsx 에서만 수행. (역할 완전 분리)
 *
 * 기능:
 *  - §8  메뉴 클릭 → 해당 전시관 자료 목록 + 업로드 UI
 *  - 파일 선택(다중) + 드래그&드롭 + 이미지 썸네일 미리보기
 *  - [업로드] → POST /api/exhibitions/:siteId/:type/upload
 *  - 업로드된 사진 클릭 → 라이트박스 확대 모달 (ESC로 닫기)
 *  - §10: 공개 토글 → 박물관 상단 메뉴 전시관 자동 노출
 *  - §12: 자판기 스타일 버튼
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast }                                     from 'react-hot-toast';
import {
  fetchExhibitionItems,
  uploadExhibitionFile,
  deleteExhibitionItem,
} from './archiveApi';
import PhotoArchiveSection    from './PhotoArchiveSection';
import DocumentArchiveSection from './DocumentArchiveSection';
import CareerSection          from './CareerSection';
import AutobiographySection   from './AutobiographySection';
import ArtworkSection         from './ArtworkSection';

// ── 메뉴 정의 ─────────────────────────────────────────────────────────────────
const MENU_BTNS = [
  { key: 'photo',   label: '사진자료실', publicLabel: '사진전시관',   accept: 'image/*',              multi: true  },
  { key: 'main',    label: '주요자료실', publicLabel: '자료전시관',   accept: '*',                    multi: true  },
  { key: 'career',  label: '주요약력',   publicLabel: '약력전시관',   accept: '.pdf,.doc,.docx,.txt', multi: false },
  { key: 'memoir',  label: '자서전',     publicLabel: '자서전전시관', accept: '.pdf,.doc,.docx',      multi: false },
  { key: 'artwork', label: '작품실',     publicLabel: '작품전시관',   accept: 'image/*,video/*',      multi: true  },
  { key: 'voice',   label: '육성녹음',   publicLabel: '음성전시관',   accept: 'audio/*',              multi: true  },
  { key: 'album',   label: '공유앨범',   publicLabel: null,           accept: 'image/*',              multi: true  },
];

const UTIL_BTNS = [
  { key: 'invite', label: '초대하기'     },
  { key: 'pass',   label: '입장권 발급'  },
  { key: 'access', label: '접근요청관리' },
];

const isImage = (url = '', mime = '') =>
  /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url) || mime?.startsWith('image/');

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function ArchivePanel({ siteId, personId }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [lightbox,   setLightbox]   = useState(null); // { url, title }

  function toggleMenu(key) {
    setActiveMenu(prev => (prev === key ? null : key));
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = e => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const activeMeta = MENU_BTNS.find(b => b.key === activeMenu);

  return (
    <div style={s.wrap}>
      <div style={s.layout}>

        {/* §12 자판기 메뉴 */}
        <nav style={s.nav}>
          {MENU_BTNS.map(btn => (
            <button
              key={btn.key}
              style={{ ...s.menuBtn, ...(activeMenu === btn.key ? s.menuOn : {}) }}
              onClick={() => toggleMenu(btn.key)}
            >
              {btn.key === 'album' ? '📷 ' : ''}{btn.label}
            </button>
          ))}
          <div style={s.sep} />
          {UTIL_BTNS.map(btn => (
            <button
              key={btn.key}
              style={{ ...s.menuBtn, ...(activeMenu === btn.key ? s.menuOn : {}) }}
              onClick={() => toggleMenu(btn.key)}
            >
              {btn.label}
            </button>
          ))}
        </nav>

        {/* 컨텐츠 영역 */}
        <div style={s.content}>
          {!activeMenu && (
            <div style={s.emptyHint}>
              <span style={{ fontSize: 36, opacity: 0.25 }}>📂</span>
              <p style={{ color: '#B09060', fontSize: 13, margin: '8px 0 0' }}>
                왼쪽 메뉴에서 자료실을 선택하세요
              </p>
            </div>
          )}

          {activeMenu && UTIL_BTNS.find(b => b.key === activeMenu) && (
            <UtilPanel menuKey={activeMenu} />
          )}

          {activeMenu === 'photo' && (
            <PhotoArchiveSection key="photo" siteId={siteId} />
          )}

          {activeMenu === 'main' && (
            <DocumentArchiveSection key="main" siteId={siteId} />
          )}

          {activeMenu === 'career' && (
            <CareerSection key="career" siteId={siteId} personId={personId} />
          )}

          {activeMenu === 'memoir' && (
            <AutobiographySection key="memoir" siteId={siteId} personId={personId} />
          )}

          {activeMenu === 'artwork' && (
            <ArtworkSection key="artwork" siteId={siteId} personId={personId} />
          )}

          {activeMenu && activeMeta && activeMenu !== 'photo' && activeMenu !== 'main' && activeMenu !== 'career' && activeMenu !== 'memoir' && activeMenu !== 'artwork' && (
            <ExhibitionSection
              key={activeMenu}
              siteId={siteId}
              menuMeta={activeMeta}
              onLightbox={setLightbox}
            />
          )}
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── 전시관 섹션 ───────────────────────────────────────────────────────────────
function ExhibitionSection({ siteId, menuMeta, onLightbox }) {
  const { key: type, label, accept, multi, publicLabel } = menuMeta;
  const fileRef = useRef(null);

  const [items,      setItems]      = useState([]);
  const [pending,    setPending]    = useState([]); // { file, previewUrl }[]
  const [uploading,  setUploading]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [meta,       setMeta]       = useState({ title: '', description: '', isPublic: false });

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    fetchExhibitionItems(siteId, type)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [siteId, type]);

  const addFiles = useCallback((files) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    const next = arr.map(file => ({
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setPending(prev => multi ? [...prev, ...next] : next);
  }, [multi]);

  function removePending(i) {
    setPending(prev => {
      const next = [...prev];
      if (next[i].previewUrl) URL.revokeObjectURL(next[i].previewUrl);
      next.splice(i, 1);
      return next;
    });
  }

  async function handleUpload() {
    if (!pending.length) { toast.error('파일을 선택해주세요'); return; }
    setUploading(true);
    try {
      await uploadExhibitionFile(siteId, type, pending.map(p => p.file), meta);
      const updated = await fetchExhibitionItems(siteId, type);
      setItems(updated);
      pending.forEach(p => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
      setPending([]);
      setMeta({ title: '', description: '', isPublic: false });
      if (fileRef.current) fileRef.current.value = '';
      toast.success(`${label}에 업로드됐습니다.`);
    } catch (err) {
      toast.error(err.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(itemId) {
    if (!window.confirm('이 자료를 삭제하시겠습니까?')) return;
    try {
      await deleteExhibitionItem(siteId, type, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('삭제됐습니다.');
    } catch {
      toast.error('삭제 실패');
    }
  }

  const acceptHint =
    accept === 'image/*'  ? 'JPG, PNG, GIF, WEBP' :
    accept === 'audio/*'  ? 'MP3, WAV, M4A' :
    accept === '*'        ? '모든 파일 형식' : accept;

  const icon =
    type === 'voice'             ? '🎙️' :
    type === 'photo' || type === 'album' ? '🖼️' : '📄';

  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{label}</h3>

      {/* 드롭 존 */}
      <div
        style={{ ...s.dropZone, ...(isDragging ? s.dropActive : {}) }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <span style={{ fontSize: 30, opacity: 0.45 }}>{icon}</span>
        <p style={{ fontSize: 13, color: '#8B7355', margin: '6px 0 0' }}>
          클릭하거나 파일을 여기에 끌어다 놓으세요
        </p>
        <p style={{ fontSize: 11, color: '#B09060', margin: '2px 0 0' }}>
          {acceptHint}{multi ? ' · 다중 선택 가능' : ''}
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multi}
        style={{ display: 'none' }}
        onChange={e => addFiles(e.target.files)}
      />

      {/* 선택된 파일 미리보기 */}
      {pending.length > 0 && (
        <div style={s.pendingBox}>
          <p style={s.pendingLabel}>선택된 파일 {pending.length}개 — 업로드 전 미리보기</p>
          <div style={s.thumbGrid}>
            {pending.map((p, i) => (
              <div key={i} style={s.thumbWrap}>
                {p.previewUrl
                  ? <img src={p.previewUrl} alt={p.file.name} style={s.thumb} />
                  : <div style={s.thumbFile}><span style={{ fontSize: 20 }}>📄</span></div>
                }
                <p style={s.thumbName} title={p.file.name}>{p.file.name}</p>
                <button style={s.thumbDel} onClick={() => removePending(i)}>×</button>
              </div>
            ))}
          </div>

          {/* 메타 + 공개 설정 */}
          <div style={s.metaRow}>
            <input
              style={{ ...s.metaInp, flex: 2 }}
              placeholder="제목 (선택)"
              value={meta.title}
              onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
            />
            <input
              style={{ ...s.metaInp, flex: 3 }}
              placeholder="설명 (선택)"
              value={meta.description}
              onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
            />
            {publicLabel && (
              <label style={s.publicLabel}>
                <input
                  type="checkbox"
                  checked={meta.isPublic}
                  onChange={e => setMeta(m => ({ ...m, isPublic: e.target.checked }))}
                />
                공개 ({publicLabel})
              </label>
            )}
          </div>

          <button
            style={{ ...s.uploadBtn, opacity: uploading ? 0.6 : 1 }}
            disabled={uploading}
            onClick={handleUpload}
          >
            {uploading ? '업로드 중...' : `${label}에 업로드`}
          </button>
        </div>
      )}

      {/* 업로드된 자료 목록 */}
      <div style={s.itemsWrap}>
        {loading && <p style={s.hint}>불러오는 중...</p>}
        {!loading && items.length === 0 && (
          <p style={s.hint}>아직 업로드된 자료가 없습니다.</p>
        )}
        {!loading && items.length > 0 && (
          <div style={s.thumbGrid}>
            {items.map(item => (
              <div key={item.id} style={s.thumbWrap}>
                {isImage(item.url, item.mime_type) ? (
                  <img
                    src={item.url}
                    alt={item.title || item.file_name}
                    style={{ ...s.thumb, cursor: 'zoom-in' }}
                    onClick={() => onLightbox({ url: item.url, title: item.title || item.file_name })}
                    title="클릭해서 크게 보기"
                  />
                ) : (
                  <div
                    style={{ ...s.thumbFile, cursor: 'pointer' }}
                    onClick={() => window.open(item.url, '_blank')}
                    title="새 탭에서 열기"
                  >
                    <span style={{ fontSize: 20 }}>
                      {item.mime_type?.startsWith('audio') ? '🎵' : '📄'}
                    </span>
                  </div>
                )}
                <p style={s.thumbName} title={item.title || item.file_name}>
                  {item.title || item.file_name}
                </p>
                <button
                  style={s.thumbDel}
                  onClick={() => handleDelete(item.id)}
                  title="삭제"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 유틸리티 패널 ─────────────────────────────────────────────────────────────
function UtilPanel({ menuKey }) {
  const LABELS = { invite: '초대하기', pass: '입장권 발급', access: '접근요청관리' };
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{LABELS[menuKey]}</h3>
      <p style={s.hint}>[{LABELS[menuKey]}] 기능 준비 중입니다.</p>
    </div>
  );
}

// ── 라이트박스 확대 모달 ──────────────────────────────────────────────────────
function Lightbox({ item, onClose }) {
  return (
    <div style={s.lbOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={s.lbBox} onClick={e => e.stopPropagation()}>
        <button style={s.lbClose} onClick={onClose} aria-label="닫기">✕</button>
        <img src={item.url} alt={item.title} style={s.lbImg} />
        {item.title && <p style={s.lbCaption}>{item.title}</p>}
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:         { display: 'flex', flexDirection: 'column', height: '100%' },
  layout:       { display: 'flex', gap: 20, alignItems: 'flex-start' },

  // §12 자판기 메뉴
  nav:          { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, width: 120 },
  menuBtn:      { padding: '8px 12px', background: '#FAFAF5', border: '1px solid #C4A882', borderRight: '2px solid #b09060', borderBottom: '2px solid #9a7a50', boxShadow: '1px 1px 0 #c4a87a', borderRadius: 4, fontSize: 12, cursor: 'pointer', textAlign: 'left', color: '#5a4a35' },
  menuOn:       { background: '#8B7355', color: '#fff', borderColor: '#8B7355', boxShadow: 'none' },
  sep:          { height: 1, background: '#C4A882', margin: '4px 0' },

  // 컨텐츠
  content:      { flex: 1, minWidth: 0 },
  emptyHint:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200 },
  section:      { display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#5a4a35', margin: 0, paddingBottom: 8, borderBottom: '1px solid #E8DFD0' },
  hint:         { fontSize: 13, color: '#B09060', margin: 0, textAlign: 'center', padding: '20px 0' },

  // 드롭 존
  dropZone:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #C4A882', borderRadius: 8, padding: '28px 16px', background: '#FDFBF7', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' },
  dropActive:   { background: '#FDF0E0', borderColor: '#8B7355' },

  // 선택된 파일 영역
  pendingBox:   { background: '#FDF8F0', border: '1px solid #E8DFD0', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  pendingLabel: { fontSize: 12, color: '#8B7355', margin: 0, fontWeight: 600 },

  // 썸네일 그리드 (공유)
  thumbGrid:    { display: 'flex', flexWrap: 'wrap', gap: 8 },
  thumbWrap:    { position: 'relative', width: 88, flexShrink: 0 },
  thumb:        { width: 88, height: 88, objectFit: 'cover', borderRadius: 4, border: '1px solid #E8DFD0', display: 'block' },
  thumbFile:    { width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0E8', borderRadius: 4, border: '1px solid #E8DFD0' },
  thumbName:    { fontSize: 10, color: '#8B7355', margin: '3px 0 0', wordBreak: 'break-all', lineHeight: 1.3, maxHeight: 30, overflow: 'hidden' },
  thumbDel:     { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: '18px', textAlign: 'center', padding: 0 },

  // 메타 입력
  metaRow:      { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  metaInp:      { border: '1px solid #C4A882', borderRadius: 4, padding: '5px 8px', fontSize: 12, background: '#FDFBF7', outline: 'none', boxSizing: 'border-box', minWidth: 80 },
  publicLabel:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5a4a35', cursor: 'pointer', whiteSpace: 'nowrap' },
  uploadBtn:    { padding: '9px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' },

  // 업로드된 자료
  itemsWrap:    { marginTop: 4 },

  // 라이트박스
  lbOverlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  lbBox:        { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  lbImg:        { maxWidth: '90vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 4, display: 'block' },
  lbCaption:    { color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: '10px 0 0', textAlign: 'center' },
  lbClose:      { position: 'absolute', top: -38, right: 0, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: 4 },
};
