import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Home,
  Grid,
  Package,
  ShieldCheck,
  FileText,
  ChevronRight,
  LayoutDashboard,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useProductCategories } from '../hooks/useProductCategories';
import { categoryToSlug } from '../utils/seo';
import { STORE_CONFIG } from '../constants/config';
import { ThemeToggle } from './ThemeToggle';
import { CustomerNotificationBell } from './CustomerNotificationBell';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, cartCount, favourites, user, role, storeBranding, generalSettings } = useShop();
  const { saveRecentSearch } = useRecentSearches();
  const { categoryNames } = useProductCategories();

  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isHolidayModeActive = React.useMemo(() => {
    if (!generalSettings?.holidayModeEnabled) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    if (generalSettings.holidayStartDate && todayStr < generalSettings.holidayStartDate) {
      return false;
    }
    if (generalSettings.holidayEndDate && todayStr > generalSettings.holidayEndDate) {
      return false;
    }
    return true;
  }, [
    generalSettings?.holidayModeEnabled,
    generalSettings?.holidayStartDate,
    generalSettings?.holidayEndDate,
  ]);

  const brandName = storeBranding?.storeName || STORE_CONFIG.STORE_NAME;
  const brandTagline = storeBranding?.tagline || 'Store';
  const logoText = storeBranding?.logoText || 'K';
  const logoImage = storeBranding?.logoImageUrl;
  const accentColor = storeBranding?.accentColor || '#ff6452';

  // Reset error flag whenever the logo URL changes
  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoImage]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const hasValidLogo = Boolean(
    !logoLoadFailed &&
      logoImage &&
      typeof logoImage === 'string' &&
      logoImage.trim().length > 0
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      navigate('/search');
    } else {
      navigate('/search');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (location.pathname !== '/search' && e.target.value.trim().length > 0) {
      navigate('/search');
    }
  };

  return (
    <>
      {isHolidayModeActive && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 text-slate-950 px-3.5 py-2 sm:px-6 lg:px-8 border-b border-amber-400/80 shadow-xs"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
            <span className="px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0">
              Holiday Mode
            </span>
            <p className="text-xs font-bold leading-snug">
              {generalSettings?.holidayMessage ||
                'We are currently operating in Holiday Mode. You can still browse and place orders, and dispatches will resume as soon as we return!'}
            </p>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-gradient-to-b from-[#08224a] to-[#0d3166] dark:from-[#061836] dark:to-[#0a254f] text-white shadow-md px-3.5 pt-2.5 pb-3 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto space-y-2.5">
          {/* Top Row: Hamburger Menu (Left) + KUD Brand Logo + Actions & Notification Bell (Right) */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Hamburger Menu Button & KUD Store Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="p-2 -ml-1 rounded-xl text-white/95 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              >
                <Menu className="w-6 h-6 stroke-[2.2]" />
              </button>

              <div
                onClick={() => navigate('/')}
                className="cursor-pointer flex items-center gap-2.5 group flex-shrink-0"
              >
                {hasValidLogo ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-xs group-hover:scale-105 transition-transform flex-shrink-0 p-0.5">
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
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xs group-hover:scale-105 transition-transform flex-shrink-0"
                  >
                    {logoText}
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="font-black text-lg sm:text-xl tracking-tight text-white leading-none">
                    {brandName.split(' ')[0]}
                    <span style={{ color: accentColor }}>.</span>
                  </span>
                  {storeBranding?.showTagline && (
                    <span className="text-[9px] sm:text-[10px] font-medium text-blue-200/80 tracking-wider uppercase truncate max-w-[130px] hidden xs:inline-block">
                      {brandTagline}
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop Navigation Links */}
              <nav aria-label="Primary Desktop Navigation" className="hidden lg:flex items-center gap-5 ml-6 text-xs font-semibold text-blue-100">
                <Link
                  to="/"
                  className={`hover:text-white transition-colors py-1 ${
                    location.pathname === '/' ? 'text-white underline underline-offset-4 decoration-2 decoration-[#38bdf8]' : ''
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/categories"
                  className={`hover:text-white transition-colors py-1 ${
                    location.pathname.startsWith('/categor') ? 'text-white underline underline-offset-4 decoration-2 decoration-[#38bdf8]' : ''
                  }`}
                >
                  Categories
                </Link>
                <Link
                  to="/wishlist"
                  className={`hover:text-white transition-colors py-1 ${
                    location.pathname === '/wishlist' || location.pathname === '/favourites'
                      ? 'text-white underline underline-offset-4 decoration-2 decoration-[#38bdf8]'
                      : ''
                  }`}
                >
                  Wishlist
                </Link>
                <Link
                  to="/orders"
                  className={`hover:text-white transition-colors py-1 ${
                    location.pathname.startsWith('/orders') ? 'text-white underline underline-offset-4 decoration-2 decoration-[#38bdf8]' : ''
                  }`}
                >
                  Orders
                </Link>
              </nav>
            </div>

            {/* Right: Notification Bell with Unread Badge & Desktop Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Desktop Search Bar inline on wide screens */}
              <form
                onSubmit={handleSearchSubmit}
                className="hidden md:block w-64 lg:w-80 xl:w-96 mr-1"
              >
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#1e3a8a] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (location.pathname !== '/search' && searchQuery.trim().length > 0) {
                        navigate('/search');
                      }
                    }}
                    placeholder="Search for products, brands..."
                    className="w-full pl-10 pr-8 py-2 bg-white text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-full border border-white/20 focus:ring-2 focus:ring-blue-400 outline-hidden transition-all shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 text-[11px] text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </form>

              {/* Notification Bell (Always visible in top-right with badge) */}
              <CustomerNotificationBell user={user} inverse={true} />

              {/* Desktop Theme Toggle & Cart/Account */}
              <div className="hidden md:flex items-center gap-1.5">
                <ThemeToggle className="!text-white/90 hover:!text-white hover:!bg-white/10" />

                <button
                  type="button"
                  onClick={() => navigate('/wishlist')}
                  className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full relative transition-colors cursor-pointer"
                  title="My Wishlist"
                  aria-label="Wishlist"
                >
                  <Heart className="w-5 h-5" />
                  {favourites.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ef4444]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/cart')}
                  className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full relative transition-colors cursor-pointer"
                  title="Shopping Cart"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#ef4444] text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-[#0b2a5b] shadow-xs">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/account')}
                  className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-colors ml-1 cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-200" />
                  <span className="max-w-[110px] truncate">
                    {user ? user.fullName || 'Account' : 'Sign In'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Second Row (Mobile): Full-Width White Rounded Pill Search Bar */}
          <form onSubmit={handleSearchSubmit} className="md:hidden w-full">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#0d3166] stroke-[2.4] absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onClick={() => {
                  if (location.pathname !== '/search' && searchQuery.trim().length > 0) {
                    navigate('/search');
                  }
                }}
                placeholder="Search for products, brands..."
                aria-label="Search for products, brands"
                className="w-full pl-11 pr-9 py-2.5 bg-white text-slate-900 placeholder-slate-400 text-sm font-medium rounded-full shadow-sm border border-white focus:ring-2 focus:ring-[#38bdf8] outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-3 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>
      </header>

      {/* Slide-Out Navigation Drawer (Triggered by Hamburger Icon) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Store navigation menu"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative z-10 w-[82vw] max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="bg-gradient-to-r from-[#08224a] to-[#0d3166] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    style={{ backgroundColor: accentColor }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-xs"
                  >
                    {logoText}
                  </div>
                  <div>
                    <span className="font-black text-base tracking-tight block leading-none">
                      {brandName}
                    </span>
                    <span className="text-[11px] text-blue-200 font-medium block mt-1">
                      {user ? user.email : 'Welcome to KUD Store'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Navigation Links */}
              <div className="p-3 space-y-1 border-b border-gray-100 dark:border-slate-800">
                <Link
                  to="/"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-[#1d63e8]" />
                    <span>Home</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/categories"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Grid className="w-4 h-4 text-[#1d63e8]" />
                    <span>All Categories</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/cart"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-[#1d63e8]" />
                    <span>Shopping Cart</span>
                  </span>
                  {cartCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#1d63e8] text-white">
                      {cartCount}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </Link>

                <Link
                  to="/wishlist"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-[#ff6452]" />
                    <span>My Wishlist</span>
                  </span>
                  {favourites.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950 text-[#ff6452]">
                      {favourites.length}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </Link>

                <Link
                  to="/orders"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-[#1d63e8]" />
                    <span>My Orders</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                <Link
                  to="/account"
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-800 dark:text-slate-100 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#1d63e8]" />
                    <span>{user ? 'Account & Profile' : 'Sign In / Register'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                {(role === 'admin' || user?.role === 'admin') && (
                  <Link
                    to="/admin"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Admin Portal</span>
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Dynamic Categories List */}
              {categoryNames.length > 0 && (
                <div className="p-3 border-b border-gray-100 dark:border-slate-800">
                  <span className="px-3.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-slate-500 block mb-1.5">
                    Shop by Category
                  </span>
                  <div className="space-y-0.5 max-h-52 overflow-y-auto">
                    {categoryNames.map((cat) => (
                      <Link
                        key={cat}
                        to={`/category/${categoryToSlug(cat)}`}
                        className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:text-[#1d63e8] hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="truncate">{cat}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer: Theme Toggle & Legal Links */}
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-slate-300">Appearance</span>
                <ThemeToggle showLabel={true} />
              </div>

              <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700/70 flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                <Link to="/privacy-policy" className="inline-flex items-center gap-1 hover:text-[#1d63e8]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1d63e8]" />
                  <span>Privacy Policy</span>
                </Link>
                <Link to="/terms-and-conditions" className="inline-flex items-center gap-1 hover:text-[#1d63e8]">
                  <FileText className="w-3.5 h-3.5 text-[#1d63e8]" />
                  <span>Terms</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

