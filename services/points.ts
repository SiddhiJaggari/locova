// services/points.ts
import { supabase } from "../lib/supabase";

export async function awardPoints(userId: string, amount = 10): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_points", {
    user_id_input: userId,
    amount,
  });
  if (error) throw error;
  // Some people implement this RPC to return new points; others return void.
  // If your RPC returns the new total, `data` is a number; otherwise null.
  return typeof data === "number" ? data : null;
}
