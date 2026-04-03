-- 032_access_requests.sql
-- 전시관 접근 요청 테이블
-- 비공개 인물의 전시관에 접근 요청 + 승인/거절 관리

CREATE TABLE IF NOT EXISTS access_requests (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    requester_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL DEFAULT 'view',  -- view, exhibit
    status VARCHAR(20) NOT NULL DEFAULT 'pending',     -- pending, approved, rejected
    message TEXT,                                       -- 요청 메시지
    responded_at TIMESTAMPTZ,
    responded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 중복 요청 방지 + 조회 최적화
CREATE UNIQUE INDEX IF NOT EXISTS idx_access_requests_unique
    ON access_requests(site_id, person_id, requester_user_id, request_type)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_access_requests_person
    ON access_requests(person_id, status);

CREATE INDEX IF NOT EXISTS idx_access_requests_site
    ON access_requests(site_id, status);

-- Rollback:
-- DROP TABLE IF EXISTS access_requests;
