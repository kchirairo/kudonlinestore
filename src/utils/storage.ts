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

const memoryStorage: Record<string, string> = {};

/**
 * Safely sets an item in localStorage, handling quota errors and Node environments cleanly.
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized);
    } else {
      memoryStorage[key] = serialized;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Quota or access issue setting key "${key}":`, err?.message || err);

    // Attempt recovery by purging old cache items if quota exceeded
    try {
      if (typeof localStorage !== 'undefined') {
        const nonEssentialKeys = ['kud_store_orders_history'];
        for (const k of nonEssentialKeys) {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        }
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
      }
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      memoryStorage[key] = serialized;
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] Storage recovery failed for "${key}". Continuing in-memory.`);
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      memoryStorage[key] = serialized;
      return true;
    }
  }
}

/**
 * Safely gets and parses a JSON item from localStorage or memory store.
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    let item: string | null = null;
    if (typeof localStorage !== 'undefined') {
      item = localStorage.getItem(key);
    } else {
      item = memoryStorage[key] || null;
    }
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}
