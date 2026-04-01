-- 029: persons 테이블에 biography 컬럼 추가
ALTER TABLE persons ADD COLUMN IF NOT EXISTS biography TEXT;
-- biography: 개인사, 업적, 추억 등 자유 텍스트

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS biography;
