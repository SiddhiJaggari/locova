// services/leaderboard.ts
import { supabase } from "../lib/supabase";
import { LeaderRow } from "../types";

export async function loadLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const { data, error } = await supabase.rpc("top_leaderboard", { limit_count: limit });
  if (error) throw error;
  return (data as LeaderRow[]) ?? [];
}
