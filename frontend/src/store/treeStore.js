/**
 * store/treeStore.js — §22/§23/§24 트리 상태 관리
 *
 * - nodes / connectors: GET /api/tree/:subdomain 응답 (z=0만, 백엔드 보장)
 * - mainId: 화면 중앙 인물 (초기=curatorId, 타 박물관 이동 시 변경)
 * - navKey: mainId 변경마다 증가 → FamilyTreeCanvas 강제 리마운트 (§24-4)
 * - selectedPersonId: 더블클릭 선택 인물 → PersonEditModal 트리거
 * - wormholeTarget: 웜홀 클릭 대상 → WormholeModal 트리거 (§6/§30)
 * - siteId: 현재 박물관 integer DB id (PUT /api/persons/:siteId/:personId 에 필요)
 */

import { create } from 'zustand';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

// ─── 내부 유틸 ────────────────────────────────────────────────────────────────
async function fetchLayoutApi(subdomain) {
  const res = await fetch(`/api/tree/${subdomain}`, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || `트리 로드 실패 (${res.status})`);
  }
  return json; // { nodes, connectors, meta, curatorId, subdomain }
}

// ─── 스토어 ───────────────────────────────────────────────────────────────────
export const useTreeStore = create((set, get) => ({

  // ── 레이아웃 데이터 (§22/§23/§24) ──────────────────────────────────────────
  nodes:      [],   // LayoutNode[] — z=0만 (백엔드 §22 철칙 보장)
  connectors: [],   // Connector[]
  meta:       null, // { curatorId, totalZ0, totalZ1, constants }

  // ── 현재 박물관 ─────────────────────────────────────────────────────────────
  subdomain:  null,
  curatorId:  null,
  siteId:     null,   // integer DB id — PUT /api/persons/:siteId/:personId 에 필요

  // ── 네비게이션 (§24-4) ──────────────────────────────────────────────────────
  mainId: null,   // 현재 화면 중앙 인물 personId
  navKey: 0,      // FamilyTreeCanvas key prop → 변경 시 강제 리마운트

  // ── 로딩 ───────────────────────────────────────────────────────────────────
  isLoading: false,
  error:     null,

  // ── UI 선택 상태 ────────────────────────────────────────────────────────────
  selectedPersonId: null, // 더블클릭 → PersonEditModal
  wormholeTarget:   null, // { subdomain, name } → WormholeModal (§6)
  treePublic:       true, // §10/§16 가계도 타인 공개 여부

  // ── 내부 캐시 (subdomain → { nodes, connectors, meta, curatorId, ts }) ─────
  _cache: {},

  // ─────────────────────────────────────────────────────────────────────────
  // fetchTree — GET /api/tree/:subdomain
  //   5분 캐시. 캐시 HIT 시 네트워크 요청 없이 상태 복원.
  //   mainId 를 curatorId로 초기화 (새 박물관 진입 시).
  // ─────────────────────────────────────────────────────────────────────────
  async fetchTree(subdomain) {
    const cached = get()._cache[subdomain];
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      set({
        nodes:      cached.nodes,
        connectors: cached.connectors,
        meta:       cached.meta,
        subdomain,
        curatorId:  cached.curatorId,
        mainId:     cached.curatorId,
        isLoading:  false,
        error:      null,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const json = await fetchLayoutApi(subdomain);
      const { nodes, connectors, meta, curatorId, treePublic, siteId } = json;

      set((state) => ({
        nodes,
        connectors,
        meta,
        subdomain,
        curatorId,
        mainId:    curatorId,
        treePublic: treePublic ?? true,
        siteId:     siteId ?? state.siteId,
        isLoading: false,
        error:     null,
        _cache: {
          ...state._cache,
          [subdomain]: { nodes, connectors, meta, curatorId, treePublic, siteId, ts: Date.now() },
        },
      }));
    } catch (err) {
      set({ isLoading: false, error: err.message, nodes: [], connectors: [] });
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // navigateTo — 타 박물관 이동 (웜홀 확정 후 호출)
  //   §24-4: 캐시 완전 삭제 + navKey 증가 + 새 트리 fetch
  // ─────────────────────────────────────────────────────────────────────────
  async navigateTo(subdomain) {
    set((state) => ({
      navKey:    state.navKey + 1,
      _cache:    {},                // §24-4: 이전 캐시 완전 삭제
      nodes:     [],
      connectors:[],
      meta:      null,
      wormholeTarget: null,
    }));
    await get().fetchTree(subdomain);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // invalidate — 인물/관계 변경 후 캐시 무효화 + 재fetch
  // ─────────────────────────────────────────────────────────────────────────
  async invalidate() {
    const { subdomain } = get();
    if (!subdomain) return;
    set((state) => ({ _cache: { ...state._cache, [subdomain]: undefined } }));
    await get().fetchTree(subdomain);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // setSiteId — MuseumPage가 museum 로드 후 호출 (PUT API 에 필요)
  // ─────────────────────────────────────────────────────────────────────────
  setSiteId(id) { set({ siteId: id }); },

  // ─────────────────────────────────────────────────────────────────────────
  // 인물 선택 (더블클릭 → PersonEditModal)
  // ─────────────────────────────────────────────────────────────────────────
  selectPerson(personId) { set({ selectedPersonId: personId }); },
  clearSelection()       { set({ selectedPersonId: null }); },

  // ─────────────────────────────────────────────────────────────────────────
  // 웜홀 (§6/§30) — 카드 c 클릭 → WormholeModal 열기/닫기
  //   target: { subdomain, name } | null
  // ─────────────────────────────────────────────────────────────────────────
  openWormhole(target)  { set({ wormholeTarget: target }); },
  closeWormhole()       { set({ wormholeTarget: null }); },

  // ─────────────────────────────────────────────────────────────────────────
  // 셀렉터 헬퍼 (store 외부 없이 사용 가능)
  // ─────────────────────────────────────────────────────────────────────────

  // coupleId 기준 노드 그룹 반환 (CoupleBlock 렌더링용)
  getCoupleGroups() {
    const map = new Map();
    for (const n of get().nodes) {
      if (!map.has(n.coupleId)) map.set(n.coupleId, []);
      map.get(n.coupleId).push(n);
    }
    return map; // Map<coupleId, LayoutNode[]>
  },

  // personId로 노드 조회
  getNodeByPersonId(personId) {
    return get().nodes.find(n => n.personId === personId) ?? null;
  },

  // 관장 노드 (role === 'curator')
  getCuratorNode() {
    return get().nodes.find(n => n.role === 'curator') ?? null;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // reset — 박물관 이탈 시 전체 초기화
  // ─────────────────────────────────────────────────────────────────────────
  reset() {
    set({
      nodes: [], connectors: [], meta: null,
      subdomain: null, curatorId: null, siteId: null,
      mainId: null, navKey: 0,
      isLoading: false, error: null,
      selectedPersonId: null, wormholeTarget: null,
      _cache: {},
    });
  },
}));
