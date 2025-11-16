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

  // Day 11 geo metadata (new columns)
  latitude?: number | null;
  longitude?: number | null;

  // Legacy fields retained for backward compatibility with older rows
  lat?: number | null;
  lng?: number | null;

  // Present only when using the `trends_within_radius` RPC
  distance_km?: number;

  // Day 10 engagement metadata
  like_count?: number;
  comment_count?: number;
  liked_by_current_user?: boolean;
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

export type TrendComment = {
  id: string;
  trend_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  like_count?: number;
  liked_by_current_user?: boolean;
};

export type LevelInfo = {
  name: string;
  minPoints: number;
  emoji: string;
};

export const LEVELS: LevelInfo[] = [
  { name: "Newbie", minPoints: 0, emoji: "🧢" },
  { name: "Explorer", minPoints: 50, emoji: "🎒" },
  { name: "Trendsetter", minPoints: 150, emoji: "🔥" },
  { name: "Influencer", minPoints: 300, emoji: "📸" },
  { name: "Local Legend", minPoints: 500, emoji: "🏆" },
];
