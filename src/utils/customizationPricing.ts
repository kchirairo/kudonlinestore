import {
  Product,
  CustomerCustomizationData,
  ProductCustomizationSizeOption,
  BulkPricingTier,
  ProductCustomizationConfig,
} from '../types';

/**
 * Standard recommended print sizes & dimensions (in cm)
 * Examples given in specifications:
 * - A5 — 14.8 × 21 cm
 * - A4 — 21 × 29.7 cm
 * - A3 — 29.7 × 42 cm
 * - A2 — 42 × 59.4 cm
 * - A1 — 59.4 × 84.1 cm
 */
export const STANDARD_SIZE_PRESETS: ProductCustomizationSizeOption[] = [
  { id: 'size-a5', name: 'A5', dimensionsCm: '14.8 × 21 cm', priceModifier: 0, isDefault: true },
  { id: 'size-a4', name: 'A4', dimensionsCm: '21 × 29.7 cm', priceModifier: 30 },
  { id: 'size-a3', name: 'A3', dimensionsCm: '29.7 × 42 cm', priceModifier: 60 },
  { id: 'size-a2', name: 'A2', dimensionsCm: '42 × 59.4 cm', priceModifier: 120 },
  { id: 'size-a1', name: 'A1', dimensionsCm: '59.4 × 84.1 cm', priceModifier: 240 },
];

export interface PriceCalculationResult {
  basePrice: number;
  sizeAdjustment: number;
  customizationCharge: number;
  unitPriceBeforeBulk: number;
  bulkTierApplied?: BulkPricingTier;
  finalUnitPrice: number;
  subtotal: number;
  savingsTotal: number;
}

/**
 * Calculates accurate pricing for a customized or standard product.
 * Factors in:
 * 1. Base product unit price
 * 2. Size / dimension modifier (from selected size preset)
 * 3. Additional customization charges (printing, engraving fee)
 * 4. Quantity-based bulk pricing tiers
 */
export function calculateCustomizedUnitPrice(
  product: Product,
  customization?: Partial<CustomerCustomizationData> | null,
  quantity: number = 1
): PriceCalculationResult {
  const basePrice = Math.max(0, Number(product.price) || 0);
  const config = product.customizationConfig;

  // 1. Size / dimension adjustment
  let sizeAdjustment = 0;
  if (customization?.selectedSizeOption?.priceModifier !== undefined) {
    sizeAdjustment = Number(customization.selectedSizeOption.priceModifier) || 0;
  } else if (config?.sizeOptions && config.sizeOptions.length > 0) {
    const defaultOption = config.sizeOptions.find((o) => o.isDefault) || config.sizeOptions[0];
    if (defaultOption) {
      sizeAdjustment = Number(defaultOption.priceModifier) || 0;
    }
  }

  // 2. Customization fee
  let customizationCharge = 0;
  if (config?.isCustomizable && config.customizationCharge > 0) {
    // Only charge if customization is active
    customizationCharge = Number(config.customizationCharge) || 0;
  }

  const unitPriceBeforeBulk = Math.max(0, basePrice + sizeAdjustment + customizationCharge);

  // 3. Bulk pricing tiers evaluation
  let finalUnitPrice = unitPriceBeforeBulk;
  let bulkTierApplied: BulkPricingTier | undefined = undefined;

  if (config?.bulkPricingTiers && config.bulkPricingTiers.length > 0) {
    // Find matching tier for current quantity
    const matchingTier = config.bulkPricingTiers
      .filter((t) => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity))
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (matchingTier && matchingTier.pricePerUnit > 0) {
      bulkTierApplied = matchingTier;
      // The tier price replaces the unit price (or adds size adjustment if tier is base-only)
      finalUnitPrice = matchingTier.pricePerUnit + sizeAdjustment;
    }
  }

  const subtotal = finalUnitPrice * quantity;
  const savingsTotal = Math.max(0, (unitPriceBeforeBulk - finalUnitPrice) * quantity);

  return {
    basePrice,
    sizeAdjustment,
    customizationCharge,
    unitPriceBeforeBulk,
    bulkTierApplied,
    finalUnitPrice,
    subtotal,
    savingsTotal,
  };
}

/**
 * Generates a collision-free cart item identifier based on product ID,
 * variant, and exact customization fingerprint.
 *
 * This ensures that:
 * - Items with different designs, engravings, or custom text stay separated in the cart.
 * - Items with identical details merge their quantity.
 */
export function generateCartItemId(
  productId: string,
  variant?: string,
  customization?: Partial<CustomerCustomizationData> | null
): string {
  if (!customization) {
    return `${productId}_${variant || 'default'}`;
  }

  // Build a deterministic fingerprint string
  const parts = [
    productId,
    variant || '',
    customization.customizationType || '',
    customization.selectedSizeOption?.id || '',
    customization.selectedSizeOption?.name || '',
    customization.customDimensions?.trim() || '',
    customization.customText?.trim() || '',
    customization.tshirtSize?.trim() || '',
    customization.printPosition?.trim() || '',
    customization.cupType?.trim() || '',
    customization.necklaceType?.trim() || '',
    customization.engravingFont?.trim() || '',
    customization.designImageUrl?.trim() || '',
    customization.additionalInstructions?.trim() || '',
    customization.customRequestNotes?.trim() || '',
  ];

  return `item_${parts.map((p) => encodeURIComponent(p)).join('__')}`;
}

/**
 * Validates quantity rules for a product:
 * - Minimum order quantity
 * - Maximum order quantity
 * - Quantity step / increment
 * - Stock availability
 */
export function validateQuantityRules(
  product: Product,
  requestedQuantity: number
): { isValid: boolean; clampedQuantity: number; error?: string } {
  const config = product.customizationConfig;
  const minQty = Math.max(1, config?.minOrderQuantity || 1);
  const maxQty = config?.maxOrderQuantity && config.maxOrderQuantity > 0 ? config.maxOrderQuantity : 9999;
  const step = Math.max(1, config?.quantityStep || 1);

  let clamped = Math.max(minQty, requestedQuantity);

  // Check step rounding
  if (step > 1) {
    const remainder = (clamped - minQty) % step;
    if (remainder !== 0) {
      clamped = clamped - remainder;
      if (clamped < minQty) clamped = minQty;
    }
  }

  if (clamped > maxQty) {
    return {
      isValid: false,
      clampedQuantity: maxQty,
      error: `Maximum allowed quantity for this product is ${maxQty}.`,
    };
  }

  // Stock check if stock limits are enabled
  const disablesLimits = config?.disableStockLimits || !product.trackInventory || product.allowBackorders;
  if (!disablesLimits && typeof product.stock === 'number' && product.stock > 0 && clamped > product.stock) {
    return {
      isValid: false,
      clampedQuantity: product.stock,
      error: `Only ${product.stock} units currently available in stock.`,
    };
  }

  return {
    isValid: true,
    clampedQuantity: clamped,
  };
}
