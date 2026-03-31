-- 026: 바이럴 루프 강화 — museum_visitors 유입 추적 + family_invites 확장
-- Task 37: 친구 초대 및 바이럴 루프

-- ── museum_visitors 개선: 유입 추적 ──
ALTER TABLE museum_visitors
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_visitors_source ON museum_visitors(source);
CREATE INDEX IF NOT EXISTS idx_visitors_referral ON museum_visitors(referral_code);

-- ── family_invites 개선: 6자리 Short Code + 30일 만료 ──
ALTER TABLE family_invites
  ADD COLUMN IF NOT EXISTS short_code VARCHAR(6) UNIQUE;

-- expires_at, status 컬럼은 이미 존재 (007_add_family_invites.sql)
-- 기존 만료 기간을 7일 → 30일로 변경 (DEFAULT만 변경, 기존 데이터 영향 없음)
ALTER TABLE family_invites
  ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days');

CREATE INDEX IF NOT EXISTS idx_invites_short_code ON family_invites(short_code);

-- ── 통계 뷰: 친구 관계 요약 ──
CREATE OR REPLACE VIEW v_friendship_summary AS
SELECT
  fs.id AS site_id,
  fs.subdomain,
  COUNT(CASE WHEN f.status = 'accepted' THEN 1 END) AS accepted_count,
  COUNT(CASE WHEN f.status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN f.status = 'rejected' THEN 1 END) AS rejected_count,
  COUNT(*) AS total_count
FROM family_sites fs
LEFT JOIN friendships f ON f.site_id = fs.id
GROUP BY fs.id, fs.subdomain;

-- ── 통계 뷰: 방문자 통계 ──
CREATE OR REPLACE VIEW v_visitor_stats AS
SELECT
  mv.site_id,
  fs.subdomain,
  mv.source,
  COUNT(DISTINCT mv.visitor_user_id) AS unique_visitors,
  SUM(mv.visit_count) AS total_visits,
  MAX(mv.last_visited_at) AS last_visit_at
FROM museum_visitors mv
JOIN family_sites fs ON fs.id = mv.site_id
GROUP BY mv.site_id, fs.subdomain, mv.source;

-- Rollback
-- DROP VIEW IF EXISTS v_visitor_stats;
-- DROP VIEW IF EXISTS v_friendship_summary;
-- ALTER TABLE family_invites DROP COLUMN IF EXISTS short_code;
-- ALTER TABLE museum_visitors DROP COLUMN IF EXISTS source;
-- ALTER TABLE museum_visitors DROP COLUMN IF EXISTS referral_code;
-- ALTER TABLE museum_visitors DROP COLUMN IF EXISTS visit_count;
-- ALTER TABLE museum_visitors DROP COLUMN IF EXISTS last_visited_at;
