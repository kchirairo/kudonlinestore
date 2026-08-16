import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  CartItem,
  ProductCategory,
  FilterOptions,
  UserProfile,
  StoreBrandingConfig,
  PromoBannerConfig,
} from '../types';
import { STORE_CONFIG, DEFAULT_STORE_BRANDING, DEFAULT_PROMO_BANNER } from '../constants/config';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { adminService } from '../services/adminService';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ShopContextType {
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSizeOrVariant?: string) => void;
  removeFromCart: (productId: string, variant?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;

  // Favourites
  favourites: string[]; // product IDs
  toggleFavourite: (productId: string) => void;
  isFavourite: (productId: string) => boolean;

  // Navigation & Category Filters
  selectedCategory: ProductCategory | 'All';
  setSelectedCategory: (category: ProductCategory | 'All') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;

  // Store Branding & Customization
  storeBranding: StoreBrandingConfig;
  updateStoreBranding: (config: StoreBrandingConfig) => Promise<{ success: boolean; error?: string }>;
  promoBanner: PromoBannerConfig;
  updatePromoBanner: (config: PromoBannerConfig) => Promise<{ success: boolean; error?: string }>;
  reloadStoreCustomization: () => Promise<void>;

  // Auth & User
  user: UserProfile | null;
  profile: any | null;
  role: 'customer' | 'admin' | null;
  isAuthLoading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;

  // Toast notifications
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'kud_store_cart_items';
const FAVOURITES_STORAGE_KEY = 'kud_store_favourite_items';
const BRANDING_STORAGE_KEY = 'kud_store_branding_config';
const PROMO_BANNER_STORAGE_KEY = 'kud_store_promo_banner_config';

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store Branding & Customization State
  const [storeBranding, setStoreBranding] = useState<StoreBrandingConfig>(() => {
    return safeGetItem<StoreBrandingConfig>(BRANDING_STORAGE_KEY, DEFAULT_STORE_BRANDING);
  });

  // Promo Banner State
  const [promoBanner, setPromoBanner] = useState<PromoBannerConfig>(() => {
    return safeGetItem<PromoBannerConfig>(PROMO_BANNER_STORAGE_KEY, DEFAULT_PROMO_BANNER);
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    return safeGetItem<CartItem[]>(CART_STORAGE_KEY, []);
  });

  // Favourites State
  const [favourites, setFavourites] = useState<string[]>(() => {
    return safeGetItem<string[]>(FAVOURITES_STORAGE_KEY, []);
  });

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'All',
    sortBy: 'newest',
  });

  // User Auth State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<'customer' | 'admin' | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync Cart to LocalStorage
  useEffect(() => {
    safeSetItem(CART_STORAGE_KEY, cart);
  }, [cart]);

  // Sync Favourites to LocalStorage
  useEffect(() => {
    safeSetItem(FAVOURITES_STORAGE_KEY, favourites);
  }, [favourites]);

  // Sync Profile and Favourites from Supabase
  const syncUserProfileAndFavourites = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    try {
      setIsAuthLoading(true);
      setAuthError(null);

      // 1. Get authenticated user from supabase.auth.getUser()
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        setUser(null);
        setProfile(null);
        setRole(null);
        setIsAuthLoading(false);
        return;
      }

      console.log('Authenticated user ID:', authUser.id);

      // 2. Query the user's profile: public.profiles where id = authenticatedUser.id select role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile from public.profiles:', profileError);
        setAuthError(`Profile error: ${profileError.message}`);
      }

      let fetchedRole: 'customer' | 'admin' = profileData?.role;

      // Fallback check via is_admin RPC if profile role is not present
      if (!fetchedRole && !profileError) {
        const { data: rpcIsAdmin } = await supabase.rpc('is_admin');
        if (rpcIsAdmin === true) {
          fetchedRole = 'admin';
        } else {
          fetchedRole = 'customer';
        }
      }

      if (!fetchedRole) {
        fetchedRole = 'customer';
      }

      console.log('Profile role:', fetchedRole);

      let fullName =
        profileData?.full_name ||
        profileData?.fullName ||
        authUser.user_metadata?.full_name ||
        authUser.email?.split('@')[0];
      let phone = profileData?.phone || authUser.phone || '';

      const fullProfile = profileData || {
        id: authUser.id,
        email: authUser.email || '',
        full_name: fullName,
        role: fetchedRole,
        phone,
      };

      setProfile(fullProfile);
      setRole(fetchedRole);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        fullName,
        phone,
        role: fetchedRole,
      });

      // 3. Fetch user's saved favourites
      const { data: favs, error: favError } = await supabase
        .from('favourites')
        .select('product_id')
        .eq('user_id', authUser.id);

      if (!favError && favs) {
        const remoteFavIds = favs.map((f: any) => f.product_id);
        setFavourites(remoteFavIds);
      }
    } catch (err: any) {
      console.warn('Error syncing profile and favourites with Supabase:', err);
      setAuthError(err.message || 'Profile sync error');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Check Supabase Auth Session and subscribe to state changes
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      syncUserProfileAndFavourites();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION' ||
          event === 'PASSWORD_RECOVERY'
        ) {
          syncUserProfileAndFavourites();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setRole(null);
          setIsAuthLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Cart Functions
  const addToCart = (product: Product, quantity = 1, selectedSizeOrVariant?: string) => {
    if (!user) {
      showToast('Please sign in to add products to your cart', 'info');
      const returnPath = window.location.pathname + window.location.search;
      window.location.href = `/account?returnUrl=${encodeURIComponent(returnPath || '/')}`;
      return;
    }

    const variant = selectedSizeOrVariant || product.sizeOrVariant || '';
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSizeOrVariant === variant
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [...prev, { product, quantity, selectedSizeOrVariant: variant }];
      }
    });
    showToast(`Added "${product.name}" to cart`);
  };

  const removeFromCart = (productId: string, variant?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedSizeOrVariant === (variant || item.product.sizeOrVariant || ''))
      )
    );
    showToast('Item removed from cart', 'info');
  };

  const updateQuantity = (productId: string, quantity: number, variant?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (
          item.product.id === productId &&
          item.selectedSizeOrVariant === (variant || item.product.sizeOrVariant || '')
        ) {
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartSubtotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  const deliveryFee =
    cartSubtotal >= STORE_CONFIG.FREE_DELIVERY_THRESHOLD || cartSubtotal === 0
      ? 0
      : STORE_CONFIG.DELIVERY_FEE;

  // Favourites Functions
  const toggleFavourite = async (productId: string) => {
    const isCurrentlyFav = favourites.includes(productId);

    setFavourites((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from favourites', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to favourites', 'success');
        return [...prev, productId];
      }
    });

    // If authenticated in Supabase, sync with the `favourites` table
    if (isSupabaseConfigured() && supabase && user?.id) {
      try {
        if (isCurrentlyFav) {
          // Remove from Supabase favourites
          await supabase
            .from('favourites')
            .delete()
            .match({ user_id: user.id, product_id: productId });
        } else {
          // Insert into Supabase favourites
          await supabase
            .from('favourites')
            .upsert(
              { user_id: user.id, product_id: productId, created_at: new Date().toISOString() },
              { onConflict: 'user_id,product_id' }
            );
        }
      } catch (err) {
        console.warn('Failed to sync favourite with Supabase:', err);
      }
    }
  };

  const isFavourite = (productId: string) => favourites.includes(productId);

  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setFilters({
      category: 'All',
      sortBy: 'newest',
    });
  };

  // Load Store Branding & Promo Banner on mount
  const loadStoreCustomization = async () => {
    try {
      const [branding, banner] = await Promise.all([
        adminService.getStoreBranding(),
        adminService.getPromoBanner(),
      ]);
      if (branding) setStoreBranding(branding);
      if (banner) setPromoBanner(banner);
    } catch (err) {
      console.warn('Failed to load store branding / promo banner customization:', err);
    }
  };

  useEffect(() => {
    loadStoreCustomization();
  }, []);

  const updateStoreBranding = async (config: StoreBrandingConfig) => {
    setStoreBranding(config);
    safeSetItem(BRANDING_STORAGE_KEY, config);
    const res = await adminService.saveStoreBranding(config);
    return res;
  };

  const updatePromoBanner = async (config: PromoBannerConfig) => {
    setPromoBanner(config);
    safeSetItem(PROMO_BANNER_STORAGE_KEY, config);
    const res = await adminService.savePromoBanner(config);
    return res;
  };

  const signOut = async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    showToast('Signed out successfully', 'info');
  };

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        deliveryFee,
        freeDeliveryThreshold: STORE_CONFIG.FREE_DELIVERY_THRESHOLD,

        favourites,
        toggleFavourite,
        isFavourite,

        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        resetFilters,

        storeBranding,
        updateStoreBranding,
        promoBanner,
        updatePromoBanner,
        reloadStoreCustomization: loadStoreCustomization,

        user,
        profile,
        role,
        isAuthLoading,
        authError,
        signOut,
        refetchProfile: syncUserProfileAndFavourites,

        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
