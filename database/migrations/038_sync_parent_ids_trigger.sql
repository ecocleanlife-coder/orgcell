-- 038: person_relations → persons 자동 동기화 트리거 + 중복 정리
-- 목적 1: person_relations INSERT/UPDATE/DELETE 시
--         persons.parent1_id / parent2_id / spouse_id 자동 동기화
-- 목적 2: 기존 중복 레코드 정리 (John Lambert 중복 등)
-- 목적 3: 현재 데이터 백필 (이은섭 parent_id NULL 수정)
-- 비고: uq_person_relation(site_id,person1_id,person2_id,relation_type) 이미 존재

BEGIN;

-----------------------------------------------------------
-- Step 1: 중복 레코드 정리
-- 각 (site_id, person1_id, person2_id, relation_type) 그룹에서
-- id가 가장 작은 행만 남기고 나머지 삭제
-----------------------------------------------------------
DELETE FROM person_relations
WHERE id NOT IN (
  SELECT MIN(id)
  FROM person_relations
  GROUP BY site_id, person1_id, person2_id, relation_type
);

-----------------------------------------------------------
-- Step 2: 동기화 트리거 함수
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_persons_from_relations()
RETURNS TRIGGER AS $$
BEGIN

  -- ① OLD 정리 (UPDATE / DELETE 시 기존 값 제거)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN

    IF OLD.relation_type = 'parent' THEN
      -- 자녀(person2_id)의 parent1_id / parent2_id 중 OLD.person1_id 참조 제거
      UPDATE persons SET
        parent1_id = CASE WHEN parent1_id = OLD.person1_id THEN NULL ELSE parent1_id END,
        parent2_id = CASE WHEN parent2_id = OLD.person1_id THEN NULL ELSE parent2_id END
      WHERE id = OLD.person2_id;

    ELSIF OLD.relation_type = 'spouse' THEN
      UPDATE persons SET spouse_id = NULL
        WHERE id = OLD.person1_id AND spouse_id = OLD.person2_id;
      UPDATE persons SET spouse_id = NULL
        WHERE id = OLD.person2_id AND spouse_id = OLD.person1_id;
    END IF;

  END IF;

  -- ② NEW 설정 (INSERT / UPDATE 시 새 값 반영)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN

    IF NEW.relation_type = 'parent' THEN
      -- parent1_id가 비어있으면 채우고, 다른 부모가 이미 있으면 parent2_id에 채움
      UPDATE persons SET
        parent1_id = CASE
          WHEN parent1_id IS NULL THEN NEW.person1_id
          ELSE parent1_id
        END,
        parent2_id = CASE
          WHEN parent1_id IS NOT NULL
            AND parent1_id <> NEW.person1_id
            AND parent2_id IS NULL
          THEN NEW.person1_id
          ELSE parent2_id
        END
      WHERE id = NEW.person2_id;

    ELSIF NEW.relation_type = 'spouse' THEN
      UPDATE persons SET spouse_id = NEW.person2_id WHERE id = NEW.person1_id;
      UPDATE persons SET spouse_id = NEW.person1_id WHERE id = NEW.person2_id;
    END IF;

  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-----------------------------------------------------------
-- Step 3: 트리거 등록
-----------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_persons_from_relations ON person_relations;

CREATE TRIGGER trg_sync_persons_from_relations
  AFTER INSERT OR UPDATE OR DELETE ON person_relations
  FOR EACH ROW EXECUTE FUNCTION sync_persons_from_relations();

-----------------------------------------------------------
-- Step 4: 기존 데이터 백필
-- (트리거는 앞으로의 변경만 처리 → 현재 데이터 수동 동기화)
-----------------------------------------------------------

-- 4-A: parent 관계 → parent1_id 채우기
UPDATE persons child
SET parent1_id = pr.person1_id
FROM person_relations pr
WHERE pr.person2_id = child.id
  AND pr.relation_type = 'parent'
  AND child.parent1_id IS NULL;

-- 4-B: parent 관계 → parent2_id 채우기 (두 번째 부모)
UPDATE persons child
SET parent2_id = pr.person1_id
FROM person_relations pr
WHERE pr.person2_id = child.id
  AND pr.relation_type = 'parent'
  AND child.parent1_id IS NOT NULL
  AND child.parent1_id <> pr.person1_id
  AND child.parent2_id IS NULL;

-- 4-C: spouse 관계 → spouse_id 채우기 (person1 방향)
UPDATE persons p
SET spouse_id = pr.person2_id
FROM person_relations pr
WHERE pr.person1_id = p.id
  AND pr.relation_type = 'spouse'
  AND p.spouse_id IS NULL;

-- 4-D: spouse 관계 → spouse_id 채우기 (person2 방향)
UPDATE persons p
SET spouse_id = pr.person1_id
FROM person_relations pr
WHERE pr.person2_id = p.id
  AND pr.relation_type = 'spouse'
  AND p.spouse_id IS NULL;

-----------------------------------------------------------
-- Step 5: 검증
-----------------------------------------------------------
SELECT
  '중복 레코드 수' AS check_item,
  COUNT(*) - COUNT(DISTINCT (site_id, person1_id, person2_id, relation_type)) AS result
FROM person_relations

;

COMMIT;
