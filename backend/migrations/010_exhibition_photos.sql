-- ─── 전시관 사진 (exhibition_photos) ───
CREATE TABLE IF NOT EXISTS exhibition_photos (
    id SERIAL PRIMARY KEY,
    exhibition_id INTEGER NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    filename TEXT NOT NULL,
    original_name TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'family', 'private')),
    is_cover BOOLEAN DEFAULT FALSE,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exhibition_photos_exhibition_id ON exhibition_photos(exhibition_id);

-- cover 사진은 전시관당 하나만
CREATE UNIQUE INDEX IF NOT EXISTS idx_exhibition_photos_cover
    ON exhibition_photos(exhibition_id)
    WHERE is_cover = TRUE;
