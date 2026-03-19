-- Migration 001: 유저별 전체 업로드 사진 수 추적
-- 실행일: 2026-03-19

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0;

-- 기존 데이터 동기화 (exhibition_photos의 uploaded_by 기준 카운트)
UPDATE users u
SET photo_count = (
    SELECT COUNT(*) FROM exhibition_photos ep WHERE ep.uploaded_by = u.id
);
