CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    admin_key VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domains_subdomain ON domains(subdomain);
CREATE INDEX idx_domains_admin_key ON domains(admin_key);
