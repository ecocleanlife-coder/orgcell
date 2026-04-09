-- 041: family_sites에 본관 확정 여부 + subdomain 접두어 저장
-- bon_gwan_confirmed: TRUE면 본관 확정 상태 (LEE006-1 형식)
-- subdomain_prefix: 'LEE006' or 'LEE' (seq 제외한 앞부분)

ALTER TABLE family_sites
  ADD COLUMN IF NOT EXISTS bon_gwan_confirmed BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subdomain_prefix   VARCHAR(20);

-- 기존 데이터 backfill: subdomain_prefix = subdomain에서 '-숫자' 제거
UPDATE family_sites
SET subdomain_prefix = regexp_replace(subdomain, '-\d+$', '')
WHERE subdomain IS NOT NULL AND subdomain_prefix IS NULL;

CREATE INDEX IF NOT EXISTS idx_family_sites_subdomain_prefix
  ON family_sites(subdomain_prefix);

-- Rollback:
-- ALTER TABLE family_sites
--   DROP COLUMN IF EXISTS bon_gwan_confirmed,
--   DROP COLUMN IF EXISTS subdomain_prefix;
-- DROP INDEX IF EXISTS idx_family_sites_subdomain_prefix;
