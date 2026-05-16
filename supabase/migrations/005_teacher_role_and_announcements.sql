-- Teacher role + class announcements for teacher dashboard

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';

CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at
  ON announcements (created_at DESC);

DROP TRIGGER IF EXISTS announcements_updated_at ON announcements;
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_public"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "announcements_insert_teacher_own"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "announcements_delete_own"
  ON announcements FOR DELETE
  USING (auth.uid() = author_id);

-- Prefer user_metadata.role on signup (matches frontend signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    CASE
      WHEN meta_role IN ('student', 'creator', 'admin', 'teacher') THEN meta_role::user_role
      ELSE 'student'::user_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
