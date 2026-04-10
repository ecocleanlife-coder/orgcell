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

  const { isAuthenticated, isCuratorOf, lang, setLang, logout, fetchMe } = useAuthStore();
  const { nodes, siteId, curatorId, fetchTree, setSiteId } = useTreeStore();

  const [active,         setActive]         = useState('photo');
  const [museum,         setMuseum]         = useState(null);
  const [inviteOpen,     setInviteOpen]     = useState(false);
  const [passOpen,       setPassOpen]       = useState(false);
  const [authReady,      setAuthReady]      = useState(false); // fetchMe 완료 전 redirect 금지
  const [mergeAlerts,    setMergeAlerts]    = useState([]);    // §26-3 통합 알림
  const [mergeModalOpen, setMergeModalOpen] = useState(false);

  // 마운트 시 fetchMe → 완료 후 authReady=true + fetchTree
  useEffect(() => {
    fetchMe().finally(() => setAuthReady(true));
  }, []);

  const isCurator = isCuratorOf(subdomain);

  // 박물관 정보 로드 + siteId 설정
  useEffect(() => {
    api(`/api/museum/${subdomain}`)
      .then(d => {
        const m = d.museum ?? d;
        setMuseum(m);
        const id = m.id ?? m.site_id;
        if (id) setSiteId(id);
      })
      .catch(() => {});
  }, [subdomain]);

  // §14: 비관장 접근 차단 — authReady 이후에만 판단
  useEffect(() => {
    if (!authReady) return;
    if (isAuthenticated === false || (isAuthenticated && !isCurator)) {
      toast.error('관장만 자료실에 접근할 수 있습니다.');
      navigate(`/${subdomain}`, { replace: true });
      return;
    }
    // 관장 확인 후 트리 로드 + 통합 알림 조회
    fetchTree(subdomain);
    api(`/api/notifications?type=merge`)
      .then(d => setMergeAlerts(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {});
  }, [authReady, isCurator, isAuthenticated]);

  const museumName  = museum?.museum_name ?? museum?.name ?? `${subdomain} 가족유산박물관`;
  const curatorNode = nodes.find(n => n.personId === curatorId) ?? null;
  // siteId 로드 후 CRUD 활성 — 신규 박물관(curatorId=null)도 [생성] 가능
  const dataReady   = !!siteId;

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

  // authReady 전 — 빈 화면(redirect 방지)
  if (!authReady) {
    return <div style={s.page} />;
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
            ready={dataReady}
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

          {/* §26-3 잘못된 통합 신고 */}
          {mergeAlerts.length > 0 && (
            <button style={{ ...s.menuBtn, ...s.mergeAlertBtn }} onClick={() => setMergeModalOpen(true)}>
              잘못된 통합 신고
            </button>
          )}
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

      {/* §26-3 잘못된 통합 신고 모달 */}
      {mergeModalOpen && (
        <MergeReportModal
          alerts={mergeAlerts}
          siteId={siteId}
          onClose={() => setMergeModalOpen(false)}
          onReported={() => { setMergeAlerts([]); setMergeModalOpen(false); }}
        />
      )}

      {/* §20 Footer */}
      <Footer variant="minimal" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// §26-3 잘못된 통합 신고 모달
// ══════════════════════════════════════════════════════════════════════════════
function MergeReportModal({ alerts, siteId, onClose, onReported }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleReport(alertId) {
    setSubmitting(true);
    try {
      await api(`/api/notifications/${alertId}/report-wrong-merge`, { method: 'POST' });
      toast.success('신고가 접수되었습니다. 관리자 검토 후 처리됩니다.');
      onReported();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.mergeModal} role="dialog" aria-modal="true" aria-label="잘못된 통합 신고">
        <div style={s.mergeModalHeader}>
          <span style={s.mergeModalTitle}>잘못된 통합 신고 (§26-3)</span>
          <button style={s.mergeModalClose} onClick={onClose}>✕</button>
        </div>
        <p style={s.mergeModalDesc}>
          시스템이 자동으로 연결한 인물이 실제와 다른 경우 신고해 주세요.
          관리자 검토 후 분리 처리됩니다.
        </p>
        <ul style={s.mergeList}>
          {alerts.map(a => (
            <li key={a.id} style={s.mergeItem}>
              <span style={s.mergePersonId}>{a.mergedPersonId ?? a.person_id ?? '알 수 없음'}</span>
              <span style={s.mergeDate}>{a.mergedAt ? new Date(a.mergedAt).toLocaleDateString('ko-KR') : ''}</span>
              <button
                style={s.mergeReportBtn}
                disabled={submitting}
                onClick={() => handleReport(a.id)}
              >
                {submitting ? '신고 중…' : '신고'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 활성 섹션 라우터
// ══════════════════════════════════════════════════════════════════════════════
function ActiveSection({ sectionKey, subdomain, siteId, curatorNode, ready }) {
  switch (sectionKey) {
    case 'photo':         return <PhotoSection        siteId={siteId} curatorNode={curatorNode} ready={ready} />;
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
function PhotoSection({ siteId, curatorNode, ready }) {
  const { invalidate } = useTreeStore();
  const fileRef   = useRef(null);
  const dragRef   = useRef(null);   // { startX, startY, startOX, startOY }
  const resizeRef = useRef(null);   // { startY, startScale }

  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(curatorNode?.photoUrl ?? null);
  const [isPublic,  setIsPublic]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [offset,    setOffset]    = useState({ x: 0, y: 0 });
  const [scale,     setScale]     = useState(1.0);

  // 날짜 문자열(YYYY-MM-DD)을 { year, month, day }로 분해
  function splitDate(d) {
    if (!d) return { year: '', month: '', day: '' };
    const [y = '', m = '', dd = ''] = d.split('-');
    return { year: y, month: String(parseInt(m) || ''), day: String(parseInt(dd) || '') };
  }
  // { year, month, day } → YYYY-MM-DD (불완전 시 undefined)
  function joinDate(y, m, day) {
    if (!y || !m || !day) return undefined;
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // 이름(한글) → 성(1자) / 이름(나머지) 분리
  function splitName(n) {
    if (!n) return { last: '', first: '' };
    return { last: n[0] ?? '', first: n.slice(1) };
  }
  // 영문이름 → LastName / FirstName 분리 (첫 단어=성)
  function splitNameEn(n) {
    if (!n) return { last: '', first: '' };
    const parts = n.trim().split(/\s+/);
    return { last: parts[0] ?? '', first: parts.slice(1).join(' ') };
  }

  const initBirth  = splitDate(curatorNode?.birthDate);
  const initDeath  = splitDate(curatorNode?.deathDate);
  const initName   = splitName(curatorNode?.name);
  const initNameEn = splitNameEn(curatorNode?.nameEn ?? '');

  // 인물 정보 폼 상태 (curatorNode 값으로 초기화)
  const [form, setForm] = useState({
    name_last:        initName.last,
    name_first:       initName.first,
    name_en_last:     initNameEn.last,
    name_en_first:    initNameEn.first,
    name_legal_last:  curatorNode?.nameLegalLast   ?? '',
    name_legal_first: curatorNode?.nameLegalFirst  ?? '',
    name_other:       curatorNode?.nameOther       ?? '',
    birth_year:  initBirth.year,
    birth_month: initBirth.month,
    birth_day:   initBirth.day,
    birth_lunar: curatorNode?.birthLunar  ?? false,
    gender:      curatorNode?.gender      ?? '',
    is_deceased: curatorNode?.isDeceased  ?? false,
    death_year:  initDeath.year,
    death_month: initDeath.month,
    death_day:   initDeath.day,
    death_lunar: curatorNode?.deathLunar  ?? false,
    bio1:        curatorNode?.bio1        ?? '',
    bio2:        curatorNode?.bio2        ?? '',
    bio3:        curatorNode?.bio3        ?? '',
  });

  // curatorNode 변경 시 폼 동기화
  useEffect(() => {
    const b  = splitDate(curatorNode?.birthDate);
    const d  = splitDate(curatorNode?.deathDate);
    const n  = splitName(curatorNode?.name);
    const ne = splitNameEn(curatorNode?.nameEn ?? '');
    setForm({
      name_last:        n.last,
      name_first:       n.first,
      name_en_last:     ne.last,
      name_en_first:    ne.first,
      name_legal_last:  curatorNode?.nameLegalLast   ?? '',
      name_legal_first: curatorNode?.nameLegalFirst  ?? '',
      name_other:       curatorNode?.nameOther       ?? '',
      birth_year:  b.year,
      birth_month: b.month,
      birth_day:   b.day,
      birth_lunar: curatorNode?.birthLunar  ?? false,
      gender:      curatorNode?.gender      ?? '',
      is_deceased: curatorNode?.isDeceased  ?? false,
      death_year:  d.year,
      death_month: d.month,
      death_day:   d.day,
      death_lunar: curatorNode?.deathLunar  ?? false,
      bio1:        curatorNode?.bio1        ?? '',
      bio2:        curatorNode?.bio2        ?? '',
      bio3:        curatorNode?.bio3        ?? '',
    });
    const ph = curatorNode?.photoUrl ?? null;
    setPreview(ph && !ph.startsWith('blob:') ? `${ph}?v=${Date.now()}` : ph);
    setOffset({ x: 0, y: 0 });
    setScale(1.0);
  }, [curatorNode?.personId]);

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  // §8 사진 위치 드래그
  function handleDragStart(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOX: offset.x, startOY: offset.y };
  }
  function handleDragMove(e) {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.startOX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startOY + (e.clientY - dragRef.current.startY),
    });
  }
  function handleDragEnd() { dragRef.current = null; }

  // §8 사진 크기 핸들 (위로 드래그 → 확대)
  function handleResizeStart(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { startY: e.clientY, startScale: scale };
  }
  function handleResizeMove(e) {
    if (!resizeRef.current) return;
    const dy = resizeRef.current.startY - e.clientY;
    setScale(Math.max(0.5, Math.min(3.0, resizeRef.current.startScale + dy * 0.01)));
  }
  function handleResizeEnd() { resizeRef.current = null; }

  async function handleFile(file) {
    console.log('[handleFile] called', file);
    console.log('[handleFile] curatorNode', curatorNode);
    console.log('[handleFile] siteId', siteId);
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
      const rawUrl = json.data?.photo_url ?? URL.createObjectURL(file);
      setPreview(rawUrl.startsWith('blob:') ? rawUrl : `${rawUrl}?v=${Date.now()}`);
      toast.success('사진이 업로드되었습니다.');
      await invalidate();
    } catch (e) { toast.error(e.message); }
    finally     { setUploading(false); }
  }

  // §9: [생성] — curatorNode 없을 때 활성
  async function handleCreate() {
    const fullName = (form.name_last + form.name_first).trim();
    if (!fullName) { toast.error('이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      await api(`/api/persons/${siteId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             fullName,
          name_en:          [form.name_en_last, form.name_en_first].filter(Boolean).join(' ') || undefined,
          name_legal_last:  form.name_legal_last  || undefined,
          name_legal_first: form.name_legal_first || undefined,
          name_other:       form.name_other       || undefined,
          birth_date:  joinDate(form.birth_year, form.birth_month, form.birth_day),
          birth_lunar: form.birth_lunar || undefined,
          gender:      form.gender      || undefined,
          is_deceased: form.is_deceased,
          death_date:  form.is_deceased ? joinDate(form.death_year, form.death_month, form.death_day) : undefined,
          death_lunar: form.is_deceased ? (form.death_lunar || undefined) : undefined,
          bio1:        form.bio1        || undefined,
          bio2:        form.bio2        || undefined,
          bio3:        form.bio3        || undefined,
        }),
      });
      toast.success('인물이 생성되었습니다.');
      await invalidate();
    } catch (e) { toast.error(e.message); }
    finally     { setSaving(false); }
  }

  // §9: [수정] — curatorNode 있을 때 활성
  async function handleUpdate() {
    const fullName = (form.name_last + form.name_first).trim();
    if (!fullName) { toast.error('이름을 입력하세요.'); return; }
    setSaving(true);
    try {
      await api(`/api/persons/${siteId}/${curatorNode.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             fullName,
          name_en:          [form.name_en_last, form.name_en_first].filter(Boolean).join(' ') || null,
          name_legal_last:  form.name_legal_last  || null,
          name_legal_first: form.name_legal_first || null,
          name_other:       form.name_other       || null,
          birth_date:  joinDate(form.birth_year, form.birth_month, form.birth_day) ?? null,
          birth_lunar: form.birth_lunar || null,
          gender:      form.gender      || null,
          is_deceased: form.is_deceased,
          death_date:  form.is_deceased ? (joinDate(form.death_year, form.death_month, form.death_day) ?? null) : null,
          death_lunar: form.is_deceased ? (form.death_lunar || null) : null,
          bio1:        form.bio1        || null,
          bio2:        form.bio2        || null,
          bio3:        form.bio3        || null,
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

      {/* §8: 가족트리 카드에 보여질 180×180 사진창 + 업로드 + 에디터 */}
      <label style={s.fieldLabel}>프로필 사진 <span style={s.hint180}>가족트리 카드 180×180</span></label>
      <div style={s.photoEditorWrap}>
        {/* 180×180 카드 프리뷰 — 항상 표시 */}
        <div
          data-testid="photo-drag-area"
          style={{ ...s.cardFrame, cursor: preview ? (dragRef.current ? 'grabbing' : 'grab') : 'pointer' }}
          onPointerDown={preview ? handleDragStart : undefined}
          onPointerMove={preview ? handleDragMove : undefined}
          onPointerUp={preview ? handleDragEnd : undefined}
          onPointerCancel={preview ? handleDragEnd : undefined}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onClick={!preview ? () => fileRef.current?.click() : undefined}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="미리보기"
                style={{ ...s.editorImg, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                draggable={false}
                onError={e => { e.currentTarget.style.opacity = '0.3'; }}
              />
              <div
                data-testid="photo-resize-handle"
                style={s.resizeHandle}
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerCancel={handleResizeEnd}
              />
            </>
          ) : (
            <div style={s.cardEmpty}>
              <span style={s.cardEmptyIcon}>📷</span>
              <span style={s.cardEmptyText}>{uploading ? '업로드 중…' : '클릭 또는 사진을 끌어다 놓으세요'}</span>
            </div>
          )}
        </div>

        {/* 업로드 / 변경 버튼 + 힌트 */}
        <div style={s.editorFooter}>
          {preview
            ? <span style={s.editorHint}>드래그로 위치 · 핸들(↘)로 크기 조정</span>
            : <span style={s.editorHint}>180×180 카드에 맞게 사진을 올려주세요</span>
          }
          <button style={s.changePhotoBtn} onClick={() => fileRef.current?.click()}>
            {preview ? '사진 변경' : '사진 업로드'}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          handleFile(e.target.files[0]);
          e.target.value = null;
        }}
      />
      <label style={s.publicLabel}>
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        &nbsp;박물관 상단 메뉴에 "사진전시관"으로 공개 (§10)
      </label>

      {/* 인물 정보 입력 폼 */}
      <div style={s.formDivider} />

      <label style={s.fieldLabel}>이름 <span style={s.required}>*</span></label>
      <div style={s.nameRow}>
        <input
          style={{ ...s.textInput, ...s.nameLastInput }}
          value={form.name_last}
          onChange={e => setField('name_last', e.target.value)}
          placeholder="성(姓)"
          maxLength={5}
        />
        <input
          style={{ ...s.textInput, flex: 1, marginBottom: 0 }}
          value={form.name_first}
          onChange={e => setField('name_first', e.target.value)}
          placeholder="성함을 입력하세요"
        />
      </div>
      <div style={{ ...s.nameRow, marginTop: 4 }}>
        <input
          style={{ ...s.textInput, ...s.nameLastInput, marginBottom: 0 }}
          value={form.name_en_last}
          onChange={e => setField('name_en_last', e.target.value)}
          placeholder="Last"
          maxLength={40}
        />
        <input
          style={{ ...s.textInput, flex: 1, marginBottom: 0 }}
          value={form.name_en_first}
          onChange={e => setField('name_en_first', e.target.value)}
          placeholder="First (영문 이름)"
        />
      </div>

      <label style={{ ...s.fieldLabel, marginTop: 6 }}>법적 이름</label>
      <div style={s.nameRow}>
        <input
          style={{ ...s.textInput, ...s.nameLastInput }}
          value={form.name_legal_last}
          onChange={e => setField('name_legal_last', e.target.value)}
          placeholder="성"
          maxLength={20}
        />
        <input
          style={{ ...s.textInput, flex: 1, marginBottom: 0 }}
          value={form.name_legal_first}
          onChange={e => setField('name_legal_first', e.target.value)}
          placeholder="이름 (법적 등록명)"
        />
      </div>

      <label style={{ ...s.fieldLabel, marginTop: 6 }}>기타 이름 / 호 / 아명</label>
      <input
        style={s.textInput}
        value={form.name_other}
        onChange={e => setField('name_other', e.target.value)}
        placeholder="예: 호, 아명, 영문 별명"
      />

      <label style={s.fieldLabel}>생년월일</label>
      <div style={s.dateRow}>
        <input style={s.dateInput} value={form.birth_year}  onChange={e => setField('birth_year',  e.target.value)} placeholder="년(4자리)" maxLength={4} />
        <input style={s.dateInput} value={form.birth_month} onChange={e => setField('birth_month', e.target.value)} placeholder="월" maxLength={2} />
        <input style={s.dateInput} value={form.birth_day}   onChange={e => setField('birth_day',   e.target.value)} placeholder="일" maxLength={2} />
      </div>
      <label style={s.publicLabel}>
        <input type="checkbox" checked={form.birth_lunar} onChange={e => setField('birth_lunar', e.target.checked)} />
        &nbsp;음력
      </label>

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
          <div style={s.dateRow}>
            <input style={s.dateInput} value={form.death_year}  onChange={e => setField('death_year',  e.target.value)} placeholder="년(4자리)" maxLength={4} />
            <input style={s.dateInput} value={form.death_month} onChange={e => setField('death_month', e.target.value)} placeholder="월" maxLength={2} />
            <input style={s.dateInput} value={form.death_day}   onChange={e => setField('death_day',   e.target.value)} placeholder="일" maxLength={2} />
          </div>
          <label style={s.publicLabel}>
            <input type="checkbox" checked={form.death_lunar} onChange={e => setField('death_lunar', e.target.checked)} />
            &nbsp;음력
          </label>
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
      {!ready && <p style={s.hint}>데이터 로드 중…</p>}
      <div style={{ ...s.rowBetween, marginTop: 16 }}>
        <button
          style={{ ...s.crudBtn, ...s.createBtn, ...(!ready || !hasPerson ? {} : s.btnDisabled) }}
          disabled={!ready || hasPerson || saving}
          onClick={handleCreate}
        >
          {saving && !hasPerson ? '생성 중…' : '생성'}
        </button>
        <button
          style={{ ...s.crudBtn, ...s.updateBtn, ...(!ready || hasPerson ? {} : s.btnDisabled) }}
          disabled={!ready || !hasPerson || saving}
          onClick={handleUpdate}
        >
          {saving && hasPerson ? '수정 중…' : '수정'}
        </button>
        <button
          style={{ ...s.crudBtn, ...s.deleteBtn, ...(!ready || hasPerson ? {} : s.btnDisabled) }}
          disabled={!ready || !hasPerson || deleting}
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

  photoEditorWrap: { marginBottom: 12 },
  // §8: 가족트리 카드에 표시될 180×180 프리뷰 창
  cardFrame: {
    position: 'relative', overflow: 'hidden',
    width: 180, height: 180, borderRadius: 8,
    background: '#2a2a2a', border: '2px solid #C4A882',
    userSelect: 'none', touchAction: 'none',
  },
  cardEmpty: {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  cardEmptyIcon: { fontSize: 32, opacity: 0.5 },
  cardEmptyText: { fontSize: 11, color: '#B09060', textAlign: 'center', padding: '0 8px' },
  hint180: { fontSize: 11, color: '#B09060', fontWeight: 400, marginLeft: 6 },
  editorImg: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%', objectFit: 'cover',
    pointerEvents: 'none', transformOrigin: 'center center',
  },
  resizeHandle: {
    position: 'absolute', bottom: 8, right: 8,
    width: 18, height: 18,
    background: 'rgba(255,255,255,0.85)',
    border: '2px solid rgba(0,0,0,0.35)',
    borderRadius: 3, cursor: 'nwse-resize',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  editorFooter:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  editorHint:     { fontSize: 11, color: '#8B7355' },
  changePhotoBtn: { padding: '4px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 11, color: '#8B7355', cursor: 'pointer' },
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
  nameRow:      { display: 'flex', gap: 6, marginBottom: 4 },
  nameLastInput: { width: 72, flexShrink: 0, marginBottom: 0 },
  radioRow:    { display: 'flex', gap: 16, marginBottom: 8 },
  dateRow:     { display: 'flex', gap: 6, marginBottom: 6 },
  dateInput:   { flex: 1, padding: '7px 6px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#333', background: '#FAFAF5', boxSizing: 'border-box', textAlign: 'center' },
  formDivider: { height: 1, background: '#E0D5C5', margin: '14px 0' },
  required:    { color: '#c0392b' },
  crudBtn:     { flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700, borderRadius: 4, cursor: 'pointer', border: 'none' },
  createBtn:   { background: '#5a8a5a', color: '#fff' },
  updateBtn:   { background: '#8B7355', color: '#fff' },
  deleteBtn:   { background: '#c0392b', color: '#fff' },
  btnDisabled: { background: '#ccc', color: '#888', cursor: 'not-allowed' },

  mergeAlertBtn:    { background: '#c05050', color: '#fff', borderColor: '#a03030', marginTop: 4 },
  overlay:          { position: 'fixed', inset: 0, background: 'rgba(40,30,20,0.55)', zIndex: 900 },
  mergeModal:       { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 901, background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 8, width: 440, maxWidth: 'calc(100vw - 32px)', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  mergeModalHeader: { display: 'flex', alignItems: 'center', padding: '14px 20px 10px', borderBottom: '1px solid #E8DFD0' },
  mergeModalTitle:  { flex: 1, fontSize: 15, fontWeight: 700, color: '#3a2a1a' },
  mergeModalClose:  { background: 'none', border: 'none', fontSize: 16, color: '#9a8a75', cursor: 'pointer' },
  mergeModalDesc:   { fontSize: 12, color: '#7a6a55', padding: '10px 20px 0', margin: 0, lineHeight: 1.6 },
  mergeList:        { listStyle: 'none', margin: '10px 0 0', padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' },
  mergeItem:        { display: 'flex', alignItems: 'center', gap: 10, background: '#FFF8F0', border: '1px solid #E0D5C5', borderRadius: 4, padding: '8px 12px' },
  mergePersonId:    { flex: 1, fontSize: 13, fontWeight: 600, color: '#3a2a1a' },
  mergeDate:        { fontSize: 11, color: '#9a8a75' },
  mergeReportBtn:   { padding: '5px 12px', background: '#c05050', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },

  reqList:    { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  reqItem:    { background: '#FAFAF5', border: '1px solid #C4A882', borderRadius: 4, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  reqName:    { fontSize: 14, fontWeight: 700, color: '#3a2a1a' },
  reqMsg:     { fontSize: 12, color: '#8B7355', fontStyle: 'italic' },
  reqBtns:    { display: 'flex', gap: 8, marginTop: 6 },
  approveBtn: { padding: '5px 14px', background: '#5a8a5a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  rejectBtn:  { padding: '5px 14px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
};
