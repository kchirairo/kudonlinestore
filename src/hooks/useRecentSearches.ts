import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'kudu_recent_searches';
const MAX_SEARCHES = 5;
const STORAGE_EVENT = 'kudu_recent_searches_updated';

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, MAX_SEARCHES);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return [];
  });

  // Sync state when localStorage changes across components / tabs
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const next = parsed
              .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
              .slice(0, MAX_SEARCHES);
            setRecentSearches((prev) => {
              if (
                prev.length === next.length &&
                prev.every((val, idx) => val === next[idx])
              ) {
                return prev;
              }
              return next;
            });
            return;
          }
        }
        setRecentSearches((prev) => (prev.length === 0 ? prev : []));
      } catch {
        setRecentSearches((prev) => (prev.length === 0 ? prev : []));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STORAGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STORAGE_EVENT, handleStorageChange);
    };
  }, []);

  const saveRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: string[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            list = parsed.filter((q) => typeof q === 'string' && q.trim().length > 0);
          }
        } catch {
          list = [];
        }
      }

      // Filter out existing query (case-insensitive match) and put new one at the front
      const updated = [
        trimmed,
        ...list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_SEARCHES);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch (e) {
      console.warn('Failed to save recent search to localStorage', e);
    }
  }, []);

  const removeRecentSearch = useCallback((queryToRemove: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list: string[] = [];
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            list = parsed.filter((q) => typeof q === 'string');
          }
        } catch {
          list = [];
        }
      }

      const updated = list.filter(
        (item) => item.toLowerCase() !== queryToRemove.toLowerCase()
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch (e) {
      console.warn('Failed to remove recent search from localStorage', e);
    }
  }, []);

  const clearRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch (e) {
      console.warn('Failed to clear recent searches from localStorage', e);
    }
  }, []);

  return {
    recentSearches,
    saveRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
};
