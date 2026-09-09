import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProductCategoryRow } from '../types';

/**
 * In-memory category cache to prevent redundant network requests across component renders.
 */
let cachedActiveCategories: ProductCategoryRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
const SESSION_CACHE_KEY = 'kud_active_categories_v1';

export class CategoryService {
  /**
   * Fetches active categories from public.product_categories ordered by display_order ASC.
   * Single source of truth in Supabase.
   *
   * @param forceRefresh - If true, ignores in-memory and session cache and queries Supabase directly.
   */
  async getActiveCategories(forceRefresh = false): Promise<{
    data: ProductCategoryRow[];
    error: string | null;
  }> {
    const now = Date.now();

    // 1. Check in-memory cache
    if (!forceRefresh && cachedActiveCategories && now - cacheTimestamp < CACHE_TTL_MS) {
      return { data: cachedActiveCategories, error: null };
    }

    // 2. Check sessionStorage cache if in browser environment
    if (!forceRefresh && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const stored = window.sessionStorage.getItem(SESSION_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedActiveCategories = parsed;
            cacheTimestamp = now;
            return { data: parsed, error: null };
          }
        }
      } catch (e) {
        // Non-fatal, continue to Supabase query
      }
    }

    // 3. Query Supabase public.product_categories (Direct client query with server proxy fallback)
    let fetchedRows: ProductCategoryRow[] | null = null;
    let queryError: string | null = null;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name, display_order, is_active, created_at')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('[CategoryService] Supabase query error fetching product_categories:', error.message, error);
          queryError = error.message;
        } else if (data) {
          fetchedRows = data.map((item: any) => ({
            id: String(item.id),
            name: String(item.name).trim(),
            display_order: Number(item.display_order ?? 0),
            is_active: Boolean(item.is_active),
            created_at: item.created_at,
          }));
        }
      } catch (err: any) {
        console.error('[CategoryService] Exception querying product_categories directly from Supabase:', err);
        queryError = err?.message || 'Database connection error';
      }
    }

    // 4. If direct client query had an issue or client unavailable, try server API proxy
    if (!fetchedRows && typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/product-categories');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.data)) {
            fetchedRows = json.data.map((item: any) => ({
              id: String(item.id),
              name: String(item.name).trim(),
              display_order: Number(item.display_order ?? 0),
              is_active: Boolean(item.is_active),
              created_at: item.created_at,
            }));
            queryError = null;
          }
        }
      } catch (fetchErr: any) {
        console.error('[CategoryService] Server endpoint /api/product-categories fallback failed:', fetchErr);
        if (!queryError) {
          queryError = fetchErr?.message || 'Failed to reach product categories service';
        }
      }
    }

    if (queryError && !fetchedRows) {
      console.error('[CategoryService] Category query failed. No categories generated automatically:', queryError);
      return { data: [], error: queryError };
    }

    const rows = fetchedRows || [];

    // Update caches
    cachedActiveCategories = rows;
    cacheTimestamp = now;

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(rows));
      } catch (e) {
        // Ignore storage quota issues
      }
    }

    return { data: rows, error: null };
  }

  /**
   * Fetches all categories (active & inactive) for admin management.
   */
  async getAllCategories(forceRefresh = false): Promise<{
    data: ProductCategoryRow[];
    error: string | null;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { data: [], error: 'Supabase client is not configured.' };
    }

    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, display_order, is_active, created_at')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[CategoryService] Supabase error fetching all categories:', error);
        return { data: [], error: error.message };
      }

      const rows: ProductCategoryRow[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        display_order: Number(item.display_order ?? 0),
        is_active: Boolean(item.is_active),
        created_at: item.created_at,
      }));

      return { data: rows, error: null };
    } catch (err: any) {
      console.error('[CategoryService] Exception in getAllCategories:', err);
      return { data: [], error: err?.message || 'Failed to fetch categories.' };
    }
  }

  /**
   * Invalidates local caches when an admin adds/updates a category.
   */
  invalidateCache(): void {
    cachedActiveCategories = null;
    cacheTimestamp = 0;
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      } catch (e) {
        // Ignore
      }
    }
  }
}

export const categoryService = new CategoryService();
