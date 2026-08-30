import { Order, OrderItem, ShippingAddress, PaymentStatus, OrderStatus } from '../types';
import { supabase, isSupabaseConfigured, executeWithColumnFallback } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { calculateOrderFinancials } from '../utils/taxUtils';
import { getCurrentAttribution } from '../utils/utmTracker';

const LOCAL_ORDERS_KEY = 'kud_store_orders_history';

/**
 * Maps raw database row from public.orders (with joined or fetched order_items) to frontend Order model.
 */
export function mapSupabaseOrder(row: any, fallbackItems: OrderItem[] = []): Order {
  const shippingAddress: ShippingAddress = {
    fullName: row.customer_name || row.shipping_address?.fullName || 'Valued Customer',
    email: row.customer_email || row.shipping_address?.email || '',
    phone: row.customer_phone || row.shipping_address?.phone || '',
    addressLine: row.delivery_address || row.shipping_address?.addressLine || '',
    city: row.delivery_city || row.shipping_address?.city || '',
    province: row.delivery_province || row.shipping_address?.province || '',
    postalCode: row.delivery_postal_code || row.shipping_address?.postalCode || '',
  };

  const parsedItems: OrderItem[] =
    Array.isArray(row.order_items) && row.order_items.length > 0
      ? row.order_items.map((it: any) => ({
          id: it.id || String(Math.random()),
          order_id: it.order_id || row.id,
          product_id: it.product_id || '',
          product_name: it.product_name || it.name || '',
          product_brand: it.product_brand || it.brand || '',
          product_image: it.product_image || it.image || '',
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price ?? it.price ?? 0),
          total_price: Number(it.total_price ?? it.total ?? ((Number(it.unit_price ?? it.price ?? 0)) * (Number(it.quantity) || 1))),
          variant: it.variant || it.size_or_variant || undefined,
        }))
      : fallbackItems;

  const rawSubtotal = Number(row.subtotal ?? row.subtotal_amount ?? 0);
  const rawDelivery = Number(row.shipping_fee ?? row.delivery_fee ?? 0);
  const rawDiscount = Number(row.discount ?? row.discount_amount ?? 0);
  const rawTotal = Number(row.total ?? row.total_amount ?? 0);

  // Recalculate dynamic financials to ensure data integrity & reconciliation
  const financials = calculateOrderFinancials({
    items: parsedItems,
    subtotal_amount: rawSubtotal,
    delivery_fee: rawDelivery,
    discount_amount: rawDiscount,
    payment_status: row.payment_status,
  });

  const finalTotal = rawTotal > 0 && Math.abs(rawTotal - financials.grandTotal) < 0.05
    ? rawTotal
    : financials.grandTotal;

  return {
    id: String(row.id),
    order_number: row.order_number || `KUD-${String(row.id).slice(0, 6).toUpperCase()}`,
    user_id: row.user_id || undefined,
    customer_name: row.customer_name || shippingAddress.fullName,
    customer_email: row.customer_email || shippingAddress.email,
    created_at: row.created_at || new Date().toISOString(),
    total_amount: finalTotal,
    subtotal_amount: financials.subtotal,
    delivery_fee: financials.deliveryFee,
    discount_amount: financials.discountAmount,
    vat_amount: financials.vatAmount,
    amount_paid: financials.amountPaid,
    status: (row.status || 'pending') as OrderStatus,
    payment_status: (row.payment_status || 'pending') as PaymentStatus,
    payment_method: row.payment_method || 'Online Payment',
    shipping_address: shippingAddress,
    items: parsedItems,
  };
}

export const orderService = {
  /**
   * Helper to invoke the Yoco checkout Edge Function after creating the order in public.orders
   */
  async createYocoCheckoutOrder(
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    subtotal: number,
    deliveryFee: number,
    discountAmount: number,
    paymentMethod: string,
    userId?: string
  ): Promise<{ redirectUrl: string; orderId: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    // 1. Create order in database first
    const createdOrder = await orderService.createOrder(
      items,
      shippingAddress,
      subtotal,
      deliveryFee,
      discountAmount,
      paymentMethod,
      userId
    );

    if (!createdOrder || !createdOrder.id) {
      throw new Error('Order creation failed. Database order ID was not returned.');
    }

    console.log('[YOCO CHECKOUT REACT LOG]', {
      createdOrderId: createdOrder.id,
      orderNumber: createdOrder.order_number,
      total: createdOrder.total_amount,
    });

    const { data: fnData, error: fnError } = await supabase.functions.invoke('create-yoco-checkout', {
      body: {
        orderId: createdOrder.id,
      },
    });

    if (fnError) {
      console.error('[YOCO CHECKOUT] Edge function invocation error:', fnError);
      throw new Error(fnError.message || 'Failed to connect to Yoco checkout Edge Function.');
    }

    if (!fnData || (!fnData.redirectUrl && !fnData.success)) {
      const errMsg = fnData?.error || 'Yoco Checkout Error: orderId parameter is required or invalid response.';
      console.error('[YOCO CHECKOUT] Edge Function returned error:', errMsg);
      throw new Error(errMsg);
    }

    const resRedirectUrl = fnData.redirectUrl;

    return {
      redirectUrl: resRedirectUrl,
      orderId: createdOrder.id,
    };
  },

  /**
   * Creates an order in Supabase public.orders matching existing table columns
   * and subsequently inserts order items into public.order_items using the returned order ID.
   */
  async createOrder(
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    subtotal: number,
    deliveryFee: number,
    discountAmount: number,
    paymentMethod: string,
    userId?: string
  ): Promise<Order> {
    // 1. Calculate dynamic financial values accurately using standard 15% VAT
    const financials = calculateOrderFinancials({
      subtotal_amount: Number(subtotal) || 0,
      delivery_fee: Number(deliveryFee) || 0,
      discount_amount: Number(discountAmount) || 0,
      items,
      payment_status: 'pending',
    });

    const calcSubtotal = financials.subtotal;
    const calcShippingFee = financials.deliveryFee;
    const calcDiscount = financials.discountAmount;
    const calcVat = financials.vatAmount;
    const calcTotal = financials.grandTotal;

    // 2. Generate unique order number
    const uniqueOrderNumber = `KUD-${Math.floor(100000 + Math.random() * 900000)}`;

    // 3. Determine payment provider
    const pmLower = paymentMethod.toLowerCase();
    const paymentProvider =
      pmLower.includes('yoco') || pmLower.includes('card')
        ? 'yoco'
        : pmLower.includes('ozow') || pmLower.includes('eft')
        ? 'ozow'
        : pmLower.includes('payfast')
        ? 'payfast'
        : 'cod';

    // 4. Retrieve authenticated user ID from supabase.auth.getUser()
    let authUserId: string | null = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (!authError && authData?.user?.id) {
          authUserId = authData.user.id;
        }
      } catch (authErr) {
        console.warn('[orderService] Notice querying authenticated user:', authErr);
      }
    }
    if (!authUserId && userId && userId !== 'guest') {
      authUserId = userId;
    }

    if (!isSupabaseConfigured() || !supabase) {
      const localUuid = crypto.randomUUID();
      const attribution = getCurrentAttribution();
      const localOrder: Order = {
        id: localUuid,
        order_number: uniqueOrderNumber,
        user_id: authUserId || 'guest',
        created_at: new Date().toISOString(),
        subtotal_amount: calcSubtotal,
        delivery_fee: calcShippingFee,
        discount_amount: calcDiscount,
        vat_amount: calcVat,
        total_amount: calcTotal,
        status: 'pending',
        payment_status: 'pending',
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        items,
        traffic_source: attribution.platform,
        utm_source: attribution.utm_source || attribution.platform,
        utm_campaign: attribution.utm_campaign,
      } as any;
      const existingOrders = orderService.getLocalOrders();
      existingOrders.unshift(localOrder);
      safeSetItem(LOCAL_ORDERS_KEY, existingOrders);
      return localOrder;
    }

    // 5. Insert only columns that actually exist in public.orders
    // Columns: user_id, order_number, status, payment_status, payment_method, payment_provider,
    // currency, subtotal, shipping_fee, discount, total, customer_name, customer_email,
    // customer_phone, delivery_address, delivery_city, delivery_province, delivery_postal_code, customer_note, admin_note
    const attribution = getCurrentAttribution();
    const orderPayload = {
      user_id: authUserId || null,
      order_number: uniqueOrderNumber,
      status: 'pending',
      payment_status: 'pending',
      payment_method: paymentMethod,
      payment_provider: paymentProvider,
      currency: 'ZAR',
      subtotal: calcSubtotal,
      shipping_fee: calcShippingFee,
      discount: calcDiscount,
      total: calcTotal,
      customer_name: shippingAddress.fullName || 'Valued Customer',
      customer_email: shippingAddress.email || '',
      customer_phone: shippingAddress.phone || null,
      delivery_address: shippingAddress.addressLine || '',
      delivery_city: shippingAddress.city || '',
      delivery_province: shippingAddress.province || '',
      delivery_postal_code: shippingAddress.postalCode || '',
      customer_note: (shippingAddress as any).customerNote || null,
      admin_note: null,
      // Social commerce & marketing attribution
      traffic_source: attribution.platform,
      utm_source: attribution.utm_source || attribution.platform,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
      utm_term: attribution.utm_term || null,
      session_id: attribution.sessionId,
    };

    console.log('[ORDER CREATION] Inserting order into Supabase public.orders table:', {
      order_number: orderPayload.order_number,
      total: orderPayload.total,
      customer_email: orderPayload.customer_email,
      user_id: orderPayload.user_id,
    });

    const { data: createdOrderRow, error: orderInsertError } = await executeWithColumnFallback(
      (payload) => supabase.from('orders').insert(payload).select('*').single(),
      orderPayload
    );

    if (orderInsertError || !createdOrderRow) {
      console.error('[ORDER CREATION] Database error inserting into public.orders:', orderInsertError);
      throw new Error(
        `Failed to create order: ${orderInsertError?.message || 'Database returned empty response'}`
      );
    }

    const createdOrderId = createdOrderRow.id;
    console.log('[ORDER CREATION] Order successfully created in Supabase database! Order ID:', createdOrderId);

    // 6. After creating the order, create its order_items using the returned order ID
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        order_id: createdOrderId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_brand: item.product_brand || '',
        product_image: item.product_image || null,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || (Number(item.unit_price || 0) * (Number(item.quantity) || 1)),
        variant: item.variant || null,
      }));

      const { error: itemsInsertError } = await executeWithColumnFallback(
        (itemsPayload) => supabase.from('order_items').insert(itemsPayload),
        itemsToInsert as any
      );
      if (itemsInsertError) {
        console.warn('[ORDER CREATION] Notice inserting order_items:', itemsInsertError.message);
      } else {
        console.log(`[ORDER CREATION] Successfully inserted ${itemsToInsert.length} order items for Order ${createdOrderId}`);
      }
    }

    const formattedOrder = mapSupabaseOrder(createdOrderRow, items);

    // Save local copy for UI history/cache
    const existingOrders = orderService.getLocalOrders();
    existingOrders.unshift(formattedOrder);
    safeSetItem(LOCAL_ORDERS_KEY, existingOrders);

    return formattedOrder;
  },

  /**
   * Fetch orders for a user
   */
  async getUserOrders(userId?: string): Promise<Order[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (userId && userId !== 'guest') {
          query = query.eq('user_id', userId);
        }

        const { data: ordersData, error: ordersError } = await query;

        if (!ordersError && ordersData && ordersData.length > 0) {
          return ordersData.map((o: any) => mapSupabaseOrder(o));
        }
      } catch (err) {
        console.warn('Supabase fetch user orders notice:', err);
      }
    }

    return orderService.getLocalOrders();
  },

  getLocalOrders(): Order[] {
    return safeGetItem<Order[]>(LOCAL_ORDERS_KEY, []);
  },

  /**
   * Fetch single order by ID or order number
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const cleanId = orderId.trim().replace(/^#/, '');
    if (!cleanId) return null;

    if (isSupabaseConfigured() && supabase) {
      try {
        // Try exact ID match first
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', cleanId)
          .maybeSingle();

        if (!error && data) {
          return mapSupabaseOrder(data);
        }

        // If not found, try order_number column match
        const { data: numData, error: numError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .ilike('order_number', cleanId)
          .maybeSingle();

        if (!numError && numData) {
          return mapSupabaseOrder(numData);
        }
      } catch (err) {
        console.warn('Supabase order details notice:', err);
      }
    }

    const orders = orderService.getLocalOrders();
    const lowerClean = cleanId.toLowerCase();
    const localMatch = orders.find(
      (o) =>
        o.id.toLowerCase() === lowerClean ||
        (o.order_number && o.order_number.toLowerCase() === lowerClean)
    );
    return localMatch || null;
  },

  /**
   * Track order by ID or order reference number
   */
  async trackOrder(query: string): Promise<Order | null> {
    return orderService.getOrderById(query);
  },

  /**
   * Update payment status for an order
   */
  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    orderStatus?: string
  ): Promise<boolean> {
    // Update local storage orders
    const localOrders = orderService.getLocalOrders();
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      localOrders[idx].payment_status = paymentStatus;
      if (orderStatus) {
        localOrders[idx].status = orderStatus as any;
      }
      safeSetItem(LOCAL_ORDERS_KEY, localOrders);
    }

    // Update Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const updatePayload: any = {
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        };
        if (orderStatus) {
          updatePayload.status = orderStatus;
        }

        await supabase.from('orders').update(updatePayload).eq('id', orderId);
      } catch (err) {
        console.warn('Failed to update order payment status in Supabase:', err);
      }
    }

    return true;
  },
};

