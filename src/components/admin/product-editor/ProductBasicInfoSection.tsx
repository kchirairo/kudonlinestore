import React, { useState } from 'react';
import {
  Tag,
  Sparkles,
  Package,
  Layers,
  FileText,
  AlignLeft,
  X,
  Plus,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { ProductCategory, ProductCondition } from '../../../types';
import { SkuGeneratorWidget } from '../SkuGeneratorWidget';
import { Product } from '../../../types';

interface ProductBasicInfoSectionProps {
  name: string;
  setName: (val: string) => void;
  brand: string;
  setBrand: (val: string) => void;
  category: ProductCategory;
  setCategory: (val: ProductCategory) => void;
  subCategory: string;
  setSubCategory: (val: string) => void;
  productType: string;
  setProductType: (val: string) => void;
  sku: string;
  setSku: (val: string) => void;
  sizeOrVariant: string;
  setSizeOrVariant: (val: string) => void;
  condition: ProductCondition;
  setCondition: (val: ProductCondition) => void;
  shortDescription: string;
  setShortDescription: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  categories: string[];
  categoryError?: string;
  existingProducts?: Product[];
  currentProductId?: string;
}

export const ProductBasicInfoSection: React.FC<ProductBasicInfoSectionProps> = ({
  name,
  setName,
  brand,
  setBrand,
  category,
  setCategory,
  subCategory,
  setSubCategory,
  productType,
  setProductType,
  sku,
  setSku,
  sizeOrVariant,
  setSizeOrVariant,
  condition,
  setCondition,
  shortDescription,
  setShortDescription,
  description,
  setDescription,
  tags,
  setTags,
  categories,
  categoryError,
  existingProducts = [],
  currentProductId,
}) => {
  const [tagInput, setTagInput] = useState<string>('');

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const productConditions: ProductCondition[] = [
    'Brand New',
    'Used',
    'Like New',
    'Refurbished',
    'Renewed',
    'Vintage',
    'Good',
  ];

  const commonBrands = ['KUD Store', 'Samsung', 'Apple', 'Sony', 'Nike', 'L\'Oréal', 'Dyson', 'Philips'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center font-bold border border-rose-100 dark:border-rose-900/60">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
            Basic Information
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Core product identity, categorization, conditions, and descriptions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Product Name */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>
              Product Name <span className="text-[#ff6452]">*</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">
              {name.length}/120 characters
            </span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wireless Noise-Cancelling Headphones Pro"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452] focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Brand / Manufacturer
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Sony, Apple, Nike"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
          />
          {/* Quick brand suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {commonBrands.slice(0, 4).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                  brand === b
                    ? 'bg-[#ff6452]/10 border-[#ff6452] text-[#ff6452] font-bold'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Primary Category <span className="text-[#ff6452]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-2xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden transition-colors ${
              categoryError
                ? 'border-rose-500 focus:border-rose-600 ring-1 ring-rose-500/20'
                : 'border-gray-200 dark:border-slate-700 focus:border-[#ff6452]'
            }`}
          >
            {!category && <option value="">-- Select a Category --</option>}
            {/* Ensure existing product's category is preserved if not currently in the fetched list */}
            {category && !categories.includes(category) && (
              <option key={category} value={category}>
                {category}
              </option>
            )}
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {categoryError && (
            <p className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
              {categoryError}
            </p>
          )}
        </div>

        {/* Subcategory */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Subcategory / Department
          </label>
          <input
            type="text"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            placeholder="e.g. Skincare, Audio, Kitchenware"
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
          />
        </div>

        {/* Product Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Product Classification
          </label>
          <select
            value={productType || 'Physical Product'}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
          >
            <option value="Physical Product">Physical Product (Standard Delivery)</option>
            <option value="Digital Download">Digital Download / Software</option>
            <option value="Bundle / Gift Set">Product Bundle / Gift Set</option>
            <option value="Service / Voucher">Service or Experience Voucher</option>
          </select>
        </div>

        {/* Condition Selector */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Item Condition
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {productConditions.map((cond) => {
              const isSelected = condition === cond;
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCondition(cond)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-[#ff6452] text-[#ff6452] shadow-xs'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-100'
                  }`}
                >
                  {cond}
                </button>
              );
            })}
          </div>
        </div>

        {/* SKU Widget Section */}
        <div className="md:col-span-2 p-4 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-200/80 dark:border-slate-700">
          <SkuGeneratorWidget
            name={name}
            category={category}
            brand={brand}
            sizeOrVariant={sizeOrVariant}
            sku={sku}
            onChange={setSku}
            existingProducts={existingProducts}
            currentProductId={currentProductId}
          />
        </div>

        {/* Short Description */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>Short Description / Elevator Pitch</span>
            <span className="text-[11px] text-gray-400 font-normal">
              Appears in search snippets &amp; product summary cards
            </span>
          </label>
          <textarea
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Brief 1-2 sentence summary highlighting key value proposition..."
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
          />
        </div>

        {/* Full Description */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
            <span>
              Full Product Description <span className="text-[#ff6452]">*</span>
            </span>
            <span className="text-[11px] text-gray-400 font-normal">
              Supports paragraphs, specifications, and bullet lists
            </span>
          </label>
          <textarea
            rows={6}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Comprehensive description of materials, benefits, dimensions, features, and care instructions..."
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452] leading-relaxed"
          />
        </div>

        {/* Tags / Search Badges */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#ff6452]" />
            <span>Product Tags &amp; Keywords</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a search tag and press Enter (e.g. wireless, waterproof, bestseller)..."
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-900 dark:bg-slate-700 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Render Active Tag Chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/50 text-[#ff6452] border border-rose-200 dark:border-rose-900/60 rounded-full text-xs font-bold"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
