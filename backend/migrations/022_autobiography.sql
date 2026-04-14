-- §8-D 자서전: autobiography_chapters / autobiography_files 테이블
CREATE TABLE IF NOT EXISTS autobiography_chapters (
  id          SERIAL PRIMARY KEY,
  site_id     INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person_id   INTEGER NOT NULL,
  title       VARCHAR(255) NOT NULL,
  content     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autobiography_files (
  id           SERIAL PRIMARY KEY,
  site_id      INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person_id    INTEGER NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    VARCHAR(20),
  file_name    VARCHAR(255),
  is_extracted BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_chapters_site   ON autobiography_chapters(site_id);
CREATE INDEX IF NOT EXISTS idx_auto_chapters_person ON autobiography_chapters(person_id);
CREATE INDEX IF NOT EXISTS idx_auto_files_site      ON autobiography_files(site_id);
