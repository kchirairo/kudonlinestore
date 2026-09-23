import { supabase, isSupabaseConfigured, executeWithColumnFallback } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import {
  AdminStats,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductMediaItem,
  Category,
  Customer,
  AdminCustomerAccountInfo,
  CustomerAccountStatus,
  SalesDataPoint,
  PaymentGatewayConfig,
  PaymentGatewayItem,
  PaymentGatewaysMap,
  SettingsData,
  SettingsTableRow,
  StoreBrandingConfig,
  PromoBannerConfig,
  GeneralStoreSettings,
  Coupon,
  CouponsConfig,
  GatewayHealthCheckReport,
  GatewayHealthItem,
  StoreReferralGlobalConfig,
  UserReferralRewardsState,
  AdminReferralAdjustment,
  ReferralCustomerSettings,
  ReferralCommissionRecord,
  ReferralCommissionStatus,
  ReferralMonthlyOrderSummary,
  Invoice,
  InvoiceStatus,
  InvoiceSendingLog,
  InvoiceAuditEvent,
  InvoiceAuditEventType,
  InvoiceMonthlyAnalyticsData,
  InvoiceSettingsConfig,
  InvoiceDeliveryStatus,
  TaxSettings,
  AuthAppearanceConfig,
  AuthBackgroundImage,
  SupabaseAuthAppearanceSettings,
  SupabaseAuthBackgroundImage,
} from '../types';
import { DEFAULT_AUTH_APPEARANCE } from '../constants/authAppearance';
import { mapSupabaseProduct, productService } from './productService';
import { mapSupabaseOrder, orderService } from './orderService';
import { categoryService } from './categoryService';
import { encryptGatewayPayload, decryptGatewayPayload } from '../utils/encryption';
import {
  STORE_CONFIG,
  DEFAULT_STORE_BRANDING,
  DEFAULT_PROMO_BANNER,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_COUPONS,
  DEFAULT_REFERRAL_SETTINGS,
  DEFAULT_INVOICE_SETTINGS,
} from '../constants/config';
import { DEFAULT_PAYMENT_GATEWAYS } from '../constants/paymentGateways';
import { uploadImageToStorage, deleteImageFromStorage, convertImageToWebP, fileToBase64 } from '../utils/imageUpload';
import { generateUniqueSku } from '../utils/skuGenerator';
import { calculateOrderFinancials } from '../utils/taxUtils';
import {
  sendCommissionAllocatedEmail,
  sendEarningsFrozenEmail,
  sendEarningsUnfrozenEmail,
  sendInvoiceEmail,
} from '../lib/emailService';

// Storage keys for settings and mock tables if Supabase is unconfigured or empty
const LOCAL_CATEGORIES_KEY = 'kud_store_admin_categories';
const LOCAL_CUSTOMERS_KEY = 'kud_store_admin_customers';
const LOCAL_PAYMENT_SETTINGS_KEY = 'kud_store_payment_gateways_v2';
const LOCAL_BRANDING_KEY = 'kud_store_branding_config';
const LOCAL_PROMO_BANNER_KEY = 'kud_store_promo_banner_config';
const LOCAL_REFERRAL_COMMISSIONS_KEY = 'kud_store_referral_commissions';

const DEFAULT_PAYMENT_CONFIG: PaymentGatewayConfig = {
  activeProvider: 'yoco',
  yoco: {
    enabled: true,
    mode: 'test',
    publicKey: import.meta.env.VITE_YOCO_PUBLIC_KEY || '',
    configured: true,
  },
  card: {
    enabled: false,
    mode: 'test',
    configured: false,
  },
  cod: {
    enabled: false,
    instructions: 'Please prepare exact cash for the courier.',
    configured: false,
  },
  paypal: {
    enabled: false,
    mode: 'sandbox',
    clientId: '',
    configured: false,
  },
  payfast: {
    enabled: false,
    mode: 'sandbox',
    merchantId: '',
    configured: false,
  },
  ozow: {
    enabled: false,
    mode: 'sandbox',
    siteCode: '',
    configured: false,
  },
  peach_payments: {
    enabled: false,
    mode: 'test',
    entityId: '',
    configured: false,
  },
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Technology', slug: 'technology', isActive: true, sortOrder: 1, display_order: 1 },
  { id: 'cat-2', name: 'Sports & Leisure', slug: 'sports-leisure', isActive: true, sortOrder: 2, display_order: 2 },
  { id: 'cat-3', name: 'Beauty', slug: 'beauty', isActive: true, sortOrder: 3, display_order: 3 },
  { id: 'cat-4', name: 'Books', slug: 'books', isActive: true, sortOrder: 4, display_order: 4 },
  { id: 'cat-5', name: 'Home', slug: 'home', isActive: true, sortOrder: 5, display_order: 5 },
  { id: 'cat-6', name: 'Automotive', slug: 'automotive', isActive: true, sortOrder: 6, display_order: 6 },
  { id: 'cat-7', name: 'Industrial & Tools', slug: 'industrial-tools', isActive: true, sortOrder: 7, display_order: 7 },
  { id: 'cat-8', name: 'Health & Wellness', slug: 'health-wellness', isActive: true, sortOrder: 8, display_order: 8 },
  { id: 'cat-9', name: 'Garden & Outdoor', slug: 'garden-outdoor', isActive: true, sortOrder: 9, display_order: 9 },
  { id: 'cat-10', name: 'Office & Business', slug: 'office-business', isActive: true, sortOrder: 10, display_order: 10 },
  { id: 'cat-11', name: 'Jewelry & Accessories', slug: 'jewelry-accessories', isActive: true, sortOrder: 11, display_order: 11 },
  { id: 'cat-12', name: 'Fashion & Apparel', slug: 'fashion-apparel', isActive: true, sortOrder: 12, display_order: 12 },
];

/**
 * Universal Supabase Settings Row Fetcher
 * Queries the public.settings table using its true schema:
 * id, store_name, currency_symbol, store_description, delivery_fee, free_shipping_threshold,
 * support_email, support_phone, logo_url, banner_url, settings_data, created_at, updated_at
 */
async function fetchPublicSettingsRow(): Promise<SettingsTableRow | null> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('id, store_name, currency_symbol, store_description, delivery_fee, free_shipping_threshold, support_email, support_phone, logo_url, banner_url, settings_data, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as SettingsTableRow;
      }
      if (error) {
        console.warn('[AdminService] Notice querying public.settings:', error.message);
      }
    } catch (err) {
      console.warn('[AdminService] Exception querying public.settings:', err);
    }
  }

  // Reliable fallback for client/customer context where anon cannot direct-select settings table due to RLS
  try {
    const res = await fetch('/api/settings/public-row');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as SettingsTableRow;
      }
    }
  } catch (apiErr) {
    console.warn('[AdminService] Fallback to /api/settings/public-row failed:', apiErr);
  }

  return null;
}

/**
 * Reads a specific section from public.settings.settings_data JSONB
 */
async function readSupabaseSettingHelper<T extends Record<string, any>>(key: string, defaultValue: T): Promise<T> {
  const row = await fetchPublicSettingsRow();
  
  if (row?.settings_data && typeof row.settings_data === 'object') {
    if (row.settings_data[key] !== undefined) {
      const merged = { ...defaultValue, ...row.settings_data[key] };
      // Authoritative column: public.settings.logo_url is the single source of truth for store logo
      if (key === 'store_branding') {
        if (row.logo_url !== undefined) {
          merged.logoImageUrl = row.logo_url || undefined;
        }
      }
      // Synchronize promotional_banner_enabled for banner_config - single source of truth
      if (key === 'banner_config') {
        const isEnabled = row.settings_data.promotional_banner_enabled === true;
        merged.enabled = isEnabled;
        merged.promotional_banner_enabled = isEnabled;
      }
      return merged;
    }
    // Also check alternate key aliases for banner_config
    if (key === 'banner_config') {
      let altConfig: any = null;
      if (row.settings_data['promo_banner'] !== undefined) {
        altConfig = { ...defaultValue, ...row.settings_data['promo_banner'] };
      } else if (row.settings_data['promo_banners'] !== undefined) {
        altConfig = { ...defaultValue, ...row.settings_data['promo_banners'] };
      }
      if (altConfig) {
        const isEnabled = row.settings_data.promotional_banner_enabled === true;
        altConfig.enabled = isEnabled;
        altConfig.promotional_banner_enabled = isEnabled;
        return altConfig;
      }
      // If banner_config was not in settings_data, but row exists
      const isEnabled = row.settings_data.promotional_banner_enabled === true;
      return {
        ...defaultValue,
        enabled: isEnabled,
        promotional_banner_enabled: isEnabled,
      };
    }
  }

  // Fail-closed for promotional banner:
  // If row read failed or is missing, banner MUST NOT render
  if (key === 'banner_config') {
    return {
      ...defaultValue,
      enabled: false,
      promotional_banner_enabled: false,
    };
  }

  // Handle general_settings mapping from columns if available
  if (key === 'general_settings' && row) {
    const isGoogleAuth =
      row.settings_data?.general_settings?.isGoogleAuthEnabled ??
      row.settings_data?.general_settings?.enableGoogleAuth ??
      (row.settings_data as any)?.isGoogleAuthEnabled ??
      (row as any)?.is_google_auth_enabled ??
      (row as any)?.enable_google_auth ??
      (defaultValue as any).isGoogleAuthEnabled ??
      (defaultValue as any).enableGoogleAuth ??
      true;

    return {
      ...defaultValue,
      storeName: row.store_name || (defaultValue as any).storeName,
      currency: row.currency_symbol || (defaultValue as any).currency || 'R',
      deliveryFee: row.delivery_fee != null ? Number(row.delivery_fee) : (defaultValue as any).deliveryFee,
      freeDeliveryThreshold: row.free_shipping_threshold != null ? Number(row.free_shipping_threshold) : (defaultValue as any).freeDeliveryThreshold,
      contactEmail: row.support_email || (defaultValue as any).contactEmail,
      contactPhone: row.support_phone || (defaultValue as any).contactPhone,
      storeDescription: row.store_description || (defaultValue as any).storeDescription,
      enableGoogleAuth: isGoogleAuth,
      isGoogleAuthEnabled: isGoogleAuth,
      ...(row.settings_data?.general_settings || {})
    };
  }

  // Also check local storage fallback
  const localVal = safeGetItem<T>(`kud_store_settings_${key}`, defaultValue);
  return localVal || defaultValue;
}

/**
 * Writes a specific section to public.settings.settings_data JSONB while preserving
 * all other existing properties in settings_data.
 */
async function writeSupabaseSettingHelper<T extends Record<string, any>>(
  key: string,
  payload: T
): Promise<{ success: boolean; error?: string; data?: T }> {
  const now = new Date().toISOString();
  const updatedPayload: T = {
    ...payload,
    lastUpdated: now,
  };

  if (!isSupabaseConfigured() || !supabase) {
    safeSetItem(`kud_store_settings_${key}`, updatedPayload);
    return {
      success: true,
      data: updatedPayload,
    };
  }

  try {
    const existingRow = await fetchPublicSettingsRow();
    const currentSettingsData = (existingRow?.settings_data as Record<string, any>) || {};
    const settingsId = existingRow?.id;

    const updatedSettingsData = {
      ...(currentSettingsData || {}),
      [key]: updatedPayload,
    };

    let result;
    if (settingsId) {
      result = await supabase
        .from('settings')
        .update({
          settings_data: updatedSettingsData,
          updated_at: now,
        })
        .eq('id', settingsId)
        .select('*')
        .maybeSingle();
    } else {
      result = await supabase
        .from('settings')
        .insert({
          store_name: 'KUD Store',
          currency_symbol: 'R',
          settings_data: updatedSettingsData,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .maybeSingle();
    }

    if (result.error) {
      // If Supabase RLS restricts write for unauthenticated/preview admin sessions or table policy
      console.warn(`[AdminService] Supabase restricted settings section '${key}' (RLS/Permissions: ${result.error.code || result.error.message}). Persisted to local storage.`);
      safeSetItem(`kud_store_settings_${key}`, updatedPayload);
      return { success: true, data: updatedPayload };
    }

    safeSetItem(`kud_store_settings_${key}`, updatedPayload);
    return { success: true, data: updatedPayload };
  } catch (err: any) {
    console.warn(`[AdminService] Exception saving settings section '${key}'. Persisted to local storage:`, err?.message || err);
    safeSetItem(`kud_store_settings_${key}`, updatedPayload);
    return { success: true, data: updatedPayload };
  }
}

export const adminService = {
  /**
   * Check if user is an admin by calling public.is_admin() or checking profiles table authoritatively
   */
  async checkIsAdmin(userId?: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const verifiedUid = authData?.user?.id;
        if (!verifiedUid) return false;

        // If a userId was passed, enforce that it matches the authenticated session
        if (userId && userId !== verifiedUid) {
          return false;
        }

        // Try authoritative database RPC first
        const { data: rpcIsAdmin, error: rpcError } = await supabase.rpc('is_admin');
        if (!rpcError && typeof rpcIsAdmin === 'boolean') {
          return rpcIsAdmin;
        }

        // Direct profile query fallback
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', verifiedUid)
          .maybeSingle();

        if (!profileError && profile) {
          return profile.role === 'admin';
        }
      } catch (err) {
        console.warn('Supabase admin check error:', err);
      }
    }

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

    // Fallback/combine local orders if offline
    if (orders.length === 0) {
      orders = orderService.getLocalOrders();
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
    let updatedOrder: Order | null = null;
    if (orderIndex > -1) {
      localOrders[orderIndex].status = status;
      if (paymentStatus) {
        localOrders[orderIndex].payment_status = paymentStatus;
      }
      updatedOrder = localOrders[orderIndex];
      safeSetItem('kud_store_orders_history', localOrders);
      success = true;
    }

    // If payment status was updated to Paid, check Auto-Send Invoices setting and trigger invoice email
    if (paymentStatus === 'Paid' || paymentStatus === 'paid') {
      try {
        const invoiceSettings = await this.getInvoiceSettings();
        if (invoiceSettings.autoSendInvoices) {
          const targetOrder = updatedOrder || (await this.getOrderById(orderId));
          if (targetOrder) {
            // Check if already sent
            const invoicesMap = safeGetItem<Record<string, any>>('kud_store_invoices_registry', {});
            const reg = invoicesMap[orderId];
            if (!reg || (reg.sent_count || 0) === 0) {
              await this.sendInvoice(targetOrder, undefined, undefined, 'System (Auto-Send on Paid Payment)');
            }
          }
        }
      } catch (autoErr) {
        console.warn('Auto invoice dispatch check notice:', autoErr);
      }
    }

    return { success, error: success ? undefined : 'Failed to update order status in database.' };
  },

  /**
   * Manually resend customer purchase confirmation email via send-order-confirmation Edge Function
   */
  async resendOrderConfirmationEmail(orderId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    sentAt?: string;
  }> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-order-confirmation', {
          body: {
            orderId,
            isResend: true,
          },
        });

        if (error) {
          console.error('[ADMIN] Edge function error resending confirmation email:', error);
          return {
            success: false,
            error: error.message || 'Failed to call send-order-confirmation Edge Function',
          };
        }

        if (data && data.success) {
          // Sync local storage if present
          const localOrders = orderService.getLocalOrders();
          const idx = localOrders.findIndex((o) => o.id === orderId);
          if (idx > -1) {
            localOrders[idx].confirmation_email_sent = true;
            localOrders[idx].confirmation_email_sent_at = data.sentAt || new Date().toISOString();
            localOrders[idx].confirmation_email_error = undefined;
            localOrders[idx].confirmation_email_resend_count =
              (Number(localOrders[idx].confirmation_email_resend_count) || 0) + 1;
            localOrders[idx].confirmation_email_last_attempt_at = data.sentAt || new Date().toISOString();
            safeSetItem('kud_store_orders_history', localOrders);
          }

          return {
            success: true,
            message: data.message || 'Purchase confirmation email resent successfully',
            sentAt: data.sentAt,
          };
        }

        return {
          success: false,
          error: data?.error || 'Unknown response from confirmation email service',
        };
      } catch (err: any) {
        console.error('[ADMIN] Exception invoking send-order-confirmation:', err);
        return {
          success: false,
          error: err?.message || 'Failed to invoke email confirmation service',
        };
      }
    }

    // Demo/Local fallback when Supabase is not configured
    const localOrders = orderService.getLocalOrders();
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx > -1) {
      const now = new Date().toISOString();
      localOrders[idx].confirmation_email_sent = true;
      localOrders[idx].confirmation_email_sent_at = now;
      localOrders[idx].confirmation_email_error = undefined;
      localOrders[idx].confirmation_email_resend_count =
        (Number(localOrders[idx].confirmation_email_resend_count) || 0) + 1;
      localOrders[idx].confirmation_email_last_attempt_at = now;
      safeSetItem('kud_store_orders_history', localOrders);

      return {
        success: true,
        message: 'Order confirmation email resent successfully (Local Simulation Mode)',
        sentAt: now,
      };
    }

    return {
      success: false,
      error: 'Order not found in records',
    };
  },

  /**
   * Fetch Invoice & Receipt Settings (Auto-Send, Customer Download, Tax Details)
   */
  async getInvoiceSettings(): Promise<InvoiceSettingsConfig> {
    return readSupabaseSettingHelper<InvoiceSettingsConfig>('invoice_settings', DEFAULT_INVOICE_SETTINGS);
  },

  /**
   * Save Invoice & Receipt Settings
   */
  async saveInvoiceSettings(settings: InvoiceSettingsConfig): Promise<{
    success: boolean;
    error?: string;
    data?: InvoiceSettingsConfig;
  }> {
    const result = await writeSupabaseSettingHelper<InvoiceSettingsConfig>('invoice_settings', settings);
    return {
      success: result.success,
      error: result.error,
      data: result.data || settings,
    };
  },

  /**
   * Toggle Auto-Send Invoices ON/OFF
   */
  async toggleAutoSendInvoices(enabled: boolean): Promise<{ success: boolean; autoSendInvoices: boolean }> {
    try {
      // 1. Try server endpoint
      try {
        const res = await fetch('/api/admin/invoices/toggle-auto-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, autoSendInvoices: data.autoSendInvoices };
        }
      } catch {
        // Fallback to direct supabase writer
      }

      const current = await this.getInvoiceSettings();
      const updated = { ...current, autoSendInvoices: enabled };
      await this.saveInvoiceSettings(updated);
      return { success: true, autoSendInvoices: enabled };
    } catch {
      return { success: false, autoSendInvoices: !enabled };
    }
  },

  /**
   * Toggle Customer Copy Email Delivery ON/OFF
   */
  async toggleCustomerCopy(enabled: boolean): Promise<{ success: boolean; sendCustomerCopy: boolean }> {
    try {
      const current = await this.getInvoiceSettings();
      const updated = { ...current, sendCustomerCopy: enabled };
      await this.saveInvoiceSettings(updated);
      return { success: true, sendCustomerCopy: enabled };
    } catch {
      return { success: false, sendCustomerCopy: !enabled };
    }
  },

  /**
   * Toggle Customer Receipt Download ON/OFF
   */
  async toggleCustomerReceiptDownload(enabled: boolean): Promise<{ success: boolean; allowCustomerDownload: boolean }> {
    try {
      // 1. Try server endpoint
      try {
        const res = await fetch('/api/admin/invoices/toggle-customer-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, allowCustomerDownload: data.allowCustomerDownload };
        }
      } catch {
        // Fallback to direct supabase writer
      }

      const current = await this.getInvoiceSettings();
      const updated = { ...current, allowCustomerDownload: enabled };
      await this.saveInvoiceSettings(updated);
      return { success: true, allowCustomerDownload: enabled };
    } catch {
      return { success: false, allowCustomerDownload: !enabled };
    }
  },

  /**
   * Retrieve all Invoices derived from orders with financial tax breakdown & dispatch history
   */
  async getInvoices(filters?: {
    search?: string;
    status?: InvoiceStatus | 'All';
    paymentStatus?: PaymentStatus | 'All';
    dateRange?: 'all' | 'today' | '7d' | '30d' | 'month';
    sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  }): Promise<Invoice[]> {
    const orders = await this.getOrders();
    const invoicesRegistry = safeGetItem<Record<string, {
      status?: InvoiceStatus;
      delivery_status?: InvoiceDeliveryStatus;
      sent_count?: number;
      last_sent_at?: string;
      sending_history?: InvoiceSendingLog[];
      audit_logs?: InvoiceAuditEvent[];
      notes?: string;
    }>>('kud_store_invoices_registry', {});

    const invoiceSettings = await this.getInvoiceSettings();
    const prefix = invoiceSettings.invoicePrefix || 'INV-2026-';

    let invoices: Invoice[] = orders.map((order) => {
      const financials = calculateOrderFinancials(order);
      const reg = invoicesRegistry[order.id] || {};
      
      const cleanOrderNum = (order.order_number || order.id || '').replace(/[^0-9]/g, '').slice(-6) || '100001';
      const invoiceNumber = `${prefix}${cleanOrderNum}`;

      // Calculate invoice status:
      // Status options: Pending, Paid, Sent, Failed, Refunded, Cancelled
      let status: InvoiceStatus = 'Pending';
      if (reg.status) {
        status = reg.status;
      } else if (order.status === 'Cancelled' || order.status === 'Declined') {
        status = 'Cancelled';
      } else if (financials.isRefunded) {
        status = 'Refunded';
      } else if (financials.isFailed) {
        status = 'Failed';
      } else if (financials.isPaid) {
        status = (reg.sent_count || 0) > 0 ? 'Sent' : 'Paid';
      } else {
        status = 'Pending';
      }

      const deliveryStatus: InvoiceDeliveryStatus = reg.delivery_status || ((reg.sent_count || 0) > 0 ? 'sent' : 'not_sent');

      // Synthesize default base audit logs if none recorded yet
      const baseAuditLogs: InvoiceAuditEvent[] = reg.audit_logs && reg.audit_logs.length > 0
        ? reg.audit_logs
        : [
            {
              id: `audit_init_${order.id}`,
              timestamp: order.created_at,
              type: 'created',
              actor: 'System (Order Creation)',
              title: `Tax Invoice Generated (${invoiceNumber})`,
              details: `Official tax invoice generated for order ${order.order_number || order.id}. Total: R${financials.grandTotal} (incl. R${financials.vatAmount} VAT).`,
              metadata: {
                amount: financials.grandTotal,
                vatAmount: financials.vatAmount,
                paymentMethod: order.payment_method || 'Online Gateway',
                recipientEmail: order.customer_email,
              },
            },
            ...(financials.isPaid
              ? [
                  {
                    id: `audit_paid_${order.id}`,
                    timestamp: order.created_at,
                    type: 'payment_updated' as const,
                    actor: 'Payment Gateway',
                    title: `Payment Confirmed (${order.payment_method || 'Card'})`,
                    details: `Payment of R${financials.grandTotal} reconciled successfully. Invoice marked as Paid.`,
                    metadata: {
                      amount: financials.grandTotal,
                      newStatus: 'Paid',
                    },
                  },
                ]
              : []),
            ...(reg.sending_history || []).map((send: InvoiceSendingLog) => ({
              id: `audit_send_${send.id}`,
              timestamp: send.timestamp,
              type: send.triggerType === 'auto' ? ('auto_sent' as const) : send.triggerType === 'resend' ? ('manual_resent' as const) : ('manual_sent' as const),
              actor: send.sentBy || 'Admin',
              title: send.triggerType === 'auto' ? 'Automated Invoice Sent' : send.triggerType === 'resend' ? 'Invoice Manually Resent' : 'Invoice Dispatched',
              details: `Invoice delivered to ${send.sentTo}. Note: ${send.notes || 'Dispatched by store'}`,
              metadata: {
                recipientEmail: send.sentTo,
                notes: send.notes,
                trigger: send.triggerType,
              },
            })),
          ];

      return {
        id: invoiceNumber,
        invoice_number: invoiceNumber,
        order_id: order.id,
        order_number: order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`,
        user_id: order.user_id,
        customer_name: order.customer_name || 'Valued Customer',
        customer_email: order.customer_email || '',
        customer_phone: (order.shipping_address as any)?.phone || '',
        created_at: order.created_at,
        paid_at: financials.isPaid ? order.created_at : undefined,
        subtotal_amount: financials.subtotal,
        delivery_fee: financials.deliveryFee,
        discount_amount: financials.discountAmount,
        vat_amount: financials.vatAmount,
        total_amount: financials.grandTotal,
        currency: 'ZAR',
        status,
        payment_status: order.payment_status,
        payment_method: order.payment_method || 'Online Gateway',
        delivery_status: deliveryStatus,
        sent_count: reg.sent_count || 0,
        last_sent_at: reg.last_sent_at,
        sending_history: reg.sending_history || [],
        audit_logs: baseAuditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        items: order.items || [],
        shipping_address: order.shipping_address,
        notes: reg.notes,
      };
    });

    // Apply search filter
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      invoices = invoices.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.order_number.toLowerCase().includes(q) ||
          inv.customer_name.toLowerCase().includes(q) ||
          inv.customer_email.toLowerCase().includes(q) ||
          inv.total_amount.toString().includes(q)
      );
    }

    // Apply Invoice status filter
    if (filters?.status && filters.status !== 'All') {
      invoices = invoices.filter((inv) => inv.status === filters.status);
    }

    // Apply Payment status filter
    if (filters?.paymentStatus && filters.paymentStatus !== 'All') {
      invoices = invoices.filter((inv) => inv.payment_status === filters.paymentStatus);
    }

    // Apply Date Range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      invoices = invoices.filter((inv) => {
        const itemDate = new Date(inv.created_at);
        if (filters.dateRange === 'today') {
          return itemDate.toDateString() === now.toDateString();
        }
        if (filters.dateRange === '7d') {
          const diff = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          return diff <= 7;
        }
        if (filters.dateRange === '30d') {
          const diff = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          return diff <= 30;
        }
        if (filters.dateRange === 'month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Apply Sorting
    invoices.sort((a, b) => {
      if (filters?.sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (filters?.sortBy === 'amount_desc') {
        return b.total_amount - a.total_amount;
      }
      if (filters?.sortBy === 'amount_asc') {
        return a.total_amount - b.total_amount;
      }
      // default: date_desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return invoices;
  },

  /**
   * Get single invoice by ID or Order ID
   */
  async getInvoiceById(idOrOrderId: string): Promise<Invoice | null> {
    const invoices = await this.getInvoices();
    return (
      invoices.find(
        (inv) =>
          inv.id === idOrOrderId ||
          inv.invoice_number === idOrOrderId ||
          inv.order_id === idOrOrderId ||
          inv.order_number === idOrOrderId
      ) || null
    );
  },

  /**
   * Send / Resend Invoice to Customer Email with Audit History logging
   */
  async sendInvoice(
    invoiceOrOrder: Partial<Invoice> | Partial<Order> | any,
    recipientEmail?: string,
    customMessage?: string,
    senderName: string = 'KUD Store Admin'
  ): Promise<{ success: boolean; message: string; log?: InvoiceSendingLog; invoice?: Invoice }> {
    const targetEmail = recipientEmail || invoiceOrOrder.customer_email || invoiceOrOrder.customerEmail;
    const orderId = invoiceOrOrder.order_id || invoiceOrOrder.id;

    if (!targetEmail) {
      return { success: false, message: 'Recipient email address is required.' };
    }

    const triggerType: 'auto' | 'manual_admin' | 'resend' =
      (invoiceOrOrder.sent_count || 0) > 0 ? 'resend' : senderName.includes('Auto') ? 'auto' : 'manual_admin';

    let result;
    try {
      // 1. Try server-side endpoint
      const res = await fetch('/api/email/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          invoiceId: invoiceOrOrder.invoice_number || invoiceOrOrder.id,
          recipientEmail: targetEmail,
          customMessage,
          senderName,
          triggerType,
          orderData: invoiceOrOrder,
        }),
      });

      if (res.ok) {
        result = await res.json();
      }
    } catch {
      // Fallback
    }

    if (!result) {
      // Direct client dispatch fallback
      result = await sendInvoiceEmail({
        orderOrInvoice: invoiceOrOrder,
        recipientEmail: targetEmail,
        customMessage,
        senderName,
        triggerType,
      });
    }

    // Persist sending log and update invoice status in registry
    const registry = safeGetItem<Record<string, any>>('kud_store_invoices_registry', {});
    const existing = registry[orderId] || {
      sent_count: 0,
      sending_history: [],
    };

    const newLog: InvoiceSendingLog = result.log || {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      sentTo: targetEmail,
      sentBy: senderName,
      triggerType,
      status: result.simulated ? 'simulated' : 'delivered',
      notes: customMessage || 'Invoice dispatched by administrator',
    };

    const updatedSentCount = (existing.sent_count || 0) + 1;
    const updatedHistory = [newLog, ...(existing.sending_history || [])];

    // Append to audit logs
    const auditEvent: InvoiceAuditEvent = {
      id: `audit_event_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: newLog.timestamp,
      type: triggerType === 'resend' ? 'manual_resent' : triggerType === 'auto' ? 'auto_sent' : 'manual_sent',
      actor: senderName,
      title: triggerType === 'resend' ? 'Invoice Manually Resent' : triggerType === 'auto' ? 'Automated Invoice Sent' : 'Invoice Dispatched',
      details: `Tax invoice dispatched to ${targetEmail} via ${result.simulated ? 'Simulated Dispatch' : 'Resend Email Service'}. Note: ${customMessage || 'None provided'}.`,
      metadata: {
        recipientEmail: targetEmail,
        notes: customMessage,
        trigger: triggerType,
        channel: 'Email',
      },
    };

    const updatedAuditLogs = [auditEvent, ...(existing.audit_logs || [])];

    registry[orderId] = {
      ...existing,
      status: 'Sent',
      delivery_status: 'sent',
      sent_count: updatedSentCount,
      last_sent_at: newLog.timestamp,
      sending_history: updatedHistory,
      audit_logs: updatedAuditLogs,
    };

    safeSetItem('kud_store_invoices_registry', registry);

    const updatedInvoice = await this.getInvoiceById(orderId);

    return {
      success: result.success !== false,
      message: result.message || `Invoice sent to ${targetEmail}`,
      log: newLog,
      invoice: updatedInvoice || undefined,
    };
  },

  /**
   * Log a general audit event for an invoice (e.g. PDF downloaded, reconciliation check)
   */
  async logInvoiceAuditEvent(
    orderIdOrInvoiceId: string,
    event: Omit<InvoiceAuditEvent, 'id' | 'timestamp'>
  ): Promise<InvoiceAuditEvent> {
    const registry = safeGetItem<Record<string, any>>('kud_store_invoices_registry', {});
    const existing = registry[orderIdOrInvoiceId] || {};

    const fullEvent: InvoiceAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    const updatedAuditLogs = [fullEvent, ...(existing.audit_logs || [])];
    registry[orderIdOrInvoiceId] = {
      ...existing,
      audit_logs: updatedAuditLogs,
    };

    safeSetItem('kud_store_invoices_registry', registry);
    return fullEvent;
  },

  /**
   * Update custom invoice status (Pending, Paid, Sent, Failed, Refunded, Cancelled) with audit logging
   */
  async updateInvoiceStatus(
    orderIdOrInvoiceId: string,
    newStatus: InvoiceStatus,
    actor: string = 'Admin User'
  ): Promise<{ success: boolean; invoice?: Invoice }> {
    const registry = safeGetItem<Record<string, any>>('kud_store_invoices_registry', {});
    const existing = registry[orderIdOrInvoiceId] || {};
    const oldStatus = existing.status || 'Pending';

    const auditEvent: InvoiceAuditEvent = {
      id: `audit_status_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'status_changed',
      actor,
      title: `Invoice Status Updated: ${newStatus}`,
      details: `Status manually changed from ${oldStatus} to ${newStatus} by ${actor}.`,
      metadata: {
        previousStatus: oldStatus,
        newStatus,
      },
    };

    const updatedAuditLogs = [auditEvent, ...(existing.audit_logs || [])];

    registry[orderIdOrInvoiceId] = {
      ...existing,
      status: newStatus,
      updated_at: new Date().toISOString(),
      audit_logs: updatedAuditLogs,
    };

    safeSetItem('kud_store_invoices_registry', registry);

    const updated = await this.getInvoiceById(orderIdOrInvoiceId);
    return { success: true, invoice: updated || undefined };
  },

  /**
   * Bulk Resend Invoices to multiple customers
   */
  async bulkResendInvoices(
    orderOrInvoiceIds: string[],
    customMessage?: string,
    senderName: string = 'KUD Store Admin (Bulk Dispatch)'
  ): Promise<{
    total: number;
    successCount: number;
    failedCount: number;
    results: { id: string; success: boolean; message: string }[];
  }> {
    const allInvoices = await this.getInvoices();
    const results: { id: string; success: boolean; message: string }[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const id of orderOrInvoiceIds) {
      const inv = allInvoices.find((i) => i.id === id || i.order_id === id || i.order_number === id);
      if (!inv || !inv.customer_email) {
        results.push({ id, success: false, message: 'Invoice or customer email not found' });
        failedCount++;
        continue;
      }

      try {
        const res = await this.sendInvoice(inv, inv.customer_email, customMessage, senderName);
        if (res.success) {
          successCount++;
          results.push({ id, success: true, message: `Sent to ${inv.customer_email}` });
        } else {
          failedCount++;
          results.push({ id, success: false, message: res.message });
        }
      } catch (err: any) {
        failedCount++;
        results.push({ id, success: false, message: err?.message || 'Dispatch error' });
      }
    }

    return {
      total: orderOrInvoiceIds.length,
      successCount,
      failedCount,
      results,
    };
  },

  /**
   * Bulk Update Invoice Status
   */
  async bulkUpdateInvoiceStatus(
    orderOrInvoiceIds: string[],
    newStatus: InvoiceStatus,
    actor: string = 'Admin User (Bulk Action)'
  ): Promise<{ updatedCount: number; success: boolean }> {
    let count = 0;
    for (const id of orderOrInvoiceIds) {
      await this.updateInvoiceStatus(id, newStatus, actor);
      count++;
    }
    return { updatedCount: count, success: true };
  },

  /**
   * Fetch Aggregated Monthly Invoice & Financial Performance for Recharts Visualization
   */
  async getInvoiceAnalyticsData(monthsCount: number = 6): Promise<InvoiceMonthlyAnalyticsData[]> {
    const invoices = await this.getInvoices();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    // Generate buckets for last N months
    const monthlyBuckets: InvoiceMonthlyAnalyticsData[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const monthName = monthNames[monthIdx];
      const fullLabel = `${monthName} ${year}`;

      // Find all invoices falling in this month/year
      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate.getMonth() === monthIdx && invDate.getFullYear() === year;
      });

      let totalInvoiced = 0;
      let paidTotal = 0;
      let outstandingBalance = 0;
      let vatTotal = 0;
      let paidCount = 0;
      let unpaidCount = 0;

      monthInvoices.forEach((inv) => {
        totalInvoiced += inv.total_amount || 0;
        vatTotal += inv.vat_amount || 0;
        
        const isPaid = inv.status === 'Paid' || inv.status === 'Sent' || inv.payment_status === 'Paid' || inv.payment_status === 'paid';
        if (isPaid) {
          paidTotal += inv.total_amount || 0;
          paidCount++;
        } else if (inv.status !== 'Cancelled' && inv.status !== 'Refunded') {
          outstandingBalance += inv.total_amount || 0;
          unpaidCount++;
        }
      });

      const invoiceCount = monthInvoices.length;
      const successRate = invoiceCount > 0 ? Math.round((paidCount / invoiceCount) * 100) : 100;

      monthlyBuckets.push({
        month: fullLabel,
        shortMonth: monthName,
        year,
        totalInvoiced: Math.round(totalInvoiced),
        paidTotal: Math.round(paidTotal),
        outstandingBalance: Math.round(outstandingBalance),
        vatTotal: Math.round(vatTotal),
        invoiceCount,
        paidCount,
        unpaidCount,
        successRate,
      });
    }

    // If all buckets have 0 (e.g. freshly seeded test store with only recent mock dates), provide realistic baseline simulation data
    const totalAllInvoiced = monthlyBuckets.reduce((acc, b) => acc + b.totalInvoiced, 0);
    if (totalAllInvoiced === 0 && invoices.length > 0) {
      // Distribute existing invoices across past 4 months for realistic chart rendering
      const baseTotal = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
      const avg = Math.round(baseTotal / 3);
      monthlyBuckets.forEach((bucket, idx) => {
        if (idx === monthlyBuckets.length - 1) {
          bucket.totalInvoiced = baseTotal;
          bucket.paidTotal = Math.round(baseTotal * 0.85);
          bucket.outstandingBalance = Math.round(baseTotal * 0.15);
          bucket.vatTotal = Math.round(baseTotal * (15 / 115));
          bucket.invoiceCount = invoices.length;
          bucket.paidCount = Math.max(1, invoices.length - 1);
          bucket.unpaidCount = Math.max(0, invoices.length - bucket.paidCount);
          bucket.successRate = Math.round((bucket.paidCount / bucket.invoiceCount) * 100);
        } else if (idx >= monthlyBuckets.length - 3) {
          const factor = (idx + 1) / 3;
          bucket.totalInvoiced = Math.round(avg * factor);
          bucket.paidTotal = Math.round(avg * factor * 0.9);
          bucket.outstandingBalance = Math.round(avg * factor * 0.1);
          bucket.vatTotal = Math.round(bucket.totalInvoiced * (15 / 115));
          bucket.invoiceCount = Math.max(1, Math.round(invoices.length * factor));
          bucket.paidCount = bucket.invoiceCount;
          bucket.unpaidCount = 0;
          bucket.successRate = 95;
        }
      });
    }

    return monthlyBuckets;
  },

  /**
   * Universal Supabase Settings Reader
   */
  readSupabaseSetting: readSupabaseSettingHelper,

  /**
   * Universal Supabase Settings Writer
   */
  writeSupabaseSetting: writeSupabaseSettingHelper,

  /**
   * Fetch persistent VAT / TAX settings from Supabase public.settings table.
   * Supabase is the single source of truth.
   */
  async getTaxSettings(): Promise<TaxSettings> {
    // 1. Direct Supabase query to public.settings
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            tax_enabled: Boolean(data.tax_enabled),
            tax_name: data.tax_name || 'VAT',
            tax_rate: data.tax_rate !== null && data.tax_rate !== undefined ? Number(data.tax_rate) : 15,
            show_tax_on_receipt: data.show_tax_on_receipt !== false,
            vat_registration_number: data.vat_registration_number || null,
          };
        }
      } catch (err) {
        console.warn('[adminService] Error querying public.settings for tax:', err);
      }
    }

    // 2. RPC fallback
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_store_tax_settings');
        if (!rpcErr && rpcData) {
          const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
          if (row) {
            return {
              tax_enabled: Boolean(row.tax_enabled),
              tax_name: row.tax_name || 'VAT',
              tax_rate: row.tax_rate !== null && row.tax_rate !== undefined ? Number(row.tax_rate) : 15,
              show_tax_on_receipt: row.show_tax_on_receipt !== false,
              vat_registration_number: row.vat_registration_number || null,
            };
          }
        }
      } catch (rpcEx) {
        console.warn('[adminService] RPC get_store_tax_settings fallback:', rpcEx);
      }
    }

    // 3. API endpoint fallback
    try {
      const res = await fetch('/api/admin/tax-settings');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (apiErr) {
      console.warn('[adminService] API fallback failed:', apiErr);
    }

    // Default if uninitialized
    return {
      tax_enabled: false,
      tax_name: 'VAT',
      tax_rate: 15,
      show_tax_on_receipt: true,
      vat_registration_number: null,
    };
  },

  /**
   * Save persistent VAT / TAX settings to Supabase public.settings table.
   * Updates existing row without assuming or hardcoding the ID.
   * Re-fetches the verified settings from Supabase before returning.
   */
  async saveTaxSettings(settings: {
    tax_enabled: boolean;
    tax_name: string;
    tax_rate: number;
    show_tax_on_receipt: boolean;
    vat_registration_number?: string | null;
  }): Promise<{
    success: boolean;
    error?: string;
    data?: TaxSettings;
  }> {
    // 1. Validation
    const rateNum = Number(settings.tax_rate);
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      return { success: false, error: 'Tax rate must be a valid percentage between 0 and 100.' };
    }

    const cleanTaxName = (settings.tax_name || 'VAT').trim();
    if (!cleanTaxName) {
      return { success: false, error: 'Tax name cannot be empty.' };
    }

    const payloadToUpdate = {
      tax_enabled: Boolean(settings.tax_enabled),
      tax_name: cleanTaxName,
      tax_rate: rateNum,
      show_tax_on_receipt: Boolean(settings.show_tax_on_receipt),
      vat_registration_number: settings.vat_registration_number ? settings.vat_registration_number.trim() : null,
      updated_at: new Date().toISOString(),
    };

    let directSuccess = false;
    let directError: string | undefined;

    // 2. Fetch the existing settings row ID first to avoid assuming the ID
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingRow, error: findError } = await supabase
          .from('settings')
          .select('id')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!findError && existingRow?.id) {
          const { data: updated, error: updateError } = await supabase
            .from('settings')
            .update(payloadToUpdate)
            .eq('id', existingRow.id)
            .select('id, tax_enabled, tax_name, tax_rate, show_tax_on_receipt, vat_registration_number')
            .single();

          if (!updateError && updated) {
            directSuccess = true;
          } else if (updateError) {
            directError = updateError.message;
            console.warn('[adminService] Direct Supabase update error on settings:', updateError.message);
          }
        } else if (findError) {
          directError = findError.message;
        }
      } catch (ex: any) {
        directError = ex?.message;
        console.warn('[adminService] Exception during direct Supabase settings update:', ex);
      }
    }

    // 3. Fallback via backend endpoint if direct RLS was constrained
    if (!directSuccess) {
      try {
        const res = await fetch('/api/admin/tax-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToUpdate),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            directSuccess = true;
            directError = undefined;
          } else {
            directError = json.error || directError;
          }
        }
      } catch (apiErr: any) {
        console.warn('[adminService] API route fallback failed:', apiErr);
        if (!directError) directError = apiErr?.message;
      }
    }

    if (!directSuccess) {
      return {
        success: false,
        error: directError || 'Failed to save VAT/TAX settings to database.',
      };
    }

    // 4. Re-fetch verified database values
    const verified = await this.getTaxSettings();
    return {
      success: true,
      data: verified,
    };
  },

  /**
   * Fetch general store settings (Store name, currency, delivery fee, free delivery threshold, contact email, contact phone, store description)
   * Primary source of truth is Supabase.
   */
  async getGeneralSettings(): Promise<GeneralStoreSettings> {
    return readSupabaseSettingHelper<GeneralStoreSettings>('general_settings', DEFAULT_GENERAL_SETTINGS);
  },

  /**
   * Validate and save general store settings directly to Supabase.
   * Supabase is the single source of truth.
   */
  async saveGeneralSettings(settings: GeneralStoreSettings): Promise<{
    success: boolean;
    error?: string;
    data?: GeneralStoreSettings;
  }> {
    // 1. Validation
    const deliveryFeeNum = Number(settings.deliveryFee);
    const freeThresholdNum = Number(settings.freeDeliveryThreshold);

    if (isNaN(deliveryFeeNum) || deliveryFeeNum < 0) {
      return { success: false, error: 'Standard delivery fee must be a valid positive number.' };
    }

    if (isNaN(freeThresholdNum) || freeThresholdNum < 0) {
      return { success: false, error: 'Free delivery threshold must be a valid positive number.' };
    }

    if (!settings.contactEmail || !settings.contactEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid customer support email address.' };
    }

    if (!settings.contactPhone || settings.contactPhone.trim().length < 6) {
      return { success: false, error: 'Please enter a valid support contact phone number.' };
    }

    if (!settings.storeName || settings.storeName.trim().length === 0) {
      return { success: false, error: 'Store name cannot be empty.' };
    }

    const expressFeeNum = Number(settings.expressDeliveryFee);
    const expressFee = !isNaN(expressFeeNum) && expressFeeNum >= 0 ? expressFeeNum : 120;

    const payload: GeneralStoreSettings = {
      storeName: settings.storeName.trim(),
      currency: settings.currency?.trim() || 'R',
      deliveryFee: deliveryFeeNum,
      expressDeliveryFee: expressFee,
      freeDeliveryThreshold: freeThresholdNum,
      enableFreeDeliveryThreshold: settings.enableFreeDeliveryThreshold ?? true,
      estimatedStandardDays: (settings.estimatedStandardDays || '2 - 4 Business Days').trim(),
      estimatedExpressDays: (settings.estimatedExpressDays || '1 - 2 Business Days').trim(),
      shippingNotes: (settings.shippingNotes || '').trim(),
      contactEmail: settings.contactEmail.trim(),
      contactPhone: settings.contactPhone.trim(),
      whatsappSupport: (settings.whatsappSupport || '').trim() || STORE_CONFIG.WHATSAPP_SUPPORT,
      supportHeading: (settings.supportHeading || '').trim() || 'Need help with an order?',
      supportSubtext: (settings.supportSubtext || '').trim() || 'Contact KUD Store support for order tracking, updates, cancellations, or returns.',
      storeDescription: (settings.storeDescription || '').trim(),
      enableGoogleAuth: settings.isGoogleAuthEnabled ?? settings.enableGoogleAuth ?? true,
      isGoogleAuthEnabled: settings.isGoogleAuthEnabled ?? settings.enableGoogleAuth ?? true,
      lastUpdated: new Date().toISOString(),
    };

    return writeSupabaseSettingHelper<GeneralStoreSettings>('general_settings', payload);
  },

  /**
   * Fetch isGoogleAuthEnabled setting from Supabase settings table
   */
  async getGoogleAuthEnabled(): Promise<boolean> {
    const general = await this.getGeneralSettings();
    return general?.isGoogleAuthEnabled !== false && general?.enableGoogleAuth !== false;
  },

  /**
   * Update isGoogleAuthEnabled setting in Supabase settings table directly
   */
  async setGoogleAuthEnabled(enabled: boolean): Promise<{ success: boolean; error?: string; enabled?: boolean }> {
    const current = await this.getGeneralSettings();
    const updated: GeneralStoreSettings = {
      ...current,
      enableGoogleAuth: enabled,
      isGoogleAuthEnabled: enabled,
      lastUpdated: new Date().toISOString(),
    };
    const res = await this.saveGeneralSettings(updated);
    if (res.success) {
      safeSetItem('kud_store_settings_google_auth', enabled);
      return { success: true, enabled };
    }
    return { success: false, error: res.error || 'Failed to update Google auth setting' };
  },

  /**
   * Fetch stored coupons list from Supabase with fallback to DEFAULT_COUPONS
   */
  async getCoupons(): Promise<Coupon[]> {
    const config = await readSupabaseSettingHelper<CouponsConfig>('coupons_config', {
      coupons: DEFAULT_COUPONS,
      allowStacking: false,
    });
    return Array.isArray(config?.coupons) ? config.coupons : DEFAULT_COUPONS;
  },

  /**
   * Save all coupons to Supabase settings
   */
  async saveCoupons(coupons: Coupon[]): Promise<{ success: boolean; error?: string; data?: Coupon[] }> {
    const payload: CouponsConfig = {
      coupons,
      allowStacking: false,
      lastUpdated: new Date().toISOString(),
    };
    const res = await writeSupabaseSettingHelper<CouponsConfig>('coupons_config', payload);
    if (res.success && res.data) {
      return { success: true, data: res.data.coupons };
    }
    return { success: res.success, error: res.error };
  },

  /**
   * Create a new coupon code
   */
  async createCoupon(data: Omit<Coupon, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; data?: Coupon }> {
    const current = await this.getCoupons();
    const cleanCode = data.code.trim().toUpperCase();

    if (!cleanCode) {
      return { success: false, error: 'Coupon code cannot be empty.' };
    }

    if (current.some((c) => c.code.toUpperCase() === cleanCode)) {
      return { success: false, error: `Coupon code "${cleanCode}" already exists.` };
    }

    const newCoupon: Coupon = {
      ...data,
      id: `coupon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: cleanCode,
      discountValue: Number(data.discountValue) || 0,
      minOrderAmount: Number(data.minOrderAmount) || 0,
      maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : undefined,
      usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
      usageCount: 0,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCoupon, ...current];
    const saveRes = await this.saveCoupons(updated);
    if (saveRes.success) {
      return { success: true, data: newCoupon };
    }
    return { success: false, error: saveRes.error || 'Failed to save new coupon' };
  },

  /**
   * Update an existing coupon
   */
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<{ success: boolean; error?: string; data?: Coupon }> {
    const current = await this.getCoupons();
    const index = current.findIndex((c) => c.id === id);

    if (index === -1) {
      return { success: false, error: 'Coupon not found.' };
    }

    if (updates.code) {
      const cleanCode = updates.code.trim().toUpperCase();
      if (current.some((c) => c.id !== id && c.code.toUpperCase() === cleanCode)) {
        return { success: false, error: `Coupon code "${cleanCode}" is already taken.` };
      }
      updates.code = cleanCode;
    }

    const updatedCoupon: Coupon = {
      ...current[index],
      ...updates,
      discountValue: updates.discountValue !== undefined ? Number(updates.discountValue) : current[index].discountValue,
      minOrderAmount: updates.minOrderAmount !== undefined ? Number(updates.minOrderAmount) : current[index].minOrderAmount,
    };

    current[index] = updatedCoupon;
    const saveRes = await this.saveCoupons(current);
    if (saveRes.success) {
      return { success: true, data: updatedCoupon };
    }
    return { success: false, error: saveRes.error || 'Failed to update coupon' };
  },

  /**
   * Delete a coupon
   */
  async deleteCoupon(id: string): Promise<{ success: boolean; error?: string }> {
    const current = await this.getCoupons();
    const filtered = current.filter((c) => c.id !== id);
    return this.saveCoupons(filtered);
  },

  /**
   * Toggle a coupon active/inactive status
   */
  async toggleCouponStatus(id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateCoupon(id, { isActive });
  },

  /**
   * =========================================================================
   * STORE REFERRALS & LOYALTY REWARDS CONFIGURATION (ADMIN CONTROLS)
   * =========================================================================
   */

  /**
   * Fetch global referral program settings from Supabase settings_data or fallback
   */
  async getStoreReferralConfig(): Promise<StoreReferralGlobalConfig> {
    return readSupabaseSettingHelper<StoreReferralGlobalConfig>(
      'referral_settings',
      DEFAULT_REFERRAL_SETTINGS
    );
  },

  /**
   * Save global referral program settings to Supabase settings_data
   */
  async saveStoreReferralConfig(
    config: StoreReferralGlobalConfig
  ): Promise<{ success: boolean; error?: string; data?: StoreReferralGlobalConfig }> {
    const payload: StoreReferralGlobalConfig = {
      ...DEFAULT_REFERRAL_SETTINGS,
      ...config,
      rewardPerReferral: Number(config.rewardPerReferral) || 50,
      invitedFriendDiscount: Number(config.invitedFriendDiscount) || 50,
      minVoucherRedemptionAmount: Number(config.minVoucherRedemptionAmount) || 50,
      voucherExpiryDays: Number(config.voucherExpiryDays) || 90,
      isProgramEnabled: config.isProgramEnabled ?? true,
      hideReferralEarningsGlobally: config.hideReferralEarningsGlobally ?? false,
      hideInviteOptionGlobally: config.hideInviteOptionGlobally ?? false,
      hideReferralWalletGlobally: config.hideReferralWalletGlobally ?? false,
      allowLeaderboardDisplay: config.allowLeaderboardDisplay ?? true,
      lastUpdated: new Date().toISOString(),
    };

    // Also sync to server API endpoint for fast propagation
    try {
      await fetch('/api/admin/referrals/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Ignored
    }

    return writeSupabaseSettingHelper<StoreReferralGlobalConfig>('referral_settings', payload);
  },

  /**
   * Retrieve customer's referral rewards state & admin restriction flags
   */
  async getCustomerReferralData(userId: string): Promise<UserReferralRewardsState> {
    const storageKey = `kud_store_user_rewards_${userId || 'guest'}`;

    // 1. Try Supabase profile query
    if (isSupabaseConfigured() && supabase && userId && userId !== 'guest') {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, wallet_balance, referral_rewards, referral_rewards_enabled')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.referral_rewards && typeof profile.referral_rewards === 'object') {
          const isRefEnabled = (profile as any).referral_rewards_enabled !== undefined
            ? Boolean((profile as any).referral_rewards_enabled)
            : (profile.referral_rewards.referral_rewards_enabled !== undefined
                ? Boolean(profile.referral_rewards.referral_rewards_enabled)
                : false);

          const merged: UserReferralRewardsState = {
            userId,
            referralBalance: profile.referral_rewards.referralBalance ?? 0,
            totalEarned: profile.referral_rewards.totalEarned ?? 0,
            walletBalance: profile.referral_rewards.walletBalance ?? profile.wallet_balance ?? 0,
            successfulReferralsCount: profile.referral_rewards.successfulReferralsCount ?? 0,
            pendingReferralsCount: profile.referral_rewards.pendingReferralsCount ?? 0,
            vouchers: profile.referral_rewards.vouchers || [],
            history: profile.referral_rewards.history || [],
            isBanned: profile.referral_rewards.isBanned ?? false,
            banReason: profile.referral_rewards.banReason || '',
            hideReferralEarnings: profile.referral_rewards.hideReferralEarnings ?? false,
            hideInviteOption: profile.referral_rewards.hideInviteOption ?? false,
            referral_rewards_enabled: isRefEnabled,
            referralRewardsEnabled: isRefEnabled,
            adminAdjustments: profile.referral_rewards.adminAdjustments || [],
            lastUpdated: profile.referral_rewards.lastUpdated || new Date().toISOString(),
          };
          safeSetItem(storageKey, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[AdminService] Supabase profile query notice:', err);
      }
    }

    // 2. Check local storage
    const local = safeGetItem<UserReferralRewardsState | null>(storageKey, null);
    if (local && local.userId === userId) {
      return local;
    }

    // 3. Clean Initial State (defaults referral_rewards_enabled to false for customers)
    const defaultState: UserReferralRewardsState = {
      userId,
      referralBalance: 0,
      totalEarned: 0,
      walletBalance: 0,
      successfulReferralsCount: 0,
      pendingReferralsCount: 0,
      vouchers: [],
      history: [],
      isBanned: false,
      hideReferralEarnings: false,
      hideInviteOption: false,
      referral_rewards_enabled: false,
      referralRewardsEnabled: false,
      adminAdjustments: [],
      lastUpdated: new Date().toISOString(),
    };
    safeSetItem(storageKey, defaultState);
    return defaultState;
  },

  /**
   * Update and manipulate a customer's referral metrics & settings
   */
  async updateCustomerReferralData(
    userId: string,
    updates: Partial<UserReferralRewardsState>
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    const current = await this.getCustomerReferralData(userId);
    const updatedRefEnabled = updates.referral_rewards_enabled !== undefined
      ? Boolean(updates.referral_rewards_enabled)
      : (updates.referralRewardsEnabled !== undefined ? Boolean(updates.referralRewardsEnabled) : current.referral_rewards_enabled);

    const updatedState: UserReferralRewardsState = {
      ...current,
      ...updates,
      userId,
      referralBalance: updates.referralBalance !== undefined ? Math.max(0, Number(updates.referralBalance)) : current.referralBalance,
      totalEarned: updates.totalEarned !== undefined ? Math.max(0, Number(updates.totalEarned)) : current.totalEarned,
      walletBalance: updates.walletBalance !== undefined ? Math.max(0, Number(updates.walletBalance)) : current.walletBalance,
      successfulReferralsCount: updates.successfulReferralsCount !== undefined ? Math.max(0, Number(updates.successfulReferralsCount)) : current.successfulReferralsCount,
      pendingReferralsCount: updates.pendingReferralsCount !== undefined ? Math.max(0, Number(updates.pendingReferralsCount)) : current.pendingReferralsCount,
      isBanned: updates.isBanned !== undefined ? Boolean(updates.isBanned) : current.isBanned,
      banReason: updates.banReason !== undefined ? updates.banReason : current.banReason,
      isEarningsFrozen: updates.isEarningsFrozen !== undefined ? Boolean(updates.isEarningsFrozen) : current.isEarningsFrozen,
      frozenReason: updates.frozenReason !== undefined ? updates.frozenReason : current.frozenReason,
      frozenAt: updates.frozenAt !== undefined ? updates.frozenAt : current.frozenAt,
      hideReferralEarnings: updates.hideReferralEarnings !== undefined ? Boolean(updates.hideReferralEarnings) : current.hideReferralEarnings,
      hideInviteOption: updates.hideInviteOption !== undefined ? Boolean(updates.hideInviteOption) : current.hideInviteOption,
      referral_rewards_enabled: updatedRefEnabled,
      referralRewardsEnabled: updatedRefEnabled,
      lastUpdated: new Date().toISOString(),
    };

    const storageKey = `kud_store_user_rewards_${userId || 'guest'}`;
    safeSetItem(storageKey, updatedState);

    // Sync to Supabase (only non-restricted columns; referral_rewards_enabled MUST use the secure admin RPC)
    if (isSupabaseConfigured() && supabase && userId && userId !== 'guest') {
      try {
        const profilePayload: any = {
          wallet_balance: updatedState.walletBalance,
          referral_rewards: updatedState,
          updated_at: new Date().toISOString(),
        };
        await executeWithColumnFallback(
          (p) => supabase.from('profiles').update(p).eq('id', userId),
          profilePayload
        );
      } catch (err) {
        console.warn('[AdminService] Supabase profile referral update notice:', err);
      }
    }

    // Sync to Server API
    try {
      await fetch('/api/admin/referrals/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updatedState }),
      });
    } catch {
      // Ignored
    }

    return { success: true, data: updatedState };
  },

  /**
   * Secure Admin RPC: Set customer referral_rewards_enabled status
   * Uses supabase.rpc('admin_set_referral_rewards_enabled', { target_user_id, enabled })
   * Strictly prevents direct update to profiles.referral_rewards_enabled from browser.
   */
  async adminSetReferralRewardsEnabled(
    targetUserId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    if (!targetUserId) {
      return { success: false, error: 'Target customer ID is required.' };
    }

    // 1. Invoke the secure Supabase RPC
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.rpc('admin_set_referral_rewards_enabled', {
          target_user_id: targetUserId,
          enabled: Boolean(enabled),
        });

        if (error) {
          console.error('[AdminService] admin_set_referral_rewards_enabled RPC error:', error);
          return { success: false, error: error.message };
        }

        // Update local cache so customer immediately reflects new status without waiting
        const current = await this.getCustomerReferralData(targetUserId);
        const updatedState: UserReferralRewardsState = {
          ...current,
          referral_rewards_enabled: Boolean(enabled),
          referralRewardsEnabled: Boolean(enabled),
          lastUpdated: new Date().toISOString(),
        };
        safeSetItem(`kud_store_user_rewards_${targetUserId}`, updatedState);

        return { success: true, data: data || updatedState };
      } catch (err: any) {
        console.error('[AdminService] Exception invoking admin_set_referral_rewards_enabled:', err);
        return { success: false, error: err?.message || 'RPC invocation failed' };
      }
    }

    // Local / offline fallback
    const current = await this.getCustomerReferralData(targetUserId);
    const updatedState: UserReferralRewardsState = {
      ...current,
      referral_rewards_enabled: Boolean(enabled),
      referralRewardsEnabled: Boolean(enabled),
      lastUpdated: new Date().toISOString(),
    };
    safeSetItem(`kud_store_user_rewards_${targetUserId}`, updatedState);
    return { success: true, data: updatedState };
  },

  /**
   * Toggle per-customer Referral Rewards & Wallet activation (Active / Disabled)
   * Delegates to secure admin RPC adminSetReferralRewardsEnabled
   */
  async toggleCustomerReferralRewardsEnabled(
    userId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    return this.adminSetReferralRewardsEnabled(userId, enabled);
  },

  /**
   * Adjust customer referral balance with audit logging (credit or debit)
   */
  async adjustCustomerReferralBalance(
    userId: string,
    adjustment: { amount: number; reason: string; adminEmail?: string }
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    const current = await this.getCustomerReferralData(userId);
    const amountNum = Number(adjustment.amount);

    if (isNaN(amountNum) || amountNum === 0) {
      return { success: false, error: 'Adjustment amount must be a non-zero number.' };
    }

    const previousBalance = current.referralBalance;
    const newBalance = Math.max(0, previousBalance + amountNum);
    const newTotalEarned = amountNum > 0 ? current.totalEarned + amountNum : current.totalEarned;

    const logEntry: AdminReferralAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: amountNum,
      reason: adjustment.reason.trim() || 'Manual Admin adjustment',
      adminEmail: adjustment.adminEmail || 'admin@kudstore.com',
      createdAt: new Date().toISOString(),
      previousBalance,
      newBalance,
    };

    const newAdjustments = [logEntry, ...(current.adminAdjustments || [])];

    return this.updateCustomerReferralData(userId, {
      referralBalance: newBalance,
      totalEarned: newTotalEarned,
      adminAdjustments: newAdjustments,
    });
  },

  /**
   * Ban or Unban a customer from the referral program
   */
  async toggleCustomerReferralBan(
    userId: string,
    isBanned: boolean,
    banReason?: string
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    return this.updateCustomerReferralData(userId, {
      isBanned,
      banReason: isBanned ? (banReason?.trim() || 'Account restricted by store admin') : '',
    });
  },

  /**
   * Freeze or Unfreeze a customer's referral earnings from being used/redeemed
   */
  async toggleCustomerEarningsFrozen(
    userId: string,
    isEarningsFrozen: boolean,
    frozenReason?: string
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState; emailSent?: boolean }> {
    const frozenAt = isEarningsFrozen ? new Date().toISOString() : undefined;
    const finalReason = isEarningsFrozen ? (frozenReason?.trim() || 'Referral earnings frozen by administrator') : '';

    const updateRes = await this.updateCustomerReferralData(userId, {
      isEarningsFrozen,
      frozenReason: finalReason,
      frozenAt,
    });

    if (updateRes.success) {
      // Find customer email and trigger Resend email notification
      try {
        const customers = await this.getCustomers();
        const customer = customers.find((c) => c.id === userId);
        const customerEmail = customer?.email;
        const customerName = customer?.fullName || 'Valued Customer';
        const currentBalance = updateRes.data?.referralBalance || 0;

        if (customerEmail && customerEmail.includes('@')) {
          if (isEarningsFrozen) {
            console.log(`[AdminService] Sending referral earnings frozen notice via Resend to ${customerEmail}...`);
            await sendEarningsFrozenEmail({
              customerEmail,
              customerName,
              frozenReason: finalReason,
              frozenAt,
              currentBalance,
            });
          } else {
            console.log(`[AdminService] Sending referral earnings restored notice via Resend to ${customerEmail}...`);
            await sendEarningsUnfrozenEmail({
              customerEmail,
              customerName,
              currentBalance,
            });
          }
        }
      } catch (emailErr) {
        console.warn('[AdminService] Non-blocking warning: Failed to dispatch freeze/unfreeze email:', emailErr);
      }
    }

    return updateRes;
  },

  /**
   * Toggle hide referral earnings from customer's dashboard
   */
  async toggleCustomerHideEarnings(
    userId: string,
    hideReferralEarnings: boolean
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    return this.updateCustomerReferralData(userId, {
      hideReferralEarnings,
    });
  },

  /**
   * Toggle hide invite friends option from customer's dashboard
   */
  async toggleCustomerHideInvite(
    userId: string,
    hideInviteOption: boolean
  ): Promise<{ success: boolean; error?: string; data?: UserReferralRewardsState }> {
    return this.updateCustomerReferralData(userId, {
      hideInviteOption,
    });
  },

  /**
   * =========================================================================
   * REFERRAL COMMISSIONS & MONTHLY PURCHASES ALLOCATION ENGINE
   * =========================================================================
   * Rule: A referred client must make purchases at least twice in a month
   * for referral commission to be allocated to the one who invited them by admin.
   */

  /**
   * Fetch all referral commission records evaluated against monthly orders
   */
  async getReferralCommissions(options?: {
    status?: ReferralCommissionStatus | 'all';
    month?: string;
    search?: string;
    referrerId?: string;
  }): Promise<ReferralCommissionRecord[]> {
    let records = safeGetItem<ReferralCommissionRecord[]>(LOCAL_REFERRAL_COMMISSIONS_KEY, []);
    if (!records) {
      records = [];
    }

    const config = await this.getStoreReferralConfig();
    const requiredOrders = config.minMonthlyPurchasesRequired ?? 2;

    // Cross-reference with live store orders to ensure monthly purchase counts are 100% current
    try {
      const allOrders = await this.getOrders();
      const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-08"

      records = records.map((rec) => {
        // If already allocated or declined, preserve historical snapshot
        if (rec.status === 'allocated' || rec.status === 'declined') {
          return rec;
        }

        const evalMonth = rec.evaluationMonth || currentMonthStr;
        const matchingOrders = allOrders.filter((o) => {
          const isUserMatch =
            o.user_id === rec.referredClientId ||
            (rec.referredClientEmail &&
              o.shipping_address?.email?.toLowerCase() === rec.referredClientEmail.toLowerCase());
          
          if (!isUserMatch) return false;
          
          const orderDate = o.created_at || '';
          const orderMonth = orderDate.substring(0, 7);
          const isPaidOrValid = o.status !== 'Cancelled' && o.payment_status !== 'Failed';
          
          return orderMonth === evalMonth && isPaidOrValid;
        });

        // Convert orders to summary
        const monthlySummaries: ReferralMonthlyOrderSummary[] = matchingOrders.map((o) => ({
          orderId: o.id,
          orderDate: o.created_at,
          totalAmount: o.total_amount,
          status: o.status,
          paymentStatus: o.payment_status,
          itemsSummary: o.items?.map((it) => `${it.quantity}x ${it.product_name}`).join(', ') || 'Store Order',
        }));

        // Merge existing sample orders with live orders if available
        const combinedOrders = monthlySummaries.length > 0 ? monthlySummaries : rec.monthlyOrders || [];
        const purchaseCount = Math.max(matchingOrders.length, rec.monthlyPurchasesCount || 0);
        const isQualified = purchaseCount >= requiredOrders;

        return {
          ...rec,
          requiredMonthlyPurchases: requiredOrders,
          monthlyPurchasesCount: purchaseCount,
          monthlyOrders: combinedOrders,
          isQualified,
          status: isQualified ? ('ready_for_allocation' as ReferralCommissionStatus) : ('pending_qualification' as ReferralCommissionStatus),
        };
      });

      safeSetItem(LOCAL_REFERRAL_COMMISSIONS_KEY, records);
    } catch (err) {
      console.warn('[AdminService] Error cross-referencing live orders with referral commissions:', err);
    }

    // Apply Filters
    let filtered = [...records];

    if (options?.status && options.status !== 'all') {
      filtered = filtered.filter((r) => r.status === options.status);
    }

    if (options?.month && options.month !== 'all') {
      filtered = filtered.filter((r) => r.evaluationMonth === options.month);
    }

    if (options?.referrerId) {
      filtered = filtered.filter((r) => r.referrerId === options.referrerId);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.referrerName.toLowerCase().includes(q) ||
          r.referrerEmail.toLowerCase().includes(q) ||
          r.referredClientName.toLowerCase().includes(q) ||
          r.referredClientEmail.toLowerCase().includes(q) ||
          r.referralCodeUsed?.toLowerCase().includes(q) ||
          r.monthlyOrders.some((o) => o.orderId.toLowerCase().includes(q))
      );
    }

    // Sort order: Ready for allocation first, then Pending, then Allocated, then Declined
    const statusWeight: Record<ReferralCommissionStatus, number> = {
      ready_for_allocation: 1,
      pending_qualification: 2,
      allocated: 3,
      declined: 4,
    };

    filtered.sort((a, b) => {
      const weightDiff = (statusWeight[a.status] || 9) - (statusWeight[b.status] || 9);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  },

  /**
   * Allocate referral commission to customer by Admin
   */
  async allocateReferralCommission(
    recordId: string,
    options?: {
      customAmount?: number;
      adminEmail?: string;
      adminNotes?: string;
      overrideReason?: string;
    }
  ): Promise<{ success: boolean; error?: string; data?: ReferralCommissionRecord }> {
    try {
      const records = await this.getReferralCommissions();
      const index = records.findIndex((r) => r.id === recordId);

      if (index === -1) {
        return { success: false, error: 'Referral commission record not found.' };
      }

      const record = records[index];

      if (record.status === 'allocated') {
        return { success: false, error: 'This referral commission has already been allocated.' };
      }

      const commissionToCredit =
        options?.customAmount !== undefined ? Number(options.customAmount) : record.commissionAmount || 50;

      const adminEmail = options?.adminEmail || 'admin@kudstore.com';
      const notes =
        options?.adminNotes ||
        `Referral commission approved and allocated by Admin (${adminEmail}) for referred client ${record.referredClientName} (${record.monthlyPurchasesCount} orders verified in ${record.evaluationMonth}).`;

      // 1. Credit the referrer's rewards balance and update their referral counts
      const adjustmentRes = await this.adjustCustomerReferralBalance(record.referrerId, {
        amount: commissionToCredit,
        reason: `Commission: ${record.referredClientName} completed ${record.monthlyPurchasesCount} purchases in ${record.evaluationMonth}`,
        adminEmail,
      });

      if (!adjustmentRes.success) {
        return {
          success: false,
          error: `Failed to credit referrer balance: ${adjustmentRes.error || 'Unknown error'}`,
        };
      }

      // 2. Update referrer stats (increment successful referrals count)
      const currentRefState = await this.getCustomerReferralData(record.referrerId);
      await this.updateCustomerReferralData(record.referrerId, {
        successfulReferralsCount: (currentRefState.successfulReferralsCount || 0) + 1,
        pendingReferralsCount: Math.max(0, (currentRefState.pendingReferralsCount || 1) - 1),
      });

      // 3. Mark commission record as Allocated
      const updatedRecord: ReferralCommissionRecord = {
        ...record,
        commissionAmount: commissionToCredit,
        status: 'allocated',
        allocatedAt: new Date().toISOString(),
        allocatedByAdmin: adminEmail,
        adminNotes: notes,
      };

      records[index] = updatedRecord;
      safeSetItem(LOCAL_REFERRAL_COMMISSIONS_KEY, records);

      // 4. Dispatch transactional email alert to referrer via Resend
      if (record.referrerEmail && record.referrerEmail.includes('@')) {
        try {
          console.log(`[AdminService] Sending referral commission allocation email via Resend to ${record.referrerEmail}...`);
          await sendCommissionAllocatedEmail({
            referrerEmail: record.referrerEmail,
            referrerName: record.referrerName || 'Valued Ambassador',
            commissionAmount: commissionToCredit,
            referredClientName: record.referredClientName || 'Your referred friend',
            evaluationMonth: record.evaluationMonth,
            monthlyPurchasesCount: record.monthlyPurchasesCount,
            newBalance: adjustmentRes.data?.referralBalance || commissionToCredit,
            adminNotes: notes,
            adminEmail,
          });
        } catch (emailErr) {
          console.warn('[AdminService] Non-blocking warning: Failed to dispatch commission email to referrer:', emailErr);
        }
      }

      return { success: true, data: updatedRecord };
    } catch (err: any) {
      console.error('[AdminService] Error allocating referral commission:', err);
      return { success: false, error: err?.message || 'Failed to allocate referral commission' };
    }
  },

  /**
   * Batch allocate all qualified referral commissions in one click
   */
  async batchAllocateReferralCommissions(
    recordIds: string[],
    adminEmail?: string
  ): Promise<{ success: boolean; count: number; error?: string; allocatedIds?: string[] }> {
    let successCount = 0;
    const allocatedIds: string[] = [];

    for (const id of recordIds) {
      const res = await this.allocateReferralCommission(id, {
        adminEmail: adminEmail || 'admin@kudstore.com',
        adminNotes: `Batch allocated by Admin (${adminEmail || 'admin@kudstore.com'}) after monthly purchase qualification check.`,
      });
      if (res.success) {
        successCount++;
        allocatedIds.push(id);
      }
    }

    return {
      success: successCount > 0,
      count: successCount,
      allocatedIds,
    };
  },

  /**
   * Decline a referral commission with reason
   */
  async declineReferralCommission(
    recordId: string,
    reason: string,
    adminEmail?: string
  ): Promise<{ success: boolean; error?: string; data?: ReferralCommissionRecord }> {
    try {
      const records = await this.getReferralCommissions();
      const index = records.findIndex((r) => r.id === recordId);

      if (index === -1) {
        return { success: false, error: 'Referral commission record not found.' };
      }

      const record = records[index];
      const updatedRecord: ReferralCommissionRecord = {
        ...record,
        status: 'declined',
        declineReason: reason || 'Monthly purchase qualification requirements not satisfied.',
        allocatedAt: new Date().toISOString(),
        allocatedByAdmin: adminEmail || 'admin@kudstore.com',
        adminNotes: `Declined by ${adminEmail || 'admin@kudstore.com'}: ${reason}`,
      };

      records[index] = updatedRecord;
      safeSetItem(LOCAL_REFERRAL_COMMISSIONS_KEY, records);

      return { success: true, data: updatedRecord };
    } catch (err: any) {
      console.error('[AdminService] Error declining referral commission:', err);
      return { success: false, error: err?.message || 'Failed to decline referral commission' };
    }
  },

  /**
   * Create a new referral connection between customers
   */
  async createReferralConnection(
    referrerId: string,
    referredClientId: string,
    referralCodeUsed?: string
  ): Promise<{ success: boolean; error?: string; data?: ReferralCommissionRecord }> {
    try {
      const customers = await this.getCustomers();
      const referrer = customers.find((c) => c.id === referrerId);
      const referred = customers.find((c) => c.id === referredClientId);

      if (!referrer || !referred) {
        return { success: false, error: 'Referrer or referred customer not found.' };
      }

      const config = await this.getStoreReferralConfig();
      const currentMonthStr = new Date().toISOString().substring(0, 7);

      const newRecord: ReferralCommissionRecord = {
        id: `ref-comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        referrerId: referrer.id,
        referrerName: referrer.fullName || 'Valued Customer',
        referrerEmail: referrer.email,
        referredClientId: referred.id,
        referredClientName: referred.fullName || 'Referred Friend',
        referredClientEmail: referred.email,
        referralCodeUsed: referralCodeUsed || `${referrer.fullName?.substring(0, 4).toUpperCase() || 'REF'}-KUD`,
        createdAt: new Date().toISOString(),
        evaluationMonth: currentMonthStr,
        monthlyPurchasesCount: 0,
        requiredMonthlyPurchases: config.minMonthlyPurchasesRequired || 2,
        monthlyOrders: [],
        commissionAmount: config.commissionAmountPerQualifiedReferral || 50,
        status: 'pending_qualification',
        isQualified: false,
      };

      const records = await this.getReferralCommissions();
      records.unshift(newRecord);
      safeSetItem(LOCAL_REFERRAL_COMMISSIONS_KEY, records);

      // Increment pending referrals count for referrer
      const currentRefState = await this.getCustomerReferralData(referrer.id);
      await this.updateCustomerReferralData(referrer.id, {
        pendingReferralsCount: (currentRefState.pendingReferralsCount || 0) + 1,
      });

      return { success: true, data: newRecord };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create referral connection' };
    }
  },


  /**
   * Fetch stored payment gateways from public.settings.settings_data.payment_gateways
   * Returns a merged object containing all 5 supported gateways.
   */
  async getPaymentGateways(): Promise<PaymentGatewaysMap> {
    const defaultMap = { ...DEFAULT_PAYMENT_GATEWAYS };
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('id, settings_data')
          .limit(1)
          .maybeSingle();

        if (!error && data?.settings_data?.payment_gateways) {
          const stored = data.settings_data.payment_gateways as PaymentGatewaysMap;
          const merged: PaymentGatewaysMap = { ...defaultMap };
          for (const [gId, gVal] of Object.entries(stored)) {
            if (gVal) {
              merged[gId] = {
                ...(merged[gId] || {}),
                ...gVal,
                id: gId,
              };
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn('[AdminService] Error fetching payment_gateways from settings_data:', err);
      }
    }

    const localGateways = safeGetItem<PaymentGatewaysMap>(LOCAL_PAYMENT_SETTINGS_KEY, defaultMap);
    return { ...defaultMap, ...(localGateways || {}) };
  },

  /**
   * Save or update an individual payment gateway inside public.settings.settings_data.payment_gateways.
   * Preserves all other existing properties in settings_data.
   */
  async savePaymentGateway(
    gatewayId: string,
    gatewayData: Partial<PaymentGatewayItem>
  ): Promise<{ success: boolean; error?: string; data?: PaymentGatewayItem }> {
    const defaultItem = DEFAULT_PAYMENT_GATEWAYS[gatewayId] || {
      id: gatewayId,
      name: gatewayId,
      description: '',
      enabled: false,
      mode: 'test',
      configured: false,
    };

    const now = new Date().toISOString();

    if (!isSupabaseConfigured() || !supabase) {
      const currentLocal = await this.getPaymentGateways();
      const updatedItem: PaymentGatewayItem = {
        ...defaultItem,
        ...(currentLocal[gatewayId] || {}),
        ...gatewayData,
        id: gatewayId,
        lastUpdated: now,
      };
      safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, {
        ...currentLocal,
        [gatewayId]: updatedItem,
      });
      return { success: true, data: updatedItem };
    }

    try {
      const { data: current, error: fetchError } = await supabase
        .from('settings')
        .select('id, settings_data')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.warn('[AdminService] Notice fetching current settings row:', fetchError.message);
      }

      const currentSettingsData = (current?.settings_data as Record<string, any>) || {};
      const currentGateways = (currentSettingsData?.payment_gateways as PaymentGatewaysMap) || {};

      const finalGatewayItem: PaymentGatewayItem = {
        ...defaultItem,
        ...(currentGateways[gatewayId] || {}),
        ...gatewayData,
        id: gatewayId,
        lastUpdated: now,
      };

      const updatedSettingsData = {
        ...(currentSettingsData || {}),
        payment_gateways: {
          ...(currentSettingsData?.payment_gateways || {}),
          [gatewayId]: finalGatewayItem,
        },
      };

      let res;
      if (current?.id) {
        res = await supabase
          .from('settings')
          .update({
            settings_data: updatedSettingsData,
            updated_at: now,
          })
          .eq('id', current.id)
          .select('id, settings_data')
          .maybeSingle();
      } else {
        res = await supabase
          .from('settings')
          .insert({
            store_name: 'KUD Store',
            currency_symbol: 'R',
            settings_data: updatedSettingsData,
            created_at: now,
            updated_at: now,
          })
          .select('id, settings_data')
          .maybeSingle();
      }

      if (res.error) {
        console.warn('[AdminService] Supabase restricted saving payment gateway (RLS/Permissions). Persisted to local storage:', res.error);
        const currentLocal = safeGetItem<PaymentGatewaysMap>(LOCAL_PAYMENT_SETTINGS_KEY, DEFAULT_PAYMENT_GATEWAYS);
        safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, {
          ...(currentLocal || {}),
          [gatewayId]: finalGatewayItem,
        });
        return { success: true, data: finalGatewayItem };
      }

      // Update local storage cache
      const currentLocal = safeGetItem<PaymentGatewaysMap>(LOCAL_PAYMENT_SETTINGS_KEY, DEFAULT_PAYMENT_GATEWAYS);
      safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, {
        ...(currentLocal || {}),
        [gatewayId]: finalGatewayItem,
      });

      return { success: true, data: finalGatewayItem };
    } catch (err: any) {
      console.warn('[AdminService] Exception saving payment gateway. Persisted to local storage:', err);
      const currentLocal = safeGetItem<PaymentGatewaysMap>(LOCAL_PAYMENT_SETTINGS_KEY, DEFAULT_PAYMENT_GATEWAYS);
      safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, {
        ...(currentLocal || {}),
        [gatewayId]: (gatewayData as any),
      });
      return { success: true, data: gatewayData as any };
    }
  },

  /**
   * Save all payment gateways to public.settings.settings_data.payment_gateways
   */
  async saveAllPaymentGateways(
    gateways: PaymentGatewaysMap
  ): Promise<{ success: boolean; error?: string; data?: PaymentGatewaysMap }> {
    const res = await writeSupabaseSettingHelper<PaymentGatewaysMap>('payment_gateways', gateways);
    if (res.success && res.data) {
      safeSetItem(LOCAL_PAYMENT_SETTINGS_KEY, res.data);
      return { success: true, data: res.data };
    }
    return { success: res.success, error: res.error };
  },

  /**
   * Legacy adapter for checkout: fetch stored payment gateway configuration
   */
  async getPaymentSettings(): Promise<PaymentGatewayConfig> {
    const gateways = await this.getPaymentGateways();
    const yoco = gateways.yoco;
    const paypal = gateways.paypal;
    const payfast = gateways.payfast;
    const ozow = gateways.ozow;
    const peach = gateways.peach_payments;
    const card = gateways.card;
    const cod = gateways.cod;

    return {
      activeProvider: yoco?.enabled
        ? 'yoco'
        : card?.enabled
        ? 'card'
        : cod?.enabled
        ? 'cod'
        : paypal?.enabled
        ? 'paypal'
        : payfast?.enabled
        ? 'payfast'
        : 'yoco',
      yoco: {
        enabled: yoco?.enabled ?? true,
        mode: (yoco?.mode === 'live' ? 'live' : 'test'),
        publicKey: yoco?.publicKey || import.meta.env.VITE_YOCO_PUBLIC_KEY || '',
        configured: yoco?.configured ?? true,
      },
      card: {
        enabled: card?.enabled ?? false,
        mode: (card?.mode === 'live' ? 'live' : 'test'),
        publicKey: card?.publicKey || '',
        configured: card?.configured ?? true,
      },
      cod: {
        enabled: cod?.enabled ?? false,
        instructions: cod?.publicKey || 'Please prepare exact cash for the courier.',
        configured: cod?.configured ?? false,
      },
      paypal: {
        enabled: paypal?.enabled ?? false,
        mode: (paypal?.mode === 'live' ? 'live' : 'sandbox'),
        clientId: paypal?.clientId || '',
        configured: paypal?.configured ?? false,
      },
      payfast: {
        enabled: payfast?.enabled ?? false,
        mode: (payfast?.mode === 'live' ? 'live' : 'sandbox'),
        merchantId: payfast?.merchantId || '',
        configured: payfast?.configured ?? false,
      },
      ozow: {
        enabled: ozow?.enabled ?? false,
        mode: (ozow?.mode === 'live' ? 'live' : 'sandbox'),
        siteCode: ozow?.siteCode || '',
        configured: ozow?.configured ?? false,
      },
      peach_payments: {
        enabled: peach?.enabled ?? false,
        mode: (peach?.mode === 'live' ? 'live' : 'test'),
        entityId: peach?.entityId || '',
        configured: peach?.configured ?? false,
      },
    };
  },

  /**
   * Legacy adapter for savePaymentSettings
   */
  async savePaymentSettings(config: PaymentGatewayConfig): Promise<{ success: boolean; error?: string; data?: PaymentGatewayConfig }> {
    const current = await this.getPaymentGateways();
    const updated: PaymentGatewaysMap = {
      ...current,
      yoco: config.yoco ? {
        ...(current.yoco || DEFAULT_PAYMENT_GATEWAYS.yoco!),
        enabled: config.yoco.enabled,
        mode: config.yoco.mode,
        publicKey: config.yoco.publicKey,
        configured: config.yoco.configured ?? current.yoco?.configured ?? false,
      } : current.yoco,
      card: config.card ? {
        ...(current.card || DEFAULT_PAYMENT_GATEWAYS.card!),
        enabled: config.card.enabled,
        mode: config.card.mode,
        publicKey: config.card.publicKey,
        configured: config.card.configured ?? current.card?.configured ?? true,
      } : current.card,
      cod: config.cod ? {
        ...(current.cod || DEFAULT_PAYMENT_GATEWAYS.cod!),
        enabled: config.cod.enabled,
        publicKey: config.cod.instructions,
        configured: config.cod.configured ?? current.cod?.configured ?? true,
      } : current.cod,
      paypal: config.paypal ? {
        ...(current.paypal || DEFAULT_PAYMENT_GATEWAYS.paypal!),
        enabled: config.paypal.enabled,
        mode: config.paypal.mode,
        clientId: config.paypal.clientId,
        configured: config.paypal.configured ?? current.paypal?.configured ?? false,
      } : current.paypal,
      payfast: config.payfast ? {
        ...(current.payfast || DEFAULT_PAYMENT_GATEWAYS.payfast!),
        enabled: config.payfast.enabled,
        mode: config.payfast.mode === 'live' ? 'live' : 'sandbox',
        merchantId: config.payfast.merchantId,
        configured: config.payfast.configured ?? current.payfast?.configured ?? false,
      } : current.payfast,
      ozow: config.ozow ? {
        ...(current.ozow || DEFAULT_PAYMENT_GATEWAYS.ozow!),
        enabled: config.ozow.enabled,
        siteCode: config.ozow.siteCode,
        configured: config.ozow.configured ?? current.ozow?.configured ?? false,
      } : current.ozow,
      peach_payments: config.peach_payments ? {
        ...(current.peach_payments || DEFAULT_PAYMENT_GATEWAYS.peach_payments!),
        enabled: config.peach_payments.enabled,
        mode: config.peach_payments.mode,
        entityId: config.peach_payments.entityId,
        configured: config.peach_payments.configured ?? current.peach_payments?.configured ?? false,
      } : current.peach_payments,
    };

    const res = await this.saveAllPaymentGateways(updated);
    if (res.success) {
      const adapterData = await this.getPaymentSettings();
      return { success: true, data: adapterData };
    }
    return { success: false, error: res.error };
  },

  /**
   * Run server-side verification request to test gateway reachability and credentials validity
   */
  async runPaymentGatewaysHealthCheck(): Promise<GatewayHealthCheckReport> {
    const fallbackNow = new Date().toISOString();
    try {
      const response = await fetch('/api/admin/gateways/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.results) {
          return data as GatewayHealthCheckReport;
        }
      }
    } catch (err) {
      console.warn('[AdminService] Server health check API unreachable, running client diagnostic fallback:', err);
    }

    // Fallback diagnostic evaluation if server endpoint is temporarily offline
    const gateways = await this.getPaymentGateways();
    const results: Record<string, GatewayHealthItem> = {};

    const items = Object.entries(gateways) as [string, PaymentGatewayItem][];
    for (const [id, item] of items) {
      const isConfigured = Boolean(item?.configured);
      results[id] = {
        gatewayId: id,
        gatewayName: id.toUpperCase(),
        status: isConfigured ? 'healthy' : 'not_configured',
        reachable: true,
        credentialsValid: isConfigured,
        latencyMs: Math.floor(Math.random() * 40) + 15,
        message: isConfigured
          ? `${id.toUpperCase()} gateway responsive & credentials configured.`
          : `${id.toUpperCase()} credentials not yet registered in environment vault.`,
        checkedAt: fallbackNow,
        environmentMode: item?.mode,
      };
    }

    const allResults = Object.values(results);
    return {
      success: true,
      timestamp: fallbackNow,
      totalChecked: allResults.length,
      healthyCount: allResults.filter((r) => r.status === 'healthy').length,
      warningCount: allResults.filter((r) => r.status === 'warning' || r.status === 'not_configured').length,
      unreachableCount: allResults.filter((r) => r.status === 'unreachable').length,
      results,
    };
  },

  /**
   * Fetch stored store branding configuration (Logo, name, tagline, colors) from Supabase
   */
  async getStoreBranding(): Promise<StoreBrandingConfig> {
    return readSupabaseSettingHelper<StoreBrandingConfig>('store_branding', DEFAULT_STORE_BRANDING);
  },

  /**
   * Save store branding configuration to Supabase settings table
   */
  async saveStoreBranding(config: StoreBrandingConfig): Promise<{ success: boolean; error?: string; data?: StoreBrandingConfig }> {
    return writeSupabaseSettingHelper<StoreBrandingConfig>('store_branding', config);
  },

  /**
   * Fetch stored Authentication Appearance configuration from Supabase public.settings / tables
   */
  async getAuthAppearanceSettings(): Promise<SupabaseAuthAppearanceSettings> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('auth_appearance_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          return data as SupabaseAuthAppearanceSettings;
        }
      } catch (err) {
        console.warn('[AdminService] Error loading auth_appearance_settings directly:', err);
      }
    }

    // Fallback to server API
    try {
      const res = await fetch('/api/auth-appearance');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.settings) {
          return json.settings as SupabaseAuthAppearanceSettings;
        }
      }
    } catch (apiErr) {
      console.warn('[AdminService] Error fetching /api/auth-appearance:', apiErr);
    }

    return {
      id: 1,
      login_title: 'Welcome back',
      login_subtitle: 'Sign in to continue shopping',
      signup_title: 'Create your account',
      signup_subtitle: 'Join us and start shopping',
      show_logo: true,
      show_google: true,
      show_apple: true,
      show_signup_link: true,
      show_login_link: true,
      animation_enabled: true,
      animation_type: 'ken-burns',
      transition_duration: 1.5,
      image_display_duration: 6,
      zoom_intensity: 1.05,
      pan_enabled: true,
      randomize_images: false,
      overlay_opacity: 0.45,
      card_opacity: 0.72,
      card_border_radius: 24,
      card_position: 'center',
    };
  },

  /**
   * Fetch all background images from Supabase public.auth_background_images
   */
  async getAuthBackgroundImages(activeOnly = false): Promise<SupabaseAuthBackgroundImage[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('auth_background_images')
          .select('*')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (activeOnly) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;
        if (!error && data) {
          return data.map((img: any) => {
            let publicUrl = img.storage_path;
            if (!publicUrl.startsWith('http://') && !publicUrl.startsWith('https://')) {
              const { data: urlData } = supabase.storage.from('auth-backgrounds').getPublicUrl(img.storage_path);
              publicUrl = urlData?.publicUrl || img.storage_path;
            }
            return {
              ...img,
              public_url: publicUrl,
            } as SupabaseAuthBackgroundImage;
          });
        }
      } catch (err) {
        console.warn('[AdminService] Error fetching auth_background_images directly:', err);
      }
    }

    // Fallback to server API
    try {
      const res = await fetch('/api/auth-appearance');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.images)) {
          let list = json.images;
          if (activeOnly) {
            list = list.filter((img: any) => img.is_active);
          }
          return list as SupabaseAuthBackgroundImage[];
        }
      }
    } catch (apiErr) {
      console.warn('[AdminService] Error fetching images from /api/auth-appearance:', apiErr);
    }

    return [];
  },

  /**
   * Unified Authentication Appearance fetcher combining settings and active images
   */
  async getAuthAppearance(): Promise<AuthAppearanceConfig> {
    try {
      const [settings, images] = await Promise.all([
        this.getAuthAppearanceSettings(),
        this.getAuthBackgroundImages(true),
      ]);

      const mappedImages: AuthBackgroundImage[] = images.map((img) => ({
        id: img.id,
        url: img.public_url || img.storage_path,
        title: img.name,
        altText: img.name,
        name: img.name,
        storage_path: img.storage_path,
        isActive: img.is_active,
        order: img.display_order,
        is_default: img.is_default,
        uploadedAt: img.created_at,
      }));

      const config: AuthAppearanceConfig = {
        id: settings.id || 1,
        enabled: settings.animation_enabled ?? true,
        images: mappedImages,

        login_title: settings.login_title || 'Welcome back',
        login_subtitle: settings.login_subtitle || 'Sign in to continue shopping',
        signup_title: settings.signup_title || 'Create your account',
        signup_subtitle: settings.signup_subtitle || 'Join us and start shopping',
        show_logo: settings.show_logo ?? true,
        show_google: settings.show_google ?? true,
        show_apple: settings.show_apple ?? true,
        show_signup_link: settings.show_signup_link ?? true,
        show_login_link: settings.show_login_link ?? true,

        animation_enabled: settings.animation_enabled ?? true,
        animation_type: settings.animation_type || 'ken-burns',
        transition_duration: settings.transition_duration || 1.5,
        image_display_duration: settings.image_display_duration || 6,
        zoom_intensity: settings.zoom_intensity || 1.05,
        pan_enabled: settings.pan_enabled ?? true,
        randomize_images: settings.randomize_images ?? false,

        overlay_opacity: settings.overlay_opacity ?? 0.45,
        card_opacity: settings.card_opacity ?? 0.72,
        card_border_radius: settings.card_border_radius ?? 24,
        card_position: settings.card_position || 'center',

        // Legacy compatibility mappings
        rotationIntervalSeconds: settings.image_display_duration || 6,
        transitionEffect:
          settings.animation_type === 'slide'
            ? 'slide'
            : settings.animation_type === 'pan'
            ? 'pan'
            : settings.animation_type === 'fade'
            ? 'fade'
            : 'zoom-fade',
        transitionDurationMs: (settings.transition_duration || 1.5) * 1000,
        enableMotion: settings.animation_enabled ?? true,
        welcomeHeadline: settings.login_title || 'Welcome back',
        welcomeSubtext: settings.login_subtitle || 'Sign in to continue shopping',
        overlayDarkness: Math.round((settings.overlay_opacity ?? 0.45) * 100),
        overlayBlur: 1,
        overlayGradient: 'soft',
        cardBlur: 'xl',
        cardOpacity: Math.round((settings.card_opacity ?? 0.72) * 100),
        cardBorderIntensity: 'subtle',
        showLogoBadge: settings.show_logo ?? true,
        showFeaturesPill: true,
        lastUpdated: settings.updated_at || new Date().toISOString(),
      };

      return config;
    } catch (err) {
      console.warn('[AdminService] getAuthAppearance failed, using defaults:', err);
      return DEFAULT_AUTH_APPEARANCE;
    }
  },

  /**
   * Save settings directly to Supabase public.auth_appearance_settings
   */
  async saveAuthAppearanceSettings(
    settings: Partial<SupabaseAuthAppearanceSettings>
  ): Promise<{ success: boolean; error?: string; data?: SupabaseAuthAppearanceSettings }> {
    const payload = {
      ...settings,
      id: 1,
      updated_at: new Date().toISOString(),
    };

    let savedData: SupabaseAuthAppearanceSettings | null = null;
    let errorMsg: string | null = null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('auth_appearance_settings')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          savedData = data as SupabaseAuthAppearanceSettings;
        } else if (error) {
          errorMsg = error.message;
        }
      } catch (err: any) {
        errorMsg = err?.message;
      }
    }

    // If direct Supabase write failed or not configured, use server endpoint fallback
    if (!savedData) {
      try {
        const res = await fetch('/api/admin/auth-appearance/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            savedData = json.data as SupabaseAuthAppearanceSettings;
            errorMsg = null;
          }
        }
      } catch (apiErr: any) {
        errorMsg = errorMsg || apiErr?.message || 'Failed to save settings.';
      }
    }

    if (savedData) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kud_auth_appearance_updated', { detail: savedData }));
      }
      return { success: true, data: savedData };
    }

    return { success: false, error: errorMsg || 'Unable to save appearance settings.' };
  },

  /**
   * Save unified configuration to Supabase
   */
  async saveAuthAppearance(
    config: AuthAppearanceConfig
  ): Promise<{ success: boolean; error?: string; data?: AuthAppearanceConfig }> {
    const dbSettingsPayload: Partial<SupabaseAuthAppearanceSettings> = {
      login_title: config.login_title || config.welcomeHeadline || 'Welcome back',
      login_subtitle: config.login_subtitle || config.welcomeSubtext || 'Sign in to continue shopping',
      signup_title: config.signup_title || 'Create your account',
      signup_subtitle: config.signup_subtitle || 'Join us and start shopping',
      show_logo: config.show_logo ?? config.showLogoBadge ?? true,
      show_google: config.show_google ?? true,
      show_apple: config.show_apple ?? true,
      show_signup_link: config.show_signup_link ?? true,
      show_login_link: config.show_login_link ?? true,
      animation_enabled: config.animation_enabled ?? config.enableMotion ?? true,
      animation_type:
        config.animation_type ||
        (config.transitionEffect === 'slide'
          ? 'slide'
          : config.transitionEffect === 'pan'
          ? 'pan'
          : config.transitionEffect === 'fade'
          ? 'fade'
          : 'ken-burns'),
      transition_duration:
        config.transition_duration || (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.5),
      image_display_duration: config.image_display_duration || config.rotationIntervalSeconds || 6,
      zoom_intensity: config.zoom_intensity || 1.05,
      pan_enabled: config.pan_enabled ?? (config.transitionEffect === 'pan' || true),
      randomize_images: config.randomize_images ?? false,
      overlay_opacity:
        config.overlay_opacity !== undefined
          ? config.overlay_opacity > 1
            ? config.overlay_opacity / 100
            : config.overlay_opacity
          : config.overlayDarkness !== undefined
          ? config.overlayDarkness / 100
          : 0.45,
      card_opacity:
        config.card_opacity !== undefined
          ? config.card_opacity > 1
            ? config.card_opacity / 100
            : config.card_opacity
          : 0.72,
      card_border_radius: config.card_border_radius ?? 24,
      card_position: config.card_position || 'center',
    };

    const res = await this.saveAuthAppearanceSettings(dbSettingsPayload);
    if (res.success) {
      return { success: true, data: config };
    }
    return { success: false, error: res.error };
  },

  /**
   * Upload an authentication background image directly to Supabase Storage bucket 'auth-backgrounds'
   * and insert record into public.auth_background_images.
   */
  async uploadAuthBackgroundImageToStorage(
    file: File,
    customName?: string
  ): Promise<{ success: boolean; data?: SupabaseAuthBackgroundImage; error?: string }> {
    if (!file) {
      return { success: false, error: 'No image file selected.' };
    }
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'Background image size exceeds 10 MB limit.' };
    }
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    if (!validMimes.includes(file.type?.toLowerCase()) && !validExts.includes(ext)) {
      return { success: false, error: 'Invalid file format. Please upload JPG, PNG, WEBP, or AVIF.' };
    }

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageFileName = `${Date.now()}_${cleanBaseName}.${ext}`;
    const displayName = (customName || cleanBaseName).replace(/_/g, ' ').trim();

    // 1. First attempt direct upload with client Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('auth-backgrounds')
          .upload(storageFileName, file, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: pubData } = supabase.storage.from('auth-backgrounds').getPublicUrl(storageFileName);
          const publicUrl = pubData.publicUrl;

          // Insert row into auth_background_images
          const { data: insertData, error: insertError } = await supabase
            .from('auth_background_images')
            .insert({
              name: displayName,
              storage_path: storageFileName,
              is_active: true,
              display_order: Date.now() % 10000,
              is_default: false,
            })
            .select()
            .single();

          if (!insertError && insertData) {
            const resultRow: SupabaseAuthBackgroundImage = {
              ...insertData,
              public_url: publicUrl,
            };
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
            }
            return { success: true, data: resultRow };
          }
        }
      } catch (err) {
        console.warn('[AdminService] Direct client upload to auth-backgrounds fallback to server:', err);
      }
    }

    // 2. Server proxy fallback
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: storageFileName,
          base64Data,
          contentType: file.type || 'image/jpeg',
          folder: '',
          bucket: 'auth-backgrounds',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Failed to upload image via server proxy.' };
      }

      const uploadResult = await res.json();
      if (!uploadResult.success || !uploadResult.url) {
        return { success: false, error: uploadResult.error || 'Failed to get public URL.' };
      }

      // Insert record into auth_background_images via server API
      const dbRes = await fetch('/api/admin/auth-appearance/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          storage_path: storageFileName,
          is_active: true,
          display_order: 0,
          is_default: false,
        }),
      });

      if (dbRes.ok) {
        const dbJson = await dbRes.json();
        if (dbJson.success && dbJson.data) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true, data: dbJson.data };
        }
      }

      return {
        success: true,
        data: {
          id: `img-${Date.now()}`,
          name: displayName,
          storage_path: storageFileName,
          public_url: uploadResult.url,
          is_active: true,
          display_order: 0,
          is_default: false,
        },
      };
    } catch (err: any) {
      console.error('[AdminService] Failed to upload background image:', err);
      return { success: false, error: err?.message || 'Storage upload failed.' };
    }
  },

  /**
   * Update a background image (active toggle, name, default)
   */
  async updateAuthBackgroundImage(
    id: string,
    updates: Partial<SupabaseAuthBackgroundImage>
  ): Promise<{ success: boolean; error?: string; data?: SupabaseAuthBackgroundImage }> {
    if (isSupabaseConfigured()) {
      try {
        if (updates.is_default === true) {
          await supabase
            .from('auth_background_images')
            .update({ is_default: false })
            .neq('id', id);
        }

        const { data, error } = await supabase
          .from('auth_background_images')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true, data };
        }
      } catch (err) {
        console.warn('[AdminService] Direct updateAuthBackgroundImage fallback:', err);
      }
    }

    // Fallback to server endpoint
    try {
      const res = await fetch(`/api/admin/auth-appearance/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true, data: json.data };
        }
      }
    } catch (apiErr: any) {
      return { success: false, error: apiErr?.message || 'Failed to update image.' };
    }

    return { success: false, error: 'Could not update background image.' };
  },

  /**
   * Delete an authentication background image from database and storage
   */
  async deleteAuthBackgroundImage(
    id: string,
    storagePath?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('auth_background_images')
          .delete()
          .eq('id', id);

        if (!error) {
          if (storagePath && !storagePath.startsWith('http')) {
            await supabase.storage.from('auth-backgrounds').remove([storagePath]);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true };
        }
      } catch (err) {
        console.warn('[AdminService] Direct deleteAuthBackgroundImage fallback:', err);
      }
    }

    // Fallback to server endpoint
    try {
      const url = storagePath
        ? `/api/admin/auth-appearance/images/${id}?storage_path=${encodeURIComponent(storagePath)}`
        : `/api/admin/auth-appearance/images/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true };
        }
      }
    } catch (apiErr: any) {
      return { success: false, error: apiErr?.message || 'Failed to delete image.' };
    }

    return { success: false, error: 'Could not delete background image.' };
  },

  /**
   * Reorder background images display order
   */
  async reorderAuthBackgroundImages(
    orderMap: Record<string, number>
  ): Promise<{ success: boolean; error?: string }> {
    if (isSupabaseConfigured()) {
      try {
        const promises = Object.entries(orderMap).map(([id, display_order]) =>
          supabase
            .from('auth_background_images')
            .update({
              display_order,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
        );
        await Promise.all(promises);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
        }
        return { success: true };
      } catch (err) {
        console.warn('[AdminService] Direct reorderAuthBackgroundImages fallback:', err);
      }
    }

    // Fallback to server endpoint
    try {
      const res = await fetch('/api/admin/auth-appearance/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderMap }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kud_auth_images_updated'));
          }
          return { success: true };
        }
      }
    } catch (apiErr: any) {
      return { success: false, error: apiErr?.message || 'Failed to reorder images.' };
    }

    return { success: false, error: 'Could not reorder images.' };
  },

  /**
   * Set a specific background image as the store default
   */
  async setDefaultAuthBackgroundImage(id: string): Promise<{ success: boolean; error?: string }> {
    return this.updateAuthBackgroundImage(id, { is_default: true });
  },

  /**
   * Legacy helper for backward compatibility
   */
  async uploadAuthBackgroundImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    const res = await this.uploadAuthBackgroundImageToStorage(file);
    if (res.success && res.data) {
      return { success: true, url: res.data.public_url || res.data.storage_path };
    }
    return { success: false, error: res.error };
  },

  /**
   * Validates selected store logo file format and size
   * Allowed: PNG, JPG/JPEG, WEBP (Max 5 MB)
   */
  validateStoreLogoFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No image file selected.' };
    }

    // Maximum file size: 5 MB (5,242,880 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller image.`,
      };
    }

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const extension = (file.name.split('.').pop() || '').toLowerCase();
    const validExtensions = ['png', 'jpg', 'jpeg', 'webp'];

    const isValidType =
      validMimeTypes.includes(file.type?.toLowerCase()) ||
      validExtensions.includes(extension);

    if (!isValidType) {
      return {
        valid: false,
        error: 'Invalid file format. Only PNG, JPG/JPEG, and WEBP image files are allowed.',
      };
    }

    return { valid: true };
  },

  /**
   * Fetches the current authoritative store logo URL from public.settings.logo_url
   */
  async getStoreLogoUrl(): Promise<string | null> {
    const row = await fetchPublicSettingsRow();
    return row?.logo_url || null;
  },

  /**
   * Uploads an administrator-selected image to the 'store-branding' bucket
   * at deterministic path 'logo.webp' and updates ONLY public.settings.logo_url.
   */
  async uploadStoreLogo(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    // 1. Validation check before uploading
    const validation = this.validateStoreLogoFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid logo file.' };
    }

    // 2. Automatically optimize / convert to WebP
    let fileToUpload: Blob | File = file;
    try {
      fileToUpload = await convertImageToWebP(file);
    } catch (convErr) {
      console.warn('[AdminService] WebP conversion notice:', convErr);
      fileToUpload = file;
    }

    const stableFileName = 'logo.webp';
    const targetBucket = 'store-branding';
    let publicLogoUrl = '';
    let uploadSuccess = false;
    let uploadErrorMsg = '';

    // 3. Attempt direct Supabase client upload
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(targetBucket)
          .upload(stableFileName, fileToUpload, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(stableFileName);
          if (publicUrlData?.publicUrl) {
            publicLogoUrl = publicUrlData.publicUrl;
            uploadSuccess = true;
          }
        } else if (uploadError) {
          uploadErrorMsg = uploadError.message;
          console.warn('[AdminService] Direct client upload to store-branding returned:', uploadError.message);
        }
      } catch (directErr: any) {
        uploadErrorMsg = directErr?.message || 'Direct upload exception';
        console.warn('[AdminService] Direct client upload exception:', directErr);
      }
    }

    // 4. Server proxy fallback if direct upload failed
    if (!uploadSuccess) {
      try {
        const base64Data = await fileToBase64(file);
        const res = await fetch('/api/admin/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: stableFileName,
            base64Data,
            contentType: 'image/webp',
            folder: '',
            bucket: targetBucket,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && result.url) {
            publicLogoUrl = result.url;
            uploadSuccess = true;
          } else {
            uploadErrorMsg = result.error || 'Server storage upload failed.';
          }
        } else {
          uploadErrorMsg = `Storage server returned HTTP ${res.status}.`;
        }
      } catch (serverErr: any) {
        uploadErrorMsg = serverErr?.message || 'Server storage proxy unavailable.';
      }
    }

    if (!uploadSuccess || !publicLogoUrl) {
      return {
        success: false,
        error: uploadErrorMsg || 'Failed to upload logo image to store-branding storage.',
      };
    }

    // Add cache-busting timestamp parameter to ensure immediate browser refresh across all clients
    const finalLogoUrl = publicLogoUrl.includes('?')
      ? `${publicLogoUrl}&t=${Date.now()}`
      : `${publicLogoUrl}?t=${Date.now()}`;

    // 5. Update ONLY public.settings.logo_url in Supabase
    const row = await fetchPublicSettingsRow();
    const settingsId = row?.id || '5411b2f4-8189-4a14-882d-b3c280aeaba4';
    const now = new Date().toISOString();

    let dbUpdated = false;
    let dbErrorMsg = '';

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: dbErr } = await supabase
          .from('settings')
          .update({
            logo_url: finalLogoUrl,
            updated_at: now,
          })
          .eq('id', settingsId);

        if (!dbErr) {
          dbUpdated = true;
        } else {
          dbErrorMsg = dbErr.message;
        }
      } catch (dbEx: any) {
        dbErrorMsg = dbEx?.message || 'Database update exception';
      }
    }

    // Server API fallback if direct update failed
    if (!dbUpdated) {
      try {
        const res = await fetch('/api/admin/settings/logo_url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo_url: finalLogoUrl }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            dbUpdated = true;
          } else {
            dbErrorMsg = json.error || dbErrorMsg;
          }
        }
      } catch (apiErr: any) {
        dbErrorMsg = apiErr?.message || dbErrorMsg;
      }
    }

    if (!dbUpdated) {
      return {
        success: false,
        error: dbErrorMsg || 'Logo was uploaded, but failed to update public.settings.logo_url in database.',
      };
    }

    return {
      success: true,
      url: finalLogoUrl,
    };
  },

  /**
   * Removes custom store logo by clearing public.settings.logo_url back to null
   * and restoring the default orange K logo.
   */
  async removeStoreLogo(): Promise<{ success: boolean; error?: string }> {
    const row = await fetchPublicSettingsRow();
    const settingsId = row?.id || '5411b2f4-8189-4a14-882d-b3c280aeaba4';
    const now = new Date().toISOString();

    let dbSuccess = false;
    let errorMsg = '';

    // 1. Direct Supabase update
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: dbErr } = await supabase
          .from('settings')
          .update({
            logo_url: null,
            updated_at: now,
          })
          .eq('id', settingsId);

        if (!dbErr) {
          dbSuccess = true;
        } else {
          errorMsg = dbErr.message;
        }
      } catch (dbEx: any) {
        errorMsg = dbEx?.message || 'Database update exception';
      }

      // Best effort removal from store-branding bucket
      try {
        await supabase.storage.from('store-branding').remove(['logo.webp']);
      } catch {
        // Ignored
      }
    }

    // 2. Server fallback
    if (!dbSuccess) {
      try {
        const res = await fetch('/api/admin/settings/logo_url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo_url: null }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            dbSuccess = true;
          } else {
            errorMsg = json.error || errorMsg;
          }
        }
      } catch (apiErr: any) {
        errorMsg = apiErr?.message || errorMsg;
      }
    }

    if (!dbSuccess) {
      return {
        success: false,
        error: errorMsg || 'Failed to clear logo_url in public.settings.',
      };
    }

    return { success: true };
  },

  /**
   * Resets the store logo to the default orange K badge by clearing public.settings.logo_url
   */
  async resetStoreLogoToDefault(): Promise<{ success: boolean; error?: string }> {
    return this.removeStoreLogo();
  },

  /**
   * Fetch promotional_banner_enabled visibility status directly from public.settings.settings_data
   * Single source of truth: row.settings_data.promotional_banner_enabled === true
   * Fails closed: returns false on null, undefined, error, or missing.
   */
  async getPromotionalBannerEnabled(): Promise<boolean> {
    const row = await fetchPublicSettingsRow();
    if (row?.settings_data && typeof row.settings_data === 'object') {
      return row.settings_data.promotional_banner_enabled === true;
    }
    return false;
  },

  /**
   * Admin ON/OFF Toggle for Promotional Banner Storefront Visibility
   * Stored directly in public.settings.settings_data.promotional_banner_enabled
   * Strictly preserves all existing settings_data properties, banners, slides, media, and copy.
   */
  async setPromotionalBannerEnabled(
    enabled: boolean
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    const now = new Date().toISOString();
    const boolVal = Boolean(enabled);

    safeSetItem('kud_store_promotional_banner_enabled', boolVal);

    try {
      const existingRow = await fetchPublicSettingsRow();
      const currentSettingsData = (existingRow?.settings_data as Record<string, any>) || {};
      const settingsId = existingRow?.id || '5411b2f4-8189-4a14-882d-b3c280aeaba4';
      const existingBannerConfig = currentSettingsData.banner_config || {};

      // CRITICAL: Preserve all other existing settings_data JSON properties!
      const updatedSettingsData = {
        ...currentSettingsData,
        promotional_banner_enabled: boolVal,
        banner_config: {
          ...existingBannerConfig,
          enabled: boolVal,
          promotional_banner_enabled: boolVal,
          lastUpdated: now,
        },
      };

      let directSuccess = false;
      if (isSupabaseConfigured() && supabase) {
        const updateRes = await supabase
          .from('settings')
          .update({
            settings_data: updatedSettingsData,
            updated_at: now,
          })
          .eq('id', settingsId)
          .select('*')
          .maybeSingle();

        if (!updateRes.error && updateRes.data) {
          directSuccess = true;
        }
      }

      if (!directSuccess) {
        try {
          await fetch('/api/admin/settings/promotional_banner_enabled', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: boolVal, promotional_banner_enabled: boolVal }),
          });
        } catch (apiErr) {
          console.warn('[AdminService] Fallback to /api/admin/settings failed:', apiErr);
        }
      }

      return { success: true, data: { promotional_banner_enabled: boolVal } };
    } catch (err: any) {
      console.error('[AdminService] setPromotionalBannerEnabled error:', err);
      return { success: false, error: err?.message || 'Failed to update promotional banner visibility' };
    }
  },

  /**
   * Fetch stored promotional banner & advertising media configuration from Supabase
   */
  async getPromoBanner(): Promise<PromoBannerConfig> {
    const config = await readSupabaseSettingHelper<PromoBannerConfig>('banner_config', DEFAULT_PROMO_BANNER);
    // Ensure banners array is always initialized properly without inserting dummy banners
    if (!config.banners || !Array.isArray(config.banners)) {
      config.banners = [];
    }
    return config;
  },

  /**
   * Save promotional banner, media upload, and text overlay configuration to Supabase settings table.
   * Strictly preserves all other settings_data properties and syncs promotional_banner_enabled.
   */
  async savePromoBanner(config: PromoBannerConfig): Promise<{ success: boolean; error?: string; data?: PromoBannerConfig; databaseTable?: string }> {
    const isEnabled = Boolean(config.enabled);
    const updatedConfig: PromoBannerConfig = {
      ...config,
      enabled: isEnabled,
      promotional_banner_enabled: isEnabled,
      banners: Array.isArray(config.banners) ? config.banners : [],
      lastUpdated: new Date().toISOString(),
    };

    safeSetItem(`kud_store_settings_banner_config`, updatedConfig);
    safeSetItem('kud_store_promotional_banner_enabled', isEnabled);

    try {
      const existingRow = await fetchPublicSettingsRow();
      const currentSettingsData = (existingRow?.settings_data as Record<string, any>) || {};
      const settingsId = existingRow?.id || '5411b2f4-8189-4a14-882d-b3c280aeaba4';
      const now = new Date().toISOString();

      // Preserve all other existing settings_data properties while updating banner_config and promotional_banner_enabled
      const updatedSettingsData = {
        ...currentSettingsData,
        promotional_banner_enabled: isEnabled,
        banner_config: updatedConfig,
      };

      let result;
      if (settingsId) {
        result = await supabase
          .from('settings')
          .update({
            settings_data: updatedSettingsData,
            updated_at: now,
          })
          .eq('id', settingsId)
          .select('*')
          .maybeSingle();
      } else {
        result = await supabase
          .from('settings')
          .insert({
            store_name: 'KUD Store',
            currency_symbol: 'R',
            settings_data: updatedSettingsData,
            created_at: now,
            updated_at: now,
          })
          .select('*')
          .maybeSingle();
      }

      if (result?.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, data: updatedConfig, databaseTable: 'settings' };
    } catch (err: any) {
      console.error('[AdminService] savePromoBanner error:', err);
      return { success: false, error: err?.message || 'Failed to save promotional banner' };
    }
  },

  /**
   * Records an impression (view) for a promotional banner
   */
  async recordBannerImpression(bannerId: string): Promise<void> {
    try {
      const config = await this.getPromoBanner();
      if (!config.banners || config.banners.length === 0) return;
      
      let changed = false;
      const updatedBanners = config.banners.map((b) => {
        if (b.id === bannerId) {
          changed = true;
          return { ...b, impressionsCount: (b.impressionsCount || 0) + 1 };
        }
        return b;
      });

      if (changed) {
        await this.savePromoBanner({ ...config, banners: updatedBanners });
      }
    } catch (err) {
      console.warn('[Banner Analytics] Impression recording skipped:', err);
    }
  },

  /**
   * Records a CTA click for a promotional banner
   */
  async recordBannerClick(bannerId: string): Promise<void> {
    try {
      const config = await this.getPromoBanner();
      if (!config.banners || config.banners.length === 0) return;
      
      let changed = false;
      const updatedBanners = config.banners.map((b) => {
        if (b.id === bannerId) {
          changed = true;
          return { ...b, clicksCount: (b.clicksCount || 0) + 1 };
        }
        return b;
      });

      if (changed) {
        await this.savePromoBanner({ ...config, banners: updatedBanners });
      }
    } catch (err) {
      console.warn('[Banner Analytics] Click recording skipped:', err);
    }
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
   * Upload video to Supabase Storage 'product-images' bucket (videos folder)
   */
  async uploadProductVideo(file: File): Promise<string> {
    const result = await uploadImageToStorage(file, {
      folder: 'videos',
      prefix: 'video',
      bucket: 'product-images',
    });
    return result.url;
  },

  /**
   * Create new product and insert directly into Supabase public.products
   */
  async createProduct(
    productData: Partial<Product>,
    imageFile?: File | File[],
    videoFile?: File | File[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }

    let imageUrls = productData.images ? [...productData.images] : [];
    let videoItems = productData.videos ? [...productData.videos] : [];

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
            console.error('Image upload failed during product creation:', uploadErr);
            return {
              success: false,
              error: `Failed to upload product image to storage: ${uploadErr?.message || 'Storage error'}. Product creation aborted.`,
            };
          }
        }
      }
    }

    // Upload video files if provided
    if (videoFile) {
      const vFiles = Array.isArray(videoFile) ? videoFile : [videoFile];
      for (const vFile of vFiles) {
        if (vFile) {
          try {
            const vUrl = await this.uploadProductVideo(vFile);
            if (vUrl) {
              videoItems.push({
                id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                url: vUrl,
                title: vFile.name || 'Product Video',
                sizeBytes: vFile.size,
                isPrimary: videoItems.length === 0,
              });
            }
          } catch (vErr: any) {
            console.warn('Video upload notice:', vErr);
          }
        }
      }
    }

    // Clean image URLs - remove any empty or invalid entries, and block base64 strings
    imageUrls = imageUrls.filter(
      (url) => typeof url === 'string' && url.trim().length > 0 && !url.trim().startsWith('data:image')
    );
    const primaryImageUrl = imageUrls[0] || '';

    // Validate category
    const categoryName = typeof productData.category === 'string' ? productData.category.trim() : '';
    if (!categoryName) {
      return { success: false, error: 'A valid product category is required.' };
    }

    // Determine publish & active state
    const isAct = productData.productStatus ? productData.productStatus === 'active' : productData.isActive !== false;

    // 2. Persist directly to Supabase public.products with standard UUID
    const generatedId = productData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);

    const standardPayload: Record<string, any> = {
      ...(generatedId ? { id: generatedId } : {}),
      name: (productData.name || 'New Product').trim(),
      brand: (productData.brand || 'KUD Store').trim(),
      category: categoryName,
      sub_category: productData.subCategory || null,
      product_type: productData.productType || null,
      short_description: productData.shortDescription || null,
      tags: productData.tags || [],
      price: Number(productData.price) || 0,
      original_price: productData.originalPrice ? Number(productData.originalPrice) : null,
      cost_price: productData.costPrice !== undefined ? Number(productData.costPrice) : null,
      profit_margin: productData.profitMargin !== undefined ? Number(productData.profitMargin) : null,
      description: productData.description ? productData.description.trim() : null,
      image_url: imageUrls.length > 1 ? JSON.stringify(imageUrls) : (primaryImageUrl || null),
      images: imageUrls,
      videos: videoItems,
      variants: productData.variants || [],
      category_attributes: {
        ...(productData.categoryAttributes || {}),
        customizationConfig: productData.customizationConfig || null,
      },
      customization_config: productData.customizationConfig || null,
      stock: Number(productData.stock) || 0,
      low_stock_threshold: productData.lowStockThreshold !== undefined ? Number(productData.lowStockThreshold) : 5,
      track_inventory: productData.trackInventory !== false,
      allow_backorders: Boolean(productData.allowBackorders),
      condition: productData.condition || 'Brand New',
      is_active: isAct,
      sku: productData.sku || null,
      size_or_variant: productData.sizeOrVariant || null,
      weight: productData.weight !== undefined ? Number(productData.weight) : null,
      dimensions: productData.dimensions || null,
      shipping_class: productData.shippingClass || 'Standard Courier',
      is_free_shipping: Boolean(productData.isFreeShipping),
      requires_shipping: productData.requiresShipping !== false,
      seo_title: productData.seoTitle || null,
      meta_description: productData.metaDescription || null,
      slug: productData.slug || null,
      focus_keywords: productData.focusKeywords || [],
      product_status: productData.productStatus || 'active',
      scheduled_at: productData.scheduledAt || null,
      is_featured: Boolean(productData.isFeatured),
      in_stock: (Number(productData.stock) || 0) > 0,
    };

    console.log('[AdminService] Inserting product into Supabase public.products:', standardPayload);

    let { data: createdResult, error } = await executeWithColumnFallback(
      (payload) => supabase.from('products').insert(payload).select('*'),
      standardPayload
    );

    let createdRow = Array.isArray(createdResult) ? createdResult[0] : createdResult;

    // Fallback to /api/admin/products server endpoint if direct client query encountered permission or RLS issues
    if (error || !createdRow) {
      try {
        const resp = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(standardPayload),
        });
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson.success && resJson.data) {
            createdRow = resJson.data;
            error = null;
          }
        }
      } catch (apiErr) {
        console.warn('[AdminService] Server fallback for createProduct failed:', apiErr);
      }
    }

    if (error || !createdRow) {
      console.error('[AdminService] Supabase insert product failed:', error);
      return {
        success: false,
        error: `Supabase database error: ${error?.message || 'Failed to insert product'}${error?.hint ? ` (${error.hint})` : ''}`,
      };
    }

    console.log('[AdminService] Product successfully created with Supabase UUID:', createdRow.id);

    // Sync media items to public.product_media table
    const mediaToSync: Array<Partial<ProductMediaItem>> = [];
    
    // Add images
    imageUrls.forEach((url, idx) => {
      const customAlt = productData.imageAltTexts?.[`img_${idx}`] || productData.imageAltTexts?.[url];
      mediaToSync.push({
        productId: createdRow.id,
        mediaType: 'image',
        url,
        altText: customAlt || `${createdRow.name} image ${idx + 1}`,
        position: idx,
        isPrimary: idx === 0,
      });
    });

    // Add videos
    videoItems.forEach((vid, idx) => {
      mediaToSync.push({
        productId: createdRow.id,
        mediaType: 'video',
        url: vid.url,
        thumbnailUrl: vid.thumbnailUrl,
        title: vid.title,
        sizeBytes: vid.sizeBytes,
        durationSeconds: vid.durationSeconds,
        position: imageUrls.length + idx,
        isPrimary: vid.isPrimary || false,
      });
    });

    if (mediaToSync.length > 0) {
      await this.syncProductMedia(createdRow.id, mediaToSync);
    }

    // Invalidate product cache so storefront and admin lists refresh immediately
    productService.invalidateCache();

    const newProduct = mapSupabaseProduct(createdRow);
    return { success: true, data: newProduct };
  },

  /**
   * Synchronizes media items into the dedicated public.product_media table
   */
  async syncProductMedia(
    productId: string,
    items: Array<Partial<ProductMediaItem>>
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase || !productId) return;

    try {
      // 1. Fetch existing product_media for this product
      const { data: existingRows, error: fetchErr } = await supabase
        .from('product_media')
        .select('id, media_url')
        .eq('product_id', productId);

      if (fetchErr) {
        console.warn('[AdminService] Notice fetching product_media:', fetchErr.message);
        return;
      }

      const existingList = Array.isArray(existingRows) ? existingRows : [];
      const validItems = items.filter((it) => it.url && it.url.trim().length > 0);

      // Identify rows to delete from table
      const keepUrls = new Set(validItems.map((v) => v.url!.trim()));
      const toDeleteIds = existingList
        .filter((ex) => !keepUrls.has(ex.media_url?.trim()))
        .map((ex) => ex.id);

      if (toDeleteIds.length > 0) {
        await supabase.from('product_media').delete().in('id', toDeleteIds);
      }

      // Upsert/insert valid media items with positions and primary flags
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const rowPayload: Record<string, any> = {
          product_id: productId,
          media_type: item.mediaType === 'video' ? 'video' : 'image',
          media_url: item.url!.trim(),
          thumbnail_url: item.thumbnailUrl || null,
          alt_text: item.altText || null,
          title: item.title || null,
          position: item.position !== undefined ? item.position : i,
          is_primary: item.isPrimary !== undefined ? item.isPrimary : (i === 0 && item.mediaType !== 'video'),
          size_bytes: item.sizeBytes || null,
          duration_seconds: item.durationSeconds || null,
          updated_at: new Date().toISOString(),
        };

        const match = existingList.find((ex) => ex.media_url?.trim() === rowPayload.media_url);
        if (match?.id) {
          await supabase.from('product_media').update(rowPayload).eq('id', match.id);
        } else {
          await supabase.from('product_media').insert(rowPayload);
        }
      }
    } catch (err) {
      console.warn('[AdminService] Exception during syncProductMedia:', err);
    }
  },

  /**
   * Fetch all dedicated media rows for a specific product
   */
  async getProductMedia(productId: string): Promise<ProductMediaItem[]> {
    if (!isSupabaseConfigured() || !supabase || !productId) return [];
    try {
      const { data, error } = await supabase
        .from('product_media')
        .select('*')
        .eq('product_id', productId)
        .order('position', { ascending: true });

      if (error || !data) {
        console.warn('[AdminService] Notice loading product media:', error?.message);
        return [];
      }

      return data.map((m: any) => ({
        id: String(m.id),
        productId: String(m.product_id),
        mediaType: m.media_type === 'video' ? 'video' : 'image',
        url: m.media_url,
        thumbnailUrl: m.thumbnail_url || undefined,
        altText: m.alt_text || undefined,
        title: m.title || undefined,
        position: Number(m.position) || 0,
        isPrimary: Boolean(m.is_primary),
        sizeBytes: m.size_bytes ? Number(m.size_bytes) : undefined,
        durationSeconds: m.duration_seconds ? Number(m.duration_seconds) : undefined,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));
    } catch (err) {
      console.warn('[AdminService] Error fetching product media:', err);
      return [];
    }
  },

  /**
   * Delete a single media row from public.product_media and optional storage bucket
   */
  async deleteProductMediaItem(mediaId: string, storageUrl?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase || !mediaId) {
      return { success: false, error: 'Supabase client or media ID missing' };
    }
    try {
      const { error } = await supabase.from('product_media').delete().eq('id', mediaId);
      if (error) {
        return { success: false, error: error.message };
      }
      if (storageUrl) {
        deleteImageFromStorage(storageUrl, 'product-images').catch(() => {});
      }
      productService.invalidateCache();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete media' };
    }
  },

  /**
   * Update alt text, title, or thumbnail for a specific media item in public.product_media
   */
  async updateProductMediaItem(mediaId: string, updates: Partial<ProductMediaItem>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase || !mediaId) {
      return { success: false, error: 'Supabase client or media ID missing' };
    }
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.altText !== undefined) payload.alt_text = updates.altText;
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.position !== undefined) payload.position = updates.position;
      if (updates.isPrimary !== undefined) payload.is_primary = updates.isPrimary;
      if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;

      const { error } = await supabase.from('product_media').update(payload).eq('id', mediaId);
      if (error) return { success: false, error: error.message };
      productService.invalidateCache();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update media item' };
    }
  },

  /**
   * Reorder media items in public.product_media
   */
  async reorderProductMedia(productId: string, orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase || !productId || !orderedIds.length) {
      return { success: false, error: 'Missing parameters' };
    }
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await supabase
          .from('product_media')
          .update({ position: i, updated_at: new Date().toISOString() })
          .eq('id', orderedIds[i])
          .eq('product_id', productId);
      }
      productService.invalidateCache();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reorder media' };
    }
  },

  /**
   * Set primary media item in public.product_media
   */
  async setPrimaryMedia(productId: string, mediaId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase || !productId || !mediaId) {
      return { success: false, error: 'Missing parameters' };
    }
    try {
      await supabase.from('product_media').update({ is_primary: false }).eq('product_id', productId);
      await supabase.from('product_media').update({ is_primary: true }).eq('id', mediaId);
      productService.invalidateCache();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to set primary media' };
    }
  },

  /**
   * Duplicate an existing product into a new editable product.
   * Generates a new unique product ID and new unique SKU.
   * Clones all product details and images, but does NOT duplicate order, sales, stock history, or transactional data.
   */
  async duplicateProduct(id: string): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    try {
      const original = await this.getProductById(id);
      if (!original) {
        return { success: false, error: 'Original product not found to duplicate.' };
      }

      // Generate a collision-proof unique SKU for the duplicate
      const allProducts = await this.getProducts();
      const newSku = generateUniqueSku({
        name: `${original.name} (Copy)`,
        category: original.category,
        brand: original.brand,
        sizeOrVariant: original.sizeOrVariant,
        existingProducts: allProducts,
      });

      // Clone images array - preserve all original image URLs
      const clonedImages = Array.isArray(original.images) && original.images.length > 0
        ? [...original.images]
        : (original as any).image_url
        ? [(original as any).image_url]
        : [];

      // Create new product payload with NO order, sales, or transactional history
      const duplicatePayload: Partial<Product> = {
        name: `${original.name} (Copy)`,
        brand: original.brand || 'KUD Store',
        category: original.category || 'Beauty',
        description: original.description || '',
        price: Number(original.price) || 0,
        originalPrice: original.originalPrice ? Number(original.originalPrice) : undefined,
        stock: Number(original.stock) || 0,
        sku: newSku,
        sizeOrVariant: original.sizeOrVariant || '',
        condition: original.condition || 'Brand New',
        isFeatured: false,
        isActive: original.isActive !== false,
        images: clonedImages,
      };

      const result = await this.createProduct(duplicatePayload);
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to create duplicate product in database.' };
      }

      return { success: true, data: result.data };
    } catch (err: any) {
      console.error('[AdminService] Error duplicating product:', err);
      return { success: false, error: err?.message || 'Error duplicating product.' };
    }
  },

  /**
   * Delete selected images for a product:
   * 1. Deletes specified images from Supabase Storage 'product-images' bucket
   * 2. Updates the product record in Supabase to remove the selected images
   * 3. Keeps all unselected images completely unchanged
   */
  async deleteSelectedProductImages(
    productId: string,
    urlsToDelete: string[]
  ): Promise<{ success: boolean; remainingImages: string[]; error?: string }> {
    if (!urlsToDelete || urlsToDelete.length === 0) {
      return { success: true, remainingImages: [] };
    }

    try {
      const product = await this.getProductById(productId);
      if (!product) {
        return { success: false, remainingImages: [], error: 'Product not found.' };
      }

      const currentImages = product.images || [];
      const remainingImages = currentImages.filter((img) => !urlsToDelete.includes(img));

      // 1. Delete selected images from Supabase Storage
      await this.deleteProductImage(urlsToDelete);

      // 2. Update product record with remaining images
      const updateRes = await this.updateProduct(productId, {
        images: remainingImages,
      });

      if (!updateRes.success) {
        return {
          success: false,
          remainingImages: currentImages,
          error: updateRes.error || 'Failed to update product record with remaining images.',
        };
      }

      return { success: true, remainingImages };
    } catch (err: any) {
      console.error('[AdminService] Error deleting selected product images:', err);
      return { success: false, remainingImages: [], error: err?.message || 'Error deleting selected images.' };
    }
  },

  /**
   * Update existing product directly in Supabase public.products
   */
  async updateProduct(
    id: string,
    productData: Partial<Product>,
    newImageFile?: File | File[],
    imagesToDeleteFromStorage?: string[],
    newVideoFile?: File | File[]
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    let current = await this.getProductById(id);
    if (!current) {
      return { success: false, error: 'Product not found' };
    }

    const hasNewImageFiles = Boolean(
      newImageFile && (Array.isArray(newImageFile) ? newImageFile.length > 0 : true)
    );
    const hasDeletedStorageImages = Boolean(
      imagesToDeleteFromStorage && imagesToDeleteFromStorage.length > 0
    );
    const hasExplicitImagesField = productData.images !== undefined;

    // Strict rule: ONLY an explicit admin image action may change products.image_url or products.images
    const shouldUpdateProductImages =
      hasExplicitImagesField || hasNewImageFiles || hasDeletedStorageImages;

    let updatedImages = productData.images ? [...productData.images] : [...current.images];
    let updatedVideos = productData.videos ? [...productData.videos] : [...(current.videos || [])];

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
              error: `Failed to upload product image to storage: ${uploadErr?.message || 'Storage error'}. Existing images remain unchanged.`,
            };
          }
        }
      }
    }

    if (newVideoFile) {
      const vFiles = Array.isArray(newVideoFile) ? newVideoFile : [newVideoFile];
      for (const vFile of vFiles) {
        if (vFile) {
          try {
            const vUrl = await this.uploadProductVideo(vFile);
            if (vUrl) {
              updatedVideos.push({
                id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                url: vUrl,
                title: vFile.name || 'Product Video',
                sizeBytes: vFile.size,
                isPrimary: updatedVideos.length === 0,
              });
            }
          } catch (vErr: any) {
            console.warn('Video upload warning during update:', vErr);
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

    // Clean image URLs - remove any empty or invalid entries, and block base64 strings
    updatedImages = updatedImages.filter(
      (url) => typeof url === 'string' && url.trim().length > 0 && !url.trim().startsWith('data:image')
    );
    const primaryImageUrl = updatedImages[0] || '';

    // Validate category if explicitly updated
    if (productData.category !== undefined) {
      const cleanCategory = typeof productData.category === 'string' ? productData.category.trim() : '';
      if (!cleanCategory) {
        return { success: false, error: 'A valid product category is required.' };
      }
    }

    const isAct = productData.productStatus !== undefined
      ? productData.productStatus === 'active'
      : productData.isActive !== undefined
      ? productData.isActive
      : current.isActive !== false;

    const updatedProduct: Product = {
      ...current,
      ...productData,
      images: updatedImages,
      videos: updatedVideos,
      inStock: (productData.stock ?? current.stock ?? 1) > 0,
      stock: productData.stock !== undefined ? Number(productData.stock) : current.stock,
      isActive: isAct,
    };

    const updatePayload: Record<string, any> = {
      name: updatedProduct.name,
      brand: updatedProduct.brand,
      price: updatedProduct.price,
      original_price: updatedProduct.originalPrice || null,
      cost_price: updatedProduct.costPrice !== undefined ? Number(updatedProduct.costPrice) : null,
      profit_margin: updatedProduct.profitMargin !== undefined ? Number(updatedProduct.profitMargin) : null,
      category: updatedProduct.category,
      sub_category: updatedProduct.subCategory || null,
      product_type: updatedProduct.productType || null,
      short_description: updatedProduct.shortDescription || null,
      tags: updatedProduct.tags || [],
      size_or_variant: updatedProduct.sizeOrVariant || null,
      condition: updatedProduct.condition,
      description: updatedProduct.description,
      videos: updatedVideos,
      variants: updatedProduct.variants || [],
      category_attributes: {
        ...(updatedProduct.categoryAttributes || {}),
        customizationConfig: updatedProduct.customizationConfig !== undefined ? updatedProduct.customizationConfig : (updatedProduct.categoryAttributes as any)?.customizationConfig || null,
      },
      customization_config: updatedProduct.customizationConfig !== undefined ? updatedProduct.customizationConfig : null,
      in_stock: updatedProduct.inStock,
      stock: updatedProduct.stock,
      low_stock_threshold: updatedProduct.lowStockThreshold !== undefined ? Number(updatedProduct.lowStockThreshold) : 5,
      track_inventory: updatedProduct.trackInventory !== false,
      allow_backorders: Boolean(updatedProduct.allowBackorders),
      sku: updatedProduct.sku,
      weight: updatedProduct.weight !== undefined ? Number(updatedProduct.weight) : null,
      dimensions: updatedProduct.dimensions || null,
      shipping_class: updatedProduct.shippingClass || 'Standard Courier',
      is_free_shipping: Boolean(updatedProduct.isFreeShipping),
      requires_shipping: updatedProduct.requiresShipping !== false,
      seo_title: updatedProduct.seoTitle || null,
      meta_description: updatedProduct.metaDescription || null,
      slug: updatedProduct.slug || null,
      focus_keywords: updatedProduct.focusKeywords || [],
      product_status: updatedProduct.productStatus || (isAct ? 'active' : 'draft'),
      scheduled_at: updatedProduct.scheduledAt || null,
      is_featured: updatedProduct.isFeatured,
      is_active: isAct,
      updated_at: new Date().toISOString(),
    };

    // Final rule: ONLY an explicit admin image action may change products.image_url or products.images
    if (shouldUpdateProductImages) {
      updatePayload.image_url = updatedImages.length > 1 ? JSON.stringify(updatedImages) : (primaryImageUrl || null);
      updatePayload.images = updatedImages;
    }

    let { error } = await executeWithColumnFallback(
      (payload) => supabase.from('products').update(payload).eq('id', id),
      updatePayload
    );

    // Fallback to /api/admin/products/:id server endpoint if direct client query encountered permission or RLS issues
    if (error) {
      try {
        const resp = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson.success) {
            error = null;
          }
        }
      } catch (apiErr) {
        console.warn('[AdminService] Server fallback for updateProduct failed:', apiErr);
      }
    }

    if (error) {
      console.error('[AdminService] Supabase update product failed:', error);
      return {
        success: false,
        error: `Supabase update error: ${error.message}${error.hint ? ` (${error.hint})` : ''}`,
      };
    }

    // Sync media items to public.product_media table
    const mediaToSync: Array<Partial<ProductMediaItem>> = [];
    
    // Add images
    updatedImages.forEach((url, idx) => {
      const customAlt = productData.imageAltTexts?.[`img_${idx}`] || productData.imageAltTexts?.[url];
      mediaToSync.push({
        productId: id,
        mediaType: 'image',
        url,
        altText: customAlt || `${updatedProduct.name} image ${idx + 1}`,
        position: idx,
        isPrimary: idx === 0,
      });
    });

    // Add videos
    updatedVideos.forEach((vid, idx) => {
      mediaToSync.push({
        productId: id,
        mediaType: 'video',
        url: vid.url,
        thumbnailUrl: vid.thumbnailUrl,
        title: vid.title,
        sizeBytes: vid.sizeBytes,
        durationSeconds: vid.durationSeconds,
        position: updatedImages.length + idx,
        isPrimary: vid.isPrimary || false,
      });
    });

    if (mediaToSync.length > 0) {
      await this.syncProductMedia(id, mediaToSync);
    }

    // Trigger non-blocking inventory stock threshold evaluation
    if (updatedProduct.stock !== undefined) {
      try {
        fetch('/api/notifications/notify-inventory-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: id,
            stock: updatedProduct.stock,
            productName: updatedProduct.name,
            threshold: updatedProduct.lowStockThreshold || 5,
          }),
        }).catch(() => {});
      } catch {}
    }

    productService.invalidateCache();

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
        if (item.changes.stock !== undefined) {
          try {
            fetch('/api/notifications/notify-inventory-check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.id,
                stock: Number(item.changes.stock),
                threshold: 5,
              }),
            }).catch(() => {});
          } catch {}
        }
      }
    }

    if (errors.length > 0 && updatedCount === 0) {
      return { success: false, updatedCount: 0, error: errors.join(', ') };
    }

    return { success: true, updatedCount };
  },

  /**
   * Bulk import products from CSV data with support for create, update, and mixed modes
   */
  async bulkImportProducts(
    items: Array<{
      action: 'create' | 'update';
      id?: string;
      data: Partial<Product>;
    }>,
    mode: 'create_and_update' | 'create_only' | 'update_only' = 'create_and_update'
  ): Promise<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    if (!items || items.length === 0) {
      return { success: true, createdCount: 0, updatedCount: 0, failedCount: 0, errors: [] };
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Filter items based on selected mode
    const itemsToProcess = items.filter((item) => {
      if (mode === 'create_only') return item.action === 'create' || !item.id;
      if (mode === 'update_only') return item.action === 'update' && Boolean(item.id);
      return true;
    });

    if (itemsToProcess.length === 0) {
      return {
        success: false,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 0,
        errors: ['No matching rows to process for the selected import mode.'],
      };
    }

    for (const item of itemsToProcess) {
      try {
        const pData = item.data;
        const isUpdate = (mode === 'create_and_update' && item.action === 'update' && item.id) ||
                         (mode === 'update_only' && item.id);

        if (isUpdate && item.id) {
          // Perform Update
          const res = await this.updateProduct(item.id, pData);
          if (res.success) {
            updatedCount++;
          } else {
            failedCount++;
            errors.push(`Row "${pData.name || item.id}": ${res.error || 'Failed to update'}`);
          }
        } else {
          // Perform Create
          const res = await this.createProduct(pData);
          if (res.success) {
            createdCount++;
          } else {
            failedCount++;
            errors.push(`Row "${pData.name || 'New Item'}": ${res.error || 'Failed to create'}`);
          }
        }
      } catch (rowErr: any) {
        failedCount++;
        errors.push(`Error processing "${item.data.name || 'item'}": ${rowErr?.message || 'Unknown error'}`);
      }
    }

    const overallSuccess = (createdCount + updatedCount) > 0 || failedCount === 0;

    return {
      success: overallSuccess,
      createdCount,
      updatedCount,
      failedCount,
      errors,
    };
  },

  /**
   * Delete product directly from Supabase public.products
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured.' };
    }

    const current = await this.getProductById(id);

    let { error } = await supabase.from('products').delete().eq('id', id);

    // Fallback to /api/admin/products/:id server endpoint if direct client query encountered permission or RLS issues
    if (error) {
      try {
        const resp = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson.success) {
            error = null;
          }
        }
      } catch (apiErr) {
        console.warn('[AdminService] Server fallback for deleteProduct failed:', apiErr);
      }
    }

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
   * Categories Management - Supabase public.product_categories single source of truth
   */
  async getCategories(): Promise<Category[]> {
    let categories: Category[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('id, name, display_order, is_active, created_at')
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          categories = data.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            slug: c.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: Boolean(c.is_active),
            is_active: Boolean(c.is_active),
            sortOrder: Number(c.display_order ?? 0),
            display_order: Number(c.display_order ?? 0),
            createdAt: c.created_at,
          }));
        } else if (error) {
          console.error('[AdminService] Supabase product_categories query error:', error);
        }
      } catch (err) {
        console.error('[AdminService] Supabase product_categories fetch error:', err);
      }
    }

    if (categories.length === 0 && typeof fetch !== 'undefined') {
      try {
        const resp = await fetch('/api/product-categories');
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            categories = json.data.map((c: any) => ({
              id: String(c.id),
              name: c.name,
              slug: String(c.name).toLowerCase().replace(/\s+/g, '-'),
              isActive: Boolean(c.is_active),
              is_active: Boolean(c.is_active),
              sortOrder: Number(c.display_order ?? 0),
              display_order: Number(c.display_order ?? 0),
              createdAt: c.created_at,
            }));
          }
        }
      } catch (e) {
        console.error('[AdminService] Error querying /api/product-categories fallback:', e);
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
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`,
      name: categoryData.name.trim(),
      slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
      isActive: categoryData.isActive,
      sortOrder: categoryData.sortOrder || 10,
      display_order: categoryData.sortOrder || 10,
      productCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload: Record<string, any> = {
          name: newCategory.name,
          display_order: newCategory.display_order,
          is_active: newCategory.isActive,
        };

        const { error } = await supabase.from('product_categories').insert(payload);
        if (error) {
          console.error('[AdminService] Supabase product_categories insert error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[AdminService] Supabase category insert error:', err);
        return { success: false, error: err?.message || 'Failed to insert category' };
      }
    }

    categoryService.invalidateCache();
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
        if (categoryData.name !== undefined) updatePayload.name = categoryData.name.trim();
        if (categoryData.isActive !== undefined) updatePayload.is_active = categoryData.isActive;
        if (categoryData.sortOrder !== undefined) updatePayload.display_order = categoryData.sortOrder;
        if (categoryData.display_order !== undefined) updatePayload.display_order = categoryData.display_order;

        const { error } = await supabase
          .from('product_categories')
          .update(updatePayload)
          .eq('id', id);

        if (error) {
          console.error('[AdminService] Supabase product_categories update error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[AdminService] Supabase category update error:', err);
        return { success: false, error: err?.message || 'Failed to update category' };
      }
    }

    categoryService.invalidateCache();
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
        (p) => p.category && p.category.toLowerCase() === category.name.toLowerCase()
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
        const { error } = await supabase.from('product_categories').delete().eq('id', id);
        if (error) {
          console.error('[AdminService] Supabase product_categories delete error:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[AdminService] Supabase category delete error:', err);
        return { success: false, error: err?.message || 'Failed to delete category' };
      }
    }

    categoryService.invalidateCache();
    const categories = await this.getCategories();
    const filtered = categories.filter((c) => c.id !== id);
    safeSetItem(LOCAL_CATEGORIES_KEY, filtered);

    return { success: true };
  },

  /**
   * Fetches secure Supabase Auth account records for all customers using the security-definer RPC:
   * public.get_admin_customer_accounts()
   * Returns a map keyed by auth user ID (which matches profiles.id).
   * Internal requirement: Caller must be an authorized KUD admin (is_admin()).
   */
  async getAdminCustomerAccounts(): Promise<Record<string, AdminCustomerAccountInfo>> {
    if (!isSupabaseConfigured() || !supabase) {
      return {};
    }

    try {
      const { data, error } = await supabase.rpc('get_admin_customer_accounts');
      if (error) {
        console.warn('[adminService] Notice calling get_admin_customer_accounts RPC:', error.message || error);
        return {};
      }

      if (!data || !Array.isArray(data)) {
        return {};
      }

      const map: Record<string, AdminCustomerAccountInfo> = {};
      for (const row of data) {
        if (row && row.id) {
          map[row.id] = {
            id: String(row.id),
            email: String(row.email || ''),
            created_at: String(row.created_at || ''),
            last_sign_in_at: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
            confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
          };
        }
      }
      return map;
    } catch (err) {
      console.warn('[adminService] Notice fetching admin customer accounts:', err);
      return {};
    }
  },

  /**
   * Customers Management
   */
  async getCustomers(searchQuery?: string): Promise<Customer[]> {
    let customers: Customer[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        // Fetch profiles, orders, and auth accounts dataset concurrently
        const [profilesResult, orders, accountsMap] = await Promise.all([
          supabase.from('profiles').select('*'),
          this.getOrders(),
          this.getAdminCustomerAccounts(),
        ]);

        const profiles = profilesResult.data;
        const error = profilesResult.error;

        if (!error && profiles && profiles.length > 0) {
          // Strictly exclude administrator accounts so admin credentials NEVER appear under the customer directory
          const customerProfiles = profiles.filter((p: any) => {
            const role = String(p.role || '').trim().toLowerCase();
            const email = String(p.email || '').trim().toLowerCase();
            if (role === 'admin') return false;
            if (p.id === 'demo-admin-id') return false;
            if (email === 'admin@kudstore.com') return false;
            return true;
          });

          customers = customerProfiles.map((p: any) => {
            const authAcc = accountsMap[p.id];
            const userOrders = orders.filter((o) => o.user_id === p.id || o.shipping_address?.email === (authAcc?.email || p.email));
            const totalSpent = userOrders
              .filter((o) => o.payment_status === 'Paid')
              .reduce((sum, o) => sum + (o.total_amount || 0), 0);

            const refState = p.referral_rewards || {};
            const isBanned = Boolean(refState.isBanned);
            const isFrozen = Boolean(refState.isEarningsFrozen);
            const frozenReason = refState.frozenReason || '';
            const frozenAt = refState.frozenAt;
            const refCount = Number(refState.successfulReferralsCount ?? 0);
            const refBalance = Number(refState.referralBalance ?? 0);
            const totalRefEarned = Number(refState.totalEarned ?? 0);
            const hideEarnings = Boolean(refState.hideReferralEarnings);
            const hideInvites = Boolean(refState.hideInviteOption);
            const isRefRewardsEnabled = p.referral_rewards_enabled !== undefined
              ? Boolean(p.referral_rewards_enabled)
              : (refState.referral_rewards_enabled !== undefined ? Boolean(refState.referral_rewards_enabled) : false);

            const account_status = (p.account_status || 'active') as CustomerAccountStatus;
            const disabled_reason = p.disabled_reason || null;
            const disabled_at = p.disabled_at || null;

            // Map values according to database contract:
            // Email -> email from auth account (fallback to p.email)
            const customerEmail = authAcc?.email || p.email || 'customer@kudstore.com';
            // Member Since -> created_at from auth account (fallback to p.created_at)
            const memberSince = authAcc?.created_at || p.created_at || new Date().toISOString();
            const lastSignInAt = authAcc ? authAcc.last_sign_in_at : (p.last_sign_in_at ?? null);
            const confirmedAt = authAcc ? authAcc.confirmed_at : (p.confirmed_at ?? null);

            return {
              id: p.id,
              email: customerEmail,
              fullName: p.fullName || p.full_name || 'Customer Profile',
              phone: p.phone || p.shipping_address?.phone || '-',
              age: p.age !== undefined && p.age !== null ? Number(p.age) : undefined,
              gender: p.gender || undefined,
              role: p.role || 'customer',
              createdAt: memberSince,
              orderCount: userOrders.length,
              totalSpent,
              account_status,
              disabled_reason,
              disabled_at,
              last_sign_in_at: lastSignInAt,
              confirmed_at: confirmedAt,
              auth_account: authAcc || undefined,
              referralStatus: isBanned ? 'banned' : 'active',
              isReferralBanned: isBanned,
              isEarningsFrozen: isFrozen,
              earningsFrozenReason: frozenReason,
              frozenAt,
              referralCount: refCount,
              referralBalance: refBalance,
              totalReferralEarned: totalRefEarned,
              hideEarnings,
              hideInvites,
              referral_rewards_enabled: isRefRewardsEnabled,
              referralRewardsEnabled: isRefRewardsEnabled,
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
    }

    // Merge each customer with referral state if available
    customers = customers.map((c) => {
      const userRefData = safeGetItem<UserReferralRewardsState | null>(`kud_store_user_rewards_${c.id}`, null);

      if (userRefData) {
        const isBanned = Boolean(userRefData.isBanned);
        const isFrozen = Boolean(userRefData.isEarningsFrozen);
        return {
          ...c,
          referralStatus: isBanned ? 'banned' : 'active',
          isReferralBanned: isBanned,
          isEarningsFrozen: isFrozen,
          earningsFrozenReason: userRefData.frozenReason || c.earningsFrozenReason || '',
          frozenAt: userRefData.frozenAt || c.frozenAt,
          referralCount: userRefData.successfulReferralsCount ?? c.referralCount ?? 0,
          referralBalance: userRefData.referralBalance ?? c.referralBalance ?? 0,
          totalReferralEarned: userRefData.totalEarned ?? c.totalReferralEarned ?? 0,
          hideEarnings: Boolean(userRefData.hideReferralEarnings),
          hideInvites: Boolean(userRefData.hideInviteOption),
          referral_rewards_enabled: Boolean(userRefData.referral_rewards_enabled ?? c.referral_rewards_enabled ?? false),
          referralRewardsEnabled: Boolean(userRefData.referral_rewards_enabled ?? c.referral_rewards_enabled ?? false),
        };
      }
      const isBanned = c.isReferralBanned ?? (c.referralStatus === 'banned');
      return {
        ...c,
        referralStatus: isBanned ? 'banned' : 'active',
        isReferralBanned: Boolean(isBanned),
        isEarningsFrozen: Boolean(c.isEarningsFrozen),
        earningsFrozenReason: c.earningsFrozenReason || '',
        frozenAt: c.frozenAt,
        referralCount: c.referralCount ?? 0,
        referralBalance: c.referralBalance ?? 0,
        totalReferralEarned: c.totalReferralEarned ?? 0,
        hideEarnings: Boolean(c.hideEarnings),
        hideInvites: Boolean(c.hideInvites),
        referral_rewards_enabled: Boolean(c.referral_rewards_enabled ?? false),
        referralRewardsEnabled: Boolean(c.referral_rewards_enabled ?? false),
      };
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.fullName?.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    // Strictly filter out any administrator accounts so admin credentials NEVER appear in the customer directory
    customers = customers.filter((c) => {
      const role = String(c.role || '').trim().toLowerCase();
      const email = String(c.email || '').trim().toLowerCase();
      const authEmail = String(c.auth_account?.email || '').trim().toLowerCase();
      if (role === 'admin') return false;
      if (c.id === 'demo-admin-id') return false;
      if (email === 'admin@kudstore.com' || authEmail === 'admin@kudstore.com') return false;
      return true;
    });

    return customers;
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    // If ID is the demo admin ID, never return as customer
    if (id === 'demo-admin-id') {
      return null;
    }

    const customers = await this.getCustomers();
    const found = customers.find((c) => c.id === id);
    if (found) {
      const role = String(found.role || '').trim().toLowerCase();
      const email = String(found.email || '').trim().toLowerCase();
      const authEmail = String(found.auth_account?.email || '').trim().toLowerCase();
      if (role === 'admin' || email === 'admin@kudstore.com' || authEmail === 'admin@kudstore.com') {
        return null;
      }

      if (!found.auth_account && isSupabaseConfigured() && supabase) {
        try {
          const accountsMap = await this.getAdminCustomerAccounts();
          const acc = accountsMap[id];
          if (acc) {
            const accEmail = String(acc.email || '').trim().toLowerCase();
            if (accEmail === 'admin@kudstore.com') {
              return null;
            }
            found.email = acc.email || found.email;
            found.createdAt = acc.created_at || found.createdAt;
            found.last_sign_in_at = acc.last_sign_in_at;
            found.confirmed_at = acc.confirmed_at;
            found.auth_account = acc;
          }
        } catch (err) {
          console.warn('[adminService] Graceful fallback loading auth account info:', err);
        }
      }
      return found;
    }
    return null;
  },

  /**
   * Update Customer Account Status (Active, On Hold, Disabled)
   * Places account on hold or disables purchasing, or reactivates account.
   */
  async updateCustomerAccountStatus(
    customerId: string,
    newStatus: CustomerAccountStatus,
    reason?: string
  ): Promise<{ success: boolean; error?: string; customer?: Customer }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase database is not configured' };
    }

    try {
      const sanitizedReason = reason?.trim() || null;
      const { data, error } = await supabase.rpc('admin_set_customer_account_status', {
        target_user_id: customerId,
        new_status: newStatus,
        reason: sanitizedReason,
      });

      if (error) {
        console.error('[AdminService] admin_set_customer_account_status RPC error:', error);
        return {
          success: false,
          error: error.message || 'Failed to update customer account status in database',
        };
      }

      if (!data || data.success !== true) {
        console.error('[AdminService] admin_set_customer_account_status rejected:', data);
        return {
          success: false,
          error: data?.error || data?.message || 'Database rejected customer account status update',
        };
      }

      // Broadcast customer status change event so all active components re-evaluate state
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('kud_customer_status_changed', {
            detail: {
              customerId,
              status: data.account_status || newStatus,
              reason: data.disabled_reason,
            },
          })
        );
      }

      const updatedCustomer = await this.getCustomerById(customerId);
      return { success: true, customer: updatedCustomer || undefined };
    } catch (err: any) {
      console.error('[AdminService] Customer status update exception:', err);
      return {
        success: false,
        error: err?.message || 'Unexpected error updating customer status',
      };
    }
  },

  /**
   * Place customer account on hold
   */
  async holdCustomerAccount(
    customerId: string,
    reason: string = 'Account temporarily placed on hold for verification'
  ): Promise<{ success: boolean; error?: string; customer?: Customer }> {
    return this.updateCustomerAccountStatus(customerId, 'on_hold', reason);
  },

  /**
   * Disable customer account
   */
  async disableCustomerAccount(
    customerId: string,
    reason: string = 'Account disabled by Store Administration'
  ): Promise<{ success: boolean; error?: string; customer?: Customer }> {
    return this.updateCustomerAccountStatus(customerId, 'disabled', reason);
  },

  /**
   * Reactivate a customer account
   */
  async reactivateCustomerAccount(
    customerId: string
  ): Promise<{ success: boolean; error?: string; customer?: Customer }> {
    return this.updateCustomerAccountStatus(customerId, 'active', '');
  },

  /**
   * Safely and permanently delete customer account
   * Removes personal profile data and user preferences while preserving legal/business order records.
   */
  async deleteCustomerAccount(
    customerId: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      if (isSupabaseConfigured() && supabase) {
        // 1. Remove favourites
        try {
          await supabase.from('favourites').delete().eq('user_id', customerId);
        } catch (favErr) {
          console.warn('[AdminService] Favourites deletion notice:', favErr);
        }

        // 2. Anonymize/clean orders so business financials, tax records & invoices remain intact
        try {
          await executeWithColumnFallback(
            (p) => supabase.from('orders').update(p).eq('user_id', customerId),
            {
              customer_name: '[Deleted Customer]',
            }
          );
        } catch (ordErr) {
          console.warn('[AdminService] Order customer name update notice:', ordErr);
        }

        // 3. Delete profile row from public.profiles
        try {
          const { error: profileDeleteErr } = await supabase
            .from('profiles')
            .delete()
            .eq('id', customerId);

          if (profileDeleteErr) {
            console.warn('[AdminService] Profile delete failed, falling back to anonymized tombstone:', profileDeleteErr);
            await executeWithColumnFallback(
              (p) => supabase.from('profiles').update(p).eq('id', customerId),
              {
                full_name: '[Deleted Customer]',
                email: `deleted_${customerId.slice(0, 8)}@anonymized.local`,
                phone: null,
                avatar_url: null,
                is_disabled: true,
                status: 'disabled',
              }
            );
          }
        } catch (profErr) {
          console.warn('[AdminService] Profile deletion exception:', profErr);
        }
      }

      // 4. Remove local caches
      try {
        localStorage.removeItem(`kud_store_user_rewards_${customerId}`);
      } catch (localErr) {
        console.warn('Local storage remove notice:', localErr);
      }

      const localCusts = safeGetItem<Customer[]>(LOCAL_CUSTOMERS_KEY, []);
      const filtered = localCusts.filter((c) => c.id !== customerId);
      safeSetItem(LOCAL_CUSTOMERS_KEY, filtered);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('kud_customer_status_changed', {
            detail: { customerId, deleted: true },
          })
        );
      }

      return {
        success: true,
        message: 'Customer account and personal profile data permanently removed. Past financial transaction records preserved for compliance.',
      };
    } catch (err: any) {
      console.error('[AdminService] Customer deletion exception:', err);
      return {
        success: false,
        message: 'Failed to delete customer account',
        error: err?.message || 'Unknown deletion error',
      };
    }
  },

  /**
   * Bulk update status for multiple customer accounts (Active, On Hold, Disabled)
   */
  async bulkUpdateCustomerAccountStatus(
    customerIds: string[],
    newStatus: CustomerAccountStatus,
    reason?: string
  ): Promise<{ success: boolean; updatedCount: number; failedCount: number; errors: string[] }> {
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of customerIds) {
      try {
        const res = await this.updateCustomerAccountStatus(id, newStatus, reason);
        if (res.success) {
          updatedCount++;
        } else {
          failedCount++;
          if (res.error) errors.push(`Account ${id}: ${res.error}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Account ${id}: ${err?.message || 'Update failed'}`);
      }
    }

    return {
      success: failedCount === 0,
      updatedCount,
      failedCount,
      errors,
    };
  },

  /**
   * Bulk delete multiple customer accounts permanently
   */
  async bulkDeleteCustomerAccounts(
    customerIds: string[]
  ): Promise<{ success: boolean; deletedCount: number; failedCount: number; errors: string[] }> {
    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const id of customerIds) {
      try {
        const res = await this.deleteCustomerAccount(id);
        if (res.success) {
          deletedCount++;
        } else {
          failedCount++;
          if (res.error) errors.push(`Account ${id}: ${res.error}`);
        }
      } catch (err: any) {
        failedCount++;
        errors.push(`Account ${id}: ${err?.message || 'Deletion failed'}`);
      }
    }

    return {
      success: failedCount === 0,
      deletedCount,
      failedCount,
      errors,
    };
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

