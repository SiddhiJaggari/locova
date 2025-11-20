# 🔧 PROFILE UPDATE NOT WORKING - TROUBLESHOOTING

## ❌ **Issue:**
When you update your profile (display name or avatar) in Settings, it shows "Success" but the changes don't appear in the Supabase database.

---

## 🔍 **Possible Causes:**

1. **Profile row doesn't exist** for your user
2. **RLS policies** are blocking the update
3. **User ID mismatch** between auth and profile
4. **Trigger not working** (auto-create profile on signup)

---

## ✅ **FIXES:**

### **Fix 1: Check & Create Profile Row**

**Step 1:** Go to Supabase Dashboard → SQL Editor

**Step 2:** Check if your profile exists:
```sql
SELECT * FROM public.profiles WHERE id = auth.uid();
```

**Step 3:** If no results, create your profile:
```sql
INSERT INTO public.profiles (id, display_name, points)
VALUES (auth.uid(), 'Your Name', 0)
ON CONFLICT (id) DO NOTHING;
```

**Step 4:** Verify it was created:
```sql
SELECT * FROM public.profiles WHERE id = auth.uid();
```

---

### **Fix 2: Check RLS Policies**

**Step 1:** Go to SQL Editor

**Step 2:** Check existing policies:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

**Step 3:** If policies are missing or wrong, recreate them:
```sql
-- Drop old policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create correct policies
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
```

---

### **Fix 3: Test Update Directly**

**Step 1:** Go to SQL Editor

**Step 2:** Try updating your profile directly:
```sql
UPDATE public.profiles 
SET display_name = 'Test Name'
WHERE id = auth.uid();
```

**Step 3:** Check if it worked:
```sql
SELECT * FROM public.profiles WHERE id = auth.uid();
```

**If this works:** The issue is in the app code
**If this fails:** The issue is in database permissions

---

### **Fix 4: Check Trigger**

The trigger should auto-create profiles when users sign up.

**Step 1:** Check if trigger exists:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Step 2:** If missing, create it:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, points)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Explorer'), 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔍 **Debugging Steps:**

### **Step 1: Check Console Logs**

After updating profile, check the console for:
```
Updating profile for user: <user-id>
Display name: Siddhi
Avatar URL: <url>
Update result: [...]
Update error: null
```

**If you see an error:** Note the error message
**If "Update result" is empty:** Profile row doesn't exist

---

### **Step 2: Check Your User ID**

**In App Console:**
```javascript
console.log('User ID:', session?.user?.id);
```

**In Supabase SQL Editor:**
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

**Make sure they match!**

---

### **Step 3: Check Database Directly**

**Go to:** Supabase → Table Editor → profiles

**Look for your row:**
- Find row with your user ID
- Try editing directly in the UI
- If you can't edit, it's a permissions issue

---

## ✅ **What I Fixed in Code:**

### **Added:**
1. ✅ **Detailed logging** - See exactly what's happening
2. ✅ **Error messages** - Show specific error details
3. ✅ **Auto-create profile** - If profile doesn't exist, create it
4. ✅ **Better error handling** - Catch and display all errors

### **Code Changes:**
```typescript
// Before
const { error } = await supabase
  .from("profiles")
  .update({ display_name: displayName })
  .eq("id", session.user.id);

// After
const { data: updateData, error } = await supabase
  .from("profiles")
  .update({ display_name: displayName })
  .eq("id", session.user.id)
  .select();  // ✅ Returns updated data

if (!updateData || updateData.length === 0) {
  // ✅ Profile doesn't exist, create it
  await supabase.from("profiles").insert({
    id: session.user.id,
    display_name: displayName,
    points: 0,
  });
}
```

---

## 🎯 **Quick Test:**

### **Test 1: Manual Update**
1. Go to Supabase → Table Editor → profiles
2. Find your row (match user ID)
3. Click edit
4. Change display_name
5. Save
6. **If this works:** App code issue
7. **If this fails:** Database permissions issue

### **Test 2: SQL Update**
1. Go to SQL Editor
2. Run:
```sql
UPDATE public.profiles 
SET display_name = 'Test' 
WHERE id = auth.uid();
```
3. **If this works:** App code issue
4. **If this fails:** RLS policy issue

### **Test 3: App Update**
1. Open app
2. Go to Settings
3. Change name to "Test123"
4. Click Save
5. Check console logs
6. Check database
7. **If logs show error:** Fix the error
8. **If logs show success but DB unchanged:** RLS issue

---

## 📋 **Checklist:**

Run through this checklist:

- [ ] Profile row exists in database for your user
- [ ] RLS is enabled on profiles table
- [ ] RLS policies allow UPDATE for authenticated users
- [ ] User ID in app matches user ID in database
- [ ] No errors in console logs
- [ ] Trigger exists to auto-create profiles
- [ ] Can manually update in Table Editor
- [ ] Can update via SQL Editor
- [ ] Storage bucket created (for avatars)
- [ ] Storage policies allow upload

---

## 🚨 **Common Issues:**

### **Issue 1: "No rows updated"**
**Cause:** Profile row doesn't exist
**Fix:** Run the INSERT query above or let the app create it

### **Issue 2: "Permission denied"**
**Cause:** RLS policies blocking update
**Fix:** Recreate policies with correct permissions

### **Issue 3: "User not authenticated"**
**Cause:** Session expired or invalid
**Fix:** Log out and log back in

### **Issue 4: "Row-level security policy violation"**
**Cause:** User ID doesn't match
**Fix:** Check auth.uid() matches profile.id

---

## ✅ **Expected Behavior:**

**After fixes:**
1. ✅ Update profile in app
2. ✅ See "Profile updated successfully!"
3. ✅ Check Supabase database
4. ✅ See updated display_name
5. ✅ See updated avatar_url
6. ✅ Changes persist after app restart
7. ✅ Changes visible to other users

---

## 📝 **Files Created:**

1. **`FIX_PROFILE_UPDATE.sql`** - SQL queries to fix database
2. **`PROFILE_UPDATE_NOT_WORKING.md`** - This troubleshooting guide

---

## 🎯 **Next Steps:**

1. **Run the SQL fixes** in Supabase SQL Editor
2. **Reload your app** (press `r` in terminal)
3. **Try updating profile** again
4. **Check console logs** for detailed info
5. **Check database** to verify changes
6. **Report back** what you see in console

---

**The code is now fixed with better error handling and auto-creation of missing profiles!** 🎉

---

**Date**: November 20, 2025
**Status**: Code Fixed, Database Needs Verification
**Action**: Run SQL fixes, then test app
