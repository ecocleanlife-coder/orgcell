/**
 * SharedAlbumSection.jsx — §8-G 공유앨범
 *
 * - 썸네일 그리드, 업로더 이름 + 날짜 오버레이
 * - 체크박스 선택 → 일괄 다운로드
 * - 관장 설정: 공개범위 / 다운로드 허용 / 공유 링크 생성·무효화
 * - 중복 사진 업로드 시 "이미 같은 사진이 있습니다." 토스트
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchSharedAlbum,
  uploadSharedPhoto,
  deleteSharedPhoto,
  updateAlbumSettings,
  createShareLink,
  revokeShareLink,
} from './archiveApi';

const ACCEPT = '.jpg,.jpeg,.png,.heic';

// ══════════════════════════════════════════════════════════════════════════════
export default function SharedAlbumSection({ siteId, isCurator }) {
  const [album,    setAlbum]    = useState(null);
  const [photos,   setPhotos]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(new Set()); // 선택된 photo id Set
  const [selMode,  setSelMode]  = useState(false);
  const [settings, setSettings] = useState(false); // 관장 설정 패널 토글
  const [uploading,setUploading]= useState(false);
  const fileRef = useRef(null);

  // ── 로드 ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchSharedAlbum(siteId);
      setAlbum(d.album);
      setPhotos(d.photos ?? []);
    } catch { setPhotos([]); }
    finally { setLoading(false); }
  }, [siteId]);

  useEffect(() => { if (siteId) load(); }, [siteId, load]);

  // ── 업로드 ───────────────────────────────────────────────────────────────
  async function handleFiles(files) {
    const arr = Array.from(files).filter(f => /\.(jpg|jpeg|png|heic)$/i.test(f.name));
    if (!arr.length) { toast.error('JPG/PNG/HEIC 파일만 업로드 가능합니다.'); return; }
    setUploading(true);
    let uploaded = 0, dup = 0;
    for (const file of arr) {
      try {
        await uploadSharedPhoto(siteId, file);
        uploaded++;
      } catch (err) {
        if (err.code === 'DUPLICATE') dup++;
        else toast.error(err.message || '업로드 실패');
      }
    }
    if (dup > 0) toast('이미 같은 사진이 있습니다.', { icon: '⚠️' });
    if (uploaded > 0) { toast.success(`${uploaded}장 업로드 완료`); await load(); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── 삭제 ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('이 사진을 삭제하시겠습니까?')) return;
    try {
      await deleteSharedPhoto(siteId, id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) { toast.error(err.message || '삭제 실패'); }
  }

  // ── 선택 다운로드 ─────────────────────────────────────────────────────────
  function handleDownload() {
    const targets = photos.filter(p => selected.has(p.id));
    targets.forEach(p => {
      const a = document.createElement('a');
      a.href = p.file_url;
      a.download = p.file_url.split('/').pop();
      a.target = '_blank';
      a.click();
    });
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ── 관장 설정 ─────────────────────────────────────────────────────────────
  async function handleSettingChange(field, value) {
    try {
      const d = await updateAlbumSettings(siteId, { [field]: value });
      setAlbum(d.album);
      toast.success('설정 저장됨');
    } catch (err) { toast.error(err.message || '설정 실패'); }
  }

  async function handleCreateLink() {
    try {
      const d = await createShareLink(siteId);
      setAlbum(prev => ({ ...prev, share_token: d.share_token }));
      const url = `${window.location.origin}/shared-album/${d.share_token}`;
      await navigator.clipboard.writeText(url);
      toast.success('링크 복사됨');
    } catch (err) { toast.error(err.message || '링크 생성 실패'); }
  }

  async function handleRevokeLink() {
    if (!window.confirm('공유 링크를 무효화하시겠습니까?')) return;
    try {
      await revokeShareLink(siteId);
      setAlbum(prev => ({ ...prev, share_token: null }));
      toast.success('링크 무효화됨');
    } catch (err) { toast.error(err.message || '링크 무효화 실패'); }
  }

  async function handleCopyLink() {
    if (!album?.share_token) return;
    const url = `${window.location.origin}/shared-album/${album.share_token}`;
    await navigator.clipboard.writeText(url);
    toast.success('링크 복사됨');
  }

  // ── 드래그&드롭 ──────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave()  { setDragging(false); }
  function onDrop(e)      { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }

  // ── 렌더링 ───────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* ─── 업로드 바 ───────────────────────────────────────────────────── */}
      <div
        style={{ ...s.dropZone, ...(dragging ? s.dropActive : {}) }}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      >
        <input ref={fileRef} type="file" accept={ACCEPT} multiple style={{ display:'none' }}
          onChange={e => handleFiles(e.target.files)} />
        <button style={s.addBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '업로드 중...' : '+ 사진 추가'}
        </button>
        <span style={s.dropHint}>또는 여기에 파일을 드래그하세요 (jpg·png·heic)</span>
      </div>

      {/* ─── 툴바 ───────────────────────────────────────────────────────── */}
      <div style={s.toolbar}>
        <span style={s.count}>{photos.length}장</span>
        <div style={{ display:'flex', gap:6 }}>
          {album?.allow_download && photos.length > 0 && (
            <button style={s.tbBtn} onClick={() => { setSelMode(m => !m); setSelected(new Set()); }}>
              {selMode ? '선택 취소' : '선택 다운로드'}
            </button>
          )}
          {selMode && selected.size > 0 && (
            <button style={{ ...s.tbBtn, background:'#8B7355', color:'#fff' }} onClick={handleDownload}>
              ↓ {selected.size}장 다운로드
            </button>
          )}
          {isCurator && (
            <button style={{ ...s.tbBtn, ...(settings ? { background:'#FDF4E3' } : {}) }}
              onClick={() => setSettings(m => !m)}>
              ⚙ 설정
            </button>
          )}
        </div>
      </div>

      {/* ─── 관장 설정 패널 ──────────────────────────────────────────────── */}
      {settings && isCurator && album && (
        <div style={s.settingsPanel}>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>공개범위</span>
            <select style={s.select}
              value={album.visibility}
              onChange={e => handleSettingChange('visibility', e.target.value)}>
              <option value="public">전체공개</option>
              <option value="family">가족만</option>
              <option value="link">링크만</option>
            </select>
          </div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>다운로드 허용</span>
            <label style={s.toggle}>
              <input type="checkbox" checked={album.allow_download}
                onChange={e => handleSettingChange('allow_download', e.target.checked)} />
              <span>{album.allow_download ? '허용' : '차단'}</span>
            </label>
          </div>
          <div style={s.settingRow}>
            <span style={s.settingLabel}>공유 링크</span>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {album.share_token ? (
                <>
                  <button style={s.tbBtn} onClick={handleCopyLink}>링크 복사</button>
                  <button style={{ ...s.tbBtn, color:'#e74c3c', borderColor:'#e74c3c' }}
                    onClick={handleRevokeLink}>무효화</button>
                </>
              ) : (
                <button style={s.tbBtn} onClick={handleCreateLink}>링크 생성</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 썸네일 그리드 ───────────────────────────────────────────────── */}
      {loading && <p style={s.empty}>불러오는 중...</p>}
      {!loading && photos.length === 0 && (
        <p style={s.empty}>아직 사진이 없습니다. 가족들과 함께 추가해보세요.</p>
      )}

      {!loading && photos.length > 0 && (
        <div style={s.grid}>
          {photos.map(photo => (
            <div key={photo.id} style={s.cell}
              onClick={() => selMode && toggleSelect(photo.id)}>

              {selMode && (
                <div style={{ ...s.checkbox, ...(selected.has(photo.id) ? s.checkboxOn : {}) }}>
                  {selected.has(photo.id) && '✓'}
                </div>
              )}

              <img
                src={photo.file_url}
                alt={photo.uploader_name}
                style={{ ...s.thumb, ...(selMode && selected.has(photo.id) ? { opacity:0.7 } : {}) }}
              />

              {/* 업로더 + 날짜 오버레이 */}
              <div style={s.overlay}>
                <span style={s.uploaderName}>{photo.uploader_name || '?'}</span>
                <span style={s.uploadDate}>
                  {new Date(photo.uploaded_at).toLocaleDateString('ko-KR', { month:'short', day:'numeric' })}
                </span>
              </div>

              {/* 삭제 버튼 (본인 or 관장) */}
              {!selMode && (
                <button style={s.delBtn} onClick={e => { e.stopPropagation(); handleDelete(photo.id); }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:         { padding: '4px 0' },
  dropZone:     { display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:'1.5px dashed #D0C0A0', borderRadius:6, marginBottom:12, background:'#FAFAF5', transition:'border-color .15s' },
  dropActive:   { borderColor:'#9A7A50', background:'#FDF4E3' },
  addBtn:       { padding:'7px 16px', border:'1px solid #C4A882', borderRadius:4, background:'#fff', color:'#5A3E1B', fontSize:13, cursor:'pointer', whiteSpace:'nowrap' },
  dropHint:     { fontSize:12, color:'#B09060' },
  toolbar:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  count:        { fontSize:13, color:'#9A7A50' },
  tbBtn:        { padding:'5px 12px', border:'1px solid #C4A882', borderRadius:4, background:'#fff', color:'#5A3E1B', fontSize:12, cursor:'pointer' },
  settingsPanel:{ background:'#FDF4E3', border:'1px solid #E8DFD0', borderRadius:6, padding:'12px 16px', marginBottom:14, display:'flex', flexDirection:'column', gap:10 },
  settingRow:   { display:'flex', alignItems:'center', gap:12 },
  settingLabel: { fontSize:12, color:'#7A5C3A', fontWeight:600, minWidth:80 },
  select:       { padding:'4px 8px', border:'1px solid #D0C0A0', borderRadius:4, fontSize:13, color:'#3A2A12' },
  toggle:       { display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', color:'#5A3E1B' },
  empty:        { fontSize:13, color:'#B09060', textAlign:'center', padding:'24px 0' },
  grid:         { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 },
  cell:         { position:'relative', aspectRatio:'1', overflow:'hidden', borderRadius:6, cursor:'pointer', background:'#EDE8E0' },
  thumb:        { width:'100%', height:'100%', objectFit:'cover', display:'block' },
  overlay:      { position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,0.55))', padding:'16px 6px 5px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' },
  uploaderName: { fontSize:10, color:'#fff', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' },
  uploadDate:   { fontSize:10, color:'rgba(255,255,255,0.8)', whiteSpace:'nowrap' },
  delBtn:       { position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.45)', color:'#fff', border:'none', fontSize:11, cursor:'pointer', display:'none', alignItems:'center', justifyContent:'center', lineHeight:1 },
  checkbox:     { position:'absolute', top:5, left:5, width:20, height:20, borderRadius:3, background:'rgba(255,255,255,0.8)', border:'2px solid #C4A882', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, zIndex:2 },
  checkboxOn:   { background:'#8B7355', color:'#fff', border:'2px solid #8B7355' },
};

// 그리드 셀 호버 시 삭제 버튼 표시
const hoverStyle = `
  .shared-album-cell:hover .del-btn { display: flex !important; }
`;
if (typeof document !== 'undefined') {
  const styleEl = document.getElementById('shared-album-hover') || (() => {
    const el = document.createElement('style');
    el.id = 'shared-album-hover';
    document.head.appendChild(el);
    return el;
  })();
  styleEl.textContent = hoverStyle;
}
