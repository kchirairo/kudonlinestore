import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Play,
  RotateCw,
  Eye,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  Palette,
  Type,
  Lock,
  Smartphone,
  Monitor,
  Zap,
  Plus,
  Compass,
  Star,
  Edit3,
  EyeOff,
  X,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import { AuthAppearanceConfig, AuthBackgroundImage, CinematicPreset } from '../../types';
import {
  DEFAULT_AUTH_APPEARANCE,
  DEFAULT_AUTH_BACKGROUND_IMAGES,
  DEFAULT_CINEMATIC_PRESETS,
  getCinematicPresets,
  saveCinematicPresets,
} from '../../constants/authAppearance';
import { LiveAuthPreview } from './LiveAuthPreview';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

const AppleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.73-14.24-6.95-10.88-12.28-23.23-15.99-37.05-3.7-13.82-5.56-26.68-5.56-38.58 0-16.1 4.13-29.28 12.39-39.53 8.26-10.25 18.49-15.48 30.68-15.69 5.86 0 12.06 1.48 18.59 4.45 6.53 2.97 10.66 4.51 12.39 4.63 1.3.12 5.65-1.54 13.06-4.99 7.4-3.46 14.15-4.97 20.25-4.54 15.45.86 27.67 6.47 36.67 16.83-13.72 8.36-20.36 19.86-19.92 34.5.32 11.53 4.67 21.08 13.06 28.65 3.91 3.59 8.37 6.3 13.38 8.15-2.82 8.26-6.63 17.58-11.42 27.97zM119.22 33.39c0-8.04 2.82-15.86 8.46-23.47 5.65-7.6 12.71-12.44 21.19-14.52.43 2.17.65 4.35.65 6.52 0 7.82-2.93 15.64-8.8 23.47-5.87 7.82-13 12.71-21.4 14.67-.11-2.17-.11-4.49-.1-6.67z" />
  </svg>
);

export const AdminAuthAppearanceSettings: React.FC = () => {
  const { authAppearance, updateAuthAppearance, showToast, storeBranding } = useShop();

  // Local draft state
  const [config, setConfig] = useState<AuthAppearanceConfig>(() => authAppearance || DEFAULT_AUTH_APPEARANCE);
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

  // New image form state
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newImageTitle, setNewImageTitle] = useState<string>('');
  const [newImageAlt, setNewImageAlt] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  // Live preview interactive state
  const [previewActiveIndex, setPreviewActiveIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewAuthMode, setPreviewAuthMode] = useState<'login' | 'signup'>('login');
  const [isPreviewRotating, setIsPreviewRotating] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when context updates
  useEffect(() => {
    if (authAppearance) {
      setConfig(authAppearance);
    }
  }, [authAppearance]);

  // Active images for preview
  const activeImages = config.images.filter((img) => img.isActive);
  const displayImages = activeImages.length > 0 ? activeImages : config.images;

  // Duration calculations
  const displayDurationSec = config.image_display_duration || config.rotationIntervalSeconds || 6;
  const isEngineEnabled = config.animation_enabled ?? config.enabled ?? true;

  // Live preview interval loop
  useEffect(() => {
    if (!isPreviewRotating || displayImages.length <= 1) return;
    const intervalMs = Math.max(2000, displayDurationSec * 1000);
    const timer = setInterval(() => {
      setPreviewActiveIndex((prev) => (prev + 1) % displayImages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPreviewRotating, displayImages.length, displayDurationSec]);

  // Handle Drag & Drop Upload to Supabase Storage auth-backgrounds bucket
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // File validation: JPG, PNG, WEBP, AVIF up to 10MB
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
      const msg = err.message || 'Could not upload image. Please try again or provide an image URL.';
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

  // Set as Default Wallpaper
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

  // Reorder image
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

  // Delete image
  const handleDelete = async (id: string) => {
    if (config.images.length <= 1) {
      showToast('You must keep at least one background image in your library.', 'error');
      return;
    }
    const target = config.images.find((img) => img.id === id);
    setConfig((prev) => {
      const filtered = prev.images.filter((img) => img.id !== id);
      const reordered = filtered.map((img, idx) => ({ ...img, order: idx }));
      return { ...prev, images: reordered };
    });
    if (target) {
      await adminService.deleteAuthBackgroundImage(id, target.storage_path);
    }
    showToast('Background image removed.', 'info');
  };

  // Apply Curated Preset
  const handleApplyPreset = (preset: CinematicPreset) => {
    setConfig((prev) => ({
      ...prev,
      ...preset.config,
      active_preset_id: preset.id,
      active_preset_name: preset.name,
      show_preset_name_on_frontend: preset.isVisibleOnFrontend,
    }));
    showToast(`Design preset "${preset.name}" applied!`, 'success');
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

  // Save changes to database and context
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateAuthAppearance(config);
      if (res && res.success) {
        showToast('Authentication appearance settings saved successfully!', 'success');
      } else {
        showToast(res?.error || 'Settings saved locally.', 'info');
      }
    } catch (err: any) {
      console.error('Failed to save auth appearance:', err);
      showToast('Error saving settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default settings
  const handleResetDefaults = () => {
    if (window.confirm('Reset authentication appearance to factory defaults?')) {
      setConfig({
        ...DEFAULT_AUTH_APPEARANCE,
        images: DEFAULT_AUTH_BACKGROUND_IMAGES,
      });
      showToast('Reset to default authentication appearance.', 'info');
    }
  };

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* HEADER & MASTER TOGGLE                                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-[#ff6452] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                Authentication Appearance
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  config.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {config.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
              Design a cinematic full-screen authentication experience for customer login and registration.
              Featuring dynamic rotating background imagery, Ken Burns zoom animations, and an elegant glassmorphism card.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            type="button"
            onClick={() => window.open('/login', '_blank')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Open Sign-In Page in new tab"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Sign-In</span>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CURATED DESIGN PRESETS & PRESET MANAGEMENT                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-sm font-black text-gray-900">Curated Atmosphere Presets</h3>
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
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              • Custom names & frontend visibility
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {presets.map((preset) => {
            const isCurrentlyActive =
              config.active_preset_id === preset.id ||
              config.active_preset_name?.toLowerCase() === preset.name.toLowerCase();

            return (
              <div
                key={preset.id}
                className={`group relative rounded-2xl border overflow-hidden p-3.5 transition-all flex flex-col justify-between space-y-3 ${
                  isCurrentlyActive
                    ? 'border-[#ff6452] bg-rose-50/20 shadow-xs ring-2 ring-[#ff6452]/20'
                    : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="h-24 w-full rounded-xl overflow-hidden relative bg-slate-900">
                    <img
                      src={preset.previewUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {isCurrentlyActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="px-2.5 py-1 bg-[#ff6452] rounded-lg text-[10px] font-black text-white shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 mt-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {preset.name}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditPreset(preset, e)}
                        className="p-1 text-gray-400 hover:text-[#ff6452] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Rename or edit preset"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                      {preset.description}
                    </p>
                  </div>

                  {/* Visibility toggle pill */}
                  <div className="mt-2 pt-2 border-t border-gray-150 flex items-center justify-between text-[10px]">
                    <span className="text-gray-400 font-medium">Customer View:</span>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePresetVisibility(preset.id, e)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                        preset.isVisibleOnFrontend
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={
                        preset.isVisibleOnFrontend
                          ? 'Badge shown on customer auth screen. Click to hide.'
                          : 'Badge hidden on customer auth screen. Click to show.'
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
                  </div>
                </div>

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
                      <span>Preset Applied</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#ff6452]" />
                      <span>Apply Preset</span>
                    </>
                  )}
                </button>
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
                    Give this preset an identifiable name for admin and customer views.
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
                      When enabled, customer login & signup screens show an atmosphere pill badge with this preset's name.
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
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Preset</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GRID: LEFT CONTROLS, RIGHT LIVE PREVIEW                                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CONFIGURATION CONTROLS */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: MASTER TOGGLE */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-gray-900">Cinematic Experience Engine</h3>
                <p className="text-xs text-gray-500">
                  Enable high-definition rotating background visuals with Ken Burns animation.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6452]"></div>
              </label>
            </div>
          </div>

          {/* SECTION 2: BACKGROUND IMAGES LIBRARY */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900">Background Wallpapers</h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">
                {activeImages.length} active of {config.images.length} images
              </span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-[#ff6452] bg-gray-50/60 hover:bg-rose-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer group space-y-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white text-gray-400 group-hover:text-[#ff6452] group-hover:scale-110 flex items-center justify-center mx-auto shadow-xs transition-all border border-gray-100">
                {isUploading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-[#ff6452]" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gray-800">
                  {isUploading ? 'Uploading image...' : 'Click to browse or drag & drop high-res image'}
                </p>
                <p className="text-[11px] text-gray-400">
                  Supported formats: JPG, PNG, WEBP (Recommended: 1920x1080px, max 10MB)
                </p>
              </div>
            </div>

            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Add via Remote URL Toggle */}
            <div>
              {!showUrlInput ? (
                <button
                  type="button"
                  onClick={() => setShowUrlInput(true)}
                  className="text-xs font-bold text-[#ff6452] hover:text-[#ff523d] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add image via web link (URL)</span>
                </button>
              ) : (
                <form onSubmit={handleAddImageUrl} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Add Wallpaper from Image URL</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or https://..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-gray-200 focus:border-[#ff6452] outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={newImageTitle}
                      onChange={(e) => setNewImageTitle(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-white rounded-xl border border-gray-200 focus:border-[#ff6452] outline-hidden"
                    />
                    <input
                      type="text"
                      placeholder="Alt text (optional)"
                      value={newImageAlt}
                      onChange={(e) => setNewImageAlt(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-white rounded-xl border border-gray-200 focus:border-[#ff6452] outline-hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newImageUrl.trim()}
                    className="w-full py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Add Wallpaper
                  </button>
                </form>
              )}
            </div>

            {/* Images List */}
            <div className="space-y-2.5 pt-1">
              {config.images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    img.isActive
                      ? 'bg-white border-gray-200 shadow-2xs'
                      : 'bg-gray-50/70 border-gray-150 opacity-60'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-gray-150 relative">
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
                      <span className="absolute top-1 left-1 bg-amber-500 text-white p-0.5 rounded-sm shadow-xs" title="Default Wallpaper">
                        <Star className="w-2.5 h-2.5 fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-0.5">
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

                  {/* Controls */}
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
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={img.isActive ? 'Active in rotation' : 'Inactive'}
                    >
                      {img.isActive ? 'Active' : 'Muted'}
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === config.images.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(img.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: ANIMATION & MOTION DYNAMICS */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900">Animation & Rotation Dynamics</h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">Cinematic Transitions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Transition Effect */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Animation Type</label>
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
                  <option value="ken-burns">Ken Burns Slow Zoom</option>
                  <option value="fade">Pure Smooth Crossfade</option>
                  <option value="pan">Cinematic Slow Pan</option>
                  <option value="zoom-fade">Zoom + Crossfade Hybrid</option>
                  <option value="slide">Horizontal Carousel Slide</option>
                </select>
                <p className="text-[10px] text-gray-400">
                  Controls the dynamic movement and transition effect between background wallpapers.
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
                  max={1.20}
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
                  <label className="text-xs font-bold text-gray-800">Crossfade / Transition Speed</label>
                  <span className="text-xs font-mono font-bold text-[#ff6452]">
                    {(config.transition_duration || (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.2)).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={config.transition_duration || (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.2)}
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

          {/* SECTION 4: GLASSMORPHISM & ATMOSPHERE */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900">Glassmorphism & Card Positioning</h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">Optical Layout</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Desktop Position */}
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
                  <option value="soft">Soft Gradient (Balanced)</option>
                  <option value="vignette">Cinematic Vignette (Dark Edges)</option>
                  <option value="radial">Radial Center Glow</option>
                  <option value="dark">Deep Tinted Dark</option>
                  <option value="none">Flat Uniform</option>
                </select>
              </div>

              {/* Overlay Darkness Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Overlay Tint Darkness</label>
                  <span className="text-xs font-mono font-bold text-[#ff6452]">
                    {Math.round(
                      typeof config.overlay_opacity === 'number'
                        ? (config.overlay_opacity <= 1 ? config.overlay_opacity * 100 : config.overlay_opacity)
                        : config.overlayDarkness
                    )}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  step={5}
                  value={Math.round(
                    typeof config.overlay_opacity === 'number'
                      ? (config.overlay_opacity <= 1 ? config.overlay_opacity * 100 : config.overlay_opacity)
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
                  <span>Subtle (10%)</span>
                  <span>Balanced (50%)</span>
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
                        ? (config.card_opacity <= 1 ? config.card_opacity * 100 : config.card_opacity)
                        : config.cardOpacity
                    )}%
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={2}
                  value={Math.round(
                    typeof config.card_opacity === 'number'
                      ? (config.card_opacity <= 1 ? config.card_opacity * 100 : config.card_opacity)
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
                  <span>Balanced (82%)</span>
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

              {/* Background Soft Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Background Image Blur</label>
                  <span className="text-xs font-mono font-bold text-[#ff6452]">
                    {config.overlayBlur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
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
                  <span>Soft Focus (2px)</span>
                  <span>Defocused (10px)</span>
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
                  <option value="none">No Border</option>
                  <option value="subtle">Subtle 1px Translucent</option>
                  <option value="medium">Medium 1px Crisp</option>
                  <option value="high">High Contrast 2px</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 5: AUTHENTICATION METHODS & HEADINGS */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900">Headings & Authentication Actions</h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400">Form Configuration</span>
            </div>

            {/* Login & Signup Headings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-3 bg-gray-50/60 rounded-2xl border border-gray-150">
                <h4 className="text-xs font-black text-gray-800">Sign In View Headings</h4>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">Title</label>
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
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">Subtitle</label>
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

              <div className="space-y-2 p-3 bg-gray-50/60 rounded-2xl border border-gray-150">
                <h4 className="text-xs font-black text-gray-800">Sign Up View Headings</h4>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">Title</label>
                  <input
                    type="text"
                    value={config.signup_title || 'Create your account'}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, signup_title: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white focus:border-[#ff6452] outline-hidden font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600">Subtitle</label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <GoogleIcon />
                  <span className="text-xs font-bold text-gray-800">Google Social Sign-in</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.show_google ?? true}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, show_google: e.target.checked }))
                  }
                  className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-2">
                  <AppleIcon />
                  <span className="text-xs font-bold text-gray-800">Apple Social Sign-in</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.show_apple ?? true}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, show_apple: e.target.checked }))
                  }
                  className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
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

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
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

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
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

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-white hover:bg-gray-50 cursor-pointer">
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
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW                                    */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900">Live Preview</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-medium">Auto-reflects your edits</span>
            </div>

            {/* Embedded LiveAuthPreview Component */}
            <LiveAuthPreview
              config={config}
              images={config.images}
              showControls={true}
              className="shadow-md"
            />

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Appearance</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
