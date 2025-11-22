// services/trends.ts
import { supabase } from "../lib/supabase";
import { Trend, TrendComment, UserProfile } from "../type";

async function fetchAuthorProfiles(userIds: string[]): Promise<Record<string, UserProfile>> {
  if (userIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  if (error) throw error;

  const map: Record<string, UserProfile> = {};
  (data ?? []).forEach((profile) => {
    map[profile.id] = profile as UserProfile;
  });
  return map;
}

export async function hydrateTrendAuthors(trends: Trend[]): Promise<Trend[]> {
  const uniqueIds = Array.from(
    new Set(
      trends
        .map((trend) => trend.user_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  if (uniqueIds.length === 0) {
    return trends;
  }

  const authorMap = await fetchAuthorProfiles(uniqueIds);
  return trends.map((trend) => ({
    ...trend,
    author_profile: trend.user_id ? authorMap[trend.user_id] : undefined,
  }));
}

export async function fetchTrendsUnified(
  coords: { lat: number; lng: number } | null,
  radiusKm: number,
  city: string | null
): Promise<Trend[]> {
  if (coords) {
    const { data, error } = await supabase.rpc("trends_within_radius", {
      in_lat: coords.lat,
      in_lng: coords.lng,
      radius_km: radiusKm,
    });
    if (error) throw error;
    return hydrateTrendAuthors(((data as Trend[]) ?? []));
  } else {
    const qb = supabase.from("trends").select("*").order("created_at", { ascending: false });
    if (city && city.trim()) qb.ilike("location", `%${city}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return hydrateTrendAuthors(((data as Trend[]) ?? []));
  }
}

export async function toggleTrendSave(trendId: string, userId: string): Promise<"saved" | "unsaved"> {
  const { data: existing, error: fetchError } = await supabase
    .from("trend_saves")
    .select("id")
    .eq("trend_id", trendId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase.from("trend_saves").delete().eq("id", existing.id);
    if (error) throw error;
    return "unsaved";
  }

  const { error } = await supabase.from("trend_saves").insert({ trend_id: trendId, user_id: userId });
  if (error) throw error;
  return "saved";
}

export async function fetchSavedTrends(userId: string): Promise<Trend[]> {
  const { data, error } = await supabase
    .from("trend_saves")
    .select("trend_id, trends(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data as unknown as { trend_id: string; trends: Trend | null }[] | null) ?? [];
  const trends = rows.map((row) => row.trends).filter((trend): trend is Trend => Boolean(trend));
  return hydrateTrendAuthors(trends);
}

export function subscribeTrends(onChange: () => void) {
  const channel = supabase
    .channel("trends-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function toggleTrendLike(trendId: string, userId: string): Promise<"liked" | "unliked"> {
  const { data: existing, error: fetchError } = await supabase
    .from("trend_likes")
    .select("id")
    .eq("trend_id", trendId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase.from("trend_likes").delete().eq("id", existing.id);
    if (error) throw error;
    return "unliked";
  }

  const { error } = await supabase.from("trend_likes").insert({ trend_id: trendId, user_id: userId });
  if (error) throw error;
  return "liked";
}

export async function fetchTrendEngagement(
  trendIds: string[],
  currentUserId: string | null
): Promise<{
  likeCounts: Record<string, number>;
  commentCounts: Record<string, number>;
  likedTrendIds: string[];
  saveCounts: Record<string, number>;
  savedTrendIds: string[];
}> {
  if (trendIds.length === 0) {
    return { likeCounts: {}, commentCounts: {}, likedTrendIds: [], saveCounts: {}, savedTrendIds: [] };
  }

  const [likes, comments, saves] = await Promise.all([
    supabase.from("trend_likes").select("trend_id,user_id").in("trend_id", trendIds),
    supabase.from("trend_comments").select("trend_id").in("trend_id", trendIds),
    supabase.from("trend_saves").select("trend_id,user_id").in("trend_id", trendIds),
  ]);

  if (likes.error) throw likes.error;
  if (comments.error) throw comments.error;
  if (saves.error) throw saves.error;

  const likeCounts: Record<string, number> = {};
  const likedSet = new Set<string>();
  const commentCounts: Record<string, number> = {};
  const saveCounts: Record<string, number> = {};
  const savedSet = new Set<string>();

  likes.data?.forEach((row) => {
    likeCounts[row.trend_id] = (likeCounts[row.trend_id] ?? 0) + 1;
    if (currentUserId && row.user_id === currentUserId) {
      likedSet.add(row.trend_id);
    }
  });

  comments.data?.forEach((row) => {
    commentCounts[row.trend_id] = (commentCounts[row.trend_id] ?? 0) + 1;
  });

  saves.data?.forEach((row) => {
    saveCounts[row.trend_id] = (saveCounts[row.trend_id] ?? 0) + 1;
    if (currentUserId && row.user_id === currentUserId) {
      savedSet.add(row.trend_id);
    }
  });

  return {
    likeCounts,
    commentCounts,
    likedTrendIds: Array.from(likedSet),
    saveCounts,
    savedTrendIds: Array.from(savedSet),
  };
}

export async function fetchTrendComments(trendId: string): Promise<TrendComment[]> {
  const { data, error } = await supabase
    .from("trend_comments")
    .select("*")
    .eq("trend_id", trendId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as TrendComment[]) ?? [];
}

export async function submitTrendComment(trendId: string, userId: string, comment: string): Promise<TrendComment> {
  const { data, error } = await supabase
    .from("trend_comments")
    .insert({ trend_id: trendId, user_id: userId, comment })
    .select()
    .single();
  if (error) throw error;
  return data as TrendComment;
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<"liked" | "unliked"> {
  const { data: existing, error: fetchError } = await supabase
    .from("trend_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const { error } = await supabase.from("trend_comment_likes").delete().eq("id", existing.id);
    if (error) throw error;
    return "unliked";
  }

  const { error } = await supabase.from("trend_comment_likes").insert({ comment_id: commentId, user_id: userId });
  if (error) throw error;
  return "liked";
}

export async function fetchCommentEngagement(
  commentIds: string[],
  currentUserId: string | null
): Promise<{ likeCounts: Record<string, number>; likedCommentIds: string[] }> {
  if (commentIds.length === 0) {
    return { likeCounts: {}, likedCommentIds: [] };
  }

  const { data, error } = await supabase
    .from("trend_comment_likes")
    .select("comment_id,user_id")
    .in("comment_id", commentIds);

  if (error) throw error;

  const likeCounts: Record<string, number> = {};
  const likedSet = new Set<string>();

  data?.forEach((row) => {
    likeCounts[row.comment_id] = (likeCounts[row.comment_id] ?? 0) + 1;
    if (currentUserId && row.user_id === currentUserId) {
      likedSet.add(row.comment_id);
    }
  });

  return { likeCounts, likedCommentIds: Array.from(likedSet) };
}
