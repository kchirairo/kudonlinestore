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

/**
 * Executes a Supabase insert or update operation with automatic fallback retry if the remote schema cache
 * is missing one or more columns (e.g. PGRST204: Could not find the '...' column in the schema cache).
 * Automatically removes the missing column(s) from the payload and retries the operation seamlessly.
 */
export async function executeWithColumnFallback<T = any>(
  operation: (payload: Record<string, any>) => PromiseLike<{ data?: T; error: any }>,
  initialPayload: Record<string, any>,
  maxRetries = 8
): Promise<{ data?: T; error: any }> {
  let currentPayload = { ...initialPayload };
  for (let i = 0; i < maxRetries; i++) {
    const result = await operation(currentPayload);
    if (!result.error) {
      return result;
    }
    const msg = result.error.message || '';
    const code = result.error.code || '';

    // Match PGRST204 or PostgreSQL missing column patterns
    const match =
      msg.match(/Could not find the '([^']+)' column/i) ||
      msg.match(/column "?([^"'\s]+)"? of relation/i) ||
      msg.match(/column "?([^"'\s]+)"? does not exist/i) ||
      msg.match(/Could not find the ([a-zA-Z0-9_]+) column/i);

    if (match && match[1] && match[1] in currentPayload) {
      const missingCol = match[1];
      console.warn(
        `[Supabase Schema Fallback] Remote table is missing column '${missingCol}' (${code}). Removing from payload and retrying...`
      );
      delete currentPayload[missingCol];
      continue;
    }
    return result;
  }
  return await operation(currentPayload);
}
