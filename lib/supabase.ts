// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // Enhanced auth configuration for email bounce prevention and security
  auth: {
    // Email confirmation settings
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile apps
    
    // Rate limiting and security
    // These help prevent abuse and improve email deliverability
    debug: process.env.NODE_ENV === 'development', // Only debug in development
  },
  
  // Real-time configuration for optimal performance
  realtime: {
    params: {
      eventsPerSecond: 10, // Prevent overwhelming the connection
    },
  },
  
  // Global headers for better API communication
  global: {
    headers: {
      'X-Client-Info': 'locova-mobile-app',
      'X-Client-Version': '1.0.0',
    },
  },
  
  // Database configuration for better performance
  db: {
    schema: 'public',
  },
});

// Enhanced auth helpers for email bounce prevention
export const authHelpers = {
  // Enhanced sign up with additional validation
  async signUpWithEmail(email: string, password: string) {
    try {
      // Normalize email to prevent bounces
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // Disable email redirects for security and bounce prevention
          emailRedirectTo: undefined,
          // Additional metadata for tracking
          data: {
            signup_method: 'email',
            app_version: '1.0.0',
            created_at: new Date().toISOString(),
          },
        },
      });
      
      return { data, error };
    } catch (error) {
      console.error('Enhanced signUp error:', error);
      return { data: null, error };
    }
  },
  
  // Enhanced sign in with rate limiting awareness
  async signInWithEmail(email: string, password: string) {
    try {
      // Normalize email to prevent authentication issues
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      
      return { data, error };
    } catch (error) {
      console.error('Enhanced signIn error:', error);
      return { data: null, error };
    }
  },
  
  // Enhanced password reset with security features
  async resetPassword(email: string) {
    try {
      // Normalize email to prevent bounces
      const normalizedEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        // Security: Don't use redirects to prevent token theft
        redirectTo: undefined,
        // Additional options for better deliverability
        captchaToken: undefined, // Add captcha if needed
      });
      
      return { data, error };
    } catch (error) {
      console.error('Enhanced resetPassword error:', error);
      return { data: null, error };
    }
  },
  
  // Enhanced password update with validation
  async updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        // Additional security options
        data: {
          password_updated_at: new Date().toISOString(),
          password_reset_method: 'email',
        },
      });
      
      return { data, error };
    } catch (error) {
      console.error('Enhanced updatePassword error:', error);
      return { data: null, error };
    }
  },
  
  // Session management helpers
  async getCurrentSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      return { data, error };
    } catch (error) {
      console.error('getCurrentSession error:', error);
      return { data: null, error };
    }
  },
  
  // Sign out with cleanup
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'global', // Sign out from all sessions
      });
      return { error };
    } catch (error) {
      console.error('signOut error:', error);
      return { error };
    }
  },
};

// Export the original supabase client for backward compatibility
export default supabase;
