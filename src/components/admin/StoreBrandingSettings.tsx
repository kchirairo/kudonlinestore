import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  Save,
  RotateCcw,
  Palette,
  Eye,
  Sliders,
  Type,
  ShieldCheck,
  Store,
  Trash2,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StoreBrandingConfig } from '../../types';
import { DEFAULT_STORE_BRANDING } from '../../constants/config';
import { adminService } from '../../services/adminService';

const COLOR_PRESETS = [
  { name: 'Coral (Default)', hex: '#ff6452' },
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Violet Purple', hex: '#7c3aed' },
  { name: 'Warm Amber', hex: '#d97706' },
  { name: 'Rose Pink', hex: '#e11d48' },
  { name: 'Midnight Slate', hex: '#0f172a' },
];

export const StoreBrandingSettings: React.FC = () => {
  const { storeBranding, updateStoreBranding, showToast } = useShop();

  const [formData, setFormData] = useState<StoreBrandingConfig>(() => ({
    ...DEFAULT_STORE_BRANDING,
    ...storeBranding,
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activePreset, setActivePreset] = useState<string>(formData.accentColor || '#ff6452');

  const handleColorChange = (hex: string) => {
    setActivePreset(hex);
    setFormData((prev) => ({ ...prev, accentColor: hex }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WEBP)', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const uploadedUrl = await adminService.uploadMedia(file, 'branding');
      setFormData((prev) => ({
        ...prev,
        logoImageUrl: uploadedUrl,
        logoType: prev.logoType === 'badge' ? 'image' : prev.logoType,
      }));
      showToast('Logo image uploaded successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to upload logo image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateStoreBranding(formData);
      if (res.success) {
        showToast('Store branding & logo saved successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to save branding', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving branding', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_STORE_BRANDING);
    setActivePreset(DEFAULT_STORE_BRANDING.accentColor || '#ff6452');
    showToast('Reset to default branding values', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Live Interactive Preview Box */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between border-b border-gray-700/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#ff6452]" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Live Storefront & Admin Preview
            </span>
          </div>
          <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
            Real-time Update
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Header Logo Preview */}
          <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Storefront Header Look
              </p>
              <div className="flex items-center gap-2.5">
                {formData.logoImageUrl && (formData.logoType === 'image' || formData.logoType === 'both') ? (
                  <img
                    src={formData.logoImageUrl}
                    alt="Logo Preview"
                    style={{ maxHeight: `${formData.logoHeight || 36}px` }}
                    className="object-contain max-w-[140px] rounded-lg"
                  />
                ) : null}

                {(!formData.logoImageUrl || formData.logoType === 'badge' || formData.logoType === 'both') && (
                  <div
                    style={{ backgroundColor: formData.accentColor || '#ff6452' }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  >
                    {formData.logoText || 'K'}
                  </div>
                )}

                {formData.logoType !== 'image' && (
                  <div className="flex flex-col">
                    <span className="font-black text-xl tracking-tight text-gray-900 leading-none">
                      {(formData.storeName || 'KUD').split(' ')[0]}
                      <span style={{ color: formData.accentColor || '#ff6452' }}>.</span>
                    </span>
                    {formData.showTagline && (
                      <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">
                        {formData.tagline || 'Store'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold">
              Navbar
            </span>
          </div>

          {/* Admin Sidebar Preview */}
          <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Admin Portal Sidebar Look
              </p>
              <div className="flex items-center gap-2.5">
                {formData.logoImageUrl && (formData.logoType === 'image' || formData.logoType === 'both') ? (
                  <img
                    src={formData.logoImageUrl}
                    alt="Admin Logo"
                    style={{ maxHeight: `${Math.min(formData.logoHeight || 36, 38)}px` }}
                    className="object-contain max-w-[120px] rounded-lg"
                  />
                ) : null}

                {(!formData.logoImageUrl || formData.logoType === 'badge' || formData.logoType === 'both') && (
                  <div
                    style={{ backgroundColor: formData.accentColor || '#ff6452' }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
                  >
                    {formData.logoText || 'K'}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-black text-gray-900 leading-none">
                    {formData.storeName || 'KUD online store'}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#ff6452] mt-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Portal</span>
                  </div>
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold">
              Sidebar
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
        {/* Store Title & Tagline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Store className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Store Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Store Name</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="e.g. KUD online store"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Brand Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. The shopping partner you can trust."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="showTaglineCheck"
              checked={formData.showTagline}
              onChange={(e) => setFormData({ ...formData, showTagline: e.target.checked })}
              className="w-4 h-4 rounded text-[#ff6452] focus:ring-[#ff6452] accent-[#ff6452]"
            />
            <label htmlFor="showTaglineCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
              Show tagline below store name in desktop header
            </label>
          </div>
        </div>

        {/* Logo Configuration */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <ImageIcon className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Store Logo Customization</h3>
          </div>

          {/* Logo Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800">Logo Display Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, logoType: 'badge' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.logoType === 'badge'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <div className="w-7 h-7 mx-auto rounded-lg bg-[#ff6452] text-white text-xs font-bold flex items-center justify-center mb-1">
                  {formData.logoText || 'K'}
                </div>
                <span className="text-xs">Badge Initial</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, logoType: 'image' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.logoType === 'image'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <div className="w-7 h-7 mx-auto rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mb-1">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs">Custom Image</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, logoType: 'both' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  formData.logoType === 'both'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <div className="w-7 h-7 mx-auto rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mb-1">
                  <Sliders className="w-4 h-4" />
                </div>
                <span className="text-xs">Image + Badge</span>
              </button>
            </div>
          </div>

          {/* Badge Initial Letter Input */}
          {(formData.logoType === 'badge' || formData.logoType === 'both') && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Badge Logo Character / Letters</label>
              <input
                type="text"
                maxLength={4}
                value={formData.logoText}
                onChange={(e) => setFormData({ ...formData, logoText: e.target.value.toUpperCase() })}
                placeholder="K"
                className="w-full sm:w-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black focus:bg-white focus:outline-none focus:border-[#ff6452] tracking-wider"
              />
              <p className="text-[11px] text-gray-400">1 to 3 characters shown inside the badge (e.g. "K" or "KUD")</p>
            </div>
          )}

          {/* Custom Image Upload & URL */}
          {(formData.logoType === 'image' || formData.logoType === 'both' || formData.logoImageUrl) && (
            <div className="space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-200">
              <label className="text-xs font-bold text-gray-800 block">Logo Image Asset</label>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Image Preview Box */}
                {formData.logoImageUrl ? (
                  <div className="relative group bg-white border border-gray-200 rounded-2xl p-2 w-36 h-24 flex items-center justify-center flex-shrink-0 shadow-xs">
                    <img
                      src={formData.logoImageUrl}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoImageUrl: '' })}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-sm"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 w-36 h-24 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">No Image</span>
                  </div>
                )}

                {/* Upload & Direct URL Options */}
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="logo-file-upload"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploading ? 'Uploading...' : 'Upload Image File'}</span>
                    </label>
                    <input
                      id="logo-file-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <span className="text-[11px] text-gray-400">PNG, SVG, JPG, WebP</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">Or Paste Image URL directly:</label>
                    <input
                      type="url"
                      value={formData.logoImageUrl || ''}
                      onChange={(e) => setFormData({ ...formData, logoImageUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ff6452]"
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                      <span>Logo Display Height:</span>
                      <span>{formData.logoHeight || 36}px</span>
                    </div>
                    <input
                      type="range"
                      min={24}
                      max={60}
                      value={formData.logoHeight || 36}
                      onChange={(e) => setFormData({ ...formData, logoHeight: Number(e.target.value) })}
                      className="w-full accent-[#ff6452]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Brand Accent Color */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Palette className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Brand Accent Color</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => handleColorChange(color.hex)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset.toLowerCase() === color.hex.toLowerCase()
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span>{color.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs font-bold text-gray-700">Custom HEX Color:</label>
            <input
              type="color"
              value={formData.accentColor || '#ff6452'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={formData.accentColor || '#ff6452'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:border-[#ff6452]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-900 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Store Branding'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
