-- 037: 이름 필드 확장 (결혼 전 성, 이전 이름)
-- Generated: 2026-04-05

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS maiden_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS former_name VARCHAR(50);

-- 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_persons_maiden_name ON persons(maiden_name) WHERE maiden_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_persons_former_name ON persons(former_name) WHERE former_name IS NOT NULL;

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS maiden_name, DROP COLUMN IF EXISTS former_name;
