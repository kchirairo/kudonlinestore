import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CategoryNav } from '../components/CategoryNav';
import { PromoBanner } from '../components/PromoBanner';
import { ProductGrid } from '../components/ProductGrid';
import { ProductCard } from '../components/ProductCard';
import { FilterPanel } from '../components/FilterPanel';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { CustomerReviewCarousel } from '../components/CustomerReviewCarousel';
import { SEOHead } from '../components/SEOHead';
import { loadProducts } from '../services/productService';
import { useShop } from '../context/ShopContext';
import { useProductCategories } from '../hooks/useProductCategories';
import { Product, ProductCategory } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { generateStoreJsonLd } from '../utils/seo';
import {
  SlidersHorizontal,
  PackageX,
  ArrowUpDown,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { selectedCategory, setSelectedCategory, filters, setFilters, resetFilters } = useShop();
  const { categoryNames } = useProductCategories();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const dealsScrollRef = useRef<HTMLDivElement>(null);

  const { category: filterCategory, sortBy, minPrice, maxPrice, condition, inStockOnly } = filters;

  const isAllCategory = selectedCategory === 'All' || selectedCategory === 'All Products';
  const effectiveCategory = !isAllCategory
    ? selectedCategory
    : filterCategory !== 'All' && filterCategory !== 'All Products'
    ? filterCategory
    : 'All';

  // Load unfiltered catalog once for Hero, Shop by Category thumbnails, and Best Deals carousel
  useEffect(() => {
    loadProducts({ category: 'All', sortBy: 'newest' })
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setCatalogProducts(res);
        }
      })
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(() => {
    setIsLoading(true);
    setDbError(null);

    const activeFilters = {
      category: effectiveCategory,
      sortBy,
      minPrice,
      maxPrice,
      condition,
      inStockOnly,
    };

    isFetchingRef.current = true;
    loadProducts(activeFilters)
      .then((res) => {
        setProducts(res);
        if (effectiveCategory === 'All' && !minPrice && !maxPrice && (!condition || condition === 'All') && !inStockOnly) {
          setCatalogProducts(res);
        }
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('[HomePage] Failed to fetch products:', err);
        setDbError(err?.message || 'Failed to connect to Supabase products table.');
        setIsLoading(false);
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [effectiveCategory, sortBy, minPrice, maxPrice, condition, inStockOnly]);

  useEffect(() => {
    fetchProducts();
  }, [effectiveCategory, sortBy, minPrice, maxPrice, condition, inStockOnly]);

  const sourceProducts = catalogProducts.length > 0 ? catalogProducts : products;

  // Derive Best Deals products dynamically from existing discount/product database data
  const bestDealsProducts = useMemo(() => {
    if (sourceProducts.length === 0) return [];

    const discounted = sourceProducts.filter(
      (p) =>
        (p.discountPercentage && p.discountPercentage > 0) ||
        (p.originalPrice && p.originalPrice > p.price)
    );

    if (discounted.length >= 4) {
      return discounted.slice(0, 10);
    }

    // Supplement with top in-stock products if fewer than 4 have explicit discount fields
    const remaining = sourceProducts.filter(
      (p) => p.inStock !== false && !discounted.some((d) => d.id === p.id)
    );
    return [...discounted, ...remaining].slice(0, 8);
  }, [sourceProducts]);

  const scrollDeals = (direction: 'left' | 'right') => {
    if (dealsScrollRef.current) {
      const amount = direction === 'left' ? -300 : 300;
      dealsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const storeJsonLd = generateStoreJsonLd();

  // Check how many active filters are currently applied
  const activeFilterCount =
    (!isAllCategory ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.condition && filters.condition !== 'All' ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.sortBy && filters.sortBy !== 'newest' ? 1 : 0);

  return (
    <>
      <SEOHead
        title={`${STORE_CONFIG.STORE_NAME} | ${STORE_CONFIG.STORE_TAGLINE} - South Africa`}
        description="Shop trending electronics, beauty essentials, home items, and lifestyle gear in South Africa. Safe online payment via Yoco and reliable nationwide courier delivery."
        canonicalPath="/"
        jsonLd={storeJsonLd}
      />

      <div className="pb-24 bg-[#f8fafc] dark:bg-slate-950 min-h-screen transition-colors duration-200">
        {/* 1. Hero / Promotional Banner Carousel */}
        <PromoBanner products={sourceProducts} />

        {/* 2. Shop by Category (Immediately below Hero) */}
        <CategoryNav products={sourceProducts} />

        {/* 3. 🔥 Best Deals Horizontal Product Carousel Section */}
        {bestDealsProducts.length > 0 && (
          <section
            aria-label="Best Deals"
            className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-5 pb-2"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  🔥 Best Deals
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 mr-1">
                  <button
                    type="button"
                    onClick={() => scrollDeals('left')}
                    className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    aria-label="Scroll best deals left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollDeals('right')}
                    className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    aria-label="Scroll best deals right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <Link
                  to="/search"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: 'price-asc',
                    }))
                  }
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#1d4ed8] dark:text-blue-400 hover:text-[#08224a] dark:hover:text-blue-300 transition-colors"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div
              ref={dealsScrollRef}
              className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
            >
              {bestDealsProducts.map((dealProduct) => (
                <div
                  key={`best-deal-${dealProduct.id}`}
                  className="w-[168px] xs:w-[180px] sm:w-[215px] md:w-[235px] shrink-0 flex flex-col"
                >
                  <ProductCard product={dealProduct} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Main Products Catalog Section */}
        <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 mt-5">
          {/* Section Header: Featured / Category Title + Quick Sort + Filter Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isAllCategory ? 'Featured Products' : selectedCategory}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 dark:bg-blue-950/70 text-[#0d3166] dark:text-blue-300">
                  {products.length} {products.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
              {/* Quick Sort Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={filters.sortBy || 'newest'}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="w-full appearance-none bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm pl-8 pr-7 py-2 rounded-full cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 focus:border-[#1d4ed8] outline-none shadow-2xs"
                >
                  <option value="newest" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Newest First</option>
                  <option value="popular" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">🔥 Popularity</option>
                  <option value="price-asc" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Price: Low to High</option>
                  <option value="price-desc" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Price: High to Low</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Main Filter Button */}
              <button
                onClick={() => setIsFilterOpen(true)}
                className="relative flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-[#0d3166] hover:bg-[#1d4ed8] px-3.5 py-2 rounded-full transition-colors cursor-pointer shadow-2xs shrink-0"
              >
                <span>Filter</span>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          {categoryNames.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
              {['All', ...categoryNames].map((cat) => {
                const active =
                  cat === 'All'
                    ? isAllCategory
                    : selectedCategory === cat;
                return (
                  <button
                    key={`filter-pill-${cat}`}
                    type="button"
                    onClick={() => setSelectedCategory(cat as ProductCategory | 'All')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                      active
                        ? 'bg-[#0d3166] text-white border-[#0d3166] shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
                    }`}
                  >
                    {cat === 'All' ? 'All Products' : cat}
                  </button>
                );
              })}
            </div>
          )}

        {/* Active Filters Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-rose-50/40 dark:bg-slate-850 rounded-2xl border border-rose-100/60 dark:border-slate-800 text-xs">
            <span className="font-bold text-gray-600 dark:text-slate-400 mr-1 flex items-center gap-1">
              Active Filters:
            </span>

            {!isAllCategory && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium shadow-2xs">
                Category: <strong>{selectedCategory}</strong>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="p-0.5 hover:text-red-500 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.sortBy && filters.sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium shadow-2xs">
                Sort:{' '}
                <strong>
                  {filters.sortBy === 'popular'
                    ? 'Popularity'
                    : filters.sortBy === 'price-asc'
                    ? 'Price: Low to High'
                    : 'Price: High to Low'}
                </strong>
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, sortBy: 'newest' }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium shadow-2xs">
                Price: R{filters.minPrice || 0} - R{filters.maxPrice || '∞'}
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      minPrice: undefined,
                      maxPrice: undefined,
                    }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.condition && filters.condition !== 'All' && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium shadow-2xs">
                Condition: {filters.condition}
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, condition: 'All' }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.inStockOnly && (
              <span className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 font-medium shadow-2xs">
                In Stock Only
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, inStockOnly: false }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                resetFilters();
                setSelectedCategory('All');
              }}
              className="text-[#ff6452] font-bold hover:underline ml-auto pl-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Database Error State */}
        {dbError && (
          <DatabaseErrorBanner
            error={dbError}
            onRetry={fetchProducts}
            isRetrying={isLoading}
          />
        )}

        {/* Product Grid or Skeleton */}
        {isLoading ? (
          <ProductGridSkeleton count={10} />
        ) : dbError ? null : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            icon={PackageX}
            title="No items found"
            description="We couldn't find any products matching your current category or filters."
            actionText="Clear Filters"
            onAction={() => {
              resetFilters();
              setSelectedCategory('All');
            }}
          />
        )}

        {/* Customer Review Carousel - Top-Rated Product Testimonials */}
        <CustomerReviewCarousel products={products} />
      </main>

      {/* Filter / Sort Drawer */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        resetFilters={() => {
          resetFilters();
          setSelectedCategory('All');
        }}
      />
    </div>
    </>
  );
};
