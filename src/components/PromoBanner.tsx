import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
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
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { PromoBannerConfig, PromoBannerSlide } from '../types';

export const PromoBanner: React.FC = () => {
  const navigate = useNavigate();
  const { promoBanner } = useShop();

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const {
    layout = 'split',
    headline = '',
    subtext = '',
    badgeText = '',
    showBadge = true,
    ctaText = 'Shop Now',
    ctaLink = '/search',
    showCta = true,
    mediaType = 'image',
    mediaUrl = '',
    mediaPosterUrl = '',
    mediaAltText = '',
    videoAutoplay = true,
    videoMuted = true,
    videoLoop = true,
    videoControls = false,
    backgroundColor = '#eff6ff',
    textColor = 'dark',
    accentBadgeColor = '#ff6452',
    slides = [],
  } = promoBanner || {};

  // Multi-slide handling
  const isMultiSlide = layout === 'slides' && slides.length > 1;
  const activeSlide: PromoBannerSlide | null = isMultiSlide ? slides[currentSlideIndex] : null;

  const currentHeadline = activeSlide?.headline || headline;
  const currentSubtext = activeSlide?.subtext || subtext;
  const currentBadge = activeSlide?.badgeText || badgeText;
  const currentMediaType = activeSlide?.mediaType || mediaType;
  const currentMediaUrl = activeSlide?.mediaUrl || mediaUrl;
  const currentCtaText = activeSlide?.ctaText || ctaText;
  const currentCtaLink = activeSlide?.ctaLink || ctaLink;
  const currentBgColor = activeSlide?.backgroundColor || backgroundColor;

  // Auto rotate slides if multi-slide
  useEffect(() => {
    if (!isMultiSlide || !promoBanner?.enabled) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isMultiSlide, slides.length, promoBanner?.enabled]);

  if (!promoBanner || !promoBanner.enabled) {
    return null;
  }

  const handleCtaClick = () => {
    if (!currentCtaLink) return;
    if (currentCtaLink.startsWith('http://') || currentCtaLink.startsWith('https://')) {
      window.open(currentCtaLink, '_blank', 'noopener,noreferrer');
    } else {
      navigate(currentCtaLink);
    }
  };

  // Helper to detect and render YouTube or direct video
  const renderVideo = (url: string) => {
    if (!url) return null;

    // YouTube handling
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }

      if (videoId) {
        return (
          <div className="relative w-full h-full min-h-[220px] sm:min-h-[280px] rounded-2xl overflow-hidden shadow-inner bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=${videoAutoplay ? 1 : 0}&mute=${videoMuted ? 1 : 0}&loop=${videoLoop ? 1 : 0}&playlist=${videoId}&controls=${videoControls ? 1 : 0}`}
              title="Advertising Video"
              className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
    }

    // Direct HTML5 video (.mp4, .webm, data:video, etc.)
    return (
      <div className="relative w-full h-full min-h-[220px] sm:min-h-[280px] rounded-2xl overflow-hidden bg-black flex items-center justify-center group/video">
        <video
          src={url}
          poster={mediaPosterUrl}
          autoPlay={videoAutoplay && isPlaying}
          muted={isMuted}
          loop={videoLoop}
          controls={videoControls}
          playsInline
          className="w-full h-full object-cover max-h-[360px]"
        />
        {!videoControls && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full text-white text-xs opacity-80 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 hover:text-[#ff6452] transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 hover:text-[#ff6452] transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  // 1. Compact Classic Layout
  if (layout === 'compact') {
    return (
      <div className="w-full my-4 px-4 sm:px-6 lg:px-8">
        <div
          style={{ backgroundColor: currentBgColor }}
          className="max-w-7xl mx-auto rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 border border-blue-100/80 shadow-xs transition-all hover:shadow-md"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#ff6452]/10 text-[#ff6452] flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showBadge && currentBadge && (
                  <span
                    style={{ backgroundColor: accentBadgeColor }}
                    className="text-[10px] uppercase tracking-wider font-extrabold text-white px-2 py-0.5 rounded-full"
                  >
                    {currentBadge}
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug truncate">
                  {currentHeadline}
                </h3>
              </div>
              {currentSubtext && (
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-1">
                  {currentSubtext}
                </p>
              )}
            </div>
          </div>

          {showCta && currentCtaText && (
            <button
              onClick={handleCtaClick}
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-gray-900 bg-white px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-xs transition-all flex-shrink-0 cursor-pointer"
            >
              <span>{currentCtaText}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#ff6452]" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Full-bleed Hero Visual Ad Banner Layout with Overlay Controls
  if (layout === 'hero') {
    const overlayPos = activeSlide?.overlayPosition || promoBanner.overlayPosition || 'left';
    const dimming = (typeof activeSlide?.overlayDimming === 'number' ? activeSlide.overlayDimming : promoBanner.overlayDimming) ?? 50;
    const bgStyle = promoBanner.overlayBackgroundStyle || 'gradient';
    const customHeight = promoBanner.bannerHeight || 320;
    const isLightText = promoBanner.textColor !== 'dark';

    const getPositionClasses = () => {
      switch (overlayPos) {
        case 'center':
          return 'items-center justify-center text-center';
        case 'right':
          return 'items-center justify-end text-right';
        case 'bottom-left':
          return 'items-end justify-start text-left pb-8';
        case 'top-left':
          return 'items-start justify-start text-left pt-8';
        case 'left':
        default:
          return 'items-center justify-start text-left';
      }
    };

    return (
      <div className="w-full my-4 px-4 sm:px-6 lg:px-8">
        <div
          style={{ minHeight: `${customHeight}px` }}
          className={`max-w-7xl mx-auto relative rounded-3xl overflow-hidden shadow-md flex ${getPositionClasses()}`}
        >
          {/* Background Media (Video or Image) */}
          {currentMediaType === 'video' && currentMediaUrl ? (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
              <video
                src={currentMediaUrl}
                poster={mediaPosterUrl}
                autoPlay={videoAutoplay}
                muted={videoMuted}
                loop={videoLoop}
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : currentMediaUrl ? (
            <div className="absolute inset-0 w-full h-full">
              <img
                src={currentMediaUrl}
                alt={mediaAltText || currentHeadline}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              style={{ backgroundColor: currentBgColor }}
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900"
            />
          )}

          {/* Dynamic Backdrop Scrim & Dimming Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${dimming / 100})`,
              background:
                bgStyle === 'gradient'
                  ? overlayPos === 'right'
                    ? `linear-gradient(to left, rgba(0,0,0,${Math.min(1, dimming / 80)}) 0%, rgba(0,0,0,${dimming / 150}) 60%, transparent 100%)`
                    : overlayPos === 'center'
                    ? `radial-gradient(circle, rgba(0,0,0,${Math.min(1, dimming / 90)}) 0%, rgba(0,0,0,${dimming / 120}) 70%, rgba(0,0,0,${dimming / 100}) 100%)`
                    : `linear-gradient(to right, rgba(0,0,0,${Math.min(1, dimming / 80)}) 0%, rgba(0,0,0,${dimming / 150}) 60%, transparent 100%)`
                  : `rgba(0, 0, 0, ${dimming / 100})`,
            }}
          />

          {/* Foreground Text Overlay Content */}
          <div
            className={`relative z-10 p-6 sm:p-10 max-w-2xl ${
              isLightText ? 'text-white' : 'text-gray-900'
            } ${
              bgStyle === 'glass'
                ? 'm-4 sm:m-8 bg-black/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20 shadow-xl'
                : ''
            }`}
          >
            {showBadge && currentBadge && (
              <div
                style={{ backgroundColor: accentBadgeColor || '#ff6452' }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white shadow-sm mb-3 ${
                  overlayPos === 'center' ? 'mx-auto' : ''
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{currentBadge}</span>
              </div>
            )}

            <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight drop-shadow-md">
              {currentHeadline}
            </h2>

            {currentSubtext && (
              <p
                className={`text-sm sm:text-base mt-2 line-clamp-2 max-w-xl font-medium drop-shadow-sm ${
                  isLightText ? 'text-gray-200' : 'text-gray-700'
                } ${overlayPos === 'center' ? 'mx-auto' : ''}`}
              >
                {currentSubtext}
              </p>
            )}

            {showCta && currentCtaText && (
              <div className={`mt-5 ${overlayPos === 'center' ? 'flex justify-center' : ''}`}>
                <button
                  onClick={handleCtaClick}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ff6452] hover:bg-[#e05342] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all hover:scale-102 cursor-pointer"
                >
                  <span>{currentCtaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Video-Focus Showcase Banner
  if (layout === 'video-focus') {
    return (
      <div className="w-full my-4 px-4 sm:px-6 lg:px-8">
        <div
          style={{ backgroundColor: currentBgColor }}
          className="max-w-7xl mx-auto rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        >
          <div className="lg:col-span-7 overflow-hidden rounded-2xl shadow-md">
            {currentMediaUrl ? (
              renderVideo(currentMediaUrl)
            ) : (
              <div className="bg-gray-900 text-gray-400 h-56 rounded-2xl flex items-center justify-center">
                <span>No video source provided</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center">
            {showBadge && currentBadge && (
              <div className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white mb-3" style={{ backgroundColor: accentBadgeColor }}>
                <Tag className="w-3.5 h-3.5" />
                <span>{currentBadge}</span>
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
              {currentHeadline}
            </h2>
            {currentSubtext && (
              <p className="text-sm text-gray-600 mt-2 font-normal leading-relaxed">
                {currentSubtext}
              </p>
            )}
            {showCta && currentCtaText && (
              <div className="mt-5">
                <button
                  onClick={handleCtaClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-sm transition-all hover:scale-102 cursor-pointer"
                >
                  <span>{currentCtaText}</span>
                  <ChevronRight className="w-4 h-4 text-[#ff6452]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Default / Split Card or Slides Layout (Visual media on one side, text + CTA on other)
  return (
    <div className="w-full my-4 px-4 sm:px-6 lg:px-8">
      <div
        style={{ backgroundColor: currentBgColor }}
        className="max-w-7xl mx-auto rounded-3xl p-5 sm:p-7 border border-blue-100/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Text Column */}
          <div className={`${currentMediaUrl && currentMediaType !== 'none' ? 'md:col-span-7 lg:col-span-8' : 'md:col-span-12'} flex flex-col justify-center`}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {showBadge && currentBadge && (
                <span
                  style={{ backgroundColor: accentBadgeColor }}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-white px-2.5 py-0.5 rounded-full shadow-2xs"
                >
                  <Sparkles className="w-3 h-3" />
                  {currentBadge}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-snug">
              {currentHeadline}
            </h2>

            {currentSubtext && (
              <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed max-w-xl">
                {currentSubtext}
              </p>
            )}

            {showCta && currentCtaText && (
              <div className="mt-4 sm:mt-5 flex items-center gap-3">
                <button
                  onClick={handleCtaClick}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#ff6452] hover:bg-[#e05342] px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all hover:scale-102 cursor-pointer flex-shrink-0"
                >
                  <span>{currentCtaText}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Advertising Media Column (Photo or Video) */}
          {currentMediaUrl && currentMediaType !== 'none' && (
            <div className="md:col-span-5 lg:col-span-4 flex items-center justify-center">
              {currentMediaType === 'video' ? (
                <div className="w-full max-h-[240px] rounded-2xl overflow-hidden shadow-sm">
                  {renderVideo(currentMediaUrl)}
                </div>
              ) : (
                <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden shadow-sm relative group">
                  <img
                    src={currentMediaUrl}
                    alt={mediaAltText || currentHeadline}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slide Carousel Controls if multi-slide */}
        {isMultiSlide && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200/50">
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlideIndex
                      ? 'w-6 bg-[#ff6452]'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
                }
                className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) => (prev + 1) % slides.length)
                }
                className="p-1 rounded-full text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
