import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Plus,
  Minus,
  Check,
  RotateCcw,
  AlertCircle,
  Save,
  Tag,
  Power,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Product } from '../../types';
import { STORE_CONFIG } from '../../constants/config';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  categories: string[];
  onSave: (updates: Array<{ id: string; changes: Partial<Product> }>) => Promise<void>;
  isSaving: boolean;
}

interface ProductEditState {
  id: string;
  name: string;
  brand: string;
  category: string;
  sku?: string;
  image: string;
  initialPrice: number;
  price: number;
  initialOriginalPrice?: number;
  originalPrice?: number;
  initialStock: number;
  stock: number;
  initialIsActive: boolean;
  isActive: boolean;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  categories,
  onSave,
  isSaving,
}) => {
  if (!isOpen || selectedProducts.length === 0) return null;

  // Initialize editing state for all selected products
  const [items, setItems] = useState<ProductEditState[]>(() => {
    return selectedProducts.map((p) => {
      const img =
        (Array.isArray(p.images) && p.images.find((u) => typeof u === 'string' && u.trim())) ||
        (typeof (p as any).image_url === 'string' && (p as any).image_url.trim()) ||
        'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=200&q=80';

      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        sku: p.sku,
        image: img,
        initialPrice: p.price,
        price: p.price,
        initialOriginalPrice: p.originalPrice,
        originalPrice: p.originalPrice,
        initialStock: p.stock ?? (p.inStock ? 10 : 0),
        stock: p.stock ?? (p.inStock ? 10 : 0),
        initialIsActive: p.isActive !== false,
        isActive: p.isActive !== false,
      };
    });
  });

  // Keep search filter within modal
  const [searchFilter, setSearchFilter] = useState('');

  // Mass Update Controls State
  const [batchTab, setBatchTab] = useState<'price' | 'stock' | 'status'>('stock');

  // Stock Batch Settings
  const [stockBatchMode, setStockBatchMode] = useState<'set' | 'adjust'>('set');
  const [stockBatchValue, setStockBatchValue] = useState<string>('');

  // Price Batch Settings
  const [priceBatchMode, setPriceBatchMode] = useState<'percent' | 'fixed' | 'set'>('percent');
  const [priceBatchValue, setPriceBatchValue] = useState<string>('');
  const [priceBatchDirection, setPriceBatchDirection] = useState<'increase' | 'decrease'>('increase');
  const [roundPrice, setRoundPrice] = useState<boolean>(true);

  // Status & Category Batch Settings
  const [statusBatchValue, setStatusBatchValue] = useState<'active' | 'inactive' | 'no-change'>('no-change');
  const [categoryBatchValue, setCategoryBatchValue] = useState<string>('');

  // Filtered rows for the modal table
  const displayedItems = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, searchFilter]);

  // Count modified items
  const modifiedCount = useMemo(() => {
    return items.filter(
      (item) =>
        item.price !== item.initialPrice ||
        item.originalPrice !== item.initialOriginalPrice ||
        item.stock !== item.initialStock ||
        item.isActive !== item.initialIsActive ||
        (categoryBatchValue && item.category !== selectedProducts.find((p) => p.id === item.id)?.category)
    ).length;
  }, [items, categoryBatchValue, selectedProducts]);

  // Apply Batch Stock
  const handleApplyBatchStock = () => {
    const val = Number(stockBatchValue);
    if (isNaN(val)) return;

    setItems((prev) =>
      prev.map((item) => {
        let newStock = item.stock;
        if (stockBatchMode === 'set') {
          newStock = Math.max(0, val);
        } else if (stockBatchMode === 'adjust') {
          newStock = Math.max(0, item.stock + val);
        }
        return { ...item, stock: newStock };
      })
    );
  };

  // Apply Batch Price
  const handleApplyBatchPrice = () => {
    const val = Number(priceBatchValue);
    if (isNaN(val) || val <= 0) return;

    setItems((prev) =>
      prev.map((item) => {
        let newPrice = item.price;

        if (priceBatchMode === 'set') {
          newPrice = Math.max(0.01, val);
        } else if (priceBatchMode === 'percent') {
          const factor = priceBatchDirection === 'increase' ? 1 + val / 100 : 1 - val / 100;
          newPrice = Math.max(0.01, item.price * factor);
        } else if (priceBatchMode === 'fixed') {
          const delta = priceBatchDirection === 'increase' ? val : -val;
          newPrice = Math.max(0.01, item.price + delta);
        }

        if (roundPrice) {
          newPrice = Math.round(newPrice);
        } else {
          newPrice = Number(newPrice.toFixed(2));
        }

        return { ...item, price: newPrice };
      })
    );
  };

  // Apply Batch Status & Category
  const handleApplyBatchStatusAndCategory = () => {
    setItems((prev) =>
      prev.map((item) => {
        let next = { ...item };
        if (statusBatchValue === 'active') next.isActive = true;
        if (statusBatchValue === 'inactive') next.isActive = false;
        if (categoryBatchValue) next.category = categoryBatchValue;
        return next;
      })
    );
  };

  // Quick Row Updates
  const handleItemChange = (id: string, field: 'price' | 'originalPrice' | 'stock' | 'isActive', value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === 'price' || field === 'stock' || field === 'originalPrice' ? Math.max(0, Number(value) || 0) : value,
        };
      })
    );
  };

  const handleStockIncrement = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, stock: Math.max(0, item.stock + delta) };
      })
    );
  };

  const handleResetRow = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          price: item.initialPrice,
          originalPrice: item.initialOriginalPrice,
          stock: item.initialStock,
          isActive: item.initialIsActive,
        };
      })
    );
  };

  const handleResetAll = () => {
    setItems(
      selectedProducts.map((p) => {
        const img =
          (Array.isArray(p.images) && p.images.find((u) => typeof u === 'string' && u.trim())) ||
          (typeof (p as any).image_url === 'string' && (p as any).image_url.trim()) ||
          'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=200&q=80';

        return {
          id: p.id,
          name: p.name,
          brand: p.brand,
          category: p.category,
          sku: p.sku,
          image: img,
          initialPrice: p.price,
          price: p.price,
          initialOriginalPrice: p.originalPrice,
          originalPrice: p.originalPrice,
          initialStock: p.stock ?? (p.inStock ? 10 : 0),
          stock: p.stock ?? (p.inStock ? 10 : 0),
          initialIsActive: p.isActive !== false,
          isActive: p.isActive !== false,
        };
      })
    );
  };

  const handleSaveAll = async () => {
    const updates = items.map((item) => ({
      id: item.id,
      changes: {
        price: item.price,
        originalPrice: item.originalPrice && item.originalPrice > 0 ? item.originalPrice : undefined,
        stock: item.stock,
        inStock: item.stock > 0,
        isActive: item.isActive,
        ...(item.category ? { category: item.category } : {}),
      },
    }));

    await onSave(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff6452]/10 text-[#ff6452] flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Bulk Inventory & Pricing Editor</h2>
                <span className="px-2.5 py-0.5 bg-[#ff6452] text-white text-[11px] font-black rounded-full shadow-2xs">
                  {selectedProducts.length} {selectedProducts.length === 1 ? 'Product' : 'Products'} Selected
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Update stock quantities, regular & sale prices, and catalog status across multiple items at once.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 rounded-2xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mass Batch Tool Belt */}
        <div className="p-4 sm:p-5 bg-gray-900 text-white border-b border-gray-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Batch Tool Tabs */}
            <div className="flex items-center gap-2 bg-gray-800/80 p-1 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setBatchTab('stock')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  batchTab === 'stock'
                    ? 'bg-[#ff6452] text-white shadow-2xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Batch Stock</span>
              </button>

              <button
                type="button"
                onClick={() => setBatchTab('price')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  batchTab === 'price'
                    ? 'bg-[#ff6452] text-white shadow-2xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Batch Pricing</span>
              </button>

              <button
                type="button"
                onClick={() => setBatchTab('status')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  batchTab === 'status'
                    ? 'bg-[#ff6452] text-white shadow-2xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>Status & Category</span>
              </button>
            </div>

            {/* Batch Action Controls */}
            <div className="flex-1 flex flex-wrap items-center gap-3 justify-start lg:justify-end">
              {batchTab === 'stock' && (
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setStockBatchMode('set')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        stockBatchMode === 'set' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Set Exact Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setStockBatchMode('adjust')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        stockBatchMode === 'adjust' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Adjust (+ / -)
                    </button>
                  </div>

                  <input
                    type="number"
                    placeholder={stockBatchMode === 'set' ? 'e.g. 50' : 'e.g. 10 or -5'}
                    value={stockBatchValue}
                    onChange={(e) => setStockBatchValue(e.target.value)}
                    className="w-28 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-[#ff6452]"
                  />

                  <button
                    type="button"
                    onClick={handleApplyBatchStock}
                    disabled={!stockBatchValue}
                    className="px-4 py-1.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply to All ({items.length})</span>
                  </button>

                  <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setItems((prev) => prev.map((item) => ({ ...item, stock: 0 })));
                      }}
                      className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-rose-300 rounded-xl text-[11px] font-bold transition-colors"
                      title="Set all selected stock to 0"
                    >
                      Set Out of Stock (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setItems((prev) => prev.map((item) => ({ ...item, stock: item.stock || 10 })));
                      }}
                      className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-emerald-300 rounded-xl text-[11px] font-bold transition-colors"
                      title="Ensure all selected have stock"
                    >
                      Set Restock (10)
                    </button>
                  </div>
                </div>
              )}

              {batchTab === 'price' && (
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setPriceBatchMode('percent')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        priceBatchMode === 'percent' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceBatchMode('fixed')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        priceBatchMode === 'fixed' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Fixed ({STORE_CONFIG.STORE_CURRENCY})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceBatchMode('set')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        priceBatchMode === 'set' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Set Exact
                    </button>
                  </div>

                  {priceBatchMode !== 'set' && (
                    <div className="flex items-center bg-gray-800 rounded-xl p-0.5 border border-gray-700">
                      <button
                        type="button"
                        onClick={() => setPriceBatchDirection('increase')}
                        className={`px-2 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                          priceBatchDirection === 'increase' ? 'bg-emerald-600 text-white' : 'text-gray-400'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Increase</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceBatchDirection('decrease')}
                        className={`px-2 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                          priceBatchDirection === 'decrease' ? 'bg-rose-600 text-white' : 'text-gray-400'
                        }`}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        <span>Discount</span>
                      </button>
                    </div>
                  )}

                  <input
                    type="number"
                    placeholder={priceBatchMode === 'percent' ? 'e.g. 10%' : `e.g. 50`}
                    value={priceBatchValue}
                    onChange={(e) => setPriceBatchValue(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono font-bold focus:outline-none focus:border-[#ff6452]"
                  />

                  <label className="flex items-center gap-1.5 text-gray-300 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roundPrice}
                      onChange={(e) => setRoundPrice(e.target.checked)}
                      className="rounded border-gray-600 accent-[#ff6452]"
                    />
                    <span>Round integers</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleApplyBatchPrice}
                    disabled={!priceBatchValue}
                    className="px-4 py-1.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Pricing</span>
                  </button>
                </div>
              )}

              {batchTab === 'status' && (
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <select
                    value={statusBatchValue}
                    onChange={(e) => setStatusBatchValue(e.target.value as any)}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#ff6452]"
                  >
                    <option value="no-change">Status: No Change</option>
                    <option value="active">Set Active (Visible)</option>
                    <option value="inactive">Set Inactive (Hidden)</option>
                  </select>

                  <select
                    value={categoryBatchValue}
                    onChange={(e) => setCategoryBatchValue(e.target.value)}
                    className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-white font-bold focus:outline-none focus:border-[#ff6452]"
                  >
                    <option value="">Category: No Change</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        Move to: {c}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleApplyBatchStatusAndCategory}
                    disabled={statusBatchValue === 'no-change' && !categoryBatchValue}
                    className="px-4 py-1.5 bg-[#ff6452] hover:bg-[#ff4935] disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Status/Category</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter bar inside modal */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search selected products..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
            />
            <Package className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">
              Modified: <strong className="text-gray-900 font-bold">{modifiedCount}</strong> of {items.length}
            </span>
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 font-bold text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet-like Table of Products */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 sticky top-0 z-10 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100 backdrop-blur-xs">
              <tr>
                <th className="py-3 px-5">Product Info</th>
                <th className="py-3 px-4 w-40">Price ({STORE_CONFIG.STORE_CURRENCY})</th>
                <th className="py-3 px-4 w-36">Original Price</th>
                <th className="py-3 px-4 w-44">Stock Inventory</th>
                <th className="py-3 px-4 w-28 text-center">Status</th>
                <th className="py-3 px-4 w-12 text-right">Reset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {displayedItems.map((item) => {
                const isModified =
                  item.price !== item.initialPrice ||
                  item.originalPrice !== item.initialOriginalPrice ||
                  item.stock !== item.initialStock ||
                  item.isActive !== item.initialIsActive;

                const priceDiff = item.price - item.initialPrice;
                const pricePctDiff = item.initialPrice > 0 ? (priceDiff / item.initialPrice) * 100 : 0;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isModified ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Product Identity */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover bg-gray-100 border border-gray-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-gray-400 uppercase truncate">
                              {item.brand} • {item.category}
                            </span>
                            {isModified && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-gray-900 truncate max-w-xs">{item.name}</h4>
                          {item.sku && <p className="text-[10px] font-mono text-gray-400">{item.sku}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Price Input */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-[11px] font-bold text-gray-400">
                            {STORE_CONFIG.STORE_CURRENCY}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff6452]"
                          />
                        </div>
                        {priceDiff !== 0 && (
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            {priceDiff > 0 ? (
                              <span className="text-emerald-600 flex items-center">
                                +{pricePctDiff.toFixed(1)}% (+{priceDiff.toFixed(0)})
                              </span>
                            ) : (
                              <span className="text-rose-600 flex items-center">
                                {pricePctDiff.toFixed(1)}% ({priceDiff.toFixed(0)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Original / Compare At Price */}
                    <td className="py-3.5 px-4">
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[11px] font-bold text-gray-400">
                          {STORE_CONFIG.STORE_CURRENCY}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="None"
                          value={item.originalPrice ?? ''}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              'originalPrice',
                              e.target.value === '' ? undefined : e.target.value
                            )
                          }
                          className="w-full pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-mono font-semibold text-gray-600 focus:outline-none focus:border-[#ff6452]"
                        />
                      </div>
                    </td>

                    {/* Stock Input & Stepper */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStockIncrement(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-700 font-bold transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={item.stock}
                            onChange={(e) => handleItemChange(item.id, 'stock', e.target.value)}
                            className={`w-16 text-center py-1.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#ff6452] ${
                              item.stock === 0
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : item.stock <= 5
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleStockIncrement(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-gray-700 font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-[10px] font-bold">
                          {item.stock === 0 ? (
                            <span className="text-rose-600 font-semibold">Out of Stock</span>
                          ) : item.stock <= 5 ? (
                            <span className="text-amber-600 font-semibold">Low Stock</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">In Stock</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleItemChange(item.id, 'isActive', !item.isActive)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{item.isActive ? 'Active' : 'Hidden'}</span>
                      </button>
                    </td>

                    {/* Reset Button */}
                    <td className="py-3.5 px-4 text-right">
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => handleResetRow(item.id)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                          title="Reset changes for this item"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span>
              Changes will be synchronized immediately to the store catalog and product database.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-2xl transition-colors shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save {modifiedCount > 0 ? `${modifiedCount} Changed Items` : 'All Updates'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
