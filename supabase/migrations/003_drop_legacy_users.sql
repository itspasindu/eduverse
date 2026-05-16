-- Run only if you applied an older 001 that created a local `users` table.
-- Migrates posts to reference `profiles` and removes the legacy table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;

    INSERT INTO profiles (id, email, full_name, role)
    SELECT u.id, u.email, '', u.role
    FROM users u
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE posts
      ADD CONSTRAINT posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE;

    DROP TABLE users CASCADE;
  END IF;
END $$;
