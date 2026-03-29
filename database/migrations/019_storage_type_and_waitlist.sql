-- 019: storage_type 컬럼 + iCloud 대기자 테이블
-- 온보딩에서 선택한 저장소 타입을 기록

-- family_sites에 storage_type 추가
ALTER TABLE family_sites
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'google_drive';

-- iCloud 대기자 명단
CREATE TABLE IF NOT EXISTS icloud_waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Rollback:
-- ALTER TABLE family_sites DROP COLUMN IF EXISTS storage_type;
-- DROP TABLE IF EXISTS icloud_waitlist;
