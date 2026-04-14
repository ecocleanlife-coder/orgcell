-- Migration 019: 사진자료실 폴더 시스템
-- photo_folders + archive_photos 테이블 생성
-- NOTE: photos 테이블은 기존에 존재 (일반 사진 스토리지) → archive_photos 별도 생성

-- 1. photo_folders (사용자 정의 폴더)
CREATE TABLE IF NOT EXISTS photo_folders (
    id          SERIAL PRIMARY KEY,
    site_id     INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    person_id   INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_photo_folders_site ON photo_folders(site_id);

-- 2. archive_photos (사진자료실 전용 — 기존 photos 테이블과 별개)
CREATE TABLE IF NOT EXISTS archive_photos (
    id               SERIAL PRIMARY KEY,
    site_id          INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    folder_id        INTEGER REFERENCES photo_folders(id) ON DELETE SET NULL,
    filename         TEXT NOT NULL,
    original_name    TEXT,
    url              TEXT NOT NULL,
    mime_type        VARCHAR(100),
    file_size        INTEGER,
    theme_tag        VARCHAR(20),
    is_representative BOOLEAN NOT NULL DEFAULT FALSE,
    memo             TEXT,
    uploaded_by      INTEGER REFERENCES users(id),
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archive_photos_site   ON archive_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_archive_photos_folder ON archive_photos(folder_id);

-- Rollback:
-- DROP TABLE IF EXISTS archive_photos;
-- DROP TABLE IF EXISTS photo_folders;
