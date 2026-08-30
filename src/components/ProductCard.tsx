import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isFavourite, toggleFavourite } = useShop();

  const isFav = isFavourite(product.id);

  const isOutOfStock = !product.inStock || (product.stock !== undefined && product.stock <= 0);
  const isLowStock = !isOutOfStock && product.stock !== undefined && product.stock > 0 && product.stock < 5;

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavourite(product.id);
  };

  const imageAltText = `${product.name} - ${product.brand || 'KUD'} ${product.category} South Africa`;

  // Normalize image list into valid image URLs, unpacking any JSON or comma-separated lists
  const validImages = React.useMemo(() => {
    let list: string[] = [];
    const rawImages = Array.isArray(product.images)
      ? product.images
      : typeof (product as any).images === 'string'
      ? [(product as any).images]
      : [];

    for (const item of rawImages) {
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

    if (list.length === 0) {
      const fallback =
        (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
        (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
        '';
      if (fallback) {
        if (fallback.startsWith('[') && fallback.endsWith(']')) {
          try {
            const parsed = JSON.parse(fallback);
            if (Array.isArray(parsed)) {
              for (const p of parsed) {
                const u = typeof p === 'string' ? p.trim() : (p?.image_url || p?.url || '');
                if (u && typeof u === 'string') list.push(u);
              }
            }
          } catch {}
        } else if (fallback.includes(',') && !fallback.startsWith('data:')) {
          const parts = fallback.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (parts.length > 1) list.push(...parts);
        }
        if (list.length === 0) list = [fallback];
      }
    }

    return list.length > 0
      ? list
      : ['https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80'];
  }, [product.images, (product as any).image_url, (product as any).image]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const safeIndex = validImages.length > 0
    ? Math.max(0, Math.min(validImages.length - 1, currentImageIndex))
    : 0;

  const safeIndexRef = useRef(safeIndex);
  safeIndexRef.current = safeIndex;

  const validImagesLengthRef = useRef(validImages.length);
  validImagesLengthRef.current = validImages.length;

  const setIndex = useCallback(
    (idx: number) => {
      if (validImages.length <= 1) return;
      // Strictly bounded between 0 and validImages.length - 1
      const clamped = Math.max(0, Math.min(validImages.length - 1, idx));
      setCurrentImageIndex(clamped);
    },
    [validImages.length]
  );

  // Sync index if validImages length changes
  useEffect(() => {
    if (currentImageIndex >= validImages.length && validImages.length > 0) {
      setCurrentImageIndex(validImages.length - 1);
    }
  }, [validImages.length, currentImageIndex]);

  // Touch and drag gesture state
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingMouseRef = useRef<boolean>(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const directionLockRef = useRef<'horizontal' | 'vertical' | null>(null);
  const didDragRef = useRef<boolean>(false);
  const wheelAccumulatorRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  const handlePrev = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (safeIndexRef.current > 0) {
        setIndex(safeIndexRef.current - 1);
      }
    },
    [setIndex]
  );

  const handleNext = useCallback(
    (e?: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (safeIndexRef.current < validImagesLengthRef.current - 1) {
        setIndex(safeIndexRef.current + 1);
      }
    },
    [setIndex]
  );

  const handleDotClick = useCallback(
    (idx: number, e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex(idx);
    },
    [setIndex]
  );

  // Mobile Touch Gestures with non-passive listener to prevent scroll locking
  useEffect(() => {
    const el = imageContainerRef.current;
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
        // Prevent page scroll from interfering with horizontal swipe gesture
        if (e.cancelable) {
          e.preventDefault();
        }
        if (Math.abs(diffX) > 10) {
          didDragRef.current = true;
        }

        // Apply resistance if trying to swipe past edge indices
        const activeIdx = safeIndexRef.current;
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
      const minSwipe = 35;

      if (wasHorizontal) {
        if (diffX < -minSwipe) {
          handleNext();
        } else if (diffX > minSwipe) {
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

  // Desktop Mouse Drag Gestures
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
      const activeIdx = safeIndexRef.current;
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
      const minSwipe = 35;

      if (diffX < -minSwipe) {
        handleNext();
      } else if (diffX > minSwipe) {
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

  // Trackpad / Horizontal Wheel Gestures on Desktop
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

  // Intercept click on the link if a drag or swipe occurred
  const handleCardClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Allow normal clicks on the image area to bubble to the parent <Link>
  // Only prevent navigation when an actual drag or swipe gesture occurred
  const handleImageAreaClick = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      onClick={handleCardClick}
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-200 hover:shadow-md text-inherit no-underline"
      aria-label={`View details for ${product.name}, price ${STORE_CONFIG.STORE_CURRENCY}${product.price}`}
    >
      {/* Product Image Container (4:3 Aspect Ratio) with Swipeable Navigation */}
      <div
        ref={imageContainerRef}
        className={`relative w-full aspect-[4/3] bg-gray-50 dark:bg-slate-800/60 overflow-hidden rounded-2xl select-none ${
          validImages.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onClick={handleImageAreaClick}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{ touchAction: 'pan-y' }}
      >
        {validImages.length > 1 ? (
          /* Multi-Image Sliding Track */
          <div
            className="flex h-full w-full select-none"
            style={{
              transform: `translateX(calc(-${safeIndex * 100}% + ${dragOffset}px))`,
              transition: isSwiping ? 'none' : 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'transform',
            }}
          >
            {validImages.map((img, idx) => (
              <div
                key={`card-slide-${product.id}-${idx}`}
                className="relative w-full h-full shrink-0 aspect-[4/3] overflow-hidden"
                aria-hidden={idx !== safeIndex}
              >
                <img
                  src={img}
                  alt={`${imageAltText} (Photo ${idx + 1} of ${validImages.length})`}
                  className="w-full h-full object-cover pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
                  draggable={false}
                  loading={idx === 0 ? 'lazy' : 'lazy'}
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Single Image (no swipe/carousel track needed) */
          <div className="w-full h-full">
            <img
              src={validImages[0]}
              alt={imageAltText}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </div>
        )}

        {/* Condition / Discount / Low Stock Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start pointer-events-none z-10">
          {isLowStock && (
            <span
              id={`low-stock-badge-${product.id}`}
              className="bg-amber-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 animate-pulse"
            >
              <Flame className="w-3 h-3 fill-current" />
              <span>Low stock ({product.stock} left)</span>
            </span>
          )}
          {isOutOfStock && (
            <span
              id={`out-of-stock-badge-${product.id}`}
              className="bg-gray-800/90 dark:bg-slate-800/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs"
            >
              Out of stock
            </span>
          )}
          {product.discountPercentage && !isOutOfStock && (
            <span className="bg-[#ff6452] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              -{product.discountPercentage}%
            </span>
          )}
          {product.condition && (
            <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-gray-800 dark:text-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200/50 dark:border-slate-700 shadow-xs">
              {product.condition}
            </span>
          )}
        </div>

        {/* Coral Star/Heart Favourite Button (Top-Right) */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={handleFavouriteClick}
          className="absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-[#ff6452] hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs active:scale-90 cursor-pointer"
          aria-label={isFav ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              isFav ? 'fill-[#ff6452] text-[#ff6452]' : 'text-gray-400 dark:text-slate-400 hover:text-[#ff6452]'
            }`}
          />
        </button>

        {/* Navigation Arrows (Desktop hover / accessible buttons) */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              disabled={safeIndex === 0}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handlePrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all ${
                safeIndex === 0
                  ? 'opacity-30 cursor-not-allowed pointer-events-none'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 active:scale-90 cursor-pointer'
              }`}
              aria-label="Previous product image"
              title="Previous image"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              disabled={safeIndex === validImages.length - 1}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={handleNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 text-gray-800 dark:text-white flex items-center justify-center shadow-md backdrop-blur-xs transition-all ${
                safeIndex === validImages.length - 1
                  ? 'opacity-30 cursor-not-allowed pointer-events-none'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 active:scale-90 cursor-pointer'
              }`}
              aria-label="Next product image"
              title="Next image"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </>
        )}

        {/* Small Image Indicators / Dots below image */}
        {validImages.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none z-10">
            <div className="flex items-center gap-1 bg-black/45 dark:bg-black/65 backdrop-blur-xs px-2 py-1 rounded-full shadow-xs pointer-events-auto">
              {validImages.map((_, idx) => (
                <button
                  key={`dot-${product.id}-${idx}`}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => handleDotClick(idx, e)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === safeIndex
                      ? 'w-3.5 bg-[#ff6452]'
                      : 'w-1.5 bg-white/70 hover:bg-white dark:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Information Body */}
      <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-between">
        {/* Row 1: Price and Size/Variant Aligned Right */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-gray-900 dark:text-white">
              {STORE_CONFIG.STORE_CURRENCY}{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-400 dark:text-slate-500 line-through">
                {STORE_CONFIG.STORE_CURRENCY}{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {product.sizeOrVariant && (
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {product.sizeOrVariant}
            </span>
          )}
        </div>

        {/* Row 2: Brand Name */}
        <span className="text-xs font-medium text-gray-400 dark:text-slate-400 uppercase tracking-wider">
          {product.brand}
        </span>

        {/* Row 3: Product Name */}
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 line-clamp-1 group-hover:text-[#ff6452] transition-colors">
          {product.name}
        </h3>
      </div>
    </Link>
  );
};

