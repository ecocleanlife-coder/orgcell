-- §8-C 주요약력: career_items 테이블
CREATE TABLE IF NOT EXISTS career_items (
  id          SERIAL PRIMARY KEY,
  site_id     INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person_id   INTEGER NOT NULL,
  year        SMALLINT NOT NULL,
  content     VARCHAR(300) NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_items_site ON career_items(site_id);
CREATE INDEX IF NOT EXISTS idx_career_items_person ON career_items(person_id);
