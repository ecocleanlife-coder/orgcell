-- 027: family_sites에 박물관 목록용 필드 추가
-- title, description, thumbnail_url

ALTER TABLE family_sites
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 기존 데이터: title이 없으면 subdomain을 title로 채움
UPDATE family_sites SET title = subdomain WHERE title IS NULL;

-- Rollback:
-- ALTER TABLE family_sites
--   DROP COLUMN IF EXISTS title,
--   DROP COLUMN IF EXISTS description,
--   DROP COLUMN IF EXISTS thumbnail_url;
