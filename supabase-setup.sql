-- Complete Supabase setup for likes, comments, and points
-- Run this in your Supabase SQL Editor

-- 1. Create increment_points RPC function (if not exists)
-- Drop existing function first to avoid parameter conflicts
DROP FUNCTION IF EXISTS increment_points(UUID, INT);

CREATE FUNCTION increment_points(user_id_input UUID, amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET points = COALESCE(points, 0) + amount
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure user_profiles table has points column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN points INT DEFAULT 0;
  END IF;
END $$;

-- 3. Create trend_likes table (if not exists)
CREATE TABLE IF NOT EXISTS trend_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trend_id, user_id)
);

-- 4. Create trend_comments table (if not exists)
CREATE TABLE IF NOT EXISTS trend_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create trend_comment_likes table (if not exists)
CREATE TABLE IF NOT EXISTS trend_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES trend_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 6. Enable RLS on all tables
ALTER TABLE trend_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comment_likes ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view trend likes" ON trend_likes;
DROP POLICY IF EXISTS "Users can insert their own trend likes" ON trend_likes;
DROP POLICY IF EXISTS "Users can delete their own trend likes" ON trend_likes;

DROP POLICY IF EXISTS "Anyone can view trend comments" ON trend_comments;
DROP POLICY IF EXISTS "Users can insert their own trend comments" ON trend_comments;
DROP POLICY IF EXISTS "Users can delete their own trend comments" ON trend_comments;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON trend_comment_likes;
DROP POLICY IF EXISTS "Users can insert their own comment likes" ON trend_comment_likes;
DROP POLICY IF EXISTS "Users can delete their own comment likes" ON trend_comment_likes;

-- 8. Create RLS policies for trend_likes
CREATE POLICY "Anyone can view trend likes"
  ON trend_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trend likes"
  ON trend_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend likes"
  ON trend_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 9. Create RLS policies for trend_comments
CREATE POLICY "Anyone can view trend comments"
  ON trend_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trend comments"
  ON trend_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend comments"
  ON trend_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Create RLS policies for trend_comment_likes
CREATE POLICY "Anyone can view comment likes"
  ON trend_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comment likes"
  ON trend_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
  ON trend_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_likes_trend_id ON trend_likes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_likes_user_id ON trend_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_comments_trend_id ON trend_comments(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_likes_comment_id ON trend_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_likes_user_id ON trend_comment_likes(user_id);

-- Done! Your database is now set up for likes, comments, and points.
