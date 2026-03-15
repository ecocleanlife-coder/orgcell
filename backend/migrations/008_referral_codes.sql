-- ksarang.org 추천 코드 시스템
CREATE TABLE IF NOT EXISTS referral_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_by VARCHAR(255),          -- 코드 발급 출처 (예: 'ksarang', 'admin')
    used_by VARCHAR(255),             -- 사용한 사용자 이메일
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_used_by ON referral_codes(used_by);

-- 테스트용 샘플 코드 (선택적)
-- INSERT INTO referral_codes (code, created_by) VALUES ('KSA-TEST01', 'ksarang') ON CONFLICT DO NOTHING;
