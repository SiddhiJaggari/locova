# 📦 SUPABASE STORAGE SETUP

## 🎯 **What This Fixes:**

Your profile updates weren't saving because avatars need to be uploaded to Supabase Storage first, not saved as local file paths.

---

## ✅ **QUICK FIX (2 minutes):**

### **Step 1: Go to Supabase Dashboard**
1. Open: https://supabase.com/dashboard
2. Select your **Locova** project
3. Click **"Storage"** in the left sidebar

---

### **Step 2: Create Avatars Bucket**
1. Click **"New bucket"** button
2. Fill in:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **CHECK THIS** (important!)
   - **File size limit**: 5 MB (optional)
   - **Allowed MIME types**: `image/*` (optional)
3. Click **"Create bucket"**

---

### **Step 3: Set Bucket Policies**
1. Click on the **"avatars"** bucket
2. Click **"Policies"** tab
3. Click **"New policy"**
4. Select **"For full customization"**
5. Add these policies:

#### **Policy 1: Public Read (Anyone can view)**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
```

#### **Policy 2: Authenticated Upload (Users can upload)**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);
```

#### **Policy 3: Users can update their own**
```sql
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 4: Users can delete their own**
```sql
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### **Step 4: Test Your App**
1. Reload your app (press `r` in terminal)
2. Go to Settings
3. Click "Pick Avatar" or "Take Photo"
4. Select/take a photo
5. Click "Save Profile"
6. You should see: ✅ **"Profile updated successfully!"**

---

## 🔧 **What Was Fixed in Code:**

### **Before (Broken):**
```typescript
// Saved local file path directly to database
avatar_url: "file:///data/user/0/.../image.jpg"  // ❌ Won't work
```

### **After (Fixed):**
```typescript
// 1. Upload local file to Supabase Storage
const { data } = await supabase.storage
  .from('avatars')
  .upload('avatars/user-123-timestamp.jpg', file);

// 2. Get public URL
const publicUrl = supabase.storage
  .from('avatars')
  .getPublicUrl('avatars/user-123-timestamp.jpg');

// 3. Save public URL to database
avatar_url: "https://your-project.supabase.co/storage/v1/object/public/avatars/..."  // ✅ Works!
```

---

## 📊 **How It Works Now:**

### **Upload Flow:**
```
1. User picks image
   ↓
2. Local file URI: file:///...
   ↓
3. Code detects "file://" prefix
   ↓
4. Converts to blob/arrayBuffer
   ↓
5. Uploads to Supabase Storage
   ↓
6. Gets public URL
   ↓
7. Saves public URL to profiles table
   ↓
8. Avatar displays from Supabase CDN
```

---

## ✅ **Benefits:**

**Before:**
- ❌ Local file paths don't work across devices
- ❌ Images not accessible from database
- ❌ No CDN, slow loading
- ❌ Files deleted when app cache cleared

**After:**
- ✅ Images stored in cloud
- ✅ Accessible from any device
- ✅ Fast CDN delivery
- ✅ Permanent storage
- ✅ Automatic optimization

---

## 🎯 **Verification:**

### **Check if it's working:**

1. **In Supabase Storage:**
   - Go to Storage → avatars bucket
   - You should see uploaded images
   - Format: `user-id-timestamp.jpg`

2. **In Supabase Database:**
   - Go to Table Editor → profiles
   - Check `avatar_url` column
   - Should be: `https://...supabase.co/storage/v1/object/public/avatars/...`
   - NOT: `file:///...`

3. **In Your App:**
   - Avatar should display correctly
   - Should persist after app restart
   - Should be visible to other users

---

## 🚨 **Common Issues:**

### **Issue 1: "Failed to upload avatar"**
**Solution:**
- Make sure bucket is named exactly `avatars`
- Make sure bucket is **public**
- Check policies are created

### **Issue 2: "Storage bucket not found"**
**Solution:**
- Create the `avatars` bucket in Supabase
- Make sure it's public

### **Issue 3: Image doesn't display**
**Solution:**
- Check the URL in database starts with `https://`
- Check bucket policies allow public read
- Try opening the URL in browser

---

## 📝 **Quick SQL for Policies:**

If you prefer SQL Editor, paste this:

```sql
-- Enable storage
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## ✅ **Summary:**

**What you need to do:**
1. ✅ Create `avatars` bucket in Supabase Storage
2. ✅ Make it **public**
3. ✅ Add the 4 policies
4. ✅ Test in your app

**Time needed:** 2 minutes

**After this:**
- ✅ Profile updates will save correctly
- ✅ Avatars will upload to cloud
- ✅ Images will persist permanently
- ✅ Fast CDN delivery

---

**Date**: November 20, 2025
**Status**: Code Fixed, Storage Setup Required
**Action**: Create avatars bucket in Supabase
