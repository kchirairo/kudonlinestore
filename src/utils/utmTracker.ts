import { MarketingAttribution, MarketingPlatform } from '../types';
import { safeGetItem, safeSetItem } from './storage';

const SESSION_ID_KEY = 'kud_visitor_session_id';
const ACTIVE_ATTRIBUTION_KEY = 'kud_active_attribution';
const LAST_TOUCH_ATTRIBUTION_KEY = 'kud_last_touch_attribution';
const ATTRIBUTION_MAX_AGE_DAYS = 30;

/**
 * Normalizes a raw string or referrer to a recognized marketing platform
 */
export function normalizePlatform(rawSource?: string, referrer?: string): MarketingPlatform {
  const sourceLower = (rawSource || '').toLowerCase().trim();
  const referrerLower = (referrer || '').toLowerCase().trim();

  // Explicit UTM source check first
  if (sourceLower.includes('insta') || sourceLower === 'ig') return 'instagram';
  if (sourceLower.includes('face') || sourceLower === 'fb' || sourceLower === 'meta') return 'facebook';
  if (sourceLower.includes('tik') || sourceLower === 'tt') return 'tiktok';
  if (sourceLower.includes('whats') || sourceLower === 'wa') return 'whatsapp';
  if (sourceLower.includes('goog')) return 'google';

  // Referrer domain check
  if (
    referrerLower.includes('instagram.com') ||
    referrerLower.includes('ig.me') ||
    referrerLower.includes('l.instagram.com')
  ) {
    return 'instagram';
  }

  if (
    referrerLower.includes('facebook.com') ||
    referrerLower.includes('fb.me') ||
    referrerLower.includes('l.facebook.com') ||
    referrerLower.includes('lm.facebook.com') ||
    referrerLower.includes('m.facebook.com')
  ) {
    return 'facebook';
  }

  if (
    referrerLower.includes('tiktok.com') ||
    referrerLower.includes('vm.tiktok.com') ||
    referrerLower.includes('byteoversea.com')
  ) {
    return 'tiktok';
  }

  if (
    referrerLower.includes('whatsapp.com') ||
    referrerLower.includes('wa.me') ||
    referrerLower.includes('api.whatsapp.com')
  ) {
    return 'whatsapp';
  }

  if (referrerLower.includes('google.co') || referrerLower.includes('google.com')) {
    return 'google';
  }

  if (sourceLower) {
    return 'other';
  }

  return 'direct';
}

/**
 * Returns or generates a persistent visitor session ID
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';

  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `session-${Date.now()}`;
  }
}

/**
 * Parses current location query parameters and document referrer to extract attribution.
 * Persists attribution across page transitions and multi-step checkouts.
 */
export function captureAttribution(): MarketingAttribution {
  const sessionId = getOrCreateSessionId();
  const now = new Date().toISOString();

  if (typeof window === 'undefined') {
    return {
      platform: 'direct',
      sessionId,
      firstTouchAt: now,
      lastTouchAt: now,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source') || undefined;
  const utmMedium = urlParams.get('utm_medium') || undefined;
  const utmCampaign = urlParams.get('utm_campaign') || undefined;
  const utmContent = urlParams.get('utm_content') || undefined;
  const utmTerm = urlParams.get('utm_term') || undefined;
  const referrer = document.referrer || undefined;

  const hasNewUtmParams = Boolean(utmSource || utmCampaign || utmMedium);
  const detectedPlatform = normalizePlatform(utmSource, referrer);

  // 1. If new UTM parameters or distinct social referrer is present in current URL, create fresh attribution
  if (hasNewUtmParams || (detectedPlatform !== 'direct' && detectedPlatform !== 'other')) {
    const freshAttribution: MarketingAttribution = {
      platform: detectedPlatform,
      utm_source: utmSource || (detectedPlatform !== 'direct' ? detectedPlatform : undefined),
      utm_medium: utmMedium || (detectedPlatform !== 'direct' ? 'social_referral' : undefined),
      utm_campaign: utmCampaign || (detectedPlatform !== 'direct' ? `${detectedPlatform}_organic` : undefined),
      utm_content: utmContent,
      utm_term: utmTerm,
      sessionId,
      referrer,
      landingUrl: window.location.href,
      firstTouchAt: now,
      lastTouchAt: now,
    };

    try {
      sessionStorage.setItem(ACTIVE_ATTRIBUTION_KEY, JSON.stringify(freshAttribution));
      safeSetItem(LAST_TOUCH_ATTRIBUTION_KEY, freshAttribution);
    } catch {
      // Safe fallback
    }

    return freshAttribution;
  }

  // 2. Check active session storage
  try {
    const activeStored = sessionStorage.getItem(ACTIVE_ATTRIBUTION_KEY);
    if (activeStored) {
      const parsed: MarketingAttribution = JSON.parse(activeStored);
      parsed.lastTouchAt = now;
      parsed.sessionId = sessionId;
      return parsed;
    }
  } catch {
    // Continue to local storage fallback
  }

  // 3. Check persistent 30-day last touch attribution
  const lastTouch = safeGetItem<MarketingAttribution | null>(LAST_TOUCH_ATTRIBUTION_KEY, null);
  if (lastTouch && lastTouch.firstTouchAt) {
    const firstTouchDate = new Date(lastTouch.firstTouchAt).getTime();
    const ageDays = (Date.now() - firstTouchDate) / (1000 * 60 * 60 * 24);
    if (ageDays <= ATTRIBUTION_MAX_AGE_DAYS) {
      lastTouch.lastTouchAt = now;
      lastTouch.sessionId = sessionId;
      return lastTouch;
    }
  }

  // 4. Default direct attribution
  const defaultAttribution: MarketingAttribution = {
    platform: 'direct',
    sessionId,
    firstTouchAt: now,
    lastTouchAt: now,
  };

  return defaultAttribution;
}

/**
 * Retrieves the currently active attribution without re-parsing URL unless needed
 */
export function getCurrentAttribution(): MarketingAttribution {
  return captureAttribution();
}

/**
 * Builds a direct, trackable social campaign URL for any product or store route.
 * Guarantees every link opens the exact target product page with attribution intact.
 */
export interface BuildCampaignUrlParams {
  productId?: string;
  path?: string;
  platform: MarketingPlatform | string;
  campaign: string;
  medium?: string;
  content?: string;
  term?: string;
  discountCode?: string;
}

export function buildSocialCampaignUrl(params: BuildCampaignUrlParams): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://kudstore.co.za';

  let basePath = '/';
  if (params.productId) {
    basePath = `/product/${params.productId}`;
  } else if (params.path) {
    basePath = params.path.startsWith('/') ? params.path : `/${params.path}`;
  }

  const url = new URL(basePath, origin);
  url.searchParams.set('utm_source', params.platform.toLowerCase().trim());
  url.searchParams.set('utm_campaign', params.campaign.toLowerCase().trim().replace(/\s+/g, '_'));

  if (params.medium) {
    url.searchParams.set('utm_medium', params.medium.toLowerCase().trim().replace(/\s+/g, '_'));
  } else {
    // Sensible defaults per platform
    if (params.platform === 'instagram') url.searchParams.set('utm_medium', 'social_story');
    else if (params.platform === 'tiktok') url.searchParams.set('utm_medium', 'video_bio');
    else if (params.platform === 'facebook') url.searchParams.set('utm_medium', 'social_feed');
    else url.searchParams.set('utm_medium', 'social_post');
  }

  if (params.content) {
    url.searchParams.set('utm_content', params.content.trim().replace(/\s+/g, '_'));
  }

  if (params.term) {
    url.searchParams.set('utm_term', params.term.trim());
  }

  if (params.discountCode) {
    url.searchParams.set('promo', params.discountCode.trim().toUpperCase());
  }

  return url.toString();
}

/**
 * Visual styling & branding info for social platforms
 */
export function getPlatformBadgeConfig(platform: string) {
  const p = platform.toLowerCase();
  if (p === 'instagram') {
    return {
      name: 'Instagram',
      bgLight: 'bg-pink-50 dark:bg-pink-950/40',
      border: 'border-pink-200 dark:border-pink-900/60',
      text: 'text-pink-600 dark:text-pink-400',
      badgeBg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white',
      accentColor: '#E1306C',
    };
  }
  if (p === 'tiktok') {
    return {
      name: 'TikTok',
      bgLight: 'bg-neutral-100 dark:bg-neutral-900',
      border: 'border-neutral-300 dark:border-neutral-700',
      text: 'text-neutral-900 dark:text-white',
      badgeBg: 'bg-black text-white dark:bg-white dark:text-black',
      accentColor: '#000000',
    };
  }
  if (p === 'facebook') {
    return {
      name: 'Facebook',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-900/60',
      text: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-[#1877F2] text-white',
      accentColor: '#1877F2',
    };
  }
  if (p === 'whatsapp') {
    return {
      name: 'WhatsApp',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-900/60',
      text: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-[#25D366] text-white',
      accentColor: '#25D366',
    };
  }
  return {
    name: platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Direct',
    bgLight: 'bg-gray-50 dark:bg-slate-800',
    border: 'border-gray-200 dark:border-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    badgeBg: 'bg-gray-800 text-white dark:bg-slate-700',
    accentColor: '#6B7280',
  };
}
