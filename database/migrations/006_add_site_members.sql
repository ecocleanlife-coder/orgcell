-- Migration 006: site_members 테이블 (가족 사이트 멤버)
-- 프로덕션 deploy.yml에서 이미 생성되어 있으나, 마이그레이션 파일로 문서화

CREATE TABLE IF NOT EXISTS site_members (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_members_site_id ON site_members(site_id);
CREATE INDEX IF NOT EXISTS idx_site_members_user_id ON site_members(user_id);

-- Rollback:
-- DROP TABLE IF EXISTS site_members;
