-- 038 ROLLBACK: 트리거 및 트리거 함수 제거
-- 주의: persons.parent1_id/parent2_id/spouse_id 값은 되돌리지 않음
--       (백필된 값이 실제 정확한 값이므로 롤백 대상 아님)

BEGIN;

DROP TRIGGER IF EXISTS trg_sync_persons_from_relations ON person_relations;
DROP FUNCTION IF EXISTS sync_persons_from_relations();

COMMIT;
