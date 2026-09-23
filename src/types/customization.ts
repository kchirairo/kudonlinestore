/**
 * Types and interfaces for customizable printing, engraving, personalized products,
 * flexible cart quantities, and product-specific pricing rules in KUD Store.
 */

export type CustomizationType =
  | 'canvas'
  | 't_shirt'
  | 'cap'
  | 'cup'
  | 'necklace'
  | 'engraving'
  | 'poster'
  | 'vinyl'
  | 'other';

export interface ProductCustomizationSizeOption {
  id: string;
  name: string; // e.g. "A5", "A4", "A3", "30 × 40 cm", "Large"
  dimensionsCm?: string; // e.g. "21 × 29.7 cm"
  priceModifier: number; // e.g. +30, +50, etc.
  isDefault?: boolean;
}

export interface BulkPricingTier {
  minQuantity: number;
  maxQuantity?: number; // optional upper bound (e.g. 4 for 1-4)
  pricePerUnit: number; // e.g. 135
  label?: string; // e.g. "5 - 9 units"
}

export interface ProductCustomizationConfig {
  isCustomizable: boolean;
  customizationType: CustomizationType;
  allowDesignUpload: boolean;
  allowCustomText: boolean;
  allowCustomDimensions: boolean;
  allowSizeSelection: boolean;
  allowCustomInstructions: boolean;
  customizationCharge: number; // e.g. +R50
  sizeOptions: ProductCustomizationSizeOption[];
  minOrderQuantity: number;
  maxOrderQuantity: number;
  quantityStep: number;
  disableStockLimits?: boolean; // For made-to-order products
  bulkPricingTiers?: BulkPricingTier[];
  customDimensionsPrompt?: string; // e.g. "Enter custom width & height in cm"
  textPromptLabel?: string; // e.g. "Name or text to engrave / print"
  instructionsPromptLabel?: string; // e.g. "Finishing requirements or special requests"
}

export interface CustomerCustomizationData {
  customizationType: CustomizationType;
  designImageUrl?: string;
  designImageName?: string;
  designImageSize?: number;
  selectedSizeOption?: ProductCustomizationSizeOption;
  customDimensions?: string; // e.g. "45 × 60 cm"
  customText?: string; // e.g. "Amanda & Thabo 2026"
  tshirtSize?: string; // e.g. "S", "M", "L", "XL", "2XL", "3XL"
  printPosition?: string; // e.g. "Front Chest", "Back", "Left Pocket", "Both Sides"
  cupType?: string; // e.g. "Standard Ceramic", "Magic Color Changing Mug"
  necklaceType?: string; // e.g. "Gold Plated", "Sterling Silver"
  engravingFont?: string; // e.g. "Classic Serif", "Modern Script", "Bold Block"
  additionalInstructions?: string;
  customRequestNotes?: string; // For "Other / Custom Request"

  // Financial breakdown values calculated for this specific customization:
  basePrice: number;
  customizationCharge: number;
  sizeAdjustment: number;
  unitPrice: number;
}
