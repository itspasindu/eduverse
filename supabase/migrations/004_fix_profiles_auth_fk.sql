-- Run if profiles was created with a FK to public.users instead of auth.users.
-- Error example: profiles_id_fkey ... not present in table "users"

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey1;

DO $$
BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
