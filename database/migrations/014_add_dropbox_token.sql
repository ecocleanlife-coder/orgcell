-- 014: users 테이블에 dropbox_token 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS dropbox_token JSONB DEFAULT NULL;
