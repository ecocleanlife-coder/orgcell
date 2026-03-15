-- Migration 005: Add families table for family grouping
-- 대표자 1명의 Google Drive를 가족 전체가 공유하는 BYOS 구조

CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'My Family',
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    admin_key VARCHAR(50) UNIQUE NOT NULL,
    subdomain VARCHAR(255) UNIQUE,
    google_drive_token TEXT,              -- 대표자의 Drive 토큰 (가족 공유)
    plan VARCHAR(20) DEFAULT 'basic',     -- basic, premium
    status VARCHAR(20) DEFAULT 'active',  -- active, suspended
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- users 테이블에 family_id, role 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'guest';
-- role: 'admin' (대표자/Google연결), 'member' (가족구성원), 'guest' (열람전용)

CREATE INDEX idx_families_admin_key ON families(admin_key);
CREATE INDEX idx_families_subdomain ON families(subdomain);
CREATE INDEX idx_users_family_id ON users(family_id);
