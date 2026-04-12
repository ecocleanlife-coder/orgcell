/**
 * ArchivePage.jsx — §8 자료실 라우터
 *
 * 세 화면을 URL 쿼리 파라미터로 전환:
 *   ?tab=myinfo   → MyInfoPanel  (내 정보 수정)   [기본값]
 *   ?tab=family   → FamilyPanel  (가족 관리)
 *   ?tab=archive  → ArchivePanel (자료실 관리)
 *
 * 공통 초기화(museum 로드, fetchTree, setSiteId)는 useArchiveData 훅에 위임.
 * §6: 본인 카드 더블클릭 → /{subdomain}/archive 로 진입.
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore }   from '@/store/authStore.js';
import { useArchiveData } from './hooks/useArchiveData';
import MyInfoPanel        from './panels/MyInfoPanel';
import FamilyPanel        from './panels/FamilyPanel';
import ArchivePanel       from './panels/ArchivePanel';

// ── 탭 정의 ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'myinfo',  label: '내 정보 수정' },
  { key: 'family',  label: '가족 관리'    },
  { key: 'archive', label: '자료실 관리'  },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function ArchivePage() {
  const { subdomain }                  = useParams();
  const navigate                       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated }            = useAuthStore();

  const activeTab = searchParams.get('tab') ?? 'myinfo';

  const {
    curatorNode,
    personId,
    siteId,
    relations,
    mergeNotifs,
    dataReady,
    refreshRelations,
  } = useArchiveData(subdomain);

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  if (!isAuthenticated) return null;
  if (!dataReady) return <div style={s.loading}>데이터 로드 중...</div>;

  return (
    <div style={s.page}>

      {/* 상단 바: ← 돌아가기 + 탭 */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate(`/${subdomain}`)}>
          ← 돌아가기
        </button>

        <nav style={s.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              style={{ ...s.tab, ...(activeTab === t.key ? s.tabOn : {}) }}
              onClick={() => setSearchParams({ tab: t.key })}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 패널 영역 */}
      <div style={s.body}>
        {activeTab === 'myinfo' && (
          <MyInfoPanel
            curatorNode={curatorNode}
            personId={personId}
            siteId={siteId}
            mergeNotifs={mergeNotifs}
          />
        )}

        {activeTab === 'family' && (
          <FamilyPanel
            curatorNode={curatorNode}
            personId={personId}
            siteId={siteId}
            relations={relations}
            refreshRelations={refreshRelations}
          />
        )}

        {activeTab === 'archive' && (
          <ArchivePanel
            siteId={siteId}
            subdomain={subdomain}
          />
        )}
      </div>
    </div>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const s = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B7355', fontSize: 14 },
  page:    { display: 'flex', flexDirection: 'column', height: '100vh', background: '#F9F7F2' },

  // 상단 바
  topBar:  { background: '#FDF8F0', borderBottom: '1px solid #C4A882', padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20 },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8B7355', fontWeight: 600, flexShrink: 0 },

  // 탭 내비게이션
  tabs:    { display: 'flex', gap: 4 },
  tab:     { padding: '6px 16px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer' },
  tabOn:   { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },

  // 패널 영역
  body:    { flex: 1, overflow: 'auto', padding: 20 },
};
