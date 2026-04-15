/**
 * hooks/useArchiveData.js — ArchivePage 공통 초기화 훅
 *
 * 세 패널(MyInfoPanel / FamilyPanel / ArchivePanel)이 공통으로 필요한
 * 초기 데이터 로드와 파생 값을 한 곳에서 관리한다.
 *
 * 반환값:
 *  - curatorNode  : 현재 관장 노드 (LayoutNode | null)
 *  - personId     : curatorNode의 DB id (number | null)
 *  - siteId       : 박물관 integer DB id (number | null)
 *  - relations    : person_relations 목록
 *  - mergeNotifs  : 자동 통합 알림 목록 (§26-3)
 *  - dataReady    : siteId 확정 여부 (로딩 게이트)
 *  - refreshRelations : 관계 목록 재조회 함수
 */

import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useTreeStore }        from '@/store/treeStore.js';
import { useAuthStore }        from '@/store/authStore.js';
import {
  fetchMuseum,
  fetchRelations,
  fetchMergeNotifications,
} from '../panels/archiveApi.js';

export function useArchiveData(subdomain) {
  const navigate = useNavigate();

  const { nodes, siteId, curatorId, fetchTree, setSiteId } = useTreeStore();
  const { fetchMe } = useAuthStore();

  const [relations,   setRelations]   = useState([]);
  const [mergeNotifs, setMergeNotifs] = useState([]);
  // 트리 로드 완료 여부 — nodes가 현재 subdomain 기준으로 확정될 때까지 대기
  const [treeLoaded, setTreeLoaded] = useState(false);

  // ── 초기 로드: 인증 확인 → 박물관 로드 → 트리 로드 ─────────────────────────
  useEffect(() => {
    if (!subdomain) return;
    setTreeLoaded(false); // subdomain 변경 시 초기화
    (async () => {
      await fetchMe();
      try {
        const museum = await fetchMuseum(subdomain);
        const id     = museum?.id ?? museum?.site_id;
        if (id) setSiteId(id);
        await fetchTree(subdomain);
        setTreeLoaded(true); // fetchTree 완료 후에만 true — stale nodes 사용 방지
      } catch (err) {
        // §14/§16: 권한 없으면 박물관 문패로 돌려보냄
        if (err.status === 403) navigate(`/${subdomain}`);
      }
    })();
  }, [subdomain]);

  // ── 관계 목록 로드 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    fetchRelations(siteId)
      .then(setRelations)
      .catch(() => {});
  }, [siteId]);

  // ── 통합 알림 로드 (§26-3) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!siteId) return;
    fetchMergeNotifications(siteId)
      .then(setMergeNotifs)
      .catch(() => {});
  }, [siteId]);

  // ── 관계 목록 재조회 (인물 CRUD 후 호출) ────────────────────────────────────
  async function refreshRelations() {
    if (!siteId) return;
    const data = await fetchRelations(siteId).catch(() => []);
    setRelations(data);
  }

  // ── 파생 값 ────────────────────────────────────────────────────────────────
  const curatorNode = nodes.find(n => n.personId === curatorId) ?? null;
  const personId    = curatorNode?.id ?? null;
  // treeLoaded 포함: nodes가 현재 subdomain 기준으로 확정된 후에만 페이지 렌더링
  const dataReady   = !!siteId && treeLoaded;

  return {
    curatorNode,
    personId,
    siteId,
    relations,
    mergeNotifs,
    dataReady,
    refreshRelations,
  };
}
