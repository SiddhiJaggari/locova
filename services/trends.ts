// services/trends.ts
import { supabase } from "../lib/supabase";
import { Trend } from "../types";

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
    return (data as Trend[]) ?? [];
  } else {
    const qb = supabase.from("trends").select("*").order("created_at", { ascending: false });
    if (city && city.trim()) qb.ilike("location", `%${city}%`);
    const { data, error } = await qb;
    if (error) throw error;
    return (data as Trend[]) ?? [];
  }
}

export function subscribeTrends(onChange: () => void) {
  const channel = supabase
    .channel("trends-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
