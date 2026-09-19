import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Maximize2, X, ZoomIn, ImageOff } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
  brand?: string;
  category?: string;
  discountPercentage?: number;
  condition?: string;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  productName,
  brand = 'KUD',
  category = 'Store',
  discountPercentage,
  condition,
  isFavourite = false,
  onToggleFavourite,
  selectedIndex,
  onSelectIndex,
}) => {
  // Normalize images array to ensure valid strings exist, unpacking any JSON or comma-separated lists
  const validImages = React.useMemo(() => {
    const list: string[] = [];
    const raw = Array.isArray(images) ? images : typeof images === 'string' ? [images] : [];
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              for (const p of parsed) {
                const u = typeof p === 'string' ? p.trim() : (p?.image_url || p?.url || '');
                if (u && typeof u === 'string') list.push(u);
              }
              continue;
            }
          } catch {}
        } else if (trimmed.includes(',') && !trimmed.startsWith('data:')) {
          const parts = trimmed.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
          if (parts.length > 1) {
            list.push(...parts);
            continue;
          }
        }
        list.push(trimmed);
      } else if (typeof item === 'object' && item !== null) {
        const u = (item as any).image_url || (item as any).url || (item as any).imageUrl;
        if (u && typeof u === 'string' && u.trim().length > 0) {
          list.push(u.trim());
        }
      }
    }
    // Filter out empty strings and embedded data:image base64 URLs
    return list.filter(
      (img) => typeof img === 'string' && img.trim().length > 0 && !img.trim().startsWith('data:image')
    );
  }, [images]);

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

  // Ensure index is always safe and strictly bounded between 0 and validImages.length - 1
  const safeActiveIndex = validImages.length > 0
    ? Math.max(0, Math.min(validImages.length - 1, activeIndex))
    : 0;

  const safeActiveIndexRef = useRef(safeActiveIndex);
  safeActiveIndexRef.current = safeActiveIndex;

  const validImagesLengthRef = useRef(validImages.length);
  validImagesLengthRef.current = validImages.length;

  const setActiveIndex = useCallback(
    (index: number) => {
      if (validImages.length <= 1) return;
      const clamped = Math.max(0, Math.min(validImages.length - 1, index));
      if (onSelectIndex) {
        onSelectIndex(clamped);
      } else {
        setInternalIndex(clamped);
      }
    },
    [validImages.length, onSelectIndex]
  );

  // Reset index when images list changes
  useEffect(() => {
    if (selectedIndex === undefined) {
      setInternalIndex(0);
    }
  }, [images, selectedIndex]);

  // Sync index if images array length shrinks
  useEffect(() => {
    if (activeIndex >= validImages.length && validImages.length > 0) {
      setActiveIndex(validImages.length - 1);
    }
  }, [validImages.length, activeIndex, setActiveIndex]);

  // Lightbox Modal State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxDragOffset, setLightboxDragOffset] = useState<number>(0);
  const [isLightboxSwiping, setIsLightboxSwiping] = useState<boolean>(false);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [lightboxOpen]);

  // Gesture tracking state for Main Carousel
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const sliderViewportRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const isDraggingMouseRef = useRef<boolean>(false);
  const directionLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const didDragRef = useRef<boolean>(false);
  const wheelAccumulatorRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  const handlePrev = useCallback(() => {
    if (safeActiveIndexRef.current > 0) {
      setActiveIndex(safeActiveIndexRef.current - 1);
    }
  }, [setActiveIndex]);

  const handleNext = useCallback(() => {
    if (safeActiveIndexRef.current < validImagesLengthRef.current - 1) {
      setActiveIndex(safeActiveIndexRef.current + 1);
    }
  }, [setActiveIndex]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailsRef.current) return;
    const thumbButton = thumbnailsRef.current.children[safeActiveIndex] as HTMLElement | undefined;
    if (thumbButton) {
      thumbButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [safeActiveIndex]);

  // Mobile Touch Gestures for Main Carousel
  useEffect(() => {
    const el = sliderViewportRef.current;
    if (!el || validImages.length <= 1) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchDeltaXRef.current = 0;
      directionLockRef.current = null;
      didDragRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const diffX = touch.clientX - touchStartXRef.current;
      const diffY = touch.clientY - touchStartYRef.current;

      // Lock direction on initial motion to avoid fighting vertical page scroll
      if (directionLockRef.current === null) {
        if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
          if (Math.abs(diffX) >= Math.abs(diffY)) {
            directionLockRef.current = 'horizontal';
          } else {
            directionLockRef.current = 'vertical';
          }
        }
      }

      if (directionLockRef.current === 'horizontal') {
        if (e.cancelable) {
          e.preventDefault();
        }
        if (Math.abs(diffX) > 10) {
          didDragRef.current = true;
        }

        // Apply resistance if dragging past ends
        const activeIdx = safeActiveIndexRef.current;
        const totalImages = validImagesLengthRef.current;
        let visualOffset = diffX;
        if (
          (activeIdx === 0 && diffX > 0) ||
          (activeIdx === totalImages - 1 && diffX < 0)
        ) {
          visualOffset = diffX * 0.25;
        }

        touchDeltaXRef.current = diffX;
        setDragOffset(visualOffset);
        setIsSwiping(true);
      }
    };

    const onTouchEnd = () => {
      const diffX = touchDeltaXRef.current;
      const wasHorizontal = directionLockRef.current === 'horizontal';
      const minSwipeDistance = 35;

      if (wasHorizontal) {
        if (diffX < -minSwipeDistance) {
          handleNext();
        } else if (diffX > minSwipeDistance) {
          handlePrev();
        }
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchDeltaXRef.current = 0;
      directionLockRef.current = null;
      setDragOffset(0);
      setIsSwiping(false);
      setTimeout(() => {
        didDragRef.current = false;
      }, 200);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [validImages.length, handleNext, handlePrev]);

  // Desktop Mouse Drag Gesture handling
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (validImages.length <= 1 || e.button !== 0) return;
    isDraggingMouseRef.current = true;
    touchStartXRef.current = e.clientX;
    touchStartYRef.current = e.clientY;
    touchDeltaXRef.current = 0;
    didDragRef.current = false;
    setIsSwiping(true);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || touchStartXRef.current === null) return;
      const diffX = e.clientX - touchStartXRef.current;
      if (Math.abs(diffX) > 8) {
        didDragRef.current = true;
      }
      const activeIdx = safeActiveIndexRef.current;
      const totalImages = validImagesLengthRef.current;
      let visualOffset = diffX;
      if (
        (activeIdx === 0 && diffX > 0) ||
        (activeIdx === totalImages - 1 && diffX < 0)
      ) {
        visualOffset = diffX * 0.25;
      }
      touchDeltaXRef.current = diffX;
      setDragOffset(visualOffset);
      e.preventDefault();
    };

    const onMouseUp = () => {
      if (!isDraggingMouseRef.current) return;
      isDraggingMouseRef.current = false;
      const diffX = touchDeltaXRef.current;
      const minSwipeDistance = 35;

      if (diffX < -minSwipeDistance) {
        handleNext();
      } else if (diffX > minSwipeDistance) {
        handlePrev();
      }

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      touchDeltaXRef.current = 0;
      setDragOffset(0);
      setIsSwiping(false);
      setTimeout(() => {
        didDragRef.current = false;
      }, 200);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleNext, handlePrev]);

  // Trackpad / Horizontal Wheel gesture support on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (validImages.length <= 1) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
      const now = Date.now();
      if (now - lastWheelTimeRef.current < 320) {
        return;
      }
      wheelAccumulatorRef.current += e.deltaX;
      if (wheelAccumulatorRef.current > 35) {
        handleNext();
        wheelAccumulatorRef.current = 0;
        lastWheelTimeRef.current = now;
      } else if (wheelAccumulatorRef.current < -35) {
        handlePrev();
        wheelAccumulatorRef.current = 0;
        lastWheelTimeRef.current = now;
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') {
          setLightboxOpen(false);
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        }
      } else {
        if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, handlePrev, handleNext]);

  // Open Lightbox upon clicking main image (if not dragged)
  const handleViewportClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setLightboxOpen(true);
  };

  // Lightbox touch handlers
  const lbTouchStartXRef = useRef<number | null>(null);
  const lbTouchDeltaXRef = useRef<number>(0);

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || validImages.length <= 1) return;
    lbTouchStartXRef.current = e.touches[0].clientX;
    lbTouchDeltaXRef.current = 0;
    setIsLightboxSwiping(true);
  };

  const handleLightboxTouchMove = (e: React.TouchEvent) => {
    if (lbTouchStartXRef.current === null || e.touches.length !== 1) return;
    const diffX = e.touches[0].clientX - lbTouchStartXRef.current;
    lbTouchDeltaXRef.current = diffX;

    const activeIdx = safeActiveIndexRef.current;
    const totalImages = validImagesLengthRef.current;
    let visualOffset = diffX;
    if (
      (activeIdx === 0 && diffX > 0) ||
      (activeIdx === totalImages - 1 && diffX < 0)
    ) {
      visualOffset = diffX * 0.25;
    }
    setLightboxDragOffset(visualOffset);
  };

  const handleLightboxTouchEnd = () => {
    const diffX = lbTouchDeltaXRef.current;
    const minSwipeDistance = 40;

    if (diffX < -minSwipeDistance) {
      handleNext();
    } else if (diffX > minSwipeDistance) {
      handlePrev();
    }

    lbTouchStartXRef.current = null;
    lbTouchDeltaXRef.current = 0;
    setLightboxDragOffset(0);
    setIsLightboxSwiping(false);
  };

  return (
    <div className="product-gallery w-full flex flex-col gap-4 select-none relative" ref={containerRef} tabIndex={0}>
      {/* Main Image Slider Viewport */}
      <div
        ref={sliderViewportRef}
        className={`product-carousel relative w-full aspect-square bg-[#f7f7f7] dark:bg-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xs group focus:outline-none focus:ring-2 focus:ring-[#ff6452] ${
          validImages.length > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
        } ${isSwiping ? 'is-dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onClick={handleViewportClick}
        onWheel={handleWheel}
        role="region"
        aria-label={`Image gallery for ${productName}`}
        aria-roledescription="carousel"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Sliding Track for all Images, or Neutral Display Placeholder if no images */}
        {validImages.length > 0 ? (
          <div
            className="flex h-full w-full select-none"
            style={{
              transform: `translateX(calc(-${safeActiveIndex * 100}% + ${dragOffset}px))`,
              transition: isSwiping ? 'none' : 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'transform',
            }}
          >
            {validImages.map((img, idx) => (
              <div
                key={`gallery-slide-${idx}`}
                className="relative w-full h-full shrink-0 aspect-square overflow-hidden flex items-center justify-center bg-[#f7f7f7] dark:bg-slate-800"
                aria-hidden={idx !== safeActiveIndex}
              >
                <img
                  src={img}
                  alt={`${productName} - ${brand} ${category} (Photo ${idx + 1} of ${validImages.length})`}
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                  decoding="async"
                  fetchPriority={idx === 0 ? 'high' : 'auto'}
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    if (el.parentElement) {
                      el.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8 select-none"><svg class="w-12 h-12 stroke-[1.5] mb-2 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M10.41 10.41a2 2 0 1 0-2.83-2.83"></path><line x1="13.5" y1="13.5" x2="6" y2="21"></line><line x1="18" y1="12" x2="21" y2="15"></line><path d="m3.59 3.59 16.82 16.82"></path><rect width="18" height="18" x="3" y="3" rx="2"></rect></svg><span class="text-sm font-medium">Image unavailable</span></div>';
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#f7f7f7] dark:bg-slate-800 text-gray-400 dark:text-slate-500 p-8 select-none">
            <ImageOff className="w-16 h-16 stroke-[1.5] mb-3 text-gray-300 dark:text-slate-600" />
            <span className="text-sm font-medium tracking-tight">Image unavailable</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
          {discountPercentage && discountPercentage > 0 ? (
            <span className="bg-[#ff6452] text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
              -{discountPercentage}% OFF
            </span>
          ) : null}
          {condition && (
            <span className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-white text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700 shadow-xs">
              {condition}
            </span>
          )}
        </div>

        {/* Top-Right Favorite / Wishlist Button */}
        {onToggleFavourite && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center text-[#ff6452] hover:bg-white dark:hover:bg-slate-800 shadow-md active:scale-95 transition-all cursor-pointer border border-transparent dark:border-slate-700"
            aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Star
              className={`w-5 h-5 ${
                isFavourite ? 'fill-[#ff6452] text-[#ff6452]' : 'text-gray-400 dark:text-slate-400'
              }`}
            />
          </button>
        )}

        {/* Zoom / Lightbox Trigger Button (Bottom Right) */}
        {validImages.length > 0 && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="zoom-button absolute right-3.5 bottom-3.5 z-20 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-white flex items-center justify-center shadow-lg backdrop-blur-md hover:bg-white dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer border border-gray-100 dark:border-slate-700 opacity-90 hover:opacity-100"
            aria-label="View full size image"
            title="Zoom image / Fullscreen view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Navigation Arrows (Shown when more than 1 image) */}
        {validImages.length > 1 && (
          <>
            {/* Previous Image Control */}
            <button
              type="button"
              disabled={safeActiveIndex === 0}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePrev();
              }}
              className={`carousel-button previous absolute left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${
                safeActiveIndex === 0
                  ? 'opacity-30 cursor-not-allowed pointer-events-none'
                  : 'opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 active:scale-90 cursor-pointer'
              }`}
              aria-label="Previous product image"
              title="Previous image"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Next Image Control */}
            <button
              type="button"
              disabled={safeActiveIndex === validImages.length - 1}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }}
              className={`carousel-button next absolute right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all ${
                safeActiveIndex === validImages.length - 1
                  ? 'opacity-30 cursor-not-allowed pointer-events-none'
                  : 'opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 active:scale-90 cursor-pointer'
              }`}
              aria-label="Next product image"
              title="Next image"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* Counter Pill on Main Carousel */}
        {validImages.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
            <span className="bg-black/40 dark:bg-black/60 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              {safeActiveIndex + 1} / {validImages.length}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Pagination Dots */}
      {validImages.length > 1 && (
        <div className="product-dots flex sm:hidden items-center justify-center gap-1.5 py-1">
          {validImages.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`product-dot h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === safeActiveIndex
                  ? 'w-5 bg-[#ff6452] active'
                  : 'w-1.5 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400 dark:hover:bg-slate-500'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              aria-selected={idx === safeActiveIndex}
            />
          ))}
        </div>
      )}

      {/* Gallery Thumbnails Strip (Desktop & Tablet) */}
      {validImages.length > 1 && (
        <div
          ref={thumbnailsRef}
          className="product-thumbnails hidden sm:flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scroll-smooth"
        >
          {validImages.map((img, idx) => (
            <button
              key={`thumb-${idx}`}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={() => setActiveIndex(idx)}
              className={`product-thumbnail w-18 h-18 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-[#f7f7f7] dark:bg-slate-800 ${
                safeActiveIndex === idx
                  ? 'border-[#ff6452] ring-2 ring-rose-200 dark:ring-rose-950 scale-102 shadow-xs active'
                  : 'border-gray-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
              aria-label={`Switch to image ${idx + 1}`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover select-none"
                draggable={false}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = 'none';
                  if (el.parentElement) {
                    el.parentElement.classList.add('flex', 'flex-col', 'items-center', 'justify-center');
                    el.parentElement.innerHTML = '<span class="text-[9px] font-medium text-center p-1 leading-tight text-gray-400 dark:text-slate-500 select-none">Image unavailable</span>';
                  }
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="product-lightbox fixed inset-0 z-[9999] bg-black/95 dark:bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 select-none animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Full view of ${productName}`}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="lightbox-close absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
            aria-label="Close fullscreen gallery"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Lightbox Main Image Area with Touch Swiping */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <div
              className="flex h-full w-full items-center justify-center select-none"
              style={{
                transform: `translateX(${lightboxDragOffset}px)`,
                transition: isLightboxSwiping ? 'none' : 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              <img
                src={validImages[safeActiveIndex]}
                alt={`${productName} - Zoomed View (${safeActiveIndex + 1} of ${validImages.length})`}
                className="lightbox-image max-w-[90vw] max-h-[85vh] object-contain select-none rounded-lg shadow-2xl pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Lightbox Previous Control */}
            {validImages.length > 1 && (
              <button
                type="button"
                disabled={safeActiveIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className={`lightbox-arrow left absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all shadow-lg active:scale-90 ${
                  safeActiveIndex === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            {/* Lightbox Next Control */}
            {validImages.length > 1 && (
              <button
                type="button"
                disabled={safeActiveIndex === validImages.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className={`lightbox-arrow right absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all shadow-lg active:scale-90 ${
                  safeActiveIndex === validImages.length - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                }`}
                aria-label="Next image"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>

          {/* Lightbox Counter */}
          <div className="lightbox-counter absolute bottom-6 left-1/2 -translate-x-1/2 text-white/90 font-mono text-sm font-semibold bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md pointer-events-none">
            {safeActiveIndex + 1} / {validImages.length}
          </div>
        </div>
      )}
    </div>
  );
};
