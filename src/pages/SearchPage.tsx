import React, { useState, useEffect, useCallback } from 'react';
import { useShop } from '../context/ShopContext';
import { productService } from '../services/productService';
import { Product } from '../types';
import { ProductGrid } from '../components/ProductGrid';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { SEOHead } from '../components/SEOHead';
import { STORE_CONFIG } from '../constants/config';
import { Search, X, SlidersHorizontal, ArrowUpDown, History, Trash2, ArrowUpRight } from 'lucide-react';
import { FilterPanel } from '../components/FilterPanel';
import { useRecentSearches } from '../hooks/useRecentSearches';

export const SearchPage: React.FC = () => {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } = useShop();
  const { recentSearches, saveRecentSearch, removeRecentSearch, clearRecentSearches } = useRecentSearches();

  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
  };

  const fetchSearchResults = useCallback(() => {
    setDbError(null);
    if (!searchQuery.trim()) {
      setIsLoading(true);
      productService
        .getProducts(filters)
        .then((res) => {
          setResults(res);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('[SearchPage] Error fetching products:', err);
          setDbError(err?.message || 'Database error querying products.');
          setResults([]);
          setIsLoading(false);
        });
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(() => {
      productService
        .searchProducts(searchQuery, filters)
        .then((res) => {
          setResults(res);
          setIsLoading(false);
        })
        .catch((err: any) => {
          console.error('[SearchPage] Error searching products:', err);
          setDbError(err?.message || 'Database error querying products.');
          setResults([]);
          setIsLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, filters]);

  useEffect(() => {
    const cleanup = fetchSearchResults();
    return () => {
      if (cleanup) cleanup();
    };
  }, [fetchSearchResults]);

  const activeFilterCount =
    (filters.category && filters.category !== 'All' ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.condition && filters.condition !== 'All' ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.sortBy && filters.sortBy !== 'newest' ? 1 : 0);

  return (
    <>
      <SEOHead
        title={
          searchQuery.trim()
            ? `Search results for "${searchQuery}" | ${STORE_CONFIG.STORE_NAME}`
            : `Search Products | ${STORE_CONFIG.STORE_NAME} South Africa`
        }
        description="Search our full catalog of authentic electronics, beauty items, and lifestyle products in South Africa."
        canonicalPath="/search"
        noindex={Boolean(searchQuery.trim())}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, brand, or category..."
            className="w-full pl-12 pr-10 py-3 bg-gray-100 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-transparent dark:border-slate-700 focus:border-[#ff6452] rounded-2xl text-sm outline-none transition-all font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 shadow-2xs"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
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
              className="w-full appearance-none bg-gray-100 dark:bg-slate-800 hover:bg-gray-200/80 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs sm:text-sm pl-8 pr-8 py-3 rounded-2xl cursor-pointer transition-colors border border-transparent dark:border-slate-700 focus:border-[#ff6452] outline-none"
            >
              <option value="newest" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Newest First</option>
              <option value="popular" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">🔥 Popularity</option>
              <option value="price-asc" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Price: Low to High</option>
              <option value="price-desc" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white">Price: High to Low</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[#ff6452] font-bold text-sm rounded-2xl transition-colors cursor-pointer border border-transparent dark:border-rose-900/40"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[#ff6452] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Recent Searches Section */}
      {recentSearches.length > 0 && (
        <div className="mb-6 bg-gray-50/80 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300">
              <History className="w-3.5 h-3.5 text-[#ff6452]" />
              <span>Recent Searches</span>
            </div>
            <button
              id="clear-all-recent-searches-btn"
              type="button"
              onClick={clearRecentSearches}
              className="text-[11px] font-semibold text-gray-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear all recent searches"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {recentSearches.map((term, index) => {
              const isCurrentQuery = searchQuery.trim().toLowerCase() === term.toLowerCase();
              return (
                <div
                  key={`${term}-${index}`}
                  className={`group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-2xs ${
                    isCurrentQuery
                      ? 'bg-[#ff6452] text-white border-[#ff6452]'
                      : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200/80 dark:border-slate-700 hover:border-[#ff6452] hover:text-[#ff6452] dark:hover:text-[#ff6452]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectRecentSearch(term)}
                    className="flex items-center gap-1.5 cursor-pointer text-left"
                    title={`Search for "${term}"`}
                  >
                    <span>{term}</span>
                    <ArrowUpRight className={`w-3 h-3 opacity-60 group-hover:opacity-100 ${isCurrentQuery ? 'text-white' : 'text-gray-400 dark:text-slate-500'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(term);
                    }}
                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-colors cursor-pointer ml-0.5 ${
                      isCurrentQuery
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200'
                    }`}
                    title={`Remove "${term}" from recent searches`}
                    aria-label={`Remove "${term}" from recent searches`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-600 dark:text-slate-300">
          {searchQuery ? (
            <>
              Found <span className="text-gray-900 dark:text-white font-bold">{results.length}</span> results for &ldquo;{searchQuery}&rdquo;
            </>
          ) : (
            `Showing all ${results.length} available items`
          )}
        </p>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-[#ff6452] hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Database Error Banner */}
      {dbError && (
        <DatabaseErrorBanner
          error={dbError}
          onRetry={fetchSearchResults}
          isRetrying={isLoading}
        />
      )}

      {/* Product List or Empty */}
      {isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : dbError ? null : results.length > 0 ? (
        <ProductGrid products={results} />
      ) : (
        <EmptyState
          icon={Search}
          title="No matching products"
          description={`We couldn't find any items matching "${searchQuery}". Try searching with a broader term or different keyword.`}
          actionText="Clear Search & Filters"
          onAction={() => {
            setSearchQuery('');
            resetFilters();
          }}
        />
      )}

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
      />
    </div>
    </>
  );
};
