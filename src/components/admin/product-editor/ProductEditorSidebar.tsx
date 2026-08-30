import React from 'react';
import {
  Save,
  Eye,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { ProductPublishStatus } from '../../../types';
import { STORE_CONFIG } from '../../../constants/config';

interface ProductEditorSidebarProps {
  isEditMode: boolean;
  productStatus: ProductPublishStatus;
  setProductStatus: (val: ProductPublishStatus) => void;
  scheduledAt: string;
  setScheduledAt: (val: string) => void;
  isActive: boolean;
  setIsActive: (val: boolean) => void;
  isFeatured: boolean;
  setIsFeatured: (val: boolean) => void;
  primaryImageUrl: string;
  price: string;
  stock: string;
  sku: string;
  isSaving: boolean;
  onSave: (targetStatus?: ProductPublishStatus) => Promise<void>;
  onOpenPreview: () => void;
  lastSavedAt?: Date | null;
}

export const ProductEditorSidebar: React.FC<ProductEditorSidebarProps> = ({
  isEditMode,
  productStatus,
  setProductStatus,
  scheduledAt,
  setScheduledAt,
  isActive,
  setIsActive,
  isFeatured,
  setIsFeatured,
  primaryImageUrl,
  price,
  stock,
  sku,
  isSaving,
  onSave,
  onOpenPreview,
  lastSavedAt,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Publishing & Status Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Publishing Status
          </h3>
          <span
            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
              productStatus === 'active'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : productStatus === 'draft'
                ? 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300 border-gray-200 dark:border-slate-700'
                : productStatus === 'scheduled'
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {productStatus}
          </span>
        </div>

        {/* Status Radio / Select */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setProductStatus('active');
                setIsActive(true);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                productStatus === 'active'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setProductStatus('draft');
                setIsActive(false);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                productStatus === 'draft'
                  ? 'bg-gray-200 dark:bg-slate-700 border-gray-400 text-gray-900 dark:text-white shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              Draft
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProductStatus('scheduled')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                productStatus === 'scheduled'
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              Scheduled
            </button>
            <button
              type="button"
              onClick={() => {
                setProductStatus('archived');
                setIsActive(false);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                productStatus === 'archived'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                  : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Schedule Date-Time Picker */}
        {productStatus === 'scheduled' && (
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 rounded-2xl space-y-2">
            <label className="text-[11px] font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Auto-Publish Date &amp; Time</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
            />
          </div>
        )}

        {/* Toggles: Visible in Store & Featured */}
        <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
          <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Visible on Storefront
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#ff6452] focus:ring-[#ff6452]"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Featured Product</span>
            </span>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
          </label>
        </div>

        {/* Last Saved timestamp */}
        {lastSavedAt && (
          <div className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1.5 pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Last saved {lastSavedAt.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave()}
            className="w-full py-3 px-4 bg-[#ff6452] hover:bg-[#e05342] text-white rounded-2xl text-xs font-black shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Product...' : isEditMode ? 'Save & Update Product' : 'Publish Product'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSave('draft')}
              className="py-2.5 px-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={onOpenPreview}
              className="py-2.5 px-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary Cover Preview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center justify-between">
          <span>Primary Cover Photo</span>
          <span className="text-[10px] text-[#ff6452] font-bold">Slot #1</span>
        </h3>

        <div className="w-full aspect-square bg-gray-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 flex items-center justify-center relative">
          {primaryImageUrl ? (
            <img
              src={primaryImageUrl}
              alt="Primary Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4 text-gray-400">
              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-gray-300 dark:text-slate-600" />
              <span className="text-[11px] font-medium">No cover image uploaded</span>
            </div>
          )}
        </div>

        {/* Quick specs pill */}
        <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
          <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
            <div className="text-[9px] text-gray-400 font-bold uppercase">Price</div>
            <div className="font-extrabold text-gray-900 dark:text-white truncate">
              {STORE_CONFIG.STORE_CURRENCY}
              {parseFloat(price) || '0.00'}
            </div>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
            <div className="text-[9px] text-gray-400 font-bold uppercase">Stock</div>
            <div className="font-extrabold text-gray-900 dark:text-white truncate">
              {parseInt(stock, 10) || 0} units
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
