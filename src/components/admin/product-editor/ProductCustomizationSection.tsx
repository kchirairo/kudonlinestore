import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Layers,
  HelpCircle,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  ProductCustomizationConfig,
  CustomizationType,
  ProductCustomizationSizeOption,
  BulkPricingTier,
} from '../../../types';
import { STANDARD_SIZE_PRESETS } from '../../../utils/customizationPricing';

interface ProductCustomizationSectionProps {
  config?: ProductCustomizationConfig;
  onChange: (config: ProductCustomizationConfig) => void;
}

const CUSTOMIZATION_TYPE_OPTIONS: { id: CustomizationType; label: string; desc: string }[] = [
  { id: 'canvas', label: 'Canvas Printing', desc: 'Custom stretched canvas prints with standard or custom cm dimensions' },
  { id: 't_shirt', label: 'T-Shirt Printing', desc: 'Apparel with sizing (XS-4XL), print position, and custom graphics' },
  { id: 'cap', label: 'Cap Printing', desc: 'Headwear with custom embroidered or printed artwork & slogans' },
  { id: 'cup', label: 'Cup / Mug Printing', desc: 'Drinkware with custom photo prints, names, or corporate logos' },
  { id: 'necklace', label: 'Necklace / Name Customization', desc: 'Jewelry with personalized engraved names & finish options' },
  { id: 'engraving', label: 'Engraving', desc: 'Personalized laser or mechanical engraving with font style options' },
  { id: 'poster', label: 'Poster Printing', desc: 'High-resolution art & poster printing with standard A-sizes or custom cm' },
  { id: 'vinyl', label: 'Vinyl Poster / Banner Printing', desc: 'Durable vinyl banners & outdoor posters in standard or custom dimensions' },
  { id: 'other', label: 'Other Customizable Product', desc: 'Flexible custom order with detailed client request notes & specifications' },
];

export const ProductCustomizationSection: React.FC<ProductCustomizationSectionProps> = ({
  config,
  onChange,
}) => {
  const isCustomizable = Boolean(config?.isCustomizable);

  const currentConfig: ProductCustomizationConfig = {
    isCustomizable: config?.isCustomizable || false,
    customizationType: config?.customizationType || 'canvas',
    allowDesignUpload: config?.allowDesignUpload !== false,
    allowCustomText: config?.allowCustomText !== false,
    allowCustomDimensions: Boolean(config?.allowCustomDimensions),
    allowSizeSelection: config?.allowSizeSelection !== false,
    allowCustomInstructions: config?.allowCustomInstructions !== false,
    customizationCharge: Number(config?.customizationCharge) || 0,
    sizeOptions: config?.sizeOptions || [],
    minOrderQuantity: Math.max(1, Number(config?.minOrderQuantity) || 1),
    maxOrderQuantity: Math.max(1, Number(config?.maxOrderQuantity) || 1000),
    quantityStep: Math.max(1, Number(config?.quantityStep) || 1),
    disableStockLimits: Boolean(config?.disableStockLimits),
    bulkPricingTiers: config?.bulkPricingTiers || [],
    customDimensionsPrompt: config?.customDimensionsPrompt || '',
    textPromptLabel: config?.textPromptLabel || '',
    instructionsPromptLabel: config?.instructionsPromptLabel || '',
  };

  const updateConfig = (partial: Partial<ProductCustomizationConfig>) => {
    onChange({
      ...currentConfig,
      ...partial,
    });
  };

  // Size option handlers
  const handleAddSizeOption = () => {
    const newOption: ProductCustomizationSizeOption = {
      id: `size_${Date.now()}`,
      name: 'New Size',
      dimensionsCm: '30 × 40 cm',
      priceModifier: 0,
      isDefault: currentConfig.sizeOptions.length === 0,
    };
    updateConfig({ sizeOptions: [...currentConfig.sizeOptions, newOption] });
  };

  const handleApplyStandardPresets = () => {
    updateConfig({ sizeOptions: [...STANDARD_SIZE_PRESETS] });
  };

  const handleUpdateSizeOption = (
    index: number,
    partial: Partial<ProductCustomizationSizeOption>
  ) => {
    const updated = [...currentConfig.sizeOptions];
    updated[index] = { ...updated[index], ...partial };
    updateConfig({ sizeOptions: updated });
  };

  const handleSetDefaultSize = (index: number) => {
    const updated = currentConfig.sizeOptions.map((opt, i) => ({
      ...opt,
      isDefault: i === index,
    }));
    updateConfig({ sizeOptions: updated });
  };

  const handleRemoveSizeOption = (index: number) => {
    const updated = currentConfig.sizeOptions.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((o) => o.isDefault)) {
      updated[0].isDefault = true;
    }
    updateConfig({ sizeOptions: updated });
  };

  // Bulk pricing tier handlers
  const handleAddBulkTier = () => {
    const newTier: BulkPricingTier = {
      minQuantity: 5,
      maxQuantity: 9,
      pricePerUnit: 120,
      label: '5 - 9 units',
    };
    updateConfig({
      bulkPricingTiers: [...(currentConfig.bulkPricingTiers || []), newTier],
    });
  };

  const handleUpdateBulkTier = (index: number, partial: Partial<BulkPricingTier>) => {
    const tiers = [...(currentConfig.bulkPricingTiers || [])];
    tiers[index] = { ...tiers[index], ...partial };
    updateConfig({ bulkPricingTiers: tiers });
  };

  const handleRemoveBulkTier = (index: number) => {
    const tiers = (currentConfig.bulkPricingTiers || []).filter((_, i) => i !== index);
    updateConfig({ bulkPricingTiers: tiers });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-gray-900">
              Customization, Printing & Personalization Rules
            </h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Configure made-to-order printing, engraving, dimensions, quantity limits, and bulk tiered pricing.
          </p>
        </div>

        {/* Master Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isCustomizable}
            onChange={(e) => updateConfig({ isCustomizable: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          <span className="ml-3 text-xs font-bold text-gray-900">
            {isCustomizable ? 'Customization ENABLED' : 'Customization DISABLED'}
          </span>
        </label>
      </div>

      {isCustomizable && (
        <div className="mt-6 space-y-6">
          {/* ========================================================================= */}
          {/* PRODUCT TYPE SELECTOR                                                     */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Custom Product Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {CUSTOMIZATION_TYPE_OPTIONS.map((typeOpt) => {
                const isSelected = currentConfig.customizationType === typeOpt.id;
                return (
                  <button
                    key={typeOpt.id}
                    type="button"
                    onClick={() => updateConfig({ customizationType: typeOpt.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span className="text-xs font-bold block">{typeOpt.label}</span>
                    <span
                      className={`text-[11px] block mt-1 line-clamp-2 ${
                        isSelected ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {typeOpt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FEATURE TOGGLES                                                           */}
          {/* ========================================================================= */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Allowed Customization Options for Customers
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.allowDesignUpload}
                  onChange={(e) => updateConfig({ allowDesignUpload: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Design / Image Upload</span>
                  <span className="text-[10px] text-gray-500 block">JPG, PNG, WEBP up to 10MB</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.allowCustomText}
                  onChange={(e) => updateConfig({ allowCustomText: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Custom Text / Engraved Name</span>
                  <span className="text-[10px] text-gray-500 block">Customer inputs custom text</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.allowSizeSelection}
                  onChange={(e) => updateConfig({ allowSizeSelection: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Print Sizes / Dimensions</span>
                  <span className="text-[10px] text-gray-500 block">A5, A4, A3, A2, A1 presets</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.allowCustomDimensions}
                  onChange={(e) => updateConfig({ allowCustomDimensions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Custom cm Dimensions</span>
                  <span className="text-[10px] text-gray-500 block">Allow custom width × height cm</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={currentConfig.allowCustomInstructions}
                  onChange={(e) => updateConfig({ allowCustomInstructions: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">Special Instructions</span>
                  <span className="text-[10px] text-gray-500 block">Client notes or finishing</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-amber-200 bg-amber-50/40 cursor-pointer hover:bg-amber-50">
                <input
                  type="checkbox"
                  checked={currentConfig.disableStockLimits}
                  onChange={(e) => updateConfig({ disableStockLimits: e.target.checked })}
                  className="h-4 w-4 rounded border-amber-400 text-black focus:ring-black"
                />
                <div>
                  <span className="text-xs font-semibold text-amber-900 block">Made-to-Order (No Stock Limits)</span>
                  <span className="text-[10px] text-amber-700 block">Unlimited inventory for custom orders</span>
                </div>
              </label>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CUSTOMIZATION PRICING & QUANTITY RULES                                    */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Customization Fee (+R)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentConfig.customizationCharge}
                onChange={(e) => updateConfig({ customizationCharge: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                placeholder="0.00"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                Additional charge for printing or engraving
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Min Order Quantity
              </label>
              <input
                type="number"
                min="1"
                value={currentConfig.minOrderQuantity}
                onChange={(e) => updateConfig({ minOrderQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                Minimum units required
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Max Order Quantity
              </label>
              <input
                type="number"
                min="1"
                value={currentConfig.maxOrderQuantity}
                onChange={(e) => updateConfig({ maxOrderQuantity: Math.max(1, parseInt(e.target.value) || 1000) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                Maximum units per checkout
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Quantity Step / Increment
              </label>
              <input
                type="number"
                min="1"
                value={currentConfig.quantityStep}
                onChange={(e) => updateConfig({ quantityStep: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                e.g. 1 for singles, 10 for packs
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRINT SIZES & DIMENSIONS MANAGER (in cm)                                  */}
          {/* ========================================================================= */}
          {currentConfig.allowSizeSelection && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Print Sizes & Dimensions in Centimetres (cm)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Define recommended size dimensions in cm and optional price modifiers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyStandardPresets}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Load A5 — A1 Presets
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSizeOption}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Size
                  </button>
                </div>
              </div>

              {currentConfig.sizeOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
                  <p className="text-xs text-gray-500">
                    No size options defined. Click "Load A5 — A1 Presets" or "Add Size" to create dimensions.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentConfig.sizeOptions.map((opt, idx) => (
                    <div
                      key={opt.id || idx}
                      className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="w-24">
                        <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Size Name
                        </label>
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => handleUpdateSizeOption(idx, { name: e.target.value })}
                          placeholder="e.g. A3"
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-900"
                        />
                      </div>

                      <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Dimensions (in cm)
                        </label>
                        <input
                          type="text"
                          value={opt.dimensionsCm || ''}
                          onChange={(e) => handleUpdateSizeOption(idx, { dimensionsCm: e.target.value })}
                          placeholder="e.g. 29.7 × 42 cm"
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                          Price Mod (+R)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={opt.priceModifier}
                          onChange={(e) =>
                            handleUpdateSizeOption(idx, {
                              priceModifier: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultSize(idx)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            opt.isDefault
                              ? 'bg-black text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {opt.isDefault ? 'Default' : 'Set Default'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSizeOption(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                          title="Remove size"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* BULK / TIERED PRICING RULES                                               */}
          {/* ========================================================================= */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                    Bulk & Tiered Pricing Rules
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500">
                  Provide automatic discounts for volume purchases (e.g. 5-9 units: R135/unit, 10+: R120/unit).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBulkTier}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Bulk Tier
              </button>
            </div>

            {(!currentConfig.bulkPricingTiers || currentConfig.bulkPricingTiers.length === 0) ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                <p className="text-xs text-gray-400">
                  No volume pricing tiers active. Standard unit price will be applied to all quantities.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentConfig.bulkPricingTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="w-24">
                      <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                        Min Qty
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={tier.minQuantity}
                        onChange={(e) =>
                          handleUpdateBulkTier(idx, {
                            minQuantity: Math.max(2, parseInt(e.target.value) || 2),
                          })
                        }
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-900"
                      />
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                        Max Qty (Opt)
                      </label>
                      <input
                        type="number"
                        min={tier.minQuantity}
                        value={tier.maxQuantity || ''}
                        onChange={(e) =>
                          handleUpdateBulkTier(idx, {
                            maxQuantity: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="Any"
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                      />
                    </div>

                    <div className="w-28">
                      <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                        Price / Unit (R)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.pricePerUnit}
                        onChange={(e) =>
                          handleUpdateBulkTier(idx, {
                            pricePerUnit: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-emerald-700"
                      />
                    </div>

                    <div className="flex-1 min-w-[120px]">
                      <label className="text-[10px] text-gray-500 uppercase font-semibold block">
                        Display Label
                      </label>
                      <input
                        type="text"
                        value={tier.label || ''}
                        onChange={(e) => handleUpdateBulkTier(idx, { label: e.target.value })}
                        placeholder="e.g. 5 - 9 units"
                        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBulkTier(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors mt-3"
                      title="Remove tier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
