-- Migration 020: 주요자료실 폴더 시스템 (§8-B)
-- document_folders + documents 테이블 생성

-- 1. document_folders (사용자 정의 폴더)
CREATE TABLE IF NOT EXISTS document_folders (
    id          SERIAL PRIMARY KEY,
    site_id     INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    person_id   INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    name        VARCHAR(100) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_folders_site ON document_folders(site_id);

-- 2. documents (주요자료실 자료)
CREATE TABLE IF NOT EXISTS documents (
    id               SERIAL PRIMARY KEY,
    site_id          INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    person_id        INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    folder_id        INTEGER REFERENCES document_folders(id) ON DELETE SET NULL,
    title            VARCHAR(255) NOT NULL,
    file_url         TEXT,
    filename         TEXT,
    original_name    TEXT,
    file_type        VARCHAR(20),
    file_size        BIGINT DEFAULT 0,
    memo             TEXT,
    is_representative BOOLEAN NOT NULL DEFAULT FALSE,
    is_public        BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by      INTEGER REFERENCES users(id),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_site   ON documents(site_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);

-- Rollback:
-- DROP TABLE IF EXISTS documents;
-- DROP TABLE IF EXISTS document_folders;
