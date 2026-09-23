import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Layers,
  Type,
  Palette,
  RotateCw,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Lock,
  Plus,
  Compass,
  ArrowLeft,
  Edit3,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import { LiveAuthPreview } from '../../components/admin/LiveAuthPreview';
import { SEOHead } from '../../components/SEOHead';
import { AuthAppearanceConfig, AuthBackgroundImage, CinematicPreset } from '../../types';
import {
  DEFAULT_AUTH_APPEARANCE,
  DEFAULT_AUTH_BACKGROUND_IMAGES,
  DEFAULT_CINEMATIC_PRESETS,
  getCinematicPresets,
  saveCinematicPresets,
} from '../../constants/authAppearance';

export const AdminAuthAppearancePage: React.FC = () => {
  const { authAppearance, updateAuthAppearance, showToast } = useShop();

  // Local draft state
  const [config, setConfig] = useState<AuthAppearanceConfig>(() => authAppearance || DEFAULT_AUTH_APPEARANCE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Curated Cinematic Presets State & Synchronization
  const [presets, setPresets] = useState<CinematicPreset[]>(() => getCinematicPresets());
  const [editingPreset, setEditingPreset] = useState<CinematicPreset | null>(null);
  const [presetEditForm, setPresetEditForm] = useState<{
    name: string;
    description: string;
    isVisibleOnFrontend: boolean;
  }>({
    name: '',
    description: '',
    isVisibleOnFrontend: true,
  });

  useEffect(() => {
    const handlePresetsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPresets(e.detail);
      }
    };
    window.addEventListener('kud_auth_presets_updated', handlePresetsUpdated);
    return () => window.removeEventListener('kud_auth_presets_updated', handlePresetsUpdated);
  }, []);

  // Active settings tab within the editor
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'animation' | 'glass' | 'forms'>('wallpapers');

  // New image form state
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newImageTitle, setNewImageTitle] = useState<string>('');
  const [newImageAlt, setNewImageAlt] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load from Supabase tables
  useEffect(() => {
    let isMounted = true;

    const loadSupabaseData = async () => {
      try {
        setIsLoading(true);
        const [settings, images] = await Promise.all([
          adminService.getAuthAppearance(),
          adminService.getAuthBackgroundImages(false),
        ]);

        if (!isMounted) return;

        let mergedImages: AuthBackgroundImage[] = [];
        if (Array.isArray(images) && images.length > 0) {
          mergedImages = images.map((img, idx) => ({
            id: String(img.id),
            url: img.public_url || img.storage_path,
            title: img.name || `Background ${idx + 1}`,
            altText: img.name || 'Store background wallpaper',
            isActive: img.is_active,
            order: img.display_order ?? idx,
            is_default: Boolean(img.is_default),
            uploadedAt: img.created_at || new Date().toISOString(),
          }));
        } else if (settings?.images && settings.images.length > 0) {
          mergedImages = settings.images;
        } else {
          mergedImages = DEFAULT_AUTH_BACKGROUND_IMAGES;
        }

        setConfig({
          ...DEFAULT_AUTH_APPEARANCE,
          ...(settings || {}),
          images: mergedImages,
        });
      } catch (err) {
        console.warn('[AdminAuthAppearancePage] Error fetching appearance data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSupabaseData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Save changes to Supabase tables public.auth_appearance_settings and public.auth_background_images
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await adminService.saveAuthAppearance(config);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save appearance settings');
      }

      // Also persist image reordering if needed
      if (config.images.length > 0) {
        const orderMap: Record<string, number> = {};
        config.images.forEach((img, idx) => {
          orderMap[img.id] = idx;
        });
        await adminService.reorderAuthBackgroundImages(orderMap);
      }

      await updateAuthAppearance(config);
      showToast('Authentication appearance & wallpapers saved successfully!', 'success');
    } catch (err: any) {
      console.error('Failed to save auth appearance:', err);
      showToast(err?.message || 'Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to system defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all authentication appearance and animation settings to default?')) {
      setConfig({
        ...DEFAULT_AUTH_APPEARANCE,
        images: config.images.length > 0 ? config.images : DEFAULT_AUTH_BACKGROUND_IMAGES,
      });
      showToast('Settings reset to defaults. Click "Save Changes" to apply.', 'info');
    }
  };

  // Curated Preset Handlers
  const handleApplyPreset = (preset: CinematicPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      active_preset_id: preset.id,
      active_preset_name: preset.name,
      show_preset_name_on_frontend: preset.isVisibleOnFrontend,
    }));
    showToast(`Applied preset: ${preset.name}`, 'success');
  };

  // Toggle frontend visibility for a preset
  const handleTogglePresetVisibility = (presetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = presets.map((p) => {
      if (p.id === presetId) {
        return { ...p, isVisibleOnFrontend: !p.isVisibleOnFrontend };
      }
      return p;
    });
    setPresets(updated);
    saveCinematicPresets(updated);
    if (config.active_preset_id === presetId) {
      const target = updated.find((p) => p.id === presetId);
      if (target) {
        setConfig((prev) => ({
          ...prev,
          show_preset_name_on_frontend: target.isVisibleOnFrontend,
        }));
      }
    }
    const target = updated.find((p) => p.id === presetId);
    showToast(
      `Preset "${target?.name}": frontend name is now ${target?.isVisibleOnFrontend ? 'visible' : 'hidden'}`,
      'info'
    );
  };

  // Open edit modal for a preset
  const handleOpenEditPreset = (preset: CinematicPreset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPreset(preset);
    setPresetEditForm({
      name: preset.name,
      description: preset.description,
      isVisibleOnFrontend: preset.isVisibleOnFrontend,
    });
  };

  // Save edited preset
  const handleSaveEditedPreset = () => {
    if (!editingPreset) return;
    const cleanName = presetEditForm.name.trim();
    if (!cleanName) {
      showToast('Preset name cannot be empty.', 'error');
      return;
    }
    const updated = presets.map((p) => {
      if (p.id === editingPreset.id) {
        return {
          ...p,
          name: cleanName,
          description: presetEditForm.description.trim(),
          isVisibleOnFrontend: presetEditForm.isVisibleOnFrontend,
        };
      }
      return p;
    });
    setPresets(updated);
    saveCinematicPresets(updated);
    if (config.active_preset_id === editingPreset.id) {
      setConfig((prev) => ({
        ...prev,
        active_preset_name: cleanName,
        show_preset_name_on_frontend: presetEditForm.isVisibleOnFrontend,
      }));
    }
    setEditingPreset(null);
    showToast(`Updated preset "${cleanName}"`, 'success');
  };

  // Reset presets to system defaults
  const handleResetPresetsToDefaults = () => {
    if (
      window.confirm(
        'Reset all cinematic presets to system defaults? Custom names and visibility settings will be restored.'
      )
    ) {
      setPresets(DEFAULT_CINEMATIC_PRESETS);
      saveCinematicPresets(DEFAULT_CINEMATIC_PRESETS);
      showToast('Cinematic presets reset to defaults.', 'info');
    }
  };

  // Handle Drag & Drop Upload to Supabase Storage auth-backgrounds bucket
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only JPG, PNG, or WEBP image formats are supported.');
      showToast('Unsupported file type. Please use JPG, PNG, or WEBP.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit.');
      showToast('Image is too large. Maximum allowed size is 10MB.', 'error');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const uploadResult = await adminService.uploadAuthBackgroundImageToStorage(file);
      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.error || 'Failed to upload background image');
      }

      const dbImg = uploadResult.data;
      const newImage: AuthBackgroundImage = {
        id: dbImg.id,
        url: dbImg.public_url || dbImg.storage_path,
        title: dbImg.name,
        altText: dbImg.name,
        name: dbImg.name,
        storage_path: dbImg.storage_path,
        isActive: dbImg.is_active,
        order: dbImg.display_order,
        is_default: dbImg.is_default,
        uploadedAt: dbImg.created_at || new Date().toISOString(),
      };

      setConfig((prev) => ({
        ...prev,
        images: [...prev.images, newImage],
      }));

      showToast('Background image uploaded successfully!', 'success');
    } catch (err: any) {
      console.error('Image upload failed:', err);
      const msg = err.message || 'Could not upload image. Please try again.';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add image by URL
  const handleAddImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    try {
      new URL(newImageUrl.trim());
    } catch {
      showToast('Please enter a valid HTTP/HTTPS image URL.', 'error');
      return;
    }

    const newImage: AuthBackgroundImage = {
      id: `auth-bg-${Date.now()}`,
      url: newImageUrl.trim(),
      title: newImageTitle.trim() || 'Custom Auth Background',
      altText: newImageAlt.trim() || 'Marketplace authentication background',
      isActive: true,
      order: config.images.length,
      uploadedAt: new Date().toISOString(),
    };

    setConfig((prev) => ({
      ...prev,
      images: [...prev.images, newImage],
    }));

    setNewImageUrl('');
    setNewImageTitle('');
    setNewImageAlt('');
    setShowUrlInput(false);
    showToast('Background image URL added successfully!', 'success');
  };

  // Set as Default Opening Wallpaper in public.auth_background_images
  const handleSetDefault = async (id: string) => {
    setConfig((prev) => ({
      ...prev,
      images: prev.images.map((img) => ({
        ...img,
        is_default: img.id === id,
      })),
    }));
    await adminService.setDefaultAuthBackgroundImage(id);
    showToast('Default background wallpaper updated!', 'success');
  };

  // Toggle active image
  const handleToggleActive = async (id: string) => {
    const target = config.images.find((img) => img.id === id);
    if (!target) return;
    const newActive = !target.isActive;

    const remainingActive = config.images.filter((img) => img.id !== id && img.isActive).length;
    if (!newActive && remainingActive === 0) {
      showToast('At least one background image must remain active.', 'error');
      return;
    }

    setConfig((prev) => ({
      ...prev,
      images: prev.images.map((img) => (img.id === id ? { ...img, isActive: newActive } : img)),
    }));

    if (target.storage_path || !id.startsWith('auth-bg-')) {
      await adminService.updateAuthBackgroundImage(id, { is_active: newActive });
    }
  };

  // Reorder image position
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.images.length) return;

    const items = [...config.images];
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    const reordered = items.map((img, idx) => ({ ...img, order: idx }));
    setConfig((prev) => ({ ...prev, images: reordered }));

    const orderMap: Record<string, number> = {};
    reordered.forEach((img) => {
      orderMap[img.id] = img.order;
    });
    await adminService.reorderAuthBackgroundImages(orderMap);
  };

  // Delete image from database and storage
  const handleDeleteImage = async (id: string) => {
    const target = config.images.find((img) => img.id === id);
    if (!target) return;

    if (config.images.length <= 1) {
      showToast('You must keep at least one background image.', 'error');
      return;
    }

    if (!window.confirm(`Delete background image "${target.title || 'Untitled'}"?`)) {
      return;
    }

    setConfig((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id),
    }));

    const result = await adminService.deleteAuthBackgroundImage(id, target.storage_path);
    if (result.success) {
      showToast('Background image deleted.', 'success');
    } else {
      showToast(result.error || 'Failed to delete from database.', 'error');
    }
  };

  const isEngineEnabled = config.animation_enabled ?? config.enableMotion ?? true;
  const displayDurationSec = config.image_display_duration || config.rotationIntervalSeconds || 6;

  return (
    <div className="space-y-6 pb-16">
      <SEOHead
        title="Authentication Appearance & Wallpapers | Admin Portal"
        description="Configure dynamic background wallpapers, Ken Burns animation settings, and glassmorphic card layouts for authentication."
      />

      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </Link>
            <span className="text-gray-300">•</span>
            <span className="text-xs font-bold text-[#ff6452] uppercase tracking-wider">Cloud Connected</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#ff6452]" />
            <span>Authentication Appearance & Wallpapers</span>
          </h1>
          <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
            Configure dynamic high-resolution background wallpapers, Ken Burns motion transitions, glassmorphic card styles, and auth layout adjustments.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <Link
            to="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span>Preview Login</span>
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-black transition-all shadow-sm hover:shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving settings...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CINEMATIC PRESETS MANAGEMENT STRIP */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
              Curated Cinematic Presets
            </h3>
            <span className="text-[10px] bg-rose-50 text-[#ff6452] font-black px-2 py-0.5 rounded-full">
              {presets.length} Presets
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetPresetsToDefaults}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset presets to default names & settings"
            >
              <RotateCw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
            <span className="text-[11px] font-medium text-gray-400 hidden sm:inline">
              • Custom names & frontend visibility
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {presets.map((preset) => {
            const isCurrentlyActive =
              config.active_preset_id === preset.id ||
              config.active_preset_name?.toLowerCase() === preset.name.toLowerCase();

            return (
              <div
                key={preset.id}
                className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all ${
                  isCurrentlyActive
                    ? 'border-[#ff6452] bg-rose-50/20 shadow-xs ring-2 ring-[#ff6452]/20'
                    : 'border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-2xs relative">
                      <img
                        src={preset.previewUrl}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {isCurrentlyActive && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 overflow-hidden flex-1">
                      <h4 className="text-xs font-black text-gray-900 truncate">
                        {preset.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  {/* Preset Visibility & Quick Edit Actions */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePresetVisibility(preset.id, e)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                        preset.isVisibleOnFrontend
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={
                        preset.isVisibleOnFrontend
                          ? 'Name is displayed on customer login/signup. Click to hide.'
                          : 'Name is hidden from customer login/signup. Click to display.'
                      }
                    >
                      {preset.isVisibleOnFrontend ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-gray-400" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenEditPreset(preset, e)}
                      className="p-1 rounded-lg text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Rename or edit preset"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrentlyActive
                        ? 'bg-[#ff6452] text-white shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900'
                    }`}
                  >
                    {isCurrentlyActive ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Active Preset</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#ff6452]" />
                        <span>Apply Preset</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for Editing / Renaming Preset */}
        {editingPreset && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-sm font-black text-gray-900">Edit Cinematic Preset</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Preset Name</label>
                  <input
                    type="text"
                    value={presetEditForm.name}
                    onChange={(e) => setPresetEditForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Cinematic Boutique or Warm African Sunset"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#ff6452] outline-hidden font-bold text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400">
                    Rename presets like "Cinematic Boutique" or "Warm African Sunset".
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">Description</label>
                  <textarea
                    rows={2}
                    value={presetEditForm.description}
                    onChange={(e) =>
                      setPresetEditForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Brief description of animation, transitions, and mood"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-gray-200 focus:border-[#ff6452] outline-hidden text-gray-700"
                  />
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={presetEditForm.isVisibleOnFrontend}
                    onChange={(e) =>
                      setPresetEditForm((p) => ({ ...p, isVisibleOnFrontend: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-gray-900 block">
                      Show Preset Name on Customer Frontend
                    </span>
                    <span className="text-[11px] text-gray-500 block leading-tight">
                      When enabled, a subtle pill badge displaying the preset name is visible on login and signup pages.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedPreset}
                  className="px-4 py-2 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-black transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preset</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CONTROL TABS & PANELS (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('wallpapers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'wallpapers'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Background Wallpapers</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                {config.images.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('animation')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'animation'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Motion Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('glass')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'glass'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Glassmorphism & Layout</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'forms'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Headings & Actions</span>
            </button>
          </div>

          {/* TAB 1: BACKGROUND WALLPAPERS */}
          {activeTab === 'wallpapers' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-sm font-black text-gray-900">Background Images Repository</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-400">
                  Storage Bucket: <code className="font-mono text-gray-700">auth-backgrounds</code>
                </span>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isUploading
                    ? 'border-[#ff6452] bg-rose-50/20'
                    : 'border-gray-200 hover:border-[#ff6452] bg-gray-50/40 hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="auth-bg-file-input-page"
                  disabled={isUploading}
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] flex items-center justify-center shadow-xs">
                    {isUploading ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-800">
                      {isUploading
                        ? 'Uploading background image...'
                        : 'Drag and drop background images here, or browse files'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Supports JPG, PNG, WEBP, or AVIF (Up to 10MB each). Recommended 1920×1080.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label
                      htmlFor="auth-bg-file-input-page"
                      className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Browse Device Files
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput((p) => !p)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                    >
                      {showUrlInput ? 'Cancel URL' : '+ Add via URL'}
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Add via URL Form */}
              {showUrlInput && (
                <form
                  onSubmit={handleAddImageUrl}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3"
                >
                  <h4 className="text-xs font-bold text-gray-900">Add External Background Image URL</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://example.com/wallpaper.jpg"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="sm:col-span-2 text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={newImageTitle}
                      onChange={(e) => setNewImageTitle(e.target.value)}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Add Wallpaper
                    </button>
                  </div>
                </form>
              )}

              {/* Image List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Active Wallpaper Pool ({config.images.filter((img) => img.isActive).length} active of{' '}
                    {config.images.length})
                  </h4>
                  <span className="text-[10px] text-gray-400">Default image opens on first screen load</span>
                </div>

                <div className="space-y-2.5">
                  {config.images.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        img.isActive
                          ? 'border-gray-200 bg-white shadow-2xs'
                          : 'border-gray-150 bg-gray-50/70 opacity-60'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        <img
                          src={img.url}
                          alt={img.altText || img.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                          #{idx + 1}
                        </span>
                        {img.is_default && (
                          <span
                            className="absolute top-1 left-1 bg-amber-500 text-white p-0.5 rounded-sm shadow-xs"
                            title="Default Wallpaper"
                          >
                            <Star className="w-2.5 h-2.5 fill-white" />
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {img.title || `Background ${idx + 1}`}
                          </h4>
                          {img.is_default && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate max-w-xs">{img.url}</p>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetDefault(img.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            img.is_default
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title={img.is_default ? 'Default Opening Wallpaper' : 'Click to set as default opening image'}
                        >
                          <Star className={`w-3 h-3 ${img.is_default ? 'fill-amber-500 text-amber-500' : ''}`} />
                          <span>{img.is_default ? 'Default' : 'Set Default'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(img.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                            img.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {img.isActive ? 'Active' : 'Inactive'}
                        </button>

                        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(idx, 'down')}
                            disabled={idx === config.images.length - 1}
                            className="p-1 text-gray-500 hover:text-gray-900 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Wallpaper"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANIMATION SETTINGS */}
          {activeTab === 'animation' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-sm font-black text-gray-900">Cinematic Animation & Motion Controls</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-400">
                  Table: <code className="font-mono text-gray-700">public.auth_appearance_settings</code>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Animation Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Animation Style</label>
                  <select
                    value={config.animation_type || config.transitionEffect || 'ken-burns'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setConfig((prev) => ({
                        ...prev,
                        animation_type: val,
                        transitionEffect: val,
                      }));
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-medium"
                  >
                    <option value="ken-burns">Ken Burns Slow Zoom (Recommended)</option>
                    <option value="fade">Pure Smooth Crossfade</option>
                    <option value="pan">Cinematic Slow Pan</option>
                    <option value="zoom-fade">Zoom + Crossfade Hybrid</option>
                    <option value="slide">Horizontal Carousel Slide</option>
                  </select>
                  <p className="text-[10px] text-gray-400">
                    Controls the dynamic camera movement and transition effect between background wallpapers.
                  </p>
                </div>

                {/* Master Animation Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Cinematic Motion Engine</label>
                    <input
                      type="checkbox"
                      checked={isEngineEnabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          animation_enabled: e.target.checked,
                          enableMotion: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Master toggle for camera motion. Disabling this displays elegant static wallpapers.
                  </p>
                </div>

                {/* Ken Burns Zoom Intensity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Ken Burns Zoom Intensity</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {Number(config.zoom_intensity || 1.08).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.02}
                    max={1.2}
                    step={0.01}
                    value={config.zoom_intensity || 1.08}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        zoom_intensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Subtle (1.03x)</span>
                    <span>Cinematic (1.08x)</span>
                    <span>Dramatic (1.20x)</span>
                  </div>
                </div>

                {/* Slow Pan & Randomization Toggles */}
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer">
                    <span>Slow Horizontal Pan</span>
                    <input
                      type="checkbox"
                      checked={config.pan_enabled ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, pan_enabled: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs font-bold text-gray-800 cursor-pointer">
                    <span>Randomize Wallpapers on Load</span>
                    <input
                      type="checkbox"
                      checked={config.randomize_images ?? false}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, randomize_images: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Image Display Duration Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Image Display Duration</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {displayDurationSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={displayDurationSec}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setConfig((prev) => ({
                        ...prev,
                        image_display_duration: val,
                        rotationIntervalSeconds: val,
                      }));
                    }}
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Fast (2s)</span>
                    <span>Recommended (6s - 8s)</span>
                    <span>Slow (20s)</span>
                  </div>
                </div>

                {/* Transition Duration Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Crossfade Speed</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {(
                        config.transition_duration ||
                        (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.2)
                      ).toFixed(1)}
                      s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    value={
                      config.transition_duration ||
                      (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.2)
                    }
                    onChange={(e) => {
                      const sec = parseFloat(e.target.value);
                      setConfig((prev) => ({
                        ...prev,
                        transition_duration: sec,
                        transitionDurationMs: Math.round(sec * 1000),
                      }));
                    }}
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Snappy (0.5s)</span>
                    <span>Smooth (1.2s)</span>
                    <span>Cinematic (3.0s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLASSMORPHISM & LAYOUT */}
          {activeTab === 'glass' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-sm font-black text-gray-900">Glassmorphism & Desktop Layout</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-400">Optical Tuning</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Desktop Card Position */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Card Position (Desktop)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, card_position: pos }))}
                        className={`py-2 text-xs font-bold capitalize rounded-xl border transition-all cursor-pointer ${
                          (config.card_position || 'center') === pos
                            ? 'border-[#ff6452] bg-rose-50/50 text-[#ff6452] shadow-2xs'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Corner Radius */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Card Corner Radius</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {config.card_border_radius || 24}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={36}
                    step={2}
                    value={config.card_border_radius || 24}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        card_border_radius: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Modern (12px)</span>
                    <span>Curved (24px)</span>
                    <span>Soft Pebble (36px)</span>
                  </div>
                </div>

                {/* Overlay Gradient Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Background Overlay Gradient</label>
                  <select
                    value={config.overlayGradient}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        overlayGradient: e.target.value as any,
                      }))
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-medium"
                  >
                    <option value="soft">Soft Vertical Gradient</option>
                    <option value="dark">Deep Dramatic Dark</option>
                    <option value="vignette">Cinematic Edge Vignette</option>
                    <option value="radial">Spotlight Radial Vignette</option>
                  </select>
                </div>

                {/* Overlay Tint Darkness */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Overlay Tint Darkness</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {Math.round(
                        typeof config.overlay_opacity === 'number'
                          ? config.overlay_opacity <= 1
                            ? config.overlay_opacity * 100
                            : config.overlay_opacity
                          : config.overlayDarkness
                      )}
                      %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={85}
                    step={5}
                    value={Math.round(
                      typeof config.overlay_opacity === 'number'
                        ? config.overlay_opacity <= 1
                          ? config.overlay_opacity * 100
                          : config.overlay_opacity
                        : config.overlayDarkness
                    )}
                    onChange={(e) => {
                      const pct = parseInt(e.target.value, 10);
                      setConfig((prev) => ({
                        ...prev,
                        overlayDarkness: pct,
                        overlay_opacity: pct / 100,
                      }));
                    }}
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Light (10%)</span>
                    <span>Balanced (45%)</span>
                    <span>Deep (85%)</span>
                  </div>
                </div>

                {/* Glass Card Opacity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Card Opacity</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {Math.round(
                        typeof config.card_opacity === 'number'
                          ? config.card_opacity <= 1
                            ? config.card_opacity * 100
                            : config.card_opacity
                          : config.cardOpacity
                      )}
                      %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={100}
                    step={2}
                    value={Math.round(
                      typeof config.card_opacity === 'number'
                        ? config.card_opacity <= 1
                          ? config.card_opacity * 100
                          : config.card_opacity
                        : config.cardOpacity
                    )}
                    onChange={(e) => {
                      const pct = parseInt(e.target.value, 10);
                      setConfig((prev) => ({
                        ...prev,
                        cardOpacity: pct,
                        card_opacity: pct / 100,
                      }));
                    }}
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Translucent (30%)</span>
                    <span>Balanced (80%)</span>
                    <span>Solid (100%)</span>
                  </div>
                </div>

                {/* Glass Card Blur */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Card Backdrop Blur</label>
                  <select
                    value={config.cardBlur}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        cardBlur: e.target.value as any,
                      }))
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-medium"
                  >
                    <option value="sm">Subtle (4px)</option>
                    <option value="md">Medium (8px)</option>
                    <option value="lg">Heavy (16px)</option>
                    <option value="xl">Extra Large (24px - Recommended)</option>
                    <option value="2xl">Deep Frosted (40px)</option>
                  </select>
                </div>

                {/* Background Soft Blur */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">Wallpaper Soft Blur</label>
                    <span className="text-xs font-mono font-bold text-[#ff6452]">
                      {config.overlayBlur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={config.overlayBlur}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        overlayBlur: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-[#ff6452] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Crisp (0px)</span>
                    <span>Dreamy (4px)</span>
                    <span>Defocused (8px)</span>
                  </div>
                </div>

                {/* Card Border Intensity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Glass Card Border</label>
                  <select
                    value={config.cardBorderIntensity}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        cardBorderIntensity: e.target.value as any,
                      }))
                    }
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-medium"
                  >
                    <option value="none">None (Border-Free)</option>
                    <option value="subtle">Subtle Specular Edge (Recommended)</option>
                    <option value="medium">Medium Defined Edge</option>
                    <option value="high">High Contrast Accent Border</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HEADINGS & FORM ACTIONS */}
          {activeTab === 'forms' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#ff6452]" />
                  <h3 className="text-sm font-black text-gray-900">Headings & Authentication Actions</h3>
                </div>
                <span className="text-[11px] font-bold text-gray-400">Form Configuration</span>
              </div>

              {/* Login & Signup Headings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5 p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80">
                  <h4 className="text-xs font-black text-gray-900">Sign In View Headings</h4>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Headline Title</label>
                    <input
                      type="text"
                      value={config.login_title || config.welcomeHeadline || 'Welcome back'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          login_title: e.target.value,
                          welcomeHeadline: e.target.value,
                        }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Subtitle Description</label>
                    <textarea
                      rows={2}
                      value={config.login_subtitle || config.welcomeSubtext || 'Sign in to continue shopping'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          login_subtitle: e.target.value,
                          welcomeSubtext: e.target.value,
                        }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 p-4 bg-gray-50/70 rounded-2xl border border-gray-200/80">
                  <h4 className="text-xs font-black text-gray-900">Sign Up View Headings</h4>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Headline Title</label>
                    <input
                      type="text"
                      value={config.signup_title || 'Create your account'}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, signup_title: e.target.value }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Subtitle Description</label>
                    <textarea
                      rows={2}
                      value={config.signup_subtitle || 'Join us and start shopping'}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, signup_subtitle: e.target.value }))
                      }
                      className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Social Buttons & Mode Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Google Social Sign-in</span>
                  <input
                    type="checkbox"
                    checked={config.show_google ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, show_google: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Apple Social Sign-in</span>
                  <input
                    type="checkbox"
                    checked={config.show_apple ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, show_apple: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Allow Sign In Tab / Mode</span>
                  <input
                    type="checkbox"
                    checked={config.show_login_link ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, show_login_link: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Allow Sign Up Tab / Mode</span>
                  <input
                    type="checkbox"
                    checked={config.show_signup_link ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, show_signup_link: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Show Brand Logo</span>
                  <input
                    type="checkbox"
                    checked={config.show_logo ?? config.showLogoBadge ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        show_logo: e.target.checked,
                        showLogoBadge: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer">
                  <span className="text-xs font-bold text-gray-800">Trust & Security Badges</span>
                  <input
                    type="checkbox"
                    checked={config.showFeaturesPill ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showFeaturesPill: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REALTIME INTERACTIVE PREVIEW (5 Cols on desktop, sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#ff6452]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                Live Interactive Preview
              </h3>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Auto-reflects your edits</span>
          </div>

          {/* Consumes draft config and images in real time */}
          <LiveAuthPreview
            config={config}
            images={config.images}
            className="shadow-xl"
            showControls={true}
          />
        </div>
      </div>
    </div>
  );
};
