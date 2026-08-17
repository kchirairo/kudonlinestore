import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Product } from '../types';
import { useShop } from '../context/ShopContext';
import { STORE_CONFIG } from '../constants/config';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isFavourite, toggleFavourite } = useShop();

  const isFav = isFavourite(product.id);

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavourite(product.id);
  };

  const imageAltText = `${product.name} - ${product.brand || 'KUD'} ${product.category} South Africa`;
  const primaryImage =
    (Array.isArray(product.images) && product.images.find((img) => typeof img === 'string' && img.trim().length > 0)) ||
    (typeof (product as any).image_url === 'string' && (product as any).image_url.trim()) ||
    (typeof (product as any).image === 'string' && (product as any).image.trim()) ||
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80';

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-200 hover:shadow-md text-inherit no-underline"
      aria-label={`View details for ${product.name}, price ${STORE_CONFIG.STORE_CURRENCY}${product.price}`}
    >
      {/* Product Image Container (4:3 Aspect Ratio) */}
      <div className="relative w-full aspect-[4/3] bg-gray-50 dark:bg-slate-800/60 overflow-hidden rounded-2xl">
        <img
          src={primaryImage}
          alt={imageAltText}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // Fallback image if network fails
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Condition / Discount Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start pointer-events-none">
          {product.discountPercentage && (
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
          onClick={handleFavouriteClick}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center text-[#ff6452] hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs active:scale-90 cursor-pointer"
          aria-label={isFav ? `Remove ${product.name} from favourites` : `Add ${product.name} to favourites`}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              isFav ? 'fill-[#ff6452] text-[#ff6452]' : 'text-gray-400 dark:text-slate-400 hover:text-[#ff6452]'
            }`}
          />
        </button>
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

