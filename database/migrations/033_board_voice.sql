-- board_posts (게시판)
CREATE TABLE IF NOT EXISTS board_posts (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL,
    author_id INTEGER,
    author_name VARCHAR(100),
    category VARCHAR(30) DEFAULT 'daily',
    title VARCHAR(300) NOT NULL,
    content TEXT,
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_board_posts_site ON board_posts(site_id);

-- board_comments (댓글)
CREATE TABLE IF NOT EXISTS board_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    author_id INTEGER,
    author_name VARCHAR(100),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_board_comments_post ON board_comments(post_id);

-- voice_recordings (육성녹음)
CREATE TABLE IF NOT EXISTS voice_recordings (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL,
    person_id INTEGER,
    recorder_id INTEGER,
    file_path VARCHAR(500) NOT NULL,
    duration INTEGER DEFAULT 0,
    description VARCHAR(300),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_site ON voice_recordings(site_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_person ON voice_recordings(person_id);

-- Rollback
-- DROP TABLE IF EXISTS voice_recordings;
-- DROP TABLE IF EXISTS board_comments;
-- DROP TABLE IF EXISTS board_posts;
