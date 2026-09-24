import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Product,
  CartItem,
  ProductCategory,
  FilterOptions,
  UserProfile,
  CustomerAccountStatus,
  StoreBrandingConfig,
  PromoBannerConfig,
  GeneralStoreSettings,
  AuthAppearanceConfig,
  CustomerCustomizationData,
} from '../types';
import { STORE_CONFIG, DEFAULT_STORE_BRANDING, DEFAULT_PROMO_BANNER, DEFAULT_GENERAL_SETTINGS } from '../constants/config';
import { DEFAULT_AUTH_APPEARANCE, AUTH_APPEARANCE_STORAGE_KEY } from '../constants/authAppearance';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { adminService } from '../services/adminService';
import { wishlistService } from '../services/wishlistService';
import {
  calculateCustomizedUnitPrice,
  generateCartItemId,
  validateQuantityRules,
} from '../utils/customizationPricing';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ShopContextType {
  // Cart
  cart: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    selectedSizeOrVariant?: string,
    customization?: CustomerCustomizationData
  ) => void;
  removeFromCart: (productIdOrCartItemId: string, variant?: string) => void;
  updateQuantity: (productIdOrCartItemId: string, quantity: number, variant?: string) => void;
  updateCartItemCustomization: (
    cartItemId: string,
    customization: CustomerCustomizationData,
    quantity?: number
  ) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;

  // General Store Settings
  generalSettings: GeneralStoreSettings;
  updateGeneralSettings: (settings: GeneralStoreSettings) => Promise<{ success: boolean; error?: string; data?: GeneralStoreSettings }>;
  reloadGeneralSettings: () => Promise<void>;

  // Favourites & Wishlist
  favourites: string[]; // product IDs
  wishlist: string[]; // Aliased to favourites
  toggleFavourite: (productId: string) => void;
  isFavourite: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<void>;

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
  authAppearance: AuthAppearanceConfig;
  updateAuthAppearance: (config: AuthAppearanceConfig) => Promise<{ success: boolean; error?: string }>;
  reloadAuthAppearance: () => Promise<void>;
  reloadStoreCustomization: () => Promise<void>;

  // Auth & User
  user: UserProfile | null;
  profile: any | null;
  role: 'customer' | 'admin' | null;
  isAuthLoading: boolean;
  authError: string | null;
  isAccountDisabled: boolean;
  accountStatus: 'active' | 'on_hold' | 'disabled';
  disabledReason: string | null;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
  updateUserProfile: (details: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
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

  // Promo Banner State - fails closed (enabled: false) initially until Supabase confirms it is explicitly true
  const [promoBanner, setPromoBanner] = useState<PromoBannerConfig>(() => {
    const initial = safeGetItem<PromoBannerConfig>(PROMO_BANNER_STORAGE_KEY, DEFAULT_PROMO_BANNER);
    return {
      ...initial,
      enabled: false,
      promotional_banner_enabled: false,
    };
  });

  // Authentication Appearance State (Cinematic background images, animation effects, glassmorphism)
  const [authAppearance, setAuthAppearance] = useState<AuthAppearanceConfig>(() => {
    return safeGetItem<AuthAppearanceConfig>(AUTH_APPEARANCE_STORAGE_KEY, DEFAULT_AUTH_APPEARANCE);
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
  const lastProfileMutationTimeRef = useRef<number>(0);
  const isUpdatingProfileRef = useRef<boolean>(false);

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
    const fetchStartTime = Date.now();

    try {
      setAuthError(null);

      // 1. Get authenticated user authoritatively from Supabase Auth session
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

      // 2. Query the user's profile: public.profiles where id = authenticatedUser.id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile from public.profiles:', profileError);
        setAuthError(`Profile error: ${profileError.message}`);
      }

      // Race condition guard: If a newer profile mutation was committed while this fetch was in flight, discard stale fetch
      if (lastProfileMutationTimeRef.current > fetchStartTime) {
        console.log('[ShopContext] Discarding stale profile fetch because a newer profile mutation occurred.');
        return;
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

      const localCacheKey = `kud_store_user_profile_${authUser.id}`;
      const localCache = safeGetItem<any>(localCacheKey, null);

      // CRITICAL ARCHITECTURE RULE: public.profiles.full_name is the SINGLE SOURCE OF TRUTH.
      // Do NOT overwrite profiles.full_name from auth.user.user_metadata.full_name.
      // Do NOT synchronize an old Auth metadata name back into profiles.full_name.
      let fullName = '';
      if (profileData && profileData.full_name !== undefined && profileData.full_name !== null) {
        fullName = profileData.full_name;
      } else if (!profileData) {
        // Fallback ONLY if profile record does NOT exist in the database at all yet
        fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
      }

      let phone =
        profileData?.phone !== undefined && profileData?.phone !== null && profileData?.phone !== ''
          ? profileData.phone
          : (authUser.user_metadata?.phone || authUser.user_metadata?.phone_number || localCache?.phone || '');

      let age: number | null =
        profileData?.age !== undefined && profileData?.age !== null
          ? Number(profileData.age)
          : authUser.user_metadata?.age !== undefined && authUser.user_metadata?.age !== null
          ? Number(authUser.user_metadata.age)
          : (localCache?.age !== undefined && localCache?.age !== null ? Number(localCache.age) : null);

      let gender: 'Male' | 'Female' | string | null =
        profileData?.gender ||
        authUser.user_metadata?.gender ||
        localCache?.gender ||
        null;

      let addressLine =
        localCache?.addressLine ||
        localCache?.address ||
        '';
      let city = localCache?.city || '';
      let province = localCache?.province || 'Gauteng';
      let postalCode = localCache?.postalCode || '';

      const avatarUrl =
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.avatarUrl ||
        localStorage.getItem('kud_store_admin_avatar') ||
        undefined;

      const computedAccountStatus: CustomerAccountStatus =
        profileData?.account_status === 'on_hold'
          ? 'on_hold'
          : profileData?.account_status === 'disabled'
          ? 'disabled'
          : 'active';
      const disabledReasonVal = profileData?.disabled_reason || null;
      const disabledAtVal = profileData?.disabled_at || null;

      const fullProfile = profileData
        ? {
            ...profileData,
            full_name: fullName,
            fullName,
            phone,
            age,
            gender,
            address_line: addressLine,
            addressLine,
            address: addressLine,
            city,
            province,
            postal_code: postalCode,
            postalCode,
            avatar_url: avatarUrl,
            avatarUrl,
            account_status: computedAccountStatus,
            disabled_reason: disabledReasonVal,
            disabled_at: disabledAtVal,
          }
        : {
            id: authUser.id,
            email: authUser.email || '',
            full_name: fullName,
            role: fetchedRole,
            phone,
            age,
            gender,
            address_line: addressLine,
            addressLine,
            address: addressLine,
            city,
            province,
            postal_code: postalCode,
            postalCode,
            avatar_url: avatarUrl,
            avatarUrl,
            account_status: computedAccountStatus,
            disabled_reason: disabledReasonVal,
            disabled_at: disabledAtVal,
          };

      setProfile(fullProfile);
      setRole(fetchedRole);
      const userProfileObj: UserProfile = {
        id: authUser.id,
        email: authUser.email || '',
        fullName,
        full_name: fullName,
        phone,
        age,
        gender,
        avatarUrl,
        addressLine,
        address: addressLine,
        city,
        province,
        postalCode,
        role: fetchedRole,
        account_status: computedAccountStatus,
        disabled_reason: disabledReasonVal,
        disabled_at: disabledAtVal,
      };
      setUser(userProfileObj);

      // Keep local cache in sync with the database verified name
      safeSetItem(localCacheKey, userProfileObj);

      // 3. Fetch user's saved favourites
      const { data: favs, error: favError } = await supabase
        .from('favourites')
        .select('product_id')
        .eq('user_id', authUser.id);

      if (!favError && favs) {
        const remoteFavIds = favs.map((f: any) => f.product_id);
        setFavourites(remoteFavIds);
      } else {
        setFavourites([]);
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
          setCart([]);
          setFavourites([]);
          safeSetItem(CART_STORAGE_KEY, []);
          safeSetItem(FAVOURITES_STORAGE_KEY, []);
          setIsAuthLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, [syncUserProfileAndFavourites]);

  // Listen to Customer Account Status Changes across the app
  useEffect(() => {
    const handleStatusChangeEvent = (e: any) => {
      if (user?.id && (!e.detail?.customerId || e.detail?.customerId === user.id)) {
        syncUserProfileAndFavourites();
      }
    };
    window.addEventListener('kud_customer_status_changed', handleStatusChangeEvent);
    return () => {
      window.removeEventListener('kud_customer_status_changed', handleStatusChangeEvent);
    };
  }, [user?.id, syncUserProfileAndFavourites]);

  // Account Restriction Flags
  const isAccountDisabled = useMemo<boolean>(() => {
    if (!user) return false;
    const status = user.account_status || profile?.account_status;
    return status === 'disabled' || status === 'on_hold';
  }, [user, profile]);

  const accountStatus = useMemo<'active' | 'on_hold' | 'disabled'>(() => {
    if (!user) return 'active';
    const status = user.account_status || profile?.account_status;
    if (status === 'on_hold') return 'on_hold';
    if (status === 'disabled') return 'disabled';
    return 'active';
  }, [user, profile]);

  const disabledReason = useMemo<string | null>(() => {
    return user?.disabled_reason || profile?.disabled_reason || null;
  }, [user, profile]);

  // Cart Functions
  const addToCart = useCallback(
    (
      product: Product,
      quantity = 1,
      selectedSizeOrVariant?: string,
      customization?: CustomerCustomizationData
    ) => {
      if (!user) {
        showToast('Please sign in to add products to your cart', 'info');
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = `/account?returnUrl=${encodeURIComponent(returnPath || '/')}`;
        return;
      }

      if (isAccountDisabled) {
        const msg =
          accountStatus === 'on_hold'
            ? 'Your account is currently on hold. Adding products to cart is restricted.'
            : 'Your account has been disabled. Adding products to cart is restricted.';
        showToast(msg, 'error');
        return;
      }

      // Quantity validation
      const qtyValidation = validateQuantityRules(product, quantity);
      const targetQuantity = qtyValidation.clampedQuantity;
      if (!qtyValidation.isValid && qtyValidation.error) {
        showToast(qtyValidation.error, 'error');
        if (targetQuantity <= 0) return;
      }

      const variant = selectedSizeOrVariant || product.sizeOrVariant || '';
      const cartItemId = generateCartItemId(product.id, variant, customization);
      const pricing = calculateCustomizedUnitPrice(product, customization, targetQuantity);

      setCart((prev) => {
        // Search by unique cartItemId first (guarantees separate customized items)
        const existingIndex = prev.findIndex((item) => (item.id || generateCartItemId(item.product.id, item.selectedSizeOrVariant, item.customization)) === cartItemId);

        if (existingIndex > -1) {
          const updated = [...prev];
          const newQty = updated[existingIndex].quantity + targetQuantity;
          const revalidated = validateQuantityRules(product, newQty);
          const finalQty = revalidated.clampedQuantity;
          const updatedPricing = calculateCustomizedUnitPrice(product, customization, finalQty);

          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: finalQty,
            calculatedUnitPrice: updatedPricing.finalUnitPrice,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: cartItemId,
              product,
              quantity: targetQuantity,
              selectedSizeOrVariant: variant,
              customization: customization || undefined,
              calculatedUnitPrice: pricing.finalUnitPrice,
            },
          ];
        }
      });

      const customLabel = customization ? 'customized item' : `"${product.name}"`;
      showToast(`Added ${customLabel} to cart`);
    },
    [user, isAccountDisabled, accountStatus, showToast]
  );

  const removeFromCart = useCallback((productIdOrCartItemId: string, variant?: string) => {
    setCart((prev) =>
      prev.filter((item) => {
        const itemId = item.id || generateCartItemId(item.product.id, item.selectedSizeOrVariant, item.customization);
        if (itemId === productIdOrCartItemId) return false;
        if (
          item.product.id === productIdOrCartItemId &&
          item.selectedSizeOrVariant === (variant || item.product.sizeOrVariant || '')
        ) {
          return false;
        }
        return true;
      })
    );
    showToast('Item removed from cart', 'info');
  }, [showToast]);

  const updateQuantity = useCallback(
    (productIdOrCartItemId: string, quantity: number, variant?: string) => {
      if (quantity <= 0) {
        removeFromCart(productIdOrCartItemId, variant);
        return;
      }

      setCart((prev) =>
        prev.map((item) => {
          const itemId = item.id || generateCartItemId(item.product.id, item.selectedSizeOrVariant, item.customization);
          const matches =
            itemId === productIdOrCartItemId ||
            (item.product.id === productIdOrCartItemId &&
              item.selectedSizeOrVariant === (variant || item.product.sizeOrVariant || ''));

          if (matches) {
            const ruleValidation = validateQuantityRules(item.product, quantity);
            const finalQty = ruleValidation.clampedQuantity;
            const updatedPricing = calculateCustomizedUnitPrice(item.product, item.customization, finalQty);

            return {
              ...item,
              quantity: finalQty,
              calculatedUnitPrice: updatedPricing.finalUnitPrice,
            };
          }
          return item;
        })
      );
    },
    [removeFromCart]
  );

  const updateCartItemCustomization = useCallback(
    (cartItemId: string, newCustomization: CustomerCustomizationData, newQuantity?: number) => {
      setCart((prev) =>
        prev.map((item) => {
          const currentId = item.id || generateCartItemId(item.product.id, item.selectedSizeOrVariant, item.customization);
          if (currentId === cartItemId) {
            const qty = newQuantity !== undefined ? newQuantity : item.quantity;
            const updatedPricing = calculateCustomizedUnitPrice(item.product, newCustomization, qty);
            const newCartItemId = generateCartItemId(item.product.id, item.selectedSizeOrVariant, newCustomization);

            return {
              ...item,
              id: newCartItemId,
              quantity: qty,
              customization: newCustomization,
              calculatedUnitPrice: updatedPricing.finalUnitPrice,
            };
          }
          return item;
        })
      );
      showToast('Customization details updated', 'success');
    },
    [showToast]
  );

  const clearCart = useCallback(() => {
    setCart((prev) => {
      if (prev.length === 0) return prev;
      return [];
    });
  }, []);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const cartSubtotal = useMemo(
    () =>
      cart.reduce((total, item) => {
        const pricing = calculateCustomizedUnitPrice(item.product, item.customization, item.quantity);
        return total + pricing.subtotal;
      }, 0),
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

  // Favourites & Wishlist Functions
  const toggleFavourite = useCallback(async (productId: string) => {
    const isCurrentlyFav = favourites.includes(productId);

    setFavourites((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to wishlist', 'success');
        return [...prev, productId];
      }
    });

    // If authenticated in Supabase, sync with the Supabase favourites/wishlist table
    if (user?.id) {
      try {
        if (isCurrentlyFav) {
          await wishlistService.removeFromWishlist(user.id, productId);
        } else {
          await wishlistService.addToWishlist(user.id, productId);
        }
      } catch (err) {
        console.warn('Failed to sync wishlist with Supabase:', err);
      }
    }
  }, [favourites, showToast, user]);

  const isFavourite = useCallback((productId: string) => favourites.includes(productId), [favourites]);

  const addToWishlist = useCallback(async (productId: string) => {
    if (!favourites.includes(productId)) {
      setFavourites((prev) => [...prev, productId]);
      showToast('Saved to wishlist', 'success');
      if (user?.id) {
        await wishlistService.addToWishlist(user.id, productId);
      }
    }
  }, [favourites, showToast, user]);

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (favourites.includes(productId)) {
      setFavourites((prev) => prev.filter((id) => id !== productId));
      showToast('Removed from wishlist', 'info');
      if (user?.id) {
        await wishlistService.removeFromWishlist(user.id, productId);
      }
    }
  }, [favourites, showToast, user]);

  const toggleWishlist = useCallback(async (productId: string) => {
    await toggleFavourite(productId);
  }, [toggleFavourite]);

  const isInWishlist = useCallback((productId: string) => favourites.includes(productId), [favourites]);

  const clearWishlist = useCallback(async () => {
    setFavourites([]);
    showToast('Wishlist cleared', 'info');
    if (user?.id) {
      await wishlistService.clearWishlist(user.id);
    }
  }, [showToast, user]);

  const resetFilters = useCallback(() => {
    setSelectedCategory('All');
    setSearchQuery('');
    setFilters({
      category: 'All',
      sortBy: 'newest',
    });
  }, []);

  // Load General Settings, Store Branding, Promo Banner & Auth Appearance from Supabase on mount
  const loadStoreCustomization = useCallback(async () => {
    try {
      const [general, branding, banner, authApp] = await Promise.all([
        adminService.getGeneralSettings(),
        adminService.getStoreBranding(),
        adminService.getPromoBanner(),
        adminService.getAuthAppearance(),
      ]);
      if (general) setGeneralSettings(general);
      if (branding) setStoreBranding(branding);
      if (authApp) {
        setAuthAppearance(authApp);
        safeSetItem(AUTH_APPEARANCE_STORAGE_KEY, authApp);
      }
      if (banner) {
        // Enforce single source of truth from Supabase
        const isAuthoritativeTrue = banner.promotional_banner_enabled === true;
        const authoritativeBanner: PromoBannerConfig = {
          ...banner,
          enabled: isAuthoritativeTrue,
          promotional_banner_enabled: isAuthoritativeTrue,
        };
        setPromoBanner(authoritativeBanner);
        safeSetItem(PROMO_BANNER_STORAGE_KEY, authoritativeBanner);
      } else {
        // Fail closed if banner is null/empty
        setPromoBanner((prev) => ({
          ...prev,
          enabled: false,
          promotional_banner_enabled: false,
        }));
      }
    } catch (err) {
      console.warn('Failed to load store settings / branding / promo banner from Supabase:', err);
      // Fail closed on error
      setPromoBanner((prev) => ({
        ...prev,
        enabled: false,
        promotional_banner_enabled: false,
      }));
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
    const isEnabled = Boolean(config.enabled);
    const syncedConfig: PromoBannerConfig = {
      ...config,
      enabled: isEnabled,
      promotional_banner_enabled: isEnabled,
    };
    setPromoBanner(syncedConfig);
    safeSetItem(PROMO_BANNER_STORAGE_KEY, syncedConfig);
    const res = await adminService.savePromoBanner(syncedConfig);
    return res;
  }, []);

  const updateAuthAppearance = useCallback(async (config: AuthAppearanceConfig) => {
    setAuthAppearance(config);
    safeSetItem(AUTH_APPEARANCE_STORAGE_KEY, config);
    const res = await adminService.saveAuthAppearance(config);
    return res;
  }, []);

  const reloadAuthAppearance = useCallback(async () => {
    try {
      const authApp = await adminService.getAuthAppearance();
      if (authApp) {
        setAuthAppearance(authApp);
        safeSetItem(AUTH_APPEARANCE_STORAGE_KEY, authApp);
      }
    } catch (err) {
      console.warn('Failed to reload auth appearance from Supabase:', err);
    }
  }, []);

  // Listen for real-time auth appearance updates from other tabs or admin actions
  useEffect(() => {
    const handleAuthAppEvent = (e: any) => {
      if (e.detail) {
        // If event detail has full config
        if (e.detail.images) {
          setAuthAppearance(e.detail);
          safeSetItem(AUTH_APPEARANCE_STORAGE_KEY, e.detail);
        } else {
          // If partial or settings row, reload full appearance with images
          reloadAuthAppearance();
        }
      }
    };
    const handleImagesEvent = () => {
      reloadAuthAppearance();
    };
    window.addEventListener('kud_auth_appearance_updated', handleAuthAppEvent);
    window.addEventListener('kud_auth_images_updated', handleImagesEvent);
    return () => {
      window.removeEventListener('kud_auth_appearance_updated', handleAuthAppEvent);
      window.removeEventListener('kud_auth_images_updated', handleImagesEvent);
    };
  }, [reloadAuthAppearance]);

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

  const updateUserProfile = useCallback(
    async (details: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
      if (isUpdatingProfileRef.current) {
        return { success: false, error: 'A profile update is already in progress. Please wait.' };
      }

      if (!user) {
        return { success: false, error: 'No active user session found.' };
      }

      isUpdatingProfileRef.current = true;

      try {
        const updatedFullName = details.fullName !== undefined ? details.fullName.trim() : (user.fullName || '');
        const updatedPhone = details.phone !== undefined ? details.phone.trim() : (user.phone || '');
        const updatedAge = details.age !== undefined ? details.age : (user.age ?? null);
        const updatedGender = details.gender !== undefined ? details.gender : (user.gender ?? null);
        const updatedAddressLine = details.addressLine !== undefined ? details.addressLine.trim() : (user.addressLine || '');
        const updatedCity = details.city !== undefined ? details.city.trim() : (user.city || '');
        const updatedProvince = details.province !== undefined ? details.province.trim() : (user.province || 'Gauteng');
        const updatedPostalCode = details.postalCode !== undefined ? details.postalCode.trim() : (user.postalCode || '');

        if (!isSupabaseConfigured() || !supabase) {
          throw new Error('Authentication service is not available.');
        }

        // Authoritatively verify current session with Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          throw new Error('You must be signed in to update your profile.');
        }
        const verifiedUserId = authData.user.id;

        // Authoritatively check account status from public.profiles
        const { data: statusCheck } = await supabase
          .from('profiles')
          .select('account_status, disabled_reason')
          .eq('id', verifiedUserId)
          .maybeSingle();

        if (statusCheck?.account_status === 'disabled') {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setRole(null);
          throw new Error(
            statusCheck.disabled_reason
              ? `Account disabled: ${statusCheck.disabled_reason}`
              : 'Your account has been disabled by store administration.'
          );
        }

        if (statusCheck?.account_status === 'on_hold') {
          throw new Error(
            statusCheck.disabled_reason
              ? `Account on hold: ${statusCheck.disabled_reason}`
              : 'Your account is temporarily on hold. Profile updates are restricted.'
          );
        }

        // 1. UPDATE public.profiles with verified user ID:
        const updatePayload: Record<string, any> = {
          full_name: updatedFullName,
          phone: updatedPhone,
          updated_at: new Date().toISOString(),
        };
        if (updatedAge !== undefined && updatedAge !== null) {
          updatePayload.age = updatedAge;
        }
        if (updatedGender) {
          updatePayload.gender = updatedGender;
        }

        let { error: updateError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', verifiedUserId);

        if (updateError) {
          console.warn('[ShopContext] Error updating profiles with age/gender, retrying with core columns:', updateError.message);
          const { error: retryError } = await supabase
            .from('profiles')
            .update({
              full_name: updatedFullName,
              phone: updatedPhone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', verifiedUserId);

            if (retryError) {
              console.error('[ShopContext] Supabase profile UPDATE failed:', retryError);
              throw new Error(retryError.message || 'Failed to update profile in database.');
            }
          }

          // Also synchronize user_metadata in Supabase Auth
          try {
            await supabase.auth.updateUser({
              data: {
                full_name: updatedFullName,
                phone: updatedPhone,
                phone_number: updatedPhone,
                age: updatedAge,
                gender: updatedGender,
              },
            });
          } catch (authMetaErr) {
            console.warn('[ShopContext] auth.updateUser metadata sync warning:', authMetaErr);
          }

          // 2. IMMEDIATELY fetch the saved profile from Supabase (SELECT the profile again)
          const { data: refreshedProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', verifiedUserId)
            .single();

          if (fetchError || !refreshedProfile) {
            console.error('[ShopContext] Failed to retrieve refreshed profile:', fetchError);
            throw new Error(fetchError?.message || 'Profile saved, but failed to reload verified profile.');
          }

          // Mark mutation timestamp so any concurrent in-flight syncs are ignored
          lastProfileMutationTimeRef.current = Date.now();

          // 3. Use the returned database value to update application state
          const verifiedDbFullName =
            refreshedProfile.full_name !== undefined && refreshedProfile.full_name !== null
              ? refreshedProfile.full_name
              : updatedFullName;
          const verifiedDbPhone =
            refreshedProfile.phone !== undefined && refreshedProfile.phone !== null
              ? refreshedProfile.phone
              : updatedPhone;
          const verifiedDbAge =
            refreshedProfile.age !== undefined && refreshedProfile.age !== null
              ? Number(refreshedProfile.age)
              : updatedAge;
          const verifiedDbGender =
            refreshedProfile.gender || updatedGender;

          const updatedUser: UserProfile = {
            ...user,
            id: verifiedUserId,
            fullName: verifiedDbFullName,
            full_name: verifiedDbFullName,
            phone: verifiedDbPhone,
            age: verifiedDbAge,
            gender: verifiedDbGender,
            addressLine: updatedAddressLine,
            address: updatedAddressLine,
            city: updatedCity,
            province: updatedProvince,
            postalCode: updatedPostalCode,
            account_status: (refreshedProfile.account_status as any) || 'active',
          };

          setUser(updatedUser);
          setProfile((prev: any) => ({
            ...(prev || {}),
            ...refreshedProfile,
            full_name: verifiedDbFullName,
            fullName: verifiedDbFullName,
            phone: verifiedDbPhone,
            age: verifiedDbAge,
            gender: verifiedDbGender,
            address_line: updatedAddressLine,
            addressLine: updatedAddressLine,
            address: updatedAddressLine,
            city: updatedCity,
            province: updatedProvince,
            postal_code: updatedPostalCode,
            postalCode: updatedPostalCode,
          }));

          // Persist address preferences and verified name locally
          safeSetItem(`kud_store_user_profile_${verifiedUserId}`, updatedUser);
          safeSetItem('kud_store_user_profile', updatedUser);

          showToast('Personal details updated successfully!', 'success');
          return { success: true };
      } catch (err: any) {
        console.error('[ShopContext] Failed to update profile:', err);
        const errorMsg = err?.message || 'Failed to update personal details';
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
      } finally {
        isUpdatingProfileRef.current = false;
      }
    },
    [user, showToast]
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setRole(null);
    setCart([]);
    setFavourites([]);
    safeSetItem(CART_STORAGE_KEY, []);
    safeSetItem(FAVOURITES_STORAGE_KEY, []);
    showToast('Signed out successfully', 'info');
  }, [showToast]);

  const contextValue = useMemo<ShopContextType>(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateCartItemCustomization,
      clearCart,
      cartCount,
      cartSubtotal,
      deliveryFee,
      freeDeliveryThreshold,

      generalSettings,
      updateGeneralSettings,
      reloadGeneralSettings,

      favourites,
      wishlist: favourites,
      toggleFavourite,
      isFavourite,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,

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
      authAppearance,
      updateAuthAppearance,
      reloadAuthAppearance,
      reloadStoreCustomization: loadStoreCustomization,

      user,
      profile,
      role,
      isAuthLoading,
      authError,
      isAccountDisabled,
      accountStatus,
      disabledReason,
      signOut,
      refetchProfile: syncUserProfileAndFavourites,
      updateUserProfile,
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
      updateCartItemCustomization,
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
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isInWishlist,
      clearWishlist,
      selectedCategory,
      searchQuery,
      filters,
      resetFilters,
      storeBranding,
      updateStoreBranding,
      promoBanner,
      updatePromoBanner,
      authAppearance,
      updateAuthAppearance,
      reloadAuthAppearance,
      loadStoreCustomization,
      user,
      profile,
      role,
      isAuthLoading,
      authError,
      isAccountDisabled,
      accountStatus,
      disabledReason,
      signOut,
      syncUserProfileAndFavourites,
      updateUserProfile,
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
