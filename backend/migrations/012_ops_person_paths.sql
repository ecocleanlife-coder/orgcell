-- OPS (Orgcell Path System) — 인물 경로 및 통합 규칙
-- §26 참조: path는 alias, 실체는 person_id (선점 원칙)

-- ROLLBACK:
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS person_paths;
-- ALTER TABLE persons DROP COLUMN IF EXISTS account_id;
-- ALTER TABLE persons DROP COLUMN IF EXISTS match_status;

-- 1. 인물 경로 alias 테이블
CREATE TABLE IF NOT EXISTS person_paths (
  id          SERIAL PRIMARY KEY,
  path        VARCHAR(500) NOT NULL UNIQUE,   -- e.g. orgcell/lee/s1/w
  person_id   VARCHAR(20)  NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
  is_canonical BOOLEAN     DEFAULT FALSE,     -- TRUE = 최초 생성된 선점 경로
  created_by  VARCHAR(20),                    -- 생성한 관장 person_id
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_person_paths_person_id ON person_paths(person_id);

-- 2. persons 테이블 확장
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS account_id   INTEGER REFERENCES accounts(id) DEFAULT NULL;
  -- ghost: 등록만 된 상태 / linked: 실제 계정 연결됨 / pending: 동명이인 보류
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS match_status VARCHAR(20) DEFAULT 'ghost'
    CHECK (match_status IN ('ghost', 'linked', 'pending'));

-- 3. 알림 테이블 (매칭 통합 후 양측 관장에게 발송)
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  recipient_person_id VARCHAR(20) NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,           -- 'merge_alert' | 'merge_conflict' 등
  payload     JSONB        DEFAULT '{}',      -- 관련 person_id, path 등 메타데이터
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_person_id, is_read);
