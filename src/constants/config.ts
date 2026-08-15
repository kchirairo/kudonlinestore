/**
 * KUD STORE CONFIGURATION & CONSTANTS
 * Beginners can easily customize store settings, contact details, delivery fees, and colors here!
 */

import { StoreBrandingConfig, PromoBannerConfig } from '../types';

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
  FREE_DELIVERY_THRESHOLD: 800, // Free delivery for orders over R800
  
  // Brand Colors (Tailwind Reference)
  ACCENT_COLOR: '#ff6452', // Soft Coral / Salmon
  PROMO_BG_COLOR: '#eff6ff', // Light blue background
  
  // Contact & Social Links
  CONTACT_EMAIL: 'support@kudstore.co.za',
  CONTACT_PHONE: '+27 (0)11 892 4000',
  WHATSAPP_SUPPORT: '+27 (0)82 123 4567',
  
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

// Payment Gateways Supported (Interface prepared for South African integrations like Yoco/PayFast/Ozow)
export const PAYMENT_METHODS = [
  { id: 'yoco', name: 'Yoco Secure Payment', desc: 'Pay with Credit/Debit Card or Instant EFT via Yoco' },
  { id: 'card', name: 'Credit or Debit Card', desc: 'Instant & Secure via PayFast / Peach' },
  { id: 'ozow', name: 'Instant EFT (Ozow / Capitec Pay)', desc: 'Zero fees from all major SA banks' },
  { id: 'cod', name: 'Cash on Delivery', desc: 'Available for selected Gauteng / WC metro areas' },
];
