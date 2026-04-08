-- 015_persons_name_fields.sql
-- 이름 필드 확장: 영어 여권명 + 별칭/구분

-- ROLLBACK:
-- ALTER TABLE persons DROP COLUMN IF EXISTS name_en;
-- ALTER TABLE persons DROP COLUMN IF EXISTS name_suffix;

ALTER TABLE persons ADD COLUMN IF NOT EXISTS name_en     VARCHAR(100);  -- 영어 여권 이름
ALTER TABLE persons ADD COLUMN IF NOT EXISTS name_suffix VARCHAR(20);   -- Jr., 2nd, 별칭 등

SELECT 'migration 015 complete' AS status;
