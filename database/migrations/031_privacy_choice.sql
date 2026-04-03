-- 031_privacy_choice.sql
-- persons 테이블에 프라이버시 선택 컬럼 추가
-- privacy_variant: 'full' | 'surname_only' | 'anonymous'
-- is_refused: 박물관 노출 거절 여부
-- relation_label: 관장과의 관계 (예: '장남', '차녀')

ALTER TABLE persons
ADD COLUMN IF NOT EXISTS privacy_variant VARCHAR(20) DEFAULT 'full',
ADD COLUMN IF NOT EXISTS is_refused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS relation_label VARCHAR(50);

-- family_invites에 person_id 연결 (어떤 인물에 대한 초대인지)
ALTER TABLE family_invites
ADD COLUMN IF NOT EXISTS person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL;

-- Rollback:
-- ALTER TABLE persons DROP COLUMN IF EXISTS privacy_variant;
-- ALTER TABLE persons DROP COLUMN IF EXISTS is_refused;
-- ALTER TABLE persons DROP COLUMN IF EXISTS relation_label;
-- ALTER TABLE family_invites DROP COLUMN IF EXISTS person_id;
