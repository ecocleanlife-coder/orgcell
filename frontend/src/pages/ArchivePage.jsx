/**
 * ArchivePage.jsx — §8 자료실 레이아웃
 *
 * §8 레이아웃:
 *   좌측: 선택된 섹션 콘텐츠 (사진 업로드 / 인물 정보 입력)
 *   우측: 메뉴 버튼 세로 배치
 *     [사진자료실] [주요자료실] [주요약력] [자서전] [작품실] [육성녹음] [공유앨범]
 *     ─── 구분선 ───
 *     [초대하기] → InviteModal
 *     [입장권 발급] → AccessPassModal
 *     [접근요청관리] → 좌측 인라인
 *
 * §10: 공개 체크 → 박물관 상단 메뉴에 전시관 자동 추가
 * §11: 공유앨범 — 생성/설정, 실제 앨범은 SharedAlbum 컴포넌트
 * §14: 관장만 접근 가능
 * §31: 헤더 좌측에 ← 돌아가기
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate }       from 'react-router-dom';
import Footer                           from '../components/common/Footer';
import { useAuthStore }                 from '../store/authStore';
import { useTreeStore }                 from '../store/treeStore';
import toast                            from 'react-hot-toast';
import InviteModal     from '../components/modals/InviteModal';
import AccessPassModal from '../components/modals/AccessPassModal';

// ─── API 헬퍼 ─────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res  = await fetch(path, { credentials: 'include', ...opts });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ─── 우측 메뉴 정의 (§8) ─────────────────────────────────────────────────────
const CONTENT_BTNS = [
  { key: 'photo',         label: '사진자료실' },
  { key: 'document',      label: '주요자료실' },
  { key: 'biography',     label: '주요약력'   },
  { key: 'autobiography', label: '자서전'     },
  { key: 'works',         label: '작품실'     },
  { key: 'voice',         label: '육성녹음'   },
  { key: 'shared-album',  label: '공유앨범'   },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function ArchivePage() {
  const { subdomain } = useParams();
  const navigate      = useNavigate();

  const { isAuthenticated, isCuratorOf, lang, setLang, logout } = useAuthStore();
  const { nodes, siteId, curatorId } = useTreeStore();

  const [active,      setActive]      = useState('photo');
  const [museum,      setMuseum]      = useState(null);
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [passOpen,    setPassOpen]    = useState(false);

  const isCurator = isCuratorOf(subdomain);

  // 박물관 정보 로드
  useEffect(() => {
    api(`/api/museum/${subdomain}`)
      .then(d => setMuseum(d.museum ?? d))
      .catch(() => {});
  }, [subdomain]);

  // §14: 비관장 접근 차단
  useEffect(() => {
    if (isAuthenticated === false || (isAuthenticated && !isCurator)) {
      toast.error('관장만 자료실에 접근할 수 있습니다.');
      navigate(`/${subdomain}`, { replace: true });
    }
  }, [isCurator, isAuthenticated]);

  const museumName  = museum?.museum_name ?? museum?.name ?? `${subdomain} 가족유산박물관`;
  const curatorNode = nodes.find(n => n.personId === curatorId) ?? null;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  // 우측 액션 버튼 클릭 핸들러
  function handleActionBtn(key) {
    if (key === 'invite')      { setInviteOpen(true);  return; }
    if (key === 'access-pass') { setPassOpen(true);    return; }
    setActive(key);
  }

  return (
    <div style={s.page}>

      {/* §31 헤더 */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(`/${subdomain}`)}>← 돌아가기</button>
        <span style={s.headerTitle}>{museumName} — 자료실</span>
        <div style={s.headerRight}>
          <select value={lang} onChange={e => setLang(e.target.value)} style={s.langSel}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      {/* §8 본문 */}
      <div style={s.body}>

        {/* 좌측: 콘텐츠 */}
        <main style={s.main}>
          <ActiveSection
            sectionKey={active}
            subdomain={subdomain}
            siteId={siteId}
            curatorNode={curatorNode}
          />
        </main>

        {/* 우측: 메뉴 버튼 세로 배치 */}
        <aside style={s.aside}>
          {CONTENT_BTNS.map(b => (
            <button
              key={b.key}
              style={{ ...s.menuBtn, ...(active === b.key ? s.menuBtnActive : {}) }}
              onClick={() => setActive(b.key)}
            >
              {b.label}
            </button>
          ))}

          <div style={s.divider} />

          <button style={s.menuBtn} onClick={() => handleActionBtn('invite')}>초대하기</button>
          <button style={s.menuBtn} onClick={() => handleActionBtn('access-pass')}>입장권 발급</button>
          <button
            style={{ ...s.menuBtn, ...(active === 'access-mgmt' ? s.menuBtnActive : {}) }}
            onClick={() => setActive('access-mgmt')}
          >
            접근요청관리
          </button>
        </aside>
      </div>

      {/* 모달 */}
      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        siteId={siteId}
        subdomain={subdomain}
        museumName={museumName}
      />
      <AccessPassModal
        isOpen={passOpen}
        onClose={() => setPassOpen(false)}
        isCurator={true}
        siteId={siteId}
        subdomain={subdomain}
        museumName={museumName}
      />

      {/* §20 Footer */}
      <Footer variant="minimal" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 활성 섹션 라우터
// ══════════════════════════════════════════════════════════════════════════════
function ActiveSection({ sectionKey, subdomain, siteId, curatorNode }) {
  switch (sectionKey) {
    case 'photo':         return <PhotoSection        siteId={siteId} curatorNode={curatorNode} />;
    case 'document':      return <TextUploadSection   label="주요자료" type="document"      siteId={siteId} />;
    case 'biography':     return <TextUploadSection   label="주요약력" type="biography"     siteId={siteId} />;
    case 'autobiography': return <TextUploadSection   label="자서전"   type="autobiography" siteId={siteId} />;
    case 'works':         return <TextUploadSection   label="작품"     type="works"         siteId={siteId} />;
    case 'voice':         return <VoiceSection        siteId={siteId} />;
    case 'shared-album':  return <SharedAlbumSection  subdomain={subdomain} siteId={siteId} />;
    case 'access-mgmt':   return <AccessMgmtSection   siteId={siteId} />;
    default:              return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 사진자료실 (§8: 사진 업로드 + 인물 정보 입력)
// ══════════════════════════════════════════════════════════════════════════════
function PhotoSection({ siteId, curatorNode }) {
  const { invalidate } = useTreeStore();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(curatorNode?.photoUrl ?? null);
  const [isPublic,  setIsPublic]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  // 인물 정보 폼 상태 (curatorNode 값으로 초기화)
  const [form, setForm] = useState({
    name:       curatorNode?.name       ?? '',
    birth_date: curatorNode?.birthDate  ?? '',
    gender:     curatorNode?.gender     ?? '',
    is_deceased: curatorNode?.isDeceased ?? false,
    death_date: curatorNode?.deathDate  ?? '',
    bio1:       curatorNode?.bio1       ?? '',
    bio2:       curatorNode?.bio2       ?? '',
    bio3:       curatorNode?.bio3       ?? '',
  });

  // curatorNode 변경 시 폼 동기화
  useEffect(() => {
    setForm({
      name:       curatorNode?.name       ?? '',
      birth_date: curatorNode?.birthDate  ?? '',
      gender:     curatorNode?.gender     ?? '',
      is_deceased: curatorNode?.isDeceased ?? false,
      death_date: curatorNode?.deathDate  ?? '',
      bio1:       curatorNode?.bio1       ?? '',
      bio2:       curatorNode?.bio2       ?? '',
      bio3:       curatorNode?.bio3       ?? '',
    });
    setPreview(curatorNode?.photoUrl ?? null);
  }, [curatorNode?.id]);

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleFile(file) {
    if (!file || !siteId || !curatorNode) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('is_public', isPublic ? '1' : '0');
      const res  = await fetch(`/api/persons/${siteId}/${curatorNode.id}/photo`, {
        method: 'POST', credentials: 'include', body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || '업로드 실패');
      setPreview(json.data?.photo_url ?? URL.createObjectURL(file));
      toast.success('사진이 업로드되었습니다.');
    } catch (e) { toast.error(e.message); }
    finally     { setUploading(false); }
  }

  // §9: [생성] — curatorNode 없을 때 활성
  async function handleCreate() {
    if (!form.name.trim()) { toast.error('이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      await api(`/api/persons/${siteId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name.trim(),
          birth_date: form.birth_date  || undefined,
          gender:     form.gender      || undefined,
          is_deceased: form.is_deceased,
          death_date: form.is_deceased ? (form.death_date || undefined) : undefined,
          bio1:       form.bio1        || undefined,
          bio2:       form.bio2        || undefined,
          bio3:       form.bio3        || undefined,
        }),
      });
      toast.success('인물이 생성되었습니다.');
      await invalidate();
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  // §9: [수정] — curatorNode 있을 때 활성
  async function handleUpdate() {
    if (!form.name.trim()) { toast.error('이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      await api(`/api/persons/${siteId}/${curatorNode.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name.trim(),
          birth_date: form.birth_date  || null,
          gender:     form.gender      || null,
          is_deceased: form.is_deceased,
          death_date: form.is_deceased ? (form.death_date || null) : null,
          bio1:       form.bio1        || null,
          bio2:       form.bio2        || null,
          bio3:       form.bio3        || null,
        }),
      });
      toast.success('인물 정보가 수정되었습니다.');
      await invalidate();
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  // §9: [제거] — curatorNode 있을 때 활성
  async function handleDelete() {
    if (!window.confirm('인물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setDeleting(true);
    try {
      await api(`/api/persons/${siteId}/${curatorNode.id}`, { method: 'DELETE' });
      toast.success('인물이 삭제되었습니다.');
      await invalidate();
    } catch (e) { toast.error(e.message); }
    finally     { setDeleting(false); }
  }

  const hasPerson = !!curatorNode;

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>사진자료실 · 인물 정보</h2>
      <p style={s.hint}>프로필 사진 및 인물 정보를 관리하세요.</p>

      {/* 프로필 사진 업로드 */}
      <label style={s.fieldLabel}>프로필 사진</label>
      <div
        style={s.dropzone}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        {preview
          ? <img src={preview} alt="미리보기" style={s.previewImg} />
          : <span style={s.dropzoneText}>{uploading ? '업로드 중…' : '클릭 또는 사진을 여기에 끌어다 놓으세요'}</span>
        }
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files[0])} />

      <label style={s.publicLabel}>
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        &nbsp;박물관 상단 메뉴에 "사진전시관"으로 공개 (§10)
      </label>

      {/* 인물 정보 입력 폼 */}
      <div style={s.formDivider} />

      <label style={s.fieldLabel}>이름 <span style={s.required}>*</span></label>
      <input
        style={s.textInput}
        value={form.name}
        onChange={e => setField('name', e.target.value)}
        placeholder="성함을 입력하세요"
      />

      <label style={s.fieldLabel}>생년월일</label>
      <input
        style={s.textInput}
        type="date"
        value={form.birth_date}
        onChange={e => setField('birth_date', e.target.value)}
      />

      <label style={s.fieldLabel}>성별</label>
      <div style={s.radioRow}>
        {[['M','남'], ['F','여']].map(([v, l]) => (
          <label key={v} style={s.radioLabel}>
            <input
              type="radio" name="gender" value={v}
              checked={form.gender === v}
              onChange={() => setField('gender', v)}
            />
            &nbsp;{l}
          </label>
        ))}
        <label style={s.radioLabel}>
          <input
            type="radio" name="gender" value=""
            checked={form.gender === ''}
            onChange={() => setField('gender', '')}
          />
          &nbsp;미지정
        </label>
      </div>

      <label style={s.publicLabel}>
        <input
          type="checkbox"
          checked={form.is_deceased}
          onChange={e => setField('is_deceased', e.target.checked)}
        />
        &nbsp;사망
      </label>

      {form.is_deceased && (
        <>
          <label style={{ ...s.fieldLabel, marginTop: 8 }}>사망일</label>
          <input
            style={s.textInput}
            type="date"
            value={form.death_date}
            onChange={e => setField('death_date', e.target.value)}
          />
        </>
      )}

      <label style={{ ...s.fieldLabel, marginTop: 8 }}>대표정보 1</label>
      <input
        style={s.textInput}
        value={form.bio1}
        onChange={e => setField('bio1', e.target.value)}
        placeholder="예: 前 OO대학교 교수"
      />

      <label style={s.fieldLabel}>대표정보 2</label>
      <input
        style={s.textInput}
        value={form.bio2}
        onChange={e => setField('bio2', e.target.value)}
        placeholder="예: OO회사 창업자"
      />

      <label style={s.fieldLabel}>대표정보 3</label>
      <input
        style={s.textInput}
        value={form.bio3}
        onChange={e => setField('bio3', e.target.value)}
        placeholder="예: 국가유공자"
      />

      {/* §9 버튼: 미등록 → [생성] 활성 / 등록됨 → [수정][제거] 활성 */}
      <div style={{ ...s.rowBetween, marginTop: 16 }}>
        <button
          style={{ ...s.crudBtn, ...s.createBtn, ...(!hasPerson ? {} : s.btnDisabled) }}
          disabled={hasPerson || saving}
          onClick={handleCreate}
        >
          {saving && !hasPerson ? '생성 중…' : '생성'}
        </button>
        <button
          style={{ ...s.crudBtn, ...s.updateBtn, ...(hasPerson ? {} : s.btnDisabled) }}
          disabled={!hasPerson || saving}
          onClick={handleUpdate}
        >
          {saving && hasPerson ? '수정 중…' : '수정'}
        </button>
        <button
          style={{ ...s.crudBtn, ...s.deleteBtn, ...(hasPerson ? {} : s.btnDisabled) }}
          disabled={!hasPerson || deleting}
          onClick={handleDelete}
        >
          {deleting ? '삭제 중…' : '제거'}
        </button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 텍스트 업로드 (약력·자서전·자료·작품)
// ══════════════════════════════════════════════════════════════════════════════
function TextUploadSection({ label, type, siteId }) {
  const [text,     setText]     = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving,   setSaving]   = useState(false);

  // 기존 데이터 로드
  useEffect(() => {
    if (!siteId) return;
    api(`/api/exhibition?siteId=${siteId}&type=${type}`)
      .then(d => {
        const item = Array.isArray(d) ? d[0] : (d.items ?? [])[0];
        if (item) { setText(item.content ?? ''); setIsPublic(!!item.is_public); }
      })
      .catch(() => {});
  }, [siteId, type]);

  async function save() {
    setSaving(true);
    try {
      await api('/api/exhibition', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, type, content: text, is_public: isPublic }),
      });
      toast.success('저장했습니다.');
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  const exhibitName = { document: '자료전시관', biography: '약력전시관', autobiography: '자서전전시관', works: '작품전시관' }[type] ?? '전시관';

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>{label}</h2>
      <textarea
        style={s.textarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`${label} 내용을 입력하세요…`}
        rows={12}
      />
      <div style={s.rowBetween}>
        <label style={s.publicLabel}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
          &nbsp;"{exhibitName}"으로 공개 (§10)
        </label>
        <button style={s.saveBtn} onClick={save} disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 육성녹음
// ══════════════════════════════════════════════════════════════════════════════
function VoiceSection({ siteId }) {
  const fileRef = useRef(null);
  const [file,      setFile]      = useState(null);
  const [isPublic,  setIsPublic]  = useState(false);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file || !siteId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('voice', file);
      fd.append('is_public', isPublic ? '1' : '0');
      fd.append('siteId', siteId);
      await api('/api/voice/upload', { method: 'POST', body: fd });
      toast.success('음성 파일이 업로드되었습니다.');
      setFile(null);
    } catch (e) { toast.error(e.message); }
    finally     { setUploading(false); }
  }

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>육성녹음</h2>
      <p style={s.hint}>음성·영상 파일을 업로드하세요. 공개 시 "음성전시관"으로 표시됩니다. (§10)</p>
      <input type="file" accept="audio/*,video/*" ref={fileRef} hidden onChange={e => setFile(e.target.files[0])} />
      <button style={s.uploadBtn} onClick={() => fileRef.current?.click()}>
        음성/영상 파일 선택
      </button>
      {file && <p style={s.fileName}>{file.name}</p>}
      <div style={s.rowBetween}>
        <label style={s.publicLabel}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
          &nbsp;"음성전시관"으로 공개 (§10)
        </label>
        {file && (
          <button style={s.saveBtn} onClick={upload} disabled={uploading}>
            {uploading ? '업로드 중…' : '업로드'}
          </button>
        )}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 공유앨범 관리 (§11)
// ══════════════════════════════════════════════════════════════════════════════
function SharedAlbumSection({ subdomain, siteId }) {
  const [album,   setAlbum]   = useState(null);   // 기존 앨범 정보
  const [scope,   setScope]   = useState('family');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // 기존 공유앨범 로드
  useEffect(() => {
    if (!siteId) return;
    api(`/api/album/shared?siteId=${siteId}`)
      .then(d => setAlbum(d.album ?? d ?? null))
      .catch(() => setAlbum(null))
      .finally(() => setLoading(false));
  }, [siteId]);

  async function create() {
    setSaving(true);
    try {
      const d = await api('/api/album/shared', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, scope }),
      });
      setAlbum(d.album ?? d);
      toast.success('공유앨범이 생성되어 박물관 상단 메뉴에 추가되었습니다. (§11)');
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  async function updateScope() {
    if (!album?.id) return;
    setSaving(true);
    try {
      await api(`/api/album/shared/${album.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      setAlbum(prev => ({ ...prev, scope }));
      toast.success('공개범위가 변경되었습니다.');
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  if (loading) return <section style={s.section}><p style={s.hint}>불러오는 중…</p></section>;

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>공유앨범 (§11)</h2>
      <p style={s.hint}>
        로그인 없이 사진 업로드·다운로드 가능. 생성 즉시 박물관 상단 메뉴에 노출됩니다.
      </p>

      {/* 공개범위 */}
      <label style={s.fieldLabel}>공개범위</label>
      <div style={s.radioCol}>
        {[['public','전체공개'],['family','가족만'],['link','링크만']].map(([v,l]) => (
          <label key={v} style={s.radioLabel}>
            <input
              type="radio" value={v}
              checked={(album?.scope ?? scope) === v}
              onChange={() => { setScope(v); }}
            />
            &nbsp;{l}
          </label>
        ))}
      </div>

      {album ? (
        <>
          <div style={s.albumInfo}>
            <span style={s.albumBadge}>활성 공유앨범</span>
            <span style={s.albumLink}>
              링크: <a href={`/${subdomain}/exhibition/shared-album`} target="_blank" rel="noreferrer" style={s.anchor}>
                /{subdomain}/exhibition/shared-album
              </a>
            </span>
          </div>
          <button style={s.saveBtn} onClick={updateScope} disabled={saving}>
            {saving ? '저장 중…' : '공개범위 변경'}
          </button>
        </>
      ) : (
        <button style={s.saveBtn} onClick={create} disabled={saving}>
          {saving ? '생성 중…' : '공유앨범 생성'}
        </button>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 접근요청관리
// ══════════════════════════════════════════════════════════════════════════════
function AccessMgmtSection({ siteId }) {
  const [reqs,    setReqs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    api(`/api/access/${siteId}/requests`)
      .then(d => setReqs(Array.isArray(d) ? d : (d.requests ?? [])))
      .catch(() => setReqs([]))
      .finally(() => setLoading(false));
  }, [siteId]);

  async function respond(id, status) {
    try {
      await api(`/api/access/respond/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setReqs(prev => prev.filter(r => r.id !== id));
      toast.success(status === 'approved' ? '승인했습니다.' : '거절했습니다.');
    } catch (e) { toast.error(e.message); }
  }

  if (loading) return <section style={s.section}><p style={s.hint}>불러오는 중…</p></section>;

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>접근요청관리</h2>
      {reqs.length === 0 ? (
        <p style={s.hint}>처리 대기 중인 요청이 없습니다.</p>
      ) : (
        <ul style={s.reqList}>
          {reqs.map(r => (
            <li key={r.id} style={s.reqItem}>
              <span style={s.reqName}>{r.requester_name ?? r.user_email ?? r.id}</span>
              {r.message && <span style={s.reqMsg}>"{r.message}"</span>}
              <div style={s.reqBtns}>
                <button style={s.approveBtn} onClick={() => respond(r.id, 'approved')}>승인</button>
                <button style={s.rejectBtn}  onClick={() => respond(r.id, 'rejected')}>거절</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: '100vh', background: '#F5F0E8', display: 'flex', flexDirection: 'column' },
  header:      { display: 'flex', alignItems: 'center', padding: '0 20px', height: 52, background: '#FDFBF7', borderBottom: '1px solid #C4A882', position: 'sticky', top: 0, zIndex: 50, gap: 12 },
  backBtn:     { background: 'none', border: 'none', color: '#8B7355', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: 700, color: '#5a4a35', textAlign: 'center' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  langSel:     { padding: '4px 6px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', background: '#FAFAF5' },
  logoutBtn:   { padding: '4px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },

  body:  { display: 'flex', flex: 1 },
  main:  { flex: 1, overflowY: 'auto', padding: 24 },
  aside: { width: 140, background: '#FDFBF7', borderLeft: '1px solid #E0D5C5', display: 'flex', flexDirection: 'column', padding: '12px 8px', gap: 6, flexShrink: 0 },

  menuBtn: {
    width: '100%', padding: '8px 6px', fontSize: 12, fontWeight: 600,
    background: '#FDF8F0', border: '1px solid #C4A882',
    borderBottom: '2px solid #9a7a50', borderRight: '2px solid #b09060',
    borderRadius: 5, color: '#7a5c38', cursor: 'pointer', textAlign: 'left',
    boxShadow: '1px 1px 0 #c4a87a',
  },
  menuBtnActive: { background: '#8B7355', color: '#fff', borderColor: '#7a5c38' },
  divider:       { height: 1, background: '#E0D5C5', margin: '4px 0' },

  section:      { maxWidth: 640 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: '#5a4a35', margin: '0 0 8px' },
  hint:         { fontSize: 13, color: '#8B7355', lineHeight: 1.6, margin: '0 0 12px' },
  fieldLabel:   { fontSize: 12, fontWeight: 600, color: '#5a4a35', marginBottom: 6, display: 'block' },

  dropzone: {
    border: '2px dashed #C4A882', borderRadius: 8, background: '#FAFAF5',
    width: '100%', height: 200, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', marginBottom: 12, overflow: 'hidden',
  },
  dropzoneText: { fontSize: 13, color: '#B09060', textAlign: 'center', padding: 16 },
  previewImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  publicLabel:  { display: 'flex', alignItems: 'center', fontSize: 13, color: '#5a4a35', cursor: 'pointer', gap: 4 },
  textarea:     { width: '100%', padding: '10px 12px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#333', background: '#FAFAF5', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 },
  uploadBtn:    { padding: '8px 16px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer', marginBottom: 8 },
  fileName:     { fontSize: 12, color: '#8B7355', margin: '0 0 8px' },
  saveBtn:      { padding: '9px 24px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  rowBetween:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  radioCol:     { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  radioLabel:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5a4a35', cursor: 'pointer' },

  albumInfo: { display: 'flex', flexDirection: 'column', gap: 6, background: '#F0F9F0', border: '1px solid #8BC48A', borderRadius: 5, padding: '10px 14px', marginBottom: 12 },
  albumBadge:{ fontSize: 11, fontWeight: 700, color: '#2d6b2d' },
  albumLink: { fontSize: 12, color: '#5a4a35' },
  anchor:    { color: '#8B7355', textDecoration: 'underline' },

  textInput:   { width: '100%', padding: '7px 10px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#333', background: '#FAFAF5', boxSizing: 'border-box', marginBottom: 8 },
  radioRow:    { display: 'flex', gap: 16, marginBottom: 8 },
  formDivider: { height: 1, background: '#E0D5C5', margin: '14px 0' },
  required:    { color: '#c0392b' },
  crudBtn:     { flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none' },
  createBtn:   { background: '#5a8a5a', color: '#fff' },
  updateBtn:   { background: '#8B7355', color: '#fff' },
  deleteBtn:   { background: '#c0392b', color: '#fff' },
  btnDisabled: { background: '#ccc', color: '#888', cursor: 'not-allowed' },

  reqList:    { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  reqItem:    { background: '#FAFAF5', border: '1px solid #C4A882', borderRadius: 4, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  reqName:    { fontSize: 14, fontWeight: 700, color: '#3a2a1a' },
  reqMsg:     { fontSize: 12, color: '#8B7355', fontStyle: 'italic' },
  reqBtns:    { display: 'flex', gap: 8, marginTop: 6 },
  approveBtn: { padding: '5px 14px', background: '#5a8a5a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  rejectBtn:  { padding: '5px 14px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
};
