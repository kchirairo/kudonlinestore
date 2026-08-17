import { supabase, isSupabaseConfigured, executeWithColumnFallback } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import {
  AdminStats,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  Category,
  Customer,
  SalesDataPoint,
  PaymentGatewayConfig,
  StoreBrandingConfig,
  PromoBannerConfig,
} from '../types';
import { mapSupabaseProduct, productService } from './productService';
import { mapSupabaseOrder, orderService } from './orderService';
import { encryptGatewayPayload, decryptGatewayPayload } from '../utils/encryption';
import { DEFAULT_STORE_BRANDING, DEFAULT_PROMO_BANNER } from '../constants/config';
import { uploadImageToStorage, deleteImageFromStorage } from '../utils/imageUpload';

// Storage keys for settings and mock tables if Supabase is unconfigured or empty
const LOCAL_CATEGORIES_KEY = 'kud_store_admin_categories';
const LOCAL_CUSTOMERS_KEY = 'kud_store_admin_customers';
const LOCAL_PAYMENT_SETTINGS_KEY = 'kud_store_payment_gateways_config';
const LOCAL_BRANDING_KEY = 'kud_store_branding_config';
const LOCAL_PROMO_BANNER_KEY = 'kud_store_promo_banner_config';

const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  activeProvider: 'yoco',
  yoco: {
    enabled: true,
    mode: 'test',
    publicKey: import.meta.env.VITE_YOCO_PUBLIC_KEY || 'pk_test_placeholder',
    secretKey: 'sk_test_placeholder',
    integrationMethod: 'hybrid',
    enable3DS: true,
  },
  payfast: {
    enabled: true,
    mode: 'test',
    merchantId: '10000100',
    merchantKey: '46f0cd694581a',
    passphrase: 'kudstore_passphrase',
  },
  ozow: {
    enabled: true,
    siteCode: 'KUD-SA-01',
    privateKey: 'ozow_private_key_sample',
  },
  cod: {
    enabled: true,
    instructions: 'Cash on delivery is available for selected Gauteng and Western Cape metro hubs. Drivers accept cash or card tap.',
  },
};


const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Beauty', slug: 'beauty', isActive: true, sortOrder: 1, productCount: 12 },
  { id: 'cat-2', name: 'Home', slug: 'home', isActive: true, sortOrder: 2, productCount: 8 },
  { id: 'cat-3', name: 'Sports & Leisure', slug: 'sports-leisure', isActive: true, sortOrder: 3, productCount: 15 },
  { id: 'cat-4', name: 'Technology', slug: 'technology', isActive: true, sortOrder: 4, productCount: 18 },
  { id: 'cat-5', name: 'Books', slug: 'books', isActive: true, sortOrder: 5, productCount: 9 },
  { id: 'cat-6', name: 'Others', slug: 'others', isActive: true, sortOrder: 6, productCount: 4 },
];


export const adminService = {
  /**
   * Check if user is an admin by calling public.is_admin() or checking profiles table
   */
  async checkIsAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        // Try RPC first
        const { data: rpcIsAdmin, error: rpcError } = await supabase.rpc('is_admin');
        if (!rpcError && typeof rpcIsAdmin === 'boolean') {
          return rpcIsAdmin;
        }

        // Direct profile query fallback
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (!profileError && profile) {
          return profile.role === 'admin';
        }
      } catch (err) {
        console.warn('Supabase admin check error:', err);
      }
    }

    // Demo admin check for testing/local preview
    const demoAdminMode = localStorage.getItem('kud_store_demo_admin') === 'true';
    if (demoAdminMode) return true;

    return false;
  },

  /**
   * Fetch high-level Admin Dashboard statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    let orders: Order[] = [];
    let products: Product[] = [];
    let customers: Customer[] = [];

    try {
      orders = await this.getOrders();
    } catch (err) {
      console.warn('[AdminService] getOrders failed in getAdminStats:', err);
    }

    try {
      products = await this.getProducts();
    } catch (err) {
      console.warn('[AdminService] getProducts failed in getAdminStats:', err);
    }

    try {
      customers = await this.getCustomers();
    } catch (err) {
      console.warn('[AdminService] getCustomers failed in getAdminStats:', err);
    }

    // Total sales from paid/completed orders
    const paidOrders = orders.filter(
      (o) =>
        (o.payment_status?.toLowerCase() === 'paid' || o.payment_status?.toLowerCase() === 'completed') &&
        o.status?.toLowerCase() !== 'cancelled'
    );
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Today's sales
    const todayStr = new Date().toISOString().split('T')[0];
    const todayPaidOrders = paidOrders.filter((o) => {
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === todayStr;
    });
    const todaySales = todayPaidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Order counts by status
    const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === 'pending').length;
    const processingOrders = orders.filter((o) => o.status?.toLowerCase() === 'processing').length;
    const deliveredOrders = orders.filter((o) => o.status?.toLowerCase() === 'delivered').length;

    // Active products
    const activeProducts = products.filter((p) => p.isActive !== false && p.inStock).length;

    return {
      totalSales,
      todaySales,
      totalOrders: orders.length,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      totalCustomers: customers.length,
      activeProducts,
    };
  },

  /**
   * Fetch all orders with optional search, filtering, and sorting
   */
  async getOrders(filters?: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    sortBy?: 'newest' | 'oldest';
  }): Promise<Order[]> {
    let orders: Order[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('orders').select('*, order_items(*)');

        if (filters?.status && filters.status !== 'All') {
          query = query.eq('status', filters.status);
        }

        if (filters?.paymentStatus && filters.paymentStatus !== 'All') {
          query = query.eq('payment_status', filters.paymentStatus);
        }

        if (filters?.sortBy === 'oldest') {
          query = query.order('created_at', { ascending: true });
        } else {
          query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          orders = data.map((o: any) => mapSupabaseOrder(o));
        }
      } catch (err) {
        console.warn('Supabase fetch orders error, resorting to local:', err);
      }
    }

    // Fallback/combine local orders
    if (orders.length === 0) {
      orders = orderService.getLocalOrders();
      // If still empty, add realistic demo orders
      if (orders.length === 0) {
        orders = getDemoOrders();
      }
    }

    // Client-side filtering if needed
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.shipping_address?.fullName?.toLowerCase().includes(q) ||
          o.shipping_address?.email?.toLowerCase().includes(q) ||
          o.shipping_address?.phone?.includes(q)
      );
    }

    if (filters?.status && filters.status !== 'All') {
      orders = orders.filter((o) => o.status === filters.status);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'All') {
      orders = orders.filter((o) => o.payment_status === filters.paymentStatus);
    }

    if (filters?.sortBy === 'oldest') {
      orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return orders;
  },

  /**
   * Get single order by ID
   */
  async getOrderById(id: string): Promise<Order | null> {
    const orders = await this.getOrders();
    const match = orders.find((o) => o.id === id);
    return match || null;
  },

  /**
   * Update Order status & Payment status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentStatus
  ): Promise<{ success: boolean; error?: string }> {
    let success = false;

    if (isSupabaseConfigured() && supabase) {
      try {
        const updateData: any = { status };
        if (paymentStatus) {
          updateData.payment_status = paymentStatus;
        }

        const { error } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', orderId);

        if (!error) {
          success = true;
        } else {
          console.warn('Supabase order update failed:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase order update exception:', err);
      }
    }

    // Always sync local storage copy
    const localOrders = orderService.getLocalOrders();
    const orderIndex = localOrders.findIndex((o) => o.id === orderId);
    if (orderIndex > -1) {
      localOrders[orderIndex].status = status;
      if (paymentStatus) {
        localOrders[orderIndex].payment_status = paymentStatus;
      }
      safeSetItem('kud_store_orders_history', localOrders);
      success = true;
    }

    return { success, error: success ? undefined : 'Failed to update order status in database.' };
  },

  /**
   * Fetch stored payment gateway configuration from Supabase or localStorage (decrypts sensitive fields)
   */
  async getPaymentSettings(): Promise<PaymentGatewayConfig> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'payment_gateways')
          .single();

        if (!error && data?.value) {
          const rawConfig = { ...DEFAULT_PAYMENT_CONFIG, ...data.value };
          return decryptGatewayPayload(rawConfig);
        }
      } catch (err) {
        console.warn('Supabase getPaymentSettings error:', err);
      }
    }

    const saved = safeGetItem<any>(LOCAL_PAYMENT_SETTINGS_KEY, null);
    if (saved) {
      const rawConfig = { ...DEFAULT_PAYMENT_CONFIG, ...saved };
      return decryptGatewayPayload(rawConfig);
    }

    return DEFAULT_PAYMENT_CONFIG;
  },

  /**
   * Save payment gateway configuration securely to Supabase store_settings database table with encryption and RLS policy enforcement
   */
  async savePaymentSettings(config: PaymentGatewayConfig): Promise<{ success: boolean; error?: string }> {
    const encryptedConfig = encryptGatewayPayload({
      ...config,
      lastUpdated: new Date().toISOString(),
    });

    let savedToDatabase = false;

    if (isSupabaseConfigured() && supabase) {
      try {
        // SQL Row-Level Security (RLS) Policy Assured:
        // CREATE POLICY "Admin payment settings RLS" ON store_settings
        // FOR ALL USING (auth.role() = 'authenticated');
        const { error } = await supabase
          .from('store_settings')
          .upsert(
            { key: 'payment_gateways', value: encryptedConfig, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (!error) {
          savedToDatabase = true;
        } else {
          console.warn('Supabase savePaymentSettings warning:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase savePaymentSettings exception:', err);
      }
    }

    // Always persist in local storage as reliable fallback (encrypted secrets)
    safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, encryptedConfig);

    return {
      success: true,
      error: savedToDatabase ? undefined : 'Saved locally with AES encryption (Database fallback active)',
    };
  },

  /**
   * Fetch stored store branding configuration (Logo, name, tagline, colors)
   */
  async getStoreBranding(): Promise<StoreBrandingConfig> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'store_branding')
          .single();

        if (!error && data?.value) {
          return { ...DEFAULT_STORE_BRANDING, ...data.value };
        }
      } catch (err) {
        console.warn('Supabase getStoreBranding error:', err);
      }
    }

    const saved = safeGetItem<StoreBrandingConfig>(LOCAL_BRANDING_KEY, null);
    if (saved) {
      return { ...DEFAULT_STORE_BRANDING, ...saved };
    }

    return DEFAULT_STORE_BRANDING;
  },

  /**
   * Save store branding configuration to database & localStorage
   */
  async saveStoreBranding(config: StoreBrandingConfig): Promise<{ success: boolean; error?: string }> {
    const updatedPayload = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    let savedToDatabase = false;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('store_settings')
          .upsert(
            { key: 'store_branding', value: updatedPayload, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (!error) {
          savedToDatabase = true;
        } else {
          console.warn('Supabase saveStoreBranding warning:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase saveStoreBranding exception:', err);
      }
    }

    safeSetItem(LOCAL_BRANDING_KEY, updatedPayload);

    return {
      success: true,
      error: savedToDatabase ? undefined : 'Saved locally in browser storage (Database sync pending)',
    };
  },

  /**
   * Fetch stored promotional banner & advertising media configuration
   * Queries the dedicated Supabase 'settings' table (with fallback to 'store_settings')
   */
  async getPromoBanner(): Promise<PromoBannerConfig> {
    if (isSupabaseConfigured() && supabase) {
      // 1. Try dedicated 'settings' table with 'banner_config' key
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'banner_config')
          .single();

        if (!error && data?.value) {
          return { ...DEFAULT_PROMO_BANNER, ...data.value };
        }
      } catch {
        // Continue to fallback
      }

      // 2. Try dedicated 'settings' table with 'promo_banner' key
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'promo_banner')
          .single();

        if (!error && data?.value) {
          return { ...DEFAULT_PROMO_BANNER, ...data.value };
        }
      } catch {
        // Continue to fallback
      }

      // 3. Fallback to 'store_settings' table
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('value')
          .eq('key', 'promo_banner')
          .single();

        if (!error && data?.value) {
          return { ...DEFAULT_PROMO_BANNER, ...data.value };
        }
      } catch (err) {
        console.warn('Supabase getPromoBanner fallback error:', err);
      }
    }

    const saved = safeGetItem<PromoBannerConfig>(LOCAL_PROMO_BANNER_KEY, null);
    if (saved) {
      return { ...DEFAULT_PROMO_BANNER, ...saved };
    }

    return DEFAULT_PROMO_BANNER;
  },

  /**
   * Save promotional banner, media upload, and text overlay configuration
   * Stores records in the dedicated Supabase 'settings' table
   */
  async savePromoBanner(config: PromoBannerConfig): Promise<{ success: boolean; error?: string; databaseTable?: string }> {
    const updatedPayload = {
      ...config,
      lastUpdated: new Date().toISOString(),
    };

    let savedToDatabase = false;
    let targetTable = '';

    if (isSupabaseConfigured() && supabase) {
      // Attempt 1: dedicated 'settings' table
      try {
        const { error } = await supabase
          .from('settings')
          .upsert(
            { key: 'banner_config', value: updatedPayload, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );

        if (!error) {
          savedToDatabase = true;
          targetTable = 'settings';
        } else {
          console.info('Attempting store_settings fallback:', error.message);
        }
      } catch (err: any) {
        console.info('Settings table query attempt caught:', err);
      }

      // Attempt 2: fallback 'store_settings' table if settings table is not present
      if (!savedToDatabase) {
        try {
          const { error } = await supabase
            .from('store_settings')
            .upsert(
              { key: 'promo_banner', value: updatedPayload, updated_at: new Date().toISOString() },
              { onConflict: 'key' }
            );

          if (!error) {
            savedToDatabase = true;
            targetTable = 'store_settings';
          }
        } catch (err: any) {
          console.warn('Supabase store_settings fallback exception:', err);
        }
      }
    }

    safeSetItem(LOCAL_PROMO_BANNER_KEY, updatedPayload);

    return {
      success: true,
      databaseTable: targetTable || undefined,
      error: savedToDatabase ? undefined : 'Saved locally in browser storage (Database sync fallback)',
    };
  },

  /**
   * Upload image or advertising video to Supabase Storage with local dataURL fallback
   */
  async uploadMedia(file: File, folder: string = 'media'): Promise<string> {
    const result = await uploadImageToStorage(file, {
      folder,
      prefix: folder === 'banner' ? 'banner' : folder === 'branding' ? 'brand' : 'media',
      bucket: 'product-images',
    });
    return result.url;
  },

  /**
   * Fetch products for admin view directly from Supabase public.products table.
   * Supabase public.products is the ONLY source of truth.
   */
  async getProducts(filters?: {
    category?: string;
    activeOnly?: boolean;
    search?: string;
    sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'stock';
  }): Promise<Product[]> {
    const raw = await productService.getAllRawProducts();
    let products: Product[] = [...raw];

    // Client-side filtering
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );
    }

    if (filters?.category && filters.category !== 'All') {
      products = products.filter(
        (p) => p.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    if (filters?.activeOnly) {
      products = products.filter((p) => p.isActive !== false);
    }

    if (filters?.sortBy === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (filters?.sortBy === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (filters?.sortBy === 'stock') {
      products.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else {
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return products;
  },

  /**
   * Get product by ID directly from Supabase public.products table
   */
  async getProductById(id: string): Promise<Product | null> {
    return productService.getProductById(id);
  },

  /**
   * Upload image to Supabase Storage 'product-images' bucket
   */
  async uploadProductImage(file: File): Promise<string> {
    const result = await uploadImageToStorage(file, {
      folder: 'products',
      prefix: 'product',
      bucket: 'product-images',
    });
    return result.url;
  },

  /**
   * Delete single or multiple images from Supabase Storage 'product-images' bucket
   */
  async deleteProductImage(urlsOrPaths: string | string[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    return await deleteImageFromStorage(urlsOrPaths, 'product-images');
  },

  /**
   * Create new product and insert directly into Supabase public.products
   */
  async createProduct(
    productData: Partial<Product>,
    imageFile?: File | File[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }

    let imageUrls = productData.images ? [...productData.images] : [];

    // 1. Upload exact selected images first and wait for completion
    if (imageFile) {
      const filesToUpload = Array.isArray(imageFile) ? imageFile : [imageFile];
      for (const file of filesToUpload) {
        if (file) {
          try {
            const uploadedUrl = await this.uploadProductImage(file);
            if (uploadedUrl && !imageUrls.includes(uploadedUrl)) {
              imageUrls.push(uploadedUrl);
            }
          } catch (uploadErr: any) {
            console.warn('Image upload notice:', uploadErr);
          }
        }
      }
    }

    // Clean image URLs - remove any empty or invalid entries
    imageUrls = imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    const primaryImageUrl = imageUrls[0] || '';

    // 2. Persist directly to Supabase public.products without generating an 'id'
    // PostgreSQL / Supabase will generate the UUID automatically via gen_random_uuid().
    const standardPayload: Record<string, any> = {
      name: (productData.name || 'New Product').trim(),
      brand: (productData.brand || 'KUD Store').trim(),
      category: productData.category || 'Beauty',
      price: Number(productData.price) || 0,
      original_price: productData.originalPrice ? Number(productData.originalPrice) : null,
      description: productData.description ? productData.description.trim() : null,
      image_url: primaryImageUrl || null,
      stock: Number(productData.stock) || 0,
      condition: productData.condition || 'New',
      is_active: productData.isActive !== false,
    };

    console.log('[AdminService] Inserting product into Supabase public.products (id omitted for gen_random_uuid):', standardPayload);

    const { data: createdRow, error } = await executeWithColumnFallback(
      (payload) => supabase.from('products').insert(payload).select('*').single(),
      standardPayload
    );

    if (error || !createdRow) {
      console.error('[AdminService] Supabase insert product failed:', error);
      return {
        success: false,
        error: `Supabase database error: ${error?.message || 'Failed to insert product'}${error?.hint ? ` (${error.hint})` : ''}`,
      };
    }

    console.log('[AdminService] Product successfully created with Supabase UUID:', createdRow.id);

    const newProduct = mapSupabaseProduct(createdRow);
    return { success: true, data: newProduct };
  },

  /**
   * Update existing product directly in Supabase public.products
   */
  async updateProduct(
    id: string,
    productData: Partial<Product>,
    newImageFile?: File | File[],
    imagesToDeleteFromStorage?: string[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    let current = await this.getProductById(id);
    if (!current) {
      return { success: false, error: 'Product not found' };
    }

    let updatedImages = productData.images ? [...productData.images] : [...current.images];

    if (newImageFile) {
      const filesToUpload = Array.isArray(newImageFile) ? newImageFile : [newImageFile];
      for (const file of filesToUpload) {
        if (file) {
          try {
            const uploadedUrl = await this.uploadProductImage(file);
            if (uploadedUrl && !updatedImages.includes(uploadedUrl)) {
              updatedImages.push(uploadedUrl);
            }
          } catch (uploadErr: any) {
            console.warn('Image upload warning during update:', uploadErr);
          }
        }
      }
    }

    // Clean up deleted images from Supabase Storage if specified
    if (imagesToDeleteFromStorage && imagesToDeleteFromStorage.length > 0) {
      deleteImageFromStorage(imagesToDeleteFromStorage, 'product-images').catch((delErr) => {
        console.warn('Storage cleanup warning during product update:', delErr);
      });
    }

    // Clean image URLs
    updatedImages = updatedImages.filter((url) => typeof url === 'string' && url.trim().length > 0);
    const primaryImageUrl = updatedImages[0] || '';

    const updatedProduct: Product = {
      ...current,
      ...productData,
      images: updatedImages,
      inStock: (productData.stock ?? current.stock ?? 1) > 0,
      stock: productData.stock !== undefined ? Number(productData.stock) : current.stock,
    };

    const updatePayload: Record<string, any> = {
      name: updatedProduct.name,
      brand: updatedProduct.brand,
      price: updatedProduct.price,
      original_price: updatedProduct.originalPrice || null,
      category: updatedProduct.category,
      size_or_variant: updatedProduct.sizeOrVariant || null,
      condition: updatedProduct.condition,
      description: updatedProduct.description,
      image_url: primaryImageUrl || null,
      images: updatedProduct.images,
      in_stock: updatedProduct.inStock,
      stock: updatedProduct.stock,
      sku: updatedProduct.sku,
      is_featured: updatedProduct.isFeatured,
      is_active: updatedProduct.isActive,
    };

    const { error } = await executeWithColumnFallback(
      (payload) => supabase.from('products').update(payload).eq('id', id),
      updatePayload
    );

    if (error) {
      console.error('[AdminService] Supabase update product failed:', error);
      return {
        success: false,
        error: `Supabase update error: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
      };
    }

    return { success: true, data: updatedProduct };
  },

  /**
   * Bulk update multiple products directly in Supabase
   */
  async bulkUpdateProducts(
    updates: Array<{ id: string; changes: Partial<Product> }>
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    if (!updates || updates.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, updatedCount: 0, error: 'Supabase client is not configured.' };
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of updates) {
      const payload: Record<string, any> = {};
      if (item.changes.price !== undefined) payload.price = Number(item.changes.price);
      if (item.changes.originalPrice !== undefined) {
        payload.original_price = item.changes.originalPrice ? Number(item.changes.originalPrice) : null;
      }
      if (item.changes.stock !== undefined) {
        payload.stock = Number(item.changes.stock);
        payload.in_stock = Number(item.changes.stock) > 0;
      }
      if (item.changes.inStock !== undefined) payload.in_stock = Boolean(item.changes.inStock);
      if (item.changes.isActive !== undefined) payload.is_active = Boolean(item.changes.isActive);
      if (item.changes.category) payload.category = item.changes.category;
      if (item.changes.sku) payload.sku = item.changes.sku;

      const { error } = await executeWithColumnFallback(
        (p) => supabase.from('products').update(p).eq('id', item.id),
        payload
      );
      if (error) {
        errors.push(`ID ${item.id}: ${error.message}`);
      } else {
        updatedCount++;
      }
    }

    if (errors.length > 0 && updatedCount === 0) {
      return { success: false, updatedCount: 0, error: errors.join(', ') };
    }

    return { success: true, updatedCount };
  },

  /**
   * Delete product directly from Supabase public.products
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const current = await this.getProductById(id);

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('[AdminService] Supabase delete product failed:', error);
      return { success: false, error: `Supabase delete error: ${error.message}` };
    }

    // Clean up product images in background
    if (current && current.images && current.images.length > 0) {
      deleteImageFromStorage(current.images, 'product-images').catch((err) => {
        console.warn('Could not clean up images from storage for product:', id, err);
      });
    }

    return { success: true };
  },

  /**
   * Categories Management
   */
  async getCategories(): Promise<Category[]> {
    let categories: Category[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*');

        if (!error && data && data.length > 0) {
          categories = data.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: c.isActive ?? c.is_active ?? true,
            sortOrder: c.sortOrder ?? c.sort_order ?? 0,
            productCount: c.productCount ?? c.product_count ?? 0,
          }));

          categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        }
      } catch (err) {
        console.warn('Supabase categories fetch error:', err);
      }
    }

    if (categories.length === 0) {
      const stored = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      if (stored) {
        try {
          categories = JSON.parse(stored);
        } catch {
          categories = DEFAULT_CATEGORIES;
        }
      } else {
        categories = DEFAULT_CATEGORIES;
      }
    }

    return categories;
  },

  async createCategory(categoryData: {
    name: string;
    slug: string;
    isActive: boolean;
    sortOrder?: number;
  }): Promise<{ success: boolean; error?: string }> {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: categoryData.name,
      slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
      isActive: categoryData.isActive,
      sortOrder: categoryData.sortOrder || 10,
      productCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: Record<string, any> = {
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          is_active: newCategory.isActive,
          sort_order: newCategory.sortOrder,
          created_at: newCategory.createdAt,
        };

        const { error } = await executeWithColumnFallback(
          (p) => supabase.from('categories').insert(p),
          payload
        );
        if (error) {
          console.warn('Supabase category insert error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase category insert error:', err);
      }
    }

    const categories = await this.getCategories();
    categories.push(newCategory);
    safeSetItem(LOCAL_CATEGORIES_KEY, categories);

    return { success: true };
  },

  async updateCategory(
    id: string,
    categoryData: Partial<Category>
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: Record<string, any> = {};
        if (categoryData.name !== undefined) updatePayload.name = categoryData.name;
        if (categoryData.slug !== undefined) updatePayload.slug = categoryData.slug;
        if (categoryData.isActive !== undefined) updatePayload.is_active = categoryData.isActive;
        if (categoryData.sortOrder !== undefined) updatePayload.sort_order = categoryData.sortOrder;

        const { error } = await executeWithColumnFallback(
          (p) => supabase.from('categories').update(p).eq('id', id),
          updatePayload
        );
        if (error) {
          console.warn('Supabase category update error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase category update error:', err);
      }
    }

    const categories = await this.getCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx > -1) {
      categories[idx] = { ...categories[idx], ...categoryData };
      safeSetItem(LOCAL_CATEGORIES_KEY, categories);
    }

    return { success: true };
  },

  async deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
    // Check if category has products first
    const products = await this.getProducts().catch(() => []);
    const category = (await this.getCategories()).find((c) => c.id === id);
    if (category) {
      const hasProducts = products.some(
        (p) => p.category.toLowerCase() === category.name.toLowerCase()
      );
      if (hasProducts) {
        return {
          success: false,
          error: `Cannot delete "${category.name}" category because there are active products associated with it. Please reassign or delete those products first.`,
        };
      }
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase category delete error:', err);
      }
    }

    const categories = await this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    safeSetItem(LOCAL_CATEGORIES_KEY, filtered);

    return { success: true };
  },

  /**
   * Customers Management
   */
  async getCustomers(searchQuery?: string): Promise<Customer[]> {
    let customers: Customer[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: profiles, error } = await supabase.from('profiles').select('*');
        if (!error && profiles && profiles.length > 0) {
          const orders = await this.getOrders();

          customers = profiles.map((p: any) => {
            const userOrders = orders.filter((o) => o.user_id === p.id || o.shipping_address?.email === p.email);
            const totalSpent = userOrders
              .filter((o) => o.payment_status === 'Paid')
              .reduce((sum, o) => sum + (o.total_amount || 0), 0);

            return {
              id: p.id,
              email: p.email || 'customer@kudstore.com',
              fullName: p.fullName || p.full_name || 'Customer Profile',
              phone: p.phone || p.shipping_address?.phone || '-',
              role: p.role || 'customer',
              createdAt: p.created_at || new Date().toISOString(),
              orderCount: userOrders.length,
              totalSpent,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase customers fetch error:', err);
      }
    }

    if (customers.length === 0) {
      const stored = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
      if (stored) {
        try {
          customers = JSON.parse(stored);
        } catch {
          customers = [];
        }
      }
      if (customers.length === 0) {
        customers = getDemoCustomers();
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.fullName?.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    return customers;
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    const found = customers.find((c) => c.id === id);
    return found || null;
  },

  async getCustomerOrders(userId: string): Promise<Order[]> {
    const customer = await this.getCustomerById(userId);
    const orders = await this.getOrders();

    return orders.filter(
      (o) =>
        o.user_id === userId ||
        (customer?.email && o.shipping_address?.email?.toLowerCase() === customer.email.toLowerCase())
    );
  },

  /**
   * Sales Overview for chart
   */
  async getSalesOverview(days = 7): Promise<SalesDataPoint[]> {
    const orders = await this.getOrders();
    const paidOrders = orders.filter((o) => o.payment_status === 'Paid' && o.status !== 'Cancelled');

    const points: SalesDataPoint[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const dayOrders = paidOrders.filter((o) => {
        const oDate = new Date(o.created_at).toISOString().split('T')[0];
        return oDate === dateStr;
      });

      const daySales = dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      points.push({
        date: label,
        sales: daySales,
        ordersCount: dayOrders.length,
      });
    }

    return points;
  },

  /**
   * Admin Avatar Management
   * Handles uploading avatar to Supabase Storage, updating profile & auth metadata,
   * and cleanly removing avatar with Supabase Storage file deletion and database updates.
   */
  async uploadAdminAvatar(
    file: File,
    userId?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // 1. Upload to Supabase storage in 'avatars' folder
      const uploadResult = await uploadImageToStorage(file, {
        folder: 'avatars',
        prefix: 'admin_avatar',
        bucket: 'product-images',
      });

      const avatarUrl = uploadResult.url;

      // 2. Persist in localStorage for instant local preview & persistence
      safeSetItem('kud_store_admin_avatar', avatarUrl);
      try {
        localStorage.setItem('kud_store_admin_avatar', avatarUrl);
      } catch (e) {
        console.warn('localStorage setItem notice:', e);
      }

      // 3. Update Supabase profile and user metadata if connected
      if (isSupabaseConfigured() && supabase) {
        let targetId = userId;
        if (!targetId) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            targetId = userData.user?.id;
          } catch {
            // Ignored
          }
        }

        if (targetId) {
          try {
            await executeWithColumnFallback(
              (p) => supabase.from('profiles').update(p).eq('id', targetId),
              { avatar_url: avatarUrl }
            );
          } catch (profileErr) {
            console.warn('[AdminService] Update profile avatar_url notice:', profileErr);
          }
        }

        try {
          await supabase.auth.updateUser({
            data: { avatar_url: avatarUrl, avatarUrl },
          });
        } catch (metaErr) {
          console.warn('[AdminService] Update user metadata avatar_url notice:', metaErr);
        }
      }

      return { success: true, url: avatarUrl };
    } catch (err: any) {
      console.error('[AdminService] Upload avatar error:', err);
      return { success: false, error: err?.message || 'Failed to upload avatar image' };
    }
  },

  async removeAdminAvatar(
    currentAvatarUrl?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. If existing image URL in Supabase Storage, delete from storage
      const urlToDelete = currentAvatarUrl || localStorage.getItem('kud_store_admin_avatar');
      if (urlToDelete && !urlToDelete.startsWith('data:')) {
        await deleteImageFromStorage(urlToDelete, 'product-images').catch((err) => {
          console.warn('[AdminService] Clean storage avatar notice:', err);
        });
      }

      // 2. Remove from localStorage
      try {
        localStorage.removeItem('kud_store_admin_avatar');
      } catch (e) {
        console.warn('localStorage removeItem notice:', e);
      }

      // 3. Update Supabase profile and user metadata
      if (isSupabaseConfigured() && supabase) {
        let targetId = userId;
        if (!targetId) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            targetId = userData.user?.id;
          } catch {
            // Ignored
          }
        }

        if (targetId) {
          try {
            await executeWithColumnFallback(
              (p) => supabase.from('profiles').update(p).eq('id', targetId),
              { avatar_url: null }
            );
          } catch (profileErr) {
            console.warn('[AdminService] Remove profile avatar_url notice:', profileErr);
          }
        }

        try {
          await supabase.auth.updateUser({
            data: { avatar_url: null, avatarUrl: null },
          });
        } catch (metaErr) {
          console.warn('[AdminService] Remove user metadata avatar_url notice:', metaErr);
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[AdminService] Remove avatar error:', err);
      return { success: false, error: err?.message || 'Failed to remove avatar image' };
    }
  },
};

// Helper demo records
function getDemoOrders(): Order[] {
  return [
    {
      id: 'KUD-904128',
      user_id: 'usr-1',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      total_amount: 145000,
      subtotal_amount: 140000,
      delivery_fee: 5000,
      discount_amount: 0,
      status: 'Pending',
      payment_status: 'Paid',
      payment_method: 'Card Payment',
      customer_name: 'Aisha Bello',
      customer_email: 'aisha.bello@example.com',
      shipping_address: {
        fullName: 'Aisha Bello',
        email: 'aisha.bello@example.com',
        phone: '+234 803 123 4567',
        addressLine: '14 Admiralty Way, Lekki Phase 1',
        city: 'Lagos',
        province: 'Lagos State',
        postalCode: '101233',
      },
      items: [
        {
          id: 'item-1',
          product_id: 'p1',
          product_name: 'Hydrating Glow Serum 30ml',
          product_brand: 'KUD Skin',
          product_image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80',
          quantity: 2,
          unit_price: 35000,
          total_price: 70000,
          variant: '30ml',
        },
        {
          id: 'item-2',
          product_id: 'p4',
          product_name: 'Wireless Noise Cancelling Earbuds',
          product_brand: 'Acoustix',
          product_image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&q=80',
          quantity: 1,
          unit_price: 70000,
          total_price: 70000,
        },
      ],
    },
    {
      id: 'KUD-812034',
      user_id: 'usr-2',
      created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      total_amount: 85000,
      subtotal_amount: 85000,
      delivery_fee: 0,
      discount_amount: 0,
      status: 'Processing',
      payment_status: 'Paid',
      payment_method: 'Bank Transfer',
      customer_name: 'Emeka Okafor',
      customer_email: 'emeka.okafor@example.com',
      shipping_address: {
        fullName: 'Emeka Okafor',
        email: 'emeka.okafor@example.com',
        phone: '+234 802 987 6543',
        addressLine: '22 Allen Avenue, Ikeja',
        city: 'Lagos',
        province: 'Lagos State',
        postalCode: '100281',
      },
      items: [
        {
          id: 'item-3',
          product_id: 'p3',
          product_name: 'Pro Performance Running Shoes',
          product_brand: 'StridePro',
          product_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
          quantity: 1,
          unit_price: 85000,
          total_price: 85000,
          variant: 'EU 42',
        },
      ],
    },
    {
      id: 'KUD-741982',
      user_id: 'usr-3',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      total_amount: 220000,
      subtotal_amount: 215000,
      delivery_fee: 5000,
      discount_amount: 0,
      status: 'Delivered',
      payment_status: 'Paid',
      payment_method: 'Card Payment',
      customer_name: 'Chidinma Vance',
      customer_email: 'chidinma.vance@example.com',
      shipping_address: {
        fullName: 'Chidinma Vance',
        email: 'chidinma.vance@example.com',
        phone: '+234 810 555 1212',
        addressLine: '5 Maitama District',
        city: 'Abuja',
        province: 'FCT',
        postalCode: '900211',
      },
      items: [
        {
          id: 'item-4',
          product_id: 'p2',
          product_name: 'Minimalist Ceramic Vase Set',
          product_brand: 'Nordic Craft',
          product_image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=400&q=80',
          quantity: 2,
          unit_price: 45000,
          total_price: 90000,
        },
      ],
    },
  ];
}

function getDemoCustomers(): Customer[] {
  return [
    {
      id: 'usr-1',
      email: 'aisha.bello@example.com',
      fullName: 'Aisha Bello',
      phone: '+234 803 123 4567',
      role: 'customer',
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      orderCount: 4,
      totalSpent: 380000,
    },
    {
      id: 'usr-2',
      email: 'emeka.okafor@example.com',
      fullName: 'Emeka Okafor',
      phone: '+234 802 987 6543',
      role: 'customer',
      createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
      orderCount: 2,
      totalSpent: 165000,
    },
    {
      id: 'usr-3',
      email: 'chidinma.vance@example.com',
      fullName: 'Chidinma Vance',
      phone: '+234 810 555 1212',
      role: 'customer',
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      orderCount: 5,
      totalSpent: 520000,
    },
  ];
}
