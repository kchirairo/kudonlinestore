import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { Product, ProductCategory, FilterOptions } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { ProductGrid } from '../components/ProductGrid';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SEOHead } from '../components/SEOHead';
import { FilterPanel } from '../components/FilterPanel';
import {
  getCategorySeoMeta,
  slugToCategory,
  generateCategoryJsonLd,
  getSiteUrl,
  categoryToSlug,
} from '../utils/seo';
import {
  PackageX,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowLeft,
  Grid,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react';

export const CategoryDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Resolve category name from slug
  const resolvedCategory: ProductCategory = (slug && slugToCategory(slug)) || 'Others';
  const categoryMeta = getCategorySeoMeta(slug || resolvedCategory);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: resolvedCategory,
    sortBy: 'newest',
  });

  const { category: filterCategory, sortBy, minPrice, maxPrice, condition, inStockOnly } = filters;

  const fetchCategoryProducts = useCallback(() => {
    setIsLoading(true);
    setDbError(null);

    const activeFilters: FilterOptions = {
      category: resolvedCategory,
      sortBy,
      minPrice,
      maxPrice,
      condition,
      inStockOnly,
    };

    productService
      .getProducts(activeFilters)
      .then((res) => {
        setProducts(res);
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('[CategoryDetailsPage] Error fetching category products:', err);
        setDbError(err?.message || 'Failed to fetch products from Supabase.');
        setIsLoading(false);
      });
  }, [resolvedCategory, sortBy, minPrice, maxPrice, condition, inStockOnly]);

  useEffect(() => {
    fetchCategoryProducts();
  }, [resolvedCategory, sortBy, minPrice, maxPrice, condition, inStockOnly]);

  const canonicalUrl = `${getSiteUrl()}/category/${categoryMeta.slug}`;
  const categoryJsonLd = generateCategoryJsonLd(categoryMeta.name, products, canonicalUrl);

  const activeFilterCount =
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.condition && filters.condition !== 'All' ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.sortBy && filters.sortBy !== 'newest' ? 1 : 0);

  return (
    <>
      {/* Schema.org CollectionPage & SEO Head */}
      <SEOHead
        title={categoryMeta.title}
        description={categoryMeta.metaDescription}
        canonicalPath={`/category/${categoryMeta.slug}`}
        ogType="website"
        jsonLd={categoryJsonLd}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28">
        {/* Breadcrumbs Navigation */}
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Categories', to: '/categories' },
              { label: categoryMeta.name },
            ]}
          />
        </div>

        {/* Category Header Banner / Intro */}
        <div className="bg-gradient-to-br from-rose-50/60 dark:from-slate-900 via-white dark:via-slate-900 to-gray-50/70 dark:to-slate-950 rounded-3xl p-6 sm:p-8 border border-rose-100/50 dark:border-slate-800 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#ff6452] uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>Verified Authentic South Africa Selection</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {categoryMeta.heading}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 mt-2 leading-relaxed">
                {categoryMeta.description}
              </p>
            </div>

            {/* Quick value badges */}
            <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-slate-700 shadow-2xs text-xs font-bold text-gray-800 dark:text-slate-200">
                <Truck className="w-4 h-4 text-[#ff6452]" />
                <span>Fast Nationwide Delivery</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-gray-200/80 dark:border-slate-700 shadow-2xs text-xs font-bold text-gray-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-[#ff6452]" />
                <span>Yoco Secure Checkout</span>
              </div>
            </div>
          </div>

          {/* Quick Subcategory Pills / Sibling Category Links for deep internal linking */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-5 mt-5 border-t border-gray-200/60 dark:border-slate-800">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-400 whitespace-nowrap mr-1">Other Categories:</span>
            {STORE_CONFIG.CATEGORY_LIST.filter((c) => c !== categoryMeta.name).map((c) => (
              <Link
                key={c}
                to={`/category/${categoryToSlug(c)}`}
                className="text-xs font-semibold px-3 py-1 bg-white dark:bg-slate-800 hover:bg-[#ff6452] dark:hover:bg-[#ff6452] hover:text-white dark:hover:text-white text-gray-700 dark:text-slate-300 rounded-full border border-gray-200 dark:border-slate-700 shadow-2xs transition-colors whitespace-nowrap"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        {/* Toolbar & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              All {categoryMeta.name} Items ({products.length})
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-400">
              Showing real prices in South African Rand (ZAR)
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Select */}
            <div className="relative">
              <select
                value={filters.sortBy || 'newest'}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as any,
                  }))
                }
                className="appearance-none bg-gray-100 dark:bg-slate-800 hover:bg-gray-200/80 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-bold text-xs sm:text-sm pl-8 pr-8 py-2 rounded-full cursor-pointer transition-colors border border-transparent focus:border-[#ff6452] outline-none"
                aria-label="Sort products"
              >
                <option value="newest">Newest First</option>
                <option value="popular">🔥 Popularity</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              className="relative flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6452] bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
            >
              <span>Filter</span>
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff6452] text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <DatabaseErrorBanner
            error={dbError}
            onRetry={fetchCategoryProducts}
            isRetrying={isLoading}
          />
        )}

        {/* Product Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : dbError ? null : products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            icon={PackageX}
            title={`No ${categoryMeta.name} items found`}
            description="We couldn't find any products in this category matching your filter criteria."
            actionText="Reset Filters"
            onAction={() =>
              setFilters({
                category: resolvedCategory,
                sortBy: 'newest',
              })
            }
          />
        )}
      </div>

      {/* Filter Drawer */}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        resetFilters={() =>
          setFilters({
            category: resolvedCategory,
            sortBy: 'newest',
          })
        }
      />
    </>
  );
};
