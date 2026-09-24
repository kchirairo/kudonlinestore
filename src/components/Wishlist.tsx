import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Trash2,
  Share2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  CloudCheck,
  AlertCircle,
  Eye,
  Package,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { productService } from '../services/productService';
import { Product } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { ProductGridSkeleton } from './LoadingSkeleton';
import { DatabaseErrorBanner } from './DatabaseErrorBanner';
import { EmptyState } from './EmptyState';

export interface WishlistProps {
  embedded?: boolean;
  className?: string;
  onItemClick?: (product: Product) => void;
}

export const Wishlist: React.FC<WishlistProps> = ({
  embedded = false,
  className = '',
  onItemClick,
}) => {
  const navigate = useNavigate();
  const {
    wishlist,
    removeFromWishlist,
    clearWishlist,
    addToCart,
    user,
    isAccountDisabled,
    accountStatus,
    showToast,
  } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'name'>('default');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [movingAllToCart, setMovingAllToCart] = useState<boolean>(false);

  // Fetch full product objects for IDs currently in the wishlist
  const fetchWishlistProducts = useCallback(async () => {
    if (wishlist.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setDbError(null);

    try {
      const allProducts = await productService.getProducts();
      const matched = allProducts.filter((p) => wishlist.includes(p.id));
      setProducts(matched);
    } catch (err: any) {
      console.error('[Wishlist] Error loading wishlist items from Supabase:', err);
      setDbError(err?.message || 'Could not load your saved products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [wishlist]);

  useEffect(() => {
    fetchWishlistProducts();
  }, [fetchWishlistProducts]);

  // Available categories in the user's wishlist
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  // Filtered and sorted products
  const displayProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand?.toLowerCase().includes(q);
          const matchCategory = p.category?.toLowerCase().includes(q);
          return matchName || matchBrand || matchCategory;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // default order matches wishlist insertion
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Handle move individual item to cart
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      showToast('Please sign in to add products to your cart', 'info');
      navigate('/account', { state: { returnUrl: '/wishlist' } });
      return;
    }

    if (isAccountDisabled) {
      showToast(
        accountStatus === 'on_hold'
          ? 'Your account is currently on hold. Adding to cart is restricted.'
          : 'Your account has been disabled. Adding to cart is restricted.',
        'error'
      );
      return;
    }

    if (!product.inStock && !product.allowBackorders && !product.customizationConfig?.disableStockLimits) {
      showToast('This product is currently out of stock', 'error');
      return;
    }

    addToCart(product, 1, product.sizeOrVariant);
    showToast(`"${product.name}" moved to cart`, 'success');
  };

  // Move all in-stock items to cart
  const handleMoveAllToCart = async () => {
    if (!user) {
      showToast('Please sign in to add products to your cart', 'info');
      navigate('/account', { state: { returnUrl: '/wishlist' } });
      return;
    }

    if (isAccountDisabled) {
      showToast('Purchases are currently restricted for your account status.', 'error');
      return;
    }

    const availableItems = products.filter(
      (p) => p.inStock || p.allowBackorders || p.customizationConfig?.disableStockLimits
    );

    if (availableItems.length === 0) {
      showToast('None of your saved products are currently in stock.', 'info');
      return;
    }

    setMovingAllToCart(true);
    let addedCount = 0;

    for (const item of availableItems) {
      addToCart(item, 1, item.sizeOrVariant);
      addedCount++;
    }

    setMovingAllToCart(false);
    showToast(`Added ${addedCount} items to your shopping cart!`, 'success');
  };

  // Share wishlist link
  const handleShareWishlist = async () => {
    const shareUrl = window.location.origin + '/wishlist';
    const text = `Check out my curated wishlist on ${STORE_CONFIG.STORE_NAME}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Wishlist | ${STORE_CONFIG.STORE_NAME}`,
          text,
          url: shareUrl,
        });
        showToast('Wishlist shared successfully!', 'success');
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Wishlist link copied to clipboard!', 'success');
    } catch {
      showToast('Unable to copy link to clipboard', 'error');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Persistence Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                My Saved Wishlist
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#ff6452] text-white">
                {wishlist.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Keep track of products you love and purchase when ready
            </p>
          </div>
        </div>

        {/* Supabase Sync Badge / Guest Notice */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Synced with Supabase Account</span>
            </div>
          ) : (
            <button
              onClick={() => navigate('/account', { state: { returnUrl: '/wishlist' } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Sign in to permanently save items</span>
            </button>
          )}

          {products.length > 0 && (
            <button
              onClick={handleShareWishlist}
              className="p-2 rounded-xl text-gray-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Share Wishlist"
              aria-label="Share Wishlist"
            >
              <Share2 className="w-4 h-4 text-[#ff6452]" />
            </button>
          )}
        </div>
      </div>

      {/* Guest Notice Callout (if not logged in) */}
      {!user && wishlist.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              You have {wishlist.length} item{wishlist.length === 1 ? '' : 's'} stored in your browser session. Sign in to sync them to your Supabase profile across all your devices.
            </span>
          </div>
          <button
            onClick={() => navigate('/account', { state: { returnUrl: '/wishlist' } })}
            className="ml-3 shrink-0 font-bold text-amber-900 dark:text-amber-100 underline hover:text-amber-700 cursor-pointer"
          >
            Sign in now →
          </button>
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <DatabaseErrorBanner
          error={dbError}
          onRetry={fetchWishlistProducts}
          isRetrying={isLoading}
        />
      )}

      {/* Toolbar (Search, Filter, Sort, Bulk Actions) */}
      {products.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-xs">
          {/* Search within wishlist */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved items..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#ff6452]"
            />
          </div>

          {/* Category Filter & Sort Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {availableCategories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:border-[#ff6452]"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs text-gray-700 dark:text-slate-300 focus:outline-none focus:border-[#ff6452]"
            >
              <option value="default">Default Order</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Product Name (A-Z)</option>
            </select>

            {/* Bulk Move All to Cart */}
            <button
              type="button"
              onClick={handleMoveAllToCart}
              disabled={movingAllToCart}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Move All to Cart</span>
            </button>

            {/* Clear All Button */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Clear Wishlist"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Wishlist */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-gray-100 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Clear all wishlist items?
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                This will remove all {wishlist.length} saved products from your Supabase profile and device.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWishlist();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : displayProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {displayProducts.map((product) => {
            const hasStock = product.inStock || product.allowBackorders || product.customizationConfig?.disableStockLimits;
            const primaryImg =
              (Array.isArray(product.images) &&
                product.images.find(
                  (u) => typeof u === 'string' && u.trim().length > 0 && !u.trim().startsWith('data:image')
                )) ||
              (typeof (product as any).image_url === 'string' && (product as any).image_url) ||
              (typeof (product as any).image === 'string' && (product as any).image) ||
              '';

            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 shadow-xs hover:shadow-md hover:border-gray-200 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Image container */}
                  <div
                    onClick={() => {
                      if (onItemClick) onItemClick(product);
                      else navigate(`/product/${product.id}`);
                    }}
                    className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 mb-3 cursor-pointer"
                  >
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Package className="w-8 h-8 opacity-40 mb-1" />
                        <span className="text-[10px]">No image</span>
                      </div>
                    )}

                    {/* Stock Status Badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.inStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-xs shadow-xs">
                          In Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-800/90 text-white backdrop-blur-xs shadow-xs">
                          Out of Stock
                        </span>
                      )}

                      {product.customizationConfig?.isCustomizable && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff6452]/90 text-white backdrop-blur-xs shadow-xs flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Customizable
                        </span>
                      )}
                    </div>

                    {/* Remove from wishlist floating button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWishlist(product.id);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shadow-xs cursor-pointer"
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      <Heart className="w-4 h-4 fill-rose-600" />
                    </button>
                  </div>

                  {/* Brand & Category */}
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-1">
                    <span>{product.brand || 'KUD'}</span>
                    <span>{product.category}</span>
                  </div>

                  {/* Product Title */}
                  <h3
                    onClick={() => {
                      if (onItemClick) onItemClick(product);
                      else navigate(`/product/${product.id}`);
                    }}
                    className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 hover:text-[#ff6452] dark:hover:text-[#ff6452] transition-colors cursor-pointer"
                  >
                    {product.name}
                  </h3>
                </div>

                {/* Pricing & Add to Cart Action */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-gray-900 dark:text-white">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {product.price.toLocaleString()}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through font-medium">
                        {STORE_CONFIG.STORE_CURRENCY}
                        {product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={!hasStock}
                      className="flex-1 py-2 px-3 rounded-xl bg-gray-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{hasStock ? 'Move to Cart' : 'Out of Stock'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title={searchQuery || selectedCategory !== 'All' ? 'No matching products found' : 'Your wishlist is empty'}
          description={
            searchQuery || selectedCategory !== 'All'
              ? 'Try adjusting your search terms or category filters.'
              : 'Tap the heart icon on any product to save it here for later. Your saved items are securely synced with Supabase.'
          }
          actionText={searchQuery || selectedCategory !== 'All' ? 'Clear Filters' : 'Explore Products'}
          onAction={() => {
            if (searchQuery || selectedCategory !== 'All') {
              setSearchQuery('');
              setSelectedCategory('All');
            } else {
              navigate('/');
            }
          }}
        />
      )}
    </div>
  );
};
