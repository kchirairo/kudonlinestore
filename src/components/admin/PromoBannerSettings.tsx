import React, { useState } from 'react';
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
  Tv,
  Film,
  Play,
  Volume2,
  ExternalLink,
  ChevronRight,
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
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { PromoBannerConfig, PromoBannerSlide } from '../../types';
import { DEFAULT_PROMO_BANNER } from '../../constants/config';
import { adminService } from '../../services/adminService';

const BG_COLOR_PRESETS = [
  { name: 'Sky Blue (Default)', hex: '#eff6ff' },
  { name: 'Coral Mist', hex: '#fff1f0' },
  { name: 'Soft Amber', hex: '#fef3c7' },
  { name: 'Lavender Violet', hex: '#f5f3ff' },
  { name: 'Emerald Ice', hex: '#ecfdf5' },
  { name: 'Rose Blush', hex: '#fdf2f8' },
  { name: 'Midnight Dark', hex: '#0f172a' },
];

export const PromoBannerSettings: React.FC = () => {
  const { promoBanner, updatePromoBanner, showToast } = useShop();

  const [formData, setFormData] = useState<PromoBannerConfig>(() => ({
    ...DEFAULT_PROMO_BANNER,
    ...promoBanner,
    overlayPosition: promoBanner?.overlayPosition || DEFAULT_PROMO_BANNER.overlayPosition || 'left',
    overlayDimming: promoBanner?.overlayDimming ?? DEFAULT_PROMO_BANNER.overlayDimming ?? 45,
    overlayBackgroundStyle: promoBanner?.overlayBackgroundStyle || DEFAULT_PROMO_BANNER.overlayBackgroundStyle || 'gradient',
    bannerHeight: promoBanner?.bannerHeight || DEFAULT_PROMO_BANNER.bannerHeight || 340,
    textColor: promoBanner?.textColor || 'light',
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [activeSlideTab, setActiveSlideTab] = useState<number>(0);
  const [showSqlSchema, setShowSqlSchema] = useState(false);
  const [savedTableNotice, setSavedTableNotice] = useState<string | null>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      showToast('Please upload an image (PNG, JPG, WEBP) or video (MP4, WebM)', 'error');
      return;
    }

    try {
      setIsUploadingMedia(true);
      const url = await adminService.uploadMedia(file, 'banner');

      if (typeof slideIndex === 'number' && formData.slides) {
        const newSlides = [...formData.slides];
        newSlides[slideIndex] = {
          ...newSlides[slideIndex],
          mediaUrl: url,
          mediaType: isVideo ? 'video' : 'image',
        };
        setFormData((prev) => ({ ...prev, slides: newSlides }));
      } else {
        setFormData((prev) => ({
          ...prev,
          mediaUrl: url,
          mediaType: isVideo ? 'video' : 'image',
        }));
      }

      showToast(`Banner advertising ${isVideo ? 'video' : 'photo'} uploaded successfully!`, 'success');
    } catch {
      showToast('Media upload failed', 'error');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updatePromoBanner(formData);
      if (res.success) {
        setSavedTableNotice(res.databaseTable || 'settings');
        showToast(
          `Promo banner and text overlays saved to Supabase '${res.databaseTable || 'settings'}' table!`,
          'success'
        );
      } else {
        showToast(res.error || 'Failed to save promo banner', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving banner', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(DEFAULT_PROMO_BANNER);
    showToast('Reset promo banner to defaults', 'info');
  };

  const handleAddSlide = () => {
    const newSlide: PromoBannerSlide = {
      id: 'slide_' + Date.now(),
      headline: 'Exciting Flash Sale Alert! ⚡',
      subtext: 'Discover top deals and curated product offers with fast shipping.',
      badgeText: 'LIMITED OFFER',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
      ctaText: 'Shop Deals',
      ctaLink: '/search',
      backgroundColor: '#eff6ff',
      overlayPosition: 'left',
      overlayDimming: 45,
    };
    const updated = [...(formData.slides || []), newSlide];
    setFormData({ ...formData, slides: updated });
    setActiveSlideTab(updated.length - 1);
    showToast('Added new advertising slide', 'info');
  };

  const handleRemoveSlide = (idx: number) => {
    if ((formData.slides || []).length <= 1) {
      showToast('Must keep at least 1 slide for carousel mode', 'error');
      return;
    }
    const updated = (formData.slides || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, slides: updated });
    setActiveSlideTab(Math.max(0, idx - 1));
  };

  return (
    <div className="space-y-6">
      {/* Supabase Storage Notice Bar */}
      <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                Supabase 'settings' Table Persistence
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-600/15 text-emerald-800">
                Active & Synced
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/90 font-medium">
              Banner images, videos, headlines, and overlay layout configurations are stored in the dedicated Supabase <code className="bg-white/80 px-1 py-0.5 rounded text-emerald-900 font-mono text-[10px]">settings</code> table (<code className="bg-white/80 px-1 py-0.5 rounded text-emerald-900 font-mono text-[10px]">key = 'banner_config'</code>).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSqlSchema(!showSqlSchema)}
          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-2xs"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}</span>
        </button>
      </div>

      {/* SQL Schema Details Drawer */}
      {showSqlSchema && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs font-mono border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Supabase PostgreSQL Schema for 'settings' Table:</span>
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

      {/* Real-time Interactive Preview Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-3xl p-6 text-white shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#ff6452]" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Live Banner & Text Overlay Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                formData.enabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {formData.enabled ? 'Active on Storefront' : 'Disabled (Hidden)'}
            </span>
          </div>
        </div>

        {/* Rendered Live Banner Preview */}
        <div
          style={{
            backgroundColor: formData.backgroundColor || '#eff6ff',
            minHeight: formData.layout === 'hero' ? `${Math.min(320, formData.bannerHeight || 300)}px` : 'auto',
          }}
          className="rounded-2xl border border-blue-200/50 shadow-inner text-gray-900 relative overflow-hidden transition-all flex flex-col justify-center"
        >
          {formData.layout === 'hero' ? (
            <div
              className={`relative rounded-2xl overflow-hidden min-h-[220px] p-6 sm:p-8 flex ${
                formData.overlayPosition === 'center'
                  ? 'items-center justify-center text-center'
                  : formData.overlayPosition === 'right'
                  ? 'items-center justify-end text-right'
                  : formData.overlayPosition === 'bottom-left'
                  ? 'items-end justify-start text-left'
                  : formData.overlayPosition === 'top-left'
                  ? 'items-start justify-start text-left'
                  : 'items-center justify-start text-left'
              }`}
            >
              {/* Background Media */}
              {formData.mediaUrl && formData.mediaType === 'video' ? (
                <div className="absolute inset-0 w-full h-full">
                  <video
                    src={formData.mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : formData.mediaUrl ? (
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={formData.mediaUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900" />
              )}

              {/* Dimming & Scrim Overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  backgroundColor: `rgba(0, 0, 0, ${(formData.overlayDimming ?? 45) / 100})`,
                  background:
                    formData.overlayBackgroundStyle === 'gradient'
                      ? formData.overlayPosition === 'right'
                        ? `linear-gradient(to left, rgba(0,0,0,${Math.min(1, (formData.overlayDimming ?? 45) / 80)}) 0%, rgba(0,0,0,${(formData.overlayDimming ?? 45) / 160}) 60%, transparent 100%)`
                        : formData.overlayPosition === 'center'
                        ? `radial-gradient(circle, rgba(0,0,0,${Math.min(1, (formData.overlayDimming ?? 45) / 80)}) 0%, rgba(0,0,0,${(formData.overlayDimming ?? 45) / 120}) 70%, rgba(0,0,0,${(formData.overlayDimming ?? 45) / 100}) 100%)`
                        : `linear-gradient(to right, rgba(0,0,0,${Math.min(1, (formData.overlayDimming ?? 45) / 80)}) 0%, rgba(0,0,0,${(formData.overlayDimming ?? 45) / 160}) 60%, transparent 100%)`
                      : `rgba(0, 0, 0, ${(formData.overlayDimming ?? 45) / 100})`,
                }}
              />

              {/* Text Overlay Content */}
              <div
                className={`relative z-10 max-w-lg space-y-2 ${
                  formData.textColor === 'dark' ? 'text-gray-900' : 'text-white'
                } ${
                  formData.overlayBackgroundStyle === 'glass'
                    ? 'bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg text-white'
                    : ''
                }`}
              >
                {formData.showBadge && formData.badgeText && (
                  <span
                    style={{ backgroundColor: formData.accentBadgeColor || '#ff6452' }}
                    className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full text-white inline-block shadow-xs ${
                      formData.overlayPosition === 'center' ? 'mx-auto' : ''
                    }`}
                  >
                    {formData.badgeText}
                  </span>
                )}
                <h3 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                  {formData.headline}
                </h3>
                <p
                  className={`text-xs ${
                    formData.textColor === 'dark' && formData.overlayBackgroundStyle !== 'glass'
                      ? 'text-gray-700'
                      : 'text-gray-200'
                  } line-clamp-2 drop-shadow-xs`}
                >
                  {formData.subtext}
                </p>
                {formData.showCta && (
                  <div className={formData.overlayPosition === 'center' ? 'flex justify-center pt-1' : 'pt-1'}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ff6452] text-white text-xs font-bold shadow-md"
                    >
                      <span>{formData.ctaText || 'Shop Now'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className={formData.mediaUrl && formData.mediaType !== 'none' ? 'md:col-span-8' : 'md:col-span-12'}>
                {formData.showBadge && formData.badgeText && (
                  <span
                    style={{ backgroundColor: formData.accentBadgeColor || '#ff6452' }}
                    className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full text-white inline-block mb-1.5"
                  >
                    {formData.badgeText}
                  </span>
                )}
                <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                  {formData.headline}
                </h3>
                {formData.subtext && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{formData.subtext}</p>
                )}
                {formData.showCta && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-4 py-2 bg-[#ff6452] text-white text-xs font-bold rounded-full mt-3 shadow-xs"
                  >
                    <span>{formData.ctaText || 'Shop Now'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {formData.mediaUrl && formData.mediaType !== 'none' && (
                <div className="md:col-span-4 flex items-center justify-center">
                  {formData.mediaType === 'video' ? (
                    <div className="w-full h-32 rounded-xl bg-black overflow-hidden relative flex items-center justify-center">
                      <video
                        src={formData.mediaUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full text-[10px]">
                        <Film className="w-3 h-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 rounded-xl overflow-hidden shadow-xs">
                      <img
                        src={formData.mediaUrl}
                        alt="Ad preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
        {/* Section 1: Master Visibility & Layout Style */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#ff6452]" />
              <h3 className="text-base font-black text-gray-900">Banner Visibility & Layout Mode</h3>
            </div>

            {/* Toggle Enable switch */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <span className="text-xs font-bold text-gray-700">
                {formData.enabled ? 'Banner Active' : 'Banner Inactive'}
              </span>
              <div
                onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  formData.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    formData.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
            </label>
          </div>

          {/* Banner Layout Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800">Banner Layout Mode</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'hero', label: 'Hero Full-bleed', icon: Tv, desc: 'Immersive Background & Text Overlay' },
                { id: 'split', label: 'Split Card', icon: Layout, desc: 'Photo/Video + Side Text' },
                { id: 'video-focus', label: 'Video Showcase', icon: Video, desc: 'Cinematic Player' },
                { id: 'compact', label: 'Compact Bar', icon: Layers, desc: 'Simple Notification' },
                { id: 'slides', label: 'Multi-Slide Carousel', icon: Film, desc: 'Rotating Campaigns' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, layout: item.id as any })}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    formData.layout === item.id
                      ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black shadow-2xs'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                  }`}
                >
                  <item.icon className="w-5 h-5 mb-0.5" />
                  <span className="text-xs">{item.label}</span>
                  <span className="text-[10px] text-gray-400 font-normal">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Banner Media Upload (Photos & Videos) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Film className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Banner Media Upload (Photos & Videos)</h3>
          </div>

          {/* Media Type Chooser */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-800">Media Feature Format</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formData.mediaType === 'image'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="text-xs">Photo / Image Banner</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formData.mediaType === 'video'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <Video className="w-4 h-4" />
                <span className="text-xs">Video Ad (MP4 / YouTube)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, mediaType: 'none' })}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  formData.mediaType === 'none'
                    ? 'border-[#ff6452] bg-[#ff6452]/5 text-[#ff6452] font-black'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 font-bold'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                <span className="text-xs">Color / Gradient Only</span>
              </button>
            </div>
          </div>

          {/* Media Upload & URL Controls */}
          {formData.mediaType !== 'none' && (
            <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Media Preview Box */}
                {formData.mediaUrl ? (
                  <div className="relative group bg-black rounded-2xl overflow-hidden w-48 h-32 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {formData.mediaType === 'video' ? (
                      <video
                        src={formData.mediaUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={formData.mediaUrl}
                        alt="Media Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, mediaUrl: '' })}
                      className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600 shadow-sm"
                      title="Remove media"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 w-48 h-32 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                    {formData.mediaType === 'video' ? <Video className="w-6 h-6 mb-1 text-gray-400" /> : <ImageIcon className="w-6 h-6 mb-1 text-gray-400" />}
                    <span className="text-[10px] font-bold">No Media File Selected</span>
                  </div>
                )}

                {/* Upload & URL Input */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      htmlFor="banner-media-upload"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingMedia ? 'Uploading to Supabase...' : `Upload ${formData.mediaType === 'video' ? 'Video File' : 'Banner Image'}`}</span>
                    </label>
                    <input
                      id="banner-media-upload"
                      type="file"
                      accept={formData.mediaType === 'video' ? 'video/mp4,video/webm,video/ogg' : 'image/png,image/jpeg,image/webp,image/gif'}
                      onChange={(e) => handleMediaUpload(e)}
                      className="hidden"
                      disabled={isUploadingMedia}
                    />
                    <span className="text-[11px] text-gray-400">
                      {formData.mediaType === 'video' ? 'MP4, WebM (Auto-uploaded to Supabase Storage)' : 'PNG, JPG, WebP (Stored in Supabase Storage)'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-600">
                      Or Direct Media URL / Cloud Asset Link:
                    </label>
                    <input
                      type="url"
                      value={formData.mediaUrl || ''}
                      onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                      placeholder={
                        formData.mediaType === 'video'
                          ? 'https://example.com/promo.mp4 or https://youtube.com/watch?v=...'
                          : 'https://images.unsplash.com/photo-...'
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#ff6452]"
                    />
                  </div>

                  {formData.mediaType === 'video' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.videoAutoplay}
                          onChange={(e) => setFormData({ ...formData, videoAutoplay: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                        />
                        <span>Autoplay</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.videoMuted}
                          onChange={(e) => setFormData({ ...formData, videoMuted: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                        />
                        <span>Muted Audio</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.videoLoop}
                          onChange={(e) => setFormData({ ...formData, videoLoop: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                        />
                        <span>Loop Video</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.videoControls}
                          onChange={(e) => setFormData({ ...formData, videoControls: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                        />
                        <span>Show Controls</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Text Overlay & Copy Configuration */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Sparkles className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Text Overlays & Promotional Copy</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Headline Text Overlay</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                placeholder="e.g. Massive Weekly Clearance & Free Delivery! 🎁"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Subtext / Description Overlay</label>
              <textarea
                rows={2}
                value={formData.subtext || ''}
                onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                placeholder="e.g. Save up to 40% on top electronics, beauty & home essentials across South Africa."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#ff6452]"
              />
            </div>

            {/* Badge Tag and Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Badge Label Tag</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showBadge}
                      onChange={(e) => setFormData({ ...formData, showBadge: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                    />
                    <span>Show Badge</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.badgeText || ''}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder="e.g. HOT DEAL 🔥 or SPECIAL OFFER"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Badge Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.accentBadgeColor || '#ff6452'}
                    onChange={(e) => setFormData({ ...formData, accentBadgeColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200"
                  />
                  <input
                    type="text"
                    value={formData.accentBadgeColor || '#ff6452'}
                    onChange={(e) => setFormData({ ...formData, accentBadgeColor: e.target.value })}
                    className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>
              </div>
            </div>

            {/* Call To Action (CTA) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Action Button Text</label>
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCta}
                      onChange={(e) => setFormData({ ...formData, showCta: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-[#ff6452] accent-[#ff6452]"
                    />
                    <span>Show Button</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={formData.ctaText || ''}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="e.g. Explore Deals or Claim Credit"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Button Link / Navigation Route</label>
                <input
                  type="text"
                  value={formData.ctaLink || ''}
                  onChange={(e) => setFormData({ ...formData, ctaLink: e.target.value })}
                  placeholder="e.g. /search, /categories, or https://..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Overlay Positioning, Scrim Dimming & Typography Controls */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Sliders className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Text Overlay Alignment & Scrim Controls</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Position Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800">Text Overlay Alignment Position</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'left', label: 'Left', icon: AlignLeft },
                  { id: 'center', label: 'Center', icon: AlignCenter },
                  { id: 'right', label: 'Right', icon: AlignRight },
                  { id: 'top-left', label: 'Top Left', icon: AlignLeft },
                  { id: 'bottom-left', label: 'Bottom Left', icon: AlignLeft },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, overlayPosition: pos.id as any })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      (formData.overlayPosition || 'left') === pos.id
                        ? 'border-[#ff6452] bg-[#ff6452]/10 text-[#ff6452]'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <pos.icon className="w-3.5 h-3.5" />
                    <span>{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay Style Preset */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800">Backdrop Overlay Style</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gradient', label: 'Gradient Fade', desc: 'Soft darkening' },
                  { id: 'glass', label: 'Glass Card', desc: 'Frosted blur box' },
                  { id: 'solid', label: 'Uniform Scrim', desc: 'Full-bleed tint' },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, overlayBackgroundStyle: style.id as any })}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      (formData.overlayBackgroundStyle || 'gradient') === style.id
                        ? 'border-[#ff6452] bg-[#ff6452]/10 text-[#ff6452] font-black'
                        : 'border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs">{style.label}</span>
                    <span className="text-[9px] text-gray-400 font-normal">{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dimming Opacity Slider & Text Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800">Overlay Scrim Darkness / Dimming</label>
                <span className="text-xs font-mono font-bold text-[#ff6452]">
                  {formData.overlayDimming ?? 45}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="5"
                value={formData.overlayDimming ?? 45}
                onChange={(e) => setFormData({ ...formData, overlayDimming: Number(e.target.value) })}
                className="w-full accent-[#ff6452] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0% (Transparent)</span>
                <span>45% (Balanced)</span>
                <span>90% (Maximum Contrast)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Text Contrast Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, textColor: 'light' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    formData.textColor !== 'dark'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white border border-gray-300" />
                  <span>Light (White Text)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, textColor: 'dark' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    formData.textColor === 'dark'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-gray-900" />
                  <span>Dark (Charcoal Text)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Background Theme & Palette */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Palette className="w-4 h-4 text-[#ff6452]" />
            <h3 className="text-base font-black text-gray-900">Fallback Background Palette</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {BG_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => setFormData({ ...formData, backgroundColor: preset.hex })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  (formData.backgroundColor || '#eff6ff').toLowerCase() === preset.hex.toLowerCase()
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/10 flex-shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="text-xs font-bold text-gray-700">Custom Background HEX:</label>
            <input
              type="color"
              value={formData.backgroundColor || '#eff6ff'}
              onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={formData.backgroundColor || '#eff6ff'}
              onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
              className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase focus:bg-white focus:outline-none focus:border-[#ff6452]"
            />
          </div>
        </div>

        {/* Section 6: Carousel Multi-Slide Manager (When layout === 'slides') */}
        {formData.layout === 'slides' && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-base font-black text-gray-900">
                  Carousel Slides Manager ({(formData.slides || []).length} Slides)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddSlide}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#ff6452] text-white text-xs font-bold rounded-xl hover:bg-[#ff4935] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slide</span>
              </button>
            </div>

            {/* Slide Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(formData.slides || []).map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => setActiveSlideTab(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    activeSlideTab === idx
                      ? 'border-[#ff6452] bg-[#ff6452]/10 text-[#ff6452]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>Slide {idx + 1}</span>
                  {idx === activeSlideTab && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6452]" />}
                </button>
              ))}
            </div>

            {/* Active Slide Form Editor */}
            {formData.slides && formData.slides[activeSlideTab] && (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-900">
                    Editing Slide #{activeSlideTab + 1}
                  </span>
                  {(formData.slides || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(activeSlideTab)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Slide</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Slide Headline</label>
                    <input
                      type="text"
                      value={formData.slides[activeSlideTab].headline}
                      onChange={(e) => {
                        const newSlides = [...(formData.slides || [])];
                        newSlides[activeSlideTab].headline = e.target.value;
                        setFormData({ ...formData, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Slide Badge</label>
                    <input
                      type="text"
                      value={formData.slides[activeSlideTab].badgeText || ''}
                      onChange={(e) => {
                        const newSlides = [...(formData.slides || [])];
                        newSlides[activeSlideTab].badgeText = e.target.value;
                        setFormData({ ...formData, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Slide Subtext</label>
                  <input
                    type="text"
                    value={formData.slides[activeSlideTab].subtext || ''}
                    onChange={(e) => {
                      const newSlides = [...(formData.slides || [])];
                      newSlides[activeSlideTab].subtext = e.target.value;
                      setFormData({ ...formData, slides: newSlides });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Media URL (Photo or Video)</label>
                    <input
                      type="url"
                      value={formData.slides[activeSlideTab].mediaUrl || ''}
                      onChange={(e) => {
                        const newSlides = [...(formData.slides || [])];
                        newSlides[activeSlideTab].mediaUrl = e.target.value;
                        setFormData({ ...formData, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">CTA Link</label>
                    <input
                      type="text"
                      value={formData.slides[activeSlideTab].ctaLink || ''}
                      onChange={(e) => {
                        const newSlides = [...(formData.slides || [])];
                        newSlides[activeSlideTab].ctaLink = e.target.value;
                        setFormData({ ...formData, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
            className="flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving to Supabase...' : 'Save Banner & Overlays to Supabase'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
