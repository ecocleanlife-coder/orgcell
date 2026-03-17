-- ─── 전시관 (exhibitions) ───
CREATE TABLE IF NOT EXISTS exhibitions (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'family' CHECK (visibility IN ('public', 'family')),
    cover_photo TEXT,
    photo_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exhibitions_site_id ON exhibitions(site_id);
CREATE INDEX IF NOT EXISTS idx_exhibitions_visibility ON exhibitions(visibility);

-- ─── 방명록 (guestbooks) ───
CREATE TABLE IF NOT EXISTS guestbooks (
    id SERIAL PRIMARY KEY,
    exhibition_id INTEGER NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guestbooks_exhibition_id ON guestbooks(exhibition_id);

-- ─── 가족 게시판 글 (board_posts) ───
CREATE TABLE IF NOT EXISTS board_posts (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'daily' CHECK (category IN ('notice', 'daily', 'event', 'memory')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    author_name VARCHAR(100),
    comment_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_board_posts_site_id ON board_posts(site_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_category ON board_posts(category);

-- ─── 댓글 (board_comments) ───
CREATE TABLE IF NOT EXISTS board_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES board_posts(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES users(id),
    author_name VARCHAR(100),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_board_comments_post_id ON board_comments(post_id);
