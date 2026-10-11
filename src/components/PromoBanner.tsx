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
import { PromotionalBannerItem, PromoBannerConfig, Product } from '../types';
import { isBannerActive, calculateTimeRemaining } from '../utils/bannerMediaHelper';
import { adminService } from '../services/adminService';
import { categoryToSlug } from '../utils/seo';

interface PromoBannerProps {
  products?: Product[];
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ products = [] }) => {
  const navigate = useNavigate();
  const { promoBanner } = useShop();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchInteracting, setIsTouchInteracting] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const handleVideoError = useCallback((bannerId: string) => {
    setVideoErrorMap((prev) => ({ ...prev, [bannerId]: true }));
  }, []);

  const handleImageError = useCallback((bannerId: string) => {
    setImageErrorMap((prev) => ({ ...prev, [bannerId]: true }));
  }, []);

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

  // Derive active banners list from Admin-saved banners in Supabase, or dynamically from live products
  const activeBanners: PromotionalBannerItem[] = useMemo(() => {
    const isGloballyActive = promoBanner?.promotional_banner_enabled === true && promoBanner?.enabled === true;
    if (isGloballyActive && promoBanner.banners && Array.isArray(promoBanner.banners)) {
      const active = promoBanner.banners
        .filter(isBannerActive)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      if (active.length > 0) {
        return active;
      }
    }

    // Dynamic fallback using existing live product/promotional data from the database
    const validProducts = products.filter((p) => {
      const firstImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '';
      return typeof firstImg === 'string' && firstImg.trim().length > 0 && !firstImg.startsWith('data:image');
    });

    if (validProducts.length === 0) return [];

    // Prioritize discounted items first, then in-stock items across distinct categories
    const discounted = validProducts.filter(
      (p) => (p.discountPercentage && p.discountPercentage > 0) || (p.originalPrice && p.originalPrice > p.price)
    );
    const others = validProducts.filter((p) => !discounted.some((d) => d.id === p.id));
    const pool = [...discounted, ...others].slice(0, 4);

    const ctaLabels = ['Shop Now', 'View Deal', 'Explore', 'Shop Now'];
    const badgeLabels = ['HOT DEAL 🔥', 'LIMITED OFFER', 'FEATURED PICK', 'TOP VALUE'];
    const bgColors = ['#0b2b5e', '#103778', '#0d3166', '#153e85'];

    return pool.map((prod, idx) => {
      const computedDiscount =
        prod.discountPercentage ||
        (prod.originalPrice && prod.originalPrice > prod.price
          ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)
          : undefined);

      return {
        id: `dynamic-hero-${prod.id}`,
        enabled: true,
        title: prod.name,
        subtitle: prod.category ? `${prod.brand ? `${prod.brand} • ` : ''}${prod.category}` : prod.brand || 'Verified Quality',
        description: prod.description || 'Fast nationwide delivery & secure Yoco checkout across South Africa.',
        ctaText: ctaLabels[idx % ctaLabels.length],
        ctaLink: `/product/${prod.id}`,
        targetProductId: prod.id,
        targetCategory: prod.category,
        mediaType: 'image',
        mediaUrl: prod.images[0],
        mediaAltText: prod.name,
        aspectRatio: '1:1',
        backgroundColor: bgColors[idx % bgColors.length],
        showBadge: true,
        badgeType: 'HOT DEAL',
        badgeCustomText: computedDiscount ? `SAVE ${computedDiscount}%` : badgeLabels[idx % badgeLabels.length],
        badgeColor: '#ff6452',
        showDiscount: Boolean(computedDiscount),
        discountPercentage: computedDiscount,
        promotionalPrice: prod.price,
        originalPrice: prod.originalPrice,
        showCta: true,
        displayOrder: idx,
      } as PromotionalBannerItem;
    });
  }, [promoBanner, products]);

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
    if (
      !isAutoplay ||
      activeBanners.length <= 1 ||
      (pauseOnHover && isHovered) ||
      isTouchInteracting
    ) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, Math.max(3, intervalSeconds) * 1000);

    return () => clearInterval(timer);
  }, [isAutoplay, activeBanners.length, intervalSeconds, pauseOnHover, isHovered, isTouchInteracting]);

  // Track banner impression when viewed (only for admin-saved banners)
  useEffect(() => {
    if (!currentBanner?.id || currentBanner.id.startsWith('dynamic-hero-')) return;
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

      // Record click analytics for admin banners
      if (currentBanner.id && !currentBanner.id.startsWith('dynamic-hero-')) {
        adminService.recordBannerClick(currentBanner.id).catch(() => {});
      }

      const targetUrl = currentBanner.ctaLink;
      if (!targetUrl) {
        if (currentBanner.targetCategory) {
          navigate(`/category/${categoryToSlug(currentBanner.targetCategory)}`);
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
    setIsTouchInteracting(true);
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current && touchEndXRef.current) {
      const distance = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 40; // Minimum px for swipe

      if (distance > minSwipeDistance) {
        // Swiped Left -> Next
        handleNext();
      } else if (distance < -minSwipeDistance) {
        // Swiped Right -> Prev
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
    setTimeout(() => setIsTouchInteracting(false), 1500);
  };

  if (activeBanners.length === 0 || !currentBanner) {
    return null;
  }

  const hasMultipleBanners = activeBanners.length > 1;
  const showArrows = promoBanner.showNavigationArrows !== false && hasMultipleBanners;
  const showIndicators = promoBanner.showIndicators !== false && hasMultipleBanners;

  // Media validation: strictly ensure media comes from configured Admin data and has not failed
  const isVideoFailed = videoErrorMap[currentBanner.id] === true;
  const isImageFailed = imageErrorMap[currentBanner.id] === true;
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
      activeVideoUrl = currentBanner.desktopVideoUrl || (currentBanner.mediaType === 'video' ? currentBanner.mediaUrl : null);
    } else if (hasMobileVideo) {
      activeVideoUrl = currentBanner.mobileVideoUrl!;
      isDedicatedMobileVideo = true;
    }
  }

  const isVideo = Boolean(activeVideoUrl);

  // Strictly validate that active image URL comes from the configured banner, is not a video file, and has not failed
  let activeImageUrl: string | null = null;
  if (!isImageFailed) {
    if (currentBanner.mediaType === 'image' && currentBanner.mediaUrl) {
      const url = currentBanner.mediaUrl.trim();
      const isVideoFile = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
      if (url && !isVideoFile) {
        activeImageUrl = url;
      }
    } else if (currentBanner.mediaType === 'video' && currentBanner.mediaPosterUrl) {
      const url = currentBanner.mediaPosterUrl.trim();
      const isVideoFile = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
      if (url && !isVideoFile) {
        activeImageUrl = url;
      }
    }
  }

  const hasValidMedia = Boolean((isVideo && activeVideoUrl) || activeImageUrl);
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

  const isDarkHeroBg =
    !currentBanner.backgroundColor ||
    currentBanner.backgroundColor.startsWith('#0') ||
    currentBanner.backgroundColor.startsWith('#1') ||
    currentBanner.id.startsWith('dynamic-hero-');

  return (
    <div
      ref={bannerRef}
      id="storefront-promotional-banner-container"
      className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-2 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        id={`promo-card-${currentBanner.id}`}
        style={{
          backgroundColor: currentBanner.backgroundColor || '#0d3166',
        }}
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border shadow-md hover:shadow-lg transition-all duration-300 group ${
          isDarkHeroBg
            ? 'bg-gradient-to-br from-[#08224a] via-[#103778] to-[#1d56b8] border-blue-900/40 text-white'
            : 'border-slate-200/80 dark:border-slate-800'
        }`}
      >
        {/* Decorative subtle glow accents for dark blue hero */}
        {isDarkHeroBg && (
          <div className="pointer-events-none absolute -right-12 -top-12 w-56 h-56 rounded-full bg-blue-400/15 blur-2xl" />
        )}

        {/* Render Banner based on layout: Split Card (Default) or Overlaid Hero */}
        {currentBanner.textPosition?.startsWith('overlay-') ? (
          /* OVERLAY HERO FULL VISUAL MODE */
          <div
            className={`relative w-full flex items-center overflow-hidden transition-all duration-300 ${
              isMobileViewport && isDedicatedMobileVideo
                ? 'min-h-[340px] sm:min-h-[420px]'
                : currentRatio === '16:9'
                ? 'min-h-[240px] sm:min-h-[340px] md:min-h-[400px]'
                : currentRatio === '4:3'
                ? 'min-h-[260px] sm:min-h-[360px] md:min-h-[420px]'
                : 'min-h-[280px] sm:min-h-[380px] md:min-h-[440px]'
            }`}
          >
            {/* Background Media */}
            <div className="absolute inset-0 w-full h-full">
              {isVideo && activeVideoUrl ? (
                <video
                  ref={videoRef}
                  key={`video-overlay-${currentBanner.id}-${activeVideoUrl}`}
                  src={activeVideoUrl}
                  poster={activeImageUrl || undefined}
                  autoPlay={currentBanner.videoAutoplay !== false && isPlayingVideo}
                  muted={isMuted}
                  loop={currentBanner.videoLoop !== false}
                  playsInline
                  preload="metadata"
                  onError={() => handleVideoError(currentBanner.id)}
                  style={{ objectPosition: videoObjectPosition }}
                  className="w-full h-full object-cover"
                />
              ) : activeImageUrl ? (
                <img
                  src={activeImageUrl}
                  alt={currentBanner.mediaAltText || currentBanner.title}
                  loading={currentIndex === 0 ? 'eager' : 'lazy'}
                  fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                  onError={() => handleImageError(currentBanner.id)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: currentBanner.backgroundColor || '#0d3166' }}
                />
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
                      ? `linear-gradient(to left, rgba(8,34,74,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.5) / 100)}) 0%, rgba(8,34,74,${((currentBanner.overlayDimming ?? 45) * 0.8) / 100}) 55%, transparent 100%)`
                      : currentBanner.textPosition === 'overlay-center'
                      ? `radial-gradient(circle, rgba(8,34,74,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.4) / 100)}) 0%, rgba(8,34,74,${((currentBanner.overlayDimming ?? 45) * 0.9) / 100}) 70%, rgba(8,34,74,0.6) 100%)`
                      : currentBanner.textPosition === 'overlay-bottom'
                      ? `linear-gradient(to top, rgba(8,34,74,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.6) / 100)}) 0%, rgba(8,34,74,${((currentBanner.overlayDimming ?? 45) * 0.7) / 100}) 60%, transparent 100%)`
                      : currentBanner.textPosition === 'overlay-top'
                      ? `linear-gradient(to bottom, rgba(8,34,74,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.6) / 100)}) 0%, rgba(8,34,74,${((currentBanner.overlayDimming ?? 45) * 0.7) / 100}) 60%, transparent 100%)`
                      : `linear-gradient(to right, rgba(8,34,74,${Math.min(0.95, ((currentBanner.overlayDimming ?? 45) * 1.5) / 100)}) 0%, rgba(8,34,74,${((currentBanner.overlayDimming ?? 45) * 0.8) / 100}) 55%, transparent 100%)`
                    : undefined,
              }}
            />

            {/* Overlaid Content */}
            <div
              className={`relative z-10 w-full p-5 sm:p-8 md:p-12 pb-9 flex ${
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
              <div className="max-w-xl space-y-3">
                <BannerBadgeRow banner={currentBanner} isOverlaid={true} />
                <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p className="text-sm sm:text-lg text-blue-100 font-medium leading-snug drop-shadow-xs">
                    {currentBanner.subtitle}
                  </p>
                )}

                {/* Offer Highlights & Countdown */}
                <BannerOfferMeta banner={currentBanner} isOverlaid={true} />

                {/* Action CTA Button */}
                {currentBanner.showCta !== false && (
                  <div className="pt-1 flex items-center gap-3">
                    <button
                      id={`cta-btn-${currentBanner.id}`}
                      type="button"
                      onClick={handleCtaClick}
                      className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full font-bold text-xs sm:text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-blue-400/30 active:scale-95 transition-all shadow-lg cursor-pointer"
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
          /* MODERN MOBILE-FIRST HORIZONTAL HERO SHOWCASE */
          <div className="grid grid-cols-12 gap-3 sm:gap-6 md:gap-8 items-center p-4 pb-8 sm:p-6 sm:pb-10 md:p-8 lg:p-10">
            {/* Left Promotional Content & Text */}
            <div
              className={`space-y-2 sm:space-y-3.5 ${
                hasValidMedia
                  ? 'col-span-7 sm:col-span-7 lg:col-span-7 flex flex-col justify-center'
                  : 'col-span-12 max-w-3xl mx-auto'
              }`}
            >
              {/* Badges & Flash Tag */}
              <BannerBadgeRow banner={currentBanner} isOverlaid={isDarkHeroBg} />

              {/* Title & Headline */}
              <div className="space-y-1">
                <h2
                  className={`text-base sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight line-clamp-2 ${
                    isDarkHeroBg ? 'text-white' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {currentBanner.title}
                </h2>
                {currentBanner.subtitle && (
                  <p
                    className={`text-[11px] sm:text-sm md:text-base font-semibold leading-snug line-clamp-1 ${
                      isDarkHeroBg ? 'text-blue-100/90' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {currentBanner.subtitle}
                  </p>
                )}
              </div>

              {/* Description (Hidden on compact mobile to keep hero sleek) */}
              {currentBanner.description && (
                <p
                  className={`hidden sm:block text-xs md:text-sm leading-relaxed line-clamp-2 ${
                    isDarkHeroBg ? 'text-blue-100/80' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {currentBanner.description}
                </p>
              )}

              {/* Pricing, Discount %, & Live Countdown */}
              <BannerOfferMeta banner={currentBanner} isOverlaid={isDarkHeroBg} />

              {/* Call-to-Action Action Buttons */}
              {currentBanner.showCta !== false && (
                <div className="pt-1 flex flex-wrap items-center gap-2.5">
                  <button
                    id={`cta-btn-${currentBanner.id}`}
                    type="button"
                    onClick={handleCtaClick}
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-blue-400/40 active:scale-95 transition-all shadow-md hover:shadow-lg cursor-pointer"
                  >
                    <span>{currentBanner.ctaText || 'Shop Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              )}
            </div>

            {/* Right Media Showcase */}
            {hasValidMedia && (
              <div className="col-span-5 sm:col-span-5 lg:col-span-5 flex items-center justify-center">
                <div
                  onClick={handleCtaClick}
                  className="relative w-full max-w-[140px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[320px] aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg bg-white/95 dark:bg-slate-900 border border-white/25 group/media transition-all duration-300 cursor-pointer"
                >
                  {isVideo && activeVideoUrl ? (
                    <video
                      ref={videoRef}
                      key={`video-split-${currentBanner.id}-${activeVideoUrl}`}
                      src={activeVideoUrl}
                      poster={activeImageUrl || undefined}
                      autoPlay={currentBanner.videoAutoplay !== false && isPlayingVideo}
                      muted={isMuted}
                      loop={currentBanner.videoLoop !== false}
                      playsInline
                      preload="metadata"
                      onError={() => handleVideoError(currentBanner.id)}
                      style={{ objectPosition: videoObjectPosition }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                    />
                  ) : activeImageUrl ? (
                    <img
                      src={activeImageUrl}
                      alt={currentBanner.mediaAltText || currentBanner.title}
                      loading={currentIndex === 0 ? 'eager' : 'lazy'}
                      fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
                      onError={() => handleImageError(currentBanner.id)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
                    />
                  ) : null}

                  {/* Floating Discount Tag on image if applicable */}
                  {currentBanner.showDiscount && currentBanner.discountPercentage && (
                    <div className="absolute top-2 left-2 bg-[#ef4444] text-white text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
                      <span>-{currentBanner.discountPercentage}%</span>
                    </div>
                  )}

                  {/* Video controls */}
                  {isVideo && showControls && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full text-white text-xs border border-white/10 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsPlayingVideo(!isPlayingVideo);
                        }}
                        className="p-0.5 hover:text-[#38bdf8] transition-colors cursor-pointer"
                        aria-label={isPlayingVideo ? 'Pause video' : 'Play video'}
                      >
                        {isPlayingVideo ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMuted(!isMuted);
                        }}
                        className="p-0.5 hover:text-[#38bdf8] transition-colors cursor-pointer"
                        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      >
                        {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer border border-slate-200 dark:border-slate-700 hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id="promo-carousel-next-btn"
              type="button"
              onClick={handleNext}
              aria-label="Next promotional slide"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-white shadow-md items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-20 cursor-pointer border border-slate-200 dark:border-slate-700 hover:scale-105"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Carousel Indicators / Dots (Bottom Center) */}
        {showIndicators && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {activeBanners.map((banner, idx) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}: ${banner.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx
                    ? 'w-5 bg-white shadow-xs'
                    : 'w-1.5 bg-white/45 hover:bg-white/75'
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
