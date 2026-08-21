import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  ThumbsUp,
  Quote,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { CustomerReview, TOP_RATED_TESTIMONIALS } from '../data/testimonialsData';
import { Product } from '../types';
import { STORE_CONFIG } from '../constants/config';

interface CustomerReviewCarouselProps {
  products?: Product[];
}

export const CustomerReviewCarousel: React.FC<CustomerReviewCarouselProps> = ({ products = [] }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [helpfulLikes, setHelpfulLikes] = useState<Record<string, boolean>>({});
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    TOP_RATED_TESTIMONIALS.forEach((t) => {
      initial[t.id] = t.helpfulCount;
    });
    return initial;
  });

  const carouselRef = useRef<HTMLDivElement>(null);

  // Map dynamic products if available to connect with testimonials
  const enrichedReviews = useMemo(() => {
    return TOP_RATED_TESTIMONIALS.map((review) => {
      // Find matching product by name/category if exists
      const match = products.find(
        (p) =>
          p.category.toLowerCase() === review.productCategory.toLowerCase() ||
          p.name.toLowerCase().includes(review.productBrand.toLowerCase()) ||
          p.brand.toLowerCase().includes(review.productBrand.toLowerCase())
      );

      if (match) {
        return {
          ...review,
          productId: match.id,
          productName: review.productName || match.name,
          productPrice: match.price || review.productPrice,
          productImage: (match.images && match.images[0]) || review.productImage,
        };
      }
      return review;
    });
  }, [products]);

  // Filter reviews by category
  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'All') return enrichedReviews;
    return enrichedReviews.filter(
      (r) => r.productCategory.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [enrichedReviews, selectedCategory]);

  const totalReviews = filteredReviews.length;

  // Ensure currentIndex stays within range when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (totalReviews <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? totalReviews - 1 : prev - 1));
  }, [totalReviews]);

  const handleNext = useCallback(() => {
    if (totalReviews <= 1) return;
    setCurrentIndex((prev) => (prev === totalReviews - 1 ? 0 : prev + 1));
  }, [totalReviews]);

  // Auto-play interval (every 6 seconds unless paused)
  useEffect(() => {
    if (isPaused || totalReviews <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused, totalReviews, handleNext]);

  // Handle helpful toggle
  const handleToggleHelpful = (reviewId: string) => {
    const isLiked = !helpfulLikes[reviewId];
    setHelpfulLikes((prev) => ({ ...prev, [reviewId]: isLiked }));
    setHelpfulCounts((counts) => ({
      ...counts,
      [reviewId]: Math.max(0, (counts[reviewId] || 0) + (isLiked ? 1 : -1)),
    }));
  };

  const categories = ['All', 'Technology', 'Beauty', 'Home', 'Sports & Leisure'];

  if (totalReviews === 0) return null;

  const currentReview = filteredReviews[currentIndex] || filteredReviews[0];

  return (
    <section
      id="customer-reviews-carousel"
      className="mt-14 pt-10 border-t border-gray-100 dark:border-slate-800"
      aria-label="Customer Reviews and Testimonials"
    >
      {/* Header Section: Title, Trust Badge & Categories */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Top-Rated Product Testimonials</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Loved by Shoppers Across South Africa
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-xl">
            Real feedback from verified buyers across Gauteng, Western Cape, KwaZulu-Natal, and beyond.
          </p>
        </div>

        {/* Aggregate Star-Rating Card */}
        <div className="flex items-center gap-3.5 bg-gray-50 dark:bg-slate-850 p-3 px-4 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-2xs self-start md:self-auto">
          <div className="flex flex-col items-center justify-center bg-[#ff6452] text-white px-2.5 py-1.5 rounded-xl font-black text-lg leading-tight shadow-xs">
            <span>4.9</span>
            <div className="flex items-center text-[10px] text-white">
              <span>★</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-xs"
                />
              ))}
            </div>
            <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
              1,420+ Verified Reviews
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>99.2% Customer Satisfaction</span>
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 mr-1 pl-0.5">
          <Filter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filter:</span>
        </div>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#ff6452] text-white shadow-xs'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Carousel Card Showcase */}
      <div
        ref={carouselRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative bg-gradient-to-br from-white via-rose-50/20 to-amber-50/20 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-slate-800 shadow-sm transition-all"
      >
        {/* Background Quote Watermark */}
        <Quote className="absolute right-6 top-6 w-24 h-24 text-gray-100 dark:text-slate-800/60 pointer-events-none -z-0" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Testimonial & Reviewer Profile (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            {/* Top Star-Rating & Verified Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl border border-amber-200/80 dark:border-amber-900/60">
                  <div className="flex items-center gap-0.5">
                    {[...Array(currentReview.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400 ml-1">
                    {currentReview.rating}.0 / 5.0
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Purchase</span>
                </span>
              </div>

              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">
                {currentReview.date}
              </span>
            </div>

            {/* Testimonial Quote & Comment */}
            <div className="space-y-3">
              <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white leading-snug tracking-tight">
                "{currentReview.title}"
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
                {currentReview.comment}
              </p>
            </div>

            {/* Tags */}
            {currentReview.tags && currentReview.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentReview.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-bold text-[#ff6452] bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-lg border border-rose-100 dark:border-rose-900/40"
                  >
                    ✓ {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Reviewer Profile & Helpful Action */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${
                    currentReview.avatarBgColor || 'bg-[#ff6452]'
                  } text-white flex items-center justify-center font-black text-sm uppercase shadow-xs shrink-0`}
                >
                  {currentReview.customerName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                    {currentReview.customerName}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#ff6452] shrink-0" />
                    <span className="truncate">{currentReview.location}</span>
                  </div>
                </div>
              </div>

              {/* Helpful vote button */}
              <button
                type="button"
                onClick={() => handleToggleHelpful(currentReview.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  helpfulLikes[currentReview.id]
                    ? 'bg-rose-100 text-[#ff6452] dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
                title="Mark this review as helpful"
              >
                <ThumbsUp
                  className={`w-3.5 h-3.5 ${
                    helpfulLikes[currentReview.id] ? 'fill-current' : ''
                  }`}
                />
                <span>Helpful ({helpfulCounts[currentReview.id] || currentReview.helpfulCount})</span>
              </button>
            </div>
          </div>

          {/* Right Column: Featured Product Card Highlight (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-400">
                Purchased Item
              </span>
              <span className="text-xs font-bold text-[#ff6452] bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                {currentReview.productCategory}
              </span>
            </div>

            <div className="flex gap-4 items-center">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0 border border-gray-100 dark:border-slate-700">
                <img
                  src={currentReview.productImage}
                  alt={currentReview.productName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide">
                  {currentReview.productBrand}
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white leading-tight mt-0.5 line-clamp-2">
                  {currentReview.productName}
                </h4>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-base font-black text-[#ff6452]">
                    {STORE_CONFIG.STORE_CURRENCY}
                    {currentReview.productPrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    VAT & SA Courier Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Link to product details */}
            <Link
              to={
                currentReview.productId
                  ? `/product/${currentReview.productId}`
                  : `/?category=${encodeURIComponent(currentReview.productCategory)}`
              }
              className="w-full mt-1 py-2.5 px-4 bg-gray-900 hover:bg-[#ff6452] text-white dark:bg-slate-800 dark:hover:bg-[#ff6452] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors group cursor-pointer shadow-xs"
            >
              <span>View Product Details</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Carousel Bottom Controls: Prev / Next Buttons & Indicators */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Indicator Dots & Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {filteredReviews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to testimonial ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentIndex === idx
                      ? 'w-7 bg-[#ff6452]'
                      : 'w-2 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400 dark:hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
              {currentIndex + 1} of {totalReviews}
            </span>
          </div>

          {/* Prev / Next Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous testimonial"
              className="p-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-2xs hover:border-[#ff6452] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next testimonial"
              className="p-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-2xs hover:border-[#ff6452] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
