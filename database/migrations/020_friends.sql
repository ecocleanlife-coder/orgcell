-- 020: 친구 관계 + 박물관 방문자 테이블
-- 바이럴 루프: 친구 초대 → 방문 → 가입 유도

-- 친구 관계 (사이트 간)
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  friend_site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, friend_site_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_site ON friendships(site_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_site_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 박물관 방문 기록
CREATE TABLE IF NOT EXISTS museum_visitors (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  visitor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_site ON museum_visitors(site_id);
CREATE INDEX IF NOT EXISTS idx_visitors_user ON museum_visitors(visitor_user_id);

-- Rollback
-- DROP TABLE IF EXISTS museum_visitors;
-- DROP TABLE IF EXISTS friendships;
