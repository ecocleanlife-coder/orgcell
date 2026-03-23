-- 012: exhibitions 테이블에 person_id, featured_photos, biography 추가
-- 조상기억하기 완성을 위한 컬럼

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS featured_photos JSONB DEFAULT '[]';
-- featured_photos: ["url1", "url2", "url3"] 형태, 대형 전시용 주요 사진 최대 3개
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS biography TEXT;
-- biography: 이력 (텍스트 자유 입력)

CREATE INDEX IF NOT EXISTS idx_exhibitions_person_id ON exhibitions(person_id);
