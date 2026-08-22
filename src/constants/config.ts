/**
 * KUD STORE CONFIGURATION & CONSTANTS
 * Beginners can easily customize store settings, contact details, delivery fees, and colors here!
 */

import { StoreBrandingConfig, PromoBannerConfig, GeneralStoreSettings, Coupon } from '../types';

export const STORE_CONFIG = {
  // Store Basic Information
  STORE_NAME: 'KUD online store',
  STORE_TAGLINE: 'The shopping partner you can trust.',
  STORE_CURRENCY: 'R', // South African Rand
  CURRENCY_CODE: 'ZAR',
  
  // Promotional Banner Settings
  PROMO_TEXT: 'Earn per each referral, win something 🎁',
  PROMO_SUBTEXT: '120 people get R50 in KUD credit. T&Cs apply.',
  
  // Delivery & Fees
  DELIVERY_FEE: 65, // ZAR R65 flat delivery fee across SA
  EXPRESS_DELIVERY_FEE: 120, // ZAR R120 express courier delivery
  FREE_DELIVERY_THRESHOLD: 800, // Free delivery for orders over R800
  
  // Brand Colors (Tailwind Reference)
  ACCENT_COLOR: '#ff6452', // Soft Coral / Salmon
  PROMO_BG_COLOR: '#eff6ff', // Light blue background
  
  // Contact & Social Links
  CONTACT_EMAIL: 'qchirass@gmail.com',
  CONTACT_PHONE: '+27 (0)11 892 4000',
  WHATSAPP_SUPPORT: '+27797648590',
  
  // South African Provinces
  SOUTH_AFRICAN_PROVINCES: [
    'Gauteng',
    'Western Cape',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Free State',
    'Limpopo',
    'Mpumalanga',
    'North West',
    'Northern Cape',
  ],

  // Main Categories
  CATEGORY_LIST: [
    'Beauty',
    'Home',
    'Sports & Leisure',
    'Technology',
    'Books',
    'Others',
  ] as const,
};

export const DEFAULT_STORE_BRANDING: StoreBrandingConfig = {
  storeName: 'KUD online store',
  tagline: 'The shopping partner you can trust.',
  logoType: 'badge',
  logoText: 'K',
  logoImageUrl: '',
  logoHeight: 36,
  accentColor: '#ff6452',
  showTagline: true,
};

export const DEFAULT_GENERAL_SETTINGS: GeneralStoreSettings = {
  storeName: 'KUD online store',
  currency: 'R',
  deliveryFee: 65,
  expressDeliveryFee: 120,
  freeDeliveryThreshold: 800,
  enableFreeDeliveryThreshold: true,
  estimatedStandardDays: '2 - 4 Business Days',
  estimatedExpressDays: '1 - 2 Business Days',
  shippingNotes: 'Nationwide door-to-door courier via The Courier Guy & Aramex.',
  contactEmail: 'qchirass@gmail.com',
  contactPhone: '+27 (0)11 892 4000',
  storeDescription:
    'Premium South African marketplace delivering beauty, technology, home goods, and lifestyle products.',
};

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'KUD50',
    description: 'R50 OFF on orders over R150',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 150,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon-2',
    code: 'WELCOME10',
    description: '10% OFF your entire shopping bag',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon-3',
    code: 'FREESHIP',
    description: '100% OFF Delivery Fee',
    discountType: 'free_shipping',
    discountValue: 0,
    minOrderAmount: 200,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'coupon-4',
    code: 'SAVE20',
    description: '20% OFF on premium orders over R500',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 500,
    maxDiscountAmount: 300,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  enabled: true,
  layout: 'split',
  headline: 'Exclusive Weekly Deals & Massive Savings 🎁',
  subtext: 'Get up to 40% off on top electronics, beauty & home essentials with nationwide SA delivery.',
  badgeText: 'HOT DEAL 🔥',
  showBadge: true,
  ctaText: 'Explore Deals',
  ctaLink: '/search',
  showCta: true,
  mediaType: 'image',
  mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
  mediaAltText: 'Special promotional sale advertising banner',
  videoAutoplay: true,
  videoMuted: true,
  videoLoop: true,
  videoControls: false,
  backgroundColor: '#eff6ff',
  textColor: 'dark',
  accentBadgeColor: '#ff6452',
  overlayPosition: 'left',
  overlayDimming: 45,
  overlayBackgroundStyle: 'gradient',
  bannerHeight: 340,
  textAlignment: 'left',
  titleFontSize: 'xl',
  slides: [
    {
      id: 'slide-1',
      headline: 'Earn per each referral, win something 🎁',
      subtext: '120 people get R50 in KUD credit. T&Cs apply.',
      badgeText: 'REWARDS 💎',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      ctaText: 'Claim Credit',
      ctaLink: '/search',
      backgroundColor: '#eff6ff',
      overlayPosition: 'left',
      overlayDimming: 40,
    },
    {
      id: 'slide-2',
      headline: 'New Tech & Gadgets In Stock ⚡',
      subtext: 'Upgrade your workspace with premium headphones, smartwatches & accessories.',
      badgeText: 'NEW ARRIVALS',
      mediaType: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      ctaText: 'Shop Technology',
      ctaLink: '/categories',
      backgroundColor: '#fdf2f8',
      overlayPosition: 'left',
      overlayDimming: 40,
    }
  ],
};

// Payment Gateways Supported (South African & Global integrations)
export const PAYMENT_METHODS = [
  { id: 'yoco', name: 'Yoco Secure Payment', desc: 'Pay with Credit/Debit Card or Instant EFT via Yoco' },
  { id: 'card', name: 'Credit or Debit Card', desc: 'Direct Visa & Mastercard online payment' },
  { id: 'cod', name: 'Cash on Delivery (COD)', desc: 'Pay cash upon parcel delivery by courier' },
  { id: 'payfast', name: 'PayFast South Africa', desc: 'Pay with Instant EFT, Debit Card or Mobicred' },
  { id: 'ozow', name: 'Instant EFT (Ozow / Capitec Pay)', desc: 'Instant bank transfer from all major SA banks' },
  { id: 'paypal', name: 'PayPal Checkout', desc: 'Global payment with PayPal balance & cards' },
  { id: 'peach_payments', name: 'Peach Payments', desc: 'Enterprise card & digital wallet processing' },
];
