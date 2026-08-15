/**
 * Utility functions for resolving dynamic site URLs and authentication redirects
 * Ensures Supabase signup email verification and password reset flows redirect
 * customers back to the deployed production app while maintaining local development support.
 */

/**
 * Returns the resolved base Site URL for the current environment
 */
export function getSiteUrl(): string {
  const env = (import.meta as any).env || {};
  const configuredUrl = (
    env.VITE_SITE_URL ||
    env.VITE_APP_URL ||
    env.VITE_PUBLIC_SITE_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    // If running in local dev environment (localhost / 127.0.0.1), use the active browser origin
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return origin;
    }
    // If running in browser on any non-localhost domain, use the current active origin
    if (origin && !origin.includes('localhost')) {
      return origin;
    }
  }

  // Fallback to configured environment variable or default production domain
  if (configuredUrl) {
    return configuredUrl;
  }

  return 'https://kudstore.co.za';
}

/**
 * Returns the full absolute URL for auth callbacks (email verification, password reset, OAuth)
 * @param path Relative path (e.g., '/auth/callback', '/update-password')
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const baseUrl = getSiteUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
