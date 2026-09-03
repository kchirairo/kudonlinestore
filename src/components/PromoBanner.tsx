import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Tag,
  ArrowRight,
  Clock,
  Flame,
  Percent,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { PromotionalBannerItem, PromoBannerConfig } from '../types';
import { isBannerActive, calculateTimeRemaining, calculateCtr } from '../utils/bannerMediaHelper';
import { adminService } from '../services/adminService';

export const PromoBanner: React.FC = () => {
  const navigate = useNavigate();
  const { promoBanner } = useShop();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});

  // Touch swipe support refs
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recordedImpressionsRef = useRef<Set<string>>(new Set());

  // Detect mobile viewport (< 768px)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(max-width: 767px)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  // Check prefers-reduced-motion: reduce
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check data-saving / Save-Data mode
  const isDataSaverMode = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return Boolean((navigator as any).connection?.saveData);
  }, []);

  // IntersectionObserver to load/play video only when near/visible and pause when offscreen
  const [isIntersecting, setIsIntersecting] = useState<boolean>(true);
  useEffect(() => {
    if (!bannerRef.current || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        setIsIntersecting(isVisible);
      },
      { threshold: [0, 0.15, 0.5, 1], rootMargin: '100px' }
    );

    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pause or play active video when intersecting status or user control changes
  useEffect(() => {
    if (!videoRef.current) return;
    if (isIntersecting && isPlayingVideo) {
      videoRef.current.play().catch(() => {
        // Silently caught if browser policy restricts autoplay
      });
    } else {
      videoRef.current.pause();
    }
  }, [isIntersecting, isPlayingVideo, currentIndex]);

  // Derive active banners list (ignoring banners without any media)
  const activeBanners: PromotionalBannerItem[] = useMemo(() => {
    if (!promoBanner || !promoBanner.enabled) return [];

    const hasMedia = (b: PromotionalBannerItem) =>
      Boolean(b.mediaUrl || b.desktopVideoUrl || b.mobileVideoUrl || b.mediaPosterUrl);

    // If modern banners array is present
    if (promoBanner.banners && promoBanner.banners.length > 0) {
      const filtered = promoBanner.banners
        .filter(isBannerActive)
        .filter(hasMedia)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      if (filtered.length > 0) {
        return filtered;
      }
    }

    // Fallback: convert legacy single config or slides into PromotionalBannerItem format
    if (promoBanner.slides && promoBanner.slides.length > 0) {
      return promoBanner.slides.map((s, idx) => ({
        id: s.id || `legacy-slide-${idx}`,
        title: s.headline || 'Exclusive Promotion',
        subtitle: s.subtext || '',
        description: '',
        mediaType: s.mediaType === 'video' ? 'video' : 'image',
        mediaUrl: s.mediaUrl || '',
        mediaAltText: s.mediaAltText || 'Promotional media',
        aspectRatio: '1:1',
        showBadge: !!s.badgeText,
        badgeType: 'CUSTOM',
        badgeCustomText: s.badgeText || '',
        badgeColor: '#ff6452',
        showCta: !!s.ctaText,
        ctaText: s.ctaText || 'Shop Now',
        ctaLink: s.ctaLink || '/search',
        textPosition: 'beside-split',
        backgroundColor: s.backgroundColor || promoBanner.backgroundColor || '#eff6ff',
        textColor: promoBanner.textColor || 'dark',
        displayOrder: idx + 1,
        isEnabled: true,
        isDraft: false,
        createdAt: new Date().toISOString(),
      }));
    }

    // Single legacy banner fallback
    if (promoBanner.headline || promoBanner.mediaUrl) {
      return [
        {
          id: 'default-legacy-banner',
          title: promoBanner.headline || 'Special Online Store Deals',
          subtitle: promoBanner.subtext || '',
          description: '',
          mediaType: promoBanner.mediaType === 'video' ? 'video' : 'image',
          mediaUrl: promoBanner.mediaUrl || '',
          mediaPosterUrl: promoBanner.mediaPosterUrl,
          mediaAltText: promoBanner.mediaAltText || 'Store promotion',
          aspectRatio: '1:1',
          showBadge: promoBanner.showBadge,
          badgeType: 'CUSTOM',
          badgeCustomText: promoBanner.badgeText,
          badgeColor: promoBanner.accentBadgeColor || '#ff6452',
          showCta: promoBanner.showCta,
          ctaText: promoBanner.ctaText || 'Shop Now',
          ctaLink: promoBanner.ctaLink || '/search',
          textPosition: promoBanner.layout === 'hero' ? 'overlay-left' : 'beside-split',
          overlayDimming: promoBanner.overlayDimming || 45,
          overlayStyle: promoBanner.overlayBackgroundStyle || 'gradient',
          backgroundColor: promoBanner.backgroundColor || '#eff6ff',
          textColor: promoBanner.textColor || 'dark',
          displayOrder: 1,
          isEnabled: true,
          isDraft: false,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  }, [promoBanner]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= activeBanners.length && activeBanners.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  // Carousel auto-rotation
  const isAutoplay = promoBanner?.carouselAutoplay !== false;
  const intervalSeconds = promoBanner?.carouselInterval || 5;
  const pauseOnHover = promoBanner?.pauseOnHover !== false;

  useEffect(() => {
    if (!isAutoplay || activeBanners.length <= 1 || (pauseOnHover && isHovered)) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, Math.max(3, intervalSeconds) * 1000);

    return () => clearInterval(timer);
  }, [isAutoplay, activeBanners.length, intervalSeconds, pauseOnHover, isHovered]);

  // Track banner impression when viewed
  useEffect(() => {
    if (!currentBanner?.id) return;
    if (!recordedImpressionsRef.current.has(currentBanner.id)) {
      recordedImpressionsRef.current.add(currentBanner.id);
      adminService.recordBannerImpression(currentBanner.id).catch(() => {});
    }
  }, [currentBanner?.id]);

  // Handle CTA Click & Tracking
  const handleCtaClick = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      if (!currentBanner) return;

      // Record click analytics
      if (currentBanner.id) {
        adminService.recordBannerClick(currentBanner.id).catch(() => {});
      }

      const targetUrl = currentBanner.ctaLink;
      if (!targetUrl) {
        if (currentBanner.targetCategory) {
          navigate(`/categories/${encodeURIComponent(currentBanner.targetCategory.toLowerCase())}`);
        } else if (currentBanner.targetProductId) {
          navigate(`/product/${currentBanner.targetProductId}`);
        } else {
          navigate('/search');
        }
        return;
      }

      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(targetUrl);
      }
    },
    [currentBanner, navigate]
  );

  // Navigation handlers
  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    },
    [activeBanners.length]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    },
    [activeBanners.length]
  );

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45; // Minimum px for swipe

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev
      handlePrev();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Video error handler
  const handleVideoError = (bannerId: string) => {
    setVideoErrorMap((prev) => ({ ...prev, [bannerId]: true }));
  };

  if (!promoBanner || !promoBanner.enabled || activeBanners.length === 0 || !currentBanner) {
    return null;
  }

  const hasMultipleBanners = activeBanners.length > 1;
  const showArrows = promoBanner.showNavigationArrows !== false && hasMultipleBanners;
  const showIndicators = promoBanner.showIndicators !== false && hasMultipleBanners;

  // Countdown timer hook/ticker
  const isVideoFailed = videoErrorMap[currentBanner.id] === true;
  const isVideoPermitted = !prefersReducedMotion && !isDataSaverMode && !isVideoFailed;

  const hasMobileVideo = Boolean(currentBanner.mobileVideoUrl);
  const hasDesktopVideo = Boolean(
    currentBanner.desktopVideoUrl ||
    (currentBanner.mediaType === 'video' && currentBanner.mediaUrl)
  );

  let activeVideoUrl: string | null = null;
  let isDedicatedMobileVideo = false;

  if (isVideoPermitted) {
    if (isMobileViewport && hasMobileVideo) {
      activeVideoUrl = currentBanner.mobileVideoUrl!;
      isDedicatedMobileVideo = true;
    } else if (hasDesktopVideo) {
      activeVideoUrl = currentBanner.desktopVideoUrl || currentBanner.mediaUrl || null;
    } else if (hasMobileVideo) {
      activeVideoUrl = currentBanner.mobileVideoUrl!;
      isDedicatedMobileVideo = true;
    }
  }

  const isVideo = Boolean(activeVideoUrl);
  const fallbackImageUrl = currentBanner.mediaUrl || currentBanner.mediaPosterUrl || '';
  const showControls = Boolean(currentBanner.showVideoControls || currentBanner.videoControls);

  // Object position for responsive cropping without stretching or distortion
  const videoObjectPosition = isMobileViewport
    ? (currentBanner.mobileVideoFocalPosition === 'left'
        ? 'left center'
        : currentBanner.mobileVideoFocalPosition === 'right'
        ? 'right center'
        : 'center center')
    : 'center center';

  const currentRatio: '1:1' | '4:3' | '16:9' =
    currentBanner.aspectRatio === '4:3' || currentBanner.aspectRatio === '16:9' || currentBanner.aspectRatio === '1:1'
      ? currentBanner.aspectRatio
      : promoBanner.aspectRatio === '4:3' || promoBanner.aspectRatio === '16:9'
      ? promoBanner.aspectRatio
      : '1:1';

  return (
    <div
      ref={bannerRef}
      id="storefront-promotional-banner-container"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        id={`promo-card-${currentBanner.id}`}
        style={{
          backgroundColor: currentBanner.backgroundColor || '#eff6ff',
        }}
        className="relative overflow-hidden rounded-3xl sm:rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group"
      >
        {/* Render Banner based on layout: Split Card (Default) or Overlaid Hero */}
        {currentBanner.textPosition?.startsWith('overlay-') ? (
          /* OVERLAY HERO FULL VISUAL MODE */
          <div
            className={`relative w-full flex items-center overflow-hidden transition-all duration-300 ${
              isMobileViewport && isDedicatedMobileVideo
                ? 'min-h-[420px] sm:min-h-[460px]'
                : currentRatio === '16:9'
                ? 'min-h-[290px] sm:min-h-[380px] md:min-h-[440px]'
                : currentRatio === '4:3'
                ? 'min-h-[330px] sm:min-h-[410px] md:min-h-[460px]'
                : 'min-h-[360px] sm:min-h-[440px] md:min-h-[480px]'
            }`}
          >
            {/* Background Media */}
            <div className="absolute inset-0 w-full h-full">
              {isVideo && activeVideoUrl ? (
                <video
                  ref={videoRef}
                  key={`video-overlay-${currentBanner.id}-${activeVideoUrl}`}
                  src={activeVideoUrl}
                  poster={currentBanner.mediaPosterUrl || fallbackImageUrl || undefined}
                  autoPlay={currentBanner.videoAutoplay !== false && isPlayingVideo}
                  muted={isMuted}
                  loop={currentBanner.videoLoop !== false}
                  playsInline
                  preload="metadata"
                  onError={() => handleVideoError(currentBanner.id)}
                  style={{ objectPosition: videoObjectPosition }}
                  className="w-full h-full object-cover"
                />
              ) : fallbackImageUrl ? (
                <img
                  src={fallbackImageUrl}
                  alt={currentBanner.mediaAltText || currentBanner.title}
                  loading={currentIndex === 0 ? 'eager' : 'lazy'}
                  fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
              )}
            </div>

            {/* Readability Scrim / Overlay Gradient */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundColor:
                  currentBanner.overlayStyle === 'solid'
                    ? `rgba(0, 0, 0, ${(currentBanner.overlayDimming ?? 45) / 100})`
                    : 'transparent',
                background:
                  currentBanner.overlayStyle !== 'solid'
                    ? currentBanner.textPosition === 'overlay-right'
                      ? `linear-gradient(to left, rgba(15,23,42,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.5) / 100)}) 0%, rgba(15,23,42,${((currentBanner.overlayDimming ?? 45) * 0.8) / 100}) 55%, transparent 100%)`
                      : currentBanner.textPosition === 'overlay-center'
                      ? `radial-gradient(circle, rgba(15,23,42,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.4) / 100)}) 0%, rgba(15,23,42,${((currentBanner.overlayDimming ?? 45) * 0.9) / 100}) 70%, rgba(15,23,42,0.6) 100%)`
                      : currentBanner.textPosition === 'overlay-bottom'
                      ? `linear-gradient(to top, rgba(15,23,42,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.6) / 100)}) 0%, rgba(15,23,42,${((currentBanner.overlayDimming ?? 45) * 0.7) / 100}) 60%, transparent 100%)`
                      : currentBanner.textPosition === 'overlay-top'
                      ? `linear-gradient(to bottom, rgba(15,23,42,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.6) / 100)}) 0%, rgba(15,23,42,${((currentBanner.overlayDimming ?? 45) * 0.7) / 100}) 60%, transparent 100%)`
                      : `linear-gradient(to right, rgba(15,23,42,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.5) / 100)}) 0%, rgba(15,23,42,${((currentBanner.overlayDimming ?? 45) * 0.8) / 100}) 55%, transparent 100%)`
                    : undefined,
              }}
            />

            {/* Overlaid Content */}
            <div
              className={`relative z-10 w-full p-6 sm:p-10 md:p-14 flex ${
                currentBanner.textPosition === 'overlay-center'
                  ? 'justify-center text-center'
                  : currentBanner.textPosition === 'overlay-right'
                  ? 'justify-end text-right'
                  : currentBanner.textPosition === 'overlay-bottom'
                  ? 'items-end text-left'
                  : currentBanner.textPosition === 'overlay-top'
                  ? 'items-start text-left'
                  : 'justify-start text-left'
              }`}
            >
              <div className="max-w-xl space-y-4">
                <BannerBadgeRow banner={currentBanner} isOverlaid={true} />
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed drop-shadow-xs">
                    {currentBanner.subtitle}
                  </p>
                )}
                {currentBanner.description && (
                  <p className="text-xs sm:text-sm text-slate-200/90 leading-normal line-clamp-2">
                    {currentBanner.description}
                  </p>
                )}

                {/* Offer Highlights & Countdown */}
                <BannerOfferMeta banner={currentBanner} isOverlaid={true} />

                {/* Action CTA Button */}
                {currentBanner.showCta !== false && (
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      id={`cta-btn-${currentBanner.id}`}
                      type="button"
                      onClick={handleCtaClick}
                      className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-[#ff6452] text-white hover:bg-[#e85340] active:scale-98 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                    >
                      <span>{currentBanner.ctaText || 'Shop Now'}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Video Controls (Floating bottom right) */}
            {isVideo && showControls && (
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs border border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="p-1 hover:text-[#ff6452] transition-colors cursor-pointer"
                  aria-label={isPlayingVideo ? 'Pause video' : 'Play video'}
                >
                  {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 hover:text-[#ff6452] transition-colors cursor-pointer"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* DYNAMIC SPLIT SHOWCASE (1:1 Square, 4:3 Standard, or 16:9 Widescreen) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center p-4 sm:p-6 md:p-8 lg:p-10">
            {/* Left Promotional Content & Text */}
            <div
              className={`space-y-4 sm:space-y-5 order-2 lg:order-1 flex flex-col justify-center ${
                currentRatio === '16:9'
                  ? 'lg:col-span-5'
                  : currentRatio === '4:3'
                  ? 'lg:col-span-6'
                  : 'lg:col-span-7'
              }`}
            >
              {/* Badges & Flash Tag */}
              <BannerBadgeRow banner={currentBanner} isOverlaid={false} />

              {/* Title & Headline */}
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-base sm:text-lg md:text-xl font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>

              {/* Description */}
              {currentBanner.description && (
                <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  {currentBanner.description}
                </p>
              )}

              {/* Pricing, Discount %, & Live Countdown */}
              <BannerOfferMeta banner={currentBanner} isOverlaid={false} />

              {/* Call-to-Action Action Buttons */}
              {currentBanner.showCta !== false && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    id={`cta-btn-${currentBanner.id}`}
                    type="button"
                    onClick={handleCtaClick}
                    className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-[#ff6452] text-white hover:bg-[#e85340] active:scale-98 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <span>{currentBanner.ctaText || 'Shop Now'}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>

                  {/* Secondary Quick Category / Catalog Tag */}
                  {currentBanner.targetCategory && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/categories/${encodeURIComponent(currentBanner.targetCategory!.toLowerCase())}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#ff6452]" />
                      <span>{currentBanner.targetCategory}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Media Showcase with dynamic Aspect Ratio (1:1, 4:3, or 16:9) */}
            <div
              className={`order-1 lg:order-2 flex items-center justify-center ${
                currentRatio === '16:9'
                  ? 'lg:col-span-7'
                  : currentRatio === '4:3'
                  ? 'lg:col-span-6'
                  : 'lg:col-span-5'
              }`}
            >
              <div
                className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md bg-slate-900 border border-slate-200/60 dark:border-slate-800 group/media transition-all duration-300 ${
                  isMobileViewport && isDedicatedMobileVideo
                    ? 'max-w-[320px] aspect-[4/5]'
                    : currentRatio === '16:9'
                    ? 'max-w-[460px] sm:max-w-[520px] md:max-w-[580px] lg:max-w-[640px] aspect-[16/9]'
                    : currentRatio === '4:3'
                    ? 'max-w-[380px] sm:max-w-[440px] md:max-w-[480px] lg:max-w-[520px] aspect-[4/3]'
                    : 'max-w-[340px] sm:max-w-[380px] md:max-w-[420px] lg:max-w-[460px] aspect-square'
                }`}
              >
                {/* Media Container */}
                {isVideo && activeVideoUrl ? (
                  <video
                    ref={videoRef}
                    key={`video-split-${currentBanner.id}-${activeVideoUrl}`}
                    src={activeVideoUrl}
                    poster={currentBanner.mediaPosterUrl || fallbackImageUrl || undefined}
                    autoPlay={currentBanner.videoAutoplay !== false && isPlayingVideo}
                    muted={isMuted}
                    loop={currentBanner.videoLoop !== false}
                    playsInline
                    preload="metadata"
                    onError={() => handleVideoError(currentBanner.id)}
                    style={{ objectPosition: videoObjectPosition }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                  />
                ) : fallbackImageUrl ? (
                  <img
                    src={fallbackImageUrl}
                    alt={currentBanner.mediaAltText || currentBanner.title}
                    loading={currentIndex === 0 ? 'eager' : 'lazy'}
                    fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <Sparkles className="w-10 h-10 text-[#ff6452] mb-2" />
                    <p className="text-xs font-semibold">Special Promotion</p>
                  </div>
                )}

                {/* Floating Discount Tag on image if applicable */}
                {currentBanner.showDiscount && currentBanner.discountPercentage && (
                  <div className="absolute top-3 left-3 bg-[#ff6452] text-white text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>{currentBanner.discountPercentage}% OFF</span>
                  </div>
                )}

                {/* Video controls */}
                {isVideo && showControls && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs border border-white/10 z-10">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                      className="p-1 hover:text-[#ff6452] transition-colors cursor-pointer"
                      aria-label={isPlayingVideo ? 'Pause video' : 'Play video'}
                    >
                      {isPlayingVideo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1 hover:text-[#ff6452] transition-colors cursor-pointer"
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Carousel Navigation Arrows */}
        {showArrows && (
          <>
            <button
              id="promo-carousel-prev-btn"
              type="button"
              onClick={handlePrev}
              aria-label="Previous promotional slide"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer border border-slate-200 dark:border-slate-700 hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id="promo-carousel-next-btn"
              type="button"
              onClick={handleNext}
              aria-label="Next promotional slide"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer border border-slate-200 dark:border-slate-700 hover:scale-105"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Carousel Indicators / Dots (Bottom Center) */}
        {showIndicators && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20 bg-slate-900/40 backdrop-blur-md px-3 py-1.5 rounded-full">
            {activeBanners.map((banner, idx) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}: ${banner.title}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 bg-[#ff6452]'
                    : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Subcomponent to render badges (HOT DEAL, SALE, NEW, FLASH SALE, etc.)
 */
const BannerBadgeRow: React.FC<{
  banner: PromotionalBannerItem;
  isOverlaid: boolean;
}> = ({ banner, isOverlaid }) => {
  if (!banner.showBadge && !banner.badgeCustomText && !banner.badgeType) {
    return null;
  }

  const badgeText = banner.badgeCustomText || banner.badgeType || 'HOT DEAL 🔥';
  const badgeColor = banner.badgeColor || '#ff6452';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        style={{ backgroundColor: badgeColor }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider shadow-xs"
      >
        <Flame className="w-3.5 h-3.5" />
        <span>{badgeText}</span>
      </span>

      {banner.isFeatured && (
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            isOverlaid
              ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300'
          }`}
        >
          ⭐ Featured
        </span>
      )}
    </div>
  );
};

/**
 * Subcomponent to render Offer Meta (Discount %, Price Tag, and Live Countdown)
 */
const BannerOfferMeta: React.FC<{
  banner: PromotionalBannerItem;
  isOverlaid: boolean;
}> = ({ banner, isOverlaid }) => {
  const [remainingTime, setRemainingTime] = useState(() =>
    calculateTimeRemaining(banner.countdownEndDate)
  );

  useEffect(() => {
    if (!banner.showCountdown || !banner.countdownEndDate) return;

    const timer = setInterval(() => {
      setRemainingTime(calculateTimeRemaining(banner.countdownEndDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [banner.showCountdown, banner.countdownEndDate]);

  const hasPricing =
    banner.promotionalPrice !== undefined ||
    banner.originalPrice !== undefined ||
    (banner.showDiscount && banner.discountPercentage);

  const hasCountdown =
    banner.showCountdown &&
    banner.countdownEndDate &&
    !remainingTime.isExpired;

  if (!hasPricing && !hasCountdown) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-1">
      {/* Price & Discount Tags */}
      {hasPricing && (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${
            isOverlaid
              ? 'bg-slate-900/70 backdrop-blur-md text-white border border-white/10'
              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-2xs'
          }`}
        >
          {banner.promotionalPrice !== undefined && (
            <span className="text-lg sm:text-xl font-black text-[#ff6452]">
              R{banner.promotionalPrice}
            </span>
          )}
          {banner.originalPrice !== undefined && (
            <span className="text-xs sm:text-sm line-through text-slate-400">
              R{banner.originalPrice}
            </span>
          )}
          {banner.discountPercentage && (
            <span className="text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md">
              {banner.discountPercentage}% OFF
            </span>
          )}
        </div>
      )}

      {/* Live Countdown Ticker */}
      {hasCountdown && (
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl ${
            isOverlaid
              ? 'bg-rose-950/70 backdrop-blur-md text-rose-200 border border-rose-500/30'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <Clock className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Ends in:</span>
          <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-black">
            {remainingTime.days > 0 && (
              <span>{remainingTime.days}d :</span>
            )}
            <span>{String(remainingTime.hours).padStart(2, '0')}h :</span>
            <span>{String(remainingTime.minutes).padStart(2, '0')}m :</span>
            <span className="text-[#ff6452]">
              {String(remainingTime.seconds).padStart(2, '0')}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
