/**
 * Utility functions for safe LocalStorage operations.
 * Preserves exact image URLs and gracefully catches storage exceptions.
 */

/**
 * Recursively cleans data objects before saving to localStorage.
 * Ensures data integrity without destroying or substituting real image URLs.
 */
export function sanitizeDataForStorage<T>(data: T): T {
  if (!data) return data;

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDataForStorage(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = sanitizeDataForStorage(value);
    }
    return cleaned as T;
  }

  return data;
}

/**
 * Safely sets an item in localStorage, handling quota errors cleanly.
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Quota or access issue setting key "${key}":`, err?.message || err);

    // Attempt recovery by purging old cache items if quota exceeded
    try {
      const nonEssentialKeys = ['kud_store_orders_history'];
      for (const k of nonEssentialKeys) {
        if (k !== key) {
          localStorage.removeItem(k);
        }
      }

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] Storage recovery failed for "${key}". Continuing in-memory.`);
      return false;
    }
  }
}

/**
 * Safely gets and parses a JSON item from localStorage.
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}
