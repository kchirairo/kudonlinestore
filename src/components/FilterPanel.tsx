import React from 'react';
import { X, RotateCcw, Filter } from 'lucide-react';
import { FilterOptions, ProductCategory, ProductCondition } from '../types';
import { STORE_CONFIG } from '../constants/config';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  setFilters,
  resetFilters,
}) => {
  if (!isOpen) return null;

  const categories = ['All', ...STORE_CONFIG.CATEGORY_LIST] as (ProductCategory | 'All')[];
  const conditions: (ProductCondition | 'All')[] = ['All', 'Brand New', 'Like New', 'Refurbished', 'Vintage'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Container - Bottom Sheet on mobile, centered modal on desktop */}
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#ff6452]" />
            <h3 className="text-lg font-bold text-gray-900">Filter & Sort</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-full transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* Sorting */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
              Sort By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '🔥 Popularity', value: 'popular' },
                { label: 'Price: Low to High', value: 'price-asc' },
                { label: 'Price: High to Low', value: 'price-desc' },
                { label: 'Newest First', value: 'newest' },
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, sortBy: sort.value as any }))
                  }
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    filters.sortBy === sort.value
                      ? 'border-[#ff6452] bg-rose-50/50 text-[#ff6452]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {sort.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
                  className={`py-1.5 px-3 rounded-full border text-xs font-medium transition-all ${
                    (filters.category || 'All') === cat
                      ? 'bg-gray-900 border-gray-900 text-white font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
              Condition
            </label>
            <div className="flex flex-wrap gap-2">
              {conditions.map((cond) => (
                <button
                  key={cond}
                  onClick={() => setFilters((prev) => ({ ...prev, condition: cond }))}
                  className={`py-1.5 px-3 rounded-full border text-xs font-medium transition-all ${
                    (filters.condition || 'All') === cond
                      ? 'bg-[#ff6452] border-[#ff6452] text-white font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
              Price Range (ZAR)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Min R"
                value={filters.minPrice || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#ff6452] outline-none"
              />
              <span className="text-gray-400 font-bold">—</span>
              <input
                type="number"
                placeholder="Max R"
                value={filters.maxPrice || ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#ff6452] outline-none"
              />
            </div>
          </div>

          {/* In Stock Only */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-4">
            <span className="text-sm font-medium text-gray-800">In Stock Items Only</span>
            <input
              type="checkbox"
              checked={filters.inStockOnly || false}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, inStockOnly: e.target.checked }))
              }
              className="w-4 h-4 text-[#ff6452] accent-[#ff6452] rounded focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl shadow-md shadow-[#ff6452]/20 transition-all active:scale-[0.99]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
