-- ============================================
-- FIX PROFILE UPDATE ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check if RLS is enabled (should be true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. Drop existing policies (if any issues)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Recreate policies with correct permissions
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Verify policies exist
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check if your user has a profile row
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
SELECT * FROM public.profiles WHERE id = auth.uid();

-- 6. If no profile exists, the trigger should create it
-- But you can manually create one if needed:
-- INSERT INTO public.profiles (id, display_name, points)
-- VALUES (auth.uid(), 'Your Name', 0)
-- ON CONFLICT (id) DO NOTHING;

-- 7. Test update (should work after running above)
-- UPDATE public.profiles 
-- SET display_name = 'Test Name'
-- WHERE id = auth.uid();

-- 8. Verify the update worked
-- SELECT * FROM public.profiles WHERE id = auth.uid();
