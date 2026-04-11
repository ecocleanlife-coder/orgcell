/**
 * panels/MyInfoPanel.jsx — §8 내 정보 수정
 *
 * 좌측 패널:
 *  - 180×180 사진 에디터 (업로드, 드래그 위치 조정, 크기 조절 핸들)
 *  - 인물정보 폼: 이름, 영문 성/이름, 성별, 생년월일, 사망 여부/사망일
 *  - [본인 인적사항 저장] 버튼
 *
 * 영문 이름 자동 로드:
 *  curatorNode의 nameEnFirst / nameEnLast 저장값이 있으면 폼에 자동 반영.
 */

import { useState, useEffect, useRef } from 'react';
import { toast }                        from 'react-hot-toast';
import { useTreeStore }                 from '../../store/treeStore';
import { savePerson, uploadPhoto }      from '../hooks/archiveApi';

export default function MyInfoPanel({ curatorNode, personId, siteId, mergeNotifs }) {
  const { invalidate } = useTreeStore();
  const fileRef        = useRef(null);

  const [preview,     setPreview]     = useState(null);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [photoScale,  setPhotoScale]  = useState(1);
  const [form,        setForm]        = useState({
    name: '', nameEnFirst: '', nameEnLast: '',
    gender: 'male', birthYear: '', birthMonth: '', birthDay: '',
    isDeceased: false, deathDate: '',
  });
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── curatorNode → 폼 동기화 (영문 이름 자동 로드 포함) ─────────────────────
  useEffect(() => {
    const ph = curatorNode?.photoUrl ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    if (!curatorNode) return;

    // ISO 타임스탬프 ("1990-01-12T00:00:00.000Z") → T 기준 앞만 파싱
    const bdate = curatorNode.birthDate ?? curatorNode.birth_date ?? '';
    const [by = '', bm = '', bd = ''] = bdate ? bdate.split('T')[0].split('-') : [];

    // 영문 이름: 저장된 값이 있으면 자동 로드, 없으면 빈 문자열
    const savedEnFirst = curatorNode.nameEnFirst ?? curatorNode.name_en_first ?? '';
    const savedEnLast  = curatorNode.nameEnLast  ?? curatorNode.name_en_last  ?? '';

    setForm({
      name:        curatorNode.name  ?? '',
      nameEnFirst: savedEnFirst,
      nameEnLast:  savedEnLast,
      gender:      curatorNode.gender ?? 'male',
      birthYear:   by,
      birthMonth:  bm,
      birthDay:    bd,
      isDeceased:  curatorNode.isDeceased ?? false,
      deathDate:   curatorNode.deathDate ?? curatorNode.death_date ?? '',
    });
  }, [curatorNode]);

  // ── 사진 드래그 ────────────────────────────────────────────────────────────
  function handleDragStart(e) {
    e.preventDefault();
    const sx = e.clientX - photoOffset.x;
    const sy = e.clientY - photoOffset.y;
    const onMove = ev => setPhotoOffset({ x: ev.clientX - sx, y: ev.clientY - sy });
    const onUp   = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }

  // ── 사진 업로드 ────────────────────────────────────────────────────────────
  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || !siteId || !personId) return;
    setUploading(true);
    try {
      const json   = await uploadPhoto(siteId, personId, file);
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

  // ── 본인 인적사항 저장 ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!siteId || !personId) return;
    setSaving(true);
    try {
      const birthDate = form.birthYear
        ? [
            form.birthYear,
            form.birthMonth?.padStart(2, '0'),
            form.birthDay?.padStart(2, '0'),
          ].filter(Boolean).join('-')
        : null;

      await savePerson(siteId, personId, {
        name:          form.name,
        name_en_first: form.nameEnFirst || null,
        name_en_last:  form.nameEnLast  || null,
        gender:        form.gender,
        birth_date:    birthDate,
        is_deceased:   form.isDeceased,
        death_date:    form.deathDate   || null,
      });
      await invalidate();
      toast.success('저장됐습니다.');
    } catch {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* 사진 에디터 180×180 */}
      <div
        data-testid="photo-drag-area"
        style={{ ...s.cardFrame, cursor: preview ? 'grab' : 'pointer' }}
        onPointerDown={preview ? handleDragStart : undefined}
        onClick={preview ? undefined : () => fileRef.current?.click()}
        onDrop={e => {
          e.preventDefault();
          fileRef.current.files = e.dataTransfer.files;
          handleFile({ target: fileRef.current });
        }}
        onDragOver={e => e.preventDefault()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="프로필"
              draggable={false}
              style={{
                ...s.photoImg,
                transform: `translate(${photoOffset.x}px,${photoOffset.y}px) scale(${photoScale})`,
              }}
            />
            <div
              data-testid="photo-resize-handle"
              style={s.resizeHandle}
              onPointerDown={e => {
                e.stopPropagation();
                const sy = e.clientY, sc = photoScale;
                const onMove = ev =>
                  setPhotoScale(Math.max(0.5, Math.min(3, sc + (ev.clientY - sy) * 0.005)));
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup',   onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup',   onUp);
              }}
            />
          </>
        ) : (
          <div style={s.cardEmpty}>
            <span style={{ fontSize: 32, color: '#C4A882' }}>📷</span>
            <p style={{ color: '#8B7355', fontSize: 12, margin: '8px 0 0', textAlign: 'center' }}>
              {uploading ? '업로드 중...' : '클릭 또는 사진을 끌어다 놓으세요'}
            </p>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onInput={handleFile}
      />

      {/* 통합 알림 §26-3 */}
      {mergeNotifs.length > 0 && (
        <div style={s.notifBanner}>
          <span style={{ fontSize: 12, color: '#8B3010' }}>
            자동 통합 알림 {mergeNotifs.length}건
          </span>
          <button style={s.btnWarn} onClick={() => toast('잘못된 통합 신고 기능 준비 중')}>
            잘못된 통합 신고
          </button>
        </div>
      )}

      {/* 인물정보 폼 */}
      <div style={s.form}>
        <label style={s.lbl}>이름</label>
        <input
          style={s.inp}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="성함"
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>성 (영문)</label>
            <input
              style={s.inp}
              value={form.nameEnLast}
              onChange={e => setForm(f => ({ ...f, nameEnLast: e.target.value }))}
              placeholder="Hong"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.lbl}>이름 (영문)</label>
            <input
              style={s.inp}
              value={form.nameEnFirst}
              onChange={e => setForm(f => ({ ...f, nameEnFirst: e.target.value }))}
              placeholder="Gildong"
            />
          </div>
        </div>

        <label style={s.lbl}>성별</label>
        <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
          {['male', 'female'].map(g => (
            <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="radio"
                value={g}
                checked={form.gender === g}
                onChange={() => setForm(f => ({ ...f, gender: g }))}
              />
              {g === 'male' ? '남' : '여'}
            </label>
          ))}
        </div>

        <label style={s.lbl}>생년월일</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            style={{ ...s.inp, flex: 2 }}
            value={form.birthYear}
            onChange={e => setForm(f => ({ ...f, birthYear: e.target.value }))}
            placeholder="년" maxLength={4}
          />
          <input
            style={{ ...s.inp, flex: 1 }}
            value={form.birthMonth}
            onChange={e => setForm(f => ({ ...f, birthMonth: e.target.value }))}
            placeholder="월" maxLength={2}
          />
          <input
            style={{ ...s.inp, flex: 1 }}
            value={form.birthDay}
            onChange={e => setForm(f => ({ ...f, birthDay: e.target.value }))}
            placeholder="일" maxLength={2}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', margin: '8px 0' }}>
          <input
            type="checkbox"
            checked={form.isDeceased}
            onChange={e => setForm(f => ({ ...f, isDeceased: e.target.checked }))}
          />
          사망
        </label>

        {form.isDeceased && (
          <>
            <label style={s.lbl}>사망일</label>
            <input
              style={s.inp}
              type="date"
              value={form.deathDate}
              onChange={e => setForm(f => ({ ...f, deathDate: e.target.value }))}
            />
          </>
        )}

        <button
          style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? '저장 중...' : '본인 인적사항 저장'}
        </button>
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  wrap:         { display: 'flex', flexDirection: 'column', height: '100%' },

  // 사진 에디터
  cardFrame:    { width: 180, height: 180, borderRadius: 8, border: '2px solid #C4A882', background: '#2a2a2a', overflow: 'hidden', position: 'relative', flexShrink: 0, alignSelf: 'center' },
  photoImg:     { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' },
  resizeHandle: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, background: '#C4A882', borderRadius: 2, cursor: 'se-resize', zIndex: 2 },
  cardEmpty:    { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 12 },

  // 알림 배너
  notifBanner:  { marginTop: 10, padding: '8px 10px', background: '#FFF3EB', border: '1px solid #E8A87C', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6 },
  btnWarn:      { padding: '6px 10px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 },

  // 폼
  form:         { marginTop: 14, flex: 1 },
  lbl:          { display: 'block', fontSize: 11, color: '#8B7355', marginBottom: 3, marginTop: 8 },
  inp:          { width: '100%', boxSizing: 'border-box', border: '1px solid #C4A882', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: '#FDFBF7', outline: 'none' },
  saveBtn:      { marginTop: 12, width: '100%', padding: '9px 0', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
