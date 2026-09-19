import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Users,
  Settings,
  Store,
  LogOut,
  X,
  ShieldCheck,
  FileText,
  TrendingUp,
  Megaphone,
  Bell,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { adminNotificationService } from '../../services/adminNotificationService';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  pendingOrdersCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen = false,
  onClose,
  pendingOrdersCount = 0,
}) => {
  const navigate = useNavigate();
  const { signOut, storeBranding } = useShop();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await adminNotificationService.getUnreadCount();
        setUnreadNotificationsCount(count);
      } catch {
        // Ignored
      }
    };
    fetchUnread();

    const unsubscribe = adminNotificationService.subscribeToChanges(() => {
      fetchUnread();
    });

    const interval = setInterval(fetchUnread, 30000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const brandName = storeBranding?.storeName || STORE_CONFIG.STORE_NAME;
  const logoText = storeBranding?.logoText || 'K';
  const logoImage = storeBranding?.logoImageUrl;
  const accentColor = storeBranding?.accentColor || '#ff6452';

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoImage]);

  const hasValidLogo = Boolean(!logoLoadFailed && logoImage && typeof logoImage === 'string' && logoImage.trim().length > 0);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    {
      label: 'Notifications',
      path: '/admin/notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      label: 'Orders',
      path: '/admin/orders',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    { label: 'Invoices & Receipts', path: '/admin/invoices', icon: FileText },
    { label: 'Marketing Analytics', path: '/admin/marketing', icon: TrendingUp },
    { label: 'Promotional Banners', path: '/admin/banners', icon: Megaphone },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Categories', path: '/admin/categories', icon: Tags },
    { label: 'Customers', path: '/admin/customers', icon: Users },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {hasValidLogo ? (
            <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 shadow-xs border border-gray-100 dark:border-slate-700/60 p-0.5 flex-shrink-0">
              <img
                src={logoImage!}
                alt={brandName}
                onError={() => setLogoLoadFailed(true)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              style={{ backgroundColor: accentColor }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xs flex-shrink-0"
            >
              {logoText}
            </div>
          )}

          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none truncate max-w-[140px]">
              {brandName}
            </h2>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#ff6452] mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
        <span className="text-[10px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2 block">
          Menu Navigation
        </span>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#ff6452] text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Secondary Actions / Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-1.5">
        <NavLink
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Store className="w-4 h-4 text-gray-400 dark:text-slate-400" />
          <span>View Customer Store</span>
        </NavLink>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
