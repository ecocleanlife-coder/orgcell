-- 사진 얼굴 위치 조정용 컬럼 추가
ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS photo_position JSONB DEFAULT '{"x":50,"y":50}';

-- ROLLBACK:
-- ALTER TABLE persons DROP COLUMN IF EXISTS photo_position;
