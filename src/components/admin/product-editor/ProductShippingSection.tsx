import React from 'react';
import {
  Truck,
  Box,
  Scale,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ProductShippingSectionProps {
  weight: string;
  setWeight: (val: string) => void;
  length: string;
  setLength: (val: string) => void;
  width: string;
  setWidth: (val: string) => void;
  height: string;
  setHeight: (val: string) => void;
  shippingClass: string;
  setShippingClass: (val: string) => void;
  isFreeShipping: boolean;
  setIsFreeShipping: (val: boolean) => void;
  requiresShipping: boolean;
  setRequiresShipping: (val: boolean) => void;
}

export const ProductShippingSection: React.FC<ProductShippingSectionProps> = ({
  weight,
  setWeight,
  length,
  setLength,
  width,
  setWidth,
  height,
  setHeight,
  shippingClass,
  setShippingClass,
  isFreeShipping,
  setIsFreeShipping,
  requiresShipping,
  setRequiresShipping,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold border border-teal-100 dark:border-teal-900/60">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Shipping &amp; Logistics Specifications
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Package dimensions, courier classes, weight calculation, and free delivery eligibility.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Requires Shipping Toggle */}
        <label className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresShipping}
            onChange={(e) => setRequiresShipping(e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
          />
          <div className="text-xs">
            <div className="font-bold text-gray-900 dark:text-white">
              This product requires physical courier delivery
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400">
              Uncheck if this is a digital download, service voucher, or in-store pickup item.
            </p>
          </div>
        </label>

        {requiresShipping && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Weight */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-teal-600" />
                  <span>Weight (kg)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-600"
                />
              </div>

              {/* Length */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="20"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-600"
                />
              </div>

              {/* Width */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="15"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-600"
                />
              </div>

              {/* Height */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-600"
                />
              </div>
            </div>

            {/* Shipping Class & Free Shipping Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                  Courier Handling Class
                </label>
                <select
                  value={shippingClass}
                  onChange={(e) => setShippingClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-teal-600"
                >
                  <option value="Standard Courier">Standard Courier (Door to Door nationwide)</option>
                  <option value="Fragile & Glassware">Fragile &amp; Delicate (Extra Bubble Wrap &amp; Insurance)</option>
                  <option value="Heavy & Bulky Goods">Heavy &amp; Bulky Goods (Freight Cargo)</option>
                  <option value="Express Priority">Express Priority Air Overnight</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-3 p-3.5 w-full bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFreeShipping}
                    onChange={(e) => setIsFreeShipping(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Free Shipping Eligible</span>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                      Disregard delivery fee at checkout for this item.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
