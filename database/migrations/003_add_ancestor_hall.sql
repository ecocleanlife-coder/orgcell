-- Migration 003: 조상전시관 지원을 위한 exhibitions 테이블 확장
-- 기존 exhibitions를 'general'(행사관)과 'ancestor'(조상전시관)로 구분

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS hall_type VARCHAR(50) DEFAULT 'general';
-- hall_type: 'general' | 'ancestor'

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS birth_year INTEGER;
-- 조상 출생연도

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS death_year INTEGER;
-- 조상 사망연도

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS memoir TEXT;
-- 회고록 / 약력 텍스트

ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS relation VARCHAR(100);
-- 관계: '증조부', '할머니', '선조' 등

CREATE INDEX IF NOT EXISTS idx_exhibitions_hall_type
  ON exhibitions(site_id, hall_type);
