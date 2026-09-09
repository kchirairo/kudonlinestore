import React, { useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCategory } from '../types';
import { useProductCategories } from '../hooks/useProductCategories';
import { ChevronLeft, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';

interface CategoryNavProps {
  onCategorySelect?: (cat: ProductCategory | 'All' | 'All Products') => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ onCategorySelect }) => {
  const { selectedCategory, setSelectedCategory } = useShop();
  const { categoryNames, isLoading, error, refresh } = useProductCategories();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const categories = ['All Products', ...categoryNames];

  const handleSelect = (category: string) => {
    // Normalise 'All Products' to 'All' or keep exact category name
    const targetCat = category === 'All Products' ? 'All' : (category as ProductCategory);
    setSelectedCategory(targetCat);
    if (onCategorySelect) {
      onCategorySelect(targetCat);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Safe error display without hardcoded fallback or invented categories
  if (error && categoryNames.length === 0) {
    return (
      <nav aria-label="Category Navigation" className="w-full bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 px-3.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Unable to load categories: {error}</span>
          </div>
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1 font-bold hover:underline cursor-pointer ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </nav>
    );
  }

  // Loading skeleton placeholder pills
  if (isLoading && categoryNames.length === 0) {
    return (
      <nav aria-label="Category Navigation" className="w-full bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-hidden">
          {[80, 95, 110, 75, 65, 85, 120, 105].map((w, idx) => (
            <div
              key={idx}
              className="h-8 rounded-full bg-gray-100 dark:bg-slate-800 animate-pulse shrink-0"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Category Navigation" className="relative w-full bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-2.5 px-3 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto relative flex items-center">
        {/* Left Scroll Arrow */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 shadow-xs border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 mr-2 shrink-0 transition-all cursor-pointer"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Categories Horizontal Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-1 w-full"
        >
          {categories.map((cat) => {
            const isAllOption = cat === 'All Products';
            const isSelected = isAllOption
              ? selectedCategory === 'All' || selectedCategory === 'All Products'
              : selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => handleSelect(cat)}
                className={`text-xs sm:text-sm font-semibold transition-all py-1.5 px-3.5 sm:px-4 rounded-full cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-xs'
                    : 'bg-gray-50/80 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200/70 dark:border-slate-700/70 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
                aria-pressed={isSelected}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Arrow */}
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 shadow-xs border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 ml-2 shrink-0 transition-all cursor-pointer"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
