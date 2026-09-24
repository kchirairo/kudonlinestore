import React from 'react';
import { MainTabs } from '../components/MainTabs';
import { Wishlist } from '../components/Wishlist';
import { SEOHead } from '../components/SEOHead';
import { STORE_CONFIG } from '../constants/config';
import { useShop } from '../context/ShopContext';

export const WishlistPage: React.FC = () => {
  const { wishlist } = useShop();

  return (
    <>
      <SEOHead
        title={`My Saved Wishlist (${wishlist.length}) | ${STORE_CONFIG.STORE_NAME}`}
        description="View your saved wishlist items on KUD Store South Africa, securely synced with your Supabase account."
        canonicalPath="/wishlist"
        noindex={true}
      />
      <div className="pb-24">
        {/* Navigation Tabs */}
        <MainTabs />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Wishlist />
        </main>
      </div>
    </>
  );
};
