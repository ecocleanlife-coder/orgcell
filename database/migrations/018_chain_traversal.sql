-- 018_chain_traversal.sql
-- 체인 탐색(A→B→C) 지원을 위한 인덱스 추가
-- 청구항 6: 다중 도메인 순차 탐색

-- resolve된 노드의 outgoing federation 빠른 조회
CREATE INDEX IF NOT EXISTS idx_fed_req_target_site_status
  ON federation_requests (target_site_id, status);

CREATE INDEX IF NOT EXISTS idx_fed_req_source_site_status
  ON federation_requests (source_site_id, status);

-- 특정 person이 참여한 federation 검색
CREATE INDEX IF NOT EXISTS idx_fed_req_source_node
  ON federation_requests (source_node_id) WHERE source_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fed_req_target_node
  ON federation_requests (target_node_id) WHERE target_node_id IS NOT NULL;

-- Rollback:
-- DROP INDEX IF EXISTS idx_fed_req_target_site_status;
-- DROP INDEX IF EXISTS idx_fed_req_source_site_status;
-- DROP INDEX IF EXISTS idx_fed_req_source_node;
-- DROP INDEX IF EXISTS idx_fed_req_target_node;
