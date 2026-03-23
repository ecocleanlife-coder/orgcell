-- 011: 웜홀 라우팅 (도메인 연합) 테이블
-- 특허 청구항 3, 4, 5번 핵심 구현

-- 공개키 레지스트리 (도메인별 RSA 키쌍)
CREATE TABLE IF NOT EXISTS domain_public_keys (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_public_keys_domain ON domain_public_keys(domain);

-- 도메인 연합 요청 테이블
CREATE TABLE IF NOT EXISTS federation_requests (
  id SERIAL PRIMARY KEY,
  source_site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  target_site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  source_domain VARCHAR(255) NOT NULL,
  target_domain VARCHAR(255) NOT NULL,
  source_node_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  target_node_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN ('direct','collateral','spouse')),
  source_public_key TEXT NOT NULL,
  target_public_key TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  agreed_scope JSONB DEFAULT '[]',
  nonce_cache JSONB DEFAULT '[]',
  requester_id INTEGER NOT NULL REFERENCES users(id),
  responder_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_federation_source ON federation_requests(source_site_id);
CREATE INDEX IF NOT EXISTS idx_federation_target ON federation_requests(target_site_id);
CREATE INDEX IF NOT EXISTS idx_federation_status ON federation_requests(status);
