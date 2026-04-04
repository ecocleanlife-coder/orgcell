-- 036: persons 테이블에 oc_id + 국가 컬럼 추가
-- 형식: KR-A3K7B (국가코드-5자리랜덤)

ALTER TABLE persons ADD COLUMN IF NOT EXISTS oc_id VARCHAR(8) UNIQUE;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_country VARCHAR(2);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS residence_country VARCHAR(2);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_persons_oc_id ON persons(oc_id);

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS oc_id;
-- ALTER TABLE persons DROP COLUMN IF EXISTS birth_country;
-- ALTER TABLE persons DROP COLUMN IF EXISTS residence_country;
-- ALTER TABLE persons DROP COLUMN IF EXISTS invited_by;
-- DROP INDEX IF EXISTS idx_persons_oc_id;
