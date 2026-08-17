import React from 'react';

/**
 * Shimmer bone element with gentle gradient pulse
 */
const Bone: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`bg-gray-200/80 dark:bg-slate-800/80 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/30 dark:before:via-white/10 before:to-transparent ${className}`}
  />
);

/**
 * Skeleton loader matching exact ProductCard dimensions and layout:
 * - 4:3 Aspect Ratio Image container with simulated badge and favourite star
 * - Price & Variant tag row
 * - Brand tag row
 * - Product Title line
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div
      className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-2xs animate-pulse"
      aria-hidden="true"
    >
      {/* 4:3 Image Container Skeleton */}
      <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-slate-800/70 overflow-hidden rounded-2xl">
        <Bone className="w-full h-full rounded-2xl" />

        {/* Simulated discount/condition badge in top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 pointer-events-none">
          <Bone className="w-12 h-4.5 rounded-full" />
        </div>

        {/* Simulated circular favourite button in top-right */}
        <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs flex items-center justify-center p-1.5 shadow-xs">
          <Bone className="w-4 h-4 rounded-full" />
        </div>
      </div>

      {/* Product Content Skeleton */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1 justify-between">
        {/* Row 1: Price and Size/Variant */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <Bone className="h-5 w-20 rounded-md" />
            <Bone className="h-3.5 w-12 rounded-md opacity-60" />
          </div>
          <Bone className="h-4.5 w-14 rounded-md" />
        </div>

        {/* Row 2: Brand text */}
        <Bone className="h-3 w-16 rounded-md" />

        {/* Row 3: Product Name */}
        <div className="space-y-1.5 pt-0.5">
          <Bone className="h-4 w-4/5 rounded-md" />
          <Bone className="h-3.5 w-2/3 rounded-md opacity-70" />
        </div>
      </div>
    </div>
  );
};

/**
 * Grid of Content-Aware Product Skeletons
 */
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5"
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Category Page Hero Banner Skeleton
 */
export const CategoryBannerSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 mb-8 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3 flex-1">
          <Bone className="h-4 w-44 rounded-full" />
          <Bone className="h-8 sm:h-9 w-64 sm:w-80 rounded-xl" />
          <Bone className="h-4 w-full max-w-lg rounded-md" />
          <Bone className="h-4 w-3/4 max-w-md rounded-md opacity-75" />
        </div>

        <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
          <Bone className="h-9 w-44 rounded-xl" />
          <Bone className="h-9 w-44 rounded-xl" />
        </div>
      </div>

      {/* Sibling Categories Row Skeleton */}
      <div className="flex items-center gap-2 pt-5 mt-5 border-t border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <Bone className="h-4 w-28 rounded-md shrink-0 mr-1" />
        {Array.from({ length: 5 }).map((_, idx) => (
          <Bone key={idx} className="h-6.5 w-24 rounded-full shrink-0" />
        ))}
      </div>
    </div>
  );
};

/**
 * Full Category Page Skeleton (Breadcrumbs + Banner + Filters Toolbar + Product Grid)
 */
export const CategoryPageSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="space-y-6" role="status" aria-label="Loading category and products">
      {/* Category Banner */}
      <CategoryBannerSkeleton />

      {/* Toolbar / Sort Controls Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-slate-800 animate-pulse">
        <div className="space-y-1">
          <Bone className="h-5 w-40 rounded-md" />
          <Bone className="h-3 w-56 rounded-md opacity-60" />
        </div>
        <div className="flex items-center gap-2.5">
          <Bone className="h-9 w-28 rounded-xl" />
          <Bone className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Product Grid */}
      <ProductGridSkeleton count={count} />
    </div>
  );
};

/**
 * Category Card Skeleton for Categories Grid page (/categories)
 */
export const CategoryCardSkeleton: React.FC = () => {
  return (
    <div className="relative h-52 sm:h-64 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 bg-gray-100 dark:bg-slate-800/80 animate-pulse">
      <Bone className="w-full h-full" />
      <div className="absolute inset-0 p-6 flex items-end justify-between">
        <div className="space-y-2 flex-1 mr-4">
          <Bone className="h-6 w-32 rounded-lg bg-white/40 dark:bg-white/20" />
          <Bone className="h-3.5 w-48 rounded-md bg-white/30 dark:bg-white/10" />
        </div>
        <Bone className="w-10 h-10 rounded-full bg-white/40 dark:bg-white/20 shrink-0" />
      </div>
    </div>
  );
};

/**
 * Categories Grid Page Skeleton
 */
export const CategoriesGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
      role="status"
      aria-label="Loading product categories"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * Product Detail Page Skeleton Loader
 */
export const DetailSkeleton: React.FC = () => {
  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 animate-pulse"
      role="status"
      aria-label="Loading product details"
    >
      {/* Breadcrumbs skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Bone className="h-4 w-16 rounded-md" />
        <Bone className="h-4 w-4 rounded-full" />
        <Bone className="h-4 w-24 rounded-md" />
        <Bone className="h-4 w-4 rounded-full" />
        <Bone className="h-4 w-36 rounded-md" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Gallery Skeleton */}
        <div className="space-y-4">
          <div className="aspect-[4/3] sm:aspect-square w-full rounded-3xl bg-gray-100 dark:bg-slate-800/80 overflow-hidden border border-gray-100 dark:border-slate-800">
            <Bone className="w-full h-full" />
          </div>
          {/* Thumbnails */}
          <div className="flex items-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
            ))}
          </div>
        </div>

        {/* Right: Info & CTA Skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bone className="h-4 w-20 rounded-md" />
              <Bone className="h-4 w-16 rounded-full" />
            </div>
            <Bone className="h-8 sm:h-10 w-4/5 rounded-xl" />
            <div className="flex items-center gap-3 pt-1">
              <Bone className="h-7 w-32 rounded-lg" />
              <Bone className="h-5 w-20 rounded-md opacity-60" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
          </div>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800">
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
            <Bone className="h-10 rounded-xl" />
          </div>

          {/* Description Block */}
          <div className="space-y-2.5 pt-2">
            <Bone className="h-4 w-28 rounded-md" />
            <Bone className="h-3.5 w-full rounded-md" />
            <Bone className="h-3.5 w-5/6 rounded-md" />
            <Bone className="h-3.5 w-4/6 rounded-md" />
          </div>

          {/* Variant Selector */}
          <div className="space-y-2 pt-2">
            <Bone className="h-4 w-24 rounded-md" />
            <div className="flex items-center gap-2">
              <Bone className="h-9 w-20 rounded-xl" />
              <Bone className="h-9 w-20 rounded-xl" />
              <Bone className="h-9 w-20 rounded-xl" />
            </div>
          </div>

          {/* Quantity & Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Bone className="h-13 w-32 rounded-2xl" />
            <Bone className="h-13 flex-1 rounded-2xl" />
            <Bone className="h-13 w-13 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};
