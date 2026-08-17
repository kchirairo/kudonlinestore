import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart } from 'lucide-react';
import { MainTabs } from '../components/MainTabs';
import { ProductGrid } from '../components/ProductGrid';
import { EmptyState } from '../components/EmptyState';
import { ProductGridSkeleton } from '../components/LoadingSkeleton';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { SEOHead } from '../components/SEOHead';
import { STORE_CONFIG } from '../constants/config';
import { useShop } from '../context/ShopContext';
import { productService } from '../services/productService';
import { Product } from '../types';

export const FavouritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favourites } = useShop();

  const [favouriteProducts, setFavouriteProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const fetchFavourites = useCallback(() => {
    setIsLoading(true);
    setDbError(null);

    productService
      .getProducts()
      .then((allProducts) => {
        const matched = allProducts.filter((p) => favourites.includes(p.id));
        setFavouriteProducts(matched);
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('[FavouritesPage] Error fetching favourite products:', err);
        setDbError(err?.message || 'Failed to fetch products from Supabase.');
        setFavouriteProducts([]);
        setIsLoading(false);
      });
  }, [favourites]);

  useEffect(() => {
    fetchFavourites();
  }, [fetchFavourites]);

  return (
    <>
      <SEOHead
        title={`My Saved Favourites | ${STORE_CONFIG.STORE_NAME}`}
        description="View your saved favourite items on KUD Store South Africa."
        canonicalPath="/favourites"
        noindex={true}
      />
      <div className="pb-24">
        {/* Main Tabs */}
        <MainTabs />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Your Saved Favourites ({favourites.length})
              </h1>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
                Items you star or bookmark will appear here
              </p>
            </div>
          </div>

          {/* Database Error State */}
          {dbError && (
            <DatabaseErrorBanner
              error={dbError}
              onRetry={fetchFavourites}
              isRetrying={isLoading}
            />
          )}

          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : dbError ? null : favouriteProducts.length > 0 ? (
            <ProductGrid products={favouriteProducts} />
          ) : (
            <EmptyState
              icon={Star}
              title="No favourites saved yet"
              description="Tap the star icon on any item card or product page to save it for later."
              actionText="Discover Products"
              onAction={() => navigate('/')}
            />
          )}
        </main>
      </div>
    </>
  );
};

