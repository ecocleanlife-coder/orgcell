-- 035: person_external_ids 테이블 생성
-- FamilySearch 등 외부 서비스의 인물 ID를 매핑

CREATE TABLE IF NOT EXISTS person_external_ids (
    id SERIAL PRIMARY KEY,
    person_id INTEGER REFERENCES persons(id) ON DELETE CASCADE,
    oc_id VARCHAR(12),
    source VARCHAR(50) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    verified BOOLEAN DEFAULT false,
    confidence_level INTEGER DEFAULT 1,
    added_by VARCHAR(20) DEFAULT 'self',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_person_external_ids_person ON person_external_ids(person_id);
CREATE INDEX IF NOT EXISTS idx_person_external_ids_source ON person_external_ids(source, external_id);
CREATE INDEX IF NOT EXISTS idx_person_external_ids_oc_id ON person_external_ids(oc_id);

-- 기존 persons.fs_person_id 데이터가 있으면 이관
INSERT INTO person_external_ids (person_id, source, external_id, verified, confidence_level, added_by)
SELECT id, 'familysearch', fs_person_id, true, 2, 'migration'
FROM persons
WHERE fs_person_id IS NOT NULL
ON CONFLICT (source, external_id) DO NOTHING;

-- Rollback:
-- DROP TABLE IF EXISTS person_external_ids;
