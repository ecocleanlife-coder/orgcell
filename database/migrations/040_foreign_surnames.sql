-- 040: 외국인 성씨 DB (Subdomain 자동배정용)
-- §26-1-1: 외국인 → 성대문자 + 순번 (LAMBERT-1)

CREATE TABLE IF NOT EXISTS foreign_surnames (
  id          SERIAL PRIMARY KEY,
  surname_en  VARCHAR(30) NOT NULL,
  seq_counter INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_foreign_surnames_en
  ON foreign_surnames(surname_en);

-- Rollback:
-- DROP TABLE IF EXISTS foreign_surnames;
