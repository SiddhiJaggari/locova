// services/profile.ts
import { supabase } from "../lib/supabase";
import { UserProfile } from "../types";

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
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Uploads an avatar blob to avatars/<userId>/avatar-<ts>.<ext>
 * and returns the PUBLIC URL. The "avatars" bucket must be public.
 */
export async function uploadAvatarPublic(
  userId: string,
  file: Blob,
  extension = "jpg"
): Promise<string> {
  const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
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
