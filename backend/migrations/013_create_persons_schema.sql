-- 013_create_persons_schema.sql
-- OPS §26-2 persons 기반 신규 스키마 + 기존 데이터 이전
-- 실행 순서: 013 완료 후 012 재실행

-- ROLLBACK:
-- DROP TABLE IF EXISTS sites;
-- DROP TABLE IF EXISTS person_relations;
-- DROP TABLE IF EXISTS persons;
-- DROP TABLE IF EXISTS accounts;

-- ─────────────────────────────────────────────
-- 1. accounts (로그인 계정)
--    기존 users는 Google OAuth 전용 → provider='google'로 이전
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),                        -- email 가입 시 사용
  provider    VARCHAR(20) DEFAULT 'email',            -- 'email' | 'google' | 'kakao'
  provider_id VARCHAR(255),                          -- Google: google_id
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. persons (인물 실체 — OPS §26-2)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS persons (
  person_id   VARCHAR(20) PRIMARY KEY,               -- KR-A3K7B
  name        VARCHAR(100) NOT NULL,
  birth_date  DATE,
  death_date  DATE,
  gender      VARCHAR(10),
  nationality VARCHAR(10) DEFAULT 'KR',
  bio1        VARCHAR(200),
  bio2        VARCHAR(200),
  bio3        VARCHAR(200),
  photo_url   VARCHAR(500),
  account_id  INTEGER REFERENCES accounts(id) DEFAULT NULL,
  match_status VARCHAR(20) DEFAULT 'ghost'
    CHECK (match_status IN ('ghost', 'pending', 'linked')),
  created_by  VARCHAR(20),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. person_relations (관계)
--    relation_type: parent-child | spouse | sibling | birth-parent
--    parent-child: person_id_1=부모, person_id_2=자녀
--    spouse/sibling: 양방향
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS person_relations (
  id            SERIAL PRIMARY KEY,
  person_id_1   VARCHAR(20) NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
  person_id_2   VARCHAR(20) NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE,
  relation_type VARCHAR(30) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_person_relation UNIQUE (person_id_1, person_id_2, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_person_relations_1 ON person_relations(person_id_1);
CREATE INDEX IF NOT EXISTS idx_person_relations_2 ON person_relations(person_id_2);

-- ─────────────────────────────────────────────
-- 4. sites (박물관 — 기존 family_sites 대체)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id              SERIAL PRIMARY KEY,
  subdomain       VARCHAR(100) UNIQUE NOT NULL,      -- 'lee'
  owner_person_id VARCHAR(20) REFERENCES persons(person_id) ON DELETE SET NULL,
  display_name    VARCHAR(200),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 데이터 이전
-- ─────────────────────────────────────────────

-- users → accounts (Google OAuth 계정으로 이전)
INSERT INTO accounts (email, provider, provider_id, created_at)
SELECT
  email,
  'google',
  google_id,
  created_at
FROM users
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- family_sites → sites (subdomain, display_name=subdomain으로 임시 설정)
INSERT INTO sites (subdomain, display_name, created_at)
SELECT
  subdomain,
  subdomain,        -- family_sites에 name 컬럼 없음 → subdomain을 임시 표시명으로 사용
  created_at
FROM family_sites
ON CONFLICT (subdomain) DO NOTHING;
