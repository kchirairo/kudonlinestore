/**
 * SKU (Stock Keeping Unit) Automated Generator & Validation Utility
 * Generates clean, standardized, collision-resistant SKUs based on product title, category, brand, and variants.
 */

import { Product } from '../types';

export interface SkuSuggestion {
  id: string;
  label: string;
  sku: string;
  pattern: string;
  description: string;
}

export interface SkuGeneratorOptions {
  name: string;
  category?: string;
  brand?: string;
  sizeOrVariant?: string;
  separator?: '-' | '_' | '/' | '';
  includeBrand?: boolean;
  includeVariant?: boolean;
  suffixLength?: number;
  existingProducts?: Product[];
  currentProductId?: string;
}

// Category Prefix Mappings
export const CATEGORY_CODES: Record<string, string> = {
  Beauty: 'BTY',
  Home: 'HOM',
  'Sports & Leisure': 'SPT',
  Technology: 'TEC',
  Books: 'BOK',
  Others: 'GEN',
  Fashion: 'FSH',
  Clothing: 'CLO',
  Electronics: 'ELC',
  Health: 'HLT',
  Accessories: 'ACC',
  Footwear: 'FTW',
};

// Common stopwords to filter out from titles for cleaner acronyms
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'for',
  'with',
  'in',
  'on',
  'at',
  'to',
  'by',
  'from',
  '&',
  '+',
  '-',
]);

/**
 * Clean string to uppercase alphanumeric only
 */
export function sanitizeAlphaNum(text: string): string {
  return text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Get category 3-letter code
 */
export function getCategoryCode(category?: string): string {
  if (!category) return 'GEN';
  const trimmed = category.trim();
  if (CATEGORY_CODES[trimmed]) {
    return CATEGORY_CODES[trimmed];
  }
  // Extract alphanumeric first 3 letters
  const clean = sanitizeAlphaNum(trimmed);
  return clean.length >= 3 ? clean.substring(0, 3) : clean.padEnd(3, 'X');
}

/**
 * Get brand code (2-4 uppercase characters)
 */
export function getBrandCode(brand?: string): string {
  if (!brand || !brand.trim()) return 'KUD';
  const words = brand
    .trim()
    .split(/\s+/)
    .filter((w) => !STOP_WORDS.has(w.toLowerCase()));

  if (words.length === 1) {
    const clean = sanitizeAlphaNum(words[0]);
    return clean.length > 4 ? clean.substring(0, 4) : clean;
  }

  // Multi-word brand: take initials up to 4 chars
  const initials = words.map((w) => sanitizeAlphaNum(w)[0] || '').join('');
  return initials.length > 4 ? initials.substring(0, 4) : initials || 'KUD';
}

/**
 * Generate title acronym or shortened slug
 */
export function getTitleTokens(name: string): {
  acronym: string;
  shortSlug: string;
  leadWord: string;
} {
  if (!name || !name.trim()) {
    return { acronym: 'PRD', shortSlug: 'ITEM', leadWord: 'PROD' };
  }

  const rawWords = name.trim().split(/[\s\-_/+,.]+/);
  const words = rawWords.filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  const workingWords = words.length > 0 ? words : rawWords;

  // Acronym (e.g. "Hydrating Glow Serum" -> "HGS")
  const acronym = workingWords
    .map((w) => sanitizeAlphaNum(w)[0] || '')
    .join('')
    .substring(0, 4);

  // Short slug (e.g. 1st word 3 chars + 2nd word 3 chars -> "HYDGLO")
  let shortSlug = '';
  if (workingWords.length >= 2) {
    const w1 = sanitizeAlphaNum(workingWords[0]).substring(0, 3);
    const w2 = sanitizeAlphaNum(workingWords[1]).substring(0, 3);
    shortSlug = `${w1}${w2}`;
  } else if (workingWords.length === 1) {
    shortSlug = sanitizeAlphaNum(workingWords[0]).substring(0, 6);
  }

  // Lead word
  const leadWord = sanitizeAlphaNum(workingWords[0] || 'PROD').substring(0, 5);

  return {
    acronym: acronym || 'PRD',
    shortSlug: shortSlug || 'ITEM',
    leadWord: leadWord || 'PROD',
  };
}

/**
 * Extract clean variant token
 */
export function getVariantToken(variant?: string): string {
  if (!variant || !variant.trim()) return '';
  const clean = sanitizeAlphaNum(variant);
  return clean.length > 5 ? clean.substring(0, 5) : clean;
}

/**
 * Generate a random unique alphanumeric suffix
 */
export function generateRandomSuffix(length: number = 3): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars like 0, 1, I, O
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if SKU is already in use by another product
 */
export function checkSkuAvailability(
  sku: string,
  existingProducts: Product[] = [],
  currentProductId?: string
): { isAvailable: boolean; conflictingProduct?: Product } {
  if (!sku || !sku.trim()) return { isAvailable: true };

  const normalized = sku.trim().toUpperCase();
  const conflict = existingProducts.find(
    (p) => p.sku && p.sku.trim().toUpperCase() === normalized && p.id !== currentProductId
  );

  return {
    isAvailable: !conflict,
    conflictingProduct: conflict,
  };
}

/**
 * Generate a guaranteed unique SKU
 */
export function generateUniqueSku(
  options: SkuGeneratorOptions,
  format: 'standard' | 'compact' | 'brand' | 'variant' = 'standard'
): string {
  const { existingProducts = [], currentProductId } = options;
  let attempts = 0;
  let sku = '';

  while (attempts < 20) {
    const suggestions = generateSkuSuggestions(options);
    const matched = suggestions.find((s) => s.id === format) || suggestions[0];
    sku = matched.sku;

    const { isAvailable } = checkSkuAvailability(sku, existingProducts, currentProductId);
    if (isAvailable) {
      return sku;
    }
    attempts++;
  }

  // Fallback with timestamp hash if collision persists
  return `${getCategoryCode(options.category)}-${sanitizeAlphaNum(options.name).substring(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/**
 * Generate multiple distinct SKU suggestions based on product attributes
 */
export function generateSkuSuggestions(options: SkuGeneratorOptions): SkuSuggestion[] {
  const {
    name,
    category,
    brand,
    sizeOrVariant,
    separator = '-',
  } = options;

  const catCode = getCategoryCode(category);
  const brandCode = getBrandCode(brand);
  const { acronym, shortSlug, leadWord } = getTitleTokens(name);
  const varCode = getVariantToken(sizeOrVariant);
  const randSuffix = generateRandomSuffix(3);
  const numSuffix = Math.floor(100 + Math.random() * 900).toString();

  const suggestions: SkuSuggestion[] = [
    // 1. Standard: Category + Short Slug + Random Hash (e.g. BTY-HYDGLO-7K2)
    {
      id: 'standard',
      label: 'Standard Recommended',
      sku: [catCode, shortSlug, randSuffix].filter(Boolean).join(separator),
      pattern: `[CATEGORY]${separator}[TITLE-SLUG]${separator}[HASH]`,
      description: 'Balanced for easy categorization & warehouse inventory lookup.',
    },
    // 2. Compact / Acronym: Category + Acronym + Numeric (e.g. BTY-HGS-482)
    {
      id: 'compact',
      label: 'Compact Code',
      sku: [catCode, acronym, numSuffix].filter(Boolean).join(separator),
      pattern: `[CATEGORY]${separator}[ACRONYM]${separator}[NUM]`,
      description: 'Short and barcode-friendly for shelf tags and quick scanning.',
    },
    // 3. Brand-Centric: Brand + Category + Lead Word + Hash (e.g. KUD-BTY-HYDRA-8A3)
    {
      id: 'brand',
      label: 'Brand & Category',
      sku: [brandCode, catCode, leadWord, randSuffix].filter(Boolean).join(separator),
      pattern: `[BRAND]${separator}[CATEGORY]${separator}[NAME]${separator}[HASH]`,
      description: 'Ideal when managing multi-brand catalogs and supplier stocks.',
    },
    // 4. Variant / Detailed: Category + Lead Word + Variant + Hash (e.g. BTY-HYDRA-30ML-01)
    {
      id: 'variant',
      label: varCode ? 'Variant Detailed' : 'Serial Formatted',
      sku: varCode
        ? [catCode, leadWord, varCode, randSuffix.substring(0, 2)].filter(Boolean).join(separator)
        : [catCode, leadWord, '01', randSuffix.substring(0, 2)].filter(Boolean).join(separator),
      pattern: varCode
        ? `[CATEGORY]${separator}[NAME]${separator}[VARIANT]${separator}[HASH]`
        : `[CATEGORY]${separator}[NAME]${separator}[SERIAL]`,
      description: 'Specifies size or variant for items with multiple options.',
    },
  ];

  return suggestions;
}
