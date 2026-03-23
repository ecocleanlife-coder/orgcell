-- 013: 디지털 유산 승계 테이블
CREATE TABLE IF NOT EXISTS digital_heritage (
  id SERIAL PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  beneficiary_name VARCHAR(100) NOT NULL,
  beneficiary_email VARCHAR(255) NOT NULL,
  beneficiary_relation VARCHAR(50),
  activation_condition VARCHAR(50) DEFAULT 'inactivity_1year',
  -- activation_condition: inactivity_1year, inactivity_2year, manual
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_heritage_site ON digital_heritage(site_id);
