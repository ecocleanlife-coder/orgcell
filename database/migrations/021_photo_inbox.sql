-- 021: 사진 받은함 (photo_inbox)
-- 가족/친구가 보내온 사진이 쌓이는 곳

CREATE TABLE IF NOT EXISTS photo_inbox (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(100),
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, rejected
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photo_inbox_site ON photo_inbox(site_id);
CREATE INDEX IF NOT EXISTS idx_photo_inbox_status ON photo_inbox(site_id, status);

-- Rollback:
-- DROP TABLE IF EXISTS photo_inbox;
