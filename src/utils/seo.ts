import { Product, ProductCategory } from '../types';
import { STORE_CONFIG } from '../constants/config';

export interface CategorySeoMeta {
  name: ProductCategory;
  slug: string;
  title: string;
  metaDescription: string;
  heading: string;
  description: string;
  keywords: string[];
}

export const CATEGORY_SEO_DATA: Record<ProductCategory, CategorySeoMeta> = {
  Beauty: {
    name: 'Beauty',
    slug: 'beauty',
    title: 'Beauty & Personal Care | Shop Online in South Africa | KUD Store',
    metaDescription:
      'Shop authentic skincare, haircare, and beauty essentials in South Africa. Top quality products, genuine brands, fast nationwide courier delivery at KUD Store.',
    heading: 'Beauty & Personal Care Essentials',
    description:
      'Explore our curated collection of premium skincare, nourishing serums, and daily grooming favorites across South Africa. All products are verified authentic and dispatched with reliable door-to-door courier delivery.',
    keywords: ['beauty products south africa', 'skincare south africa', 'marula face serum', 'cosmetics online za'],
  },
  Home: {
    name: 'Home',
    slug: 'home',
    title: 'Home & Kitchen Decor | Buy Online in South Africa | KUD Store',
    metaDescription:
      'Discover stylish home essentials, artisanal ceramics, and modern living accessories in South Africa with fast delivery and secure checkout.',
    heading: 'Home & Living Essentials',
    description:
      'Upgrade your home with handcrafted ceramics, ambient lighting, and practical kitchenware designed for South African households. Quality craftsmanship delivered directly to your doorstep.',
    keywords: ['home decor south africa', 'kitchen essentials za', 'ceramic tableware online', 'kud home'],
  },
  'Sports & Leisure': {
    name: 'Sports & Leisure',
    slug: 'sports-leisure',
    title: 'Sports & Leisure Gear | Shop Outdoor & Fitness in South Africa | KUD Store',
    metaDescription:
      'Browse sports equipment, fitness essentials, and outdoor accessories in South Africa. Competitive ZAR prices and nationwide courier shipping.',
    heading: 'Sports, Fitness & Outdoor Leisure',
    description:
      'Gear up for workouts, trail runs, and weekend adventures with durable sports accessories, recovery essentials, and outdoor gear suited for South Africa’s active lifestyle.',
    keywords: ['fitness gear south africa', 'sports equipment online', 'gym accessories za'],
  },
  Technology: {
    name: 'Technology',
    slug: 'technology',
    title: 'Technology, Audio & Smart Gadgets | Buy in South Africa | KUD Store',
    metaDescription:
      'Shop wireless headphones, smart accessories, and everyday tech gadgets in South Africa with door-to-door shipping and warranty support.',
    heading: 'Smart Technology & Audio Gadgets',
    description:
      'Stay connected with high-performance audio, portable charging solutions, and productivity gadgets. Reliable tech delivered safely across Gauteng, Western Cape, KZN, and all SA provinces.',
    keywords: ['tech accessories south africa', 'bluetooth headphones za', 'gadgets online south africa'],
  },
  Books: {
    name: 'Books',
    slug: 'books',
    title: 'Books, Journals & Stationery | Shop Online South Africa | KUD Store',
    metaDescription:
      'Discover captivating books, guided journals, and premium stationery in South Africa. Secure online payments via Yoco and fast nationwide delivery.',
    heading: 'Books, Literature & Daily Journals',
    description:
      'From inspiring non-fiction and productivity planners to relaxation reads, explore reading materials and stationery curated for learners, professionals, and book lovers nationwide.',
    keywords: ['books online south africa', 'stationery za', 'journals south africa'],
  },
  Others: {
    name: 'Others',
    slug: 'others',
    title: 'Curated Deals & Special Finds | KUD Store South Africa',
    metaDescription:
      'Explore unique finds, daily clearance deals, and lifestyle items in South Africa. Verified authentic products and quick delivery from KUD Store.',
    heading: 'Featured Deals & Special Finds',
    description:
      'Discover limited-quantity deals, seasonal promotions, and unique products across everyday categories with nationwide courier shipping in South Africa.',
    keywords: ['online deals south africa', 'general store za', 'kud store specials'],
  },
};

/**
 * Converts a category name to a clean URL slug
 */
export function categoryToSlug(category: string): string {
  const normalized = category.trim();
  if (normalized === 'Sports & Leisure' || normalized.toLowerCase() === 'sports & leisure') {
    return 'sports-leisure';
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Maps a URL slug back to the official ProductCategory
 */
export function slugToCategory(slug: string): ProductCategory | null {
  const cleanSlug = slug.trim().toLowerCase();
  for (const [catName, meta] of Object.entries(CATEGORY_SEO_DATA)) {
    if (meta.slug === cleanSlug || categoryToSlug(catName) === cleanSlug) {
      return catName as ProductCategory;
    }
  }
  return null;
}

/**
 * Gets SEO metadata for a category name or slug
 */
export function getCategorySeoMeta(categoryOrSlug: string): CategorySeoMeta {
  const directMatch = CATEGORY_SEO_DATA[categoryOrSlug as ProductCategory];
  if (directMatch) return directMatch;

  const foundCat = slugToCategory(categoryOrSlug);
  if (foundCat && CATEGORY_SEO_DATA[foundCat]) {
    return CATEGORY_SEO_DATA[foundCat];
  }

  // Fallback
  return {
    name: (categoryOrSlug as ProductCategory) || 'Others',
    slug: categoryToSlug(categoryOrSlug || 'others'),
    title: `${categoryOrSlug} | ${STORE_CONFIG.STORE_NAME} South Africa`,
    metaDescription: `Explore our collection of authentic ${categoryOrSlug} products in South Africa with fast courier delivery from ${STORE_CONFIG.STORE_NAME}.`,
    heading: `${categoryOrSlug} Collection`,
    description: `Shop genuine ${categoryOrSlug} items curated for quality, value, and reliability in South Africa.`,
    keywords: [`${categoryOrSlug.toLowerCase()} south africa`],
  };
}

/**
 * Returns the canonical base URL for the store
 */
export function getSiteUrl(): string {
  const env = (import.meta as any).env || {};
  const configuredUrl = (
    env.VITE_SITE_URL ||
    env.VITE_APP_URL ||
    env.VITE_PUBLIC_SITE_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return origin;
    }
    if (origin && !origin.includes('localhost')) {
      return origin;
    }
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  return 'https://kudstore.co.za';
}

/**
 * Normalizes image URLs to full absolute URLs for search engines
 */
function toAbsoluteImageUrl(imgUrl: string, siteUrl: string): string {
  if (!imgUrl) return '';
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    return imgUrl;
  }
  const cleanPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
  return `${siteUrl}${cleanPath}`;
}

/**
 * Maps product condition string to Schema.org ItemCondition enum
 */
function mapConditionToSchema(condition?: string): string {
  switch (condition) {
    case 'Brand New':
      return 'https://schema.org/NewCondition';
    case 'Like New':
      return 'https://schema.org/LikeNewCondition';
    case 'Refurbished':
      return 'https://schema.org/RefurbishedCondition';
    case 'Vintage':
    case 'Good':
      return 'https://schema.org/UsedCondition';
    default:
      return 'https://schema.org/NewCondition';
  }
}

/**
 * Generates Google-compliant Schema.org JSON-LD Product & Merchant Return/Shipping structured data graph
 * Implements Google Search Rich Results guidelines for Products and Merchant Listings.
 */
export function generateProductJsonLd(product: Product, canonicalUrl: string): Record<string, any> {
  const siteUrl = getSiteUrl();
  const categorySlug = categoryToSlug(product.category);

  // Normalize image URLs to absolute URLs
  const absoluteImages = (product.images || [])
    .map((img) => toAbsoluteImageUrl(img, siteUrl))
    .filter(Boolean);

  const conditionUrl = mapConditionToSchema(product.condition);
  const isFreeDelivery = product.price >= STORE_CONFIG.FREE_DELIVERY_THRESHOLD;
  const shippingCost = isFreeDelivery ? 0 : STORE_CONFIG.DELIVERY_FEE;

  // Single Product Entity
  const productEntity: Record<string, any> = {
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: product.name,
    description:
      product.description && product.description.trim()
        ? product.description.trim()
        : `${product.name} by ${product.brand || STORE_CONFIG.STORE_NAME}. Buy online in South Africa at ${STORE_CONFIG.STORE_NAME}.`,
    image: absoluteImages.length > 0 ? (absoluteImages.length === 1 ? absoluteImages[0] : absoluteImages) : undefined,
    category: product.category,
    sku: product.sku && product.sku.trim() ? product.sku.trim() : product.id,
    mpn: product.sku && product.sku.trim() ? product.sku.trim() : product.id,
    productID: product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand && product.brand.trim() ? product.brand.trim() : STORE_CONFIG.STORE_NAME,
    },
    itemCondition: conditionUrl,
    offers: {
      '@type': 'Offer',
      '@id': `${canonicalUrl}#offer`,
      url: canonicalUrl,
      priceCurrency: STORE_CONFIG.CURRENCY_CODE || 'ZAR',
      price: product.price,
      priceValidUntil: '2027-12-31',
      itemCondition: conditionUrl,
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: STORE_CONFIG.STORE_NAME,
        url: siteUrl,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: shippingCost,
          currency: 'ZAR',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'ZA',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'd',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 4,
            unitCode: 'd',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ZA',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
    },
  };

  // Add AggregateRating if authentic rating exists
  if (product.rating && typeof product.rating === 'number' && product.rating > 0) {
    productEntity.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 1,
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Breadcrumb Trail Entity
  const breadcrumbEntity = {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Categories',
        item: `${siteUrl}/categories`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.category,
        item: `${siteUrl}/category/${categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: canonicalUrl,
      },
    ],
  };

  // ItemPage Entity
  const webPageEntity = {
    '@type': 'ItemPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${product.name} | ${STORE_CONFIG.STORE_NAME} South Africa`,
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: STORE_CONFIG.STORE_NAME,
      url: siteUrl,
    },
    mainEntity: {
      '@id': `${canonicalUrl}#product`,
    },
    breadcrumb: {
      '@id': `${canonicalUrl}#breadcrumb`,
    },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [productEntity, breadcrumbEntity, webPageEntity],
  };
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generates Schema.org CollectionPage / ItemList structured data for categories
 */
export function generateCategoryJsonLd(
  categoryName: string,
  products: Product[],
  canonicalUrl: string
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryName} Products | ${STORE_CONFIG.STORE_NAME}`,
    url: canonicalUrl,
    description: `Shop authentic ${categoryName} products at ${STORE_CONFIG.STORE_NAME} South Africa.`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 24).map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${getSiteUrl()}/product/${p.id}`,
        name: p.name,
        image: p.images?.[0],
      })),
    },
  };
}

/**
 * Generates Schema.org OnlineStore & Organization structured data for the homepage
 */
export function generateStoreJsonLd(): Record<string, any> {
  const siteUrl = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: STORE_CONFIG.STORE_NAME,
    description: STORE_CONFIG.STORE_TAGLINE,
    url: siteUrl,
    currenciesAccepted: 'ZAR',
    paymentAccepted: 'Credit Card, Debit Card, Instant EFT via Yoco',
    priceRange: 'R50 - R5000',
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: STORE_CONFIG.CONTACT_EMAIL,
      telephone: STORE_CONFIG.CONTACT_PHONE,
      contactType: 'customer service',
      areaServed: 'ZA',
      availableLanguage: ['English', 'Afrikaans', 'isiZulu'],
    },
  };
}
