import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Product,
  CartItem,
  ProductCategory,
  FilterOptions,
  UserProfile,
  StoreBrandingConfig,
  PromoBannerConfig,
  GeneralStoreSettings,
} from '../types';
import { STORE_CONFIG, DEFAULT_STORE_BRANDING, DEFAULT_PROMO_BANNER, DEFAULT_GENERAL_SETTINGS } from '../constants/config';
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

  // General Store Settings
  generalSettings: GeneralStoreSettings;
  updateGeneralSettings: (settings: GeneralStoreSettings) => Promise<{ success: boolean; error?: string; data?: GeneralStoreSettings }>;
  reloadGeneralSettings: () => Promise<void>;

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
  updateAdminAvatar: (file: File) => Promise<{ success: boolean; url?: string; error?: string }>;
  removeAdminAvatar: () => Promise<{ success: boolean; error?: string }>;

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
  // General Store Settings (Delivery Fee, Threshold, Contact Details, Store Info from Supabase)
  const [generalSettings, setGeneralSettings] = useState<GeneralStoreSettings>(DEFAULT_GENERAL_SETTINGS);

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
  const isSyncingRef = useRef<boolean>(false);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  // Sync Cart to LocalStorage
  useEffect(() => {
    safeSetItem(CART_STORAGE_KEY, cart);
  }, [cart]);

  // Sync Favourites to LocalStorage
  useEffect(() => {
    safeSetItem(FAVOURITES_STORAGE_KEY, favourites);
  }, [favourites]);

  // Sync Profile and Favourites from Supabase
  const syncUserProfileAndFavourites = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      setAuthError(null);

      // 1. Get authenticated user from supabase.auth.getUser()
      const {
        data: { user: authUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authUser) {
        const isDemoAdmin = localStorage.getItem('kud_store_demo_admin') === 'true';
        const isDemoUser = localStorage.getItem('kud_store_demo_user') === 'true';
        if (isDemoAdmin) {
          const storedAvatar = localStorage.getItem('kud_store_admin_avatar') || undefined;
          const demoAdminUser = {
            id: 'demo-admin-id',
            email: 'admin@kudstore.com',
            fullName: 'Demo Administrator',
            phone: '+27 82 123 4567',
            avatarUrl: storedAvatar,
            role: 'admin' as const,
          };
          setUser(demoAdminUser);
          setProfile({
            id: 'demo-admin-id',
            role: 'admin',
            full_name: 'Demo Administrator',
            avatar_url: storedAvatar,
            avatarUrl: storedAvatar,
          });
          setRole('admin');
        } else if (isDemoUser) {
          const demoCustomerUser = {
            id: 'demo-customer-id',
            email: 'customer@kudstore.co.za',
            fullName: 'Sipho Dlamini (Demo)',
            phone: '+27 83 987 6543',
            role: 'customer' as const,
          };
          setUser(demoCustomerUser);
          setProfile({ id: 'demo-customer-id', role: 'customer', full_name: 'Sipho Dlamini (Demo)' });
          setRole('customer');
        } else {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
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

      const avatarUrl =
        profileData?.avatar_url ||
        profileData?.avatarUrl ||
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.avatarUrl ||
        localStorage.getItem('kud_store_admin_avatar') ||
        undefined;

      const fullProfile = profileData
        ? { ...profileData, avatar_url: avatarUrl, avatarUrl }
        : {
            id: authUser.id,
            email: authUser.email || '',
            full_name: fullName,
            role: fetchedRole,
            phone,
            avatar_url: avatarUrl,
            avatarUrl,
          };

      setProfile(fullProfile);
      setRole(fetchedRole);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        fullName,
        phone,
        avatarUrl,
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
      isSyncingRef.current = false;
    }
  }, []);

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
  }, [syncUserProfileAndFavourites]);

  // Cart Functions
  const addToCart = useCallback((product: Product, quantity = 1, selectedSizeOrVariant?: string) => {
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
  }, [user, showToast]);

  const removeFromCart = useCallback((productId: string, variant?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.product.id === productId && item.selectedSizeOrVariant === (variant || item.product.sizeOrVariant || ''))
      )
    );
    showToast('Item removed from cart', 'info');
  }, [showToast]);

  const updateQuantity = useCallback((productId: string, quantity: number, variant?: string) => {
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
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart((prev) => {
      if (prev.length === 0) return prev;
      return [];
    });
  }, []);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [cart]
  );

  const freeDeliveryThreshold = useMemo(
    () => Number(generalSettings.freeDeliveryThreshold) || STORE_CONFIG.FREE_DELIVERY_THRESHOLD,
    [generalSettings.freeDeliveryThreshold]
  );

  const deliveryFee = useMemo(() => {
    const fee = Number(generalSettings.deliveryFee) >= 0 ? Number(generalSettings.deliveryFee) : STORE_CONFIG.DELIVERY_FEE;
    return cartSubtotal >= freeDeliveryThreshold || cartSubtotal === 0 ? 0 : fee;
  }, [cartSubtotal, freeDeliveryThreshold, generalSettings.deliveryFee]);

  // Favourites Functions
  const toggleFavourite = useCallback(async (productId: string) => {
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
  }, [favourites, showToast, user]);

  const isFavourite = useCallback((productId: string) => favourites.includes(productId), [favourites]);

  const resetFilters = useCallback(() => {
    setSelectedCategory('All');
    setSearchQuery('');
    setFilters({
      category: 'All',
      sortBy: 'newest',
    });
  }, []);

  // Load General Settings, Store Branding & Promo Banner from Supabase on mount
  const loadStoreCustomization = useCallback(async () => {
    try {
      const [general, branding, banner] = await Promise.all([
        adminService.getGeneralSettings(),
        adminService.getStoreBranding(),
        adminService.getPromoBanner(),
      ]);
      if (general) setGeneralSettings(general);
      if (branding) setStoreBranding(branding);
      if (banner) setPromoBanner(banner);
    } catch (err) {
      console.warn('Failed to load store settings / branding / promo banner from Supabase:', err);
    }
  }, []);

  useEffect(() => {
    loadStoreCustomization();
  }, [loadStoreCustomization]);

  const reloadGeneralSettings = useCallback(async () => {
    try {
      const general = await adminService.getGeneralSettings();
      if (general) setGeneralSettings(general);
    } catch (err) {
      console.warn('Failed to reload general settings from Supabase:', err);
    }
  }, []);

  const updateGeneralSettings = useCallback(async (settings: GeneralStoreSettings) => {
    const res = await adminService.saveGeneralSettings(settings);
    if (res.success && res.data) {
      setGeneralSettings(res.data);
    }
    return res;
  }, []);

  const updateStoreBranding = useCallback(async (config: StoreBrandingConfig) => {
    setStoreBranding(config);
    safeSetItem(BRANDING_STORAGE_KEY, config);
    const res = await adminService.saveStoreBranding(config);
    return res;
  }, []);

  const updatePromoBanner = useCallback(async (config: PromoBannerConfig) => {
    setPromoBanner(config);
    safeSetItem(PROMO_BANNER_STORAGE_KEY, config);
    const res = await adminService.savePromoBanner(config);
    return res;
  }, []);

  const updateAdminAvatar = useCallback(
    async (file: File) => {
      try {
        const res = await adminService.uploadAdminAvatar(file, user?.id);
        if (res.success && res.url) {
          setUser((prev) => (prev ? { ...prev, avatarUrl: res.url } : null));
          setProfile((prev: any) =>
            prev ? { ...prev, avatar_url: res.url, avatarUrl: res.url } : null
          );
          showToast('Admin avatar updated successfully!', 'success');
          return res;
        } else {
          showToast(res.error || 'Failed to upload avatar', 'error');
          return res;
        }
      } catch (err: any) {
        showToast(err.message || 'Error updating avatar', 'error');
        return { success: false, error: err.message };
      }
    },
    [user?.id, showToast]
  );

  const removeAdminAvatar = useCallback(async () => {
    try {
      const currentUrl = user?.avatarUrl || profile?.avatar_url || localStorage.getItem('kud_store_admin_avatar') || undefined;
      const res = await adminService.removeAdminAvatar(currentUrl, user?.id);
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: undefined } : null));
        setProfile((prev: any) =>
          prev ? { ...prev, avatar_url: null, avatarUrl: undefined } : null
        );
        showToast('Avatar removed. Restored default "K" avatar.', 'info');
        return res;
      } else {
        showToast(res.error || 'Failed to remove avatar', 'error');
        return res;
      }
    } catch (err: any) {
      showToast(err.message || 'Error removing avatar', 'error');
      return { success: false, error: err.message };
    }
  }, [user?.avatarUrl, user?.id, profile?.avatar_url, showToast]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('kud_store_demo_admin');
    localStorage.removeItem('kud_store_demo_user');
    setUser(null);
    setProfile(null);
    setRole(null);
    showToast('Signed out successfully', 'info');
  }, [showToast]);

  const contextValue = useMemo<ShopContextType>(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartSubtotal,
      deliveryFee,
      freeDeliveryThreshold,

      generalSettings,
      updateGeneralSettings,
      reloadGeneralSettings,

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
      updateAdminAvatar,
      removeAdminAvatar,

      toasts,
      showToast,
      removeToast,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartSubtotal,
      deliveryFee,
      freeDeliveryThreshold,
      generalSettings,
      updateGeneralSettings,
      reloadGeneralSettings,
      favourites,
      toggleFavourite,
      isFavourite,
      selectedCategory,
      searchQuery,
      filters,
      resetFilters,
      storeBranding,
      updateStoreBranding,
      promoBanner,
      updatePromoBanner,
      loadStoreCustomization,
      user,
      profile,
      role,
      isAuthLoading,
      authError,
      signOut,
      syncUserProfileAndFavourites,
      updateAdminAvatar,
      removeAdminAvatar,
      toasts,
      showToast,
      removeToast,
    ]
  );

  return (
    <ShopContext.Provider value={contextValue}>
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
