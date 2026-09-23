import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Lock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { DEFAULT_AUTH_APPEARANCE, DEFAULT_AUTH_BACKGROUND_IMAGES, getCinematicPresets } from '../../constants/authAppearance';
import { AuthAppearanceConfig, AuthBackgroundImage } from '../../types';

interface CinematicAuthContainerProps {
  children: React.ReactNode;
  isSignUp?: boolean;
}

export const CinematicAuthContainer: React.FC<CinematicAuthContainerProps> = ({
  children,
  isSignUp = false,
}) => {
  const { authAppearance, storeBranding } = useShop();
  const config: AuthAppearanceConfig = authAppearance || DEFAULT_AUTH_APPEARANCE;

  // Determine if active preset's name should be visible on the customer frontend
  const activePreset = useMemo(() => {
    const presets = getCinematicPresets();
    if (config.active_preset_id) {
      const match = presets.find((p) => p.id === config.active_preset_id);
      if (match) return match;
    }
    if (config.active_preset_name) {
      const match = presets.find((p) => p.name.toLowerCase() === config.active_preset_name?.toLowerCase());
      if (match) return match;
    }
    return presets[0];
  }, [config.active_preset_id, config.active_preset_name]);

  const isPresetNameVisible = activePreset
    ? activePreset.isVisibleOnFrontend
    : (config.show_preset_name_on_frontend ?? true);

  const displayedPresetName = activePreset?.name || config.active_preset_name;

  // Reduced motion preference check
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Filter active images with default and randomization support
  const activeImages: AuthBackgroundImage[] = useMemo(() => {
    let images = config.images && config.images.length > 0 ? config.images : DEFAULT_AUTH_BACKGROUND_IMAGES;
    const filtered = images.filter((img) => img.isActive);
    let result = filtered.length > 0 ? filtered : images;

    if (config.randomize_images && result.length > 1) {
      result = [...result].sort(() => 0.5 - Math.random());
    } else {
      // Put default image first if present
      const defaultImg = result.find((img) => img.is_default);
      if (defaultImg) {
        result = [defaultImg, ...result.filter((img) => img.id !== defaultImg.id)];
      }
    }
    return result;
  }, [config.images, config.randomize_images]);

  // Current active background index
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Rotation duration from config
  const imageDisplayDurationSec = config.image_display_duration || config.rotationIntervalSeconds || 6;
  const transitionDurationSec = config.transition_duration || (config.transitionDurationMs ? config.transitionDurationMs / 1000 : 1.5);
  const isEnabled = config.animation_enabled ?? config.enabled ?? true;

  // Rotation timer loop
  useEffect(() => {
    if (!isEnabled || activeImages.length <= 1 || isHovered) return;

    const intervalMs = Math.max(2000, imageDisplayDurationSec * 1000);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isEnabled, imageDisplayDurationSec, activeImages.length, isHovered]);

  // If disabled by admin, render standard clean fallback container
  if (!isEnabled) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-md space-y-6">
          {children}
        </div>
      </div>
    );
  }

  // Calculate backdrop blur class or inline style
  const blurValue =
    config.cardBlur === '2xl'
      ? '40px'
      : config.cardBlur === 'xl'
      ? '24px'
      : config.cardBlur === 'lg'
      ? '16px'
      : config.cardBlur === 'md'
      ? '8px'
      : '4px';

  // Calculate border style
  const borderStyle =
    config.cardBorderIntensity === 'high'
      ? '2px solid rgba(255, 255, 255, 0.45)'
      : config.cardBorderIntensity === 'medium'
      ? '1px solid rgba(255, 255, 255, 0.3)'
      : config.cardBorderIntensity === 'subtle'
      ? '1px solid rgba(255, 255, 255, 0.18)'
      : '1px solid rgba(255, 255, 255, 0.2)';

  // Card opacity decimal
  const cardOpacityDecimal =
    config.card_opacity !== undefined
      ? config.card_opacity > 1
        ? config.card_opacity / 100
        : config.card_opacity
      : (config.cardOpacity || 82) / 100;

  // Card border radius
  const cardBorderRadiusPx = config.card_border_radius !== undefined ? `${config.card_border_radius}px` : '24px';

  // Card position on desktop/tablet
  const cardPositionClasses =
    config.card_position === 'left'
      ? 'lg:items-center lg:justify-start lg:pl-16 xl:pl-28'
      : config.card_position === 'right'
      ? 'lg:items-center lg:justify-end lg:pr-16 xl:pr-28'
      : 'items-center justify-center';

  // Overlay background gradient computation
  const overlayDarknessDecimal =
    config.overlay_opacity !== undefined
      ? config.overlay_opacity > 1
        ? config.overlay_opacity / 100
        : config.overlay_opacity
      : (config.overlayDarkness ?? 50) / 100;

  const overlayBackground =
    config.overlayGradient === 'vignette'
      ? `radial-gradient(ellipse at center, rgba(0,0,0,${overlayDarknessDecimal * 0.4}) 0%, rgba(0,0,0,${Math.min(0.95, overlayDarknessDecimal * 1.25)}) 100%)`
      : config.overlayGradient === 'radial'
      ? `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,${overlayDarknessDecimal}) 85%)`
      : config.overlayGradient === 'dark'
      ? `linear-gradient(to bottom, rgba(0,0,0,${Math.min(0.95, overlayDarknessDecimal + 0.1)}), rgba(0,0,0,${overlayDarknessDecimal}))`
      : config.overlayGradient === 'none'
      ? `rgba(0,0,0,${overlayDarknessDecimal})`
      : `linear-gradient(135deg, rgba(0,0,0,${overlayDarknessDecimal * 0.85}) 0%, rgba(0,0,0,${overlayDarknessDecimal * 1.1}) 100%)`;

  const shouldAnimateMotion =
    (config.animation_enabled ?? config.enableMotion ?? true) && !prefersReducedMotion;
  const animType =
    config.animation_type ||
    (config.transitionEffect === 'slide'
      ? 'slide'
      : config.transitionEffect === 'pan'
      ? 'pan'
      : config.transitionEffect === 'fade'
      ? 'fade'
      : 'ken-burns');

  const zoomScale = config.zoom_intensity ? config.zoom_intensity : 1.08;
  const isPanEnabled = config.pan_enabled ?? true;

  // Header Title & Subtitle from Supabase settings
  const headline = isSignUp
    ? config.signup_title || 'Create Your Account'
    : config.login_title || config.welcomeHeadline || 'Welcome to KUD Store';

  const subheadline = isSignUp
    ? config.signup_subtitle || 'Join South Africa’s premier marketplace for lifestyle & electronics.'
    : config.login_subtitle ||
      config.welcomeSubtext ||
      'Sign in to access your orders, delivery tracker, and exclusive member discounts.';

  const showLogo = config.show_logo ?? config.showLogoBadge ?? true;

  return (
    <div
      className={`relative min-h-[calc(100vh-64px)] w-full flex ${cardPositionClasses} px-4 sm:px-6 lg:px-8 py-10 sm:py-14 overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ===================================================================== */}
      {/* DYNAMIC BACKGROUND WALLPAPERS (SUPABASE STORAGE KEN BURNS ROTATION)   */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {activeImages.map((image, index) => {
          const isCurrent = index === currentIndex;

          // Animation classes based on animType, zoom, and pan
          let transformStyle = '';
          if (shouldAnimateMotion) {
            if (animType === 'ken-burns') {
              transformStyle = isCurrent
                ? `${isPanEnabled ? 'translate-x-2' : ''} scale-[${zoomScale}]`
                : 'translate-x-0 scale-100';
            } else if (animType === 'zoom-fade') {
              transformStyle = isCurrent ? `scale-[${zoomScale}]` : 'scale-100';
            } else if (animType === 'pan') {
              transformStyle = isCurrent ? 'scale-105 translate-x-3' : 'scale-105 -translate-x-3';
            } else if (animType === 'slide') {
              transformStyle = isCurrent ? 'translate-x-0 scale-100' : 'translate-x-6 scale-100';
            } else if (animType === 'fade') {
              transformStyle = 'scale-100';
            }
          }

          return (
            <div
              key={image.id || index}
              className={`absolute inset-0 transition-opacity ease-in-out ${
                isCurrent ? 'opacity-100 z-0' : 'opacity-0 -z-10'
              }`}
              style={{
                transitionDuration: shouldAnimateMotion ? `${transitionDurationSec}s` : '0.2s',
              }}
            >
              <img
                src={image.url}
                alt={image.altText || image.title || image.name || 'Authentication Background'}
                className={`w-full h-full object-cover transition-transform ease-out ${transformStyle}`}
                style={{
                  transitionDuration: shouldAnimateMotion ? `${imageDisplayDurationSec * 1.15}s` : '0s',
                  transform: shouldAnimateMotion && isCurrent
                    ? `scale(${zoomScale}) ${isPanEnabled && animType === 'ken-burns' ? 'translateX(10px)' : ''}`
                    : 'scale(1)',
                  filter: config.overlayBlur && config.overlayBlur > 0 ? `blur(${config.overlayBlur}px)` : undefined,
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          );
        })}

        {/* Dynamic Multi-Layer Atmosphere Overlay */}
        <div
          className="absolute inset-0 transition-colors duration-700 pointer-events-none"
          style={{
            background: overlayBackground,
            backgroundColor: `rgba(0, 0, 0, ${overlayDarknessDecimal * 0.5})`,
          }}
        />

        {/* Subtle Bottom Grounding Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      </div>

      {/* ===================================================================== */}
      {/* MODERN GLASSMORPHISM CARD                                            */}
      {/* ===================================================================== */}
      <div className="relative z-10 w-full max-w-lg">
        <div
          className="w-full p-6 sm:p-9 text-left transition-all duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)]"
          style={{
            borderRadius: cardBorderRadiusPx,
            backgroundColor: `rgba(255, 255, 255, ${cardOpacityDecimal})`,
            backdropFilter: `blur(${blurValue})`,
            WebkitBackdropFilter: `blur(${blurValue})`,
            border: borderStyle,
          }}
        >
          {/* Card Header: Brand Logo Badge & Headline */}
          <div className="text-center space-y-2 mb-6">
            {showLogo && (
              <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-md border border-white/60 mb-1">
                {storeBranding?.logoUrl ? (
                  <img
                    src={storeBranding.logoUrl}
                    alt="Store Logo"
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6452] to-rose-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                    KUD
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                {headline}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-sm mx-auto leading-relaxed">
                {subheadline}
              </p>
            </div>
          </div>

          {/* Form Content Injected Here */}
          <div className="space-y-5">
            {children}
          </div>

          {/* Card Footer: Security Badges */}
          {config.showFeaturesPill && (
            <div className="pt-5 mt-5 border-t border-gray-200/50 flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Secure Auth</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>Encrypted Connection</span>
              </span>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* INTERACTIVE BACKGROUND CONTROLS (PAGINATION DOTS & TITLE)           */}
        {/* =================================================================== */}
        {activeImages.length > 1 && (
          <div className="mt-4 flex items-center justify-between px-2 text-white/80 text-xs">
            <div className="flex items-center gap-2">
              {isPresetNameVisible && displayedPresetName && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/25 shadow-xs flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#ff6452]" />
                  {displayedPresetName}
                </span>
              )}
              <div className="flex items-center gap-1.5">
                {(!isPresetNameVisible || !displayedPresetName) && <Sparkles className="w-3.5 h-3.5 text-white/90" />}
                <span className="text-[11px] font-bold text-white/90 drop-shadow-sm truncate max-w-[180px] sm:max-w-xs">
                  {activeImages[currentIndex]?.title || 'South African Lifestyle'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => (prev - 1 + activeImages.length) % activeImages.length)
                }
                aria-label="Previous background"
                className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                {activeImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Switch to background ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % activeImages.length)}
                aria-label="Next background"
                className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Preset name pill for single background */}
        {activeImages.length <= 1 && isPresetNameVisible && displayedPresetName && (
          <div className="mt-3 flex items-center justify-center px-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/25 shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#ff6452]" />
              {displayedPresetName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
