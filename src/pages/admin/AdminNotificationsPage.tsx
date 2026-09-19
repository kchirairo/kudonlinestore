import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCheck,
  Check,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Shield,
  ShoppingBag,
  CreditCard,
  Package,
  User,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  adminNotificationService,
  NotificationTabCounts,
} from '../../services/adminNotificationService';
import {
  AdminNotification,
  NotificationFilterTab,
  NotificationSeverity,
  NotificationType,
} from '../../types';
import { ConfirmationModal } from '../../components/admin/ConfirmationModal';
import { useShop } from '../../context/ShopContext';
import { SEOHead } from '../../components/SEOHead';

const FILTER_TABS: Array<{ id: NotificationFilterTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'unread', label: 'Unread', icon: BellRing },
  { id: 'critical', label: 'Critical', icon: AlertTriangle },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'order', label: 'Orders', icon: ShoppingBag },
  { id: 'payment', label: 'Payments', icon: CreditCard },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

function formatTimeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}

function getSeverityBadge(severity: NotificationSeverity) {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
        icon: AlertTriangle,
        label: 'Critical',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
        icon: AlertCircle,
        label: 'Warning',
      };
    case 'success':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
        icon: CheckCircle2,
        label: 'Success',
      };
    case 'error':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900',
        icon: AlertCircle,
        label: 'Error',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
        icon: Info,
        label: 'Info',
      };
  }
}

function getTypeBadge(type: NotificationType) {
  switch (type) {
    case 'order':
      return { icon: ShoppingBag, label: 'Order' };
    case 'payment':
      return { icon: CreditCard, label: 'Payment' };
    case 'inventory':
      return { icon: Package, label: 'Inventory' };
    case 'security':
      return { icon: Shield, label: 'Security' };
    default:
      return { icon: Bell, label: type.charAt(0).toUpperCase() + type.slice(1) };
  }
}

export const AdminNotificationsPage: React.FC = () => {
  const { showToast } = useShop();

  const [activeTab, setActiveTab] = useState<NotificationFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [tabCounts, setTabCounts] = useState<NotificationTabCounts>({
    all: 0,
    unread: 0,
    critical: 0,
    security: 0,
    order: 0,
    payment: 0,
    inventory: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mark all & delete state
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [notificationToDelete, setNotificationToDelete] = useState<AdminNotification | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch notifications
  const loadNotifications = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setErrorMessage(null);

      try {
        const [res, counts] = await Promise.all([
          adminNotificationService.getNotifications({
            tab: activeTab,
            search: debouncedSearch,
            page,
            limit,
          }),
          adminNotificationService.getTabCounts(),
        ]);

        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setNotifications(res.data);
          setTotalCount(res.totalCount);
          setTotalPages(res.totalPages);
          setTabCounts(counts);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to connect to notification center.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, debouncedSearch, page, limit]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription setup
  useEffect(() => {
    const unsubscribe = adminNotificationService.subscribeToChanges(() => {
      loadNotifications(true);
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  // Handlers
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setTabCounts((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread - 1),
    }));

    const result = await adminNotificationService.markAsRead(id);
    if (!result.success) {
      showToast(result.error || 'Failed to mark as read', 'error');
      // Revert if failed
      loadNotifications(true);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (tabCounts.unread === 0) {
      showToast('All notifications are already marked as read', 'info');
      return;
    }

    setIsMarkingAll(true);
    try {
      const result = await adminNotificationService.markAllAsRead();
      if (result.success) {
        showToast('All notifications marked as read', 'success');
        loadNotifications(true);
      } else {
        showToast(result.error || 'Failed to mark all as read', 'error');
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    setIsDeleting(true);
    try {
      const result = await adminNotificationService.deleteNotification(notificationToDelete.id);
      if (result.success) {
        showToast('Notification deleted', 'success');
        setNotificationToDelete(null);
        loadNotifications();
      } else {
        showToast(result.error || 'Failed to delete notification', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Admin Notification Center | KUD Store"
        description="System, order, inventory, and security notifications for store administration."
        canonicalPath="/admin/notifications"
        noindex={true}
      />

      <div className="space-y-6">
        {/* Header Ribbon with Unread Counter & Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] border border-rose-100 dark:border-rose-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6452] animate-pulse" />
                Live Notification Center
              </span>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                Authoritative Supabase Storage
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Administrative Notifications
            </h1>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Track incoming customer orders, verified payment receipts, critical security audits, and automated inventory depletion warnings.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
            {/* Mark all as read button */}
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll || tabCounts.unread === 0}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{isMarkingAll ? 'Marking...' : 'Mark all as read'}</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => loadNotifications(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-2xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh notifications"
              aria-label="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ff6452]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-gray-100 dark:border-slate-800 shadow-xs overflow-x-auto scrollbar-none transition-colors">
          <div className="flex items-center gap-1.5 min-w-max">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#ff6452]' : 'text-gray-400 dark:text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-[#ff6452] text-white'
                          : tab.id === 'critical'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                          : tab.id === 'unread'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications by title, order number, product, or description..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6452]/40 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Notification Center Error
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadNotifications()}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-slate-800" />
                    <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800 rounded-md" />
                  </div>
                  <div className="h-3 w-16 bg-gray-200 dark:bg-slate-800 rounded-md" />
                </div>
                <div className="h-3 w-3/4 bg-gray-100 dark:bg-slate-800/60 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && notifications.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 mx-auto flex items-center justify-center">
              <BellOff className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                No notifications found
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                {searchQuery
                  ? `No notifications matched your search "${searchQuery}". Try different keywords.`
                  : activeTab === 'unread'
                  ? 'All notifications have been read. You are completely caught up!'
                  : `There are currently no notifications under the "${activeTab}" filter tab.`}
              </p>
            </div>
            {(searchQuery || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && !errorMessage && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((item) => {
              const sevBadge = getSeverityBadge(item.severity);
              const typeBadge = getTypeBadge(item.type);
              const SevIcon = sevBadge.icon;
              const TypeIcon = typeBadge.icon;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl border transition-all duration-200 p-5 ${
                    !item.is_read
                      ? 'bg-white dark:bg-slate-900 border-l-4 border-l-[#ff6452] border-gray-200 dark:border-slate-700 shadow-xs'
                      : 'bg-gray-50/60 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800/80 opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    {/* Left: Severity Icon & Content */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${sevBadge.bg}`}
                      >
                        <SevIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Tags and Title */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${sevBadge.bg}`}
                          >
                            {sevBadge.label}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                            <TypeIcon className="w-3 h-3 text-gray-500 dark:text-slate-400" />
                            <span>{typeBadge.label}</span>
                          </span>

                          {!item.is_read && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ff6452] text-white">
                              Unread
                            </span>
                          )}

                          <span
                            className="text-[11px] text-gray-400 dark:text-slate-500 font-medium ml-auto sm:ml-0"
                            title={new Date(item.created_at).toLocaleString()}
                          >
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                          {item.title}
                        </h3>

                        {/* Message */}
                        <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed break-words">
                          {item.message}
                        </p>

                        {/* Related Entity Links (Order / Product / Customer) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1.5">
                          {item.order_id && (
                            <Link
                              to={`/admin/orders/${item.order_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-colors border border-blue-200 dark:border-blue-900/50"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>
                                View Order {item.metadata?.order_number ? `#${item.metadata.order_number}` : ''}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </Link>
                          )}

                          {item.product_id && (
                            <Link
                              to={`/admin/products/${item.product_id}/edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[11px] font-bold transition-colors border border-purple-200 dark:border-purple-900/50"
                            >
                              <Package className="w-3 h-3" />
                              <span>Edit Product</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </Link>
                          )}

                          {item.user_id && (
                            <Link
                              to={`/admin/customers/${item.user_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-colors border border-emerald-200 dark:border-emerald-900/50"
                            >
                              <User className="w-3 h-3" />
                              <span>View Customer</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {!item.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">Mark read</span>
                        </button>
                      )}

                      <button
                        onClick={() => setNotificationToDelete(item)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Showing <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-gray-900 dark:text-white">
                {Math.min(page * limit, totalCount)}
              </span>{' '}
              of <span className="font-bold text-gray-900 dark:text-white">{totalCount}</span> notifications
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-xs font-bold text-gray-800 dark:text-slate-200">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(notificationToDelete)}
        title="Delete Notification"
        message={`Are you sure you want to permanently delete this notification: "${notificationToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Notification"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setNotificationToDelete(null)}
      />
    </>
  );
};
