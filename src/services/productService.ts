import { Product, FilterOptions } from '../types';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase';

/**
 * Helper function to map database row fields to TypeScript Product model.
 * Handles both snake_case and camelCase field variations.
 */
export function mapSupabaseProduct(p: any): Product {
  let images: string[] = [];

  // 1. Array of strings or objects in 'images'
  if (Array.isArray(p.images) && p.images.length > 0) {
    images = p.images
      .map((img: any) => (typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '')))
      .filter((img: string) => img && img.length > 0);
  }
  // 2. 'images' stored as JSON string or comma-separated string
  else if (typeof p.images === 'string' && p.images.trim()) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        images = parsed
          .map((img: any) => (typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '')))
          .filter((img: string) => img && img.length > 0);
      } else if (typeof parsed === 'string' && parsed.trim()) {
        images = [parsed.trim()];
      }
    } catch {
      if (p.images.includes(',')) {
        images = p.images.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else {
        images = [p.images.trim()];
      }
    }
  }

  // 3. Related product_images table relation
  if (images.length === 0 && p.product_images && Array.isArray(p.product_images) && p.product_images.length > 0) {
    images = p.product_images
      .slice()
      .sort((a: any, b: any) => (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0))
      .map((img: any) => {
        if (typeof img === 'string') return img.trim();
        return (img.image_url || img.imageUrl || img.url || img.image || '').trim();
      })
      .filter((url: string) => url && url.length > 0);
  }

  // 4. Single image column 'image_url' (Standard Supabase schema)
  if (images.length === 0 && typeof p.image_url === 'string' && p.image_url.trim()) {
    images = [p.image_url.trim()];
  }

  // 5. Single image column 'image'
  if (images.length === 0 && typeof p.image === 'string' && p.image.trim()) {
    images = [p.image.trim()];
  }

  // 6. Array or string in 'image_urls'
  if (images.length === 0 && Array.isArray(p.image_urls) && p.image_urls.length > 0) {
    images = p.image_urls
      .map((img: any) => (typeof img === 'string' ? img.trim() : ''))
      .filter((img: string) => img && img.length > 0);
  }

  // 7. CamelCase variations 'imageUrl' or 'imageUrls'
  if (images.length === 0 && typeof p.imageUrl === 'string' && p.imageUrl.trim()) {
    images = [p.imageUrl.trim()];
  }
  if (images.length === 0 && Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
    images = p.imageUrls
      .map((img: any) => (typeof img === 'string' ? img.trim() : ''))
      .filter((img: string) => img && img.length > 0);
  }

  // 8. Other column variations 'img_url', 'thumbnail', 'photo_url'
  if (images.length === 0 && typeof p.img_url === 'string' && p.img_url.trim()) {
    images = [p.img_url.trim()];
  }
  if (images.length === 0 && typeof p.thumbnail === 'string' && p.thumbnail.trim()) {
    images = [p.thumbnail.trim()];
  }
  if (images.length === 0 && typeof p.photo_url === 'string' && p.photo_url.trim()) {
    images = [p.photo_url.trim()];
  }

  // If still empty, use a graceful placeholder
  if (images.length === 0) {
    images = ['https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80'];
  }

  // Determine active status: active unless explicitly set to false/inactive/draft/archived
  const isActive =
    p.isActive !== false &&
    p.is_active !== false &&
    p.active !== false &&
    p.status !== 'inactive' &&
    p.status !== 'draft' &&
    p.status !== 'archived';

  // Determine in-stock status
  const inStock =
    p.inStock !== undefined
      ? Boolean(p.inStock)
      : p.in_stock !== undefined
      ? Boolean(p.in_stock)
      : p.is_in_stock !== undefined
      ? Boolean(p.is_in_stock)
      : p.stock !== undefined
      ? Number(p.stock) > 0
      : true;

  const stockNumber =
    p.stock !== undefined
      ? Number(p.stock)
      : p.inventory_quantity !== undefined
      ? Number(p.inventory_quantity)
      : inStock
      ? 20
      : 0;

  return {
    id: String(p.id),
    name: p.name || p.title || 'Product',
    brand: p.brand || p.vendor || 'KUD Store',
    price: Number(p.price || p.regular_price || p.unit_price) || 0,
    originalPrice:
      p.originalPrice !== undefined
        ? Number(p.originalPrice)
        : p.original_price !== undefined
        ? Number(p.original_price)
        : p.compare_at_price !== undefined
        ? Number(p.compare_at_price)
        : p.slash_price !== undefined
        ? Number(p.slash_price)
        : undefined,
    category: p.category || p.category_name || (typeof p.categories === 'string' ? p.categories : 'Beauty'),
    sizeOrVariant: p.sizeOrVariant || p.size_or_variant || p.variant || p.size || '',
    condition: p.condition || 'Brand New',
    description: p.description || p.desc || p.details || '',
    images,
    inStock,
    stock: stockNumber,
    sku: p.sku || p.product_sku || (p.id ? `SKU-${String(p.id).substring(0, 8).toUpperCase()}` : ''),
    isFeatured: Boolean(p.isFeatured ?? p.is_featured ?? p.featured),
    isActive,
    rating: p.rating !== undefined ? Number(p.rating) : 5.0,
    reviewCount: p.review_count !== undefined ? Number(p.review_count) : p.reviewCount !== undefined ? Number(p.reviewCount) : 0,
    createdAt: p.createdAt || p.created_at || p.inserted_at || new Date().toISOString(),
  };
}

let inflightProductsPromise: Promise<Product[]> | null = null;
let lastProductsCache: { timestamp: number; data: Product[] } | null = null;
const CACHE_TTL_MS = 2500; // 2.5s cache prevents duplicate queries during rapid re-renders or Strict Mode

export const productService = {
  /**
   * Invalidate memory cache so next query fetches fresh data from database
   */
  invalidateCache() {
    lastProductsCache = null;
    inflightProductsPromise = null;
  },

  /**
   * Fetches fresh products directly from Supabase public.products table.
   * Supabase public.products is the ONLY source of truth.
   */
  async getAllRawProducts(forceRefresh = false): Promise<Product[]> {
    if (!isSupabaseConfigured() || !supabase) {
      const err = 'Supabase client is not configured in environment (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).';
      console.error(`[ProductService] ${err}`);
      console.log(`[Supabase Storefront] Project URL: ${supabaseUrl || 'NOT_CONFIGURED'}`);
      console.error(`[Supabase Storefront] Error:`, err);
      return [];
    }

    if (!forceRefresh && lastProductsCache && Date.now() - lastProductsCache.timestamp < CACHE_TTL_MS) {
      return lastProductsCache.data;
    }

    if (inflightProductsPromise) {
      return inflightProductsPromise;
    }

    inflightProductsPromise = (async () => {
      try {
        // 1. Log Supabase project URL (Key is omitted for security)
        console.log(`[Supabase Storefront] Project URL: ${supabaseUrl}`);

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        // 4. Log any Supabase error
        if (error) {
          console.warn('[Supabase Storefront] Supabase notification for public.products:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          return lastProductsCache?.data || [];
        }

        const count = data ? data.length : 0;
        // 2. Log number of products returned
        console.log(`[Supabase Storefront] Number of products returned: ${count}`);

        if (!data || data.length === 0) {
          const emptyResult: Product[] = [];
          lastProductsCache = { timestamp: Date.now(), data: emptyResult };
          return emptyResult;
        }

        const mapped = data.map(mapSupabaseProduct);
        lastProductsCache = { timestamp: Date.now(), data: mapped };
        return mapped;
      } finally {
        inflightProductsPromise = null;
      }
    })();

    return inflightProductsPromise;
  },

  /**
   * Fetches active storefront products with optional search, category, brand, and price filters.
   * Fetches fresh data from Supabase on every call.
   */
  async getProducts(filters?: FilterOptions): Promise<Product[]> {
    const raw = await this.getAllRawProducts();

    // Filter active products - do not incorrectly filter out newly created products
    let result = raw.filter((p) => p.isActive !== false);

    // Apply category filter
    if (filters?.category && filters.category !== 'All') {
      result = result.filter(
        (p) => p.category?.trim().toLowerCase() === filters.category!.trim().toLowerCase()
      );
    }

    // Apply brand filter
    if (filters?.brand) {
      result = result.filter((p) =>
        p.brand.toLowerCase().includes(filters.brand!.toLowerCase())
      );
    }

    // Apply price range
    if (filters?.minPrice !== undefined) {
      result = result.filter((p) => p.price >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      result = result.filter((p) => p.price <= filters.maxPrice!);
    }

    // Apply condition
    if (filters?.condition && filters.condition !== 'All') {
      result = result.filter(
        (p) => p.condition.toLowerCase() === filters.condition!.toLowerCase()
      );
    }

    // Apply inStockOnly
    if (filters?.inStockOnly) {
      result = result.filter((p) => p.inStock && (p.stock === undefined || p.stock > 0));
    }

    // Sorting
    if (filters?.sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters?.sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (filters?.sortBy === 'popular') {
      result.sort((a, b) => {
        const aFeatured = a.isFeatured ? 1 : 0;
        const bFeatured = b.isFeatured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;

        const ratingA = a.rating || 4.5;
        const ratingB = b.rating || 4.5;
        if (ratingA !== ratingB) return ratingB - ratingA;

        const reviewsA = a.reviewCount || 10;
        const reviewsB = b.reviewCount || 10;
        return reviewsB - reviewsA;
      });
    } else {
      // Default to newest first
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  },

  /**
   * Lookup single product by ID directly from Supabase public.products
   */
  async getProductById(id: string): Promise<Product | null> {
    if (!id) return null;

    if (!isSupabaseConfigured() || !supabase) {
      console.error('[ProductService] Supabase client is not configured.');
      return null;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase Storefront] Notice fetching product by ID "${id}":`, error.message);
      return null;
    }

    if (!data) return null;
    return mapSupabaseProduct(data);
  },

  /**
   * Search active storefront products from live Supabase data
   */
  async searchProducts(queryStr: string, filters?: FilterOptions): Promise<Product[]> {
    const q = queryStr.trim().toLowerCase();
    const all = await this.getProducts(filters);
    if (!q) {
      return all;
    }

    return all.filter(
      (p) =>
        p.isActive !== false &&
        (p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)))
    );
  },
};
