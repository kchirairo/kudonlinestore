export type CustomerNotificationType =
  | 'order_created'
  | 'payment_success'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'order_status_change'
  | 'shipping'
  | 'collection'
  | 'delivery'
  | 'general';

export interface CustomerNotification {
  id: string;
  user_id: string;
  type: CustomerNotificationType | string;
  title: string;
  message: string;
  order_id?: string | null;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, any>;
  fingerprint?: string | null;
  created_at: string;
}

export interface CustomerNotificationPreferences {
  user_id: string;
  order_updates: boolean;
  payment_updates: boolean;
  shipping_updates: boolean;
  delivery_updates: boolean;
  promotions: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  updated_at?: string;
}

export interface CustomerPushSubscription {
  id?: string;
  user_id: string;
  endpoint: string;
  p256dh?: string;
  auth?: string;
  subscription_json?: any;
  device_type?: string;
  created_at?: string;
  updated_at?: string;
}
