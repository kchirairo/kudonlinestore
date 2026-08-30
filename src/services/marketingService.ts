import { supabase, isSupabaseConfigured, executeWithColumnFallback } from '../lib/supabase';
import { safeGetItem, safeSetItem } from '../utils/storage';
import {
  Product,
  CartItem,
  Order,
  UserProfile,
  MarketingEventRecord,
  MarketingEventType,
  MarketingPixelSettings,
  MarketingAnalyticsSummary,
  MarketingPlatformMetric,
  MarketingCampaignPerformance,
  MarketingProductPerformance,
} from '../types';
import { getCurrentAttribution } from '../utils/utmTracker';

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
  }
}

const LOCAL_MARKETING_EVENTS_KEY = 'kud_store_marketing_events_v1';
const LOCAL_PIXEL_SETTINGS_KEY = 'kud_store_pixel_settings_v1';

export const DEFAULT_PIXEL_SETTINGS: MarketingPixelSettings = {
  meta_pixel_id: '',
  tiktok_pixel_id: '',
  meta_conversions_api_token: '',
  meta_test_event_code: '',
  tiktok_events_api_token: '',
  enabled: true,
  test_mode: false,
};

let pixelsInitialized = false;

export const marketingService = {
  /**
   * Retrieves Meta & TikTok Pixel settings from Supabase settings table or local storage fallback
   */
  async getPixelSettings(): Promise<MarketingPixelSettings> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('settings_data')
          .limit(1)
          .maybeSingle();

        if (!error && data?.settings_data?.marketing_pixel_settings) {
          return {
            ...DEFAULT_PIXEL_SETTINGS,
            ...data.settings_data.marketing_pixel_settings,
          };
        }
      } catch (err) {
        console.warn('[marketingService] Notice fetching pixel settings:', err);
      }
    }

    return safeGetItem<MarketingPixelSettings>(LOCAL_PIXEL_SETTINGS_KEY, DEFAULT_PIXEL_SETTINGS);
  },

  /**
   * Saves Meta & TikTok Pixel settings into Supabase settings table
   */
  async savePixelSettings(settings: MarketingPixelSettings): Promise<{ success: boolean; error?: string }> {
    const updatedSettings: MarketingPixelSettings = {
      ...settings,
      lastUpdated: new Date().toISOString(),
    };

    safeSetItem(LOCAL_PIXEL_SETTINGS_KEY, updatedSettings);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: existingRow } = await supabase
          .from('settings')
          .select('id, settings_data')
          .limit(1)
          .maybeSingle();

        const currentSettingsData = existingRow?.settings_data || {};
        const newSettingsData = {
          ...currentSettingsData,
          marketing_pixel_settings: updatedSettings,
        };

        if (existingRow?.id) {
          const res = await supabase
            .from('settings')
            .update({ settings_data: newSettingsData, updated_at: new Date().toISOString() })
            .eq('id', existingRow.id);
          if (res.error) {
            console.warn('[marketingService] Supabase restricted saving pixel settings (RLS/Permissions). Persisted to local storage:', res.error);
          }
        } else {
          const res = await supabase.from('settings').insert({ settings_data: newSettingsData });
          if (res.error) {
            console.warn('[marketingService] Supabase restricted inserting pixel settings (RLS/Permissions). Persisted to local storage:', res.error);
          }
        }

        // Re-initialize pixels with new IDs
        marketingService.initializePixels(updatedSettings);
        return { success: true };
      } catch (err: any) {
        console.warn('[marketingService] Exception saving pixel settings in Supabase. Persisted to local storage:', err);
        marketingService.initializePixels(updatedSettings);
        return { success: true };
      }
    }

    return { success: true };
  },

  /**
   * Initializes Meta Pixel and TikTok Pixel scripts client-side
   */
  async initializePixels(providedSettings?: MarketingPixelSettings): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const settings = providedSettings || (await marketingService.getPixelSettings());
      if (!settings.enabled) return;

      // 1. Meta Pixel Setup (fbq)
      if (settings.meta_pixel_id && settings.meta_pixel_id.trim()) {
        const metaId = settings.meta_pixel_id.trim();
        if (!window.fbq) {
          /* eslint-disable */
          (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return;
            n = f.fbq = function () {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = true;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = true;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
          })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
          /* eslint-enable */

          if (window.fbq) {
            window.fbq('init', metaId);
            window.fbq('track', 'PageView');
            console.log('[Meta Pixel] Initialized with ID:', metaId);
          }
        }
      }

      // 2. TikTok Pixel Setup (ttq)
      if (settings.tiktok_pixel_id && settings.tiktok_pixel_id.trim()) {
        const tiktokId = settings.tiktok_pixel_id.trim();
        if (!window.ttq) {
          /* eslint-disable */
          (function (w: any, d: any, t: any) {
            w.TiktokAnalyticsObject = t;
            var ttq = (w[t] = w[t] || []);
            ttq.methods = [
              'page',
              'track',
              'identify',
              'instances',
              'debug',
              'on',
              'off',
              'once',
              'ready',
              'alias',
              'group',
              'enableCookie',
              'disableCookie',
            ];
            ttq.setAndDefer = function (t: any, e: any) {
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              };
            };
            for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
            ttq.instance = function (t: any) {
              for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
                ttq.setAndDefer(e, ttq.methods[n]);
              return e;
            };
            ttq.load = function (e: any, n: any) {
              var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
              ttq._i = ttq._i || {};
              ttq._i[e] = [];
              ttq._i[e]._u = i;
              ttq._t = ttq._t || {};
              ttq._t[e] = +new Date();
              ttq._o = ttq._o || {};
              ttq._o[e] = n || {};
              var o = d.createElement('script');
              o.type = 'text/javascript';
              o.async = !0;
              o.src = i + '?sdkid=' + e + '&lib=' + t;
              var a = d.getElementsByTagName('script')[0];
              a.parentNode.insertBefore(o, a);
            };
          })(window, document, 'ttq');
          /* eslint-enable */

          if (window.ttq) {
            window.ttq.load(tiktokId);
            window.ttq.page();
            console.log('[TikTok Pixel] Initialized with ID:', tiktokId);
          }
        }
      }

      pixelsInitialized = true;
    } catch (err) {
      console.warn('[marketingService] Pixel initialization notice:', err);
    }
  },

  /**
   * Internal helper to record a marketing event into Supabase and local cache
   */
  async recordEvent(
    eventType: MarketingEventType,
    details: {
      productId?: string;
      productName?: string;
      orderId?: string;
      orderNumber?: string;
      amount?: number;
      currency?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const attribution = getCurrentAttribution();
    const eventRecord: MarketingEventRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}`,
      session_id: attribution.sessionId,
      event_type: eventType,
      platform: attribution.platform,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      product_id: details.productId,
      product_name: details.productName,
      order_id: details.orderId,
      order_number: details.orderNumber,
      amount: details.amount || 0,
      currency: details.currency || 'ZAR',
      user_id: details.userId,
      metadata: details.metadata || {},
      created_at: new Date().toISOString(),
    };

    // Save to local storage cache for offline resilience and immediate UI reactivity
    try {
      const localEvents = safeGetItem<MarketingEventRecord[]>(LOCAL_MARKETING_EVENTS_KEY, []);
      localEvents.unshift(eventRecord);
      // Keep recent 500 events locally
      if (localEvents.length > 500) localEvents.length = 500;
      safeSetItem(LOCAL_MARKETING_EVENTS_KEY, localEvents);
    } catch {
      // Safe fallback
    }

    // Insert into Supabase table public.marketing_events if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = {
          session_id: eventRecord.session_id,
          event_type: eventRecord.event_type,
          platform: eventRecord.platform,
          utm_source: eventRecord.utm_source || null,
          utm_medium: eventRecord.utm_medium || null,
          utm_campaign: eventRecord.utm_campaign || null,
          utm_content: eventRecord.utm_content || null,
          utm_term: eventRecord.utm_term || null,
          product_id: eventRecord.product_id || null,
          product_name: eventRecord.product_name || null,
          order_id: eventRecord.order_id || null,
          order_number: eventRecord.order_number || null,
          amount: eventRecord.amount || 0,
          currency: eventRecord.currency || 'ZAR',
          user_id: eventRecord.user_id || null,
          metadata: eventRecord.metadata || {},
          created_at: eventRecord.created_at,
        };

        const { error } = await executeWithColumnFallback(
          (p) => supabase.from('marketing_events').insert(p),
          payload
        );

        if (error) {
          console.warn('[marketingService] Notice logging marketing_event in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[marketingService] Notice inserting marketing event:', err);
      }
    }
  },

  /**
   * Tracks a product view event (Landing on product page via social campaign or direct browsing)
   */
  async trackProductView(product: Product, user?: UserProfile | null): Promise<void> {
    const attribution = getCurrentAttribution();

    // 1. Record in Supabase
    await marketingService.recordEvent('view_product', {
      productId: product.id,
      productName: product.name,
      amount: product.price,
      userId: user?.id,
      metadata: {
        brand: product.brand,
        category: product.category,
        platform: attribution.platform,
      },
    });

    // 2. Dispatch Meta Pixel Event
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_name: product.name,
          content_ids: [product.id],
          content_type: 'product',
          value: product.price,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[Meta Pixel] Error firing ViewContent:', e);
    }

    // 3. Dispatch TikTok Pixel Event
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.track('ViewContent', {
          contents: [
            {
              content_id: product.id,
              content_name: product.name,
              price: product.price,
            },
          ],
          value: product.price,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[TikTok Pixel] Error firing ViewContent:', e);
    }
  },

  /**
   * Tracks an add-to-cart event
   */
  async trackAddToCart(product: Product, quantity: number = 1, user?: UserProfile | null): Promise<void> {
    const attribution = getCurrentAttribution();
    const itemTotal = (product.price || 0) * quantity;

    // 1. Record in Supabase
    await marketingService.recordEvent('add_to_cart', {
      productId: product.id,
      productName: product.name,
      amount: itemTotal,
      userId: user?.id,
      metadata: {
        quantity,
        brand: product.brand,
        platform: attribution.platform,
      },
    });

    // 2. Dispatch Meta Pixel Event
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_name: product.name,
          content_ids: [product.id],
          content_type: 'product',
          value: itemTotal,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[Meta Pixel] Error firing AddToCart:', e);
    }

    // 3. Dispatch TikTok Pixel Event
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.track('AddToCart', {
          contents: [
            {
              content_id: product.id,
              content_name: product.name,
              quantity,
              price: product.price,
            },
          ],
          value: itemTotal,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[TikTok Pixel] Error firing AddToCart:', e);
    }
  },

  /**
   * Tracks initiate checkout event when customer arrives at /checkout
   */
  async trackInitiateCheckout(items: CartItem[], totalAmount: number, user?: UserProfile | null): Promise<void> {
    const attribution = getCurrentAttribution();

    // 1. Record in Supabase
    await marketingService.recordEvent('initiate_checkout', {
      amount: totalAmount,
      userId: user?.id,
      metadata: {
        itemsCount: items.length,
        platform: attribution.platform,
        productIds: items.map((i) => i.product.id),
      },
    });

    // 2. Dispatch Meta Pixel Event
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: items.map((i) => i.product.id),
          num_items: items.length,
          value: totalAmount,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[Meta Pixel] Error firing InitiateCheckout:', e);
    }

    // 3. Dispatch TikTok Pixel Event
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.track('InitiateCheckout', {
          contents: items.map((i) => ({
            content_id: i.product.id,
            content_name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
          })),
          value: totalAmount,
          currency: 'ZAR',
        });
      }
    } catch (e) {
      console.warn('[TikTok Pixel] Error firing InitiateCheckout:', e);
    }
  },

  /**
   * Tracks completed purchase event.
   * STRICT REQUIREMENT: Only record a sale after YOCO/payment confirmation!
   * Checks idempotency using session storage to ensure zero duplicate recordings.
   */
  async trackPurchase(order: Order, user?: UserProfile | null): Promise<boolean> {
    if (!order || !order.id) return false;

    // Idempotency check to avoid duplicate recordings on page refresh
    const processedKey = `kud_purchase_tracked_${order.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(processedKey) === 'true') {
      return false;
    }

    const attribution = getCurrentAttribution();
    const purchaseAmount = Number(order.total_amount) || 0;
    const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;

    // 1. Record purchase event in Supabase marketing_events
    await marketingService.recordEvent('purchase', {
      orderId: order.id,
      orderNumber,
      amount: purchaseAmount,
      userId: user?.id || order.user_id,
      metadata: {
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        itemsCount: order.items?.length || 0,
        platform: attribution.platform,
        utm_campaign: attribution.utm_campaign,
        utm_source: attribution.utm_source,
        trafficSource: attribution.platform,
      },
    });

    // 2. Attach attribution directly to public.orders table
    if (isSupabaseConfigured() && supabase) {
      try {
        await executeWithColumnFallback(
          (p) => supabase.from('orders').update(p).eq('id', order.id),
          {
            traffic_source: attribution.platform,
            utm_source: attribution.utm_source || attribution.platform,
            utm_medium: attribution.utm_medium || null,
            utm_campaign: attribution.utm_campaign || null,
            utm_content: attribution.utm_content || null,
            utm_term: attribution.utm_term || null,
            session_id: attribution.sessionId,
          }
        );
      } catch (err) {
        console.warn('[marketingService] Notice updating order attribution in Supabase:', err);
      }
    }

    // 3. Dispatch Meta Pixel Purchase Event
    try {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Purchase', {
          value: purchaseAmount,
          currency: 'ZAR',
          content_type: 'product',
          content_ids: (order.items || []).map((i) => i.product_id),
          num_items: order.items?.length || 1,
          order_id: orderNumber,
        });
      }
    } catch (e) {
      console.warn('[Meta Pixel] Error firing Purchase:', e);
    }

    // 4. Dispatch TikTok Pixel CompletePayment Event
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.track('CompletePayment', {
          content_id: orderNumber,
          value: purchaseAmount,
          currency: 'ZAR',
          contents: (order.items || []).map((i) => ({
            content_id: i.product_id,
            content_name: i.product_name,
            quantity: i.quantity,
            price: i.unit_price,
          })),
        });
      }
    } catch (e) {
      console.warn('[TikTok Pixel] Error firing CompletePayment:', e);
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(processedKey, 'true');
    }

    console.log('[marketingService] Successfully recorded verified sale for Order:', orderNumber);
    return true;
  },

  /**
   * Prepares server-ready Meta Conversions API (CAPI) JSON payload
   */
  generateMetaCapiPayload(order: Order, user?: UserProfile | null) {
    const attribution = getCurrentAttribution();
    const eventTime = Math.floor(Date.now() / 1000);
    const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;

    return {
      event_name: 'Purchase',
      event_time: eventTime,
      event_id: `purchase_${order.id}`,
      action_source: 'website',
      event_source_url: typeof window !== 'undefined' ? window.location.href : 'https://kudstore.co.za',
      user_data: {
        em: user?.email ? [btoa(user.email.toLowerCase().trim())] : undefined,
        ph: user?.phone ? [btoa(user.phone.replace(/[^0-9]/g, ''))] : undefined,
        client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      },
      custom_data: {
        currency: 'ZAR',
        value: Number(order.total_amount) || 0,
        order_id: orderNumber,
        content_type: 'product',
        contents: (order.items || []).map((i) => ({
          id: i.product_id,
          quantity: i.quantity,
          item_price: i.unit_price,
        })),
        utm_source: attribution.utm_source,
        utm_campaign: attribution.utm_campaign,
      },
    };
  },

  /**
   * Prepares server-ready TikTok Events API v2 JSON payload
   */
  generateTikTokEventsApiPayload(order: Order, user?: UserProfile | null) {
    const eventTime = new Date().toISOString();
    const orderNumber = order.order_number || `KUD-${order.id.slice(0, 6).toUpperCase()}`;

    return {
      event: 'CompletePayment',
      event_time: eventTime,
      event_id: `tt_purchase_${order.id}`,
      user: {
        email: user?.email ? btoa(user.email.toLowerCase().trim()) : undefined,
        phone_number: user?.phone ? btoa(user.phone.replace(/[^0-9]/g, '')) : undefined,
      },
      properties: {
        value: Number(order.total_amount) || 0,
        currency: 'ZAR',
        contents: (order.items || []).map((i) => ({
          content_id: i.product_id,
          content_name: i.product_name,
          quantity: i.quantity,
          price: i.unit_price,
        })),
      },
    };
  },

  /**
   * Queries and aggregates Marketing Analytics for the Admin portal:
   * - Visitors (unique sessions)
   * - Paid Orders
   * - Conversion Rate
   * - Revenue
   * - Platform breakdown (Instagram, Facebook, TikTok, WhatsApp, Other/Direct)
   * - Funnel stages
   * - Top Campaigns
   * - Top Products
   * - Date filtering: Today, 7 days, 30 days, Custom
   */
  async getMarketingAnalytics(options: {
    dateRange: 'today' | '7d' | '30d' | 'custom';
    startDate?: string;
    endDate?: string;
  }): Promise<MarketingAnalyticsSummary> {
    // 1. Calculate boundary timestamps
    const now = new Date();
    let startTime: Date;
    let endTime: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (options.dateRange === 'today') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (options.dateRange === '7d') {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (options.dateRange === '30d') {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (options.dateRange === 'custom' && options.startDate) {
      startTime = new Date(options.startDate);
      if (options.endDate) {
        endTime = new Date(options.endDate);
        endTime.setHours(23, 59, 59, 999);
      }
    } else {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();

    // 2. Fetch marketing events from Supabase or local cache
    let events: MarketingEventRecord[] = [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbEvents, error } = await supabase
          .from('marketing_events')
          .select('*')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });

        if (!error && dbEvents) {
          events = dbEvents.map((r: any) => ({
            id: r.id,
            session_id: r.session_id || 'unknown',
            event_type: r.event_type as MarketingEventType,
            platform: r.platform || 'direct',
            utm_source: r.utm_source || undefined,
            utm_medium: r.utm_medium || undefined,
            utm_campaign: r.utm_campaign || undefined,
            utm_content: r.utm_content || undefined,
            utm_term: r.utm_term || undefined,
            product_id: r.product_id || undefined,
            product_name: r.product_name || undefined,
            order_id: r.order_id || undefined,
            order_number: r.order_number || undefined,
            amount: Number(r.amount || 0),
            currency: r.currency || 'ZAR',
            user_id: r.user_id || undefined,
            metadata: r.metadata || {},
            created_at: r.created_at,
          }));
        }
      } catch (err) {
        console.warn('[marketingService] Notice querying marketing_events from Supabase:', err);
      }
    }

    // Merge with local events if empty or supplemental
    if (events.length === 0) {
      const localEvents = safeGetItem<MarketingEventRecord[]>(LOCAL_MARKETING_EVENTS_KEY, []);
      events = localEvents.filter((ev) => {
        const t = new Date(ev.created_at).getTime();
        return t >= startTime.getTime() && t <= endTime.getTime();
      });
    }

    // 3. Fetch orders from Supabase or local storage to accurately cross-reference paid revenue
    let orders: Order[] = [];
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbOrders, error: orderErr } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .gte('created_at', startIso)
          .lte('created_at', endIso);

        if (!orderErr && dbOrders) {
          orders = dbOrders.map((o: any) => ({
            id: String(o.id),
            order_number: o.order_number,
            created_at: o.created_at,
            total_amount: Number(o.total || o.total_amount || 0),
            status: o.status,
            payment_status: o.payment_status,
            payment_method: o.payment_method,
            items: o.order_items || [],
            traffic_source: o.traffic_source,
            utm_source: o.utm_source,
            utm_campaign: o.utm_campaign,
          } as any));
        }
      } catch (err) {
        console.warn('[marketingService] Notice querying orders from Supabase:', err);
      }
    }

    if (orders.length === 0) {
      const localOrders = safeGetItem<Order[]>('kud_store_orders_history', []);
      orders = localOrders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= startTime.getTime() && t <= endTime.getTime();
      });
    }

    // Filter only PAID orders for verified revenue and conversion
    const paidOrders = orders.filter(
      (o) =>
        (o.payment_status && o.payment_status.toLowerCase() === 'paid') ||
        (o.status && o.status.toLowerCase() === 'confirmed')
    );

    // 4. Aggregation Data Structures
    const uniqueSessionIds = new Set<string>();
    const platformBreakdown: Record<string, MarketingPlatformMetric> = {
      instagram: {
        platform: 'instagram',
        displayName: 'Instagram',
        visitors: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      },
      facebook: {
        platform: 'facebook',
        displayName: 'Facebook',
        visitors: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      },
      tiktok: {
        platform: 'tiktok',
        displayName: 'TikTok',
        visitors: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      },
      whatsapp: {
        platform: 'whatsapp',
        displayName: 'WhatsApp',
        visitors: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      },
      other: {
        platform: 'other',
        displayName: 'Direct & Other',
        visitors: 0,
        addToCarts: 0,
        checkouts: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
      },
    };

    const campaignMap: Record<string, MarketingCampaignPerformance> = {};
    const productMap: Record<string, MarketingProductPerformance> = {};
    const platformSessions: Record<string, Set<string>> = {
      instagram: new Set(),
      facebook: new Set(),
      tiktok: new Set(),
      whatsapp: new Set(),
      other: new Set(),
    };

    let totalViews = 0;
    let totalAdds = 0;
    let totalCheckouts = 0;
    let totalPurchases = 0;
    let totalAttributedRevenue = 0;

    // Process events
    events.forEach((ev) => {
      uniqueSessionIds.add(ev.session_id);
      const plat = (ev.platform || 'other').toLowerCase();
      const targetPlatKey = ['instagram', 'facebook', 'tiktok', 'whatsapp'].includes(plat) ? plat : 'other';

      if (!platformSessions[targetPlatKey]) {
        platformSessions[targetPlatKey] = new Set();
      }
      platformSessions[targetPlatKey].add(ev.session_id);

      // Funnel counters
      if (ev.event_type === 'view_product') {
        totalViews++;
      } else if (ev.event_type === 'add_to_cart') {
        totalAdds++;
        platformBreakdown[targetPlatKey].addToCarts++;
      } else if (ev.event_type === 'initiate_checkout') {
        totalCheckouts++;
        platformBreakdown[targetPlatKey].checkouts++;
      } else if (ev.event_type === 'purchase') {
        totalPurchases++;
        totalAttributedRevenue += ev.amount || 0;
        platformBreakdown[targetPlatKey].orders++;
        platformBreakdown[targetPlatKey].revenue += ev.amount || 0;
      }

      // Campaign aggregation
      if (ev.utm_campaign) {
        const cKey = `${ev.utm_campaign}__${targetPlatKey}`;
        if (!campaignMap[cKey]) {
          campaignMap[cKey] = {
            campaign: ev.utm_campaign,
            platform: targetPlatKey,
            medium: ev.utm_medium,
            visitors: 0,
            addToCarts: 0,
            checkouts: 0,
            orders: 0,
            revenue: 0,
            conversionRate: 0,
          };
        }
        if (ev.event_type === 'view_product') campaignMap[cKey].visitors++;
        if (ev.event_type === 'add_to_cart') campaignMap[cKey].addToCarts++;
        if (ev.event_type === 'initiate_checkout') campaignMap[cKey].checkouts++;
        if (ev.event_type === 'purchase') {
          campaignMap[cKey].orders++;
          campaignMap[cKey].revenue += ev.amount || 0;
        }
      }

      // Product performance aggregation
      if (ev.product_id) {
        const pId = ev.product_id;
        if (!productMap[pId]) {
          productMap[pId] = {
            productId: pId,
            productName: ev.product_name || `Product #${pId.slice(0, 6)}`,
            views: 0,
            addToCarts: 0,
            orders: 0,
            revenue: 0,
            conversionRate: 0,
          };
        }
        if (ev.event_type === 'view_product') productMap[pId].views++;
        if (ev.event_type === 'add_to_cart') productMap[pId].addToCarts++;
        if (ev.event_type === 'purchase') {
          productMap[pId].orders++;
          productMap[pId].revenue += ev.amount || 0;
        }
      }
    });

    // Cross-attribute with orders if orders have traffic_source or utm_source
    paidOrders.forEach((o) => {
      const src = ((o as any).traffic_source || (o as any).utm_source || '').toLowerCase();
      const targetPlatKey = ['instagram', 'facebook', 'tiktok', 'whatsapp'].includes(src) ? src : 'other';

      // If the purchase event wasn't in events, add it to metrics
      const alreadyCounted = events.some((e) => e.event_type === 'purchase' && (e.order_id === o.id || e.order_number === o.order_number));
      if (!alreadyCounted) {
        totalPurchases++;
        totalAttributedRevenue += Number(o.total_amount) || 0;
        platformBreakdown[targetPlatKey].orders++;
        platformBreakdown[targetPlatKey].revenue += Number(o.total_amount) || 0;
      }
    });

    // Populate platform visitors count from sets
    Object.keys(platformBreakdown).forEach((k) => {
      platformBreakdown[k].visitors = platformSessions[k]?.size || 0;
      const vis = platformBreakdown[k].visitors;
      const ord = platformBreakdown[k].orders;
      platformBreakdown[k].conversionRate = vis > 0 ? Number(((ord / vis) * 100).toFixed(2)) : 0;
    });

    // If total visitors is 0 but orders exist, use at least orders count
    const totalVisitors = Math.max(uniqueSessionIds.size, totalViews, totalPurchases);
    const overallConversionRate = totalVisitors > 0 ? Number(((totalPurchases / totalVisitors) * 100).toFixed(2)) : 0;

    // Finalize campaigns conversion rate & sorting
    const topCampaigns = Object.values(campaignMap).map((c) => ({
      ...c,
      conversionRate: c.visitors > 0 ? Number(((c.orders / c.visitors) * 100).toFixed(2)) : c.orders > 0 ? 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.visitors - a.visitors);

    // Finalize products conversion rate & sorting
    const topProducts = Object.values(productMap).map((p) => ({
      ...p,
      conversionRate: p.views > 0 ? Number(((p.orders / p.views) * 100).toFixed(2)) : p.orders > 0 ? 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue || b.orders - a.orders || b.views - a.views);

    // Generate daily trends for charts
    const dailyTrendMap: Record<string, { date: string; visitors: number; orders: number; revenue: number; instagramRevenue: number; facebookRevenue: number; tiktokRevenue: number }> = {};

    const dayCount = Math.max(1, Math.min(31, Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24))));
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(endTime.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dailyTrendMap[dateStr] = {
        date: dateStr,
        visitors: 0,
        orders: 0,
        revenue: 0,
        instagramRevenue: 0,
        facebookRevenue: 0,
        tiktokRevenue: 0,
      };
    }

    events.forEach((ev) => {
      const dateStr = ev.created_at.split('T')[0];
      if (dailyTrendMap[dateStr]) {
        if (ev.event_type === 'view_product') dailyTrendMap[dateStr].visitors++;
        if (ev.event_type === 'purchase') {
          dailyTrendMap[dateStr].orders++;
          dailyTrendMap[dateStr].revenue += ev.amount || 0;
          const p = (ev.platform || '').toLowerCase();
          if (p === 'instagram') dailyTrendMap[dateStr].instagramRevenue += ev.amount || 0;
          if (p === 'facebook') dailyTrendMap[dateStr].facebookRevenue += ev.amount || 0;
          if (p === 'tiktok') dailyTrendMap[dateStr].tiktokRevenue += ev.amount || 0;
        }
      }
    });

    return {
      visitors: totalVisitors,
      orders: totalPurchases,
      conversionRate: overallConversionRate,
      revenue: totalAttributedRevenue,
      platformBreakdown,
      topCampaigns: topCampaigns.slice(0, 15),
      topProducts: topProducts.slice(0, 15),
      funnel: {
        views: totalViews,
        addToCarts: totalAdds,
        checkouts: totalCheckouts,
        purchases: totalPurchases,
      },
      dailyTrend: Object.values(dailyTrendMap),
    };
  },
};
