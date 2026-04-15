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
import { useAuthStore }       from '@/store/authStore.js';
import { useTreeStore }       from '@/store/treeStore.js';
import { useArchiveData }     from './hooks/useArchiveData';
import MyInfoPanel            from './panels/MyInfoPanel';
import FamilyPanel            from './panels/FamilyPanel';
import ArchivePanel           from './panels/ArchivePanel';
import MuseumBreadcrumb       from '../../components/MuseumBreadcrumb';

// ── 탭 정의 ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'myinfo',  label: '내 정보 수정' },
  { key: 'family',  label: '가족 관리'    },
  { key: 'archive', label: '자료실 관리'  },
];

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function ArchivePage() {
  const { subdomain, personPath }       = useParams();
  const navigate                        = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated }             = useAuthStore();

  const activeTab = searchParams.get('tab') ?? 'myinfo';

  const { nodes, displayName: museumDisplayName } = useTreeStore();

  const {
    curatorNode,
    personId: curatorDbId,
    siteId,
    relations,
    mergeNotifs,
    dataReady,
    refreshRelations,
  } = useArchiveData(subdomain);

  // personPath 있으면 해당 인물 노드 사용 (없으면 관장 노드)
  const activeNode   = personPath
    ? (nodes ?? []).find(n => n.opsPath === personPath) ?? curatorNode
    : curatorNode;
  const personId     = activeNode?.id ?? null;
  const personName   = activeNode?.name ?? '';

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  if (!isAuthenticated) return null;
  if (!dataReady) return <div style={s.loading}>데이터 로드 중...</div>;

  return (
    <div style={s.page}>

      {/* 상단 바: 네비게이션 빵부스러기 + 탭 */}
      <div style={s.topBar}>
        {/* §24-5 MuseumBreadcrumb: 현재 박물관 → 자료실 */}
        <MuseumBreadcrumb
          currentLabel="현재 자료실"
          backItem={{ label: museumDisplayName || `${subdomain} 박물관`, subdomain }}
        />

        {personPath && personName && (
          <span style={s.personBadge}>👤 {personName}</span>
        )}

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
            curatorNode={activeNode}
            personId={personId}
            siteId={siteId}
            mergeNotifs={mergeNotifs}
          />
        )}

        {activeTab === 'family' && (
          <FamilyPanel
            curatorNode={activeNode}
            personId={personId}
            siteId={siteId}
            relations={relations}
            refreshRelations={refreshRelations}
          />
        )}

        {activeTab === 'archive' && (
          <ArchivePanel
            siteId={siteId}
            personId={personId}
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
  topBar:  { background: '#FDF8F0', borderBottom: '1px solid #C4A882', padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 },

  // 탭 내비게이션
  tabs:    { display: 'flex', gap: 4 },
  tab:     { padding: '6px 16px', background: 'none', border: '1px solid #C4A882', borderRadius: 4, fontSize: 13, color: '#8B7355', cursor: 'pointer' },
  tabOn:   { background: '#8B7355', color: '#fff', borderColor: '#8B7355' },

  // 패널 영역
  body:    { flex: 1, overflow: 'auto', padding: 20 },
};
