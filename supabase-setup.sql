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

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN points INT DEFAULT 0;
  END IF;
END $$;

-- 3. Ensure trends table has latitude/longitude columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trends' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE trends ADD COLUMN latitude DOUBLE PRECISION;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trends' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE trends ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- 4. Optional: migrate legacy lat/lng columns into latitude/longitude if they exist
DO $$
DECLARE
  lat_exists BOOLEAN;
  lng_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trends' AND column_name = 'lat'
  ) INTO lat_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trends' AND column_name = 'lng'
  ) INTO lng_exists;

  IF lat_exists THEN
    EXECUTE 'UPDATE trends SET latitude = lat WHERE latitude IS NULL AND lat IS NOT NULL;';
  END IF;

  IF lng_exists THEN
    EXECUTE 'UPDATE trends SET longitude = lng WHERE longitude IS NULL AND lng IS NOT NULL;';
  END IF;
END $$;

-- 5. Create trend_likes table (if not exists)
CREATE TABLE IF NOT EXISTS trend_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trend_id, user_id)
);

-- 6. Create trend_comments table (if not exists)
CREATE TABLE IF NOT EXISTS trend_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create trend_comment_likes table (if not exists)
CREATE TABLE IF NOT EXISTS trend_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES trend_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 8. Create trend_saves table (bookmarks)
CREATE TABLE IF NOT EXISTS trend_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trend_id, user_id)
);

-- 9. Create reward tracking tables to avoid duplicate point awards
CREATE TABLE IF NOT EXISTS trend_like_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trend_id, user_id)
);

CREATE TABLE IF NOT EXISTS trend_comment_like_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES trend_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 10. Enable RLS on all tables
ALTER TABLE trend_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_like_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comment_like_rewards ENABLE ROW LEVEL SECURITY;

-- 11. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view trend likes" ON trend_likes;
DROP POLICY IF EXISTS "Users can insert their own trend likes" ON trend_likes;
DROP POLICY IF EXISTS "Users can delete their own trend likes" ON trend_likes;

DROP POLICY IF EXISTS "Anyone can view trend comments" ON trend_comments;
DROP POLICY IF EXISTS "Users can insert their own trend comments" ON trend_comments;
DROP POLICY IF EXISTS "Users can delete their own trend comments" ON trend_comments;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON trend_comment_likes;
DROP POLICY IF EXISTS "Users can insert their own comment likes" ON trend_comment_likes;
DROP POLICY IF EXISTS "Users can delete their own comment likes" ON trend_comment_likes;
DROP POLICY IF EXISTS "Anyone can view trend saves" ON trend_saves;
DROP POLICY IF EXISTS "Users can insert their own trend saves" ON trend_saves;
DROP POLICY IF EXISTS "Users can delete their own trend saves" ON trend_saves;
DROP POLICY IF EXISTS "View trend like rewards" ON trend_like_rewards;
DROP POLICY IF EXISTS "Insert trend like rewards" ON trend_like_rewards;
DROP POLICY IF EXISTS "View comment like rewards" ON trend_comment_like_rewards;
DROP POLICY IF EXISTS "Insert comment like rewards" ON trend_comment_like_rewards;

-- 12. Create RLS policies for trend_likes
CREATE POLICY "Anyone can view trend likes"
  ON trend_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trend likes"
  ON trend_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend likes"
  ON trend_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 13b. Collaborative filtering RPC for recommendations
CREATE OR REPLACE FUNCTION recommended_trends()
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  location text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  user_id uuid,
  lat double precision,
  lng double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id,
         t.title,
         t.category,
         t.location,
         t.latitude,
         t.longitude,
         t.created_at,
         t.user_id,
         t.lat,
         t.lng
  FROM trends t
  WHERE t.id IN (
    SELECT DISTINCT tl_sim.trend_id
    FROM trend_likes tl_self
    JOIN trend_likes tl_match ON tl_self.trend_id = tl_match.trend_id
      AND tl_self.user_id = auth.uid()
      AND tl_match.user_id <> auth.uid()
    JOIN trend_likes tl_sim ON tl_sim.user_id = tl_match.user_id
  )
  AND t.id NOT IN (
    SELECT trend_id FROM trend_likes WHERE user_id = auth.uid()
  )
  ORDER BY t.created_at DESC
  LIMIT 10;
$$;

-- 13. Create RLS policies for trend_comments
CREATE POLICY "Anyone can view trend comments"
  ON trend_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trend comments"
  ON trend_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend comments"
  ON trend_comments FOR DELETE
  USING (auth.uid() = user_id);

-- 14. Create RLS policies for trend_comment_likes
CREATE POLICY "Anyone can view comment likes"
  ON trend_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comment likes"
  ON trend_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
  ON trend_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 15. Create RLS policies for trend_saves
CREATE POLICY "Anyone can view trend saves"
  ON trend_saves FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own trend saves"
  ON trend_saves FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trend saves"
  ON trend_saves FOR DELETE
  USING (auth.uid() = user_id);

-- 16. Create RLS policies for reward tables
CREATE POLICY "View trend like rewards"
  ON trend_like_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert trend like rewards"
  ON trend_like_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View comment like rewards"
  ON trend_comment_like_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert comment like rewards"
  ON trend_comment_like_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 17. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_likes_trend_id ON trend_likes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_likes_user_id ON trend_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_comments_trend_id ON trend_comments(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_likes_comment_id ON trend_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_likes_user_id ON trend_comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_saves_trend_id ON trend_saves(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_saves_user_id ON trend_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_like_rewards_trend_id ON trend_like_rewards(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_like_rewards_user_id ON trend_like_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_like_rewards_comment_id ON trend_comment_like_rewards(comment_id);
CREATE INDEX IF NOT EXISTS idx_trend_comment_like_rewards_user_id ON trend_comment_like_rewards(user_id);

-- Done! Your database is now set up for likes, comments, and points.
