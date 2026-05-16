-- =============================================================================
-- EduVerse AI — COMPLETE Supabase database setup (run once in SQL Editor)
-- Dashboard: https://supabase.com/dashboard → your project → SQL → New query
-- Paste this entire file → Run
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where possible
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'creator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add teacher + ensure all roles exist (ignore if already present)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';

DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('meme', 'video');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'student',
  avatar_url    TEXT,
  moderation_strikes INTEGER NOT NULL DEFAULT 0 CHECK (moderation_strikes >= 0),
  is_suspended  BOOLEAN NOT NULL DEFAULT false,
  suspended_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  type          post_type NOT NULL,
  content_url   TEXT NOT NULL,
  caption       TEXT,
  likes         INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  comments      INTEGER NOT NULL DEFAULT 0 CHECK (comments >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts (type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. FOREIGN KEYS (must point to auth.users + profiles, NOT legacy public.users)
-- -----------------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey1;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

ALTER TABLE posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_author_id_fkey;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES profiles (id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. LEGACY cleanup (only if old `users` table exists)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    INSERT INTO profiles (id, email, full_name, role)
    SELECT u.id, u.email, '', u.role::text::user_role
    FROM users u
    ON CONFLICT (id) DO NOTHING;

    DROP TABLE users CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. TRIGGERS — updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. AUTO-CREATE PROFILE ON SIGNUP (fixes signup → profiles row)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role TEXT;
BEGIN
  meta_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_app_meta_data->>'role',
    'student'
  );

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    CASE
      WHEN meta_role IN ('student', 'creator', 'admin', 'teacher')
        THEN meta_role::user_role
      ELSE 'student'::user_role
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing auth users missing a row
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  CASE
    WHEN COALESCE(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', 'student')
      IN ('student', 'creator', 'admin', 'teacher')
    THEN COALESCE(u.raw_user_meta_data->>'role', u.raw_app_meta_data->>'role', 'student')::user_role
    ELSE 'student'::user_role
  END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_select_public" ON posts;
CREATE POLICY "posts_select_public"
  ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "announcements_select_public" ON announcements;
CREATE POLICY "announcements_select_public"
  ON announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "announcements_insert_teacher_own" ON announcements;
CREATE POLICY "announcements_insert_teacher_own"
  ON announcements FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "announcements_delete_own" ON announcements;
CREATE POLICY "announcements_delete_own"
  ON announcements FOR DELETE USING (auth.uid() = author_id);

-- -----------------------------------------------------------------------------
-- 8. STORAGE — profile avatars bucket
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_upload" ON storage.objects;
CREATE POLICY "avatars_user_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
CREATE POLICY "avatars_user_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- -----------------------------------------------------------------------------
-- Post likes & comments (007)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (char_length(trim(body)) >= 1 AND char_length(body) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments (post_id, created_at DESC);

CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_count ON post_likes;
CREATE TRIGGER post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments = comments + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments = GREATEST(comments - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comments_count ON post_comments;
CREATE TRIGGER post_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_public" ON post_likes;
CREATE POLICY "post_likes_select_public"
  ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_likes_insert_own" ON post_likes;
CREATE POLICY "post_likes_insert_own"
  ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_likes_delete_own" ON post_likes;
CREATE POLICY "post_likes_delete_own"
  ON post_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_comments_select_public" ON post_comments;
CREATE POLICY "post_comments_select_public"
  ON post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_comments_insert_own" ON post_comments;
CREATE POLICY "post_comments_insert_own"
  ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "post_comments_delete_own" ON post_comments;
CREATE POLICY "post_comments_delete_own"
  ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 9. Profile moderation (migration 008)
-- -----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderation_strikes INTEGER NOT NULL DEFAULT 0
    CHECK (moderation_strikes >= 0),
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles (is_suspended)
  WHERE is_suspended = true;

-- -----------------------------------------------------------------------------
-- 10. Security: audit, reports, AI usage (migration 009)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Done — verify
-- -----------------------------------------------------------------------------
SELECT 'profiles' AS table_name, COUNT(*) AS rows FROM profiles
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'announcements', COUNT(*) FROM announcements;
