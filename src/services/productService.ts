import { Product, FilterOptions } from '../types';
import { DEMO_PRODUCTS } from '../data/demoProducts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_PRODUCTS_KEY = 'kud_store_admin_products';

// Helper function to map database row fields to TypeScript Product model
export function mapSupabaseProduct(p: any): Product {
  let images: string[] = [];

  // 1. Array of strings in 'images'
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

  return {
    id: String(p.id),
    name: p.name || 'Product',
    brand: p.brand || 'KUD',
    price: Number(p.price) || 0,
    originalPrice:
      p.originalPrice !== undefined
        ? Number(p.originalPrice)
        : p.original_price !== undefined
        ? Number(p.original_price)
        : undefined,
    category: p.category || 'Beauty',
    sizeOrVariant: p.sizeOrVariant || p.size_or_variant || '',
    condition: p.condition || 'Brand New',
    description: p.description || '',
    images,
    inStock: p.inStock ?? p.in_stock ?? true,
    stock: p.stock ?? (p.inStock ?? p.in_stock ? 20 : 0),
    sku: p.sku || `SKU-${String(p.id).toUpperCase()}`,
    isFeatured: p.isFeatured ?? p.is_featured ?? false,
    isActive: p.isActive ?? p.is_active ?? true,
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
  };
}

// Get locally saved products from admin edits/creations
function getLocalAdminProducts(): Product[] {
  try {
    const stored = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }
  return [];
}

export const productService = {
  async getAllRawProducts(): Promise<Product[]> {
    let remoteProducts: Product[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*, product_images(*)');
        if (!error && data && data.length > 0) {
          remoteProducts = data.map(mapSupabaseProduct);
        } else {
          const { data: fallbackData } = await supabase.from('products').select('*');
          if (fallbackData && fallbackData.length > 0) {
            remoteProducts = fallbackData.map(mapSupabaseProduct);
          }
        }
      } catch (err) {
        console.warn('Supabase product query error:', err);
      }
    }

    const localProducts = getLocalAdminProducts();

    // If both remote and local are empty, use DEMO_PRODUCTS
    if (remoteProducts.length === 0 && localProducts.length === 0) {
      return DEMO_PRODUCTS.map((p) => ({
        ...p,
        isActive: true,
        stock: p.inStock ? 25 : 0,
        sku: `SKU-${p.id.toUpperCase()}`,
      }));
    }

    // Merge remote and local products. Local products take precedence or get appended
    const mergedMap = new Map<string, Product>();

    // First add remote
    remoteProducts.forEach((p) => mergedMap.set(p.id, p));

    // Then override/add local
    localProducts.forEach((p) => mergedMap.set(p.id, p));

    return Array.from(mergedMap.values());
  },

  async getProducts(filters?: FilterOptions): Promise<Product[]> {
    let result = await this.getAllRawProducts();

    // Filter active products
    result = result.filter((p) => p.isActive !== false);

    // Apply category filter
    if (filters?.category && filters.category !== 'All') {
      result = result.filter((p) => p.category === filters.category);
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
      result = result.filter((p) => p.condition === filters.condition);
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

  async getProductById(id: string): Promise<Product | null> {
    const all = await this.getAllRawProducts();
    const found = all.find((p) => p.id === id);
    return found || null;
  },

  async searchProducts(queryStr: string, filters?: FilterOptions): Promise<Product[]> {
    const q = queryStr.trim().toLowerCase();
    if (!q) {
      return this.getProducts(filters);
    }

    let all = await this.getProducts(filters);
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
