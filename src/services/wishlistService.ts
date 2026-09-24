import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Service to manage customer wishlist and saved items with Supabase persistence.
 * Uses the authoritative Supabase 'favourites' table, with transparent fallback
 * to 'wishlists' table if configured in schema.
 */
export const wishlistService = {
  /**
   * Fetches product IDs in user's wishlist from Supabase
   */
  async getWishlist(userId: string): Promise<string[]> {
    if (!userId || !isSupabaseConfigured() || !supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('favourites')
        .select('product_id')
        .eq('user_id', userId);

      if (!error && data) {
        return data.map((row: any) => row.product_id).filter(Boolean);
      }

      if (error) {
        // Fallback check on 'wishlists' table if 'favourites' had a table error
        const { data: wData, error: wError } = await supabase
          .from('wishlists')
          .select('product_id')
          .eq('user_id', userId);

        if (!wError && wData) {
          return wData.map((row: any) => row.product_id).filter(Boolean);
        }
        console.warn('[wishlistService] Error loading wishlist from Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[wishlistService] Exception querying wishlist:', err?.message);
    }

    return [];
  },

  /**
   * Adds a product to the user's wishlist in Supabase
   */
  async addToWishlist(userId: string, productId: string): Promise<boolean> {
    if (!userId || !productId || !isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase.from('favourites').upsert(
        {
          user_id: userId,
          product_id: productId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );

      if (!error) return true;

      // Fallback to wishlists
      const { error: wError } = await supabase.from('wishlists').upsert(
        {
          user_id: userId,
          product_id: productId,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id' }
      );

      if (!wError) return true;
      console.warn('[wishlistService] Error adding to wishlist:', error.message);
    } catch (err: any) {
      console.warn('[wishlistService] Exception adding to wishlist:', err?.message);
    }

    return false;
  },

  /**
   * Removes a product from the user's wishlist in Supabase
   */
  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    if (!userId || !productId || !isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('favourites')
        .delete()
        .match({ user_id: userId, product_id: productId });

      if (!error) return true;

      const { error: wError } = await supabase
        .from('wishlists')
        .delete()
        .match({ user_id: userId, product_id: productId });

      if (!wError) return true;
      console.warn('[wishlistService] Error removing from wishlist:', error.message);
    } catch (err: any) {
      console.warn('[wishlistService] Exception removing from wishlist:', err?.message);
    }

    return false;
  },

  /**
   * Clears all items in user's wishlist from Supabase
   */
  async clearWishlist(userId: string): Promise<boolean> {
    if (!userId || !isSupabaseConfigured() || !supabase) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('favourites')
        .delete()
        .eq('user_id', userId);

      try {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', userId);
      } catch {
        // Ignored if table wishlists doesn't exist
      }

      if (!error) return true;
      console.warn('[wishlistService] Error clearing wishlist:', error.message);
    } catch (err: any) {
      console.warn('[wishlistService] Exception clearing wishlist:', err?.message);
    }

    return false;
  },

  /**
   * Merges locally saved wishlist items into the user's Supabase account upon login
   */
  async syncLocalWishlistToSupabase(userId: string, localProductIds: string[]): Promise<string[]> {
    if (!userId || !isSupabaseConfigured() || !supabase) {
      return localProductIds;
    }

    try {
      // 1. Fetch remote items first
      const remote = await wishlistService.getWishlist(userId);
      const combined = Array.from(new Set([...remote, ...localProductIds]));

      // 2. Insert any items that were only local
      const itemsToInsert = localProductIds.filter((id) => !remote.includes(id));
      if (itemsToInsert.length > 0) {
        const rows = itemsToInsert.map((pId) => ({
          user_id: userId,
          product_id: pId,
          created_at: new Date().toISOString(),
        }));

        await supabase.from('favourites').upsert(rows, { onConflict: 'user_id,product_id' });
      }

      return combined;
    } catch (err: any) {
      console.warn('[wishlistService] Sync error:', err?.message);
      return localProductIds;
    }
  },
};
