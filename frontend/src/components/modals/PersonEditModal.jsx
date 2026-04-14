/**
 * PersonEditModal.jsx — §6 인물 정보 입력/수정 모달
 *
 * 트리거: treeStore.selectedPersonId (더블클릭)
 *
 * §6 권한 분기:
 *   - 관장 본인 카드 더블클릭 → /{subdomain}/archive 로 이동 (모달 미표시)
 *   - 관장이 아닌 사용자 → clearSelection() 후 무반응
 *   - 관장: 모든 인물 수정 가능
 *
 * §27 입력 필드:
 *   성(姓)/이름 분리 · 성별 · 생년월일(년/월/일+음력) · 사망일 · 영문여권명 · bio1/2/3
 *
 * API: PUT /api/persons/:siteId/:personId (dynamic SET, 변경 필드만 전송)
 * 저장 후: treeStore.invalidate() → 트리 갱신
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTreeStore }           from '../../store/treeStore';
import { useAuthStore }           from '../../store/authStore';
import toast                      from 'react-hot-toast';

// ─── 이름 분리 헬퍼 (한국 성명: 첫 1글자 = 성) ─────────────────────────────────
function splitKoreanName(fullName = '') {
  const trimmed = fullName.trim();
  if (!trimmed) return { lastName: '', firstName: '' };
  return { lastName: trimmed.slice(0, 1), firstName: trimmed.slice(1) };
}

// ─── 날짜 분리 헬퍼 (YYYY-MM-DD 또는 ISO 문자열 → 년/월/일) ───────────────────
function splitDate(dateStr = '') {
  if (!dateStr) return { y: '', m: '', d: '' };
  // ISO datetime (2000-01-27T00:00:00.000Z) → 앞 10자만 사용
  const clean = String(dateStr).slice(0, 10);
  const [y = '', m = '', d = ''] = clean.split('-');
  return { y, m: m.replace(/^0/, ''), d: d.replace(/^0/, '') };
}

function joinDate(y, m, d) {
  if (!y) return null;
  const mm = m ? String(m).padStart(2, '0') : '01';
  const dd = d ? String(d).padStart(2, '0') : '01';
  return `${y}-${mm}-${dd}`;
}

// ─── API 헬퍼 ─────────────────────────────────────────────────────────────────
async function putPerson(siteId, personDbId, body) {
  const res = await fetch(`/api/persons/${siteId}/${personDbId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `오류 ${res.status}`);
  return json;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PersonEditModal() {
  const { subdomain } = useParams();
  const navigate = useNavigate();

  const {
    selectedPersonId, clearSelection,
    nodes, siteId, curatorId, invalidate,
  } = useTreeStore();

  const { isCuratorOf } = useAuthStore();
  const isCurator = isCuratorOf(subdomain);

  // 선택된 노드
  const node = nodes.find(n => n.personId === selectedPersonId) ?? null;

  // ── §6 권한 분기 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPersonId || !node) return;

    // 관장 본인 카드 → archive 이동
    if (node.role === 'curator' && isCurator) {
      clearSelection();
      navigate(`/${subdomain}/archive`);
      return;
    }

    // 관장이 아닌 사용자 → 무반응
    if (!isCurator) {
      clearSelection();
    }
  }, [selectedPersonId]);

  // ── 폼 상태 ────────────────────────────────────────────────────────────────
  const [lastName,   setLastName]   = useState('');
  const [firstName,  setFirstName]  = useState('');
  const [gender,     setGender]     = useState('');
  const [birthY,     setBirthY]     = useState('');
  const [birthM,     setBirthM]     = useState('');
  const [birthD,     setBirthD]     = useState('');
  const [birthLunar, setBirthLunar] = useState(false);
  const [deceased,   setDeceased]   = useState(false);
  const [deathY,     setDeathY]     = useState('');
  const [deathM,     setDeathM]     = useState('');
  const [deathD,     setDeathD]     = useState('');
  const [engLast,    setEngLast]    = useState('');
  const [engFirst,   setEngFirst]   = useState('');
  const [bio1,       setBio1]       = useState('');
  const [bio2,       setBio2]       = useState('');
  const [bio3,       setBio3]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [preview,    setPreview]    = useState('');
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef(null);

  // 노드 변경 시 폼 초기화
  useEffect(() => {
    if (!node) return;
    const { lastName: ln, firstName: fn } = splitKoreanName(node.name);
    const birth = splitDate(node.birthDate);
    const death = splitDate(node.deathDate);
    const [engL = '', engF = ''] = (node.nameEn || '').split(' ');

    setLastName(ln);   setFirstName(fn);
    // DB는 'M'/'F' 저장, 모달 내부는 'male'/'female' 사용
    const gNorm = node.gender === 'M' ? 'male' : node.gender === 'F' ? 'female' : (node.gender || '');
    setGender(gNorm);
    setBirthY(birth.y); setBirthM(birth.m); setBirthD(birth.d);
    setBirthLunar(false); // birthLunar는 node에 없음 — 기본 양력
    setDeceased(node.isDeceased || false);
    setDeathY(death.y); setDeathM(death.m); setDeathD(death.d);
    setEngLast(engL);  setEngFirst(engF);
    setBio1(node.bio1 || ''); setBio2(node.bio2 || ''); setBio3(node.bio3 || '');
    setSaving(false);
    setPreview(node.photoUrl ? `${node.photoUrl}?v=${Date.now()}` : '');
    setUploading(false);
  }, [selectedPersonId]);

  // ── 사진 업로드 ────────────────────────────────────────────────────────────
  async function handlePhotoFile(e) {
    const file = e.target.files?.[0];
    if (!file || !siteId || !node?.id) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const res  = await fetch(`/api/persons/${siteId}/${node.id}/photo`, { method: 'POST', body: fd, credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || '업로드 실패');
      const url = json.data?.photo_url;
      setPreview(url ? `${url}?v=${Date.now()}` : URL.createObjectURL(file));
      await invalidate();
      toast.success('사진이 저장됐습니다.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── 저장 ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!node || !siteId) return;
    if (!lastName.trim()) { toast.error('성(姓)을 입력하세요.'); return; }
    if (!firstName.trim()) { toast.error('이름을 입력하세요.'); return; }

    setSaving(true);
    try {
      const body = {
        name:        `${lastName.trim()}${firstName.trim()}`,
        gender:      gender === 'male' ? 'M' : gender === 'female' ? 'F' : (gender || null),
        birth_date:  joinDate(birthY, birthM, birthD),
        birth_lunar: birthLunar,
        is_deceased: deceased,
        death_date:  deceased ? joinDate(deathY, deathM, deathD) : null,
        name_en:     [engLast, engFirst].filter(Boolean).join(' ') || null,
        bio1:        bio1.trim() || null,
        bio2:        bio2.trim() || null,
        bio3:        bio3.trim() || null,
      };

      await putPerson(siteId, node.id, body);
      toast.success('저장했습니다.');
      clearSelection();
      await invalidate(); // 트리 갱신
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  // 모달 닫기
  function handleClose() { clearSelection(); }

  // 표시 조건: 선택된 인물이 있고, 관장이며, 아직 redirect 처리 안 된 카드
  if (!selectedPersonId || !node || !isCurator || node.role === 'curator') return null;

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div style={s.backdrop} onClick={handleClose} />

      <div style={s.modal} role="dialog" aria-modal="true">
        {/* 헤더 */}
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{node.name} 정보 수정</span>
          <button style={s.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <div style={s.body}>
          {/* 사진 박스 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              style={s.photoBox}
              onDoubleClick={() => fileRef.current?.click()}
              title="더블클릭 또는 버튼으로 사진 변경"
            >
              {preview
                ? <img src={preview} alt={node.name} style={s.photoImg} />
                : <span style={{ fontSize: 40, color: '#C4A882' }}>{node.gender === 'F' || node.gender === 'female' ? '♀' : '♂'}</span>
              }
              {uploading && <div style={s.uploadingOverlay}>업로드 중…</div>}
            </div>
            <button style={s.photoBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
              {preview ? '사진 변경' : '사진 추가'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoFile} />
          </div>

          {/* 성 / 이름 (§27 분리) */}
          <div style={s.row2}>
            <Field label={<>성 (姓) <Req /></>}>
              <input style={s.input} value={lastName}  onChange={e => setLastName(e.target.value)} />
            </Field>
            <Field label={<>이름 <Req /></>}>
              <input style={s.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </Field>
          </div>

          {/* 성별 */}
          <Field label="성별">
            <div style={s.radioRow}>
              <RadioBtn label="남" value="male"   checked={gender === 'male'}   onChange={setGender} />
              <RadioBtn label="여" value="female" checked={gender === 'female'} onChange={setGender} />
            </div>
          </Field>

          {/* 생년월일 */}
          <Field label={<>생년월일 <Opt /></>}>
            <div style={s.dateRow}>
              <input style={{ ...s.input, width: 68 }} value={birthY} onChange={e => setBirthY(e.target.value)}  placeholder="년"  maxLength={4} />
              <input style={{ ...s.input, width: 46 }} value={birthM} onChange={e => setBirthM(e.target.value)} placeholder="월"  maxLength={2} />
              <input style={{ ...s.input, width: 46 }} value={birthD} onChange={e => setBirthD(e.target.value)} placeholder="일"  maxLength={2} />
              <label style={s.checkLabel}>
                <input type="checkbox" checked={birthLunar} onChange={e => setBirthLunar(e.target.checked)} /> 음력
              </label>
            </div>
          </Field>

          {/* 고인 여부 + 사망일 (§29) */}
          <Field label="">
            <label style={s.checkLabel}>
              <input type="checkbox" checked={deceased} onChange={e => setDeceased(e.target.checked)} />
              &nbsp;고인 (사망)
            </label>
          </Field>
          {deceased && (
            <Field label={<>사망일 <Opt /></>}>
              <div style={s.dateRow}>
                <input style={{ ...s.input, width: 68 }} value={deathY} onChange={e => setDeathY(e.target.value)} placeholder="년"  maxLength={4} />
                <input style={{ ...s.input, width: 46 }} value={deathM} onChange={e => setDeathM(e.target.value)} placeholder="월" maxLength={2} />
                <input style={{ ...s.input, width: 46 }} value={deathD} onChange={e => setDeathD(e.target.value)} placeholder="일" maxLength={2} />
              </div>
            </Field>
          )}

          {/* 영문 여권명 (§27 선택) */}
          <p style={s.sectionTitle}>영문 여권명 <Opt /></p>
          <div style={s.row2}>
            <Field label="영문 성">
              <input style={s.input} value={engLast}  onChange={e => setEngLast(e.target.value)}  placeholder="LEE" />
            </Field>
            <Field label="영문 이름">
              <input style={s.input} value={engFirst} onChange={e => setEngFirst(e.target.value)} placeholder="SANGHUN" />
            </Field>
          </div>

          {/* 대표 정보 3줄 (§4) */}
          <p style={s.sectionTitle}>대표 정보 (카드 표시 최대 3줄)</p>
          <Field label="1줄">
            <input style={s.input} value={bio1} onChange={e => setBio1(e.target.value)} placeholder="예) 서울대학교 경영학과" maxLength={40} />
          </Field>
          <Field label="2줄">
            <input style={s.input} value={bio2} onChange={e => setBio2(e.target.value)} placeholder="예) 삼성전자 부사장" maxLength={40} />
          </Field>
          <Field label="3줄">
            <input style={s.input} value={bio3} onChange={e => setBio3(e.target.value)} placeholder="예) 1975년 서울 출생" maxLength={40} />
          </Field>
        </div>

        {/* 하단 버튼 */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={handleClose} disabled={saving}>취소</button>
          <button
            style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 공통 소컴포넌트 ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <span style={s.lbl}>{label}</span>}
      {children}
    </div>
  );
}

function RadioBtn({ label, value, checked, onChange }) {
  return (
    <label style={{ ...s.checkLabel, fontWeight: checked ? 600 : 400 }}>
      <input type="radio" value={value} checked={checked} onChange={() => onChange(value)} />
      &nbsp;{label}
    </label>
  );
}

function Req() { return <span style={{ color: '#C0392B' }}>*</span>; }
function Opt() { return <span style={s.opt}>(선택)</span>; }

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 800,
    cursor: 'pointer',
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 801,
    background: '#FDFBF7',
    border:       '1px solid #C4A882',
    borderRight:  '2px solid #b09060',
    borderBottom: '2px solid #9a7a50',
    boxShadow:    '2px 2px 0 #c4a87a, 0 12px 40px rgba(0,0,0,0.2)',
    borderRadius: 6,
    width: 460,
    maxWidth: '95vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.15s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: '1px solid #E8DFD0',
    flexShrink: 0,
  },
  modalTitle: { fontSize: 15, fontWeight: 700, color: '#5a4a35' },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 16, color: '#B09060', cursor: 'pointer', lineHeight: 1,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '12px 20px 16px',
    borderTop: '1px solid #E8DFD0',
    flexShrink: 0,
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  lbl:  { fontSize: 12, fontWeight: 600, color: '#6a5a45' },
  opt:  { fontSize: 11, color: '#A09070', fontWeight: 400, marginLeft: 4 },
  input: {
    padding: '8px 10px',
    border: '1px solid #C4A882', borderRadius: 4,
    fontSize: 13, color: '#333', background: '#FAFAF5',
    width: '100%', boxSizing: 'border-box', outline: 'none',
  },
  dateRow:   { display: 'flex', gap: 6, alignItems: 'center' },
  radioRow:  { display: 'flex', gap: 20, paddingTop: 4 },
  checkLabel:{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#5a4a35', cursor: 'pointer' },
  sectionTitle: { fontSize: 12, color: '#8B7355', fontWeight: 600, margin: '4px 0 0' },
  photoBox: {
    width: 100, height: 100, borderRadius: 8,
    border: '1px solid #C4A882', background: '#F0EAE0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative', cursor: 'pointer',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover' },
  uploadingOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
    color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  photoBtn: {
    padding: '5px 14px', fontSize: 12, cursor: 'pointer',
    background: 'none', border: '1px solid #C4A882',
    borderRadius: 4, color: '#8B7355',
  },
  cancelBtn: {
    padding: '9px 20px',
    background: 'none', border: '1px solid #C4A882',
    borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer',
  },
  saveBtn: {
    padding: '9px 28px',
    background: '#8B7355', color: '#fff',
    border: 'none', borderRadius: 4,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
};
