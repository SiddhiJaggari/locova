// locova/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,          // persist session on device
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,      // no web redirects in Expo Go
  },
})
