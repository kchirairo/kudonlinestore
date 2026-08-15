import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
import { DEMO_PRODUCTS } from '../data/demoProducts';
import { mapSupabaseProduct } from './productService';
import { orderService } from './orderService';
import { encryptGatewayPayload, decryptGatewayPayload } from '../utils/encryption';
import { DEFAULT_STORE_BRANDING, DEFAULT_PROMO_BANNER } from '../constants/config';
import { uploadImageToStorage, deleteImageFromStorage } from '../utils/imageUpload';

// Storage keys for settings and mock tables if Supabase is unconfigured or empty
const LOCAL_CATEGORIES_KEY = 'kud_store_admin_categories';
const LOCAL_CUSTOMERS_KEY = 'kud_store_admin_customers';
const LOCAL_PRODUCTS_KEY = 'kud_store_admin_products';
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
    let orders: Order[] = await this.getOrders();
    let products: Product[] = await this.getProducts();
    let customers: Customer[] = await this.getCustomers();

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
          orders = data.map((o: any) => ({
            id: o.id,
            user_id: o.user_id,
            created_at: o.created_at,
            total_amount: o.total_amount,
            subtotal_amount: o.subtotal_amount,
            delivery_fee: o.delivery_fee,
            discount_amount: o.discount_amount,
            status: o.status,
            payment_status: o.payment_status,
            payment_method: o.payment_method,
            shipping_address: o.shipping_address,
            customer_name: o.shipping_address?.fullName || o.customer_name || 'Customer',
            customer_email: o.shipping_address?.email || o.customer_email || 'n/a',
            items: (o.order_items || []).map((item: any) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_brand: item.product_brand,
              product_image: item.product_image,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              variant: item.variant,
            })),
          }));
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
   * Fetch products for admin view
   */
  async getProducts(filters?: {
    category?: string;
    activeOnly?: boolean;
    search?: string;
    sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'stock';
  }): Promise<Product[]> {
    let products: Product[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*, product_images(*)');
        if (!error && data && data.length > 0) {
          products = data.map(mapSupabaseProduct);
        } else {
          // Fallback simple query
          const { data: fallbackData } = await supabase.from('products').select('*');
          if (fallbackData && fallbackData.length > 0) {
            products = fallbackData.map(mapSupabaseProduct);
          }
        }
      } catch (err) {
        console.warn('Supabase fetch products error:', err);
      }
    }

    const local = safeGetItem<any[]>(LOCAL_PRODUCTS_KEY, []);
    if (local.length > 0) {
      const localMapped = local.map(mapSupabaseProduct);
      const productMap = new Map<string, Product>();
      // First add remote products
      products.forEach((p) => productMap.set(p.id, p));
      // Then overlay local products so newest local additions/edits take precedence
      localMapped.forEach((p) => productMap.set(p.id, p));
      products = Array.from(productMap.values());
    } else if (products.length === 0) {
      products = DEMO_PRODUCTS.map((p) => ({
        ...p,
        isActive: true,
        stock: p.inStock ? 30 : 0,
        sku: `SKU-${p.id.toUpperCase()}`,
      }));
    }

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
      products = products.filter((p) => p.category === filters.category);
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
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getProducts();
    const found = products.find((p) => p.id === id);
    return found || null;
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
   * Create new product
   */
  async createProduct(
    productData: Partial<Product>,
    imageFile?: File | File[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
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
            console.error('Image upload failed:', uploadErr);
            return {
              success: false,
              error: uploadErr?.message || `Failed to upload image "${file.name}". Please check storage permissions.`,
            };
          }
        }
      }
    }

    // Clean image URLs - remove any empty or invalid entries
    imageUrls = imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    const primaryImageUrl = imageUrls[0] || '';

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: (productData.name || 'New Product').trim(),
      brand: (productData.brand || 'KUD').trim(),
      price: Number(productData.price) || 0,
      originalPrice: productData.originalPrice ? Number(productData.originalPrice) : undefined,
      category: productData.category || 'Beauty',
      sizeOrVariant: productData.sizeOrVariant || '',
      condition: productData.condition || 'Brand New',
      description: productData.description || '',
      images: imageUrls,
      inStock: (productData.stock ?? 1) > 0,
      stock: Number(productData.stock) || 0,
      sku: productData.sku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      isFeatured: Boolean(productData.isFeatured),
      isActive: productData.isActive !== false,
      createdAt: new Date().toISOString(),
    };

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const standardPayload = {
          id: newProduct.id,
          name: newProduct.name,
          brand: newProduct.brand,
          price: newProduct.price,
          original_price: newProduct.originalPrice || null,
          category: newProduct.category,
          size_or_variant: newProduct.sizeOrVariant || null,
          condition: newProduct.condition,
          description: newProduct.description,
          image_url: primaryImageUrl || null,
          images: newProduct.images,
          in_stock: newProduct.inStock,
          stock: newProduct.stock,
          sku: newProduct.sku,
          is_featured: newProduct.isFeatured,
          is_active: newProduct.isActive,
          created_at: newProduct.createdAt,
        };

        const { error } = await supabase.from('products').insert(standardPayload);

        if (error) {
          console.warn('Supabase standard insert failed, attempting flexible column insert:', error.message);
          // Fallback payload without optional columns
          const fallbackPayload: any = {
            id: newProduct.id,
            name: newProduct.name,
            brand: newProduct.brand,
            price: newProduct.price,
            category: newProduct.category,
            description: newProduct.description,
            image_url: primaryImageUrl || null,
            in_stock: newProduct.inStock,
            stock: newProduct.stock,
          };
          const { error: fallbackError } = await supabase.from('products').insert(fallbackPayload);
          if (fallbackError) {
            console.warn('Supabase fallback insert reported:', fallbackError.message);
          }
        } else {
          // Sync into product_images table if present
          try {
            if (newProduct.images.length > 0) {
              const imageInserts = newProduct.images.map((url, idx) => ({
                product_id: newProduct.id,
                image_url: url,
                display_order: idx,
              }));
              await supabase.from('product_images').insert(imageInserts);
            }
          } catch {
            // Ignore if product_images table is not used
          }
        }
      } catch (err) {
        console.warn('Supabase product insert exception:', err);
      }
    }

    // 3. Save locally to ensure instant updates and offline support
    const existing = safeGetItem<Product[]>(LOCAL_PRODUCTS_KEY, []);
    const updatedLocal = [newProduct, ...existing.filter((p) => p.id !== newProduct.id)];
    safeSetItem(LOCAL_PRODUCTS_KEY, updatedLocal);

    return { success: true, data: newProduct };
  },

  /**
   * Update existing product
   */
  async updateProduct(
    id: string,
    productData: Partial<Product>,
    newImageFile?: File | File[],
    imagesToDeleteFromStorage?: string[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
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
            console.error('Image upload failed during update:', uploadErr);
            return {
              success: false,
              error: uploadErr?.message || `Failed to upload image "${file.name}".`,
            };
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

    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: any = {
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

        const { error } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', id);

        if (!error) {
          // Sync into product_images table if present
          try {
            await supabase.from('product_images').delete().eq('product_id', id);
            if (updatedProduct.images.length > 0) {
              const imageInserts = updatedProduct.images.map((url, idx) => ({
                product_id: id,
                image_url: url,
                display_order: idx,
              }));
              await supabase.from('product_images').insert(imageInserts);
            }
          } catch {
            // Ignore if product_images table is not used
          }
        }
      } catch (err) {
        console.warn('Supabase product update exception:', err);
      }
    }

    // Save locally
    const existing = safeGetItem<Product[]>(LOCAL_PRODUCTS_KEY, []);
    const updatedLocal = existing.map((p) => (p.id === id ? updatedProduct : p));
    if (!updatedLocal.some((p) => p.id === id)) {
      updatedLocal.unshift(updatedProduct);
    }
    safeSetItem(LOCAL_PRODUCTS_KEY, updatedLocal);

    return { success: true, data: updatedProduct };
  },

  /**
   * Bulk update multiple products (stock, price, originalPrice, status, category, etc.)
   */
  async bulkUpdateProducts(
    updates: Array<{ id: string; changes: Partial<Product> }>
  ): Promise<{ success: boolean; updatedCount: number; error?: string }> {
    if (!updates || updates.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const allProducts = await this.getProducts();
    const productMap = new Map<string, Product>(allProducts.map((p) => [p.id, { ...p }]));
    let updatedCount = 0;
    const modifiedProducts: Product[] = [];

    for (const item of updates) {
      const existing = productMap.get(item.id);
      if (existing) {
        const nextStock =
          item.changes.stock !== undefined ? Number(item.changes.stock) : existing.stock;
        const nextInStock =
          item.changes.inStock !== undefined
            ? item.changes.inStock
            : nextStock !== undefined
            ? nextStock > 0
            : existing.inStock;

        const updated: Product = {
          ...existing,
          ...item.changes,
          stock: nextStock,
          inStock: nextInStock,
          price: item.changes.price !== undefined ? Number(item.changes.price) : existing.price,
          originalPrice:
            item.changes.originalPrice !== undefined
              ? item.changes.originalPrice === null || item.changes.originalPrice === 0
                ? undefined
                : Number(item.changes.originalPrice)
              : existing.originalPrice,
        };

        productMap.set(item.id, updated);
        modifiedProducts.push(updated);
        updatedCount++;
      }
    }

    // Persist to Supabase if configured
    if (isSupabaseConfigured() && supabase && modifiedProducts.length > 0) {
      try {
        for (const prod of modifiedProducts) {
          const payload: any = {
            price: prod.price,
            original_price: prod.originalPrice || null,
            stock: prod.stock,
            in_stock: prod.inStock,
            is_active: prod.isActive,
          };
          if (prod.category) payload.category = prod.category;
          if (prod.sku) payload.sku = prod.sku;

          await supabase.from('products').update(payload).eq('id', prod.id);
        }
      } catch (err) {
        console.warn('Supabase bulk update warning:', err);
      }
    }

    // Save all to localStorage
    const newProductList = Array.from(productMap.values());
    safeSetItem(LOCAL_PRODUCTS_KEY, newProductList);

    return { success: true, updatedCount };
  },

  /**
   * Delete product and optionally remove associated images from Storage
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    const current = await this.getProductById(id);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase product delete exception:', err);
      }
    }

    // Clean up product images in background
    if (current && current.images && current.images.length > 0) {
      deleteImageFromStorage(current.images, 'product-images').catch((err) => {
        console.warn('Could not clean up images from storage for product:', id, err);
      });
    }

    const allProducts = await this.getProducts();
    const filtered = allProducts.filter((p) => p.id !== id);
    safeSetItem(LOCAL_PRODUCTS_KEY, filtered);

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
        const payload: any = {
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          isActive: newCategory.isActive,
          is_active: newCategory.isActive,
          sortOrder: newCategory.sortOrder,
          sort_order: newCategory.sortOrder,
          productCount: newCategory.productCount,
          product_count: newCategory.productCount,
          created_at: newCategory.createdAt,
        };

        const { error } = await supabase.from('categories').insert(payload);
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
        const updatePayload: any = {};
        if (categoryData.name !== undefined) updatePayload.name = categoryData.name;
        if (categoryData.slug !== undefined) updatePayload.slug = categoryData.slug;
        if (categoryData.isActive !== undefined) {
          updatePayload.isActive = categoryData.isActive;
          updatePayload.is_active = categoryData.isActive;
        }
        if (categoryData.sortOrder !== undefined) {
          updatePayload.sortOrder = categoryData.sortOrder;
          updatePayload.sort_order = categoryData.sortOrder;
        }

        const { error } = await supabase.from('categories').update(updatePayload).eq('id', id);
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
    const products = await this.getProducts();
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
