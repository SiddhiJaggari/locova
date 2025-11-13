// services/leaderboard.ts
import { supabase } from "../lib/supabase";
import { LeaderboardRow } from "../type";

export async function loadLeaderboard(limit = 10): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("top_leaderboard", { limit_count: limit });
  if (error) throw error;
  return (data as LeaderboardRow[]) ?? [];
}
