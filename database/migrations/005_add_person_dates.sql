-- 005: persons 테이블에 birth_date, death_date (DATE) 컬럼 추가
-- birth_year(정수)만으로는 달력 자동 연동 불가 → 월/일 포함 DATE 타입 필요

ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS death_date DATE;

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS birth_date;
-- ALTER TABLE persons DROP COLUMN IF EXISTS death_date;
