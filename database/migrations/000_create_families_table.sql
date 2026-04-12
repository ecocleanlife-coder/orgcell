-- 000: families 테이블 생성
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_key VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    google_drive_token JSONB,
    bon_gwan VARCHAR(100), -- Add bon_gwan here directly
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_families_admin_user_id ON families(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_families_subdomain ON families(subdomain);
CREATE INDEX IF NOT EXISTS idx_families_bon_gwan ON families(bon_gwan);