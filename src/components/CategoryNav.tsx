import React, { useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { Product, ProductCategory } from '../types';
import { useProductCategories } from '../hooks/useProductCategories';
import { categoryToSlug } from '../utils/seo';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Smartphone,
  Sparkles,
  Home as HomeIcon,
  ShoppingBag,
  Cpu,
  Watch,
  Shirt,
  Footprints,
  Layers,
} from 'lucide-react';

interface CategoryNavProps {
  products?: Product[];
  onCategorySelect?: (cat: ProductCategory | 'All' | 'All Products') => void;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  electronics: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
  'phones & accessories': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  phones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80',
  'beauty & personal care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=400&q=80',
  home: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  'home & living': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
  'fashion & apparel': 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
  clothing: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=400&q=80',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
  footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
  accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
  lifestyle: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
};

function getCategoryIcon(categoryName: string) {
  const lower = categoryName.toLowerCase();
  if (lower.includes('phone') || lower.includes('mobile')) return Smartphone;
  if (lower.includes('electr') || lower.includes('tech') || lower.includes('audio')) return Cpu;
  if (lower.includes('beaut') || lower.includes('care') || lower.includes('cosmetic')) return Sparkles;
  if (lower.includes('home') || lower.includes('living') || lower.includes('kitchen')) return HomeIcon;
  if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('foot')) return Footprints;
  if (lower.includes('fash') || lower.includes('cloth') || lower.includes('apparel')) return Shirt;
  if (lower.includes('watch') || lower.includes('access')) return Watch;
  if (lower.includes('bag') || lower.includes('luggage')) return ShoppingBag;
  return Layers;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ products = [], onCategorySelect }) => {
  const navigate = useNavigate();
  const { setSelectedCategory } = useShop();
  const { categoryNames, isLoading, error, refresh } = useProductCategories();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build map of category -> dynamic product image from existing database products
  const categoryImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const prod of products) {
      if (!prod.category) continue;
      const key = prod.category.trim().toLowerCase();
      if (map[key]) continue;

      const rawImages = Array.isArray(prod.images) ? prod.images : [];
      for (const img of rawImages) {
        if (typeof img === 'string' && img.trim().length > 0 && !img.startsWith('data:image')) {
          map[key] = img.trim();
          break;
        }
      }
    }
    return map;
  }, [products]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category as ProductCategory);
    if (onCategorySelect) {
      onCategorySelect(category as ProductCategory);
    }
    navigate(`/category/${categoryToSlug(category)}`);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (error && categoryNames.length === 0) {
    return (
      <section aria-label="Shop by Category" className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 px-3.5 py-2 rounded-xl border border-rose-100 dark:border-rose-900/40">
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
      </section>
    );
  }

  if (isLoading && categoryNames.length === 0) {
    return (
      <section aria-label="Shop by Category" className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-36 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-20 rounded-md bg-gray-100 dark:bg-slate-800 animate-pulse" />
        </div>
        <div className="flex items-center gap-3 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="w-24 sm:w-28 h-28 sm:h-32 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse shrink-0"
            />
          ))}
        </div>
      </section>
    );
  }

  if (categoryNames.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Shop by Category"
      className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 pb-2 transition-colors duration-200"
    >
      {/* Section Header: Title on left, View All -> on right */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Shop by Category
        </h2>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            to="/categories"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#1d4ed8] dark:text-blue-400 hover:text-[#08224a] dark:hover:text-blue-300 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Horizontally Scrollable Category Cards */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-1"
      >
        {categoryNames.map((cat) => {
          const lowerKey = cat.trim().toLowerCase();
          const imgUrl = categoryImageMap[lowerKey] || CATEGORY_FALLBACK_IMAGES[lowerKey];
          const IconComponent = getCategoryIcon(cat);

          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              className="group flex flex-col items-center w-[88px] sm:w-[112px] shrink-0 bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/80 p-2 sm:p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-200 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer text-center active:scale-95"
            >
              {/* Rounded Square Image / Icon Container */}
              <div className="w-full aspect-square rounded-xl bg-slate-50 dark:bg-slate-800 overflow-hidden flex items-center justify-center mb-1.5 relative border border-slate-100/80 dark:border-slate-700/60">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={cat}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 text-[#1d4ed8] dark:text-blue-400 stroke-[1.8]" />
                )}
              </div>

              {/* Category Name Below */}
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1d4ed8] dark:group-hover:text-blue-400 leading-tight line-clamp-2">
                {cat}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
