import React from 'react';
import {
  Sparkles,
  Heart,
  Home,
  Activity,
  Cpu,
  BookOpen,
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ProductCategory } from '../../../types';

interface ProductCategoryFieldsProps {
  category: ProductCategory;
  attributes: Record<string, any>;
  setAttributes: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const ProductCategoryFields: React.FC<ProductCategoryFieldsProps> = ({
  category,
  attributes,
  setAttributes,
}) => {
  const handleAttrChange = (key: string, value: any) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCustomAttrAdd = () => {
    const customKey = `CustomField_${Date.now()}`;
    setAttributes((prev) => ({
      ...prev,
      [customKey]: '',
    }));
  };

  const handleCustomAttrRemove = (key: string) => {
    setAttributes((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-100 dark:border-amber-900/60">
            {category === 'Beauty' && <Heart className="w-5 h-5" />}
            {category === 'Home' && <Home className="w-5 h-5" />}
            {category === 'Sports & Leisure' && <Activity className="w-5 h-5" />}
            {category === 'Technology' && <Cpu className="w-5 h-5" />}
            {category === 'Books' && <BookOpen className="w-5 h-5" />}
            {category === 'Others' && <HelpCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                Category Specifications: {category}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                Tailored
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Specialized technical and commercial attributes for {category}.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* BEAUTY SPECIFICATIONS */}
      {/* ======================================================= */}
      {category === 'Beauty' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Beauty Department
            </label>
            <select
              value={attributes.beautyType || 'Skincare'}
              onChange={(e) => handleAttrChange('beautyType', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="Skincare">Skincare</option>
              <option value="Haircare">Haircare</option>
              <option value="Fragrance / Perfume">Fragrance / Perfume</option>
              <option value="Makeup / Cosmetics">Makeup / Cosmetics</option>
              <option value="Bath & Body">Bath &amp; Body</option>
              <option value="Men's Grooming">Men's Grooming</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Volume / Net Weight
            </label>
            <input
              type="text"
              placeholder="e.g. 50ml / 1.7 fl. oz."
              value={attributes.volume || ''}
              onChange={(e) => handleAttrChange('volume', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Suitable Skin Type
            </label>
            <select
              value={attributes.skinType || 'All Skin Types'}
              onChange={(e) => handleAttrChange('skinType', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="All Skin Types">All Skin Types</option>
              <option value="Dry Skin">Dry Skin</option>
              <option value="Oily / Acne-Prone">Oily / Acne-Prone</option>
              <option value="Sensitive Skin">Sensitive Skin</option>
              <option value="Combination">Combination</option>
              <option value="Mature / Aging">Mature / Aging</option>
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Key Active Ingredients
            </label>
            <input
              type="text"
              placeholder="e.g. Hyaluronic Acid, Niacinamide 10%, Vitamin C, Retinol, Salicylic Acid"
              value={attributes.ingredients || ''}
              onChange={(e) => handleAttrChange('ingredients', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Application &amp; Usage Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Apply 2-3 drops to cleansed skin morning and evening before moisturizer..."
              value={attributes.usageInstructions || ''}
              onChange={(e) => handleAttrChange('usageInstructions', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* HOME SPECIFICATIONS */}
      {/* ======================================================= */}
      {category === 'Home' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Primary Material / Build
            </label>
            <input
              type="text"
              placeholder="e.g. Solid Oak Wood, Stainless Steel, Ceramic"
              value={attributes.material || ''}
              onChange={(e) => handleAttrChange('material', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Primary Colour / Finish
            </label>
            <input
              type="text"
              placeholder="e.g. Matte Black, Brushed Brass, Walnut"
              value={attributes.colour || ''}
              onChange={(e) => handleAttrChange('colour', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Recommended Room / Location
            </label>
            <select
              value={attributes.room || 'Living Room'}
              onChange={(e) => handleAttrChange('room', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="Living Room">Living Room</option>
              <option value="Bedroom">Bedroom</option>
              <option value="Kitchen & Dining">Kitchen &amp; Dining</option>
              <option value="Bathroom">Bathroom</option>
              <option value="Home Office">Home Office</option>
              <option value="Outdoor / Patio">Outdoor / Patio</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Dimensions (L x W x H cm)
            </label>
            <input
              type="text"
              placeholder="e.g. 120 x 60 x 75 cm"
              value={attributes.homeDimensions || ''}
              onChange={(e) => handleAttrChange('homeDimensions', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Assembly Required
            </label>
            <select
              value={attributes.assemblyRequired || 'No (Fully Assembled)'}
              onChange={(e) => handleAttrChange('assemblyRequired', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="No (Fully Assembled)">No (Fully Assembled)</option>
              <option value="Yes (Tools Included)">Yes (Tools Included)</option>
              <option value="Yes (Basic Tools Required)">Yes (Basic Tools Required)</option>
            </select>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* SPORTS & LEISURE SPECIFICATIONS */}
      {/* ======================================================= */}
      {category === 'Sports & Leisure' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Sport / Activity Discipline
            </label>
            <input
              type="text"
              placeholder="e.g. Fitness & Gym, Running, Yoga, Cycling, Hiking"
              value={attributes.sportType || ''}
              onChange={(e) => handleAttrChange('sportType', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Equipment / Apparel Material
            </label>
            <input
              type="text"
              placeholder="e.g. Breathable Dri-Fit, High-Grade Carbon, Latex"
              value={attributes.sportsMaterial || ''}
              onChange={(e) => handleAttrChange('sportsMaterial', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Target Skill Level
            </label>
            <select
              value={attributes.skillLevel || 'All Levels'}
              onChange={(e) => handleAttrChange('skillLevel', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="All Levels">All Levels (Universal)</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced / Pro">Advanced / Pro</option>
            </select>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* TECHNOLOGY SPECIFICATIONS */}
      {/* ======================================================= */}
      {category === 'Technology' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Model Number
            </label>
            <input
              type="text"
              placeholder="e.g. WH-1000XM5, A2848"
              value={attributes.modelNumber || ''}
              onChange={(e) => handleAttrChange('modelNumber', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Storage Capacity
            </label>
            <input
              type="text"
              placeholder="e.g. 128GB, 256GB, 1TB"
              value={attributes.storage || ''}
              onChange={(e) => handleAttrChange('storage', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              RAM Memory
            </label>
            <input
              type="text"
              placeholder="e.g. 8GB, 16GB Unified"
              value={attributes.ram || ''}
              onChange={(e) => handleAttrChange('ram', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Processor / Chipset
            </label>
            <input
              type="text"
              placeholder="e.g. Apple M3, Intel Core i7"
              value={attributes.processor || ''}
              onChange={(e) => handleAttrChange('processor', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Display / Screen Size
            </label>
            <input
              type="text"
              placeholder="e.g. 6.7-inch Super Retina XDR"
              value={attributes.screenSize || ''}
              onChange={(e) => handleAttrChange('screenSize', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Battery / Autonomy
            </label>
            <input
              type="text"
              placeholder="e.g. Up to 30 hours, 5000mAh"
              value={attributes.battery || ''}
              onChange={(e) => handleAttrChange('battery', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Connectivity
            </label>
            <input
              type="text"
              placeholder="e.g. Wi-Fi 6E, Bluetooth 5.3, 5G"
              value={attributes.connectivity || ''}
              onChange={(e) => handleAttrChange('connectivity', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Warranty Coverage
            </label>
            <input
              type="text"
              placeholder="e.g. 1 Year Official Manufacturer Warranty"
              value={attributes.warranty || ''}
              onChange={(e) => handleAttrChange('warranty', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* BOOKS SPECIFICATIONS */}
      {/* ======================================================= */}
      {category === 'Books' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Author(s)
            </label>
            <input
              type="text"
              placeholder="e.g. James Clear"
              value={attributes.author || ''}
              onChange={(e) => handleAttrChange('author', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              ISBN-13 / ISBN-10
            </label>
            <input
              type="text"
              placeholder="e.g. 978-0735211292"
              value={attributes.isbn || ''}
              onChange={(e) => handleAttrChange('isbn', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-mono text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Publisher
            </label>
            <input
              type="text"
              placeholder="e.g. Penguin Books, Random House"
              value={attributes.publisher || ''}
              onChange={(e) => handleAttrChange('publisher', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Format
            </label>
            <select
              value={attributes.bookFormat || 'Paperback'}
              onChange={(e) => handleAttrChange('bookFormat', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            >
              <option value="Paperback">Paperback</option>
              <option value="Hardcover">Hardcover</option>
              <option value="E-Book / PDF">E-Book / PDF</option>
              <option value="Audiobook">Audiobook</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Language
            </label>
            <input
              type="text"
              placeholder="e.g. English, Afrikaans"
              value={attributes.language || 'English'}
              onChange={(e) => handleAttrChange('language', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Page Count
            </label>
            <input
              type="number"
              placeholder="e.g. 320"
              value={attributes.pageCount || ''}
              onChange={(e) => handleAttrChange('pageCount', e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* OTHERS & CUSTOM ATTRIBUTES */}
      {/* ======================================================= */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
            Custom Specification Key-Value Pairs
          </span>
          <button
            type="button"
            onClick={handleCustomAttrAdd}
            className="text-xs font-bold text-[#ff6452] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Attribute</span>
          </button>
        </div>

        {/* Render custom attributes */}
        {Object.entries(attributes).filter(([k]) => k.startsWith('CustomField_')).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Attribute Name (e.g. Scent, Voltage)..."
              defaultValue={k.replace('CustomField_', 'Field ')}
              className="w-1/3 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Attribute Value (e.g. Lavender, 220V)..."
              value={v}
              onChange={(e) => handleAttrChange(k, e.target.value)}
              className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => handleCustomAttrRemove(k)}
              className="p-2 text-gray-400 hover:text-rose-600 rounded-xl cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
