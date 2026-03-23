-- 015: 인물 음력/고인 필드 추가
ALTER TABLE persons ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN DEFAULT false;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_lunar BOOLEAN DEFAULT false;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS death_lunar BOOLEAN DEFAULT false;

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS is_deceased;
-- ALTER TABLE persons DROP COLUMN IF EXISTS birth_lunar;
-- ALTER TABLE persons DROP COLUMN IF EXISTS death_lunar;
