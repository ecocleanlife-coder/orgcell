-- 014_ops_additive.sql
-- OPS §26 지원을 위한 기존 스키마 확장 (비파괴적 추가)
-- 실행 대상: orgcell-db Docker 컨테이너

-- 1. persons 테이블에 OPS 전용 컬럼 추가
ALTER TABLE persons ADD COLUMN IF NOT EXISTS person_id  VARCHAR(20) UNIQUE;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS match_status VARCHAR(20) DEFAULT 'ghost'
  CHECK (match_status IN ('ghost', 'pending', 'linked', 'canonical'));
ALTER TABLE persons ADD COLUMN IF NOT EXISTS bio1       VARCHAR(200);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS bio2       VARCHAR(200);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS bio3       VARCHAR(200);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS nationality VARCHAR(2);

-- 2. 기존 oc_id를 person_id로 backfill (형식 동일: KR-ABCDE)
UPDATE persons SET person_id = oc_id
WHERE oc_id IS NOT NULL AND person_id IS NULL;

-- 3. person_paths 테이블 생성
CREATE TABLE IF NOT EXISTS person_paths (
  id          SERIAL PRIMARY KEY,
  path        VARCHAR(500) NOT NULL UNIQUE,
  person_id   VARCHAR(20)  NOT NULL,
  is_canonical BOOLEAN     DEFAULT FALSE,
  created_by  VARCHAR(20),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_paths_person_id ON person_paths(person_id);
CREATE INDEX IF NOT EXISTS idx_person_paths_canonical ON person_paths(person_id) WHERE is_canonical = TRUE;

-- 4. notifications 테이블 생성
CREATE TABLE IF NOT EXISTS notifications (
  id                   SERIAL PRIMARY KEY,
  recipient_person_id  VARCHAR(20) NOT NULL,
  type                 VARCHAR(50) NOT NULL,
  payload              JSONB       DEFAULT '{}',
  is_read              BOOLEAN     DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_person_id);

-- 완료
SELECT 'migration 014 complete' AS status;
