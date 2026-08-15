import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Tag,
  AlertCircle,
  Layers,
  SlidersHorizontal,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  Minus,
  Check,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Product, ProductCategory } from '../../types';
import { ConfirmationModal } from '../../components/admin/ConfirmationModal';
import { BulkEditModal } from '../../components/admin/BulkEditModal';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { exportProductsToCSV } from '../../utils/csvExport';

interface InlineRowEdit {
  price: number;
  originalPrice?: number;
  stock: number;
  isActive: boolean;
}

export const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'stock'>('newest');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Edit Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isSavingBulk, setIsSavingBulk] = useState<boolean>(false);

  // In-Table Quick Edit Grid Mode
  const [isQuickEditMode, setIsQuickEditMode] = useState<boolean>(false);
  const [inlineEdits, setInlineEdits] = useState<Record<string, InlineRowEdit>>({});
  const [isSavingInline, setIsSavingInline] = useState<boolean>(false);

  // CSV Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Modal deletion state
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingProductName, setDeletingProductName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getProducts({
        search: searchQuery,
        category: selectedCategory,
        sortBy,
      });

      let filtered = data;
      if (activeFilter === 'Active') {
        filtered = filtered.filter((p) => p.isActive !== false);
      } else if (activeFilter === 'Inactive') {
        filtered = filtered.filter((p) => p.isActive === false);
      }

      setProducts(filtered);

      // Fetch categories list
      const cats = await adminService.getCategories();
      setCategories(cats.map((c) => c.name));

      // Reset selection of IDs that no longer exist
      setSelectedIds((prev) => {
        const next = new Set<string>();
        const currentIds = new Set(filtered.map((p) => p.id));
        prev.forEach((id) => {
          if (currentIds.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, activeFilter, sortBy]);

  // Sync inline edits when entering quick edit mode or when products change
  useEffect(() => {
    if (isQuickEditMode) {
      const edits: Record<string, InlineRowEdit> = {};
      products.forEach((p) => {
        edits[p.id] = {
          price: p.price,
          originalPrice: p.originalPrice,
          stock: p.stock ?? (p.inStock ? 10 : 0),
          isActive: p.isActive !== false,
        };
      });
      setInlineEdits(edits);
    }
  }, [isQuickEditMode, products]);

  // Click outside listener for CSV export dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportDropdownOpen(false);
      }
    };

    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

  // CSV Export Handler
  const handleExportCSV = async (scope: 'filtered' | 'selected' | 'all') => {
    setIsExportDropdownOpen(false);
    setIsExporting(true);

    try {
      let targetProducts: Product[] = [];
      let filenameSuffix = '';

      if (scope === 'selected') {
        if (selectedIds.size === 0) {
          showToast('No products selected for export.', 'error');
          setIsExporting(false);
          return;
        }
        targetProducts = products.filter((p) => selectedIds.has(p.id));
        filenameSuffix = `selected_${targetProducts.length}_items`;
      } else if (scope === 'filtered') {
        targetProducts = products;
        filenameSuffix = 'filtered_view';
      } else {
        // 'all' full catalog
        const all = await adminService.getProducts();
        targetProducts = all;
        filenameSuffix = 'full_catalog';
      }

      if (targetProducts.length === 0) {
        showToast('No products available to export.', 'info');
        setIsExporting(false);
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `inventory_${filenameSuffix}_${dateStr}.csv`;

      const res = exportProductsToCSV(targetProducts, {
        filename,
        currencySymbol: STORE_CONFIG.STORE_CURRENCY,
      });

      showToast(
        `Successfully exported ${res.count} product${res.count === 1 ? '' : 's'} to CSV (${res.filename})`,
        'success'
      );
    } catch (err) {
      console.error('Error exporting products to CSV:', err);
      showToast('Failed to generate CSV export file.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Count changed inline items
  const changedInlineItems = useMemo(() => {
    if (!isQuickEditMode) return [];
    return products.filter((p) => {
      const edit = inlineEdits[p.id];
      if (!edit) return false;
      const initialStock = p.stock ?? (p.inStock ? 10 : 0);
      const initialIsActive = p.isActive !== false;
      return (
        edit.price !== p.price ||
        edit.originalPrice !== p.originalPrice ||
        edit.stock !== initialStock ||
        edit.isActive !== initialIsActive
      );
    });
  }, [isQuickEditMode, products, inlineEdits]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Single Item Status Toggle
  const handleToggleActive = async (product: Product) => {
    const newStatus = !(product.isActive !== false);
    const result = await adminService.updateProduct(product.id, { isActive: newStatus });
    if (result.success) {
      showToast(
        `Product "${product.name}" ${newStatus ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to update product status.', 'error');
    }
  };

  // Single Item Delete
  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;

    setIsDeleting(true);
    const result = await adminService.deleteProduct(deletingProductId);
    setIsDeleting(false);

    if (result.success) {
      showToast('Product deleted successfully', 'info');
      setDeletingProductId(null);
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to delete product.', 'error');
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);

    try {
      let successCount = 0;
      const idsToDelete = Array.from(selectedIds) as string[];
      for (const id of idsToDelete) {
        const res = await adminService.deleteProduct(id);
        if (res.success) successCount++;
      }
      showToast(`Successfully deleted ${successCount} products`, 'info');
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      fetchProducts();
    } catch (err) {
      showToast('Error during bulk deletion.', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk Status Toggle
  const handleBulkStatusChange = async (newStatus: boolean) => {
    if (selectedIds.size === 0) return;
    const idsList = Array.from(selectedIds) as string[];
    const updates = idsList.map((id) => ({
      id,
      changes: { isActive: newStatus },
    }));

    const result = await adminService.bulkUpdateProducts(updates);
    if (result.success) {
      showToast(
        `Updated status to ${newStatus ? 'Active' : 'Inactive'} for ${result.updatedCount} products`,
        'success'
      );
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to bulk update status.', 'error');
    }
  };

  // Bulk Stock Quick Restock
  const handleBulkQuickStock = async (amount: number, isSetExact = false) => {
    if (selectedIds.size === 0) return;
    const idsList = Array.from(selectedIds) as string[];
    const updates = idsList.map((id) => {
      const prod = products.find((p) => p.id === id);
      const currentStock = prod?.stock ?? (prod?.inStock ? 10 : 0);
      const nextStock = isSetExact ? amount : Math.max(0, currentStock + amount);
      return {
        id,
        changes: { stock: nextStock, inStock: nextStock > 0 },
      };
    });

    const result = await adminService.bulkUpdateProducts(updates);
    if (result.success) {
      showToast(`Updated stock for ${result.updatedCount} products`, 'success');
      fetchProducts();
    } else {
      showToast(result.error || 'Failed to update stock.', 'error');
    }
  };

  // Bulk Edit Modal Save Handler
  const handleSaveBulkUpdates = async (
    updates: Array<{ id: string; changes: Partial<Product> }>
  ) => {
    setIsSavingBulk(true);
    try {
      const result = await adminService.bulkUpdateProducts(updates);
      if (result.success) {
        showToast(
          `Successfully updated ${result.updatedCount} product${result.updatedCount === 1 ? '' : 's'}`,
          'success'
        );
        setIsBulkModalOpen(false);
        setSelectedIds(new Set());
        fetchProducts();
      } else {
        showToast(result.error || 'Failed to save bulk updates.', 'error');
      }
    } catch (err) {
      showToast('Error saving bulk updates.', 'error');
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Save Inline Quick Edit Changes
  const handleSaveInlineChanges = async () => {
    if (changedInlineItems.length === 0) return;
    setIsSavingInline(true);

    try {
      const updates = changedInlineItems.map((p) => {
        const edit = inlineEdits[p.id];
        return {
          id: p.id,
          changes: {
            price: edit.price,
            originalPrice: edit.originalPrice && edit.originalPrice > 0 ? edit.originalPrice : undefined,
            stock: edit.stock,
            inStock: edit.stock > 0,
            isActive: edit.isActive,
          },
        };
      });

      const result = await adminService.bulkUpdateProducts(updates);
      if (result.success) {
        showToast(`Saved changes for ${result.updatedCount} products`, 'success');
        setIsQuickEditMode(false);
        fetchProducts();
      } else {
        showToast(result.error || 'Failed to save inline changes.', 'error');
      }
    } catch (err) {
      showToast('Error saving inline edits.', 'error');
    } finally {
      setIsSavingInline(false);
    }
  };

  // Cancel Inline Edits
  const handleCancelInlineEdits = () => {
    setIsQuickEditMode(false);
    setInlineEdits({});
  };

  // Inline field update helper
  const handleInlineFieldChange = (
    id: string,
    field: keyof InlineRowEdit,
    value: any
  ) => {
    setInlineEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]:
          field === 'price' || field === 'stock' || field === 'originalPrice'
            ? Math.max(0, Number(value) || 0)
            : value,
      },
    }));
  };

  const handleInlineStockDelta = (id: string, delta: number) => {
    setInlineEdits((prev) => {
      const current = prev[id]?.stock ?? 0;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          stock: Math.max(0, current + delta),
        },
      };
    });
  };

  // Products to pass to the Bulk Modal
  const productsForBulkModal = useMemo(() => {
    if (selectedIds.size > 0) {
      return products.filter((p) => selectedIds.has(p.id));
    }
    return products;
  }, [products, selectedIds]);

  const allVisibleSelected = products.length > 0 && selectedIds.size === products.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < products.length;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Inventory</h1>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 font-bold text-xs rounded-full">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your store catalog, bulk pricing, stock quantities, and product availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* CSV Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={isExporting || products.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-bold rounded-2xl text-xs transition-all shadow-2xs border border-gray-200"
              title="Export product catalog and inventory to CSV spreadsheet"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              )}
              <span>Export CSV</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  isExportDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <h5 className="font-extrabold text-gray-900 text-xs">Export Inventory CSV</h5>
                  <p className="text-[10px] text-gray-400">Download catalog with pricing, stock & SKUs</p>
                </div>

                <div className="space-y-1 text-xs">
                  {/* Option 1: Current Filtered View */}
                  <button
                    onClick={() => handleExportCSV('filtered')}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-xl flex items-start gap-2.5 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-emerald-100">
                      <FileDown className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Current View ({products.length})</p>
                      <p className="text-[10px] text-gray-400">Export products matching active search & filters</p>
                    </div>
                  </button>

                  {/* Option 2: Selected items only (if any) */}
                  <button
                    onClick={() => handleExportCSV('selected')}
                    disabled={selectedIds.size === 0}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl flex items-start gap-2.5 transition-colors group cursor-pointer disabled:cursor-not-allowed"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#ff6452] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-rose-100">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        Selected Products ({selectedIds.size})
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {selectedIds.size > 0
                          ? `Export ${selectedIds.size} checked items only`
                          : 'Select items via checkboxes to enable'}
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Full Store Catalog */}
                  <button
                    onClick={() => handleExportCSV('all')}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-xl flex items-start gap-2.5 transition-colors group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-blue-100">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Entire Store Catalog</p>
                      <p className="text-[10px] text-gray-400">Export all products across all categories</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Edit Grid Mode Toggle */}
          <button
            onClick={() => setIsQuickEditMode(!isQuickEditMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-2xs border ${
              isQuickEditMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title="Toggle inline quick-editing for price and stock on this table"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isQuickEditMode ? 'Exit Quick Grid' : 'Quick Grid Edit'}</span>
          </button>

          {/* Bulk Edit Button (Opens Modal) */}
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl text-xs transition-all shadow-2xs active:scale-95"
            title="Open Bulk Price & Stock Editor"
          >
            <Layers className="w-4 h-4 text-[#ff6452]" />
            <span>
              {selectedIds.size > 0
                ? `Bulk Edit (${selectedIds.size})`
                : 'Bulk Edit All'}
            </span>
          </button>

          <button
            onClick={fetchProducts}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl text-gray-600 transition-colors shadow-2xs"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/admin/products/new')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6452] hover:bg-[#ff4935] text-white font-black rounded-2xl text-xs transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Quick Edit Active Banner Notice */}
      {isQuickEditMode && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">
                Quick Grid Editing Mode Active
              </h4>
              <p className="text-gray-600">
                Directly change prices, compare prices, and stock counts in the table cells below.
                {changedInlineItems.length > 0 && (
                  <strong className="text-amber-700 font-black ml-1">
                    ({changedInlineItems.length} items modified)
                  </strong>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelInlineEdits}
              className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInlineChanges}
              disabled={changedInlineItems.length === 0 || isSavingInline}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              {isSavingInline ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save {changedInlineItems.length} Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name, brand, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="All">Category: All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Filter */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="All">Status: All</option>
              <option value="Active">Status: Active Only</option>
              <option value="Inactive">Status: Inactive Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#ff6452]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
              <option value="stock">Sort: Stock Quantity</option>
            </select>
          </div>
        </div>

        {/* Quick Batch Actions & Selection Indicator inside filter bar */}
        {products.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-bold select-none">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected;
                  }}
                  onChange={handleSelectAllVisible}
                  className="rounded border-gray-300 text-[#ff6452] focus:ring-[#ff6452] accent-[#ff6452] w-4 h-4"
                />
                <span>
                  {allVisibleSelected
                    ? `All ${products.length} Selected`
                    : selectedIds.size > 0
                    ? `${selectedIds.size} of ${products.length} Selected`
                    : 'Select All Visible'}
                </span>
              </label>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-gray-400 hover:text-gray-700 font-bold underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV('filtered')}
                disabled={isExporting || products.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 font-bold rounded-xl transition-colors"
                title="Export current view to CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export View CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6452]/10 hover:bg-[#ff6452]/20 text-[#ff6452] font-black rounded-xl transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {selectedIds.size > 0
                    ? `Open Bulk Editor (${selectedIds.size})`
                    : 'Bulk Edit View'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-200 rounded-3xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center space-y-4">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">No products found</h3>
            <p className="text-xs text-gray-400">
              There are no products matching your search or filter options.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/products/new')}
            className="px-5 py-2.5 bg-[#ff6452] text-white text-xs font-bold rounded-2xl shadow-sm"
          >
            Create Product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={handleSelectAllVisible}
                      className="rounded border-gray-300 text-[#ff6452] focus:ring-[#ff6452] accent-[#ff6452] w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Product Info</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className={`py-3.5 px-4 ${isQuickEditMode ? 'w-48' : ''}`}>
                    Price {isQuickEditMode && `(${STORE_CONFIG.STORE_CURRENCY})`}
                  </th>
                  {isQuickEditMode && <th className="py-3.5 px-4 w-36">Original Price</th>}
                  <th className={`py-3.5 px-4 ${isQuickEditMode ? 'w-48' : ''}`}>Stock</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {products.map((product) => {
                  const img =
                    (Array.isArray(product.images) &&
                      product.images.find((u) => typeof u === 'string' && u.trim().length > 0)) ||
                    (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
                    (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
                    'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80';

                  const isSelected = selectedIds.has(product.id);
                  const edit = inlineEdits[product.id] || {
                    price: product.price,
                    originalPrice: product.originalPrice,
                    stock: product.stock ?? (product.inStock ? 10 : 0),
                    isActive: product.isActive !== false,
                  };

                  const isInlineModified =
                    isQuickEditMode &&
                    (edit.price !== product.price ||
                      edit.originalPrice !== product.originalPrice ||
                      edit.stock !== (product.stock ?? (product.inStock ? 10 : 0)) ||
                      edit.isActive !== (product.isActive !== false));

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-rose-50/40 hover:bg-rose-50/60'
                          : isInlineModified
                          ? 'bg-amber-50/40 hover:bg-amber-50/60'
                          : 'hover:bg-gray-50/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id)}
                          className="rounded border-gray-300 text-[#ff6452] focus:ring-[#ff6452] accent-[#ff6452] w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Product Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={product.name}
                            className="w-12 h-12 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                              {product.brand}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 truncate max-w-xs">
                              {product.name}
                            </h4>
                            {product.sku && (
                              <p className="text-[10px] font-mono text-gray-400">{product.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[11px] font-bold">
                          {product.category}
                        </span>
                      </td>

                      {/* Price Cell */}
                      <td className="py-4 px-4">
                        {isQuickEditMode ? (
                          <div className="space-y-1">
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-[10px] font-bold text-gray-400">
                                {STORE_CONFIG.STORE_CURRENCY}
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={edit.price}
                                onChange={(e) =>
                                  handleInlineFieldChange(product.id, 'price', e.target.value)
                                }
                                className="w-32 pl-8 pr-2 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#ff6452]"
                              />
                            </div>
                            {edit.price !== product.price && (
                              <span
                                className={`text-[10px] font-bold block ${
                                  edit.price > product.price ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {edit.price > product.price ? '+' : ''}
                                {(edit.price - product.price).toFixed(0)} {STORE_CONFIG.STORE_CURRENCY}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="font-black text-gray-900">
                            {STORE_CONFIG.STORE_CURRENCY}
                            {product.price.toLocaleString()}
                            {product.originalPrice && (
                              <span className="line-through text-gray-400 font-normal text-[11px] block">
                                {STORE_CONFIG.STORE_CURRENCY}
                                {product.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Original Price (Quick Edit Mode) */}
                      {isQuickEditMode && (
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="None"
                            value={edit.originalPrice ?? ''}
                            onChange={(e) =>
                              handleInlineFieldChange(
                                product.id,
                                'originalPrice',
                                e.target.value === '' ? undefined : e.target.value
                              )
                            }
                            className="w-28 px-2.5 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white rounded-xl text-xs font-mono font-semibold text-gray-600 focus:outline-none focus:border-[#ff6452]"
                          />
                        </td>
                      )}

                      {/* Stock Cell */}
                      <td className="py-4 px-4">
                        {isQuickEditMode ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInlineStockDelta(product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-bold"
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={edit.stock}
                                onChange={(e) =>
                                  handleInlineFieldChange(product.id, 'stock', e.target.value)
                                }
                                className={`w-16 text-center py-1.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#ff6452] ${
                                  edit.stock === 0
                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                    : edit.stock <= 5
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                              />

                              <button
                                type="button"
                                onClick={() => handleInlineStockDelta(product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-bold"
                              >
                                +
                              </button>
                            </div>
                            <span
                              className={`text-[10px] font-bold block ${
                                edit.stock === 0
                                  ? 'text-rose-600'
                                  : edit.stock <= 5
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {edit.stock === 0 ? 'Out of stock' : `${edit.stock} units`}
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`font-bold text-xs ${
                              (product.stock || 0) > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {(product.stock || 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            if (isQuickEditMode) {
                              handleInlineFieldChange(product.id, 'isActive', !edit.isActive);
                            } else {
                              handleToggleActive(product);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                            (isQuickEditMode ? edit.isActive : product.isActive !== false)
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>
                            {(isQuickEditMode ? edit.isActive : product.isActive !== false)
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right space-x-1">
                        <button
                          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 rounded-xl transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingProductId(product.id);
                            setDeletingProductName(product.name);
                          }}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards View for Mobile/Tablet */}
          <div className="lg:hidden divide-y divide-gray-100">
            {products.map((product) => {
              const img =
                (Array.isArray(product.images) &&
                  product.images.find((u) => typeof u === 'string' && u.trim().length > 0)) ||
                (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
                (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
                'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80';
              const isSelected = selectedIds.has(product.id);
              const isActive = product.isActive !== false;

              return (
                <div
                  key={product.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isSelected ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Mobile Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(product.id)}
                      className="mt-1 rounded border-gray-300 text-[#ff6452] focus:ring-[#ff6452] accent-[#ff6452] w-4 h-4 cursor-pointer"
                    />

                    <img
                      src={img}
                      alt={product.name}
                      className="w-16 h-16 rounded-xl object-cover bg-gray-50 border border-gray-100 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase">
                          {product.brand} • {product.category}
                        </span>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 truncate mt-0.5">
                        {product.name}
                      </h4>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="font-black text-gray-900 text-sm">
                          {STORE_CONFIG.STORE_CURRENCY}
                          {product.price.toLocaleString()}
                        </span>

                        <span className="text-xs font-semibold text-gray-500">
                          Stock: {product.stock || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setDeletingProductId(product.id);
                        setDeletingProductName(product.name);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Bottom Sticky Bulk Action Bar */}
      {selectedIds.size > 0 && !isQuickEditMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl bg-gray-900/95 backdrop-blur-md text-white rounded-3xl p-3 sm:p-4 shadow-2xl border border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#ff6452] text-white flex items-center justify-center font-black text-xs">
              {selectedIds.size}
            </span>
            <div>
              <h4 className="text-xs font-bold text-white">
                {selectedIds.size} {selectedIds.size === 1 ? 'Product' : 'Products'} Selected
              </h4>
              <p className="text-[10px] text-gray-400">
                Perform bulk updates, price changes, or inventory adjustments.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* Open Full Bulk Edit Modal */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#ff6452] hover:bg-[#ff4935] text-white font-black rounded-2xl text-xs transition-all shadow-sm active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Edit Pricing & Stock</span>
            </button>

            {/* Export Selected to CSV */}
            <button
              onClick={() => handleExportCSV('selected')}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-2xl text-xs transition-colors shadow-2xs"
              title="Export selected products to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export ({selectedIds.size}) CSV</span>
            </button>

            {/* Quick Restock (+10) */}
            <button
              onClick={() => handleBulkQuickStock(10)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-2xl text-xs transition-colors"
              title="Add 10 stock to selected"
            >
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <span>+10 Stock</span>
            </button>

            {/* Set Out of Stock (0) */}
            <button
              onClick={() => handleBulkQuickStock(0, true)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-2xl text-xs transition-colors"
              title="Set stock to 0"
            >
              <span>Zero Stock</span>
            </button>

            {/* Bulk Activate / Inactivate */}
            <button
              onClick={() => handleBulkStatusChange(true)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-emerald-300 font-bold rounded-2xl text-xs transition-colors"
              title="Activate selected"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Activate</span>
            </button>

            <button
              onClick={() => handleBulkStatusChange(false)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold rounded-2xl text-xs transition-colors"
              title="Hide / Inactivate selected"
            >
              <span>Hide</span>
            </button>

            {/* Delete Selected */}
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="p-2 bg-gray-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 rounded-2xl transition-colors"
              title="Delete selected items"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Clear Selection */}
            <button
              onClick={handleClearSelection}
              className="px-2.5 py-2 text-gray-400 hover:text-white font-bold text-xs"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal Component */}
      <BulkEditModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        selectedProducts={productsForBulkModal}
        categories={categories}
        onSave={handleSaveBulkUpdates}
        isSaving={isSavingBulk}
      />

      {/* Confirmation Modal for Single Product Deletion */}
      <ConfirmationModal
        isOpen={Boolean(deletingProductId)}
        title="Delete Product?"
        message={`Are you sure you want to delete "${deletingProductName}"? This action will remove the product permanently from the database.`}
        confirmText="Delete Product"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteProduct}
        onClose={() => setDeletingProductId(null)}
      />

      {/* Confirmation Modal for Bulk Deletion */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        title={`Delete ${selectedIds.size} Products?`}
        message={`Are you sure you want to permanently delete the ${selectedIds.size} selected products? This action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Products`}
        isDangerous={true}
        isLoading={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setShowBulkDeleteModal(false)}
      />
    </div>
  );
};
