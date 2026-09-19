import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  AlertTriangle,
  ShoppingBag,
  CreditCard,
  Package,
  Shield,
  X,
} from 'lucide-react';
import { adminNotificationService } from '../../services/adminNotificationService';
import { AdminNotification } from '../../types';

export const AdminNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count & recent preview
  const fetchStatus = async () => {
    try {
      const count = await adminNotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignored
    }
  };

  const loadDropdownData = async () => {
    setIsLoading(true);
    try {
      const res = await adminNotificationService.getNotifications({
        limit: 5,
        tab: 'unread',
      });
      setRecentNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Set up realtime sync
    const unsubscribe = adminNotificationService.subscribeToChanges(() => {
      fetchStatus();
      if (isOpen) {
        loadDropdownData();
      }
    });

    // Efficient 30s background poll
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen]);

  // Handle outside click to close dropdown
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
      loadDropdownData();
    }
    setIsOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    await adminNotificationService.markAllAsRead();
    setUnreadCount(0);
    setRecentNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={`Admin notifications, ${unreadCount} unread`}
        className={`relative p-2 rounded-full border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6452]/40 ${
          isOpen
            ? 'bg-gray-100 dark:bg-slate-800 border-[#ff6452]'
            : 'border-gray-200/80 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
      >
        <Bell className="w-4 h-4 text-gray-700 dark:text-slate-300" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ff6452] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Quick Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
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
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications preview items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-500">
                Loading notifications...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  No unread notifications at the moment.
                </p>
              </div>
            ) : (
              recentNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin/notifications');
                  }}
                  className="p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800 text-center">
            <Link
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black hover:opacity-90 transition-opacity"
            >
              <span>Open Notification Center</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
