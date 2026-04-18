-- 046_link_requests.sql
-- 신규 가입자 ↔ 기존 인물 연결 요청 (관장 승인 필요)

CREATE TABLE IF NOT EXISTS link_requests (
  id               SERIAL PRIMARY KEY,
  person_id        INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  site_id          INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  requester_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  requester_name   TEXT NOT NULL,
  requester_email  TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  token            TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_link_requests_site_id  ON link_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_link_requests_token    ON link_requests(token);
CREATE INDEX IF NOT EXISTS idx_link_requests_person_id ON link_requests(person_id);
