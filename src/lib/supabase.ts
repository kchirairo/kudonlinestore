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
  operation: (payload: Record<string, any>) => PromiseLike<{ data?: any; error?: any }>,
  initialPayload: Record<string, any>,
  maxRetries?: number
): Promise<{ data?: T | null; error?: any }> {
  let currentPayload = { ...initialPayload };
  const totalKeys = Object.keys(currentPayload).length;
  const attemptsLimit = maxRetries ?? Math.max(35, totalKeys + 5);

  for (let attempt = 0; attempt < attemptsLimit; attempt++) {
    // If payload is empty or has no keys left, perform final attempt and exit
    if (Object.keys(currentPayload).length === 0) {
      return await operation(currentPayload);
    }

    const result = await operation(currentPayload);
    if (!result.error) {
      return result;
    }

    const msg = result.error.message || '';
    const details = result.error.details || '';
    const hint = result.error.hint || '';
    const code = result.error.code || '';
    const fullErr = `${msg} ${details} ${hint}`;

    // Match PGRST204 or PostgreSQL missing column patterns
    const match =
      fullErr.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i) ||
      fullErr.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation/i) ||
      fullErr.match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i) ||
      fullErr.match(/column "([^"]+)" does not exist/i) ||
      fullErr.match(/column '([^']+)' does not exist/i);

    if (match && match[1]) {
      const missingCol = match[1];
      const matchedKey = Object.keys(currentPayload).find(
        (k) => k.toLowerCase() === missingCol.toLowerCase()
      );

      if (matchedKey) {
        console.warn(
          `[Supabase Schema Fallback] Remote table is missing column '${matchedKey}' (${code || 'PGRST204'}). Removing from payload and retrying...`
        );
        delete currentPayload[matchedKey];
        continue;
      }
    }

    return result;
  }

  return await operation(currentPayload);
}
