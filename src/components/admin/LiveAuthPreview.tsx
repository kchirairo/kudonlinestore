import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Smartphone,
  Monitor,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Layers,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { adminService } from '../../services/adminService';
import { AuthAppearanceConfig, AuthBackgroundImage } from '../../types';
import { DEFAULT_AUTH_APPEARANCE, DEFAULT_AUTH_BACKGROUND_IMAGES, getCinematicPresets } from '../../constants/authAppearance';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const AppleIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 170 170" fill="currentColor">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.79-11.73-14.24-6.95-10.88-12.28-23.23-15.99-37.05-3.7-13.82-5.56-26.68-5.56-38.58 0-16.1 4.13-29.28 12.39-39.53 8.26-10.25 18.49-15.48 30.68-15.69 5.86 0 12.06 1.48 18.59 4.45 6.53 2.97 10.66 4.51 12.39 4.63 1.3.12 5.65-1.54 13.06-4.99 7.4-3.46 14.15-4.97 20.25-4.54 15.45.86 27.67 6.47 36.67 16.83-13.72 8.36-20.36 19.86-19.92 34.5.32 11.53 4.67 21.08 13.06 28.65 3.91 3.59 8.37 6.3 13.38 8.15-2.82 8.26-6.63 17.58-11.42 27.97zM119.22 33.39c0-8.04 2.82-15.86 8.46-23.47 5.65-7.6 12.71-12.44 21.19-14.52.43 2.17.65 4.35.65 6.52 0 7.82-2.93 15.64-8.8 23.47-5.87 7.82-13 12.71-21.4 14.67-.11-2.17-.11-4.49-.1-6.67z" />
  </svg>
);

export interface LiveAuthPreviewProps {
  /**
   * Optional externally controlled appearance state (e.g. while editing in admin form).
   * If omitted, LiveAuthPreview fetches from public.auth_appearance_settings and subscribes to changes.
   */
  config?: Partial<AuthAppearanceConfig>;
  /**
   * Optional custom background images list.
   * If omitted, LiveAuthPreview loads active images from public.auth_background_images.
   */
  images?: AuthBackgroundImage[];
  /**
   * Initial active auth mode preview ('login' or 'signup')
   */
  initialMode?: 'login' | 'signup';
  /**
   * Initial device frame ('desktop' or 'mobile')
   */
  initialDevice?: 'desktop' | 'mobile';
  /**
   * Whether to display top control toolbar (Device switcher, mode toggle, play/pause)
   */
  showControls?: boolean;
  /**
   * Optional extra container styling class
   */
  className?: string;
  /**
   * Callback when active image changes
   */
  onActiveIndexChange?: (index: number) => void;
}

export const LiveAuthPreview: React.FC<LiveAuthPreviewProps> = ({
  config: externalConfig,
  images: externalImages,
  initialMode = 'login',
  initialDevice = 'desktop',
  showControls = true,
  className = '',
  onActiveIndexChange,
}) => {
  const { storeBranding } = useShop();

  // Internal state when not fully controlled externally
  const [internalConfig, setInternalConfig] = useState<AuthAppearanceConfig>(DEFAULT_AUTH_APPEARANCE);
  const [internalImages, setInternalImages] = useState<AuthBackgroundImage[]>(DEFAULT_AUTH_BACKGROUND_IMAGES);
  const [isLoading, setIsLoading] = useState<boolean>(!externalConfig);

  // Viewport & Interactive state
  const [device, setDevice] = useState<'desktop' | 'mobile'>(initialDevice);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('customer@example.co.za');
  const [passwordInput, setPasswordInput] = useState<string>('••••••••••••');
  const [nameInput, setNameInput] = useState<string>('Sipho Nkosi');

  // Merged config & images
  const effectiveConfig: AuthAppearanceConfig = useMemo(() => {
    return {
      ...DEFAULT_AUTH_APPEARANCE,
      ...internalConfig,
      ...(externalConfig || {}),
    };
  }, [internalConfig, externalConfig]);

  const effectiveImages: AuthBackgroundImage[] = useMemo(() => {
    const list = externalImages && externalImages.length > 0 ? externalImages : internalImages;
    const active = list.filter((img) => img.isActive);
    return active.length > 0 ? active : list.length > 0 ? list : DEFAULT_AUTH_BACKGROUND_IMAGES;
  }, [externalImages, internalImages]);

  // Load from Supabase tables if external props are not provided
  useEffect(() => {
    let isMounted = true;

    const loadDataFromSupabase = async () => {
      try {
        const [settingsResult, imagesResult] = await Promise.allSettled([
          adminService.getAuthAppearance(),
          adminService.getAuthBackgroundImages(true),
        ]);

        if (!isMounted) return;

        if (settingsResult.status === 'fulfilled' && settingsResult.value) {
          setInternalConfig(settingsResult.value);
        }

        if (imagesResult.status === 'fulfilled' && Array.isArray(imagesResult.value) && imagesResult.value.length > 0) {
          const mappedImages: AuthBackgroundImage[] = imagesResult.value.map((img, idx) => ({
            id: String(img.id),
            url: img.public_url || img.storage_path,
            title: img.name || `Wallpaper ${idx + 1}`,
            altText: img.name || 'Store Background',
            isActive: img.is_active,
            order: img.display_order ?? idx,
            is_default: Boolean(img.is_default),
            uploadedAt: img.created_at || new Date().toISOString(),
          }));
          setInternalImages(mappedImages);

          // Find default image index
          const defaultIdx = mappedImages.findIndex((img) => img.is_default);
          if (defaultIdx >= 0) {
            setActiveIndex(defaultIdx);
          }
        }
      } catch (err) {
        console.warn('[LiveAuthPreview] Error loading Supabase state:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (!externalConfig || !externalImages) {
      loadDataFromSupabase();
    }

    // Subscribe to realtime changes or custom events emitted when settings update
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setInternalConfig((prev) => ({
          ...prev,
          ...e.detail,
        }));
      }
    };

    const handleImagesUpdate = () => {
      adminService.getAuthBackgroundImages(true).then((imgs) => {
        if (!isMounted || !imgs || imgs.length === 0) return;
        const mapped: AuthBackgroundImage[] = imgs.map((img, idx) => ({
          id: String(img.id),
          url: img.public_url || img.storage_path,
          title: img.name || `Wallpaper ${idx + 1}`,
          altText: img.name || 'Store Background',
          isActive: img.is_active,
          order: img.display_order ?? idx,
          is_default: Boolean(img.is_default),
          uploadedAt: img.created_at || new Date().toISOString(),
        }));
        setInternalImages(mapped);
      });
    };

    window.addEventListener('kud_auth_appearance_updated', handleSettingsUpdate);
    window.addEventListener('kud_auth_images_updated', handleImagesUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('kud_auth_appearance_updated', handleSettingsUpdate);
      window.removeEventListener('kud_auth_images_updated', handleImagesUpdate);
    };
  }, [externalConfig, externalImages]);

  // Handle active slide bounds when images length changes
  useEffect(() => {
    if (activeIndex >= effectiveImages.length) {
      setActiveIndex(0);
    }
  }, [effectiveImages.length, activeIndex]);

  // Set initial default index when effectiveImages changes
  useEffect(() => {
    const defaultIdx = effectiveImages.findIndex((img) => img.is_default);
    if (defaultIdx >= 0 && defaultIdx !== activeIndex) {
      setActiveIndex(defaultIdx);
    }
  }, [effectiveImages]);

  // Auto-rotation timer based on image_display_duration
  useEffect(() => {
    if (!isPlaying || effectiveImages.length <= 1) return;

    const displaySec =
      effectiveConfig.image_display_duration ||
      effectiveConfig.rotationIntervalSeconds ||
      6;
    const intervalMs = Math.max(2000, displaySec * 1000);

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % effectiveImages.length;
        if (onActiveIndexChange) onActiveIndexChange(next);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, effectiveImages.length, effectiveConfig.image_display_duration, effectiveConfig.rotationIntervalSeconds, onActiveIndexChange]);

  // Animation values
  const animationEnabled = effectiveConfig.animation_enabled ?? effectiveConfig.enableMotion ?? true;
  const animType = effectiveConfig.animation_type || effectiveConfig.transitionEffect || 'ken-burns';
  const zoomScale = effectiveConfig.zoom_intensity || 1.08;
  const panEnabled = effectiveConfig.pan_enabled ?? true;
  const transitionSec =
    effectiveConfig.transition_duration ||
    (effectiveConfig.transitionDurationMs ? effectiveConfig.transitionDurationMs / 1000 : 1.2);

  // Overlay values
  const overlayDarkPct =
    typeof effectiveConfig.overlay_opacity === 'number'
      ? effectiveConfig.overlay_opacity <= 1
        ? effectiveConfig.overlay_opacity * 100
        : effectiveConfig.overlay_opacity
      : effectiveConfig.overlayDarkness ?? 45;
  const overlayOpacityRatio = overlayDarkPct / 100;
  const overlayBlur = effectiveConfig.overlayBlur ?? 0;
  const overlayGradient = effectiveConfig.overlayGradient || 'soft';

  // Glass card values
  const cardOpacityPct =
    typeof effectiveConfig.card_opacity === 'number'
      ? effectiveConfig.card_opacity <= 1
        ? effectiveConfig.card_opacity * 100
        : effectiveConfig.card_opacity
      : typeof effectiveConfig.cardOpacity === 'number'
      ? effectiveConfig.cardOpacity
      : 78;
  const cardOpacityRatio = cardOpacityPct / 100;
  const cardRadius = effectiveConfig.card_border_radius ?? 24;
  const cardPos = device === 'mobile' ? 'center' : effectiveConfig.card_position || 'center';

  // Card backdrop blur map
  const cardBlurMap: Record<string, string> = {
    none: 'none',
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(16px)',
    xl: 'blur(24px)',
    '2xl': 'blur(40px)',
  };
  const cardBackdropFilter = cardBlurMap[effectiveConfig.cardBlur || 'xl'] || 'blur(20px)';

  // Card border map
  const cardBorderMap: Record<string, string> = {
    none: 'none',
    subtle: '1px solid rgba(255, 255, 255, 0.18)',
    medium: '1px solid rgba(255, 255, 255, 0.32)',
    high: '2px solid rgba(255, 255, 255, 0.48)',
  };
  const cardBorder = cardBorderMap[effectiveConfig.cardBorderIntensity || 'subtle'];

  // Headings and copy
  const loginTitle = effectiveConfig.login_title || effectiveConfig.welcomeHeadline || 'Welcome back';
  const loginSubtitle =
    effectiveConfig.login_subtitle || effectiveConfig.welcomeSubtext || 'Sign in to continue shopping';
  const signupTitle = effectiveConfig.signup_title || 'Create your account';
  const signupSubtitle = effectiveConfig.signup_subtitle || 'Join us and start shopping';

  const showLogo = effectiveConfig.show_logo ?? effectiveConfig.showLogoBadge ?? true;
  const showGoogle = effectiveConfig.show_google ?? true;
  const showApple = effectiveConfig.show_apple ?? true;
  const showSignupLink = effectiveConfig.show_signup_link ?? true;
  const showLoginLink = effectiveConfig.show_login_link ?? true;
  const showFeaturesPill = effectiveConfig.showFeaturesPill ?? true;

  // Active Preset & Customer Frontend Visibility
  const activePreset = useMemo(() => {
    const presets = getCinematicPresets();
    if (effectiveConfig.active_preset_id) {
      const match = presets.find((p) => p.id === effectiveConfig.active_preset_id);
      if (match) return match;
    }
    if (effectiveConfig.active_preset_name) {
      const match = presets.find((p) => p.name.toLowerCase() === effectiveConfig.active_preset_name?.toLowerCase());
      if (match) return match;
    }
    return presets[0];
  }, [effectiveConfig.active_preset_id, effectiveConfig.active_preset_name]);

  const isPresetNameVisible = activePreset
    ? activePreset.isVisibleOnFrontend
    : (effectiveConfig.show_preset_name_on_frontend ?? true);

  const displayedPresetName = activePreset?.name || effectiveConfig.active_preset_name;

  // Next / Prev slide handlers
  const handlePrevSlide = () => {
    setActiveIndex((prev) => {
      const next = (prev - 1 + effectiveImages.length) % effectiveImages.length;
      if (onActiveIndexChange) onActiveIndexChange(next);
      return next;
    });
  };

  const handleNextSlide = () => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % effectiveImages.length;
      if (onActiveIndexChange) onActiveIndexChange(next);
      return next;
    });
  };

  // Overlay background styles
  const overlayBackgroundStyle = useMemo(() => {
    const darkRatio = overlayOpacityRatio;
    if (overlayGradient === 'vignette') {
      return `radial-gradient(circle at center, rgba(0,0,0,${darkRatio * 0.35}) 0%, rgba(0,0,0,${darkRatio}) 100%)`;
    }
    if (overlayGradient === 'radial') {
      return `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,${darkRatio}) 80%)`;
    }
    if (overlayGradient === 'dark') {
      return `linear-gradient(to bottom, rgba(0,0,0,${Math.min(1, darkRatio + 0.18)}), rgba(0,0,0,${darkRatio}))`;
    }
    // Default soft gradient
    return `linear-gradient(to bottom, rgba(0,0,0,${darkRatio * 0.9}), rgba(0,0,0,${darkRatio}))`;
  }, [overlayGradient, overlayOpacityRatio]);

  // Card Desktop Alignment container class
  const alignmentClass =
    cardPos === 'left'
      ? 'justify-start pl-6 lg:pl-10'
      : cardPos === 'right'
      ? 'justify-end pr-6 lg:pr-10'
      : 'justify-center';

  return (
    <div
      id="live-auth-preview-container"
      className={`relative flex flex-col bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}
    >
      {/* Top Preview Toolbar */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md z-30">
          {/* Left: Component Title & Status */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-white tracking-wide uppercase">Live Cinematic Preview</span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium ml-1">
              ({effectiveImages.length} {effectiveImages.length === 1 ? 'wallpaper' : 'wallpapers'})
            </span>
          </div>

          {/* Center / Right: Interactive Controls */}
          <div className="flex items-center gap-2">
            {/* Sign In vs Sign Up Toggle */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-[#ff6452] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-[#ff6452] text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Play / Pause Rotation */}
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause Wallpaper Auto-Rotation' : 'Play Wallpaper Auto-Rotation'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Step Controls */}
            <div className="flex items-center bg-slate-800/90 rounded-xl border border-slate-700/60 p-0.5">
              <button
                type="button"
                onClick={handlePrevSlide}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg transition-colors cursor-pointer"
                title="Previous Wallpaper"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-300 px-1.5 select-none">
                {activeIndex + 1}/{effectiveImages.length}
              </span>
              <button
                type="button"
                onClick={handleNextSlide}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/70 rounded-lg transition-colors cursor-pointer"
                title="Next Wallpaper"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Device Frame Switcher */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  device === 'desktop'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Desktop Viewport"
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  device === 'mobile'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mobile Viewport"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Viewport Stage */}
      <div className="relative w-full bg-slate-950 p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[520px]">
        {/* Responsive Frame */}
        <div
          className={`relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 transition-all duration-500 ease-out select-none ${
            device === 'mobile'
              ? 'w-[320px] h-[580px] max-w-full ring-8 ring-slate-900 shadow-slate-950'
              : 'w-full h-[540px]'
          }`}
        >
          {/* Mobile Status Bar Mock */}
          {device === 'mobile' && (
            <div className="absolute top-0 inset-x-0 h-6 bg-black/40 z-30 flex items-center justify-between px-5 text-[10px] text-white/90 font-semibold pointer-events-none">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/70" />
                <span className="w-3 h-2 rounded-sm border border-white/80" />
              </div>
            </div>
          )}

          {/* BACKGROUND WALLPAPERS LAYER */}
          <div className="absolute inset-0 overflow-hidden bg-black">
            {effectiveImages.map((img, idx) => {
              const isCurrent = idx === activeIndex;

              // Dynamic CSS Transform calculation for motion engine
              let transformStyle = 'scale(1)';
              let transitionStyle = `opacity ${transitionSec}s cubic-bezier(0.4, 0, 0.2, 1)`;

              if (animationEnabled && isCurrent) {
                if (animType === 'ken-burns') {
                  transformStyle = `scale(${zoomScale}) ${panEnabled ? 'translateX(10px)' : ''}`;
                  transitionStyle = `opacity ${transitionSec}s ease, transform 12s cubic-bezier(0.25, 1, 0.5, 1)`;
                } else if (animType === 'pan') {
                  transformStyle = `scale(1.04) translateX(${panEnabled ? '16px' : '0px'})`;
                  transitionStyle = `opacity ${transitionSec}s ease, transform 10s ease-in-out`;
                } else if (animType === 'zoom-fade') {
                  transformStyle = `scale(${zoomScale})`;
                  transitionStyle = `opacity ${transitionSec}s ease, transform 8s ease-out`;
                } else if (animType === 'slide') {
                  transformStyle = isCurrent ? 'translateX(0%)' : 'translateX(100%)';
                  transitionStyle = `transform ${transitionSec}s cubic-bezier(0.16, 1, 0.3, 1), opacity ${transitionSec}s ease`;
                }
              }

              return (
                <div
                  key={img.id}
                  className={`absolute inset-0 transition-opacity pointer-events-none ${
                    isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                  style={{
                    transition: transitionStyle,
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.altText || img.title || 'Background'}
                    className="w-full h-full object-cover will-change-transform"
                    style={{
                      transform: transformStyle,
                      filter: overlayBlur > 0 ? `blur(${overlayBlur}px)` : 'none',
                      transition:
                        animationEnabled && isCurrent
                          ? `transform ${
                              animType === 'ken-burns' ? '12s' : animType === 'pan' ? '10s' : '8s'
                            } cubic-bezier(0.25, 1, 0.5, 1)`
                          : 'none',
                    }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              );
            })}
          </div>

          {/* DYNAMIC ATMOSPHERE OVERLAY */}
          <div
            className="absolute inset-0 z-15 pointer-events-none transition-all duration-700"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${overlayOpacityRatio})`,
              background: overlayBackgroundStyle,
            }}
          />

          {/* FORM LAYOUT & GLASSMORPHISM CARD LAYER */}
          <div className={`absolute inset-0 z-20 flex items-center p-4 sm:p-6 overflow-y-auto ${alignmentClass}`}>
            <div
              className="w-full max-w-[340px] p-6 text-center space-y-4 transition-all duration-500"
              style={{
                backgroundColor: `rgba(255, 255, 255, ${cardOpacityRatio})`,
                borderRadius: `${cardRadius}px`,
                backdropFilter: cardBackdropFilter,
                WebkitBackdropFilter: cardBackdropFilter,
                border: cardBorder,
                boxShadow:
                  '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
              }}
            >
              {/* Store Logo Header */}
              {showLogo && (
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center mx-auto border border-gray-100 overflow-hidden transform hover:scale-105 transition-transform duration-300">
                  {storeBranding?.logoUrl ? (
                    <img
                      src={storeBranding.logoUrl}
                      alt={storeBranding.storeName || 'Store Logo'}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#ff6452] flex items-center justify-center text-white font-black text-base">
                      {storeBranding?.logoText || 'K'}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Headings */}
              <div className="space-y-1">
                <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                  {authMode === 'login' ? loginTitle : signupTitle}
                </h3>
                <p className="text-xs text-gray-500 leading-normal max-w-xs mx-auto">
                  {authMode === 'login' ? loginSubtitle : signupSubtitle}
                </p>
              </div>

              {/* Social Login Buttons (Google / Apple) */}
              {(showGoogle || showApple) && (
                <div className="space-y-2 pt-1">
                  {showGoogle && (
                    <button
                      type="button"
                      className="w-full h-9 rounded-xl bg-white border border-gray-200/90 shadow-2xs hover:bg-gray-50 flex items-center justify-center gap-2 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                    >
                      <GoogleIcon className="w-4 h-4" />
                      <span>Continue with Google</span>
                    </button>
                  )}

                  {showApple && (
                    <button
                      type="button"
                      className="w-full h-9 rounded-xl bg-black hover:bg-gray-900 shadow-2xs text-white flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <AppleIcon className="w-3.5 h-3.5" />
                      <span>Continue with Apple</span>
                    </button>
                  )}

                  <div className="relative flex items-center justify-center py-1">
                    <div className="border-t border-gray-300/70 w-full" />
                    <span className="bg-white/90 backdrop-blur-xs px-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest absolute">
                      or
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Mock Input Fields */}
              <div className="space-y-2.5 text-left">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl bg-white/80 border border-gray-200 focus:border-[#ff6452] focus:bg-white outline-hidden text-gray-800 transition-all font-medium"
                      placeholder="Your Full Name"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-white/80 border border-gray-200 focus:border-[#ff6452] focus:bg-white outline-hidden text-gray-800 transition-all font-medium"
                    placeholder="email@domain.com"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-gray-700">Password</label>
                    {authMode === 'login' && (
                      <span className="text-[10px] font-bold text-[#ff6452] hover:underline cursor-pointer">
                        Forgot?
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full h-9 pl-3 pr-8 text-xs rounded-xl bg-white/80 border border-gray-200 focus:border-[#ff6452] focus:bg-white outline-hidden text-gray-800 transition-all font-medium"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  className="w-full h-9 rounded-xl bg-[#ff6452] hover:bg-[#e05342] active:scale-[0.98] text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 pt-0.5"
                >
                  <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                </button>
              </div>

              {/* Mode Switcher Links */}
              <div className="text-[11px] text-gray-600 pt-1">
                {authMode === 'login' ? (
                  showSignupLink && (
                    <p>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className="font-black text-[#ff6452] hover:underline cursor-pointer"
                      >
                        Sign Up
                      </button>
                    </p>
                  )
                ) : (
                  showLoginLink && (
                    <p>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="font-black text-[#ff6452] hover:underline cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  )
                )}
              </div>

              {/* Trust & Security Badges */}
              {showFeaturesPill && (
                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Secure Session</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Image Indicator Dots in Bottom Center of Viewport */}
          <div className="absolute bottom-3 inset-x-0 z-25 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            {isPresetNameVisible && displayedPresetName && (
              <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-white border border-white/25 shadow-xs flex items-center gap-1 pointer-events-auto">
                <Sparkles className="w-2.5 h-2.5 text-[#ff6452]" />
                {displayedPresetName}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {effectiveImages.map((img, idx) => (
                <span
                  key={img.id}
                  className={`transition-all duration-300 rounded-full ${
                    idx === activeIndex
                      ? 'w-5 h-1.5 bg-white shadow-xs'
                      : 'w-1.5 h-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Information Footer */}
      <div className="px-5 py-3 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Animation:</span>
          <span className="capitalize font-mono text-slate-400">{animType}</span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-slate-300">Zoom:</span>
          <span className="font-mono text-slate-400">{zoomScale}x</span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-slate-300">Display:</span>
          <span className="font-mono text-slate-400">
            {effectiveConfig.image_display_duration || effectiveConfig.rotationIntervalSeconds || 6}s
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">Glass Opacity:</span>
          <span className="font-mono text-[#ff6452] font-bold">{cardOpacityPct}%</span>
          <span className="text-slate-600">•</span>
          <span className="font-bold text-slate-300">Card Radius:</span>
          <span className="font-mono text-slate-400">{cardRadius}px</span>
        </div>
      </div>
    </div>
  );
};
