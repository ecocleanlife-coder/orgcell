-- §16 입장권 테이블 (access_passes)
-- Legacy Pass: pass_type='legacy', expires_at=NULL (평생, linked 시 자동 발급)
-- Visitor Pass: pass_type='visitor', expires_at=설정일 (관장이 유효기간 지정)

CREATE TABLE IF NOT EXISTS access_passes (
    id          SERIAL PRIMARY KEY,
    site_id     INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pass_type   VARCHAR(10) NOT NULL DEFAULT 'visitor'
                    CHECK (pass_type IN ('legacy', 'visitor')),
    expires_at  TIMESTAMPTZ NULL,        -- NULL = 평생 유효 (Legacy Pass)
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (site_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_access_passes_site_user
    ON access_passes (site_id, user_id);

-- Rollback:
-- DROP TABLE IF EXISTS access_passes;
