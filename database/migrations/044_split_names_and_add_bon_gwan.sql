-- 043: persons 테이블 이름 분리
-- Generated: 2026-04-12

-- persons 테이블 수정: name 컬럼 제거 후 first_name, last_name 추가
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);

-- 기존 name 데이터를 first_name, last_name으로 분리
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='persons' AND column_name='name') THEN
    UPDATE persons
    SET
      last_name = CASE WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name, 1, POSITION(' ' IN name) - 1) ELSE name END,
      first_name = CASE WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name, POSITION(' ' IN name) + 1) ELSE '' END
    WHERE
      name IS NOT NULL AND last_name IS NULL AND first_name IS NULL;

    ALTER TABLE persons DROP COLUMN name;
  END IF;
END $$;

-- 부모님 이름 필드 추가
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS father_first_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS father_last_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mother_first_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mother_last_name VARCHAR(50);

-- 인덱스 추가 (선택 사항이지만 검색 성능을 위해 추가)
CREATE INDEX IF NOT EXISTS idx_persons_first_name ON persons(first_name);
CREATE INDEX IF NOT EXISTS idx_persons_last_name ON persons(last_name);

-- Rollback (필요시)
-- ALTER TABLE persons
--   ADD COLUMN IF NOT EXISTS name VARCHAR(100);
-- UPDATE persons SET name = COALESCE(last_name || ' ', '') || COALESCE(first_name, '');
-- ALTER TABLE persons DROP COLUMN IF EXISTS first_name, DROP COLUMN IF EXISTS last_name;
-- ALTER TABLE persons DROP COLUMN IF EXISTS father_first_name, DROP COLUMN IF EXISTS father_last_name, DROP COLUMN IF EXISTS mother_first_name, DROP COLUMN IF EXISTS mother_last_name;
-- DROP INDEX IF EXISTS idx_persons_first_name;
-- DROP INDEX IF EXISTS idx_persons_last_name;