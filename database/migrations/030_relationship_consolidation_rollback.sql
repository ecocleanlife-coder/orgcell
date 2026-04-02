-- 030 롤백: person_relations → persons 복원
-- 030_relationship_consolidation.sql 을 되돌릴 때 사용
--
-- 순서: Step 2 롤백(데이터 복원) → Step 1 롤백(컬럼 제거)

BEGIN;

-----------------------------------------------------------
-- Step 2 롤백: person_relations에서 persons 컬럼 복원
-----------------------------------------------------------

-- 2-A: parent 관계 → persons.parent1_id, parent2_id 복원
-- 각 자녀(person2_id)의 부모들을 birth_year 기준 정렬 후 첫 번째=parent1, 두 번째=parent2
WITH ranked_parents AS (
  SELECT
    pr.person2_id AS child_id,
    pr.person1_id AS parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY pr.person2_id
      ORDER BY COALESCE(parent.gender, 'Z'), pr.id
    ) AS rn
  FROM person_relations pr
  JOIN persons parent ON parent.id = pr.person1_id
  WHERE pr.relation_type = 'parent'
)
UPDATE persons p
SET parent1_id = rp.parent_id
FROM ranked_parents rp
WHERE rp.child_id = p.id AND rp.rn = 1;

WITH ranked_parents AS (
  SELECT
    pr.person2_id AS child_id,
    pr.person1_id AS parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY pr.person2_id
      ORDER BY COALESCE(parent.gender, 'Z'), pr.id
    ) AS rn
  FROM person_relations pr
  JOIN persons parent ON parent.id = pr.person1_id
  WHERE pr.relation_type = 'parent'
)
UPDATE persons p
SET parent2_id = rp.parent_id
FROM ranked_parents rp
WHERE rp.child_id = p.id AND rp.rn = 2;

-- 2-B: spouse 관계 → persons.spouse_id 복원 (양방향)
UPDATE persons p
SET spouse_id = pr.person2_id
FROM person_relations pr
WHERE pr.person1_id = p.id
  AND pr.relation_type = 'spouse'
  AND pr.is_active = true;

UPDATE persons p
SET spouse_id = pr.person1_id
FROM person_relations pr
WHERE pr.person2_id = p.id
  AND pr.relation_type = 'spouse'
  AND pr.is_active = true;

-- 2-C: 마이그레이션으로 추가된 parent/spouse 레코드 삭제
-- (기존 sibling 등은 보존)
-- 주의: 030 마이그레이션 이전에 이미 존재하던 parent/spouse는 구분 불가
-- 안전하게 parent/spouse 전체를 삭제하고 persons 컬럼이 정본 역할 복원
DELETE FROM person_relations
WHERE relation_type IN ('parent', 'spouse');

-----------------------------------------------------------
-- Step 1 롤백: 새로 추가한 컬럼 제거
-----------------------------------------------------------
ALTER TABLE person_relations DROP COLUMN IF EXISTS is_active;
ALTER TABLE person_relations DROP COLUMN IF EXISTS start_date;
ALTER TABLE person_relations DROP COLUMN IF EXISTS end_date;

DROP INDEX IF EXISTS idx_person_relations_type;

COMMIT;
