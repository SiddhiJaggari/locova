# 🗄️ DATABASE SETUP GUIDE

## ❌ **Error You're Seeing:**
```
Could not find the table 'public.profiles' in the schema cache
```

## ✅ **Solution: Create Database Tables**

---

## 📋 **Step-by-Step Instructions:**

### **Step 1: Go to Supabase Dashboard**
1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Sign in to your account
4. Select your **Locova** project

---

### **Step 2: Open SQL Editor**
1. In the left sidebar, click **"SQL Editor"**
2. Click **"New query"** button (top right)

---

### **Step 3: Copy & Paste Schema**
1. Open the file: `supabase_schema.sql` (in your project folder)
2. **Copy ALL the SQL code** (Ctrl+A, Ctrl+C)
3. **Paste it** into the SQL Editor in Supabase
4. Click **"Run"** button (or press Ctrl+Enter)

---

### **Step 4: Wait for Completion**
- You should see: ✅ **"Success. No rows returned"**
- This means all tables were created successfully
- If you see any errors, let me know

---

### **Step 5: Verify Tables Created**
1. In the left sidebar, click **"Table Editor"**
2. You should now see these tables:
   - ✅ `profiles`
   - ✅ `trends`
   - ✅ `trend_likes`
   - ✅ `saved_trends`
   - ✅ `trend_comments`
   - ✅ `comment_likes`

---

### **Step 6: Test Your App**
1. Go back to your app
2. Reload the app (press `r` in terminal)
3. Try to view Settings screen
4. The error should be **GONE!** ✅

---

## 📊 **What Was Created:**

### **1. Tables:**
- **profiles**: User profiles (name, avatar, points)
- **trends**: All posted trends
- **trend_likes**: Likes on trends
- **saved_trends**: Bookmarked trends
- **trend_comments**: Comments on trends
- **comment_likes**: Likes on comments

### **2. Security (Row Level Security):**
- ✅ Users can only edit their own profile
- ✅ Users can only delete their own trends
- ✅ Everyone can view public content
- ✅ Proper authentication checks

### **3. Automatic Features:**
- ✅ Auto-create profile when user signs up
- ✅ Auto-update like counts
- ✅ Auto-update comment counts
- ✅ Auto-award points for posting trends
- ✅ Real-time updates for likes/comments

### **4. Performance:**
- ✅ Indexes on all important columns
- ✅ Fast queries for leaderboard
- ✅ Optimized location searches
- ✅ Efficient joins

---

## 🎯 **Quick Summary:**

**What to do:**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Paste `supabase_schema.sql` content
4. Click Run
5. Done! ✅

**Time needed:** 2 minutes

---

## 🔧 **Troubleshooting:**

### **If you see "relation already exists" errors:**
- ✅ This is OK! It means some tables were already created
- ✅ The script will skip those and create the missing ones

### **If you see "permission denied" errors:**
- ❌ Make sure you're the project owner
- ❌ Check you're in the correct project

### **If tables don't appear:**
- 🔄 Refresh the Table Editor page
- 🔄 Check the "public" schema is selected

---

## ✅ **After Setup:**

Your app will have:
- ✅ Working profiles
- ✅ Working trends
- ✅ Working likes/saves
- ✅ Working comments
- ✅ Working leaderboard
- ✅ Working points system
- ✅ Real-time updates

**No more errors!** 🎉

---

## 📝 **Alternative: Manual Table Creation**

If you prefer, you can create tables one by one in the Table Editor:

### **Create `profiles` table:**
1. Click "Table Editor" → "New table"
2. Name: `profiles`
3. Add columns:
   - `id` (uuid, primary key, references auth.users)
   - `display_name` (text)
   - `avatar_url` (text)
   - `points` (int4, default 0)
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())
4. Enable RLS
5. Add policies (see SQL file)

**But using the SQL script is MUCH faster!** ⚡

---

## 🚀 **Ready to Go!**

Once you run the SQL script:
- ✅ Database is fully set up
- ✅ All features will work
- ✅ No more errors
- ✅ Production-ready

**Just run the SQL and you're done!** 🎉✨
