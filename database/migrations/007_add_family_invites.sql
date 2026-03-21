-- Migration 007: family_invites 테이블 (가족 초대 코드)
-- 프로덕션 deploy.yml에서 이미 생성되어 있으나, 마이그레이션 파일로 문서화

CREATE TABLE IF NOT EXISTS family_invites (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    inviter_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_family_invites_code ON family_invites(code);
CREATE INDEX IF NOT EXISTS idx_family_invites_site_id ON family_invites(site_id);

-- Rollback:
-- DROP TABLE IF EXISTS family_invites;
