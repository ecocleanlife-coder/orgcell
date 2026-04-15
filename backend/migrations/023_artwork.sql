-- §8-E 작품실: artwork_folders + artworks 테이블 생성

CREATE TABLE IF NOT EXISTS artwork_folders (
  id         SERIAL PRIMARY KEY,
  site_id    INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person_id  INTEGER NOT NULL,
  name       VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artworks (
  id                SERIAL PRIMARY KEY,
  site_id           INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  person_id         INTEGER NOT NULL,
  folder_id         INTEGER REFERENCES artwork_folders(id) ON DELETE SET NULL,
  title             VARCHAR(255) NOT NULL,
  file_url          TEXT NOT NULL,
  filename          VARCHAR(255),          -- 실제 저장 파일명 (삭제용)
  file_type         VARCHAR(20),           -- jpg/png/heic/pdf/mp4
  file_size         BIGINT,               -- 용량 합산용 (bytes)
  year_created      SMALLINT,             -- 제작연도
  description       TEXT,                 -- 작품 설명
  is_representative BOOLEAN DEFAULT false,
  is_public         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artwork_folders_site ON artwork_folders(site_id);
CREATE INDEX IF NOT EXISTS idx_artworks_site        ON artworks(site_id);
CREATE INDEX IF NOT EXISTS idx_artworks_folder      ON artworks(folder_id);

-- 롤백:
-- DROP TABLE IF EXISTS artworks;
-- DROP TABLE IF EXISTS artwork_folders;
