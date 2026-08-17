import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  Sparkles,
} from 'lucide-react';
import { productService } from '../services/productService';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import { STORE_CONFIG } from '../constants/config';
import { DetailSkeleton } from '../components/LoadingSkeleton';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { SEOHead } from '../components/SEOHead';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductCard } from '../components/ProductCard';
import { generateProductJsonLd, categoryToSlug, getSiteUrl } from '../utils/seo';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, isFavourite, toggleFavourite, showToast, user } = useShop();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const fetchProduct = () => {
    if (!id) return;
    setIsLoading(true);
    setDbError(null);
    setSelectedImageIndex(0);
    productService
      .getProductById(id)
      .then((res) => {
        setProduct(res);
        if (res?.sizeOrVariant) {
          setSelectedVariant(res.sizeOrVariant);
        }
        setIsLoading(false);

        if (res?.category) {
          productService
            .getProducts({ category: res.category })
            .then((related) => {
              setRelatedProducts(related.filter((p) => p.id !== res.id).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        console.error('[ProductDetailsPage] Error loading product:', err);
        setDbError(err?.message || 'Failed to fetch product from Supabase.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (isLoading) return <DetailSkeleton />;

  if (dbError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <SEOHead
          title="Database Error | KUD Store"
          description="Could not load product details due to database connection issue."
          noindex={true}
        />
        <DatabaseErrorBanner error={dbError} onRetry={fetchProduct} isRetrying={isLoading} />
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-gray-900 dark:bg-slate-800 text-white font-bold rounded-full text-sm hover:bg-gray-800 dark:hover:bg-slate-700 transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <SEOHead
          title="Product Not Found | KUD Store"
          description="The requested product does not exist or may have been removed."
          noindex={true}
        />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product not found</h2>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
          The requested product does not exist or may have been removed.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-2.5 bg-[#ff6452] text-white font-bold rounded-full text-sm hover:bg-[#e05342] transition-colors"
        >
          Back to Store
        </Link>
      </div>
    );
  }

  const isFav = isFavourite(product.id);
  const canonicalUrl = `${getSiteUrl()}/product/${product.id}`;
  const productJsonLd = generateProductJsonLd(product, canonicalUrl);
  const categorySlug = categoryToSlug(product.category);

  // Accurate SEO title and meta description using real product attributes
  const seoTitle = `${product.name} | ${product.brand ? product.brand + ' - ' : ''}Buy Online at ${STORE_CONFIG.STORE_NAME} South Africa`;
  const cleanDescription =
    product.description && product.description.trim()
      ? `${product.description.slice(0, 140)}... Buy ${product.name} for R${product.price} at ${STORE_CONFIG.STORE_NAME}. Fast courier delivery across South Africa.`
      : `Buy ${product.name} (${product.brand || 'KUD'}) online at ${STORE_CONFIG.STORE_NAME} South Africa for R${product.price}. Nationwide fast courier delivery & secure Yoco checkout.`;

  const handleAddToCart = () => {
    if (!user) {
      showToast('Please sign in to add items to your cart', 'info');
      navigate('/account', { state: { returnUrl: `/product/${product.id}` } });
      return;
    }
    addToCart(product, quantity, selectedVariant || product.sizeOrVariant);
  };

  const handleBuyNow = () => {
    if (!user) {
      showToast('Please sign in to purchase items', 'info');
      navigate('/account', { state: { returnUrl: `/product/${product.id}` } });
      return;
    }
    addToCart(product, quantity, selectedVariant || product.sizeOrVariant);
    navigate('/cart');
  };

  const handleShare = async () => {
    if (!product) return;

    const shareData = {
      title: `${product.name} | ${STORE_CONFIG.STORE_NAME}`,
      text: `Check out ${product.name} (${STORE_CONFIG.STORE_CURRENCY}${product.price.toLocaleString()}) on ${STORE_CONFIG.STORE_NAME}!`,
      url: window.location.href,
    };

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))
    ) {
      try {
        await navigator.share(shareData);
        showToast('Product shared successfully!', 'success');
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Product link copied to clipboard!', 'success');
          } catch {
            showToast('Unable to share product', 'error');
          }
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Product link copied to clipboard!', 'success');
      } catch {
        showToast('Unable to copy product link', 'error');
      }
    } else {
      showToast('Sharing is not supported on this browser', 'info');
    }
  };

  return (
    <>
      {/* Dynamic SEO Meta & Schema.org Product JSON-LD */}
      <SEOHead
        title={seoTitle}
        description={cleanDescription}
        canonicalPath={`/product/${product.id}`}
        ogType="product"
        ogImage={product.images[0]}
        ogImageAlt={`${product.name} - ${product.brand} South Africa`}
        productPrice={product.price}
        productCurrency="ZAR"
        productAvailability={product.inStock}
        jsonLd={productJsonLd}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28">
        {/* SEO Breadcrumbs Navigation */}
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Categories', to: '/categories' },
              { label: product.category, to: `/category/${categorySlug}` },
              { label: product.name },
            ]}
          />
        </div>

        {/* Top Navigation & Share Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            id="product-back-btn"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            id="product-top-share-btn"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300 hover:text-[#ff6452] dark:hover:text-[#ff6452] bg-gray-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-2xs border border-gray-200/50 dark:border-slate-700"
            title="Share this product"
            aria-label="Share this product with contacts"
          >
            <Share2 className="w-3.5 h-3.5 text-[#ff6452]" />
            <span>Share</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Image Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative w-full aspect-square bg-gray-50 dark:bg-slate-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-xs">
              <img
                src={product.images[selectedImageIndex] || product.images[0]}
                alt={`${product.name} - ${product.brand || 'KUD'} ${product.category} South Africa (Image ${selectedImageIndex + 1})`}
                className="w-full h-full object-cover"
                decoding="async"
                fetchPriority="high"
              />

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                {product.discountPercentage && (
                  <span className="bg-[#ff6452] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    -{product.discountPercentage}% OFF
                  </span>
                )}
                {product.condition && (
                  <span className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-gray-900 dark:text-white text-xs font-semibold px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
                    {product.condition}
                  </span>
                )}
              </div>

              {/* Favourite Button */}
              <button
                onClick={() => toggleFavourite(product.id)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-center text-[#ff6452] hover:bg-white dark:hover:bg-slate-800 shadow-md active:scale-95 transition-all cursor-pointer border border-transparent dark:border-slate-700"
                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
              >
                <Star
                  className={`w-5 h-5 ${
                    isFav ? 'fill-[#ff6452] text-[#ff6452]' : 'text-gray-400 dark:text-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Gallery Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={`${product.id}-img-${idx}`}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-[#ff6452] scale-105 shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    aria-label={`View image ${idx + 1} of ${product.name}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Brand & Category Links (Crawlable) */}
              <div className="flex items-center justify-between text-xs font-bold tracking-wider text-gray-400 dark:text-slate-400 uppercase">
                <span>{product.brand}</span>
                <Link
                  to={`/category/${categorySlug}`}
                  className="bg-gray-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-[#ff6452] dark:hover:text-[#ff6452] text-gray-600 dark:text-slate-300 px-3 py-1 rounded-full font-medium transition-colors"
                >
                  {product.category}
                </Link>
              </div>

              {/* Product Name as Main H1 */}
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                {product.name}
              </h1>

              {/* Price Area */}
              <div className="flex items-baseline gap-3 py-1">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  {STORE_CONFIG.STORE_CURRENCY}{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 dark:text-slate-500 line-through font-semibold">
                    {STORE_CONFIG.STORE_CURRENCY}{product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              {/* In Stock & Genuine Ratings */}
              <div className="flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-slate-300 border-y border-gray-100 dark:border-slate-800 py-3">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{product.inStock ? 'In Stock & Ready to Dispatch' : 'Out of Stock'}</span>
                </div>
                {product.rating && (
                  <div className="flex items-center gap-1 text-gray-700 dark:text-slate-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{product.rating}</span>
                    {product.reviewCount && (
                      <span className="text-gray-400 dark:text-slate-500">({product.reviewCount} customer reviews)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Size/Variant Selector */}
              {product.sizeOrVariant && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Size / Option
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[product.sizeOrVariant, 'Standard', 'Default'].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedVariant === v
                            ? 'border-[#ff6452] bg-rose-50 dark:bg-rose-950/50 text-[#ff6452]'
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 pt-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Product Description
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Value Props & SA Courier Info */}
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100/80 dark:border-slate-700 text-xs">
                  <Truck className="w-4 h-4 text-[#ff6452] shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Fast SA Delivery</p>
                    <p className="text-gray-500 dark:text-slate-400">2-4 business days</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100/80 dark:border-slate-700 text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#ff6452] shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Buyer Protection</p>
                    <p className="text-gray-500 dark:text-slate-400">Secure Yoco checkout</p>
                  </div>
                </div>
              </div>

              {/* Native Mobile Share Callout Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/50 dark:bg-slate-800/60 border border-rose-100/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#ff6452]/10 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Share this Product</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">Send directly to your contacts via WhatsApp, SMS or apps</p>
                  </div>
                </div>
                <button
                  id="product-inline-share-btn"
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-[#ff6452] hover:text-white dark:hover:bg-[#ff6452] text-gray-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:border-transparent transition-all shadow-2xs cursor-pointer shrink-0 active:scale-95"
                  aria-label="Share product with contacts"
                >
                  <Share2 className="w-3.5 h-3.5 text-[#ff6452]" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              {/* Quantity Controls */}
              <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center font-bold text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center font-bold text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3.5 px-4 bg-gray-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer border border-transparent dark:border-slate-700"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                className="flex-1 py-3.5 px-4 bg-[#ff6452] hover:bg-[#ff523d] text-white font-bold rounded-2xl text-sm shadow-md shadow-[#ff6452]/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* SEO Internal Linking: Related Products in this Category */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Related in {product.category}
                </h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  More products you may like from the {product.category} collection
                </p>
              </div>
              <Link
                to={`/category/${categorySlug}`}
                className="text-xs font-bold text-[#ff6452] hover:underline"
              >
                View all {product.category} →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
};

