-- Migration 018: family_sites에 tree_public 컬럼 추가
-- 기존 박물관은 모두 공개(TRUE) 기본값

ALTER TABLE family_sites
  ADD COLUMN IF NOT EXISTS tree_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Rollback:
-- ALTER TABLE family_sites DROP COLUMN IF EXISTS tree_public;
