import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  CreditCard,
  Truck,
  PackageCheck,
  AlertTriangle,
  Sliders,
  X,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { customerNotificationService } from '../services/customerNotificationService';
import { CustomerNotification, UserProfile } from '../types';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';

interface CustomerNotificationBellProps {
  user: UserProfile | null;
  className?: string;
}

export const CustomerNotificationBell: React.FC<CustomerNotificationBellProps> = ({
  user,
  className = '',
}) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load count & notifications
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    try {
      const [count, list] = await Promise.all([
        customerNotificationService.getUnreadCount(user.id),
        customerNotificationService.getNotifications(user.id, 25),
      ]);
      setUnreadCount(count);
      setNotifications(list);
    } catch (err) {
      console.warn('[CustomerNotificationBell] Error fetching notifications:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    loadData();

    // Subscribe to real-time changes on public.notifications in Supabase
    const unsubscribe = customerNotificationService.subscribeToNotifications(user.id, () => {
      loadData();
    });

    // 30s background sync
    const interval = setInterval(loadData, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id, loadData]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      loadData();
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notif: CustomerNotification) => {
    if (!notif.is_read) {
      await customerNotificationService.markAsRead(notif.id, user?.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setIsOpen(false);

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.order_id) {
      navigate(`/orders/${notif.order_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await customerNotificationService.markAllAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    if (!user?.id) return;
    await customerNotificationService.deleteNotification(notifId, user.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  if (!user) return null;

  // Filter list
  const filteredNotifications =
    activeTab === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <ShoppingBag className="w-4 h-4 text-blue-600" />;
      case 'payment_success':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'payment_failed':
      case 'payment_cancelled':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'shipping':
      case 'collection':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'delivery':
        return <PackageCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#ff6452]" />;
    }
  };

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-label={`Notifications, ${unreadCount} unread`}
          className="p-2.5 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full relative transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />

          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#ff6452] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs animate-in zoom-in-75">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Popover Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/50 text-[#ff6452]">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    title="Mark all as read"
                    aria-label="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsPrefsModalOpen(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  title="Notification settings"
                  aria-label="Notification settings"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full font-bold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-full font-bold transition-colors ${
                  activeTab === 'unread'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/60">
              {isLoading ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#ff6452]" />
                  <span className="text-xs">Loading updates...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-8 h-8 opacity-30 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Orders, delivery tracking, and payment alerts will show up here.
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 cursor-pointer group relative ${
                      !item.is_read ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        {!item.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6452] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1">
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-rose-600 transition-opacity absolute right-2 top-2"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Synced with Supabase</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/account');
                }}
                className="font-bold text-[#ff6452] hover:underline flex items-center gap-1"
              >
                <span>Account dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        user={user}
      />
    </>
  );
};
