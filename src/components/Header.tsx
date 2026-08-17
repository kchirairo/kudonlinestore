import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, Heart, User, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { STORE_CONFIG } from '../constants/config';
import { ThemeToggle } from './ThemeToggle';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, cartCount, favourites, user, storeBranding } = useShop();
  const { saveRecentSearch } = useRecentSearches();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      navigate('/search');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (location.pathname !== '/search' && e.target.value.trim().length > 0) {
      navigate('/search');
    }
  };

  const brandName = storeBranding?.storeName || STORE_CONFIG.STORE_NAME;
  const brandTagline = storeBranding?.tagline || 'Store';
  const logoText = storeBranding?.logoText || 'K';
  const logoImage = storeBranding?.logoImageUrl;
  const logoType = storeBranding?.logoType || 'badge';
  const accentColor = storeBranding?.accentColor || '#ff6452';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 py-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand Logo */}
        <div
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-2.5 group flex-shrink-0"
        >
          {logoImage && (logoType === 'image' || logoType === 'both') ? (
            <img
              src={logoImage}
              alt={brandName}
              style={{ maxHeight: `${storeBranding?.logoHeight || 36}px` }}
              className="object-contain max-w-[140px] sm:max-w-[180px] rounded-lg transition-transform group-hover:scale-105"
            />
          ) : null}

          {(!logoImage || logoType === 'badge' || logoType === 'both') && (
            <div
              style={{ backgroundColor: accentColor }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform flex-shrink-0"
            >
              {logoText}
            </div>
          )}

          {logoType !== 'image' && (
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white leading-none">
                {brandName.split(' ')[0]}
                <span style={{ color: accentColor }}>.</span>
              </span>
              {storeBranding?.showTagline && (
                <span className="text-[10px] font-medium text-gray-400 dark:text-slate-400 tracking-wider uppercase truncate max-w-[120px]">
                  {brandTagline}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Large Pill Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-2xl relative"
        >
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search items"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 rounded-full border border-transparent dark:border-slate-700/80 focus:border-[#ff6452] dark:focus:border-[#ff6452] focus:ring-2 focus:ring-[#ff6452]/20 outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Actions & Theme Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Global Theme Toggle */}
          <ThemeToggle />

          {/* Desktop Quick Links */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => navigate('/favourites')}
              className="p-2.5 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full relative transition-colors"
              title="Favourites"
              aria-label="Favourites"
            >
              <Heart className="w-5 h-5" />
              {favourites.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff6452]" />
              )}
            </button>

            <button
              onClick={() => navigate('/cart')}
              className="p-2.5 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full relative transition-colors"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ff6452] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/account')}
              className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/80 text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors ml-1"
            >
              <User className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              <span>{user ? user.fullName || 'Account' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
