import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, Search, User } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useShop();

  const navItems = [
    { label: 'HOME', path: '/', icon: Home },
    { label: 'CATEGORIES', path: '/categories', icon: Grid },
    { label: 'CART', path: '/cart', icon: ShoppingBag, badge: cartCount },
    { label: 'SEARCH', path: '/search', icon: Search },
    { label: 'ACCOUNT', path: '/account', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg py-2 px-3 sm:px-6 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all relative ${
                isActive ? 'text-[#ff6452]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#ff6452] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-wider mt-1 font-semibold uppercase ${isActive ? 'text-[#ff6452] font-bold' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
