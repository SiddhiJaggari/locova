import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Don't throw — just warn. This avoids the "Something went wrong" crash.
if (!url || !anon) {
  console.warn(
    "[Supabase] Missing env vars. Check .env and restart Expo.",
    { urlPresent: !!url, anonPresent: !!anon }
  );
}

// Create a client anyway; if vars are missing, queries will fail gracefully.
export const supabase = createClient(url ?? "", anon ?? "");

// Helpful log to verify at startup
console.log("✅ Supabase URL seen by app:", url);
