// services/profile.ts
import { supabase } from "../lib/supabase";
import { UserProfile } from "../type";

export async function getMyProfile(
  userId: string
): Promise<UserProfile | null> {
  // Get basic profile data from profiles table
  const { data: basicProfile, error: basicError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (basicError) {
    console.warn("getMyProfile basic error:", basicError.message);
    return null;
  }

  // Get extended profile data from user_profiles table
  const { data: extendedProfile, error: extendedError } = await supabase
    .from("user_profiles")
    .select("points, expo_push_token, created_at")
    .eq("id", userId)
    .single();

  if (extendedError && extendedError.code !== 'PGRST116') {
    console.warn("getMyProfile extended error:", extendedError.message);
  }

  // Combine both profiles
  const combinedProfile: UserProfile = {
    ...basicProfile,
    points: extendedProfile?.points || 0,
    expo_push_token: extendedProfile?.expo_push_token,
    created_at: extendedProfile?.created_at || basicProfile?.created_at,
  };

  return combinedProfile;
}

export async function upsertMyProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  // Separate basic profile data from extended data
  const basicUpdates: any = {
    id: userId,
  };
  
  const extendedUpdates: any = {
    id: userId,
  };

  // Only include fields that are being updated
  if (updates.display_name !== undefined) {
    basicUpdates.display_name = updates.display_name;
  }
  if (updates.avatar_url !== undefined) {
    basicUpdates.avatar_url = updates.avatar_url;
  }
  if (updates.points !== undefined) {
    extendedUpdates.points = updates.points;
  }
  if (updates.expo_push_token !== undefined) {
    extendedUpdates.expo_push_token = updates.expo_push_token;
  }

  // Update basic profile in profiles table
  if (basicUpdates.display_name !== undefined || basicUpdates.avatar_url !== undefined) {
    const { error: basicError } = await supabase
      .from("profiles")
      .upsert(basicUpdates, { onConflict: "id" });

    if (basicError) throw basicError;
  }

  // Update extended profile in user_profiles table (only if extended data exists)
  if (extendedUpdates.points !== undefined || extendedUpdates.expo_push_token !== undefined) {
    const { error: extendedError } = await supabase
      .from("user_profiles")
      .upsert(extendedUpdates, { onConflict: "id" });

    if (extendedError) throw extendedError;
  }
}

/**
 * Uploads an avatar blob to avatars/<userId>/avatar-<ts>.<ext>
 * and returns the PUBLIC URL. The "avatars" bucket must be public.
 */
export async function uploadAvatarPublic(
  userId: string,
  file: ArrayBuffer | Uint8Array,
  extension = "jpg"
): Promise<string> {
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file as any, {
      upsert: true,
      contentType: "image/jpeg",
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const url = (data as any)?.publicUrl;
  if (!url) {
    throw new Error("Failed to get public URL from Supabase");
  }

  return url;
}

/**
 * Save the push token to the user's profile in Supabase
 */
export async function savePushTokenToProfile(
  userId: string,
  token: string
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ expo_push_token: token })
    .eq("id", userId);

  if (error) {
    console.error("Failed to save push token:", error);
    throw error;
  }

  console.log("Push token saved to profile");
}
