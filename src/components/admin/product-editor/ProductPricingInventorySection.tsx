import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { STORE_CONFIG } from '../../../constants/config';

interface ProductPricingInventorySectionProps {
  price: string;
  setPrice: (val: string) => void;
  originalPrice: string;
  setOriginalPrice: (val: string) => void;
  costPrice: string;
  setCostPrice: (val: string) => void;
  stock: string;
  setStock: (val: string) => void;
  lowStockThreshold: string;
  setLowStockThreshold: (val: string) => void;
  trackInventory: boolean;
  setTrackInventory: (val: boolean) => void;
  allowBackorders: boolean;
  setAllowBackorders: (val: boolean) => void;
}

export const ProductPricingInventorySection: React.FC<ProductPricingInventorySectionProps> = ({
  price,
  setPrice,
  originalPrice,
  setOriginalPrice,
  costPrice,
  setCostPrice,
  stock,
  setStock,
  lowStockThreshold,
  setLowStockThreshold,
  trackInventory,
  setTrackInventory,
  allowBackorders,
  setAllowBackorders,
}) => {
  const numPrice = parseFloat(price) || 0;
  const numOriginalPrice = parseFloat(originalPrice) || 0;
  const numCostPrice = parseFloat(costPrice) || 0;
  const numStock = parseInt(stock, 10) || 0;
  const numThreshold = parseInt(lowStockThreshold, 10) || 5;

  // Calculate discount percentage
  const hasDiscount = numOriginalPrice > numPrice && numPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((numOriginalPrice - numPrice) / numOriginalPrice) * 100)
    : 0;
  const discountSavings = hasDiscount ? (numOriginalPrice - numPrice).toFixed(2) : 0;

  // Calculate profit margin & gross profit
  const hasCost = numCostPrice > 0 && numPrice > 0;
  const grossProfit = hasCost ? numPrice - numCostPrice : 0;
  const profitMarginPercent = hasCost && numPrice > 0 ? ((grossProfit / numPrice) * 100).toFixed(1) : '0';
  const markupPercent = hasCost && numCostPrice > 0 ? ((grossProfit / numCostPrice) * 100).toFixed(1) : '0';

  // Stock status determination
  const getStockStatus = () => {
    if (!trackInventory) {
      return {
        label: 'Inventory Untracked (Always In Stock)',
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: ShieldCheck,
      };
    }
    if (numStock <= 0) {
      return {
        label: 'Out of Stock',
        color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        icon: AlertTriangle,
      };
    }
    if (numStock <= numThreshold) {
      return {
        label: `Low Stock Alert (${numStock} remaining)`,
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: AlertTriangle,
      };
    }
    return {
      label: `In Stock (${numStock} units available)`,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: CheckCircle2,
    };
  };

  const status = getStockStatus();
  const StatusIcon = status.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-100 dark:border-emerald-900/60">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Pricing &amp; Inventory Management
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Selling price, compare-at discounts, profit margin tracking, and inventory thresholds.
            </p>
          </div>
        </div>

        {/* Live Stock Status Indicator */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${status.color}`}>
          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{status.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Selling Price */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>
              Selling Price ({STORE_CONFIG.CURRENCY_CODE}) <span className="text-[#ff6452]">*</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Customer pays</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
              {STORE_CONFIG.STORE_CURRENCY}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
          </div>
        </div>

        {/* Compare-at Price (Original Price) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>Compare-at Price ({STORE_CONFIG.CURRENCY_CODE})</span>
            <span className="text-[11px] text-gray-400 font-normal">Strikethrough</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
              {STORE_CONFIG.STORE_CURRENCY}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
          </div>
        </div>

        {/* Cost per Item */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>Cost per Item ({STORE_CONFIG.CURRENCY_CODE})</span>
            <span className="text-[11px] text-gray-400 font-normal">Internal only</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
              {STORE_CONFIG.STORE_CURRENCY}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
          </div>
        </div>
      </div>

      {/* Financial Breakdown Bar (Discount + Profit Margins) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700 text-xs">
        {/* Discount Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-[#ff6452] flex items-center justify-center font-black shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">Customer Discount</div>
            <div className="font-extrabold text-gray-900 dark:text-white">
              {hasDiscount ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {discountPercent}% OFF (Save {STORE_CONFIG.STORE_CURRENCY}
                  {discountSavings})
                </span>
              ) : (
                <span className="text-gray-400">No active discount</span>
              )}
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center font-black shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">Estimated Gross Profit</div>
            <div className="font-extrabold text-gray-900 dark:text-white">
              {hasCost ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {STORE_CONFIG.STORE_CURRENCY}
                  {grossProfit.toFixed(2)} per unit
                </span>
              ) : (
                <span className="text-gray-400">Enter cost price to calculate</span>
              )}
            </div>
          </div>
        </div>

        {/* Profit Margin & Markup */}
        <div className="flex items-center gap-2.5 sm:col-span-2 lg:col-span-1">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center font-black shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase">Profit Margin / Markup</div>
            <div className="font-extrabold text-gray-900 dark:text-white">
              {hasCost ? (
                <span>
                  {profitMarginPercent}% Margin • {markupPercent}% Markup
                </span>
              ) : (
                <span className="text-gray-400">-- %</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inventory & Stock Levels */}
      <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
          Stock Levels &amp; Fulfillment
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {/* Stock Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Quantity in Stock <span className="text-[#ff6452]">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
          </div>

          {/* Low Stock Warning Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
              <span>Low Stock Threshold</span>
              <span className="text-[11px] text-gray-400 font-normal">Triggers alert</span>
            </label>
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="5"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
          </div>

          {/* Stock Status Badge for Mobile */}
          <div className="flex sm:hidden items-center justify-between p-3 rounded-2xl border bg-gray-50 dark:bg-slate-800">
            <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Live Status:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Toggles: Track Inventory & Backorders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="flex items-start gap-3 p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700 cursor-pointer hover:bg-gray-100/80 transition-colors">
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-md text-[#ff6452] border-gray-300 focus:ring-[#ff6452]"
            />
            <div className="text-xs">
              <div className="font-bold text-gray-900 dark:text-white">
                Track Inventory Quantity
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Automatically decrements stock on each order and marks out of stock when 0.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700 cursor-pointer hover:bg-gray-100/80 transition-colors">
            <input
              type="checkbox"
              checked={allowBackorders}
              onChange={(e) => setAllowBackorders(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-md text-[#ff6452] border-gray-300 focus:ring-[#ff6452]"
            />
            <div className="text-xs">
              <div className="font-bold text-gray-900 dark:text-white">
                Allow Backorders (Continue Selling When 0)
              </div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Customers can continue checking out even when current warehouse inventory reaches zero.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
