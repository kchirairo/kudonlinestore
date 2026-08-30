import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Heart,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProductCategory, ProductCondition, ProductVariantItem } from '../../../types';
import { STORE_CONFIG } from '../../../constants/config';

interface ProductLivePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  brand: string;
  price: string;
  originalPrice: string;
  category: ProductCategory;
  subCategory: string;
  condition: ProductCondition;
  shortDescription: string;
  description: string;
  images: string[];
  stock: string;
  sku: string;
  variants: ProductVariantItem[];
  shippingClass: string;
  isFreeShipping: boolean;
  categoryAttributes: Record<string, any>;
}

export const ProductLivePreviewModal: React.FC<ProductLivePreviewModalProps> = ({
  isOpen,
  onClose,
  name,
  brand,
  price,
  originalPrice,
  category,
  subCategory,
  condition,
  shortDescription,
  description,
  images,
  stock,
  sku,
  variants,
  shippingClass,
  isFreeShipping,
  categoryAttributes,
}) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || '');

  if (!isOpen) return null;

  const numPrice = parseFloat(price) || 0;
  const numOrig = parseFloat(originalPrice) || 0;
  const hasDiscount = numOrig > numPrice && numPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((numOrig - numPrice) / numOrig) * 100) : 0;
  const numStock = parseInt(stock, 10) || 0;

  const displayImages = images.length > 0
    ? images
    : ['https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80'];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
              Storefront Live Preview
            </span>
          </div>

          {/* Device Toggles */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                device === 'desktop'
                  ? 'bg-rose-50 text-[#ff6452] dark:bg-rose-950/80 dark:text-rose-400 font-extrabold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop View</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                device === 'mobile'
                  ? 'bg-rose-50 text-[#ff6452] dark:bg-rose-950/80 dark:text-rose-400 font-extrabold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container with Simulated Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 dark:bg-slate-950 flex justify-center items-start">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-xl transition-all overflow-hidden ${
              device === 'mobile' ? 'w-full max-w-sm my-2' : 'w-full max-w-4xl my-2'
            }`}
          >
            <div className={`p-5 sm:p-7 ${device === 'desktop' ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'space-y-5'}`}>
              {/* Left Column: Gallery Carousel */}
              <div className="space-y-3">
                {/* Main Large Image */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center">
                  <img
                    src={displayImages[activeImageIndex] || displayImages[0]}
                    alt={name || 'Product preview'}
                    className="w-full h-full object-cover"
                  />

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-[#ff6452] text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md">
                      -{discountPercent}%
                    </div>
                  )}

                  {/* Left / Right Nav buttons */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === 0 ? displayImages.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) =>
                            prev === displayImages.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow-md cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails row */}
                {displayImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {displayImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveImageIndex(i)}
                        className={`w-14 h-14 rounded-xl overflow-hidden border shrink-0 transition-all cursor-pointer ${
                          activeImageIndex === i
                            ? 'border-2 border-[#ff6452] ring-2 ring-rose-500/20'
                            : 'border-gray-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Information & Details */}
              <div className="space-y-4">
                {/* Brand & Category Breadcrumb */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span className="font-bold text-[#ff6452] uppercase tracking-wider">
                    {brand || 'KUD Store'}
                  </span>
                  <span>
                    {category} {subCategory ? `› ${subCategory}` : ''}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-snug">
                  {name || 'Untitled Product Preview'}
                </h1>

                {/* Star rating & SKU */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="ml-1 text-gray-700 dark:text-slate-300 font-bold">5.0 (New)</span>
                  </div>
                  {sku && <span className="text-gray-400 font-mono text-[11px]">SKU: {sku}</span>}
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2.5">
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {numPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm font-semibold text-gray-400 line-through">
                      {STORE_CONFIG.STORE_CURRENCY}
                      {numOrig.toFixed(2)}
                    </span>
                  )}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                    {condition}
                  </span>
                </div>

                {/* Short Description */}
                {shortDescription && (
                  <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                    {shortDescription}
                  </p>
                )}

                {/* Variants picker if present */}
                {variants.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      Available Options:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            selectedVariantId === v.id
                              ? 'bg-rose-50 dark:bg-rose-950 border-[#ff6452] text-[#ff6452]'
                              : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'
                          }`}
                        >
                          {v.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock status */}
                <div className="text-xs font-bold">
                  {numStock > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      In Stock ({numStock} items remaining)
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400">Out of Stock</span>
                  )}
                </div>

                {/* Shipping & Delivery perks */}
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <Truck className="w-4 h-4 text-[#ff6452]" />
                    <span>
                      {isFreeShipping ? 'Free Delivery Included' : `${shippingClass} Shipping`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>100% Genuine Guaranteed Product</span>
                  </div>
                </div>

                {/* Full Description & Specs */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                    Product Details &amp; Specifications
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {description || 'No detailed description provided.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
