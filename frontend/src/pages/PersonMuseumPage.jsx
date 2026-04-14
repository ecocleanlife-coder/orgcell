/**
 * PersonMuseumPage.jsx — /person/:personDbId 가상 박물관
 *
 * §30-1 개정: 박물관 미개설 인물도 트리 뷰 제공
 * §14: 현재 사이트 관장 또는 본인(로그인 시) 편집 가능
 *
 * 흐름:
 *   1. GET /api/tree/person/:dbId → 해당 인물 기준 트리 데이터 수신
 *   2. 헤더: OOO 가족유산박물관 (미개설 안내 배지)
 *   3. 🏠 버튼: 원래 박물관으로 복귀 (§6)
 *   4. 더블클릭 → 박물관 개설 모달 (본인) 또는 정보 수정 모달 (관장)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore }  from '../store/authStore';
import { useTreeStore }  from '../store/treeStore';
import FamilyTreeCanvas  from '../components/tree/FamilyTreeCanvas';
import WormholeModal     from '../components/modals/WormholeModal';
import PersonEditModal   from '../components/modals/PersonEditModal';

// ─── API 헬퍼 ─────────────────────────────────────────────────────────────────
async function fetchPersonTree(dbId) {
  const res  = await fetch(`/api/tree/person/${dbId}`, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function PersonMuseumPage() {
  const { personDbId } = useParams();
  const navigate       = useNavigate();

  const { fetchMe, isCuratorOf } = useAuthStore();
  const { nodes, connectors, setSiteId, isLoading, error } = useTreeStore();

  const [treeData,    setTreeData]    = useState(null);
  const [loadErr,     setLoadErr]     = useState('');

  // ── 초기 로드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMe();
    loadTree();
  }, [personDbId]);

  async function loadTree() {
    setLoadErr('');
    try {
      const data = await fetchPersonTree(personDbId);
      setTreeData(data);
      if (data.siteId) setSiteId(data.siteId);

      // treeStore에 직접 주입 (fetchTree 우회 — personDbId 기반이므로)
      useTreeStore.setState({
        nodes:      data.nodes      ?? [],
        connectors: data.connectors ?? [],
        meta:       data.meta       ?? null,
        curatorId:  data.curatorId  ?? null,
        mainId:     data.curatorId  ?? null,
        siteId:     data.siteId     ?? null,
        subdomain:  data.subdomain  ?? null,
        isLoading:  false,
        error:      null,
      });
    } catch (err) {
      setLoadErr(err.message);
    }
  }

  const personName = treeData?.personName ?? '...';
  const origSubdomain = treeData?.subdomain;
  // 현재 사이트의 관장인지 확인
  const isCuratorOfSite = origSubdomain ? isCuratorOf(origSubdomain) : false;

  // ── 로딩/에러 ───────────────────────────────────────────────────────────────
  if (loadErr) {
    return (
      <div style={s.center}>
        <p style={{ color: '#C0392B' }}>{loadErr}</p>
        <button style={s.backBtn} onClick={() => navigate(-1)}>← 돌아가기</button>
      </div>
    );
  }

  if (!treeData) {
    return <div style={s.center}>가족유산박물관 불러오는 중...</div>;
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* 헤더 */}
      <header style={s.header}>
        <button style={s.homeBtn} onClick={() => navigate(origSubdomain ? `/${origSubdomain}` : '/')} title="원래 박물관으로">
          🏠
        </button>
        <div style={s.titleWrap}>
          <span style={s.museumName}>{personName} 가족유산박물관</span>
          <span style={s.badge}>미개설</span>
        </div>
        <div style={{ width: 40 }} />
      </header>

      {/* 가족트리 */}
      <div style={s.treeWrap}>
        <FamilyTreeCanvas />
      </div>

      {/* 모달 */}
      <WormholeModal />
      <PersonEditModal virtualMode siteIdOverride={treeData?.siteId} isCuratorOverride={isCuratorOfSite} />
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight: '100vh', background: '#FAF7F2', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 24px',
    background: '#FDFBF7',
    borderBottom: '1px solid #E8DFD0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  homeBtn: {
    background: 'none', border: '1px solid #C4A882',
    borderRadius: 4, fontSize: 18, cursor: 'pointer',
    padding: '4px 10px', color: '#8B7355',
  },
  titleWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  museumName: { fontSize: 18, fontWeight: 700, color: '#3a2a1a' },
  badge: {
    fontSize: 11, padding: '2px 8px',
    background: '#F0E8D8', color: '#8B7355',
    border: '1px solid #C4A882', borderRadius: 10,
  },
  treeWrap: { flex: 1, position: 'relative', overflow: 'hidden' },
  center: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', gap: 16, color: '#8B7355',
  },
  backBtn: {
    padding: '8px 20px', background: 'none',
    border: '1px solid #C4A882', borderRadius: 4,
    fontSize: 13, cursor: 'pointer', color: '#8B7355',
  },
};
