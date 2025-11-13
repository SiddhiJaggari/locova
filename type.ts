// types.ts

// A single trend row from the `trends` table
export type Trend = {
  id: string;
  title: string;
  category: string;
  location: string;
  created_at: string;

  // Optional fields we added later
  user_id?: string | null;
  lat?: number | null;
  lng?: number | null;

  // Present only when using the `trends_within_radius` RPC
  distance_km?: number;
};

// A row from `user_profiles`
export type UserProfile = {
  id: string;                 // same as auth.users.id
  points: number;
  display_name?: string | null;
  avatar_url?: string | null;
  expo_push_token?: string | null;
  created_at?: string;
};

// A single row returned by the leaderboard view / RPC
export type LeaderboardRow = {
  id: string;
  points: number;
  display_name?: string | null;
  avatar_url?: string | null;
};
