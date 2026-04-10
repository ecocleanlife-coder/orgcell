/**
 * ExhibitionPage.jsx — §10/§31 전시관 전체화면
 *
 * 경로: /:subdomain/exhibition/:type
 *
 * §31 규칙:
 *   - 헤더: ← 돌아가기 + 박물관명(전시관명) + 언어/로그아웃
 *   - 전체화면 콘텐츠
 *   - 관장 허락 시 콘텐츠 다운로드 가능
 *
 * §10: 공개된 자료만 표시 (비공개 = 미노출 처리는 API 단)
 *
 * §32: 가족행사 달력 (type='calendar')
 *   - 당일/여러날/숙박 구분 렌더링
 *   - 셀 높이 자동 확장, 상하 스크롤
 *
 * 타입:
 *   photo, document, biography, autobiography, works, voice, shared-album, calendar
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate }      from 'react-router-dom';
import { useAuthStore }                from '../store/authStore';
import SharedAlbum                     from '../components/SharedAlbum';
import Footer                          from '../components/common/Footer';

// ── 타입 → 전시관명 매핑 (§8) ────────────────────────────────────────────────
const TYPE_LABEL = {
  photo:        '사진전시관',
  document:     '자료전시관',
  biography:    '약력전시관',
  autobiography:'자서전전시관',
  works:        '작품전시관',
  voice:        '음성전시관',
  'shared-album':'공유앨범',
  calendar:     '가족행사 달력',
};

// ══════════════════════════════════════════════════════════════════════════════
export default function ExhibitionPage() {
  const { subdomain, type } = useParams();
  const navigate = useNavigate();
  const { isCuratorOf, lang, setLang, logout } = useAuthStore();

  const [museum,          setMuseum]          = useState(null);
  const [items,           setItems]           = useState([]);
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');

  const isCurator = isCuratorOf(subdomain);

  // 박물관 정보
  useEffect(() => {
    fetch(`/api/museum/${subdomain}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMuseum(d.museum ?? d))
      .catch(() => {});
  }, [subdomain]);

  // 전시관 콘텐츠 로드 (calendar / shared-album은 각 컴포넌트에서 직접 로드)
  useEffect(() => {
    if (type === 'calendar' || type === 'shared-album') { setLoading(false); return; }
    setLoading(true); setError('');
    fetch(`/api/exhibitions/${subdomain}?type=${type}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        setItems(Array.isArray(d) ? d : (d.items ?? []));
        setDownloadAllowed(!!d.downloadAllowed);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [subdomain, type]);

  const museumName  = museum?.museum_name ?? museum?.name ?? `${subdomain} 박물관`;
  const exhibitName = TYPE_LABEL[type] ?? type;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div style={s.page}>

      {/* §31 헤더 (← 돌아가기 포함) */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(`/${subdomain}`)}>
          ← 돌아가기
        </button>
        <span style={s.headerTitle}>{museumName} — {exhibitName}</span>
        <div style={s.headerRight}>
          <select value={lang} onChange={e => setLang(e.target.value)} style={s.langSel}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      {/* 전체화면 콘텐츠 */}
      <main style={s.main}>
        {loading ? (
          <div style={s.centerMsg}><div style={s.spinner} /></div>
        ) : error ? (
          <div style={s.centerMsg}><p style={s.errorText}>{error}</p></div>
        ) : (
          <ExhibitionContent
            type={type}
            items={items}
            downloadAllowed={downloadAllowed || isCurator}
            subdomain={subdomain}
          />
        )}
      </main>

      {/* §20 Footer */}
      <Footer variant="minimal" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 타입별 콘텐츠 라우터
// ══════════════════════════════════════════════════════════════════════════════
function ExhibitionContent({ type, items, downloadAllowed, subdomain }) {
  switch (type) {
    case 'photo':        return <PhotoExhibition    items={items} downloadAllowed={downloadAllowed} />;
    case 'document':
    case 'biography':
    case 'autobiography':
    case 'works':        return <TextExhibition     items={items} downloadAllowed={downloadAllowed} type={type} />;
    case 'voice':        return <VoiceExhibition    items={items} />;
    case 'shared-album': return <SharedAlbum subdomain={subdomain} />;
    case 'calendar':     return <CalendarExhibition subdomain={subdomain} />;
    default:             return <div style={s.centerMsg}><p style={s.emptyText}>알 수 없는 전시관입니다.</p></div>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 사진전시관
// ══════════════════════════════════════════════════════════════════════════════
function PhotoExhibition({ items, downloadAllowed }) {
  const [selected, setSelected] = useState(null); // lightbox

  if (!items.length) return <EmptyView label="사진이 없습니다." />;

  return (
    <div style={s.photoWrap}>
      <div style={s.photoGrid}>
        {items.map(item => (
          <div key={item.id} style={s.photoCard} onClick={() => setSelected(item)}>
            <img src={item.url} alt={item.caption ?? ''} style={s.photoImg} loading="lazy" />
            {item.caption && <p style={s.photoCaption}>{item.caption}</p>}
          </div>
        ))}
      </div>

      {/* 라이트박스 */}
      {selected && (
        <div style={s.lightbox} onClick={() => setSelected(null)}>
          <img src={selected.url} alt={selected.caption ?? ''} style={s.lightboxImg} onClick={e => e.stopPropagation()} />
          <div style={s.lightboxMeta}>
            {selected.caption && <p style={s.lightboxCaption}>{selected.caption}</p>}
            {selected.date    && <p style={s.lightboxDate}>{selected.date}</p>}
            {downloadAllowed && (
              <a href={selected.url} download style={s.downloadBtn}>⬇ 다운로드</a>
            )}
          </div>
          <button style={s.lightboxClose} onClick={() => setSelected(null)}>✕</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 텍스트 전시관 (약력, 자서전, 자료, 작품)
// ══════════════════════════════════════════════════════════════════════════════
function TextExhibition({ items, downloadAllowed, type }) {
  if (!items.length) return <EmptyView label="등록된 내용이 없습니다." />;

  function handleDownload(item) {
    const blob = new Blob([item.content ?? ''], { type: 'text/plain;charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${type}_${item.id ?? Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={s.textWrap}>
      {items.map(item => (
        <article key={item.id} style={s.textArticle}>
          {item.title && <h2 style={s.textTitle}>{item.title}</h2>}
          {item.updatedAt && (
            <p style={s.textMeta}>{new Date(item.updatedAt).toLocaleDateString('ko-KR')}</p>
          )}
          <div style={s.textBody}>
            {(item.content ?? '').split('\n').map((line, i) => (
              <p key={i} style={s.textLine}>{line || <br />}</p>
            ))}
          </div>
          {downloadAllowed && (
            <button style={s.dlTextBtn} onClick={() => handleDownload(item)}>⬇ 텍스트 다운로드</button>
          )}
        </article>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 음성전시관
// ══════════════════════════════════════════════════════════════════════════════
function VoiceExhibition({ items }) {
  if (!items.length) return <EmptyView label="등록된 음성·영상이 없습니다." />;

  return (
    <div style={s.voiceWrap}>
      {items.map(item => (
        <div key={item.id} style={s.voiceCard}>
          <div style={s.voiceInfo}>
            <span style={s.voiceIcon}>🎙</span>
            <span style={s.voiceFilename}>{item.filename ?? `음성 ${item.id}`}</span>
            {item.duration && <span style={s.voiceDur}>{formatDuration(item.duration)}</span>}
          </div>
          {item.url && (
            item.url.match(/\.(mp4|webm|mov)/i)
              ? <video src={item.url} controls style={s.voiceMedia} />
              : <audio src={item.url} controls style={s.voiceMedia} />
          )}
        </div>
      ))}
    </div>
  );
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// §32 가족행사 달력
// ══════════════════════════════════════════════════════════════════════════════
function CalendarExhibition({ subdomain }) {
  const today    = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/calendar/${subdomain}?year=${year}&month=${month + 1}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : (d.events ?? [])))
      .catch(() => {});
  }, [subdomain, year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else             { setMonth(m => m - 1); }
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else              { setMonth(m => m + 1); }
  }

  // 달력 날짜 배열 (6주 × 7일)
  const cells = buildCalendarCells(year, month);

  return (
    <div style={s.calWrap}>
      {/* 월 네비게이션 */}
      <div style={s.calNav}>
        <button style={s.calNavBtn} onClick={prevMonth}>‹</button>
        <span style={s.calNavTitle}>{year}년 {month + 1}월</span>
        <button style={s.calNavBtn} onClick={nextMonth}>›</button>
        <button style={s.calAddBtn} onClick={() => setShowForm(v => !v)}>+ 일정 추가</button>
      </div>

      {/* 요일 헤더 */}
      <div style={s.calHeader}>
        {['일','월','화','수','목','금','토'].map(d => (
          <div key={d} style={{ ...s.calDow, color: d === '일' ? '#c05050' : d === '토' ? '#5050c0' : '#5a4a35' }}>{d}</div>
        ))}
      </div>

      {/* 달력 셀 (6행 × 7열) */}
      <div style={s.calGrid}>
        {cells.map((cell, idx) => {
          const dateStr   = toDateStr(cell);
          const dayEvents = getEventsForDay(events, dateStr);
          const isToday   = dateStr === toDateStr(today);
          const isOther   = cell.getMonth() !== month;
          const dow       = cell.getDay();

          return (
            <div key={idx} style={{
              ...s.calCell,
              background: isToday ? '#FDF8F0' : '#FDFBF7',
              opacity:    isOther ? 0.4 : 1,
            }}>
              <div style={{
                ...s.calDayNum,
                color: dow === 0 ? '#c05050' : dow === 6 ? '#5050c0' : '#3a2a1a',
                background: isToday ? '#C4A882' : 'transparent',
                color: isToday ? '#fff' : (dow === 0 ? '#c05050' : dow === 6 ? '#5050c0' : '#3a2a1a'),
              }}>
                {cell.getDate()}
              </div>
              {/* 이벤트 렌더링 */}
              {dayEvents.map((ev, ei) => (
                <EventChip key={`${ev.id}-${ei}`} event={ev} dateStr={dateStr} />
              ))}
            </div>
          );
        })}
      </div>

      {/* 일정 추가 폼 */}
      {showForm && (
        <AddEventForm
          subdomain={subdomain}
          onSaved={ev => { setEvents(prev => [...prev, ev]); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── 이벤트 칩 (당일/여러날/숙박 구분) ────────────────────────────────────────
function EventChip({ event, dateStr }) {
  const isStart = event.startDate === dateStr;
  const isEnd   = event.endDate   === dateStr;
  const isSingle = event.startDate === event.endDate;

  let label = '';
  if (isSingle || isStart)       label = `${event.person} — ${event.title}`;
  else if (isEnd)                label = `⋯ ${event.person}`;
  else                           label = '—';

  // 숙박(stay): 체크인 날 오후부터, 체크아웃 날 오전까지
  const isStayCheckin  = event.eventType === 'stay' && isStart;
  const isStayCheckout = event.eventType === 'stay' && isEnd;

  return (
    <div style={{
      ...s.eventChip,
      background:    event.color ?? '#C4A882',
      opacity:       isStayCheckin ? 0.6 : isStayCheckout ? 0.6 : 1,
      borderLeft:    isSingle ? `3px solid rgba(0,0,0,0.15)` : isStart ? `3px solid rgba(0,0,0,0.2)` : 'none',
      borderRadius:  isSingle ? 4 : isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : 0,
      marginLeft:    isStart || isSingle ? 0 : -2,
      marginRight:   isEnd   || isSingle ? 0 : -2,
      paddingTop:    isStayCheckin ? '50%' : 0,  // 오후 절반부터
    }}>
      {label}
    </div>
  );
}

// ── 일정 추가 폼 ──────────────────────────────────────────────────────────────
function AddEventForm({ subdomain, onSaved, onClose }) {
  const [form, setForm] = useState({
    title: '', person: '', startDate: '', endDate: '', eventType: 'day', color: '#C4A882',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function save() {
    if (!form.title || !form.startDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calendar/${subdomain}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, endDate: form.endDate || form.startDate }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onSaved(data.event ?? data);
    } catch { alert('저장 실패'); }
    finally   { setSaving(false); }
  }

  return (
    <>
      <div style={s.formOverlay} onClick={onClose} />
      <div style={s.addForm}>
        <h3 style={s.formTitle}>일정 추가</h3>
        <label style={s.formLabel}>행사명</label>
        <input style={s.formInput} value={form.title} onChange={e => set('title', e.target.value)} placeholder="예: 생일, 하와이 가족여행" />
        <label style={s.formLabel}>이름</label>
        <input style={s.formInput} value={form.person} onChange={e => set('person', e.target.value)} placeholder="예: 이상훈" />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={s.formLabel}>시작일</label>
            <input style={s.formInput} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.formLabel}>종료일 (선택)</label>
            <input style={s.formInput} type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>
        </div>
        <label style={s.formLabel}>유형</label>
        <select style={s.formInput} value={form.eventType} onChange={e => set('eventType', e.target.value)}>
          <option value="day">당일</option>
          <option value="multi">여러 날</option>
          <option value="stay">숙박</option>
        </select>
        <label style={s.formLabel}>색상</label>
        <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ height: 32, border: 'none', cursor: 'pointer' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ ...s.formBtn, ...s.formBtnPrimary }} onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
          <button style={{ ...s.formBtn, ...s.formBtnSecondary }} onClick={onClose}>취소</button>
        </div>
      </div>
    </>
  );
}

// ── 달력 유틸 ─────────────────────────────────────────────────────────────────
function buildCalendarCells(year, month) {
  const first    = new Date(year, month, 1);
  const startDow = first.getDay(); // 0=Sun
  const cells    = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - startDow + i));
  }
  return cells;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getEventsForDay(events, dateStr) {
  return events.filter(ev => ev.startDate <= dateStr && (ev.endDate ?? ev.startDate) >= dateStr);
}

// ══════════════════════════════════════════════════════════════════════════════
// 공통
// ══════════════════════════════════════════════════════════════════════════════
function EmptyView({ label }) {
  return (
    <div style={s.centerMsg}>
      <p style={s.emptyText}>{label}</p>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  page:        { minHeight: '100vh', background: '#F5F0E8', display: 'flex', flexDirection: 'column' },
  header:      { display: 'flex', alignItems: 'center', padding: '0 20px', height: 52, background: '#FDFBF7', borderBottom: '1px solid #C4A882', position: 'sticky', top: 0, zIndex: 50, gap: 12, flexShrink: 0 },
  backBtn:     { background: 'none', border: 'none', color: '#8B7355', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: 700, color: '#5a4a35', textAlign: 'center' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  langSel:     { padding: '4px 6px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', background: '#FAFAF5' },
  logoutBtn:   { padding: '4px 10px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },
  main:        { flex: 1, overflowY: 'auto' },

  centerMsg:   { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  emptyText:   { fontSize: 14, color: '#9a8a75', textAlign: 'center' },
  errorText:   { fontSize: 13, color: '#8B2020', textAlign: 'center' },
  spinner:     { width: 32, height: 32, borderRadius: '50%', border: '3px solid #E8DFD0', borderTop: '3px solid #C4A882', animation: 'spin 0.8s linear infinite' },

  // ── 사진 ────────────────────────────────────────────────────────────────────
  photoWrap:    { padding: 24 },
  photoGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  photoCard:    { borderRadius: 6, overflow: 'hidden', background: '#FDFBF7', border: '1px solid #E8DFD0', cursor: 'pointer', position: 'relative' },
  photoImg:     { width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' },
  photoCaption: { fontSize: 11, color: '#8B7355', padding: '4px 8px', margin: 0 },
  photoCheck:   { position: 'absolute', top: 6, left: 6, width: 16, height: 16, cursor: 'pointer' },

  // ── 라이트박스 ────────────────────────────────────────────────────────────
  lightbox: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lightboxImg: { maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 4 },
  lightboxMeta: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 },
  lightboxCaption: { color: '#fff', fontSize: 13, margin: 0 },
  lightboxDate:    { color: '#ccc', fontSize: 11, margin: 0 },
  downloadBtn: { padding: '6px 16px', background: '#8B7355', color: '#fff', borderRadius: 4, fontSize: 12, textDecoration: 'none' },
  lightboxClose: { position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' },

  // ── 텍스트 ────────────────────────────────────────────────────────────────
  textWrap:    { maxWidth: 720, margin: '0 auto', padding: '32px 24px' },
  textArticle: { background: '#FDFBF7', border: '1px solid #E8DFD0', borderRadius: 8, padding: '24px 28px', marginBottom: 24 },
  textTitle:   { fontSize: 20, fontWeight: 700, color: '#3a2a1a', margin: '0 0 4px' },
  textMeta:    { fontSize: 11, color: '#9a8a75', margin: '0 0 16px' },
  textBody:    { fontSize: 14, lineHeight: 1.9, color: '#3a2a1a' },
  textLine:    { margin: '0 0 2px' },
  dlTextBtn:   { marginTop: 16, padding: '6px 16px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 12, color: '#8B7355', cursor: 'pointer' },

  // ── 음성 ─────────────────────────────────────────────────────────────────
  voiceWrap:    { maxWidth: 640, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 },
  voiceCard:    { background: '#FDFBF7', border: '1px solid #E8DFD0', borderRadius: 8, padding: '16px 20px' },
  voiceInfo:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  voiceIcon:    { fontSize: 20 },
  voiceFilename:{ fontSize: 14, fontWeight: 600, color: '#3a2a1a', flex: 1 },
  voiceDur:     { fontSize: 12, color: '#9a8a75' },
  voiceMedia:   { width: '100%' },

  // ── 공유앨범 ──────────────────────────────────────────────────────────────
  sharedWrap:    { padding: 24 },
  sharedToolbar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  uploadPhotoBtn:{ padding: '8px 16px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dlSelectedBtn: { padding: '8px 16px', background: '#5a7a8a', color: '#fff', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sharedHint:    { fontSize: 12, color: '#9a8a75' },

  // ── 달력 §32 ──────────────────────────────────────────────────────────────
  calWrap:    { padding: '16px 24px', maxWidth: 960, margin: '0 auto' },
  calNav:     { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  calNavBtn:  { background: 'none', border: '1px solid #C4A882', borderRadius: 4, padding: '4px 12px', fontSize: 16, color: '#8B7355', cursor: 'pointer' },
  calNavTitle:{ fontSize: 18, fontWeight: 700, color: '#3a2a1a', flex: 1, textAlign: 'center' },
  calAddBtn:  { padding: '6px 14px', background: '#8B7355', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  calHeader:  { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E8DFD0', marginBottom: 2 },
  calDow:     { padding: '6px 0', textAlign: 'center', fontSize: 12, fontWeight: 700 },
  calGrid:    { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  calCell:    { minHeight: 80, border: '1px solid #E8DFD0', borderRadius: 4, padding: '4px', display: 'flex', flexDirection: 'column', gap: 2 },
  calDayNum:  { fontSize: 12, fontWeight: 700, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  eventChip:  { fontSize: 10, color: '#fff', padding: '1px 4px', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, lineHeight: 1.6 },

  // ── 일정 추가 폼 ──────────────────────────────────────────────────────────
  formOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 },
  addForm:     { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 901, background: '#FDFBF7', border: '1px solid #C4A882', borderRadius: 10, padding: '24px 28px', width: 380, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box' },
  formTitle:   { fontSize: 16, fontWeight: 700, color: '#3a2a1a', margin: '0 0 14px' },
  formLabel:   { fontSize: 12, fontWeight: 600, color: '#5a4a35', display: 'block', marginBottom: 4 },
  formInput:   { width: '100%', padding: '8px 10px', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, background: '#FAFAF5', boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit' },
  formBtn:     { flex: 1, padding: '10px 0', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' },
  formBtnPrimary:   { background: '#8B7355', color: '#fff' },
  formBtnSecondary: { background: 'transparent', color: '#8B7355', border: '1px solid #C4A882' },
};

// 전역 spinner 애니메이션
if (typeof document !== 'undefined' && !document.getElementById('ex-spin')) {
  const el = document.createElement('style');
  el.id = 'ex-spin';
  el.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(el);
}
