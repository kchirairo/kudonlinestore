import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Palette,
  Eye,
  Store,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowUpRight,
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
  const { storeBranding, updateStoreBranding, reloadStoreCustomization, showToast } = useShop();

  const [formData, setFormData] = useState<StoreBrandingConfig>(() => ({
    ...DEFAULT_STORE_BRANDING,
    ...storeBranding,
  }));

  // Direct state for authoritative logo_url from database
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(storeBranding?.logoImageUrl || null);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string>(formData.accentColor || '#ff6452');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when storeBranding context updates
  useEffect(() => {
    if (storeBranding) {
      setFormData((prev) => ({
        ...prev,
        ...storeBranding,
      }));
      setCurrentLogoUrl(storeBranding.logoImageUrl || null);
      setLogoLoadError(false);
    }
  }, [storeBranding]);

  // Fetch authoritative logo directly on mount
  useEffect(() => {
    let mounted = true;
    async function loadLatestLogo() {
      setIsLogoLoading(true);
      try {
        const authoritativeLogo = await adminService.getStoreLogoUrl();
        if (mounted) {
          setCurrentLogoUrl(authoritativeLogo);
          setLogoLoadError(false);
        }
      } catch (err) {
        console.warn('[StoreBranding] Error fetching authoritative logo:', err);
      } finally {
        if (mounted) setIsLogoLoading(false);
      }
    }
    loadLatestLogo();
    return () => {
      mounted = false;
    };
  }, []);

  const handleColorChange = (hex: string) => {
    setActivePreset(hex);
    setFormData((prev) => ({ ...prev, accentColor: hex }));
  };

  /**
   * Performs client-side validation and uploads the selected logo to store-branding/logo.webp
   */
  const processSelectedFile = async (file: File) => {
    setValidationError(null);

    // 1. Validate file format and 5MB size limit
    const validation = adminService.validateStoreLogoFile(file);
    if (!validation.valid) {
      const errMsg = validation.error || 'Invalid logo file.';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingLogo(true);
      const res = await adminService.uploadStoreLogo(file);

      if (res.success && res.url) {
        setCurrentLogoUrl(res.url);
        setLogoLoadError(false);
        setFormData((prev) => ({
          ...prev,
          logoImageUrl: res.url,
        }));
        // Reload global customization so all components update immediately
        await reloadStoreCustomization();
        showToast('Store logo updated and saved to Supabase settings!', 'success');
      } else {
        const errMsg = res.error || 'Failed to upload logo image.';
        setValidationError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Error uploading logo image.';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  /**
   * Removes the custom logo by clearing public.settings.logo_url
   */
  const handleRemoveLogo = async () => {
    try {
      setIsRemovingLogo(true);
      const res = await adminService.removeStoreLogo();
      if (res.success) {
        setCurrentLogoUrl(null);
        setLogoLoadError(false);
        setFormData((prev) => ({
          ...prev,
          logoImageUrl: undefined,
        }));
        await reloadStoreCustomization();
        setShowRemoveConfirm(false);
        showToast('Store logo removed. Default K badge restored.', 'success');
      } else {
        showToast(res.error || 'Failed to remove logo.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error removing logo.', 'error');
    } finally {
      setIsRemovingLogo(false);
    }
  };

  /**
   * Resets the store logo to the default orange K badge
   */
  const handleResetToDefaultK = async () => {
    try {
      setIsRemovingLogo(true);
      const res = await adminService.resetStoreLogoToDefault();
      if (res.success) {
        setCurrentLogoUrl(null);
        setLogoLoadError(false);
        setFormData((prev) => ({
          ...prev,
          logoImageUrl: undefined,
        }));
        await reloadStoreCustomization();
        showToast('Reset to default orange K badge successfully.', 'success');
      } else {
        showToast(res.error || 'Failed to reset logo.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error resetting logo.', 'error');
    } finally {
      setIsRemovingLogo(false);
    }
  };

  /**
   * Saves store identity and colors without clobbering logo_url
   */
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      // Preserve current authoritative logo_url
      const configToSave: StoreBrandingConfig = {
        ...formData,
        logoImageUrl: currentLogoUrl || undefined,
      };

      const res = await updateStoreBranding(configToSave);
      if (res.success) {
        showToast('Store branding details saved successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to save branding details.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving branding details.', 'error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const hasActiveCustomLogo = Boolean(
    currentLogoUrl &&
    typeof currentLogoUrl === 'string' &&
    currentLogoUrl.trim().length > 0 &&
    !logoLoadError
  );

  return (
    <div className="space-y-6">
      {/* Hidden native file input with strict format accept */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isUploadingLogo || isRemovingLogo}
      />

      {/* Confirmation Modal for Removing Logo */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                Remove Store Logo?
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                This will clear <code className="px-1 py-0.5 bg-gray-100 dark:bg-slate-800 rounded text-gray-700 dark:text-slate-300 font-mono">public.settings.logo_url</code> and revert your storefront header and admin sidebar to the default orange K badge.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemovingLogo}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isRemovingLogo}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRemovingLogo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Supabase Connection & Status */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#ff6452] flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 dark:text-white">
                Store Branding & Logo
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Connected to Supabase storage bucket <code className="font-mono font-bold text-gray-700 dark:text-slate-300">store-branding</code> and settings column <code className="font-mono font-bold text-gray-700 dark:text-slate-300">public.settings.logo_url</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveCustomLogo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Custom Logo Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/40 text-[#ff6452] text-xs font-bold rounded-full border border-orange-200 dark:border-orange-800/60">
                <Layers className="w-3.5 h-3.5" />
                <span>Default 'K' Badge Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Section 1: Current Logo Management Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
          {/* Logo Display & Status Box */}
          <div className="lg:col-span-5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl p-5 border border-gray-200/80 dark:border-slate-700/60 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Current Store Logo
                </span>
                {isLogoLoading && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
                  </span>
                )}
              </div>

              {/* Logo Preview Container */}
              <div className="w-full h-36 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center p-4 relative overflow-hidden shadow-xs group">
                {currentLogoUrl && !logoLoadError ? (
                  <img
                    src={currentLogoUrl}
                    alt={formData.storeName || 'Store Logo'}
                    onError={() => setLogoLoadError(true)}
                    className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105 duration-200"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div
                      style={{ backgroundColor: formData.accentColor || '#ff6452' }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm transition-transform group-hover:scale-105"
                    >
                      {formData.logoText || 'K'}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400">
                      {logoLoadError
                        ? 'Image failed to load — showing default K badge'
                        : "Default 'K' logo displayed"}
                    </span>
                  </div>
                )}
              </div>

              {/* Logo Storage Metadata */}
              <div className="mt-3 text-[11px] text-gray-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Source:</span>
                  <span className="font-mono font-semibold text-gray-700 dark:text-slate-300">
                    {currentLogoUrl ? 'store-branding/logo.webp' : 'Default Asset (badge)'}
                  </span>
                </div>
                {currentLogoUrl && (
                  <div className="flex items-center justify-between truncate">
                    <span>URL:</span>
                    <a
                      href={currentLogoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#ff6452] hover:underline flex items-center gap-0.5 truncate max-w-[200px]"
                    >
                      <span className="truncate">{currentLogoUrl}</span>
                      <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions (Replace, Remove, Reset) */}
            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo || isRemovingLogo}
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-gray-900 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{hasActiveCustomLogo ? 'Replace Logo' : 'Upload Logo'}</span>
              </button>

              {hasActiveCustomLogo && (
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  disabled={isUploadingLogo || isRemovingLogo}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-rose-200 dark:border-rose-800/60 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetToDefaultK}
                disabled={isUploadingLogo || isRemovingLogo || !hasActiveCustomLogo}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Reset to default orange K badge"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default K</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone & Instructions Box */}
          <div className="lg:col-span-7 space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] ${
                isDragging
                  ? 'border-[#ff6452] bg-orange-50/50 dark:bg-orange-950/20 scale-[0.99]'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 bg-gray-50/40 dark:bg-slate-800/20'
              } ${isUploadingLogo ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-gray-100 dark:border-slate-700 flex items-center justify-center text-[#ff6452]">
                {isUploadingLogo ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-[#ff6452]" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-black text-gray-900 dark:text-white">
                  {isUploadingLogo ? (
                    'Uploading to store-branding...'
                  ) : (
                    <>
                      Click to browse or drag and drop your store logo
                    </>
                  )}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Supported formats: <strong className="text-gray-700 dark:text-slate-300">PNG, JPG/JPEG, WEBP</strong>
                </p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Maximum file size: <strong className="text-gray-700 dark:text-slate-300">5 MB</strong> • Saved deterministically as <code className="font-mono text-gray-700 dark:text-slate-300">logo.webp</code>
                </p>
              </div>

              <button
                type="button"
                className="mt-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 shadow-xs hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Choose File
              </button>
            </div>

            {/* Validation Error Message Callout */}
            {validationError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Upload Validation Error</p>
                  <p>{validationError}</p>
                </div>
              </div>
            )}

            {/* Requirement / Information Checklist */}
            <div className="bg-gray-50/60 dark:bg-slate-800/30 rounded-2xl p-4 border border-gray-100 dark:border-slate-800 text-[11px] text-gray-600 dark:text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                <HelpCircle className="w-3.5 h-3.5 text-[#ff6452]" />
                <span>Logo Upload & Persistence Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-gray-500 dark:text-slate-400">
                <li>Uploaded images are automatically verified, optimized to WebP, and stored in the <span className="font-semibold text-gray-700 dark:text-slate-300">store-branding</span> bucket.</li>
                <li>Updating the logo writes strictly to <span className="font-mono text-gray-700 dark:text-slate-300">public.settings.logo_url</span> without modifying any existing products or orders.</li>
                <li>Changes persist across browser refreshes, logins/logouts, and full Netlify deployments.</li>
                <li>If an image fails to load in the customer's browser, it visually falls back to the default orange K badge without losing the stored URL.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Interactive Preview Box */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
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
          {/* Storefront Header Look Preview */}
          <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Storefront Header Look
              </p>
              <div className="flex items-center gap-2.5">
                {hasActiveCustomLogo ? (
                  <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-xs border border-gray-100 p-0.5 flex-shrink-0">
                    <img
                      src={currentLogoUrl!}
                      alt={formData.storeName || 'Store Logo'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    style={{ backgroundColor: formData.accentColor || '#ff6452' }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs flex-shrink-0"
                  >
                    {formData.logoText || 'K'}
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="font-black text-xl tracking-tight text-gray-900 leading-none">
                    {(formData.storeName || 'KUD').split(' ')[0]}
                    <span style={{ color: formData.accentColor || '#ff6452' }}>.</span>
                  </span>
                  {formData.showTagline && (
                    <span className="text-[10px] font-medium text-gray-400 tracking-wider uppercase truncate max-w-[120px]">
                      {formData.tagline || 'Store'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold">
              Navbar
            </span>
          </div>

          {/* Admin Portal Sidebar Look Preview */}
          <div className="bg-white text-gray-900 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Admin Portal Sidebar Look
              </p>
              <div className="flex items-center gap-2.5">
                {hasActiveCustomLogo ? (
                  <div className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-xs border border-gray-100 p-0.5 flex-shrink-0">
                    <img
                      src={currentLogoUrl!}
                      alt={formData.storeName || 'Admin Logo'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    style={{ backgroundColor: formData.accentColor || '#ff6452' }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xs flex-shrink-0"
                  >
                    {formData.logoText || 'K'}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-black text-gray-900 leading-none truncate max-w-[140px]">
                    {formData.storeName || 'KUD online store'}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#ff6452] mt-1">
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

      {/* Section 2: Store Identity & Brand Details Form */}
      <form onSubmit={handleSaveDetails} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-xs space-y-6">
        {/* Store Title & Tagline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
            <Store className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900 dark:text-white">Store Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200">Store Name</label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="e.g. KUD online store"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#ff6452]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200">Brand Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. The shopping partner you can trust."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#ff6452]"
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
            <label htmlFor="showTaglineCheck" className="text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer">
              Show tagline below store name in desktop header
            </label>
          </div>
        </div>

        {/* Fallback Badge Letter */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
            <ImageIcon className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900 dark:text-white">Default Badge Initial</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Badge Initial Letter(s)
            </label>
            <input
              type="text"
              maxLength={4}
              value={formData.logoText || 'K'}
              onChange={(e) => setFormData({ ...formData, logoText: e.target.value.toUpperCase() })}
              placeholder="K"
              className="w-full sm:w-48 px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-black text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#ff6452] tracking-wider"
            />
            <p className="text-[11px] text-gray-400">
              Displayed when no custom logo is uploaded, or when resetting to the default badge.
            </p>
          </div>
        </div>

        {/* Brand Accent Color */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
            <Palette className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900 dark:text-white">Brand Accent Color</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.hex}
                type="button"
                onClick={() => handleColorChange(color.hex)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activePreset.toLowerCase() === color.hex.toLowerCase()
                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xs'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200'
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
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Custom HEX Color:</label>
            <input
              type="color"
              value={formData.accentColor || '#ff6452'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-slate-700"
            />
            <input
              type="text"
              value={formData.accentColor || '#ff6452'}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-28 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#ff6452]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setFormData((prev) => ({
                ...DEFAULT_STORE_BRANDING,
                logoImageUrl: prev.logoImageUrl,
              }));
              setActivePreset(DEFAULT_STORE_BRANDING.accentColor || '#ff6452');
              showToast('Reset form fields to default values', 'info');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Details Form</span>
          </button>

          <button
            type="submit"
            disabled={isSavingDetails}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSavingDetails ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <span>Save Store Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
