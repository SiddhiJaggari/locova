// services/profile.ts
import { supabase } from "../lib/supabase";
import { UserProfile } from "../type";

export async function getMyProfile(
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("getMyProfile error:", error.message);
    return null;
  }
  return data as UserProfile;
}

export async function upsertMyProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: userId, ...updates }, { onConflict: "id" });

  if (error) throw error;
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
