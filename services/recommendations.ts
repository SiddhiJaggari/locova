import { supabase } from "../lib/supabase";
import { Trend } from "../type";

export async function fetchRecommendedTrends(): Promise<Trend[]> {
  const { data, error } = await supabase.rpc("recommended_trends");
  if (error) {
    throw error;
  }
  return (data as Trend[]) ?? [];
}
