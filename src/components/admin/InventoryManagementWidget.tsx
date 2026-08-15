import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Save,
  Search,
  Edit2,
  RefreshCw,
  Boxes,
  DollarSign,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Product } from '../../types';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';

interface InventoryManagementWidgetProps {
  onInventoryUpdated?: () => void;
}

export const InventoryManagementWidget: React.FC<InventoryManagementWidgetProps> = ({
  onInventoryUpdated,
}) => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');

  // Track inline editing stock values per product ID
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getProducts();
      setProducts(data);

      // Initialize edit states
      const edits: Record<string, number> = {};
      data.forEach((p) => {
        edits[p.id] = p.stock ?? (p.inStock ? 10 : 0);
      });
      setStockEdits(edits);
    } catch (err) {
      console.error('Failed to load products for inventory widget:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Compute stock statistics
  const stats = useMemo(() => {
    let totalItems = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyStockCount = 0;
    let totalValuation = 0;

    products.forEach((p) => {
      const currentStock = p.stock ?? (p.inStock ? 10 : 0);
      totalValuation += p.price * currentStock;

      if (currentStock === 0 || p.inStock === false) {
        outOfStockCount++;
      } else if (currentStock <= 5) {
        lowStockCount++;
      } else {
        healthyStockCount++;
      }
    });

    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      totalValuation,
    };
  }, [products]);

  // Filtered products list based on search and stock status
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const currentStock = p.stock ?? (p.inStock ? 10 : 0);

      // Stock status filter
      if (stockFilter === 'low' && (currentStock > 5 || currentStock === 0)) return false;
      if (stockFilter === 'out' && currentStock > 0 && p.inStock !== false) return false;
      if (stockFilter === 'healthy' && currentStock <= 5) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(q);
        const brandMatch = p.brand.toLowerCase().includes(q);
        const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
        const catMatch = p.category.toLowerCase().includes(q);
        return nameMatch || brandMatch || skuMatch || catMatch;
      }

      return true;
    });
  }, [products, stockFilter, searchQuery]);

  const handleStockInputChange = (productId: string, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setStockEdits((prev) => ({ ...prev, [productId]: safeVal }));
  };

  const handleStockIncrement = (productId: string, delta: number) => {
    setStockEdits((prev) => {
      const current = prev[productId] ?? 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const handleSaveStock = async (product: Product) => {
    const newStock = stockEdits[product.id] ?? 0;
    setSavingProductId(product.id);

    try {
      const result = await adminService.updateProduct(product.id, {
        stock: newStock,
        inStock: newStock > 0,
      });

      if (result.success) {
        showToast(`Stock for "${product.name}" updated to ${newStock}`, 'success');
        
        // Update local list state
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, stock: newStock, inStock: newStock > 0 } : p
          )
        );

        if (onInventoryUpdated) {
          onInventoryUpdated();
        }
      } else {
        showToast(result.error || 'Failed to update stock quantity', 'error');
      }
    } catch (err) {
      showToast('Error saving inventory stock', 'error');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleQuickRestock = async (product: Product, addAmount: number) => {
    const currentStock = stockEdits[product.id] ?? product.stock ?? 0;
    const newStock = currentStock + addAmount;
    setStockEdits((prev) => ({ ...prev, [product.id]: newStock }));

    setSavingProductId(product.id);
    try {
      const result = await adminService.updateProduct(product.id, {
        stock: newStock,
        inStock: newStock > 0,
      });

      if (result.success) {
        showToast(`Added +${addAmount} units to "${product.name}" (Total: ${newStock})`, 'success');
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, stock: newStock, inStock: newStock > 0 } : p
          )
        );

        if (onInventoryUpdated) {
          onInventoryUpdated();
        }
      } else {
        showToast(result.error || 'Failed to restock item', 'error');
      }
    } catch {
      showToast('Error updating stock', 'error');
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden space-y-6 p-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#ff6452]" />
            <h3 className="text-lg font-black text-gray-900 tracking-tight">
              Live Inventory Management
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time stock level monitoring, low stock warnings, and quick quantity adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/admin/products')}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <span>Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stock Summary Mini-Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Products */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold">Total Catalog</span>
            <Package className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-gray-900">{stats.totalItems}</p>
          <p className="text-[10px] text-gray-400">Products listed</p>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer space-y-1 ${
            stats.lowStockCount > 0
              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
              : 'bg-gray-50 border-gray-100'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold">Low Stock (≤ 5)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-900">{stats.lowStockCount}</p>
          <p className="text-[10px] text-amber-700">Needs replenishment</p>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}
          className={`rounded-2xl p-4 border transition-all cursor-pointer space-y-1 ${
            stats.outOfStockCount > 0
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
              : 'bg-gray-50 border-gray-100'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold">Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-rose-900">{stats.outOfStockCount}</p>
          <p className="text-[10px] text-rose-700">0 items available</p>
        </div>

        {/* Stock Valuation */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-1">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold">Stock Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-gray-900">
            {STORE_CONFIG.STORE_CURRENCY}
            {stats.totalValuation.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400">Total inventory value</p>
        </div>
      </div>

      {/* Low / Out of Stock Alert Banner */}
      {(stats.lowStockCount > 0 || stats.outOfStockCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl flex-shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-amber-900">
                Inventory Attention Required
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5">
                You have {stats.outOfStockCount} out-of-stock item(s) and {stats.lowStockCount} low-stock item(s). Replenish inventory below to prevent missed customer orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStockFilter('low')}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              View Low Stock ({stats.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              View Out of Stock ({stats.outOfStockCount})
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, brand, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ff6452]"
          />
        </div>

        {/* Stock Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              stockFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            All Items ({stats.totalItems})
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock ({stats.lowStockCount})</span>
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Out of Stock ({stats.outOfStockCount})</span>
          </button>
          <button
            onClick={() => setStockFilter('healthy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              stockFilter === 'healthy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Healthy ({stats.healthyStockCount})</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-2">
          <Package className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-xs font-bold text-gray-700">No matching inventory items</p>
          <p className="text-[11px] text-gray-400">
            Try adjusting your search keyword or stock filter selection.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Product Info</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Inline Stock Adjuster</th>
                <th className="py-3 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredProducts.map((product) => {
                const currentStock = product.stock ?? (product.inStock ? 10 : 0);
                const editVal = stockEdits[product.id] ?? currentStock;
                const isDirty = editVal !== currentStock;
                const isSaving = savingProductId === product.id;

                const img =
                  (Array.isArray(product.images) && product.images.find((u) => typeof u === 'string' && u.trim().length > 0)) ||
                  (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
                  (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
                  'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80';

                // Status styling
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>In Stock ({currentStock})</span>
                  </span>
                );

                if (currentStock === 0 || product.inStock === false) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[11px] font-bold">
                      <XCircle className="w-3 h-3" />
                      <span>Out of Stock</span>
                    </span>
                  );
                } else if (currentStock <= 5) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[11px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Low Stock ({currentStock})</span>
                    </span>
                  );
                }

                return (
                  <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Product Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={img}
                          alt={product.name}
                          className="w-10 h-10 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                            {product.brand}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-[10px] font-mono text-gray-400">{product.sku}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-semibold">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-black text-gray-900">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {product.price.toLocaleString()}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3 px-4">{statusBadge}</td>

                    {/* Quick Inline Stock Adjuster */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                          <button
                            onClick={() => handleStockIncrement(product.id, -1)}
                            disabled={editVal <= 0 || isSaving}
                            className="p-1.5 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-colors"
                            title="Decrease Stock"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={editVal}
                            onChange={(e) =>
                              handleStockInputChange(product.id, parseInt(e.target.value) || 0)
                            }
                            className="w-12 text-center bg-transparent py-1 text-xs font-black text-gray-900 focus:outline-none"
                          />

                          <button
                            onClick={() => handleStockIncrement(product.id, 1)}
                            disabled={isSaving}
                            className="p-1.5 hover:bg-gray-200 text-gray-600 transition-colors"
                            title="Increase Stock"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={() => handleSaveStock(product)}
                          disabled={!isDirty || isSaving}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isDirty
                              ? 'bg-[#ff6452] hover:bg-[#ff4935] text-white shadow-xs'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                          <span>Save</span>
                        </button>
                      </div>
                    </td>

                    {/* Quick Restock / Edit Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleQuickRestock(product, 10)}
                          disabled={isSaving}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap"
                          title="Add 10 units to stock"
                        >
                          +10 Restock
                        </button>

                        <button
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Full Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
