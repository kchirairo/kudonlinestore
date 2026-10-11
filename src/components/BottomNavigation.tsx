import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, Heart, User } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, favourites } = useShop();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Categories', path: '/categories', icon: Grid },
    { label: 'Wishlist', path: '/wishlist', icon: Heart, badge: favourites.length },
    { label: 'Cart', path: '/cart', icon: ShoppingBag, badge: cartCount, highlightBadge: true },
    { label: 'Account', path: '/account', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(8,34,74,0.06)] pt-1.5 pb-safe px-2 sm:px-6 transition-colors duration-200"
    >
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : item.path === '/categories'
              ? location.pathname.startsWith('/categor')
              : item.path === '/wishlist'
              ? location.pathname === '/wishlist' || location.pathname === '/favourites'
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all relative cursor-pointer ${
                isActive
                  ? 'text-[#0d3166] dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-[#1d4ed8] dark:bg-blue-400" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-105 stroke-[2.4]' : 'stroke-[1.9]'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-white text-[10px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-2xs ${
                      item.highlightBadge ? 'bg-[#ef4444]' : 'bg-[#1d4ed8]'
                    }`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 ${
                  isActive
                    ? 'text-[#0d3166] dark:text-blue-400 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
