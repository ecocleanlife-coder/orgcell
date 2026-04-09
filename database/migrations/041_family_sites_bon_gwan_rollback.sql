-- 041 Rollback
ALTER TABLE family_sites
  DROP COLUMN IF EXISTS bon_gwan_confirmed,
  DROP COLUMN IF EXISTS subdomain_prefix;

DROP INDEX IF EXISTS idx_family_sites_subdomain_prefix;
