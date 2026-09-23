import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Type,
  Maximize2,
  FileText,
  Sparkles,
  Layers,
  Shirt,
  Coffee,
  Gem,
  Scissors,
  HelpCircle,
} from 'lucide-react';
import {
  Product,
  CustomerCustomizationData,
  ProductCustomizationSizeOption,
  CustomizationType,
} from '../../types';
import {
  calculateCustomizedUnitPrice,
  STANDARD_SIZE_PRESETS,
} from '../../utils/customizationPricing';
import {
  uploadCustomerDesign,
  validateCustomizationFile,
  MAX_UPLOAD_SIZE_BYTES,
} from '../../utils/customizationUpload';

interface ProductCustomizerProps {
  product: Product;
  quantity: number;
  initialCustomization?: Partial<CustomerCustomizationData> | null;
  onChange: (customization: CustomerCustomizationData) => void;
}

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

const PRINT_POSITIONS = [
  'Front Chest (Standard)',
  'Left Chest Pocket',
  'Back Full Print',
  'Front & Back (Dual)',
  'Left Sleeve',
];

const CUP_TYPES = [
  'Standard White Ceramic Mug (11oz)',
  'Black Magic Color-Changing Mug',
  'Two-Tone Inner Color Mug',
  'Insulated Stainless Steel Travel Mug',
];

const NECKLACE_FINISHES = [
  '18K Gold Plated',
  'Sterling Silver (.925)',
  'Rose Gold Plated',
  'Stainless Steel Polished',
];

const ENGRAVING_FONTS = [
  { id: 'serif', name: 'Classic Serif', sample: 'Georgia, serif' },
  { id: 'script', name: 'Elegant Calligraphy / Script', sample: 'Brush Script MT, cursive' },
  { id: 'block', name: 'Bold Modern Block', sample: 'Impact, sans-serif' },
  { id: 'sans', name: 'Clean Minimal Sans', sample: 'Helvetica, Arial, sans-serif' },
];

export const ProductCustomizer: React.FC<ProductCustomizerProps> = ({
  product,
  quantity,
  initialCustomization,
  onChange,
}) => {
  const config = product.customizationConfig;
  const customizationType: CustomizationType = config?.customizationType || 'canvas';

  // Available size options: config sizes or standard presets
  const availableSizes: ProductCustomizationSizeOption[] =
    config?.sizeOptions && config.sizeOptions.length > 0
      ? config.sizeOptions
      : STANDARD_SIZE_PRESETS;

  // Selected state
  const [selectedSize, setSelectedSize] = useState<ProductCustomizationSizeOption | undefined>(() => {
    if (initialCustomization?.selectedSizeOption) return initialCustomization.selectedSizeOption;
    return availableSizes.find((s) => s.isDefault) || availableSizes[0];
  });

  const [customDimensions, setCustomDimensions] = useState<string>(
    initialCustomization?.customDimensions || ''
  );
  const [customText, setCustomText] = useState<string>(
    initialCustomization?.customText || ''
  );
  const [tshirtSize, setTshirtSize] = useState<string>(
    initialCustomization?.tshirtSize || 'M'
  );
  const [printPosition, setPrintPosition] = useState<string>(
    initialCustomization?.printPosition || PRINT_POSITIONS[0]
  );
  const [cupType, setCupType] = useState<string>(
    initialCustomization?.cupType || CUP_TYPES[0]
  );
  const [necklaceType, setNecklaceType] = useState<string>(
    initialCustomization?.necklaceType || NECKLACE_FINISHES[0]
  );
  const [engravingFont, setEngravingFont] = useState<string>(
    initialCustomization?.engravingFont || ENGRAVING_FONTS[0].name
  );
  const [additionalInstructions, setAdditionalInstructions] = useState<string>(
    initialCustomization?.additionalInstructions || ''
  );
  const [customRequestNotes, setCustomRequestNotes] = useState<string>(
    initialCustomization?.customRequestNotes || ''
  );

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(
    initialCustomization?.designImageUrl
  );
  const [uploadedImageName, setUploadedImageName] = useState<string | undefined>(
    initialCustomization?.designImageName
  );
  const [uploadedImageSize, setUploadedImageSize] = useState<number | undefined>(
    initialCustomization?.designImageSize
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-broadcast customization payload whenever state changes
  useEffect(() => {
    const pricing = calculateCustomizedUnitPrice(
      product,
      {
        customizationType,
        selectedSizeOption: selectedSize,
      },
      quantity
    );

    const payload: CustomerCustomizationData = {
      customizationType,
      designImageUrl: uploadedImageUrl,
      designImageName: uploadedImageName,
      designImageSize: uploadedImageSize,
      selectedSizeOption: selectedSize,
      customDimensions: customDimensions.trim() || undefined,
      customText: customText.trim() || undefined,
      tshirtSize: customizationType === 't_shirt' ? tshirtSize : undefined,
      printPosition: customizationType === 't_shirt' ? printPosition : undefined,
      cupType: customizationType === 'cup' ? cupType : undefined,
      necklaceType: customizationType === 'necklace' ? necklaceType : undefined,
      engravingFont: customizationType === 'engraving' ? engravingFont : undefined,
      additionalInstructions: additionalInstructions.trim() || undefined,
      customRequestNotes: customizationType === 'other' ? customRequestNotes.trim() : undefined,
      basePrice: pricing.basePrice,
      customizationCharge: pricing.customizationCharge,
      sizeAdjustment: pricing.sizeAdjustment,
      unitPrice: pricing.finalUnitPrice,
    };

    onChange(payload);
  }, [
    customizationType,
    selectedSize,
    customDimensions,
    customText,
    tshirtSize,
    printPosition,
    cupType,
    necklaceType,
    engravingFont,
    additionalInstructions,
    customRequestNotes,
    uploadedImageUrl,
    uploadedImageName,
    uploadedImageSize,
    quantity,
    product,
    onChange,
  ]);

  // Handle image upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const validation = validateCustomizationFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      const res = await uploadCustomerDesign(file, (progress) => {
        setUploadProgress(progress);
      });

      setUploadedImageUrl(res.url);
      setUploadedImageName(res.fileName);
      setUploadedImageSize(res.sizeBytes);
      setUploadProgress(100);
    } catch (err: any) {
      console.error('[ProductCustomizer] Upload failed:', err);
      setUploadError(err.message || 'Failed to upload your design. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setUploadedImageUrl(undefined);
    setUploadedImageName(undefined);
    setUploadedImageSize(undefined);
    setUploadError(null);
  };

  // Pricing calculation for display
  const currentPricing = calculateCustomizedUnitPrice(
    product,
    {
      customizationType,
      selectedSizeOption: selectedSize,
    },
    quantity
  );

  // Render header badge based on type
  const getTypeBadge = () => {
    switch (customizationType) {
      case 'canvas':
        return { label: 'Canvas Printing', icon: Layers, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 't_shirt':
        return { label: 'Apparel Printing', icon: Shirt, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'cap':
        return { label: 'Cap Customization', icon: Sparkles, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
      case 'cup':
        return { label: 'Mug / Drinkware Printing', icon: Coffee, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'necklace':
        return { label: 'Personalized Jewelry', icon: Gem, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'engraving':
        return { label: 'Laser / Hand Engraving', icon: Scissors, color: 'text-orange-700 bg-orange-50 border-orange-200' };
      case 'poster':
        return { label: 'Art Poster Printing', icon: Maximize2, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      case 'vinyl':
        return { label: 'Vinyl Banner / Poster', icon: Layers, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' };
      default:
        return { label: 'Custom Personalized Order', icon: Sparkles, color: 'text-gray-800 bg-gray-100 border-gray-300' };
    }
  };

  const badgeInfo = getTypeBadge();
  const BadgeIcon = badgeInfo.icon;

  const showDesignUpload = config ? config.allowDesignUpload !== false : true;
  const showCustomText = config ? config.allowCustomText !== false : true;
  const showSizeSelection = config ? config.allowSizeSelection !== false : true;
  const showCustomDimensions = config ? Boolean(config.allowCustomDimensions) : true;
  const showInstructions = config ? config.allowCustomInstructions !== false : true;

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeInfo.color}`}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              {badgeInfo.label}
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Personalized Made-to-Order
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-gray-900">
            Customize Your Product
          </h3>
          <p className="text-xs text-gray-500">
            Personalize with your design, sizes, text, and custom specifications before adding to cart.
          </p>
        </div>

        {/* Customization fee pill if active */}
        {config?.customizationCharge && config.customizationCharge > 0 ? (
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Customization Charge</span>
            <span className="text-sm font-bold text-gray-900">
              +R{config.customizationCharge.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-6">
        {/* ========================================================================= */}
        {/* 1. DESIGN / LOGO / IMAGE UPLOAD                                          */}
        {/* ========================================================================= */}
        {showDesignUpload && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Upload Your Design or Logo
              <span className="ml-1 text-xs font-normal text-gray-500">
                (JPG, JPEG, PNG, WEBP — Max 10 MB)
              </span>
            </label>

            {!uploadedImageUrl ? (
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition-colors cursor-pointer hover:border-black hover:bg-gray-50/50 ${
                  isUploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-600 group-hover:bg-black group-hover:text-white transition-colors">
                  <Upload className="h-6 w-6" />
                </div>

                <p className="mt-3 text-sm font-medium text-gray-800">
                  Click or drag image file here to upload
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  High-resolution images recommended for crisp printing quality (up to 10 MB)
                </p>

                {isUploading && (
                  <div className="mt-4 w-full max-w-xs">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Uploading design...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded design"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Design uploaded successfully</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                    {uploadedImageName || 'Custom_Design.png'}
                  </p>
                  {uploadedImageSize && (
                    <p className="text-xs text-gray-500">
                      {(uploadedImageSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-black hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. PRINT SIZES & DIMENSIONS (Canvas, Poster, Vinyl, etc.)                */}
        {/* ========================================================================= */}
        {showSizeSelection && availableSizes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                Select Dimensions / Print Size
              </label>
              {selectedSize && (
                <span className="text-xs text-gray-500 font-mono">
                  {selectedSize.dimensionsCm || selectedSize.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {availableSizes.map((size) => {
                const isSelected = selectedSize?.id === size.id;
                return (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-bold">{size.name}</span>
                    {size.dimensionsCm && (
                      <span
                        className={`text-[11px] mt-0.5 ${
                          isSelected ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {size.dimensionsCm}
                      </span>
                    )}
                    {size.priceModifier > 0 ? (
                      <span
                        className={`text-[11px] font-semibold mt-1 px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        +R{size.priceModifier}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] mt-1 ${
                          isSelected ? 'text-gray-400' : 'text-gray-400'
                        }`}
                      >
                        Base Size
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom dimensions input if allowed by admin */}
        {showCustomDimensions && (
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
            <label className="block text-xs font-semibold text-gray-800 mb-1">
              Custom Dimensions (in Centimetres)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customDimensions}
                onChange={(e) => setCustomDimensions(e.target.value)}
                placeholder="e.g. 50 × 75 cm"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Specify your exact required width × height in cm if you require non-standard sizing.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. T-SHIRT SPECIFIC OPTIONS                                               */}
        {/* ========================================================================= */}
        {customizationType === 't_shirt' && (
          <div className="space-y-4 rounded-xl bg-blue-50/40 p-4 border border-blue-100">
            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                T-Shirt Size
              </label>
              <div className="flex flex-wrap gap-2">
                {TSHIRT_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setTshirtSize(sz)}
                    className={`h-9 min-w-9 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      tshirtSize === sz
                        ? 'bg-black text-white border-black shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-900 mb-1">
                Print Placement
              </label>
              <select
                value={printPosition}
                onChange={(e) => setPrintPosition(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              >
                {PRINT_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. CUP / MUG OPTIONS                                                      */}
        {/* ========================================================================= */}
        {customizationType === 'cup' && (
          <div className="space-y-3 rounded-xl bg-emerald-50/40 p-4 border border-emerald-100">
            <label className="block text-xs font-semibold text-gray-900">
              Mug / Drinkware Model
            </label>
            <div className="space-y-2">
              {CUP_TYPES.map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    cupType === c
                      ? 'border-emerald-600 bg-white shadow-xs'
                      : 'border-gray-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="cupType"
                    checked={cupType === c}
                    onChange={() => setCupType(c)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-medium text-gray-800">{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. NECKLACE OPTIONS                                                       */}
        {/* ========================================================================= */}
        {customizationType === 'necklace' && (
          <div className="space-y-3 rounded-xl bg-purple-50/40 p-4 border border-purple-100">
            <label className="block text-xs font-semibold text-gray-900">
              Jewelry Metal Finish
            </label>
            <div className="grid grid-cols-2 gap-2">
              {NECKLACE_FINISHES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNecklaceType(n)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    necklaceType === n
                      ? 'border-purple-600 bg-white shadow-xs text-purple-900'
                      : 'border-gray-200 bg-white/70 text-gray-700 hover:bg-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. ENGRAVING OPTIONS (Font selection)                                      */}
        {/* ========================================================================= */}
        {customizationType === 'engraving' && (
          <div className="space-y-3 rounded-xl bg-orange-50/40 p-4 border border-orange-100">
            <label className="block text-xs font-semibold text-gray-900">
              Engraving Font Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ENGRAVING_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => setEngravingFont(font.name)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    engravingFont === font.name
                      ? 'border-orange-600 bg-white shadow-xs'
                      : 'border-gray-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <span className="text-xs font-semibold text-gray-900 block">
                    {font.name}
                  </span>
                  <span
                    className="text-base text-gray-700 block mt-1"
                    style={{ fontFamily: font.sample }}
                  >
                    {customText || 'Sample Engraving'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. CUSTOM TEXT / NAME FIELD                                               */}
        {/* ========================================================================= */}
        {showCustomText && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-900">
                {config?.textPromptLabel || (customizationType === 'necklace' || customizationType === 'engraving'
                  ? 'Name / Text to Engrave'
                  : 'Custom Text / Name for Print')}
              </label>
              <span className="text-xs text-gray-400">
                {customText.length} characters
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. Amanda & Sbu 2026, John, or Custom Slogan"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Double-check spelling and punctuation. Text will be personalized exactly as entered.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. "OTHER / CUSTOM REQUEST" DEDICATED SPECIFICATION FIELD                */}
        {/* ========================================================================= */}
        {customizationType === 'other' && (
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Describe What You Would Like Us to Create
            </label>
            <textarea
              rows={3}
              value={customRequestNotes}
              onChange={(e) => setCustomRequestNotes(e.target.value)}
              placeholder="Describe your design, sizing, colors, finish, materials, or special crafting requirements..."
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. ADDITIONAL INSTRUCTIONS                                                */}
        {/* ========================================================================= */}
        {showInstructions && (
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              {config?.instructionsPromptLabel || 'Special Production Instructions (Optional)'}
            </label>
            <textarea
              rows={2}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g. Center logo 5cm from top, use matte finish, wrap canvas edges in white, etc."
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. BULK PRICING TIERS DISPLAY                                           */}
        {/* ========================================================================= */}
        {config?.bulkPricingTiers && config.bulkPricingTiers.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Quantity / Bulk Pricing Tiers
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.bulkPricingTiers.map((tier, idx) => {
                const isActive =
                  quantity >= tier.minQuantity &&
                  (!tier.maxQuantity || quantity <= tier.maxQuantity);
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    <span className="text-xs block text-gray-500">
                      {tier.label ||
                        (tier.maxQuantity
                          ? `${tier.minQuantity} - ${tier.maxQuantity} units`
                          : `${tier.minQuantity}+ units`)}
                    </span>
                    <span className="text-sm font-bold text-gray-900 block mt-0.5">
                      R{tier.pricePerUnit.toFixed(2)}
                      <span className="text-[10px] font-normal text-gray-500 ml-0.5">/unit</span>
                    </span>
                    {isActive && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700">
                        Active Tier
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. TRANSPARENT PRICING SUMMARY CARD                                      */}
        {/* ========================================================================= */}
        <div className="rounded-xl bg-gray-900 text-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-300 pb-2 border-b border-gray-800">
            <span>Price Breakdown</span>
            <span>Quantity: {quantity}</span>
          </div>

          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Base Product Price:</span>
              <span>R{currentPricing.basePrice.toFixed(2)}</span>
            </div>

            {currentPricing.sizeAdjustment > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>
                  Size Adjustment ({selectedSize?.name || 'Selected'}):
                </span>
                <span className="text-emerald-400">
                  +R{currentPricing.sizeAdjustment.toFixed(2)}
                </span>
              </div>
            )}

            {currentPricing.customizationCharge > 0 && (
              <div className="flex justify-between text-gray-300">
                <span>Personalization & Printing Charge:</span>
                <span className="text-emerald-400">
                  +R{currentPricing.customizationCharge.toFixed(2)}
                </span>
              </div>
            )}

            {currentPricing.bulkTierApplied && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Bulk Tier Discount Applied:</span>
                <span>Tier Active ({currentPricing.bulkTierApplied.label || `${currentPricing.bulkTierApplied.minQuantity}+ units`})</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 block">Unit Price</span>
              <span className="text-base font-bold text-white">
                R{currentPricing.finalUnitPrice.toFixed(2)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-gray-400 block">Item Subtotal</span>
              <span className="text-lg font-black text-emerald-400">
                R{currentPricing.subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
