import React from 'react';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';
import { ProductCategory } from '../types';

interface CategoryNavProps {
  onCategorySelect?: (cat: ProductCategory | 'All') => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({ onCategorySelect }) => {
  const { selectedCategory, setSelectedCategory } = useShop();

  const categories = ['All', ...STORE_CONFIG.CATEGORY_LIST] as (ProductCategory | 'All')[];

  const handleSelect = (category: ProductCategory | 'All') => {
    setSelectedCategory(category);
    if (onCategorySelect) {
      onCategorySelect(category);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-3 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleSelect(cat)}
              className={`text-sm font-medium transition-all py-1 px-1 cursor-pointer shrink-0 ${
                isSelected
                  ? 'text-gray-900 dark:text-white font-bold border-b-2 border-gray-900 dark:border-white -mb-1'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};
