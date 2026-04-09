-- 042: 온보딩 법적 이름 + 다른 이름 컬럼 추가
-- Generated: 2026-04-09

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS name_legal_last  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS name_legal_first VARCHAR(50),
  ADD COLUMN IF NOT EXISTS name_other       JSONB NOT NULL DEFAULT '[]'::JSONB;

-- 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_persons_name_legal
  ON persons(name_legal_last, name_legal_first)
  WHERE name_legal_last IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_persons_name_other
  ON persons USING GIN (name_other)
  WHERE name_other <> '[]'::JSONB;

-- Rollback:
-- ALTER TABLE persons
--   DROP COLUMN IF EXISTS name_legal_last,
--   DROP COLUMN IF EXISTS name_legal_first,
--   DROP COLUMN IF EXISTS name_other;
-- DROP INDEX IF EXISTS idx_persons_name_legal;
-- DROP INDEX IF EXISTS idx_persons_name_other;
