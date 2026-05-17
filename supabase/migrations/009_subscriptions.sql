-- Subscription plans and per-user subscriptions (manual admin activation)

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('pending', 'active', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  tagline       TEXT,
  description   TEXT,
  price_cents   INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  billing_period TEXT NOT NULL DEFAULT 'month',
  features      JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES subscription_plans (id),
  status        subscription_status NOT NULL DEFAULT 'pending',
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  notes         TEXT,
  assigned_by   UUID REFERENCES profiles (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions (status);

DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Seed plans (idempotent)
INSERT INTO subscription_plans (slug, name, tagline, description, price_cents, billing_period, features, sort_order)
VALUES
  (
    'starter',
    'Starter',
    'Perfect for getting started',
    'Core learning tools to explore EduVerse at no cost.',
    0,
    'month',
    '["AI Tutor (10 sessions / month)","Community feed","Class announcements","Profile & library"]'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    'For serious learners & creators',
    'Unlock creative studios and unlimited AI tutoring.',
    1200,
    'month',
    '["Everything in Starter","Unlimited AI Tutor","Meme Studio","Characters & Lesson Studio","Priority generation queue"]'::jsonb,
    2
  ),
  (
    'institution',
    'Institution',
    'Classrooms and content teams',
    'Full platform access with tools for teachers and creators.',
    2900,
    'month',
    '["Everything in Pro","Slide Studio","Teacher dashboard tools","Bulk lesson materials","Dedicated support"]'::jsonb,
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_period = EXCLUDED.billing_period,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_public_read ON subscription_plans;
CREATE POLICY subscription_plans_public_read ON subscription_plans
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS user_subscriptions_select_own ON user_subscriptions;
CREATE POLICY user_subscriptions_select_own ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_subscriptions_insert_own ON user_subscriptions;
CREATE POLICY user_subscriptions_insert_own ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_subscriptions_update_own ON user_subscriptions;
CREATE POLICY user_subscriptions_update_own ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
