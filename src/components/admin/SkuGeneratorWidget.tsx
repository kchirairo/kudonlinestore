import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash,
  Wand2,
} from 'lucide-react';
import { Product } from '../../types';
import {
  generateSkuSuggestions,
  checkSkuAvailability,
  generateUniqueSku,
  SkuSuggestion,
  CATEGORY_CODES,
} from '../../utils/skuGenerator';

interface SkuGeneratorWidgetProps {
  sku: string;
  onChange: (sku: string) => void;
  name: string;
  category: string;
  brand?: string;
  sizeOrVariant?: string;
  currentProductId?: string;
  existingProducts?: Product[];
  autoGenerateOnEmpty?: boolean;
}

export const SkuGeneratorWidget: React.FC<SkuGeneratorWidgetProps> = ({
  sku,
  onChange,
  name,
  category,
  brand = '',
  sizeOrVariant = '',
  currentProductId,
  existingProducts = [],
  autoGenerateOnEmpty = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [separator, setSeparator] = useState<'-' | '_' | '/' | ''>('-');
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoSyncWithTitle, setAutoSyncWithTitle] = useState(false);

  const prevNameRef = useRef(name);
  const prevCategoryRef = useRef(category);

  // Auto-sync when title or category changes if toggled on
  useEffect(() => {
    if (autoSyncWithTitle && (name !== prevNameRef.current || category !== prevCategoryRef.current)) {
      if (name.trim().length >= 2) {
        const newSku = generateUniqueSku(
          {
            name,
            category,
            brand,
            sizeOrVariant,
            separator,
            existingProducts,
            currentProductId,
          },
          'standard'
        );
        onChange(newSku);
      }
    }
    prevNameRef.current = name;
    prevCategoryRef.current = category;
  }, [name, category, autoSyncWithTitle, brand, sizeOrVariant, separator, existingProducts, currentProductId, onChange]);

  // Generate live suggestions
  const suggestions: SkuSuggestion[] = useMemo(() => {
    // Suppress unused variable warning for refreshKey by referencing it in useMemo dependencies
    void refreshKey;
    return generateSkuSuggestions({
      name,
      category,
      brand,
      sizeOrVariant,
      separator,
      existingProducts,
      currentProductId,
    });
  }, [name, category, brand, sizeOrVariant, separator, refreshKey, existingProducts, currentProductId]);

  // Check SKU Availability
  const availability = useMemo(() => {
    return checkSkuAvailability(sku, existingProducts, currentProductId);
  }, [sku, existingProducts, currentProductId]);

  // Quick 1-click generation
  const handleQuickGenerate = () => {
    const generated = generateUniqueSku(
      {
        name: name.trim() || 'Product',
        category,
        brand,
        sizeOrVariant,
        separator,
        existingProducts,
        currentProductId,
      },
      'standard'
    );
    onChange(generated);
    setRefreshKey((k) => k + 1);
  };

  const handleSelectSuggestion = (selectedSku: string) => {
    onChange(selectedSku);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSku(text);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleRefreshSuggestions = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-2">
      {/* Label and Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
            <Hash className="w-3.5 h-3.5 text-[#ff6452]" />
            <span>SKU Identifier</span>
          </label>
          <span className="text-[10px] text-gray-400 font-medium">(Stock Keeping Unit)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-lg border transition-all shadow-2xs ${
              isOpen
                ? 'bg-rose-50 text-[#ff6452] border-rose-200'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#ff6452]" />
            <span>{isOpen ? 'Close Tools' : 'SKU Generator Tool'}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main SKU Input Row */}
      <div className="relative flex items-center">
        <input
          type="text"
          id="product-sku-input"
          placeholder="e.g. BTY-HYDGLO-8X2"
          value={sku}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className={`w-full pl-3.5 pr-28 py-2.5 bg-gray-50 border rounded-2xl text-xs font-bold font-mono uppercase tracking-wider focus:bg-white focus:outline-none transition-all ${
            !sku
              ? 'border-gray-200 focus:border-[#ff6452]'
              : availability.isAvailable
              ? 'border-emerald-200 focus:border-emerald-500 bg-emerald-50/20'
              : 'border-amber-300 focus:border-amber-500 bg-amber-50/30'
          }`}
        />

        {/* Action Controls inside the input */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {sku && (
            <button
              type="button"
              onClick={() => handleCopy(sku)}
              title="Copy SKU"
              className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-xl transition-colors shadow-2xs"
            >
              {copiedSku === sku ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleQuickGenerate}
            title="Auto-generate SKU based on product title and category"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#ff6452] hover:bg-[#e05342] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Wand2 className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-SKU</span>
          </button>
        </div>
      </div>

      {/* Availability Status Message */}
      {sku && (
        <div className="flex items-center gap-1.5 px-1">
          {availability.isAvailable ? (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SKU is unique & available</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Already assigned to: "{availability.conflictingProduct?.name || 'Another item'}"
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded Intelligent SKU Generator & Suggestions Panel */}
      {isOpen && (
        <div className="p-4 bg-gradient-to-br from-gray-50 to-rose-50/30 border border-gray-200/90 rounded-2xl space-y-4 shadow-2xs animate-fadeIn">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-gray-200/70 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#ff6452]/10 text-[#ff6452] rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900">Automated SKU Suggestions</h4>
                <p className="text-[10px] text-gray-500">
                  Derived dynamically from {category ? `category "${category}"` : 'category'} &{' '}
                  {name ? `title "${name}"` : 'title'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshSuggestions}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-2xs"
              title="Generate new unique suffix codes"
            >
              <RefreshCw className="w-3 h-3 text-[#ff6452]" />
              <span>Refresh Codes</span>
            </button>
          </div>

          {/* Configuration Controls Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-white p-2.5 rounded-xl border border-gray-200/80">
            {/* Separator Chooser */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Separator:
              </span>
              {(['-', '_', '/', ''] as Array<'-' | '_' | '/' | ''>).map((sep) => (
                <button
                  key={`sep-${sep || 'none'}`}
                  type="button"
                  onClick={() => setSeparator(sep)}
                  className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md transition-all ${
                    separator === sep
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sep === '' ? 'None' : sep}
                </button>
              ))}
            </div>

            {/* Auto-Sync Toggle */}
            <label className="flex items-center gap-1.5 ml-auto cursor-pointer select-none text-[11px] font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={autoSyncWithTitle}
                onChange={(e) => setAutoSyncWithTitle(e.target.checked)}
                className="w-3.5 h-3.5 text-[#ff6452] rounded border-gray-300 focus:ring-[#ff6452]"
              />
              <span>Auto-sync with Title updates</span>
            </label>
          </div>

          {/* Suggestion Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {suggestions.map((item) => {
              const isSelected = sku === item.sku;
              const isItemAvailable = checkSkuAvailability(
                item.sku,
                existingProducts,
                currentProductId
              ).isAvailable;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item.sku)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-white border-2 border-[#ff6452] ring-2 ring-rose-100 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {item.label}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#ff6452] bg-rose-50 px-1.5 py-0.5 rounded-md">
                          <Check className="w-2.5 h-2.5" /> Applied
                        </span>
                      ) : !isItemAvailable ? (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          In Use
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Available
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs font-black text-gray-900 tracking-wider">
                      {item.sku}
                    </div>

                    <p className="text-[10px] text-gray-500 line-clamp-1">{item.description}</p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="font-mono text-[9px] text-gray-400 truncate max-w-[150px]">
                      {item.pattern}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSuggestion(item.sku);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                        isSelected
                          ? 'bg-[#ff6452] text-white'
                          : 'bg-gray-100 text-gray-700 group-hover:bg-gray-900 group-hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Use SKU'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Info & Reference Bar */}
          <div className="text-[10px] text-gray-500 bg-white/70 p-2.5 rounded-xl border border-gray-200/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-gray-400" />
              <span>
                <strong>Category Code:</strong>{' '}
                <span className="font-mono font-bold text-gray-800">
                  {CATEGORY_CODES[category] || category.substring(0, 3).toUpperCase() || 'GEN'}
                </span>
              </span>
            </div>
            <span>Unique identifiers prevent inventory confusion in shipping and order tracking.</span>
          </div>
        </div>
      )}
    </div>
  );
};
