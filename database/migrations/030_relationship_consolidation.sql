-- 030: 관계 테이블 통합 마이그레이션
-- 목적: persons.parent1_id/parent2_id/spouse_id → person_relations 테이블로 통합
-- 실행 전 반드시 pg_dump 백업 확인할 것
--
-- 3단계로 나뉨:
--   Step 1: person_relations 스키마 확장 (새 컬럼)
--   Step 2: persons 관계 데이터 → person_relations 복사
--   Step 3: persons 관계 컬럼 제거 (Phase 5에서 별도 실행)

BEGIN;

-----------------------------------------------------------
-- Step 1: person_relations 테이블에 새 컬럼 추가
-----------------------------------------------------------
ALTER TABLE person_relations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE person_relations
  ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE person_relations
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- relation_type 컬럼에 인덱스 추가 (타입별 조회 성능)
CREATE INDEX IF NOT EXISTS idx_person_relations_type
  ON person_relations(relation_type);

-----------------------------------------------------------
-- Step 2: persons 기존 관계 → person_relations 복사
-----------------------------------------------------------

-- 2-A: parent1_id → relation_type='parent'
-- 규칙: person1_id = 부모, person2_id = 자녀
INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
SELECT p.site_id, p.parent1_id, p.id, 'parent', true
FROM persons p
WHERE p.parent1_id IS NOT NULL
ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING;

-- 2-B: parent2_id → relation_type='parent'
INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
SELECT p.site_id, p.parent2_id, p.id, 'parent', true
FROM persons p
WHERE p.parent2_id IS NOT NULL
ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING;

-- 2-C: spouse_id → relation_type='spouse'
-- 규칙: LEAST/GREATEST로 정규화하여 중복 방지 (A↔B 양방향이므로 한 행만)
INSERT INTO person_relations (site_id, person1_id, person2_id, relation_type, is_active)
SELECT p.site_id, LEAST(p.id, p.spouse_id), GREATEST(p.id, p.spouse_id), 'spouse', true
FROM persons p
WHERE p.spouse_id IS NOT NULL
  AND p.id < p.spouse_id  -- 양방향 중 한쪽만 INSERT
ON CONFLICT (site_id, person1_id, person2_id, relation_type) DO NOTHING;

COMMIT;

-----------------------------------------------------------
-- Step 3: persons 관계 컬럼 제거 (Phase 5에서 별도 실행)
-- 아래는 Phase 5 승인 후에만 실행할 것 — 지금 실행 금지
-----------------------------------------------------------
-- ALTER TABLE persons DROP COLUMN IF EXISTS parent1_id;
-- ALTER TABLE persons DROP COLUMN IF EXISTS parent2_id;
-- ALTER TABLE persons DROP COLUMN IF EXISTS spouse_id;
-- DROP INDEX IF EXISTS idx_persons_parent1;
-- DROP INDEX IF EXISTS idx_persons_parent2;
