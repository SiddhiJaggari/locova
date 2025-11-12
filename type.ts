// types.ts
export type Trend = {
  id: string;
  title: string;
  category: string;
  location: string;
  created_at: string;
  user_id: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | null; // present when fetched via radius RPC
};

export type LeaderRow = {
  id: string;
  points: number;
  display_name?: string;
};
