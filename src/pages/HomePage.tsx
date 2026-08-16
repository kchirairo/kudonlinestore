import React, { useState, useEffect, useCallback } from 'react';
import { MainTabs } from '../components/MainTabs';
import { CategoryNav } from '../components/CategoryNav';
import { PromoBanner } from '../components/PromoBanner';
import { ProductGrid } from '../components/ProductGrid';
import { FilterPanel } from '../components/FilterPanel';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { SEOHead } from '../components/SEOHead';
import { productService } from '../services/productService';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { generateStoreJsonLd } from '../utils/seo';
import { SlidersHorizontal, PackageX, ArrowUpDown, X, Sparkles, Flame, Check } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { selectedCategory, setSelectedCategory, filters, setFilters, resetFilters } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const fetchProducts = useCallback(() => {
    setIsLoading(true);
    setDbError(null);

    const activeFilters = {
      ...filters,
      category: selectedCategory !== 'All' ? selectedCategory : filters.category,
    };

    productService
      .getProducts(activeFilters)
      .then((res) => {
        setProducts(res);
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('[HomePage] Failed to fetch products:', err);
        setDbError(err?.message || 'Failed to connect to Supabase products table.');
        setProducts([]);
        setIsLoading(false);
      });
  }, [selectedCategory, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const storeJsonLd = generateStoreJsonLd();

  // Check how many active filters are currently applied
  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
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

      <div className="pb-24">
        {/* Tabs */}
        <MainTabs />

        {/* Categories Bar */}
        <CategoryNav />

        {/* Promotional Banner */}
        <PromoBanner />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* Section Header: Recently Added + Quick Sort + Filter Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                {selectedCategory === 'All' ? 'Recently Added' : selectedCategory}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100/70 text-[#ff6452]">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Explore latest curated items across South Africa
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Quick Sort Dropdown */}
            <div className="relative">
              <select
                value={filters.sortBy || 'newest'}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as any,
                  }))
                }
                className="appearance-none bg-gray-100 hover:bg-gray-200/80 text-gray-800 font-bold text-xs sm:text-sm pl-8 pr-8 py-2 rounded-full cursor-pointer transition-colors border border-transparent focus:border-[#ff6452] outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="popular">🔥 Popularity</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Main Filter Button */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6452] bg-rose-50/80 hover:bg-rose-100/80 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
            >
              <span>Filter</span>
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff6452] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-rose-50/40 rounded-2xl border border-rose-100/60 text-xs">
            <span className="font-bold text-gray-600 mr-1 flex items-center gap-1">
              Active Filters:
            </span>

            {selectedCategory !== 'All' && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-800 font-medium shadow-2xs">
                Category: <strong>{selectedCategory}</strong>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="p-0.5 hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.sortBy && filters.sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-800 font-medium shadow-2xs">
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
                  className="p-0.5 hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-800 font-medium shadow-2xs">
                Price: R{filters.minPrice || 0} - R{filters.maxPrice || '∞'}
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      minPrice: undefined,
                      maxPrice: undefined,
                    }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.condition && filters.condition !== 'All' && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-800 font-medium shadow-2xs">
                Condition: {filters.condition}
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, condition: 'All' }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filters.inStockOnly && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full border border-gray-200 text-gray-800 font-medium shadow-2xs">
                In Stock Only
                <button
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, inStockOnly: false }))
                  }
                  className="p-0.5 hover:text-red-500 rounded-full"
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
              className="text-[#ff6452] font-bold hover:underline ml-auto pl-2"
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
