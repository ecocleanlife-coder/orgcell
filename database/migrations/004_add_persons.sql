-- 004: persons 테이블 (패밀리트리 DB 저장용)
CREATE TABLE IF NOT EXISTS persons (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birth_year INTEGER,
  death_year INTEGER,
  gender VARCHAR(10),
  privacy_level VARCHAR(20) DEFAULT 'family',
  parent1_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  parent2_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  spouse_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  generation INTEGER DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_persons_site_id ON persons(site_id);
CREATE INDEX IF NOT EXISTS idx_persons_parent1 ON persons(parent1_id);
CREATE INDEX IF NOT EXISTS idx_persons_parent2 ON persons(parent2_id);
