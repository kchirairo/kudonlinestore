import { Product, FilterOptions, ProductMediaItem, ProductVideoItem } from '../types';
import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabase';

/**
 * Helper function to map database row fields to TypeScript Product model.
 * Handles both snake_case and camelCase field variations, and seamlessly integrates
 * the dedicated public.product_media table.
 */
export function mapSupabaseProduct(p: any): Product {
  let images: string[] = [];
  let mediaItems: ProductMediaItem[] = [];
  let videos: ProductVideoItem[] = [];
  const altTextsMap: Record<string, string> = {};

  // Safe parse helper for JSON columns
  const parseJsonSafe = (val: any, fallback: any = null) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  // 0. High Priority: Dedicated product_media relation
  if (p.product_media && Array.isArray(p.product_media) && p.product_media.length > 0) {
    // Sort media by is_primary (primary first), then by position ASC, then created_at
    const sortedMedia = [...p.product_media].sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.position ?? 0) - (b.position ?? 0);
    });

    mediaItems = sortedMedia.map((m: any) => ({
      id: String(m.id),
      productId: String(m.product_id || p.id),
      mediaType: (m.media_type === 'video' ? 'video' : 'image') as 'image' | 'video',
      url: (m.media_url || m.url || '').trim(),
      thumbnailUrl: m.thumbnail_url || undefined,
      altText: m.alt_text || undefined,
      title: m.title || undefined,
      position: Number(m.position) || 0,
      isPrimary: Boolean(m.is_primary),
      sizeBytes: m.size_bytes ? Number(m.size_bytes) : undefined,
      durationSeconds: m.duration_seconds ? Number(m.duration_seconds) : undefined,
      createdAt: m.created_at || undefined,
      updatedAt: m.updated_at || undefined,
    })).filter((m) => m.url && m.url.length > 0);

    // Extract image URLs
    const imageMedia = mediaItems.filter((m) => m.mediaType === 'image');
    if (imageMedia.length > 0) {
      images = imageMedia.map((m) => m.url);
      imageMedia.forEach((m, idx) => {
        if (m.altText) {
          altTextsMap[`img_${idx}`] = m.altText;
          altTextsMap[m.id] = m.altText;
        }
      });
    }

    // Extract video items
    const videoMedia = mediaItems.filter((m) => m.mediaType === 'video');
    if (videoMedia.length > 0) {
      videos = videoMedia.map((m) => ({
        id: m.id,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        title: m.title,
        durationSeconds: m.durationSeconds,
        sizeBytes: m.sizeBytes,
        isPrimary: m.isPrimary,
      }));
    }
  }

  // 1. Array of strings or objects in 'images'
  if (images.length === 0 && Array.isArray(p.images) && p.images.length > 0) {
    images = p.images
      .map((img: any) => (typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '')))
      .filter((img: string) => img && img.length > 0);
  }
  // 2. 'images' stored as JSON string or comma-separated string
  else if (images.length === 0 && typeof p.images === 'string' && p.images.trim()) {
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

  // 3. Related legacy product_images table relation
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

  // 4. Single or multi-image column 'image_url' (Standard Supabase schema)
  if (images.length === 0 && typeof p.image_url === 'string' && p.image_url.trim()) {
    const raw = p.image_url.trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          images = parsed
            .map((img: any) => (typeof img === 'string' ? img.trim() : (img?.image_url || img?.url || '')))
            .filter((img: string) => img && img.length > 0);
        }
      } catch {
        // fallback
      }
    } else if (raw.includes(',')) {
      images = raw.split(',').map((s: string) => s.trim()).filter((s: string) => s.startsWith('http') || s.startsWith('data:'));
    }
    if (images.length === 0) {
      images = [raw];
    }
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

  // Synthesize mediaItems if not already populated from product_media
  if (mediaItems.length === 0) {
    mediaItems = images.map((url, idx) => ({
      id: `media-img-${p.id || 'temp'}-${idx}`,
      productId: String(p.id || ''),
      mediaType: 'image',
      url,
      position: idx,
      isPrimary: idx === 0,
      altText: `${p.name || 'Product'} photo ${idx + 1}`,
    }));
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

  const parsedVariants = parseJsonSafe(p.variants, []);
  const parsedVideos = videos.length > 0 ? videos : parseJsonSafe(p.videos, []);
  const parsedCategoryAttrs = parseJsonSafe(p.category_attributes || p.categoryAttributes, {});
  const parsedDimensions = parseJsonSafe(p.dimensions, undefined);
  const parsedTags = Array.isArray(p.tags)
    ? p.tags
    : typeof p.tags === 'string'
    ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];
  const parsedKeywords = Array.isArray(p.focus_keywords || p.focusKeywords)
    ? p.focus_keywords || p.focusKeywords
    : typeof (p.focus_keywords || p.focusKeywords) === 'string'
    ? (p.focus_keywords || p.focusKeywords).split(',').map((k: string) => k.trim()).filter(Boolean)
    : [];
  const parsedAltTexts = Object.keys(altTextsMap).length > 0
    ? altTextsMap
    : parseJsonSafe(p.image_alt_texts || p.imageAltTexts, {});

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
    costPrice: p.cost_price !== undefined ? Number(p.cost_price) : undefined,
    profitMargin: p.profit_margin !== undefined ? Number(p.profit_margin) : undefined,
    category: p.category || p.category_name || (typeof p.categories === 'string' ? p.categories : 'Beauty'),
    subCategory: p.sub_category || p.subCategory || undefined,
    productType: p.product_type || p.productType || undefined,
    shortDescription: p.short_description || p.shortDescription || undefined,
    tags: parsedTags,
    sizeOrVariant: p.sizeOrVariant || p.size_or_variant || p.variant || p.size || '',
    condition: p.condition || 'Brand New',
    description: p.description || p.desc || p.details || '',
    images,
    videos: Array.isArray(parsedVideos) ? parsedVideos : [],
    mediaItems,
    variants: Array.isArray(parsedVariants) ? parsedVariants : [],
    categoryAttributes: typeof parsedCategoryAttrs === 'object' ? parsedCategoryAttrs : {},
    inStock,
    stock: stockNumber,
    lowStockThreshold: p.low_stock_threshold !== undefined ? Number(p.low_stock_threshold) : 5,
    trackInventory: p.track_inventory !== false,
    allowBackorders: Boolean(p.allow_backorders),
    sku: p.sku || p.product_sku || (p.id ? `SKU-${String(p.id).substring(0, 8).toUpperCase()}` : ''),
    weight: p.weight !== undefined && p.weight !== null ? Number(p.weight) : undefined,
    dimensions: parsedDimensions,
    shippingClass: p.shipping_class || p.shippingClass || 'Standard Courier',
    isFreeShipping: Boolean(p.is_free_shipping || p.isFreeShipping),
    requiresShipping: p.requires_shipping !== false,
    seoTitle: p.seo_title || p.seoTitle || undefined,
    metaDescription: p.meta_description || p.metaDescription || undefined,
    slug: p.slug || undefined,
    focusKeywords: parsedKeywords,
    imageAltTexts: parsedAltTexts,
    productStatus: p.product_status || (p.is_active === false ? 'draft' : 'active'),
    scheduledAt: p.scheduled_at || undefined,
    isFeatured: Boolean(p.isFeatured ?? p.is_featured ?? p.featured),
    isNewAdded: Boolean(p.isNewAdded ?? p.is_new_added),
    isActive,
    rating: p.rating !== undefined ? Number(p.rating) : 5.0,
    reviewCount: p.review_count !== undefined ? Number(p.review_count) : p.reviewCount !== undefined ? Number(p.reviewCount) : 0,
    createdAt: p.createdAt || p.created_at || p.inserted_at || new Date().toISOString(),
    updatedAt: p.updated_at || p.updatedAt || undefined,
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
   * Fetches fresh products directly from Supabase public.products table,
   * joining public.product_media where available.
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
        console.log(`[Supabase Storefront] Project URL: ${supabaseUrl}`);

        // Try primary query with product_media join
        let { data, error } = await supabase
          .from('products')
          .select('*, product_media(*)')
          .order('created_at', { ascending: false });

        // If join fails due to relationship cache, fallback gracefully to select *
        if (error) {
          console.warn('[Supabase Storefront] Fallback query for public.products:', error.message);
          const fallbackRes = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        // If client query still encounters an error (such as function permission restrictions for logged-out visitors),
        // seamlessly fallback to the secure server products API
        if (error || !data || data.length === 0) {
          try {
            const apiRes = await fetch('/api/products');
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson.success && Array.isArray(apiJson.data) && apiJson.data.length > 0) {
                data = apiJson.data;
                error = null;
              }
            }
          } catch (apiErr) {
            console.warn('[Supabase Storefront] Server API fallback failed:', apiErr);
          }
        }

        if (error) {
          console.warn('[Supabase Storefront] Supabase query notice:', {
            message: error.message,
            code: error.code,
          });
          return lastProductsCache?.data || [];
        }

        const count = data ? data.length : 0;
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
    if (filters?.category && filters.category !== 'All' && filters.category !== 'All Products') {
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
   * Lookup single product by ID directly from Supabase public.products and public.product_media
   */
  async getProductById(id: string): Promise<Product | null> {
    if (!id) return null;

    if (!isSupabaseConfigured() || !supabase) {
      console.error('[ProductService] Supabase client is not configured.');
      return null;
    }

    // Try query with product_media join
    let { data, error } = await supabase
      .from('products')
      .select('*, product_media(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      const fallbackRes = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      data = fallbackRes.data;
    }

    if (!data) {
      try {
        const apiRes = await fetch(`/api/products/${encodeURIComponent(id)}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.success && apiJson.data) {
            data = apiJson.data;
          }
        }
      } catch (apiErr) {
        console.warn('[ProductService] Fallback to server API failed for product:', id, apiErr);
      }
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

