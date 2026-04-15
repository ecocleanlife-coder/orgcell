/**
 * MediaSection.jsx — §8-F 음성·동영상
 *
 * 공개명: 음성·영상전시관
 * 지원:  mp3 / m4a / wav (음성), mp4 / mov (동영상)
 * 미지원: avi → 업로드 시 안내
 * 브라우저 직접 녹음: 마이크 권한 → 녹음/정지/확인/저장
 * 재생: <audio> / <video> 브라우저 내장
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchMediaItems,
  uploadMediaFile,
  saveRecording,
  updateMediaItem,
  deleteMediaItem,
} from './archiveApi';

const ACCEPT_AUDIO = '.mp3,.m4a,.wav';
const ACCEPT_VIDEO = '.mp4,.mov';
const ACCEPT_ALL   = `${ACCEPT_AUDIO},${ACCEPT_VIDEO}`;

// ══════════════════════════════════════════════════════════════════════════════
export default function MediaSection({ siteId, personId }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('upload'); // 'upload' | 'record'
  const [editId,     setEditId]     = useState(null);
  const [editFields, setEditFields] = useState({});

  // 업로드 폼 상태
  const [pending,    setPending]    = useState(null); // { file, previewUrl }
  const [meta,       setMeta]       = useState({ title: '', recorded_at: '', memo: '' });
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef(null);

  // 녹음 상태
  const [recState,   setRecState]   = useState('idle'); // idle | recording | preview
  const [recBlob,    setRecBlob]    = useState(null);
  const [recObjUrl,  setRecObjUrl]  = useState(null);
  const [recMeta,    setRecMeta]    = useState({ title: '', recorded_at: '', memo: '' });
  const [recSaving,  setRecSaving]  = useState(false);
  const mediaRecRef  = useRef(null);
  const chunksRef    = useRef([]);

  // ── 초기 데이터 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    loadItems();
  }, [siteId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchMediaItems(siteId)); }
    catch { setItems([]); }
    finally { setLoading(false); }
  }, [siteId]);

  // ── 파일 선택 ─────────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (/\.avi$/i.test(file.name)) {
      toast.error('avi 파일은 mp4로 변환 후 업로드해주세요.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    const isVideo = /^video\//.test(file.type) || /\.(mp4|mov)$/i.test(file.name);
    setPending({ file, isVideo });
    setMeta(m => ({ ...m, title: m.title || file.name.replace(/\.[^.]+$/, '') }));
  }

  // ── 업로드 ───────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!pending?.file) { toast.error('파일을 선택해주세요.'); return; }
    if (!meta.title.trim()) { toast.error('제목을 입력해주세요.'); return; }
    setUploading(true);
    try {
      await uploadMediaFile(siteId, pending.file, { ...meta, person_id: personId });
      toast.success('업로드 완료');
      setPending(null);
      setMeta({ title: '', recorded_at: '', memo: '' });
      if (fileRef.current) fileRef.current.value = '';
      await loadItems();
    } catch (err) {
      toast.error(err.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  // ── 녹음 시작 ─────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecRef.current = mr;
      chunksRef.current   = [];
      mr.ondataavailable  = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setRecBlob(blob);
        setRecObjUrl(url);
        setRecState('preview');
      };
      mr.start();
      setRecState('recording');
    } catch (err) {
      toast.error('마이크 권한이 필요합니다: ' + (err.message || ''));
    }
  }

  function stopRecording() {
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
    }
  }

  function discardRecording() {
    if (recObjUrl) URL.revokeObjectURL(recObjUrl);
    setRecBlob(null);
    setRecObjUrl(null);
    setRecState('idle');
    setRecMeta({ title: '', recorded_at: '', memo: '' });
  }

  async function handleSaveRecording() {
    if (!recBlob) return;
    if (!recMeta.title.trim()) { toast.error('제목을 입력해주세요.'); return; }
    setRecSaving(true);
    try {
      await saveRecording(siteId, recBlob, { ...recMeta, person_id: personId });
      toast.success('녹음 저장 완료');
      discardRecording();
      await loadItems();
    } catch (err) {
      toast.error(err.message || '저장 실패');
    } finally {
      setRecSaving(false);
    }
  }

  // ── 수정 ─────────────────────────────────────────────────────────────────
  function startEdit(item) {
    setEditId(item.id);
    setEditFields({
      title:       item.title || '',
      recorded_at: item.recorded_at?.slice(0, 10) || '',
      memo:        item.memo  || '',
    });
  }

  async function handleSaveEdit() {
    try {
      await updateMediaItem(siteId, editId, editFields);
      toast.success('수정 완료');
      setEditId(null);
      await loadItems();
    } catch (err) {
      toast.error(err.message || '수정 실패');
    }
  }

  // ── 삭제 ─────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    try {
      await deleteMediaItem(siteId, id);
      toast.success('삭제 완료');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      toast.error(err.message || '삭제 실패');
    }
  }

  // ── 렌더링 ───────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* 탭 */}
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'upload' ? s.tabOn : {}) }} onClick={() => setTab('upload')}>
          파일 업로드
        </button>
        <button style={{ ...s.tab, ...(tab === 'record' ? s.tabOn : {}) }} onClick={() => setTab('record')}>
          🎙 직접 녹음
        </button>
      </div>

      {/* ─── 파일 업로드 탭 ─────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div style={s.form}>
          <p style={s.hint}>음성(mp3·m4a·wav) 또는 동영상(mp4·mov) 파일을 업로드하세요.<br/>
            동영상은 파일이 크므로 업로드 전 용량을 확인해주세요. (최대 500MB)</p>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ALL}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button style={s.selectBtn} onClick={() => fileRef.current?.click()}>
            {pending ? `📎 ${pending.file.name}` : '파일 선택'}
          </button>

          {pending && (
            <div style={s.preview}>
              {pending.isVideo
                ? <video controls style={s.player} src={URL.createObjectURL(pending.file)} />
                : <audio controls style={{ width: '100%' }} src={URL.createObjectURL(pending.file)} />
              }
            </div>
          )}

          <MetaForm fields={meta} onChange={setMeta} />

          <button style={s.uploadBtn} onClick={handleUpload} disabled={uploading || !pending}>
            {uploading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      )}

      {/* ─── 직접 녹음 탭 ──────────────────────────────────────────────── */}
      {tab === 'record' && (
        <div style={s.form}>
          {recState === 'idle' && (
            <button style={s.recBtn} onClick={startRecording}>🎙 녹음 시작</button>
          )}
          {recState === 'recording' && (
            <div style={{ textAlign: 'center' }}>
              <div style={s.recIndicator}>● 녹음 중...</div>
              <button style={{ ...s.recBtn, background: '#c0392b' }} onClick={stopRecording}>
                ■ 정지
              </button>
            </div>
          )}
          {recState === 'preview' && recObjUrl && (
            <div>
              <audio controls style={{ width: '100%', marginBottom: 12 }} src={recObjUrl} />
              <MetaForm fields={recMeta} onChange={setRecMeta} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={s.uploadBtn} onClick={handleSaveRecording} disabled={recSaving}>
                  {recSaving ? '저장 중...' : '저장'}
                </button>
                <button style={{ ...s.uploadBtn, background: '#aaa' }} onClick={discardRecording}>
                  다시 녹음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 목록 ──────────────────────────────────────────────────────── */}
      <div style={s.listWrap}>
        <div style={s.listHeader}>저장된 항목 ({items.length})</div>

        {loading && <p style={s.emptyMsg}>불러오는 중...</p>}
        {!loading && items.length === 0 && (
          <p style={s.emptyMsg}>업로드된 음성·동영상이 없습니다.</p>
        )}

        {items.map(item => (
          <div key={item.id} style={s.itemCard}>
            {editId === item.id ? (
              /* ── 수정 폼 ── */
              <div>
                <MetaForm fields={editFields} onChange={setEditFields} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={s.saveBtn} onClick={handleSaveEdit}>저장</button>
                  <button style={s.cancelBtn} onClick={() => setEditId(null)}>취소</button>
                </div>
              </div>
            ) : (
              /* ── 재생 뷰 ── */
              <div>
                <div style={s.itemTitle}>
                  {item.file_type === 'video' ? '🎬' : '🎵'} {item.title || '(제목 없음)'}
                  {item.recorded_at && (
                    <span style={s.itemDate}> · {item.recorded_at.slice(0, 10)}</span>
                  )}
                </div>

                {item.file_type === 'video'
                  ? <video controls style={s.player} src={item.file_path} />
                  : <audio controls style={{ width: '100%', marginTop: 6 }} src={item.file_path} />
                }

                {item.memo && <p style={s.itemMemo}>{item.memo}</p>}

                <div style={s.itemActions}>
                  <button style={s.editBtn}   onClick={() => startEdit(item)}>수정</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(item.id)}>삭제</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 공통 입력 폼 (제목/녹음일/메모) ──────────────────────────────────────────
function MetaForm({ fields, onChange }) {
  const set = (key) => (e) => onChange(f => ({ ...f, [key]: e.target.value }));
  return (
    <div style={s.metaForm}>
      <div style={s.fieldRow}>
        <label style={s.lbl}>제목 <span style={{ color: '#c0392b' }}>*</span></label>
        <input style={s.inp} value={fields.title} onChange={set('title')} placeholder="제목을 입력하세요" />
      </div>
      <div style={s.fieldRow}>
        <label style={s.lbl}>녹음/촬영일</label>
        <input style={s.inp} type="date" value={fields.recorded_at} onChange={set('recorded_at')} />
      </div>
      <div style={s.fieldRow}>
        <label style={s.lbl}>메모</label>
        <textarea style={{ ...s.inp, height: 56, resize: 'vertical' }}
          value={fields.memo} onChange={set('memo')} placeholder="간단한 설명" />
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:      { padding: '16px 0' },
  tabs:      { display: 'flex', gap: 8, marginBottom: 16 },
  tab:       { padding: '7px 18px', border: '1px solid #C4A882', borderRadius: 4, background: '#FAFAF5', color: '#7A5C3A', fontSize: 13, cursor: 'pointer' },
  tabOn:     { background: '#FDF4E3', borderColor: '#9A7A50', fontWeight: 700 },
  form:      { background: '#FAFAF5', border: '1px solid #E8DFD0', borderRadius: 6, padding: 16, marginBottom: 20 },
  hint:      { fontSize: 12, color: '#9A7A50', marginBottom: 12, lineHeight: 1.5 },
  selectBtn: { padding: '7px 16px', border: '1px solid #C4A882', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#5A3E1B', marginBottom: 10 },
  preview:   { marginBottom: 10 },
  player:    { width: '100%', maxHeight: 240, borderRadius: 4, background: '#000' },
  metaForm:  { display: 'flex', flexDirection: 'column', gap: 8 },
  fieldRow:  { display: 'flex', flexDirection: 'column', gap: 3 },
  lbl:       { fontSize: 11, color: '#9A7A50', fontWeight: 600 },
  inp:       { padding: '6px 10px', border: '1px solid #D0C0A0', borderRadius: 4, fontSize: 13, color: '#3A2A12', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' },
  uploadBtn: { marginTop: 10, padding: '8px 20px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' },
  recBtn:    { display: 'block', margin: '0 auto', padding: '10px 28px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 20, fontSize: 14, cursor: 'pointer' },
  recIndicator: { color: '#c0392b', fontSize: 13, fontWeight: 700, marginBottom: 10, textAlign: 'center', animation: 'blink 1s step-end infinite' },
  listWrap:  { marginTop: 8 },
  listHeader:{ fontSize: 13, fontWeight: 700, color: '#7A5C3A', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #E8DFD0' },
  emptyMsg:  { fontSize: 13, color: '#B09060', textAlign: 'center', padding: '24px 0' },
  itemCard:  { border: '1px solid #E8DFD0', borderRadius: 6, padding: 14, marginBottom: 10, background: '#FAFAF5' },
  itemTitle: { fontSize: 14, fontWeight: 700, color: '#3A2A12', marginBottom: 6 },
  itemDate:  { fontSize: 12, color: '#9A7A50', fontWeight: 400 },
  itemMemo:  { fontSize: 12, color: '#7A5C3A', marginTop: 6, lineHeight: 1.5 },
  itemActions:{ display: 'flex', gap: 6, marginTop: 10 },
  editBtn:   { padding: '4px 12px', fontSize: 12, border: '1px solid #C4A882', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#7A5C3A' },
  deleteBtn: { padding: '4px 12px', fontSize: 12, border: '1px solid #e74c3c', borderRadius: 3, background: '#fff', cursor: 'pointer', color: '#e74c3c' },
  saveBtn:   { padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 3, background: '#8B7355', color: '#fff', cursor: 'pointer' },
  cancelBtn: { padding: '5px 14px', fontSize: 12, border: '1px solid #aaa', borderRadius: 3, background: '#fff', color: '#666', cursor: 'pointer' },
};
