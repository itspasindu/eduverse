-- Profile moderation: profanity strikes and suspension
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderation_strikes INTEGER NOT NULL DEFAULT 0
    CHECK (moderation_strikes >= 0),
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles (is_suspended)
  WHERE is_suspended = true;
