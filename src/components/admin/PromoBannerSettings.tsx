import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  Image as ImageIcon,
  Video,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Layers,
  Layout,
  Play,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Palette,
  Check,
  HelpCircle,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Database,
  Code,
  ShieldCheck,
  Copy,
  Clock,
  Flame,
  Percent,
  Tag,
  ShoppingBag,
  TrendingUp,
  MousePointerClick,
  Smartphone,
  Monitor,
  Calendar,
  Star,
  AlertCircle,
  X,
  RefreshCw,
  BarChart3,
  Film,
  FileVideo,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  PromoBannerConfig,
  PromotionalBannerItem,
  BannerMediaType,
  BannerBadgeType,
  BannerTextPosition,
  BannerAspectRatio,
  Product,
} from '../../types';
import { DEFAULT_PROMO_BANNER, STORE_CONFIG } from '../../constants/config';
import { adminService } from '../../services/adminService';
import { productService } from '../../services/productService';
import {
  getBannerStatus,
  BADGE_PRESETS,
  BANNER_ASPECT_RATIOS,
  BANNER_ASPECT_RATIOS_MAP,
  VIDEO_REQUIREMENTS,
  validateBannerVideoFile,
  validateBannerMediaFile,
  optimizeBannerImage,
  formatBytes,
  formatVideoDuration,
  calculateCtr,
  calculateTimeRemaining,
} from '../../utils/bannerMediaHelper';

const BG_COLOR_PRESETS = [
  { name: 'Sky Blue (Default)', hex: '#eff6ff' },
  { name: 'Coral Mist', hex: '#fff1f0' },
  { name: 'Soft Amber', hex: '#fef3c7' },
  { name: 'Lavender Violet', hex: '#f5f3ff' },
  { name: 'Emerald Ice', hex: '#ecfdf5' },
  { name: 'Rose Blush', hex: '#fdf2f8' },
  { name: 'Slate Dark', hex: '#0f172a' },
];

const CTA_PRESETS = [
  'Shop Now',
  'Buy Now',
  'View Products',
  'Explore Collection',
  'Claim Offer',
  'Learn More',
  'Get Deal',
];

const CATEGORIES = [
  'Beauty',
  'Home',
  'Sports & Leisure',
  'Technology',
  'Books',
  'Others',
];

export const PromoBannerSettings: React.FC = () => {
  const { promoBanner, updatePromoBanner, showToast } = useShop();

  // Root configuration state
  const [formData, setFormData] = useState<PromoBannerConfig>(() => {
    const base = promoBanner || DEFAULT_PROMO_BANNER;
    return {
      ...DEFAULT_PROMO_BANNER,
      ...base,
      banners: Array.isArray(base.banners) ? base.banners : [],
    };
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'banners' | 'carousel' | 'analytics'>('banners');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'draft' | 'expired' | 'disabled'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBannerItem | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'desktop-video' | 'mobile-video' | 'image' | 'poster' | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [autoOptimize, setAutoOptimize] = useState(true);

  // Live Device Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0);

  // Delete Confirmation Modal State
  const [bannerToDelete, setBannerToDelete] = useState<PromotionalBannerItem | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  // Toggle master promotional banner storefront visibility
  const handleToggleStorefrontVisibility = async (newVal: boolean) => {
    try {
      setIsTogglingVisibility(true);
      const res = await adminService.setPromotionalBannerEnabled(newVal);
      if (res.success) {
        const updatedFormData = { ...formData, enabled: newVal, promotional_banner_enabled: newVal };
        setFormData(updatedFormData);
        await updatePromoBanner(updatedFormData);
        showToast(
          newVal
            ? 'Promotional banner is now ON and visible on the storefront.'
            : 'Promotional banner is now OFF and completely removed from the storefront.',
          'success'
        );
      } else {
        showToast(`Failed to update banner visibility: ${res.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error updating promotional banner visibility', 'error');
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  // Load products list for direct product selector in CTA
  useEffect(() => {
    productService
      .getProducts()
      .then((res) => setProductsCatalog(res))
      .catch((err) => console.warn('Could not load products for CTA picker:', err));
  }, []);

  // Fetch live banner settings directly from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingFresh(true);
    adminService
      .getPromoBanner()
      .then((liveConfig) => {
        if (isMounted && liveConfig) {
          setFormData(liveConfig);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch live promo banner from Supabase:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingFresh(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update local formData when context changes
  useEffect(() => {
    if (promoBanner) {
      setFormData((prev) => ({
        ...prev,
        ...promoBanner,
        banners: Array.isArray(promoBanner.banners)
          ? promoBanner.banners
          : Array.isArray(prev.banners)
          ? prev.banners
          : [],
      }));
    }
  }, [promoBanner]);

  // Analytics Metrics computation
  const bannersList = Array.isArray(formData.banners) ? formData.banners : [];
  const activeBannersCount = bannersList.filter((b) => getBannerStatus(b) === 'active').length;
  const totalImpressions = bannersList.reduce((sum, b) => sum + (b.impressionsCount || 0), 0);
  const totalClicks = bannersList.reduce((sum, b) => sum + (b.clicksCount || 0), 0);
  const overallCtr = calculateCtr(totalClicks, totalImpressions);

  // Best performing banner
  const topBanner = [...bannersList].sort(
    (a, b) => (b.clicksCount || 0) - (a.clicksCount || 0)
  )[0];

  // Helper to persist to Supabase, update context, and re-fetch to confirm live database state
  const persistBannerConfig = async (
    configToSave: PromoBannerConfig,
    successMessage: string = 'Promotional Banner configuration saved successfully!'
  ) => {
    try {
      setIsSaving(true);
      const res = await adminService.savePromoBanner(configToSave);
      if (res.success) {
        // Sync context
        await updatePromoBanner(configToSave);
        // Re-fetch from Supabase to guarantee UI shows the true remote database state
        const freshConfig = await adminService.getPromoBanner();
        setFormData(freshConfig);
        showToast(successMessage, 'success');
      } else {
        showToast(`Failed to save to database: ${res.error || 'Unknown error'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating promotional banner settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save changes to Database & Context
  const handleSaveAll = async () => {
    await persistBannerConfig(formData, 'Promotional Banner configuration published successfully!');
  };

  // Reorder banners (Move Up / Down) and persist
  const handleMoveBanner = async (index: number, direction: 'up' | 'down') => {
    const list = [...bannersList];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // update displayOrder
    const updated = list.map((b, i) => ({ ...b, displayOrder: i + 1 }));
    const newConfig = { ...formData, banners: updated };
    setFormData(newConfig);
    await persistBannerConfig(newConfig, 'Banner display order updated.');
  };

  // Toggle Featured and persist
  const handleToggleFeatured = async (bannerId: string) => {
    const updated = bannersList.map((b) => ({
      ...b,
      isFeatured: b.id === bannerId ? !b.isFeatured : false, // only 1 primary featured
    }));
    const newConfig = { ...formData, banners: updated };
    setFormData(newConfig);
    await persistBannerConfig(newConfig, 'Featured banner preference updated.');
  };

  // Toggle Enabled/Disabled and persist
  const handleToggleEnabled = async (bannerId: string) => {
    let willBeEnabled = true;
    const updated = bannersList.map((b) => {
      if (b.id === bannerId) {
        willBeEnabled = b.isEnabled === false;
        return { ...b, isEnabled: willBeEnabled };
      }
      return b;
    });
    const newConfig = { ...formData, banners: updated };
    setFormData(newConfig);
    await persistBannerConfig(
      newConfig,
      willBeEnabled ? 'Banner enabled and published.' : 'Banner disabled and hidden.'
    );
  };

  // Duplicate Banner and persist
  const handleDuplicateBanner = async (banner: PromotionalBannerItem) => {
    const clone: PromotionalBannerItem = {
      ...banner,
      id: `banner-${Date.now()}`,
      title: `${banner.title} (Copy)`,
      displayOrder: bannersList.length + 1,
      isFeatured: false,
      impressionsCount: 0,
      clicksCount: 0,
      conversionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...bannersList, clone];
    const newConfig = { ...formData, banners: updated };
    setFormData(newConfig);
    await persistBannerConfig(newConfig, `Duplicated banner "${banner.title}".`);
  };

  // Open Editor for new banner
  const handleCreateNew = () => {
    const defaultRatio: BannerAspectRatio = formData.aspectRatio || '1:1';
    const newBanner: PromotionalBannerItem = {
      id: `banner-${Date.now()}`,
      title: 'Special Promotion 🔥',
      subtitle: 'Exclusive discounts on top products',
      description: 'Nationwide delivery with fast checkout.',
      mediaType: 'image',
      mediaUrl: '',
      aspectRatio: defaultRatio,
      showBadge: true,
      badgeType: 'HOT DEAL',
      badgeCustomText: 'HOT DEAL 🔥',
      badgeColor: '#ff6452',
      showDiscount: false,
      discountPercentage: 0,
      showCountdown: false,
      showCta: true,
      ctaText: 'Shop Now',
      ctaStyle: 'solid-accent',
      linkType: 'category',
      targetCategory: 'Technology',
      ctaLink: '/categories/technology',
      textPosition: 'beside-split',
      overlayDimming: 45,
      overlayStyle: 'gradient',
      backgroundColor: '#eff6ff',
      textColor: 'dark',
      videoControls: true,
      mobileVideoFocalPosition: 'center',
      videoAutoplay: true,
      videoMuted: true,
      videoLoop: true,
      videoPlaysInline: true,
      isDraft: false,
      isEnabled: true,
      isFeatured: bannersList.length === 0,
      displayOrder: bannersList.length + 1,
      impressionsCount: 0,
      clicksCount: 0,
      conversionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingBanner(newBanner);
    setIsEditorOpen(true);
  };

  // Open Editor for existing banner
  const handleEditBanner = (banner: PromotionalBannerItem) => {
    setEditingBanner({
      aspectRatio: '1:1',
      videoControls: banner.videoControls !== false,
      mobileVideoFocalPosition: banner.mobileVideoFocalPosition || 'center',
      ...banner,
    });
    setIsEditorOpen(true);
  };

  // Save Banner from Editor Modal and persist immediately to Supabase
  const handleSaveBannerInModal = async () => {
    if (!editingBanner) return;

    if (!editingBanner.title.trim()) {
      showToast('Banner title is required.', 'error');
      return;
    }

    const exists = bannersList.some((b) => b.id === editingBanner.id);
    let updatedList: PromotionalBannerItem[];

    if (exists) {
      updatedList = bannersList.map((b) =>
        b.id === editingBanner.id ? { ...editingBanner, updatedAt: new Date().toISOString() } : b
      );
    } else {
      updatedList = [...bannersList, { ...editingBanner, updatedAt: new Date().toISOString() }];
    }

    // Ensure display orders
    updatedList = updatedList.map((b, idx) => ({ ...b, displayOrder: idx + 1 }));

    const newConfig = { ...formData, banners: updatedList };
    setFormData(newConfig);
    setIsEditorOpen(false);
    setEditingBanner(null);
    await persistBannerConfig(
      newConfig,
      exists ? 'Banner updated and saved successfully!' : 'New banner created and saved successfully!'
    );
  };

  // Confirm Delete and persist to Supabase
  const handleConfirmDelete = async () => {
    if (!bannerToDelete) return;
    const updated = bannersList.filter((b) => b.id !== bannerToDelete.id);
    const newConfig = { ...formData, banners: updated };
    setFormData(newConfig);
    setBannerToDelete(null);
    await persistBannerConfig(newConfig, 'Banner deleted and updated successfully.');
  };

  // Reset Analytics Counters and persist
  const handleResetAnalytics = async () => {
    if (window.confirm('Reset all impression and click analytics for all banners?')) {
      const updated = bannersList.map((b) => ({
        ...b,
        impressionsCount: 0,
        clicksCount: 0,
        conversionsCount: 0,
        revenueGenerated: 0,
      }));
      const newConfig = { ...formData, banners: updated };
      setFormData(newConfig);
      await persistBannerConfig(newConfig, 'Banner analytics reset.');
    }
  };

  // Upload Desktop Video (1920×1080 16:9, max 25MB, max 30s)
  const handleDesktopVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    e.target.value = '';

    setIsUploadingMedia(true);
    setUploadTarget('desktop-video');
    setUploadProgress(15);
    setUploadingFileName(`${file.name} (${formatBytes(file.size)})`);

    try {
      const outcome = await validateBannerVideoFile(file, 'desktop');
      if (!outcome.isValid) {
        showToast(outcome.error || 'Invalid desktop video file.', 'error');
        return;
      }

      setUploadProgress(40);
      const url = await adminService.uploadMedia(file, 'banner');
      setUploadProgress(90);

      const posterUrl = editingBanner.mediaPosterUrl;

      setUploadProgress(95);

      setEditingBanner((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          desktopVideoUrl: url,
          desktopVideoMetadata: outcome.metadata,
          mediaType: 'video',
          mediaUrl: url,
          mediaPosterUrl: posterUrl,
        };
      });

      setUploadProgress(100);
      showToast(
        `Desktop Video (${outcome.metadata?.resolution || '1920×1080'}, ${formatBytes(file.size)}) uploaded successfully!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Desktop video upload failed.', 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      setUploadTarget(null);
      setUploadingFileName('');
    }
  };

  // Upload Mobile Video (1080×1350 4:5, max 25MB, max 30s)
  const handleMobileVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    e.target.value = '';

    setIsUploadingMedia(true);
    setUploadTarget('mobile-video');
    setUploadProgress(15);
    setUploadingFileName(`${file.name} (${formatBytes(file.size)})`);

    try {
      const outcome = await validateBannerVideoFile(file, 'mobile');
      if (!outcome.isValid) {
        showToast(outcome.error || 'Invalid mobile video file.', 'error');
        return;
      }

      setUploadProgress(40);
      const url = await adminService.uploadMedia(file, 'banner');
      setUploadProgress(85);

      setEditingBanner((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          mobileVideoUrl: url,
          mobileVideoMetadata: outcome.metadata,
          mediaType: 'video',
        };
      });

      setUploadProgress(100);
      showToast(
        `Mobile Video (${outcome.metadata?.resolution || '1080×1350'}, ${formatBytes(file.size)}) uploaded successfully!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Mobile video upload failed.', 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      setUploadTarget(null);
      setUploadingFileName('');
    }
  };

  // Upload Promotional Image / Fallback Still
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    e.target.value = '';

    const validation = validateBannerMediaFile(file);
    if (!validation.isValid || validation.mediaType !== 'image') {
      showToast(validation.error || 'Please select a valid image (JPG, PNG, WebP).', 'error');
      return;
    }

    try {
      setIsUploadingMedia(true);
      setUploadTarget('image');
      setUploadProgress(20);
      setUploadingFileName(`${file.name} (${formatBytes(file.size)})`);

      let fileToUpload = file;
      const targetRatio = editingBanner.aspectRatio || '1:1';

      if (autoOptimize) {
        setUploadProgress(45);
        fileToUpload = await optimizeBannerImage(file, targetRatio, 0.88);
      }

      setUploadProgress(70);
      const url = await adminService.uploadMedia(fileToUpload, 'banner');
      setUploadProgress(95);

      setEditingBanner((prev) => {
        if (!prev) return null;
        const hasVideos = !!(prev.desktopVideoUrl || prev.mobileVideoUrl);
        return {
          ...prev,
          mediaUrl: url,
          mediaType: hasVideos ? 'video' : 'image',
          mediaPosterUrl: prev.mediaPosterUrl || url,
        };
      });

      setUploadProgress(100);
      showToast(`${targetRatio} Promotional image uploaded successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Image upload failed.', 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      setUploadTarget(null);
      setUploadingFileName('');
    }
  };

  // Upload Poster Frame / Video Thumbnail
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    e.target.value = '';

    const validation = validateBannerMediaFile(file);
    if (!validation.isValid || validation.mediaType !== 'image') {
      showToast('Please select a valid image (JPG, PNG, WebP) for thumbnail.', 'error');
      return;
    }

    try {
      setIsUploadingMedia(true);
      setUploadTarget('poster');
      setUploadProgress(25);
      setUploadingFileName(`${file.name} (${formatBytes(file.size)})`);

      let fileToUpload = file;
      if (autoOptimize) {
        fileToUpload = await optimizeBannerImage(file, editingBanner.aspectRatio || '1:1', 0.85);
      }

      setUploadProgress(70);
      const url = await adminService.uploadMedia(fileToUpload, 'banner');
      setUploadProgress(100);

      setEditingBanner((prev) => (prev ? { ...prev, mediaPosterUrl: url } : null));
      showToast('Custom poster thumbnail uploaded!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Poster upload failed.', 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      setUploadTarget(null);
      setUploadingFileName('');
    }
  };

  const handleRemoveDesktopVideo = () => {
    if (!editingBanner) return;
    const hasMobileVideo = !!editingBanner.mobileVideoUrl;
    setEditingBanner({
      ...editingBanner,
      desktopVideoUrl: undefined,
      desktopVideoMetadata: undefined,
      mediaUrl: editingBanner.mediaUrl === editingBanner.desktopVideoUrl ? '' : editingBanner.mediaUrl,
      mediaType: hasMobileVideo ? 'video' : 'image',
    });
    showToast('Desktop video removed.', 'info');
  };

  const handleRemoveMobileVideo = () => {
    if (!editingBanner) return;
    const hasDesktopVideo = !!editingBanner.desktopVideoUrl;
    setEditingBanner({
      ...editingBanner,
      mobileVideoUrl: undefined,
      mobileVideoMetadata: undefined,
      mediaType: hasDesktopVideo ? 'video' : 'image',
    });
    showToast('Mobile video removed (storefront will crop desktop video).', 'info');
  };

  const handleRemovePoster = () => {
    if (!editingBanner) return;
    setEditingBanner({
      ...editingBanner,
      mediaPosterUrl: undefined,
    });
    showToast('Custom poster thumbnail removed.', 'info');
  };

  const handleRemoveImage = () => {
    if (!editingBanner) return;
    setEditingBanner({
      ...editingBanner,
      mediaUrl: editingBanner.desktopVideoUrl || '',
    });
    showToast('Promotional image removed.', 'info');
  };

  // Filtered banners
  const filteredBanners = bannersList.filter((b) => {
    if (statusFilter === 'all') return true;
    return getBannerStatus(b) === statusFilter;
  });

  return (
    <div id="promotional-banner-management-root" className="space-y-6">
      {/* Top Header & Save Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff6452] to-rose-600 text-white flex items-center justify-center shadow-md">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Promotional Banner Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              1080 × 1080 px (1:1 square) media, responsive video carousels & flash sales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Device Frame Preview Button */}
          <button
            type="button"
            onClick={() => {
              setPreviewBannerIndex(0);
              setIsPreviewModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#ff6452]" />
            <span>Live Device Preview</span>
          </button>

          {/* Save All Changes Button */}
          <button
            id="save-promo-banners-btn"
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#ff6452] text-white hover:bg-[#e85340] active:scale-98 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Publishing...' : 'Save & Publish'}</span>
          </button>
        </div>
      </div>

      {/* Master Promotional Banner Storefront Visibility Control */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-all shadow-xs ${
        formData.enabled
          ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300 dark:border-emerald-800/80'
          : 'bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-800/60 dark:via-slate-800/30 border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
              formData.enabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {formData.enabled ? <Sparkles className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Promotional Banner Storefront Visibility
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  formData.enabled
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                }`}>
                  {formData.enabled ? 'ON (VISIBLE)' : 'OFF (HIDDEN)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {formData.enabled
                  ? 'The promotional banner is currently active and visible on the customer storefront. Toggling OFF removes it completely without deleting any banners, images, videos, or copy.'
                  : 'The promotional banner is currently completely hidden from the storefront. All banners, images, videos, and settings remain safely preserved and will restore instantly when turned ON.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <button
              id="toggle-storefront-banner-visibility-btn"
              type="button"
              disabled={isTogglingVisibility || isSaving}
              onClick={() => handleToggleStorefrontVisibility(!formData.enabled)}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center gap-2 ${
                formData.enabled
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              {isTogglingVisibility ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : formData.enabled ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Turn OFF Banner</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Turn ON Banner</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Promotions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {activeBannersCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {bannersList.length} total</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Impressions</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalImpressions.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total CTA Clicks</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {totalClicks.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Click Rate (CTR)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {overallCtr}%
            </span>
            <span className="text-xs text-emerald-600 font-bold">Good conversion</span>
          </div>
        </div>
      </div>

      {/* Supabase Storage Sync Notice */}
      <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 dark:text-emerald-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                Store Database 'settings' Table Persistence
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-600/20 text-emerald-800 dark:text-emerald-300">
                Live & Synced
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-400 font-medium">
              Promotional banners, 1080×1080 media, videos, schedules & analytics are stored in database <code className="bg-white/80 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-900 dark:text-emerald-200 font-mono text-[10px]">public.settings (key='banner_config')</code>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSqlSchema(!showSqlSchema)}
          className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 bg-white/80 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-700 transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-2xs"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}</span>
        </button>
      </div>

      {showSqlSchema && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs font-mono border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>PostgreSQL Schema for 'settings' Table:</span>
            <span className="text-emerald-400">Ready</span>
          </div>
          <pre className="bg-slate-950 p-3 rounded-xl overflow-x-auto text-[11px] text-emerald-300">
{`CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS Policy: Public read, Admin write
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin upsert settings" ON public.settings FOR ALL USING (true);`}
          </pre>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'banners'
                ? 'bg-[#ff6452] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Promotional Banners ({bannersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carousel')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'carousel'
                ? 'bg-[#ff6452] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Carousel & Display Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-[#ff6452] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Performance</span>
          </button>
        </div>

        {activeTab === 'banners' && (
          <button
            id="create-new-banner-btn"
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#ff6452]" />
            <span>Create New Banner</span>
          </button>
        )}
      </div>

      {/* TAB 1: BANNERS LIST & MANAGEMENT */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All Banners' },
              { id: 'active', label: 'Active' },
              { id: 'scheduled', label: 'Scheduled' },
              { id: 'draft', label: 'Drafts' },
              { id: 'expired', label: 'Expired' },
              { id: 'disabled', label: 'Disabled' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Banners Cards List */}
          {filteredBanners.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center mx-auto">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                No promotional banners found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Create a 1080×1080 square visual promotion with promotional video or image, countdown timers, and discount tags.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-[#ff6452] text-white hover:bg-[#e85340] transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Banner</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBanners.map((banner, index) => {
                const status = getBannerStatus(banner);
                const ctr = calculateCtr(banner.clicksCount, banner.impressionsCount);

                return (
                  <div
                    key={banner.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#ff6452]/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                  >
                    {/* Left: Reorder arrows + 1:1 Thumbnail + Details */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Order Controls */}
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleMoveBanner(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:text-[#ff6452] disabled:opacity-20 cursor-pointer"
                          title="Move up in carousel order"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-black text-slate-400">#{banner.displayOrder}</span>
                        <button
                          type="button"
                          onClick={() => handleMoveBanner(index, 'down')}
                          disabled={index === filteredBanners.length - 1}
                          className="p-1 hover:text-[#ff6452] disabled:opacity-20 cursor-pointer"
                          title="Move down in carousel order"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Thumbnail with Dynamic Aspect Ratio */}
                      <div
                        className={`relative rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs ${
                          banner.aspectRatio === '16:9'
                            ? 'w-24 sm:w-28 aspect-[16/9]'
                            : banner.aspectRatio === '4:3'
                            ? 'w-20 sm:w-24 aspect-[4/3]'
                            : 'w-20 sm:w-24 aspect-square'
                        }`}
                      >
                        {banner.mediaType === 'video' ? (
                          <div className="w-full h-full relative">
                            {banner.mediaPosterUrl ? (
                              <img
                                src={banner.mediaPosterUrl}
                                alt="Poster"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={banner.mediaUrl}
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play className="w-5 h-5 text-white" />
                            </div>
                            <span className="absolute bottom-1 left-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-black/70 text-white">
                              VIDEO
                            </span>
                          </div>
                        ) : banner.mediaUrl ? (
                          <img
                            src={banner.mediaUrl}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}

                        {banner.isFeatured && (
                          <div className="absolute top-1 right-1 bg-amber-400 text-amber-950 p-1 rounded-full shadow-xs">
                            <Star className="w-3 h-3 fill-amber-950" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={status} />
                          {/* Aspect Ratio Badge */}
                          <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            📐 {banner.aspectRatio || '1:1'}
                          </span>
                          {banner.showBadge && (
                            <span
                              style={{ backgroundColor: banner.badgeColor || '#ff6452' }}
                              className="text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase"
                            >
                              {banner.badgeCustomText || banner.badgeType || 'SALE'}
                            </span>
                          )}
                          {banner.showDiscount && banner.discountPercentage && (
                            <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                              {banner.discountPercentage}% OFF
                            </span>
                          )}
                          {banner.desktopVideoUrl && (
                            <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Monitor className="w-3 h-3" /> 16:9 Video
                            </span>
                          )}
                          {banner.mobileVideoUrl && (
                            <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Smartphone className="w-3 h-3" /> 4:5 Mobile
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                          {banner.title}
                        </h3>

                        {banner.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                            {banner.subtitle}
                          </p>
                        )}

                        {/* CTA destination & scheduling info */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                            <Tag className="w-3 h-3 text-[#ff6452]" />
                            <span>CTA: "{banner.ctaText || 'Shop Now'}"</span>
                          </span>

                          {banner.targetCategory && (
                            <span>Category: {banner.targetCategory}</span>
                          )}

                          {banner.startDate && (
                            <span>Start: {new Date(banner.startDate).toLocaleDateString()}</span>
                          )}
                          {banner.endDate && (
                            <span>End: {new Date(banner.endDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Performance + Action Buttons */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 sm:gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      {/* Mini Analytics Pill */}
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl text-[11px]">
                        <div className="text-center">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {(banner.impressionsCount || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase">Views</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <div className="font-bold text-[#ff6452]">
                            {(banner.clicksCount || 0).toLocaleString()}
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase">Clicks</div>
                        </div>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {ctr}%
                          </div>
                          <div className="text-[9px] text-slate-400 uppercase">CTR</div>
                        </div>
                      </div>

                      {/* Featured Star Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(banner.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          banner.isFeatured
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border-amber-300'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500'
                        }`}
                        title={banner.isFeatured ? 'Primary featured banner' : 'Mark as primary featured'}
                      >
                        <Star className={`w-4 h-4 ${banner.isFeatured ? 'fill-amber-500' : ''}`} />
                      </button>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(banner.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          banner.isEnabled !== false
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 border-rose-300'
                        }`}
                        title={banner.isEnabled !== false ? 'Enabled on storefront' : 'Disabled (Hidden)'}
                      >
                        {banner.isEnabled !== false ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>

                      {/* Duplicate Button */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateBanner(banner)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Duplicate Banner"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleEditBanner(banner)}
                        className="px-4 py-2 rounded-xl font-bold text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                      >
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setBannerToDelete(banner)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GLOBAL CAROUSEL & DISPLAY SETTINGS */}
      {activeTab === 'carousel' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#ff6452]" />
            <span>Storefront Carousel & Presentation Behavior</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Aspect Ratio Selection */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Default Banner Aspect Ratio
                </span>
                <span className="text-xs text-slate-500">
                  Select default display ratio for homepage promotional banners (can be adjusted per banner in editor).
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {BANNER_ASPECT_RATIOS.map((rConfig) => {
                  const isSelected = (formData.aspectRatio || '1:1') === rConfig.id;
                  return (
                    <button
                      key={rConfig.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, aspectRatio: rConfig.id })}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'border-[#ff6452] bg-rose-50/60 dark:bg-rose-950/30 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{rConfig.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#ff6452]" />}
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        {rConfig.recommendedResolution} ({rConfig.description || rConfig.sublabel})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global Enable */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Show Promotional Banners on Storefront
                </span>
                <span className="text-xs text-slate-500">
                  Toggle all promotional displays across the homepage.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
              />
            </div>

            {/* Auto-Rotation Toggle */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Automatic Slide Rotation
                </span>
                <span className="text-xs text-slate-500">
                  Automatically cycle through active promotions.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.carouselAutoplay !== false}
                onChange={(e) =>
                  setFormData({ ...formData, carouselAutoplay: e.target.checked })
                }
                className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
              />
            </div>

            {/* Slide Interval Slider */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900 dark:text-white">
                  Slide Rotation Interval
                </span>
                <span className="font-mono font-bold text-[#ff6452]">
                  {formData.carouselInterval || 5} Seconds
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={formData.carouselInterval || 5}
                onChange={(e) =>
                  setFormData({ ...formData, carouselInterval: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#ff6452] cursor-pointer"
              />
              <span className="text-[11px] text-slate-500 block">
                Recommended 5-7 seconds to allow customers to read details comfortably.
              </span>
            </div>

            {/* Pause on Hover */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Pause Rotation on Hover & Touch
                </span>
                <span className="text-xs text-slate-500">
                  Temporarily pause timer when customer hovers cursor or touches slide.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.pauseOnHover !== false}
                onChange={(e) => setFormData({ ...formData, pauseOnHover: e.target.checked })}
                className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
              />
            </div>

            {/* Show Navigation Arrows */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Carousel Navigation Arrows
                </span>
                <span className="text-xs text-slate-500">
                  Show sleek previous & next hover buttons.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.showNavigationArrows !== false}
                onChange={(e) =>
                  setFormData({ ...formData, showNavigationArrows: e.target.checked })
                }
                className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
              />
            </div>

            {/* Show Pagination Indicators */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  Slide Progress Indicator Dots
                </span>
                <span className="text-xs text-slate-500">
                  Show bottom progress indicators.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.showIndicators !== false}
                onChange={(e) =>
                  setFormData({ ...formData, showIndicators: e.target.checked })
                }
                className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BANNER ANALYTICS & PERFORMANCE REPORT */}
      {activeTab === 'analytics' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#ff6452]" />
                <span>Banner Campaign Performance & CTR Insights</span>
              </h2>
              <p className="text-xs text-slate-500">
                Track views, direct CTA clicks, and conversion effectiveness for every promotion.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResetAnalytics}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Counters</span>
            </button>
          </div>

          {/* Performance Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Promotion Banner</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Target Destination</th>
                  <th className="p-3.5 text-right">Impressions</th>
                  <th className="p-3.5 text-right">CTA Clicks</th>
                  <th className="p-3.5 text-right">CTR (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bannersList.map((banner) => {
                  const ctr = calculateCtr(banner.clicksCount, banner.impressionsCount);
                  const status = getBannerStatus(banner);

                  return (
                    <tr key={banner.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                          {banner.mediaPosterUrl || banner.mediaUrl ? (
                            <img
                              src={banner.mediaPosterUrl || banner.mediaUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {banner.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {banner.subtitle || 'No subtitle'}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={status} />
                      </td>

                      <td className="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {banner.targetCategory
                          ? `Category: ${banner.targetCategory}`
                          : banner.targetProductId
                          ? `Product: ${banner.targetProductId}`
                          : banner.ctaLink || '/search'}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {(banner.impressionsCount || 0).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-[#ff6452]">
                        {(banner.clicksCount || 0).toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {ctr}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANNER EDITOR MODAL / DRAWER                                              */}
      {/* ========================================================================= */}
      {isEditorOpen && editingBanner && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ff6452] text-white flex items-center justify-center shadow-xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingBanner.title ? `Edit Banner: ${editingBanner.title}` : 'Create Promotional Banner'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {BANNER_ASPECT_RATIOS_MAP[editingBanner.aspectRatio || '1:1']?.label || '1:1'} (
                    {BANNER_ASPECT_RATIOS_MAP[editingBanner.aspectRatio || '1:1']?.recommendedResolution || '1080 × 1080 px'}) media format with video, countdowns & discount badges
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingBanner(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* SECTION A: BANNER ASPECT RATIO & MEDIA UPLOADER */}
              <div className="space-y-4">
                {/* 1. Aspect Ratio Selector (1:1, 4:3, 16:9) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#ff6452]" />
                      <span>Banner Aspect Ratio</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#ff6452]">
                      Current: {editingBanner.aspectRatio || '1:1'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {BANNER_ASPECT_RATIOS.map((rConfig) => {
                      const isSelected = (editingBanner.aspectRatio || '1:1') === rConfig.id;

                      return (
                        <button
                          key={rConfig.id}
                          type="button"
                          onClick={() =>
                            setEditingBanner({
                              ...editingBanner,
                              aspectRatio: rConfig.id,
                            })
                          }
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'border-[#ff6452] bg-rose-50/70 dark:bg-rose-950/40 text-slate-900 dark:text-white shadow-xs ring-2 ring-[#ff6452]/20'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Visual Mini Aspect Ratio Box */}
                              <div
                                className={`rounded border ${
                                  isSelected
                                    ? 'border-[#ff6452] bg-[#ff6452]/20'
                                    : 'border-slate-400 bg-slate-200 dark:bg-slate-700'
                                } ${
                                  rConfig.id === '16:9'
                                    ? 'w-6 h-3.5'
                                    : rConfig.id === '4:3'
                                    ? 'w-5 h-3.5'
                                    : 'w-4 h-4'
                                }`}
                              />
                              <span className="text-xs font-black">{rConfig.label}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-[#ff6452]" />}
                          </div>

                          <div>
                            <span className="text-[11px] font-bold block text-slate-900 dark:text-white">
                              {rConfig.recommendedResolution}
                            </span>
                            <span className="text-[10px] text-slate-500 block leading-tight">
                              {rConfig.description || rConfig.sublabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Uploading Status Overlay / Banner */}
                {isUploadingMedia && (
                  <div className="p-4 rounded-2xl bg-[#ff6452]/10 border border-[#ff6452]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-[#ff6452] animate-spin" />
                        <span>
                          {uploadTarget === 'desktop-video'
                            ? 'Uploading & Validating Desktop Video (16:9)...'
                            : uploadTarget === 'mobile-video'
                            ? 'Uploading & Validating Mobile Video (4:5)...'
                            : uploadTarget === 'poster'
                            ? 'Uploading Poster Thumbnail...'
                            : 'Uploading & Optimizing Media...'}
                        </span>
                      </div>
                      <span className="text-[#ff6452] font-black">{uploadProgress || 20}%</span>
                    </div>
                    {uploadingFileName && (
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {uploadingFileName}
                      </p>
                    )}
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#ff6452] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress || 20}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 2. DUAL VIDEO MANAGEMENT: DESKTOP & MOBILE UPLOADS */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#ff6452]" />
                        <span>Promotional Video Streams (Desktop & Mobile)</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Upload dedicated desktop (16:9) and mobile (4:5) videos for high-performance responsive streaming.
                      </p>
                    </div>
                    {(editingBanner.desktopVideoUrl || editingBanner.mobileVideoUrl) && (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Video Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Desktop Video Field */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-sky-500" />
                          <label className="text-xs font-black text-slate-900 dark:text-white">
                            Desktop Video
                          </label>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                          16:9 Widescreen
                        </span>
                      </div>

                      {/* Desktop Video Requirements Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Requirements:</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Strictly validated</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                          <li>• <strong>Resolution:</strong> 1920×1080 px (16:9)</li>
                          <li>• <strong>Max Size:</strong> 25 MB</li>
                          <li>• <strong>Max Duration:</strong> 30 seconds</li>
                          <li>• <strong>Max FPS:</strong> 30 FPS</li>
                          <li>• <strong>Formats:</strong> MP4 (H.264), WebM</li>
                          <li>• <strong>Bitrate:</strong> 2–5 Mbps</li>
                        </ul>
                      </div>

                      {/* Preview if uploaded */}
                      {editingBanner.desktopVideoUrl ? (
                        <div className="space-y-2">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-700">
                            <video
                              src={editingBanner.desktopVideoUrl}
                              poster={editingBanner.mediaPosterUrl}
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Monitor className="w-3 h-3 text-sky-400" />
                              <span>1920×1080 (16:9)</span>
                            </div>
                          </div>

                          {editingBanner.desktopVideoMetadata && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {editingBanner.desktopVideoMetadata.resolution}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {formatBytes(editingBanner.desktopVideoMetadata.sizeBytes)}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {formatVideoDuration(editingBanner.desktopVideoMetadata.durationSeconds)}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {editingBanner.desktopVideoMetadata.fps} FPS
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-[#ff6452]" />
                              <span>Replace Desktop Video</span>
                              <input
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={handleDesktopVideoUpload}
                                disabled={isUploadingMedia}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveDesktopVideo}
                              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="w-full flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6452] dark:hover:border-[#ff6452] transition-colors cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <FileVideo className="w-8 h-8 text-sky-500 mb-1.5" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Upload Desktop Video
                            </span>
                            <span className="text-[10px] text-slate-500">
                              MP4 (H.264) or WebM, 1920×1080 16:9, max 25 MB
                            </span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={handleDesktopVideoUpload}
                              disabled={isUploadingMedia}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Mobile Video Field (Optional) */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-purple-500" />
                          <label className="text-xs font-black text-slate-900 dark:text-white">
                            Mobile Video
                          </label>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          4:5 Portrait (Optional)
                        </span>
                      </div>

                      {/* Mobile Video Requirements Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Requirements:</span>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Dedicated 4:5 Stream</span>
                        </div>
                        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                          <li>• <strong>Resolution:</strong> 1080×1350 px (4:5)</li>
                          <li>• <strong>Max Size:</strong> 25 MB</li>
                          <li>• <strong>Max Duration:</strong> 30 seconds</li>
                          <li>• <strong>Max FPS:</strong> 30 FPS</li>
                          <li>• <strong>Formats:</strong> MP4 (H.264), WebM</li>
                          <li>• <strong>Bitrate:</strong> 2–5 Mbps</li>
                        </ul>
                      </div>

                      {/* Preview if uploaded */}
                      {editingBanner.mobileVideoUrl ? (
                        <div className="space-y-2">
                          <div className="relative max-w-[200px] mx-auto aspect-[4/5] rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-700">
                            <video
                              src={editingBanner.mobileVideoUrl}
                              poster={editingBanner.mediaPosterUrl}
                              autoPlay
                              muted
                              loop
                              playsInline
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <Smartphone className="w-3 h-3 text-purple-400" />
                              <span>1080×1350 (4:5)</span>
                            </div>
                          </div>

                          {editingBanner.mobileVideoMetadata && (
                            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {editingBanner.mobileVideoMetadata.resolution}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {formatBytes(editingBanner.mobileVideoMetadata.sizeBytes)}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {formatVideoDuration(editingBanner.mobileVideoMetadata.durationSeconds)}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded font-mono">
                                {editingBanner.mobileVideoMetadata.fps} FPS
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-center gap-2 pt-1">
                            <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-[#ff6452]" />
                              <span>Replace Mobile Video</span>
                              <input
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={handleMobileVideoUpload}
                                disabled={isUploadingMedia}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveMobileVideo}
                              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="w-full flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6452] dark:hover:border-[#ff6452] transition-colors cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/30">
                            <Smartphone className="w-8 h-8 text-purple-500 mb-1.5" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Upload Mobile Video (Optional)
                            </span>
                            <span className="text-[10px] text-slate-500">
                              MP4 or WebM, 1080×1350 4:5 portrait
                            </span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={handleMobileVideoUpload}
                              disabled={isUploadingMedia}
                              className="hidden"
                            />
                          </label>
                          <p className="text-[10px] text-slate-500 text-center">
                            💡 If no mobile video is uploaded, the desktop video is automatically cropped to 4:5 using your chosen focal alignment.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Poster Thumbnail & Admin Video Settings */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#ff6452]" />
                      <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Video Playback & Responsive Settings
                      </h5>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      {/* Left: Poster / Thumbnail */}
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Poster / Video Thumbnail
                        </label>
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-300 dark:border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {editingBanner.mediaPosterUrl ? (
                              <img
                                src={editingBanner.mediaPosterUrl}
                                alt="Poster thumbnail"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-slate-800 dark:text-slate-200">
                              <Upload className="w-3 h-3 text-[#ff6452]" />
                              <span>{editingBanner.mediaPosterUrl ? 'Change Poster' : 'Upload Poster'}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePosterUpload}
                                disabled={isUploadingMedia}
                                className="hidden"
                              />
                            </label>
                            {editingBanner.mediaPosterUrl && (
                              <button
                                type="button"
                                onClick={handleRemovePoster}
                                className="text-[10px] text-rose-600 hover:underline block cursor-pointer"
                              >
                                Remove custom poster
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          Displays instantly while video loads, or when reduced-motion/data-saver is active.
                        </span>
                      </div>

                      {/* Center: Mobile Focal Position for Desktop Video Cropping */}
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Mobile Video Focal Position
                        </label>
                        <p className="text-[10px] text-slate-500">
                          When cropping Desktop Video for mobile devices:
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['left', 'center', 'right'] as const).map((pos) => {
                            const isSelected = (editingBanner.mobileVideoFocalPosition || 'center') === pos;
                            return (
                              <button
                                key={pos}
                                type="button"
                                onClick={() =>
                                  setEditingBanner({ ...editingBanner, mobileVideoFocalPosition: pos })
                                }
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-[#ff6452] text-white border-[#ff6452] shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {pos === 'center' ? 'Center ⭐' : pos}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Controls & Autoplay Switches */}
                      <div className="md:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Interactive Controls & Playback
                        </label>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBanner.videoControls !== false}
                              onChange={(e) =>
                                setEditingBanner({ ...editingBanner, videoControls: e.target.checked })
                              }
                              className="accent-[#ff6452] rounded w-4 h-4"
                            />
                            <span>Enable Video Controls (Play/Pause, Mute)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBanner.videoAutoplay !== false}
                              onChange={(e) =>
                                setEditingBanner({ ...editingBanner, videoAutoplay: e.target.checked })
                              }
                              className="accent-[#ff6452] rounded w-4 h-4"
                            />
                            <span>Autoplay video (muted by browser policy)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBanner.videoLoop !== false}
                              onChange={(e) =>
                                setEditingBanner({ ...editingBanner, videoLoop: e.target.checked })
                              }
                              className="accent-[#ff6452] rounded w-4 h-4"
                            />
                            <span>Loop video continuously</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PROMOTIONAL IMAGE (FALLBACK & STANDARD STILL MEDIA) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#ff6452]" />
                        <span>Promotional Image / Fallback Still</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Used as the primary banner image, or as silent fallback if video fails or when user enables Reduced Motion.
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoOptimize}
                        onChange={(e) => setAutoOptimize(e.target.checked)}
                        className="accent-[#ff6452] rounded"
                      />
                      <span>Auto-crop to {editingBanner.aspectRatio || '1:1'} WebP</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-3 flex justify-center">
                      <div
                        className={`relative rounded-xl overflow-hidden bg-slate-950 border border-slate-300 dark:border-slate-700 flex items-center justify-center ${
                          editingBanner.aspectRatio === '16:9'
                            ? 'w-36 aspect-video'
                            : editingBanner.aspectRatio === '4:3'
                            ? 'w-32 aspect-[4/3]'
                            : 'w-28 aspect-square'
                        }`}
                      >
                        {editingBanner.mediaUrl && !editingBanner.mediaUrl.endsWith('.mp4') && !editingBanner.mediaUrl.endsWith('.webm') ? (
                          <img
                            src={editingBanner.mediaUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : editingBanner.mediaPosterUrl ? (
                          <img
                            src={editingBanner.mediaPosterUrl}
                            alt="Poster Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-2 text-center text-slate-500 text-[10px]">
                            <ImageIcon className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                            No Image
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-9 space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                          <Upload className="w-4 h-4 text-[#ff6452]" />
                          <span>
                            {editingBanner.mediaUrl && !editingBanner.mediaUrl.endsWith('.mp4')
                              ? `Replace ${editingBanner.aspectRatio || '1:1'} Image`
                              : `Upload ${editingBanner.aspectRatio || '1:1'} Image`}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageUpload}
                            disabled={isUploadingMedia}
                            className="hidden"
                          />
                        </label>
                        {editingBanner.mediaUrl && !editingBanner.mediaUrl.endsWith('.mp4') && (
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            Remove Image
                          </button>
                        )}
                      </div>

                      {/* Direct Media URL Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Direct Media Image URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={editingBanner.mediaUrl || ''}
                          onChange={(e) =>
                            setEditingBanner({ ...editingBanner, mediaUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      {/* Media Alt Text for SEO & Accessibility */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          SEO Alt Text / Accessibility Label
                        </label>
                        <input
                          type="text"
                          value={editingBanner.mediaAltText || ''}
                          onChange={(e) =>
                            setEditingBanner({ ...editingBanner, mediaAltText: e.target.value })
                          }
                          placeholder="e.g. Summer wireless headphones 50% discount banner"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: PROMOTIONAL HEADLINES & COPY */}
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ff6452]" />
                  <span>Promotional Copy & Details</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Promotional Title *
                    </label>
                    <input
                      type="text"
                      value={editingBanner.title}
                      onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                      placeholder="e.g. Massive Summer Flash Sale ⚡"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Subtitle / Hook
                    </label>
                    <input
                      type="text"
                      value={editingBanner.subtitle || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                      placeholder="e.g. Up to 50% OFF Top Tech & Audio"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Description / Campaign Terms
                  </label>
                  <textarea
                    rows={2}
                    value={editingBanner.description || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                    placeholder="Provide details on the promotional terms, eligible collections, or warranty info..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SECTION C: BADGE, PRICING, DISCOUNT & LIVE COUNTDOWN */}
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#ff6452]" />
                  <span>Badges, Pricing & Flash Countdown</span>
                </label>

                {/* Badge Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Select Badge Preset:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {BADGE_PRESETS.map((preset) => (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() =>
                          setEditingBanner({
                            ...editingBanner,
                            showBadge: true,
                            badgeType: preset.type,
                            badgeCustomText: preset.label,
                            badgeColor: preset.bg,
                          })
                        }
                        style={{ backgroundColor: preset.bg }}
                        className={`px-3 py-1 rounded-full text-xs font-black text-white cursor-pointer transition-transform hover:scale-105 ${
                          editingBanner.badgeType === preset.type ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : 'opacity-80'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing & Discount % */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Promotional Price (R)
                    </label>
                    <input
                      type="number"
                      value={editingBanner.promotionalPrice || ''}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          promotionalPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 899"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Original Price (R)
                    </label>
                    <input
                      type="number"
                      value={editingBanner.originalPrice || ''}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          originalPrice: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 1799"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Discount Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={editingBanner.discountPercentage || ''}
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          showDiscount: true,
                          discountPercentage: e.target.value ? parseInt(e.target.value, 10) : undefined,
                        })
                      }
                      placeholder="e.g. 50"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Countdown Timer Configuration */}
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase">
                        Live Countdown Timer
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingBanner.showCountdown || false}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, showCountdown: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
                    />
                  </div>

                  {editingBanner.showCountdown && (
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-rose-900 dark:text-rose-300">
                        Countdown Expiry Date & Time:
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          editingBanner.countdownEndDate
                            ? new Date(editingBanner.countdownEndDate).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setEditingBanner({
                            ...editingBanner,
                            countdownEndDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION D: CTA BUTTON & DESTINATION LINK */}
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#ff6452]" />
                  <span>Call to Action (CTA) Button & Destination</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CTA Text with Presets */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={editingBanner.ctaText || 'Shop Now'}
                      onChange={(e) => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                      placeholder="e.g. Shop Now"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {CTA_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditingBanner({ ...editingBanner, ctaText: p })}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination Category Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Target Store Category
                    </label>
                    <select
                      value={editingBanner.targetCategory || ''}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setEditingBanner({
                          ...editingBanner,
                          targetCategory: cat || undefined,
                          ctaLink: cat ? `/categories/${encodeURIComponent(cat.toLowerCase())}` : '/search',
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Custom URL / All Products</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Direct Product Picker */}
                {productsCatalog.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Direct Product Catalog Link (Optional)
                    </label>
                    <select
                      value={editingBanner.targetProductId || ''}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const prod = productsCatalog.find((p) => p.id === pid);
                        setEditingBanner({
                          ...editingBanner,
                          targetProductId: pid || undefined,
                          ctaLink: pid ? `/product/${pid}` : editingBanner.ctaLink,
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose specific product to link to --</option>
                      {productsCatalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (R{p.price})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom CTA Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custom Destination Link URL
                  </label>
                  <input
                    type="text"
                    value={editingBanner.ctaLink || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, ctaLink: e.target.value })}
                    placeholder="e.g. /categories/technology or https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* SECTION E: LAYOUT, READABILITY & BACKGROUND */}
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-[#ff6452]" />
                  <span>Layout & Readability</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Promotional Text Position
                    </label>
                    <select
                      value={editingBanner.textPosition || 'beside-split'}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, textPosition: e.target.value as any })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      <option value="beside-split">Beside 1:1 Media (Split Showcase - Recommended)</option>
                      <option value="overlay-left">Overlaid on Media (Left Scrim)</option>
                      <option value="overlay-center">Overlaid on Media (Center Scrim)</option>
                      <option value="overlay-right">Overlaid on Media (Right Scrim)</option>
                      <option value="overlay-bottom">Overlaid on Media (Bottom Scrim)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Background Palette
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingBanner.backgroundColor || '#eff6ff'}
                        onChange={(e) =>
                          setEditingBanner({ ...editingBanner, backgroundColor: e.target.value })
                        }
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                      />
                      <div className="flex flex-wrap gap-1">
                        {BG_COLOR_PRESETS.map((bg) => (
                          <button
                            key={bg.hex}
                            type="button"
                            onClick={() =>
                              setEditingBanner({ ...editingBanner, backgroundColor: bg.hex })
                            }
                            style={{ backgroundColor: bg.hex }}
                            className="w-6 h-6 rounded-full border border-slate-300 shadow-2xs"
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION F: SCHEDULING & PUBLISHING CONTROLS */}
              <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ff6452]" />
                  <span>Scheduling & Status</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Active / Enabled
                      </span>
                      <span className="text-[11px] text-slate-500">Live on storefront</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingBanner.isEnabled !== false}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, isEnabled: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Save as Draft
                      </span>
                      <span className="text-[11px] text-slate-500">Hidden from storefront</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingBanner.isDraft || false}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, isDraft: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Primary Featured ⭐
                      </span>
                      <span className="text-[11px] text-slate-500">First in carousel</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingBanner.isFeatured || false}
                      onChange={(e) =>
                        setEditingBanner({ ...editingBanner, isFeatured: e.target.checked })
                      }
                      className="w-5 h-5 accent-[#ff6452] rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Schedule Start Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.startDate
                          ? new Date(editingBanner.startDate).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Auto-Expiry End Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        editingBanner.endDate
                          ? new Date(editingBanner.endDate).toISOString().slice(0, 16)
                          : ''
                      }
                      onChange={(e) =>
                        setEditingBanner({
                          ...editingBanner,
                          endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingBanner(null);
                }}
                className="px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveBannerInModal}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-[#ff6452] text-white hover:bg-[#e85340] transition-all shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Banner</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE DEVICE PREVIEW MODAL (Desktop & Mobile Frames)                       */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-950 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden my-auto text-white">
            {/* Modal Top Bar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#ff6452]" />
                <span className="font-black text-sm uppercase tracking-wider">
                  Live Storefront Preview
                </span>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-[#ff6452] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-[#ff6452] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile 1080×1080</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Frame Canvas */}
            <div className="p-6 overflow-y-auto flex items-center justify-center flex-1 bg-slate-900/50 min-h-[460px]">
              {bannersList.length === 0 ? (
                <div className="text-center text-slate-400">No banners configured to preview.</div>
              ) : (
                <div
                  className={`transition-all duration-300 mx-auto ${
                    previewDevice === 'mobile'
                      ? 'w-[360px] rounded-[36px] border-4 border-slate-700 shadow-2xl p-2 bg-slate-900'
                      : 'w-full max-w-4xl'
                  }`}
                >
                  {/* Current Active Preview Banner */}
                  {(() => {
                    const current = bannersList[previewBannerIndex] || bannersList[0];
                    if (!current) return null;

                    return (
                      <div
                        style={{ backgroundColor: current.backgroundColor || '#eff6ff' }}
                        className="rounded-3xl p-6 text-slate-900 relative overflow-hidden shadow-lg"
                      >
                        <div className="space-y-4">
                          {current.showBadge && (
                            <span
                              style={{ backgroundColor: current.badgeColor || '#ff6452' }}
                              className="text-[10px] font-black text-white px-2.5 py-0.5 rounded-full uppercase inline-block"
                            >
                              {current.badgeCustomText || current.badgeType || 'HOT DEAL'}
                            </span>
                          )}

                          <h3 className="text-xl sm:text-2xl font-black leading-tight text-slate-900">
                            {current.title}
                          </h3>

                          {current.subtitle && (
                            <p className="text-xs sm:text-sm font-semibold text-slate-700">
                              {current.subtitle}
                            </p>
                          )}

                          {/* Media in preview with dynamic aspect ratio & responsive video stream */}
                          {(() => {
                            const isMobileMode = previewDevice === 'mobile';
                            const hasMobileVideo = Boolean(current.mobileVideoUrl);
                            const hasDesktopVideo = Boolean(current.desktopVideoUrl || (current.mediaType === 'video' && current.mediaUrl));
                            const hasAnyVideo = hasMobileVideo || hasDesktopVideo;

                            const activeVideoSrc = isMobileMode
                              ? (current.mobileVideoUrl || current.desktopVideoUrl || current.mediaUrl)
                              : (current.desktopVideoUrl || current.mediaUrl);

                            const focalPos = current.mobileVideoFocalPosition || 'center';

                            return (
                              <div
                                className={`w-full mx-auto rounded-2xl overflow-hidden bg-slate-950 shadow-md ${
                                  isMobileMode
                                    ? 'aspect-[4/5] max-w-[260px]'
                                    : current.aspectRatio === '16:9'
                                    ? 'aspect-[16/9] max-w-[420px]'
                                    : current.aspectRatio === '4:3'
                                    ? 'aspect-[4/3] max-w-[340px]'
                                    : 'aspect-square max-w-[300px]'
                                }`}
                              >
                                {hasAnyVideo && activeVideoSrc ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      src={activeVideoSrc}
                                      poster={current.mediaPosterUrl}
                                      autoPlay
                                      muted
                                      loop
                                      playsInline
                                      style={{
                                        objectFit: 'cover',
                                        objectPosition: isMobileMode && !hasMobileVideo ? `${focalPos} center` : 'center center',
                                      }}
                                      className="w-full h-full"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                      {isMobileMode ? (
                                        hasMobileVideo ? (
                                          <>
                                            <Smartphone className="w-3 h-3 text-purple-400" />
                                            <span>Dedicated 4:5 Mobile Video</span>
                                          </>
                                        ) : (
                                          <>
                                            <Monitor className="w-3 h-3 text-sky-400" />
                                            <span>Desktop Video (Cropped 4:5 - {focalPos})</span>
                                          </>
                                        )
                                      ) : (
                                        <>
                                          <Monitor className="w-3 h-3 text-sky-400" />
                                          <span>Desktop Video (16:9)</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ) : current.mediaUrl ? (
                                  <img
                                    src={current.mediaUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : null}
                              </div>
                            );
                          })()}

                          <button
                            type="button"
                            className="w-full py-3 rounded-xl font-bold text-sm bg-[#ff6452] text-white shadow-md"
                          >
                            {current.ctaText || 'Shop Now'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Carousel Slide Selector in Preview */}
                  {bannersList.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {bannersList.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewBannerIndex(i)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            previewBannerIndex === i ? 'w-6 bg-[#ff6452]' : 'w-2 bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Delete Promotion Banner?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove "{bannerToDelete.title}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
              >
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          ACTIVE
        </span>
      );
    case 'scheduled':
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          SCHEDULED
        </span>
      );
    case 'draft':
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
          DRAFT
        </span>
      );
    case 'expired':
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          EXPIRED
        </span>
      );
    case 'disabled':
    default:
      return (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          DISABLED
        </span>
      );
  }
};
