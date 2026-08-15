import { Order, OrderItem, ShippingAddress, PaymentStatus, OrderStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';

const LOCAL_ORDERS_KEY = 'kud_store_orders_history';

export const orderService = {
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

  async createOrder(
    items: OrderItem[],
    shippingAddress: ShippingAddress,
    subtotal: number,
    deliveryFee: number,
    discountAmount: number,
    paymentMethod: string,
    userId?: string
  ): Promise<Order> {
    const totalAmount = subtotal + deliveryFee - discountAmount;
    const orderNumber = `KUD-${Math.floor(100000 + Math.random() * 900000)}`;

    // Determine initial order status and payment status based on payment gateway
    const pmLower = paymentMethod.toLowerCase();
    const isOnlinePayment =
      pmLower.includes('yoco') ||
      pmLower.includes('card') ||
      pmLower.includes('eft') ||
      pmLower.includes('payfast') ||
      pmLower.includes('ozow');

    const initialOrderStatus: OrderStatus = isOnlinePayment ? 'pending' : 'confirmed';
    const initialPaymentStatus: PaymentStatus = 'pending';

    if (!isSupabaseConfigured() || !supabase) {
      if (isOnlinePayment) {
        throw new Error(
          'Database connection is not configured. Online payments require a persistent database connection.'
        );
      }
      // Offline fallback for non-online payments (e.g. COD) when Supabase is unconfigured
      const localUuid = crypto.randomUUID();
      const localOrder: Order = {
        id: localUuid,
        user_id: userId || 'guest',
        created_at: new Date().toISOString(),
        subtotal_amount: subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        status: initialOrderStatus,
        payment_status: initialPaymentStatus,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        items,
      };
      const existingOrders = orderService.getLocalOrders();
      existingOrders.unshift(localOrder);
      safeSetItem(LOCAL_ORDERS_KEY, existingOrders);
      return localOrder;
    }

    const payload: any = {
      order_number: orderNumber,
      user_id: userId && userId !== 'guest' ? userId : null,
      subtotal: subtotal,
      shipping_fee: deliveryFee,
      discount: discountAmount,
      total: totalAmount,
      status: initialOrderStatus,
      payment_status: initialPaymentStatus,
      payment_method: paymentMethod,
      customer_name: shippingAddress.fullName || 'Valued Customer',
      customer_email: shippingAddress.email || '',
    };

    console.log('[ORDER CREATION] Inserting order into Supabase public.orders table:', payload);

    const { data, error } = await supabase
      .from('orders')
      .insert(payload)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[ORDER CREATION] Database order creation error:', error);
      throw new Error(
        `Failed to create order in database: ${error?.message || 'No data returned'}`
      );
    }

    console.log('[ORDER CREATION] Order successfully created in Supabase database! Generated Order ID:', data.id);

    const createdOrder: Order = {
      id: data.id,
      user_id: data.user_id || userId || 'guest',
      created_at: data.created_at || new Date().toISOString(),
      subtotal_amount: Number(data.subtotal),
      delivery_fee: Number(data.shipping_fee),
      discount_amount: Number(data.discount),
      total_amount: Number(data.total),
      status: data.status,
      payment_status: data.payment_status,
      payment_method: data.payment_method,
      shipping_address: shippingAddress,
      items,
    };

    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        order_id: data.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_brand: item.product_brand,
        product_image: item.product_image,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        variant: item.variant || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) {
        console.warn('order_items insert warning:', itemsError.message);
      }
    }

    // Save local copy for UI history/cache
    const existingOrders = orderService.getLocalOrders();
    existingOrders.unshift(createdOrder);
    safeSetItem(LOCAL_ORDERS_KEY, existingOrders);

    return createdOrder;
  },

  async getUserOrders(userId?: string): Promise<Order[]> {
    if (isSupabaseConfigured() && supabase && userId) {
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!ordersError && ordersData && ordersData.length > 0) {
          return ordersData.map((o: any) => ({
            id: o.id,
            user_id: o.user_id,
            created_at: o.created_at,
            subtotal_amount: o.subtotal_amount,
            delivery_fee: o.delivery_fee,
            discount_amount: o.discount_amount,
            total_amount: o.total_amount,
            status: o.status,
            payment_status: o.payment_status,
            payment_method: o.payment_method,
            shipping_address: o.shipping_address,
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
        console.warn('Supabase fetch user orders error, returning local:', err);
      }
    }

    return orderService.getLocalOrders();
  },

  getLocalOrders(): Order[] {
    return safeGetItem<Order[]>(LOCAL_ORDERS_KEY, []);
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const orders = orderService.getLocalOrders();
    const localMatch = orders.find((o) => o.id === orderId);
    if (localMatch) return localMatch;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            user_id: data.user_id,
            created_at: data.created_at,
            subtotal_amount: data.subtotal_amount,
            delivery_fee: data.delivery_fee,
            discount_amount: data.discount_amount,
            total_amount: data.total_amount,
            status: data.status,
            payment_status: data.payment_status,
            payment_method: data.payment_method,
            shipping_address: data.shipping_address,
            items: (data.order_items || []).map((item: any) => ({
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
          };
        }
      } catch (err) {
        console.warn('Supabase order details error:', err);
      }
    }

    return null;
  },

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
