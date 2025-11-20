-- ============================================
-- LOCOVA DATABASE SCHEMA
-- Complete Supabase SQL Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.user_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. TRENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location_text TEXT,
  place_id TEXT,
  place_name TEXT,
  place_address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trends are viewable by everyone" ON public.trends;
CREATE POLICY "Trends are viewable by everyone"
  ON public.trends FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert trends" ON public.trends;
CREATE POLICY "Authenticated users can insert trends"
  ON public.trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own trends" ON public.trends;
CREATE POLICY "Users can update their own trends"
  ON public.trends FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own trends" ON public.trends;
CREATE POLICY "Users can delete their own trends"
  ON public.trends FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. TREND LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trend_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES public.trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.trend_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trend likes are viewable by everyone" ON public.trend_likes;
CREATE POLICY "Trend likes are viewable by everyone"
  ON public.trend_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own likes" ON public.trend_likes;
CREATE POLICY "Users can insert their own likes"
  ON public.trend_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON public.trend_likes;
CREATE POLICY "Users can delete their own likes"
  ON public.trend_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. SAVED TRENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES public.trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.saved_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved trends" ON public.saved_trends;
CREATE POLICY "Users can view their own saved trends"
  ON public.saved_trends FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved trends" ON public.saved_trends;
CREATE POLICY "Users can insert their own saved trends"
  ON public.saved_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved trends" ON public.saved_trends;
CREATE POLICY "Users can delete their own saved trends"
  ON public.saved_trends FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. TREND COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trend_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES public.trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.trend_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.trend_comments;
CREATE POLICY "Comments are viewable by everyone"
  ON public.trend_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.trend_comments;
CREATE POLICY "Authenticated users can insert comments"
  ON public.trend_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.trend_comments;
CREATE POLICY "Users can update their own comments"
  ON public.trend_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.trend_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.trend_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. COMMENT LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES public.trend_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.comment_likes;
CREATE POLICY "Comment likes are viewable by everyone"
  ON public.comment_likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own comment likes" ON public.comment_likes;
CREATE POLICY "Users can insert their own comment likes"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment likes" ON public.comment_likes;
CREATE POLICY "Users can delete their own comment likes"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON public.user_profiles(points DESC);

-- Trends indexes
CREATE INDEX IF NOT EXISTS idx_trends_user_id ON public.trends(user_id);
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON public.trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_category ON public.trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_location ON public.trends(lat, lng);

-- Trend likes indexes
CREATE INDEX IF NOT EXISTS idx_trend_likes_trend_id ON public.trend_likes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_likes_user_id ON public.trend_likes(user_id);

-- Saved trends indexes
CREATE INDEX IF NOT EXISTS idx_saved_trends_user_id ON public.saved_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_trend_id ON public.saved_trends(trend_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_trend_comments_trend_id ON public.trend_comments(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_comments_user_id ON public.trend_comments(user_id);

-- Comment likes indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);

-- ============================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trends_updated_at ON public.trends;
CREATE TRIGGER update_trends_updated_at
  BEFORE UPDATE ON public.trends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trend_comments_updated_at ON public.trend_comments;
CREATE TRIGGER update_trend_comments_updated_at
  BEFORE UPDATE ON public.trend_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, points)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Explorer'), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to increment trend like count
CREATE OR REPLACE FUNCTION increment_trend_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trends
  SET like_count = like_count + 1
  WHERE id = NEW.trend_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement trend like count
CREATE OR REPLACE FUNCTION decrement_trend_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trends
  SET like_count = like_count - 1
  WHERE id = OLD.trend_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trend_like_added ON public.trend_likes;
CREATE TRIGGER on_trend_like_added
  AFTER INSERT ON public.trend_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_trend_like_count();

DROP TRIGGER IF EXISTS on_trend_like_removed ON public.trend_likes;
CREATE TRIGGER on_trend_like_removed
  AFTER DELETE ON public.trend_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_trend_like_count();

-- Function to increment comment count
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trends
  SET comment_count = comment_count + 1
  WHERE id = NEW.trend_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment count
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trends
  SET comment_count = comment_count - 1
  WHERE id = OLD.trend_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_added ON public.trend_comments;
CREATE TRIGGER on_comment_added
  AFTER INSERT ON public.trend_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_comment_count();

DROP TRIGGER IF EXISTS on_comment_removed ON public.trend_comments;
CREATE TRIGGER on_comment_removed
  AFTER DELETE ON public.trend_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comment_count();

-- Function to increment comment like count
CREATE OR REPLACE FUNCTION increment_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trend_comments
  SET like_count = like_count + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment like count
CREATE OR REPLACE FUNCTION decrement_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.trend_comments
  SET like_count = like_count - 1
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_like_added ON public.comment_likes;
CREATE TRIGGER on_comment_like_added
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_comment_like_count();

DROP TRIGGER IF EXISTS on_comment_like_removed ON public.comment_likes;
CREATE TRIGGER on_comment_like_removed
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comment_like_count();

-- Function to award points for posting trends
CREATE OR REPLACE FUNCTION award_points_for_trend()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET points = points + 10
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trend_created ON public.trends;
CREATE TRIGGER on_trend_created
  AFTER INSERT ON public.trends
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_trend();

-- ============================================
-- 9. REALTIME SUBSCRIPTIONS
-- ============================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trend_likes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trend_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
