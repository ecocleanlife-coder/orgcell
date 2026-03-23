-- 016: FamilySearch 연동 대비 DB 구조 준비
-- 현재 동작 변경 없음, 컬럼/테이블만 미리 추가

-- persons 테이블에 FamilySearch 연동 컬럼 추가
ALTER TABLE persons ADD COLUMN IF NOT EXISTS fs_person_id VARCHAR(20) DEFAULT NULL;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS fs_synced_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS fs_data JSONB DEFAULT NULL;

-- person_relations 테이블에 FamilySearch 관계 ID 추가
ALTER TABLE person_relations ADD COLUMN IF NOT EXISTS fs_relationship_id VARCHAR(20) DEFAULT NULL;

-- FamilySearch 메모리 연동 테이블 신규 생성
CREATE TABLE IF NOT EXISTS fs_memories (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES family_sites(id),
    person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    fs_memory_id VARCHAR(50) UNIQUE NOT NULL,
    memory_type VARCHAR(20) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    fs_url TEXT,
    local_copy_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs_memories_person ON fs_memories(person_id);
CREATE INDEX IF NOT EXISTS idx_fs_memories_site ON fs_memories(site_id);

-- FamilySearch OAuth 토큰 저장
ALTER TABLE users ADD COLUMN IF NOT EXISTS fs_access_token TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fs_token_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS fs_person_id;
-- ALTER TABLE persons DROP COLUMN IF EXISTS fs_synced_at;
-- ALTER TABLE persons DROP COLUMN IF EXISTS fs_data;
-- ALTER TABLE person_relations DROP COLUMN IF EXISTS fs_relationship_id;
-- DROP TABLE IF EXISTS fs_memories;
-- ALTER TABLE users DROP COLUMN IF EXISTS fs_access_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS fs_token_expires_at;
