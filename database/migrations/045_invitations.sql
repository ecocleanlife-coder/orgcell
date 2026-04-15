-- §17 초대 시스템 — invitations + refused_persons 테이블
-- Rollback: 045_invitations_rollback.sql

-- ── invitations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id           SERIAL PRIMARY KEY,
  site_id      INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  inviter_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email        VARCHAR(255),
  phone        VARCHAR(50),
  token        VARCHAR(100) UNIQUE NOT NULL,
  method       VARCHAR(20)  CHECK (method IN ('email', 'sms', 'link')),
  relation     VARCHAR(20)  CHECK (relation IN ('family', 'friend', 'other')),
  message      TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  display_pref VARCHAR(20)  CHECK (display_pref IN ('full', 'surname', 'anonymous')),
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_site_id ON invitations(site_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token   ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status  ON invitations(status);

-- ── refused_persons ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refused_persons (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
  invitation_id INTEGER REFERENCES invitations(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refused_persons_site_id ON refused_persons(site_id);
