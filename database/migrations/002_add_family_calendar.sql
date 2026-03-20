-- Migration 002: 가족 달력 테이블
-- 생일/기념일/행사/추모일을 site별로 관리

CREATE TABLE IF NOT EXISTS family_calendar (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  event_type VARCHAR(50) DEFAULT 'event',
  -- event_type: 'birthday' | 'anniversary' | 'event' | 'memorial'
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  -- 생일/기념일은 매년 반복 (month/day만 매칭)
  person_name VARCHAR(100),
  -- persons 테이블 없으므로 이름 직접 저장 (생일인 경우)
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_calendar_site_date
  ON family_calendar(site_id, event_date);

CREATE INDEX IF NOT EXISTS idx_family_calendar_recurring
  ON family_calendar(site_id, is_recurring);
