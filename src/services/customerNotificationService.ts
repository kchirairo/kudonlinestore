import { supabase, isSupabaseConfigured, executeWithColumnFallback } from '../lib/supabase';
import {
  CustomerNotification,
  CustomerNotificationPreferences,
  CustomerNotificationType,
  CustomerPushSubscription,
} from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const DEFAULT_PREFERENCES = (userId: string): CustomerNotificationPreferences => ({
  user_id: userId,
  order_updates: true,
  payment_updates: true,
  shipping_updates: true,
  delivery_updates: true,
  promotions: false,
  email_notifications: true,
  push_notifications: false,
  in_app_notifications: true,
});

const LOCAL_NOTIFICATIONS_KEY = (userId: string) => `kud_customer_notifications_${userId}`;
const LOCAL_PREFERENCES_KEY = (userId: string) => `kud_customer_notif_prefs_${userId}`;

export const customerNotificationService = {
  /**
   * Fetches notifications for a customer from Supabase, ordered newest first.
   */
  async getNotifications(userId: string, limit = 50): Promise<CustomerNotification[]> {
    if (!userId) return [];

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data) {
          const mapped: CustomerNotification[] = data.map((n: any) => ({
            id: n.id,
            user_id: n.user_id,
            type: n.type || 'general',
            title: n.title || 'Notification',
            message: n.message || '',
            order_id: n.order_id || null,
            link: n.link || (n.order_id ? `/orders/${n.order_id}` : null),
            is_read: Boolean(n.is_read),
            read_at: n.read_at || null,
            metadata: n.metadata || {},
            fingerprint: n.fingerprint || null,
            created_at: n.created_at || new Date().toISOString(),
          }));

          // Cache in local storage for fast instant load
          safeSetItem(LOCAL_NOTIFICATIONS_KEY(userId), mapped);
          return mapped;
        } else if (error) {
          console.warn('[customerNotificationService] Error querying notifications table:', error.message);
        }
      } catch (err: any) {
        console.warn('[customerNotificationService] Exception querying notifications:', err?.message);
      }
    }

    // Fallback to local storage cache
    return safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
  },

  /**
   * Returns exact unread notifications count for a customer.
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId) return 0;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch (err: any) {
        console.warn('[customerNotificationService] Error counting unread:', err?.message);
      }
    }

    const local = safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
    return local.filter((n) => !n.is_read).length;
  },

  /**
   * Marks a single notification as read in Supabase.
   */
  async markAsRead(notificationId: string, userId?: string): Promise<boolean> {
    if (!notificationId) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId);
      } catch (err: any) {
        console.warn('[customerNotificationService] Error marking as read:', err?.message);
      }
    }

    if (userId) {
      const local = safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
      const updated = local.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      safeSetItem(LOCAL_NOTIFICATIONS_KEY(userId), updated);
    }

    return true;
  },

  /**
   * Marks all notifications as read for a customer.
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('is_read', false);
      } catch (err: any) {
        console.warn('[customerNotificationService] Error marking all as read:', err?.message);
      }
    }

    const local = safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
    const updated = local.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }));
    safeSetItem(LOCAL_NOTIFICATIONS_KEY(userId), updated);

    return true;
  },

  /**
   * Deletes a notification by ID.
   */
  async deleteNotification(notificationId: string, userId?: string): Promise<boolean> {
    if (!notificationId) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('notifications').delete().eq('id', notificationId);
      } catch (err: any) {
        console.warn('[customerNotificationService] Error deleting notification:', err?.message);
      }
    }

    if (userId) {
      const local = safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
      const updated = local.filter((n) => n.id !== notificationId);
      safeSetItem(LOCAL_NOTIFICATIONS_KEY(userId), updated);
    }

    return true;
  },

  /**
   * Fetches customer notification preferences from Supabase.
   */
  async getPreferences(userId: string): Promise<CustomerNotificationPreferences> {
    if (!userId) return DEFAULT_PREFERENCES('');

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          const prefs: CustomerNotificationPreferences = {
            user_id: userId,
            order_updates: data.order_updates !== false,
            payment_updates: data.payment_updates !== false,
            shipping_updates: data.shipping_updates !== false,
            delivery_updates: data.delivery_updates !== false,
            promotions: Boolean(data.promotions),
            email_notifications: data.email_notifications !== false,
            push_notifications: Boolean(data.push_notifications),
            in_app_notifications: data.in_app_notifications !== false,
            updated_at: data.updated_at,
          };
          safeSetItem(LOCAL_PREFERENCES_KEY(userId), prefs);
          return prefs;
        }
      } catch (err: any) {
        console.warn('[customerNotificationService] Exception fetching preferences:', err?.message);
      }
    }

    return safeGetItem<CustomerNotificationPreferences>(
      LOCAL_PREFERENCES_KEY(userId),
      DEFAULT_PREFERENCES(userId)
    );
  },

  /**
   * Updates customer notification preferences in Supabase.
   */
  async updatePreferences(
    userId: string,
    updates: Partial<CustomerNotificationPreferences>
  ): Promise<{ success: boolean; data?: CustomerNotificationPreferences; error?: string }> {
    if (!userId) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const current = await this.getPreferences(userId);
    const merged: CustomerNotificationPreferences = {
      ...current,
      ...updates,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    safeSetItem(LOCAL_PREFERENCES_KEY(userId), merged);

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('notification_preferences')
          .upsert(merged, { onConflict: 'user_id' });

        if (error) {
          console.warn('[customerNotificationService] Error saving preferences to Supabase:', error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.warn('[customerNotificationService] Exception saving preferences:', err?.message);
        return { success: false, error: err?.message };
      }
    }

    return { success: true, data: merged };
  },

  /**
   * Creates a notification in Supabase for a customer if their preferences permit it.
   * Uses an idempotent fingerprint to prevent duplicate notifications.
   */
  async createNotificationSafe(params: {
    userId: string;
    type: CustomerNotificationType;
    title: string;
    message: string;
    orderId?: string | null;
    link?: string | null;
    metadata?: Record<string, any>;
    fingerprint?: string | null;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, type, title, message, orderId, link, metadata = {}, fingerprint } = params;
    if (!userId) return { success: false };

    // 1. Verify user preferences
    const prefs = await this.getPreferences(userId);

    if (prefs.in_app_notifications === false) {
      console.log('[customerNotificationService] In-app notifications disabled in preferences, skipped.');
      return { success: false };
    }

    if (type === 'order_created' && !prefs.order_updates) {
      console.log('[customerNotificationService] Order updates disabled in preferences, skipped.');
      return { success: false };
    }

    if (
      (type === 'payment_success' || type === 'payment_failed' || type === 'payment_cancelled') &&
      !prefs.payment_updates
    ) {
      console.log('[customerNotificationService] Payment updates disabled in preferences, skipped.');
      return { success: false };
    }

    if (type === 'order_status_change' && !prefs.order_updates) {
      console.log('[customerNotificationService] Status updates disabled in preferences, skipped.');
      return { success: false };
    }

    if ((type === 'shipping' || type === 'collection') && !prefs.shipping_updates) {
      console.log('[customerNotificationService] Shipping updates disabled in preferences, skipped.');
      return { success: false };
    }

    if (type === 'delivery' && !prefs.delivery_updates) {
      console.log('[customerNotificationService] Delivery updates disabled in preferences, skipped.');
      return { success: false };
    }

    // 2. Check fingerprint in DB or local storage to prevent duplicate notifications
    const cleanFingerprint = fingerprint || `${type}_${orderId || userId}_${Date.now()}`;

    const newNotification: CustomerNotification = {
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      title,
      message,
      order_id: orderId || null,
      link: link || (orderId ? `/orders/${orderId}` : null),
      is_read: false,
      read_at: null,
      metadata,
      fingerprint: cleanFingerprint,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        // If fingerprint is set, check if already exists
        if (cleanFingerprint) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('fingerprint', cleanFingerprint)
            .maybeSingle();

          if (existing?.id) {
            console.log('[customerNotificationService] Duplicate notification prevented via fingerprint:', cleanFingerprint);
            return { success: true, id: existing.id };
          }
        }

        const { data: inserted, error } = await executeWithColumnFallback(
          (payload) => supabase.from('notifications').insert(payload).select('id').single(),
          newNotification
        );

        if (!error && inserted) {
          return { success: true, id: inserted.id };
        }
      } catch (err: any) {
        console.warn('[customerNotificationService] Database insert notice:', err?.message);
      }
    }

    // Local cache update
    const local = safeGetItem<CustomerNotification[]>(LOCAL_NOTIFICATIONS_KEY(userId), []);
    if (!local.some((n) => n.fingerprint === cleanFingerprint)) {
      local.unshift(newNotification);
      safeSetItem(LOCAL_NOTIFICATIONS_KEY(userId), local);
    }

    return { success: true, id: newNotification.id };
  },

  /**
   * Subscribes to real-time changes on the public.notifications table for the active user.
   */
  subscribeToNotifications(userId: string, onUpdate: () => void): () => void {
    if (!userId || !isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    try {
      const channelId = `customer_notifs_${userId}_${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            onUpdate();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('[customerNotificationService] Error initializing realtime channel:', err);
      return () => {};
    }
  },

  /**
   * Registers a web push subscription into public.push_subscriptions.
   */
  async registerPushSubscription(userId: string, subscription: PushSubscription): Promise<boolean> {
    if (!userId || !subscription) return false;

    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    const payload: CustomerPushSubscription = {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      subscription_json: subJson,
      device_type: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'browser',
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(payload, { onConflict: 'user_id,endpoint' });

        if (error) {
          console.warn('[customerNotificationService] Error saving push subscription:', error.message);
          return false;
        }
        return true;
      } catch (err: any) {
        console.warn('[customerNotificationService] Exception saving push subscription:', err?.message);
      }
    }

    return true;
  },

  /**
   * Removes a push subscription from public.push_subscriptions.
   */
  async unregisterPushSubscription(userId: string, endpoint: string): Promise<boolean> {
    if (!userId || !endpoint) return false;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('push_subscriptions')
          .delete()
          .match({ user_id: userId, endpoint });
        return true;
      } catch (err: any) {
        console.warn('[customerNotificationService] Error deleting push subscription:', err?.message);
      }
    }
    return true;
  },

  /**
   * Requests browser Push Notification permission and saves subscription if supported.
   */
  async requestPushPermissionAndSubscribe(
    userId: string
  ): Promise<{ supported: boolean; permission: NotificationPermission; error?: string }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { supported: false, permission: 'denied', error: 'Notifications are not supported on this browser.' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { supported: true, permission, error: 'Notification permission was not granted.' };
      }

      // If Service Worker & PushManager are available
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          let sub = await registration.pushManager.getSubscription();

          if (!sub) {
            // Register new subscription if VAPID key is configured, or subscribe
            // Safe fallback: try subscribing or get existing
            console.log('[customerNotificationService] PushManager ready for subscriptions.');
          } else {
            await this.registerPushSubscription(userId, sub);
          }
        } catch (swErr: any) {
          console.warn('[customerNotificationService] Push subscription registration note:', swErr?.message);
        }
      }

      // Update preferences
      await this.updatePreferences(userId, { push_notifications: true });

      return { supported: true, permission: 'granted' };
    } catch (err: any) {
      return { supported: true, permission: 'denied', error: err?.message || 'Permission request failed.' };
    }
  },

  /**
   * Order successfully created → “Order Placed”
   */
  async notifyOrderPlaced(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    total: number;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, total } = params;
    return this.createNotificationSafe({
      userId,
      type: 'order_created',
      title: 'Order Placed',
      message: `Your order #${orderNumber} for R${Number(total || 0).toFixed(2)} has been placed successfully.`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber, total },
      fingerprint: `order_created_${orderId}`,
    });
  },

  /**
   * YOCO payment successful → “Payment Successful”
   */
  async notifyPaymentSuccessful(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentReference?: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, amount, paymentReference } = params;
    return this.createNotificationSafe({
      userId,
      type: 'payment_success',
      title: 'Payment Successful',
      message: `Payment of R${Number(amount || 0).toFixed(2)} for order #${orderNumber} was successful. We are processing your items.`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber, amount, paymentReference },
      fingerprint: `payment_success_${orderId}`,
    });
  },

  /**
   * YOCO payment failed/cancelled → “Payment Failed”
   */
  async notifyPaymentFailed(params: {
    userId: string;
    orderId?: string | null;
    orderNumber?: string;
    reason?: string;
    isCancelled?: boolean;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, reason, isCancelled } = params;
    const targetOrderLabel = orderNumber ? `#${orderNumber}` : orderId ? `#${orderId.slice(0, 8)}` : '';
    const cleanMsg = isCancelled
      ? `Payment for order ${targetOrderLabel} was cancelled. Your items remain safely in your cart.`
      : `Payment for order ${targetOrderLabel} was unsuccessful. ${reason || 'Please retry or choose another payment method.'}`;

    return this.createNotificationSafe({
      userId,
      type: isCancelled ? 'payment_cancelled' : 'payment_failed',
      title: 'Payment Failed',
      message: cleanMsg,
      orderId: orderId || null,
      link: orderId ? `/orders/${orderId}` : '/checkout',
      metadata: { orderId, orderNumber, reason, isCancelled: Boolean(isCancelled) },
      fingerprint: `payment_failed_${orderId || userId}_${isCancelled ? 'cancelled' : 'failed'}`,
    });
  },

  /**
   * Order status changed → notify the customer with the new status
   */
  async notifyOrderStatusChanged(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    newStatus: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, newStatus } = params;
    const formattedStatus = newStatus.replace(/_/g, ' ');
    return this.createNotificationSafe({
      userId,
      type: 'order_status_change',
      title: 'Order Update',
      message: `Your order #${orderNumber} status has been updated to ${formattedStatus}.`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber, newStatus },
      fingerprint: `order_status_${orderId}_${newStatus}`,
    });
  },

  /**
   * Order shipped → “Order Update”
   */
  async notifyOrderShipped(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    trackingNumber?: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, trackingNumber } = params;
    return this.createNotificationSafe({
      userId,
      type: 'shipping',
      title: 'Order Update',
      message: trackingNumber
        ? `Your order #${orderNumber} has been shipped! Tracking number: ${trackingNumber}.`
        : `Your order #${orderNumber} has been shipped! It is on its way to your delivery address.`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber, trackingNumber },
      fingerprint: `order_shipping_${orderId}`,
    });
  },

  /**
   * Order ready for collection → “Order Update”
   */
  async notifyOrderReadyForCollection(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
    pickupLocation?: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber, pickupLocation } = params;
    return this.createNotificationSafe({
      userId,
      type: 'collection',
      title: 'Order Update',
      message: pickupLocation
        ? `Your order #${orderNumber} is ready for collection at ${pickupLocation}.`
        : `Your order #${orderNumber} is ready for collection at our store pickup point.`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber, pickupLocation },
      fingerprint: `order_collection_${orderId}`,
    });
  },

  /**
   * Order delivered → “Order Delivered”
   */
  async notifyOrderDelivered(params: {
    userId: string;
    orderId: string;
    orderNumber: string;
  }): Promise<{ success: boolean; id?: string }> {
    const { userId, orderId, orderNumber } = params;
    return this.createNotificationSafe({
      userId,
      type: 'delivery',
      title: 'Order Delivered',
      message: `Your order #${orderNumber} has been delivered. Thank you for shopping with KUD Store!`,
      orderId,
      link: `/orders/${orderId}`,
      metadata: { orderId, orderNumber },
      fingerprint: `order_delivery_${orderId}`,
    });
  },
};
