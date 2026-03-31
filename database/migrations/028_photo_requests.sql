-- 028: 사진 요청 링크 (photo_requests)
-- 비로그인 사용자에게 공유하는 사진 요청 토큰

CREATE TABLE IF NOT EXISTS photo_requests (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    requester_name VARCHAR(100) NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_photo_requests_token ON photo_requests(token);
CREATE INDEX IF NOT EXISTS idx_photo_requests_site ON photo_requests(site_id);

-- Rollback:
-- DROP TABLE IF EXISTS photo_requests;
