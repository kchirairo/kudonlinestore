import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { Product } from '../types';
import { CustomerReview } from '../data/testimonialsData';
import { reviewService } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';

interface ProductReviewsSectionProps {
  product: Product;
  onReviewAdded?: (newCount: number, newAverageRating: number) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  onReviewAdded,
}) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [helpfulLikes, setHelpfulLikes] = useState<Record<string, boolean>>({});
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  // Review Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name) {
        setCustomerName(user.user_metadata.full_name);
      }
      if (user.email) {
        setCustomerEmail(user.email);
      }
    }
  }, [user]);

  // Load reviews strictly for this product ID
  const loadProductReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      // Authoritative query: reviews where reviews.product_id = product.id
      const data = await reviewService.getReviewsByProductId(product.id, product);
      setReviews(data);

      const counts: Record<string, number> = {};
      data.forEach((r) => {
        counts[r.id] = r.helpfulCount;
      });
      setHelpfulCounts(counts);

      if (onReviewAdded && data.length > 0) {
        const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
        onReviewAdded(data.length, Number(avg.toFixed(1)));
      }
    } catch (err) {
      console.error('[ProductReviewsSection] Error loading reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }, [product, onReviewAdded]);

  useEffect(() => {
    loadProductReviews();
  }, [loadProductReviews]);

  // Calculate rating statistics
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return {
        average: product.rating || 5.0,
        total: reviews.length,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = sum / reviews.length;
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
    reviews.forEach((r) => {
      const rounded = Math.round(r.rating);
      if (dist[rounded] !== undefined) {
        dist[rounded] += 1;
      }
    });
    return {
      average: Number(avg.toFixed(1)),
      total: reviews.length,
      distribution: dist,
    };
  }, [reviews, product.rating]);

  // Handle helpful vote
  const handleToggleHelpful = async (reviewId: string) => {
    if (helpfulLikes[reviewId]) return;
    setHelpfulLikes((prev) => ({ ...prev, [reviewId]: true }));
    setHelpfulCounts((prev) => ({
      ...prev,
      [reviewId]: (prev[reviewId] || 0) + 1,
    }));
    await reviewService.voteHelpful(reviewId);
  };

  // Submit review for this exact product
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!title.trim()) {
      setFormError('Please provide a short headline for your review.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setFormError('Please write at least 10 characters describing your experience.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass the exact products.id to reviewService
      await reviewService.submitReview(
        {
          productId: product.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          rating,
          title: title.trim(),
          comment: comment.trim(),
          tags: ['Customer Verified'],
        },
        product
      );

      setFormSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(false);
        setTitle('');
        setComment('');
        loadProductReviews();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id={`reviews-section-${product.id}`}
      className="mt-16 pt-10 border-t border-gray-100 dark:border-slate-800"
      aria-label={`Customer reviews for ${product.name}`}
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Verified Customer Feedback</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Customer Reviews for {product.name}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Read verified experiences from South African shoppers who ordered this item.
          </p>
        </div>

        <button
          type="button"
          id="btn-write-customer-review"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#ff6452]/20 transition-all active:scale-[0.98] cursor-pointer shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Ratings Summary Card & Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-200/80 dark:border-slate-800 mb-10">
        {/* Left: Overall Score */}
        <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-800">
          <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            {stats.average}
          </div>
          <div className="flex items-center gap-1 mt-2 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(stats.average)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
            Based on {stats.total} verified {stats.total === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {/* Middle: Star Breakdown Bars */}
        <div className="md:col-span-2 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = stats.distribution[s] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-12 text-gray-600 dark:text-slate-400 font-bold">
                  <span>{s}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-gray-400 dark:text-slate-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12 text-gray-400 dark:text-slate-500 text-sm">
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-[#ff6452] flex items-center justify-center mx-auto mb-3">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            No reviews yet for {product.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Be the first customer to share your thoughts on this product with the KUD Store community.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gray-900 hover:bg-[#ff6452] dark:bg-slate-800 dark:hover:bg-[#ff6452] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Leave the First Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              id={`review-item-${review.id}`}
              className="p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xs hover:border-gray-200 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${
                      review.avatarBgColor || 'bg-[#ff6452]'
                    }`}
                  >
                    {review.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                        {review.customerName}
                      </h4>
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                      {review.location || 'South Africa'} • {review.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= review.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 dark:text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h5 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">
                {review.title}
              </h5>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                {review.comment}
              </p>

              {/* Tags & Helpful Vote */}
              <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {review.tags?.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 px-2 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleHelpful(review.id)}
                  disabled={helpfulLikes[review.id]}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    helpfulLikes[review.id]
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500 hover:text-[#ff6452] dark:text-slate-400 dark:hover:text-[#ff6452]'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>
                    Helpful ({helpfulCounts[review.id] ?? review.helpfulCount})
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                  Review {product.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Product ID: {product.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Thank you for your review!
                </h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Your feedback has been published to this product page.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 mt-4">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">
                    Your Overall Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-gray-600 dark:text-slate-300">
                      {hoverRating || rating} of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sipho Dlamini"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
                  />
                </div>

                {/* Customer Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                    Email Address (For Verified Purchase badge)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                    Review Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Fantastic battery life and crystal-clear display"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1">
                    Detailed Review
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you love about this product? How was the delivery and performance?"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#ff6452] hover:bg-[#ff523d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#ff6452]/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
