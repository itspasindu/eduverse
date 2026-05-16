-- Likes and comments with denormalized counts on posts

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
