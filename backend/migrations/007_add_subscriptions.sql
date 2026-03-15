-- Stripe 결제 완료된 구독자 테이블
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    stripe_session_id VARCHAR(255) UNIQUE,
    amount_usd INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
