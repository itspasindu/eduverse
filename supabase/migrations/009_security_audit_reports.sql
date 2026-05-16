-- Audit log, content reports, daily AI usage caps

CREATE TABLE IF NOT EXISTS audit_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events (actor_id);

CREATE TABLE IF NOT EXISTS content_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id    UUID NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id        UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  usage_date     DATE NOT NULL,
  request_count  INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
