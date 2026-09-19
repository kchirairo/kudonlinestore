import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  AdminNotification,
  AdminNotificationFilters,
  NotificationFilterTab,
} from '../types';

export interface NotificationListResult {
  data: AdminNotification[];
  totalCount: number;
  unreadCount: number;
  page: number;
  totalPages: number;
  error: string | null;
}

export interface NotificationTabCounts {
  all: number;
  unread: number;
  critical: number;
  security: number;
  order: number;
  payment: number;
  inventory: number;
}

export class AdminNotificationService {
  /**
   * Fetches paginated notifications matching specified filter tabs and search query.
   * Utilizes existing Supabase RLS and public.is_admin() authorization.
   */
  async getNotifications(filters?: AdminNotificationFilters): Promise<NotificationListResult> {
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, filters?.limit || 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (!isSupabaseConfigured() || !supabase) {
      return {
        data: [],
        totalCount: 0,
        unreadCount: 0,
        page,
        totalPages: 1,
        error: 'Database is not configured.',
      };
    }

    try {
      let query = supabase
        .from('admin_notifications')
        .select('*', { count: 'exact' });

      // Apply tab filter
      const tab = filters?.tab || 'all';
      if (tab === 'unread') {
        query = query.eq('is_read', false);
      } else if (tab === 'critical') {
        query = query.eq('severity', 'critical');
      } else if (tab === 'security') {
        query = query.eq('type', 'security');
      } else if (tab === 'order') {
        query = query.eq('type', 'order');
      } else if (tab === 'payment') {
        query = query.eq('type', 'payment');
      } else if (tab === 'inventory') {
        query = query.eq('type', 'inventory');
      }

      // Apply search keyword filter
      const search = filters?.search?.trim();
      if (search && search.length > 0) {
        // Search across title and message
        query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
      }

      // Order newest first and apply pagination range
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;

      if (error) {
        const isForbidden = error.code === '42501' || error.message?.toLowerCase().includes('permission denied');
        return {
          data: [],
          totalCount: 0,
          unreadCount: 0,
          page,
          totalPages: 1,
          error: isForbidden
            ? 'Access restricted: Active administrator privileges are required to view notifications.'
            : error.message || 'Failed to fetch admin notifications.',
        };
      }

      // Also get live unread count
      const unreadCount = await this.getUnreadCount();

      const total = count ?? data?.length ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return {
        data: (data as AdminNotification[]) || [],
        totalCount: total,
        unreadCount,
        page,
        totalPages,
        error: null,
      };
    } catch (err: any) {
      console.error('[AdminNotificationService] Fetch error:', err);
      return {
        data: [],
        totalCount: 0,
        unreadCount: 0,
        page,
        totalPages: 1,
        error: err?.message || 'An unexpected error occurred while fetching notifications.',
      };
    }
  }

  /**
   * Fetches total unread count for badges and bells
   */
  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured() || !supabase) return 0;
    try {
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        return 0;
      }
      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Fetches counts for each filter tab to display live counters
   */
  async getTabCounts(): Promise<NotificationTabCounts> {
    const counts: NotificationTabCounts = {
      all: 0,
      unread: 0,
      critical: 0,
      security: 0,
      order: 0,
      payment: 0,
      inventory: 0,
    };

    if (!isSupabaseConfigured() || !supabase) return counts;

    try {
      const [allRes, unreadRes, criticalRes, secRes, orderRes, payRes, invRes] =
        await Promise.all([
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('severity', 'critical'),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('type', 'security'),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('type', 'order'),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('type', 'payment'),
          supabase.from('admin_notifications').select('id', { count: 'exact', head: true }).eq('type', 'inventory'),
        ]);

      counts.all = allRes.count || 0;
      counts.unread = unreadRes.count || 0;
      counts.critical = criticalRes.count || 0;
      counts.security = secRes.count || 0;
      counts.order = orderRes.count || 0;
      counts.payment = payRes.count || 0;
      counts.inventory = invRes.count || 0;
    } catch (err) {
      console.warn('[AdminNotificationService] Error calculating tab counts:', err);
    }

    return counts;
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database is not configured.' };
    }

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to mark notification as read.' };
    }
  }

  /**
   * Marks all unread notifications as read
   */
  async markAllAsRead(): Promise<{ success: boolean; error?: string; count?: number }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database is not configured.' };
    }

    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('is_read', false)
        .select('id');

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, count: data?.length || 0 };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to mark all as read.' };
    }
  }

  /**
   * Deletes a notification by ID
   */
  async deleteNotification(id: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database is not configured.' };
    }

    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete notification.' };
    }
  }

  /**
   * Subscribes to realtime PostgreSQL table changes on public.admin_notifications.
   * Returns cleanup unsubscribe callback.
   */
  subscribeToChanges(onChange: () => void): () => void {
    if (!isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    try {
      const channelId = `admin_notifications_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'admin_notifications' },
          () => {
            onChange();
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('[AdminNotificationService] Error unsubscribing realtime channel:', e);
        }
      };
    } catch (err) {
      console.warn('[AdminNotificationService] Realtime subscription error:', err);
      return () => {};
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
