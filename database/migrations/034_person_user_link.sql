-- 034: persons 테이블에 user_id 추가 (당사자 계정 연결)
-- 인물이 초대를 수락하고 OC-ID를 발급받으면 user_id가 설정됨
-- user_id가 있으면 당사자가 자기 자료실의 주인이 됨

ALTER TABLE persons
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS user_id;
-- DROP INDEX IF EXISTS idx_persons_user_id;
