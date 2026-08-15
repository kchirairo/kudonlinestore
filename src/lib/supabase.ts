/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Production Supabase Configuration for KUD Online Store
 * Built-in project URL and publishable/anon key guarantee the client operates
 * seamlessly in production deployments (e.g. Netlify Drop, Vercel, static hosting)
 * without requiring a local-only .env file.
 */
export const DEFAULT_SUPABASE_URL = 'https://hbmtwbllznwwjsomxhvu.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_2CysalwRykjYvlaRw4C7iA_afUymieK';

// Read from Vite environment if supplied, otherwise fallback to production project defaults
const env = (import.meta as any).env || {};
const rawUrl = env.VITE_SUPABASE_URL;
const rawAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl: string =
  rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl !== 'MY_SUPABASE_URL'
    ? rawUrl.trim()
    : DEFAULT_SUPABASE_URL;

export const supabaseAnonKey: string =
  rawAnonKey && typeof rawAnonKey === 'string' && rawAnonKey.trim() !== '' && rawAnonKey !== 'MY_SUPABASE_ANON_KEY'
    ? rawAnonKey.trim()
    : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.length > 5 &&
    supabaseUrl !== 'MY_SUPABASE_URL' &&
    supabaseAnonKey &&
    supabaseAnonKey.length > 5 &&
    supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY'
  );
};

// Create a singleton client instance with session persistence & automatic token refresh
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
