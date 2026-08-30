import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  X,
  Settings2,
  Image as ImageIcon,
  DollarSign,
  Package,
} from 'lucide-react';
import { ProductVariantItem } from '../../../types';
import { STORE_CONFIG } from '../../../constants/config';

interface ProductVariantsManagerProps {
  variants: ProductVariantItem[];
  setVariants: React.Dispatch<React.SetStateAction<ProductVariantItem[]>>;
  basePrice: number;
  baseSku: string;
  baseStock: number;
}

interface VariantOptionGroup {
  name: string;
  values: string[];
}

export const ProductVariantsManager: React.FC<ProductVariantsManagerProps> = ({
  variants,
  setVariants,
  basePrice,
  baseSku,
  baseStock,
}) => {
  const [hasVariants, setHasVariants] = useState<boolean>(variants.length > 0);

  // Variant generator options
  const [optionGroups, setOptionGroups] = useState<VariantOptionGroup[]>([
    { name: 'Size', values: ['Small', 'Medium', 'Large'] },
  ]);
  const [newOptionGroupName, setNewOptionGroupName] = useState<string>('');
  const [newValueInput, setNewValueInput] = useState<Record<number, string>>({});

  // Add a new option group (e.g. Color, Storage)
  const handleAddOptionGroup = () => {
    const trimmed = newOptionGroupName.trim();
    if (!trimmed) return;
    setOptionGroups([...optionGroups, { name: trimmed, values: [] }]);
    setNewOptionGroupName('');
  };

  // Remove option group
  const handleRemoveOptionGroup = (groupIndex: number) => {
    setOptionGroups(optionGroups.filter((_, idx) => idx !== groupIndex));
  };

  // Add value to option group (e.g. "XL" to "Size")
  const handleAddValueToGroup = (groupIndex: number) => {
    const val = (newValueInput[groupIndex] || '').trim();
    if (!val) return;

    setOptionGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        if (g.values.includes(val)) return g;
        return { ...g, values: [...g.values, val] };
      })
    );

    setNewValueInput((prev) => ({ ...prev, [groupIndex]: '' }));
  };

  // Remove value from group
  const handleRemoveValueFromGroup = (groupIndex: number, valToRemove: string) => {
    setOptionGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== groupIndex) return g;
        return { ...g, values: g.values.filter((v) => v !== valToRemove) };
      })
    );
  };

  // Generate Cartesian product matrix of variants
  const handleGenerateMatrix = () => {
    const activeGroups = optionGroups.filter((g) => g.values.length > 0);
    if (activeGroups.length === 0) {
      alert('Please add at least one option name with values (e.g. Size: S, M, L) to generate variants.');
      return;
    }

    const combinations: Record<string, string>[] = [];

    const generateHelper = (current: Record<string, string>, groupIndex: number) => {
      if (groupIndex === activeGroups.length) {
        combinations.push({ ...current });
        return;
      }

      const group = activeGroups[groupIndex];
      for (const val of group.values) {
        current[group.name] = val;
        generateHelper(current, groupIndex + 1);
      }
    };

    generateHelper({}, 0);

    const generatedVariants: ProductVariantItem[] = combinations.map((attrs, idx) => {
      const title = Object.entries(attrs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' / ');

      const skuSuffix = Object.values(attrs)
        .map((v) => v.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''))
        .join('-');

      const variantSku = baseSku ? `${baseSku}-${skuSuffix}` : `VAR-${idx + 1}-${skuSuffix}`;

      return {
        id: `var-${Date.now()}-${idx}`,
        title,
        sku: variantSku,
        price: basePrice || 0,
        stock: Math.max(5, Math.floor(baseStock / (combinations.length || 1))),
        attributes: attrs,
        isActive: true,
      };
    });

    setVariants(generatedVariants);
    setHasVariants(true);
  };

  // Add individual manual custom variant
  const handleAddManualVariant = () => {
    const newVar: ProductVariantItem = {
      id: `var-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `Custom Option ${variants.length + 1}`,
      sku: baseSku ? `${baseSku}-OPT${variants.length + 1}` : `SKU-VAR-${variants.length + 1}`,
      price: basePrice || 0,
      stock: 10,
      attributes: { Option: `Option ${variants.length + 1}` },
      isActive: true,
    };
    setVariants([...variants, newVar]);
    setHasVariants(true);
  };

  // Sync base SKU across all existing variants
  const handleSyncBaseSkuToVariants = () => {
    if (!baseSku) return;
    setVariants((prev) =>
      prev.map((v, idx) => {
        let suffix = '';
        if (v.attributes && Object.values(v.attributes).length > 0) {
          suffix = Object.values(v.attributes)
            .map((val) => String(val).substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''))
            .join('-');
        } else {
          suffix = `V${idx + 1}`;
        }
        return {
          ...v,
          sku: `${baseSku}-${suffix}`,
        };
      })
    );
  };

  // Update variant field
  const handleUpdateVariantField = (index: number, field: keyof ProductVariantItem, val: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  // Remove single variant row
  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header with Switch */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-100 dark:border-indigo-900/60">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              Product Variants &amp; Options
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Multiple sizes, colours, storage capacities, or material variations with distinct prices &amp; inventory.
            </p>
          </div>
        </div>

        {/* Enable / Disable Variants toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              const enabled = e.target.checked;
              setHasVariants(enabled);
              if (!enabled) {
                setVariants([]);
              }
            }}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300">
            This product has multiple variants
          </span>
        </label>
      </div>

      {hasVariants && (
        <div className="space-y-6">
          {/* 1. Option Sets Generator Box */}
          <div className="p-5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>Define Options &amp; Attributes</span>
              </span>
              <span className="text-[11px] text-gray-400">
                e.g. Size, Colour, Storage, Model
              </span>
            </div>

            {/* Render Option Groups */}
            <div className="space-y-3">
              {optionGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                      <span>Option {gIdx + 1}: {group.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOptionGroup(gIdx)}
                      className="text-gray-400 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Option</span>
                    </button>
                  </div>

                  {/* Value Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {group.values.map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold"
                      >
                        <span>{val}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveValueFromGroup(gIdx, val)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Value Input for this Group */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder={`Add value for ${group.name} (e.g. Red, XL, 256GB)...`}
                      value={newValueInput[gIdx] || ''}
                      onChange={(e) =>
                        setNewValueInput({ ...newValueInput, [gIdx]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddValueToGroup(gIdx);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddValueToGroup(gIdx)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Option Group Row & Generate Matrix Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New option name (e.g. Colour, Material)..."
                  value={newOptionGroupName}
                  onChange={(e) => setNewOptionGroupName(e.target.value)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={handleAddOptionGroup}
                  disabled={!newOptionGroupName.trim()}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-800 dark:text-slate-200 text-xs font-bold rounded-xl disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateMatrix}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Variant Matrix ({optionGroups.reduce((acc, g) => acc * (g.values.length || 1), 1)} Combos)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Variant Matrix Table */}
          {variants.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Active Variants Matrix ({variants.length} variations)
                </span>
                <div className="flex items-center gap-3">
                  {baseSku && (
                    <button
                      type="button"
                      onClick={handleSyncBaseSkuToVariants}
                      className="text-xs font-bold text-gray-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                      title="Update all variant SKUs with base SKU prefix"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Sync Base SKU Prefix</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddManualVariant}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Row</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-extrabold border-b border-gray-200 dark:border-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Variant Name</th>
                      <th className="py-3 px-3">SKU</th>
                      <th className="py-3 px-3">Price ({STORE_CONFIG.STORE_CURRENCY})</th>
                      <th className="py-3 px-3">Stock</th>
                      <th className="py-3 px-3">Image URL</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {variants.map((variant, idx) => (
                      <tr
                        key={variant.id || idx}
                        className={variant.isActive !== false ? '' : 'opacity-50 bg-gray-50/50 dark:bg-slate-800/30'}
                      >
                        {/* Status Checkbox */}
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={variant.isActive !== false}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'isActive', e.target.checked)
                            }
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Title */}
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <input
                            type="text"
                            value={variant.title}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'title', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded font-semibold text-gray-900 dark:text-white"
                          />
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-3 min-w-[120px]">
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'sku', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded font-mono text-[11px] text-gray-700 dark:text-slate-300"
                          />
                        </td>

                        {/* Price */}
                        <td className="py-2.5 px-3 min-w-[90px]">
                          <input
                            type="number"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'price', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-gray-900 dark:text-white"
                          />
                        </td>

                        {/* Stock */}
                        <td className="py-2.5 px-3 min-w-[80px]">
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'stock', parseInt(e.target.value, 10) || 0)
                            }
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded font-bold text-gray-900 dark:text-white"
                          />
                        </td>

                        {/* Image URL */}
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <input
                            type="text"
                            placeholder="Optional Image URL"
                            value={variant.imageUrl || ''}
                            onChange={(e) =>
                              handleUpdateVariantField(idx, 'imageUrl', e.target.value)
                            }
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800 rounded text-[11px] text-gray-600 dark:text-slate-400"
                          />
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete this variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-1">
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                No variants generated yet
              </p>
              <p className="text-[11px] text-gray-400">
                Click "Generate Variant Matrix" above or add a custom row to start configuring variants.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
