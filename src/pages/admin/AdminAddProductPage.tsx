import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { categoryService } from '../../services/categoryService';
import {
  ProductCategory,
  ProductCondition,
  ProductPublishStatus,
  ProductVariantItem,
  ProductVideoItem,
  Product,
} from '../../types';
import { useShop } from '../../context/ShopContext';
import { generateUniqueSku } from '../../utils/skuGenerator';
import { convertImageToWebP } from '../../utils/imageUpload';

// Subcomponents
import { ProductBasicInfoSection } from '../../components/admin/product-editor/ProductBasicInfoSection';
import { ProductPricingInventorySection } from '../../components/admin/product-editor/ProductPricingInventorySection';
import { ProductVariantsManager } from '../../components/admin/product-editor/ProductVariantsManager';
import {
  ProductMediaManager,
  StagedImageItem,
  StagedVideoItem,
} from '../../components/admin/product-editor/ProductMediaManager';
import { ProductCategoryFields } from '../../components/admin/product-editor/ProductCategoryFields';
import { ProductSeoSection } from '../../components/admin/product-editor/ProductSeoSection';
import { ProductShippingSection } from '../../components/admin/product-editor/ProductShippingSection';
import { ProductEditorSidebar } from '../../components/admin/product-editor/ProductEditorSidebar';
import { ProductLivePreviewModal } from '../../components/admin/product-editor/ProductLivePreviewModal';

const DRAFT_LOCAL_STORAGE_KEY = 'kud_store_product_draft_add';

export const AdminAddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [categories, setCategories] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Draft recovery state
  const [hasRestorableDraft, setHasRestorableDraft] = useState<boolean>(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string>('');

  // Live Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // ----------------------------------------------------
  // FORM STATE
  // ----------------------------------------------------
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('KUD Store');
  const [category, setCategory] = useState<ProductCategory>('' as ProductCategory);
  const [categoryError, setCategoryError] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [productType, setProductType] = useState<string>('Physical Product');
  const [sku, setSku] = useState<string>('');
  const [sizeOrVariant, setSizeOrVariant] = useState<string>('');
  const [condition, setCondition] = useState<ProductCondition>('Brand New');
  const [shortDescription, setShortDescription] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  // Pricing & Inventory
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('20');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [trackInventory, setTrackInventory] = useState<boolean>(true);
  const [allowBackorders, setAllowBackorders] = useState<boolean>(false);

  // Status & Visibility
  const [productStatus, setProductStatus] = useState<ProductPublishStatus>('active');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  // Media
  const [images, setImages] = useState<StagedImageItem[]>([]);
  const [videos, setVideos] = useState<StagedVideoItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number>(0);

  // Variants
  const [variants, setVariants] = useState<ProductVariantItem[]>([]);

  // Category Specific Attributes
  const [categoryAttributes, setCategoryAttributes] = useState<Record<string, any>>({});

  // SEO
  const [seoTitle, setSeoTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [focusKeywords, setFocusKeywords] = useState<string[]>([]);

  // Shipping
  const [weight, setWeight] = useState<string>('0.5');
  const [shippingLength, setShippingLength] = useState<string>('20');
  const [shippingWidth, setShippingWidth] = useState<string>('15');
  const [shippingHeight, setShippingHeight] = useState<string>('10');
  const [shippingClass, setShippingClass] = useState<string>('Standard Courier');
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
  const [requiresShipping, setRequiresShipping] = useState<boolean>(true);

  // ----------------------------------------------------
  // INITIAL DATA FETCH
  // ----------------------------------------------------
  useEffect(() => {
    categoryService.getActiveCategories().then((res) => {
      if (res.data && res.data.length > 0) {
        const names = res.data.map((c) => c.name);
        setCategories(names);
        setCategory((prev) => (prev ? prev : (names[0] as ProductCategory)));
      } else if (res.error) {
        console.error('[AdminAddProductPage] Supabase error loading product_categories:', res.error);
        setErrorMsg(`Failed to load product categories from database: ${res.error}`);
      }
    });

    adminService.getProducts().then((res) => {
      setExistingProducts(res || []);
    });

    // Check for existing saved draft in localStorage
    try {
      const saved = localStorage.getItem(DRAFT_LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.description || parsed.price)) {
          setHasRestorableDraft(true);
          setDraftTimestamp(parsed._savedAt ? new Date(parsed._savedAt).toLocaleTimeString() : 'earlier');
        }
      }
    } catch (e) {
      console.warn('Could not read draft from localStorage', e);
    }
  }, []);

  // ----------------------------------------------------
  // AUTO-SAVE DRAFT TO LOCALSTORAGE
  // ----------------------------------------------------
  useEffect(() => {
    if (!name && !price && !description) return;

    const draftData = {
      name,
      brand,
      category,
      subCategory,
      productType,
      sku,
      sizeOrVariant,
      condition,
      shortDescription,
      description,
      tags,
      price,
      originalPrice,
      costPrice,
      stock,
      lowStockThreshold,
      trackInventory,
      allowBackorders,
      productStatus,
      isActive,
      isFeatured,
      images: images.map((img) => ({ id: img.id, url: img.url, altText: img.altText, isRemote: img.isRemote })),
      variants,
      categoryAttributes,
      seoTitle,
      metaDescription,
      slug,
      focusKeywords,
      weight,
      shippingLength,
      shippingWidth,
      shippingHeight,
      shippingClass,
      isFreeShipping,
      requiresShipping,
      _savedAt: new Date().toISOString(),
    };

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_LOCAL_STORAGE_KEY, JSON.stringify(draftData));
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn('LocalStorage draft save error', e);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    name,
    brand,
    category,
    subCategory,
    productType,
    sku,
    sizeOrVariant,
    condition,
    shortDescription,
    description,
    tags,
    price,
    originalPrice,
    costPrice,
    stock,
    lowStockThreshold,
    trackInventory,
    allowBackorders,
    productStatus,
    isActive,
    isFeatured,
    images,
    variants,
    categoryAttributes,
    seoTitle,
    metaDescription,
    slug,
    focusKeywords,
    weight,
    shippingLength,
    shippingWidth,
    shippingHeight,
    shippingClass,
    isFreeShipping,
    requiresShipping,
  ]);

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_LOCAL_STORAGE_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.name !== undefined) setName(d.name);
      if (d.brand !== undefined) setBrand(d.brand);
      if (d.category !== undefined) setCategory(d.category);
      if (d.subCategory !== undefined) setSubCategory(d.subCategory);
      if (d.productType !== undefined) setProductType(d.productType);
      if (d.sku !== undefined) setSku(d.sku);
      if (d.sizeOrVariant !== undefined) setSizeOrVariant(d.sizeOrVariant);
      if (d.condition !== undefined) setCondition(d.condition);
      if (d.shortDescription !== undefined) setShortDescription(d.shortDescription);
      if (d.description !== undefined) setDescription(d.description);
      if (d.tags !== undefined) setTags(d.tags);
      if (d.price !== undefined) setPrice(d.price);
      if (d.originalPrice !== undefined) setOriginalPrice(d.originalPrice);
      if (d.costPrice !== undefined) setCostPrice(d.costPrice);
      if (d.stock !== undefined) setStock(d.stock);
      if (d.lowStockThreshold !== undefined) setLowStockThreshold(d.lowStockThreshold);
      if (d.trackInventory !== undefined) setTrackInventory(d.trackInventory);
      if (d.allowBackorders !== undefined) setAllowBackorders(d.allowBackorders);
      if (d.productStatus !== undefined) setProductStatus(d.productStatus);
      if (d.isActive !== undefined) setIsActive(d.isActive);
      if (d.isFeatured !== undefined) setIsFeatured(d.isFeatured);
      if (d.images !== undefined) setImages(d.images);
      if (d.variants !== undefined) setVariants(d.variants);
      if (d.categoryAttributes !== undefined) setCategoryAttributes(d.categoryAttributes);
      if (d.seoTitle !== undefined) setSeoTitle(d.seoTitle);
      if (d.metaDescription !== undefined) setMetaDescription(d.metaDescription);
      if (d.slug !== undefined) setSlug(d.slug);
      if (d.focusKeywords !== undefined) setFocusKeywords(d.focusKeywords);
      if (d.weight !== undefined) setWeight(d.weight);
      if (d.shippingLength !== undefined) setShippingLength(d.shippingLength);
      if (d.shippingWidth !== undefined) setShippingWidth(d.shippingWidth);
      if (d.shippingHeight !== undefined) setShippingHeight(d.shippingHeight);
      if (d.shippingClass !== undefined) setShippingClass(d.shippingClass);
      if (d.isFreeShipping !== undefined) setIsFreeShipping(d.isFreeShipping);
      if (d.requiresShipping !== undefined) setRequiresShipping(d.requiresShipping);

      setHasRestorableDraft(false);
      showToast('Restored unsaved draft from your previous session.', 'info');
    } catch (e) {
      console.error('Failed to restore draft', e);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_LOCAL_STORAGE_KEY);
    setHasRestorableDraft(false);
  };

  // ----------------------------------------------------
  // MEDIA HANDLERS
  // ----------------------------------------------------
  const handleUploadNewImages = async (files: File[]) => {
    setErrorMsg('');
    setIsUploadingMedia(true);
    setMediaUploadProgress(20);

    try {
      const newItems: StagedImageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const webpFile = await convertImageToWebP(file);
        const reader = new FileReader();

        const previewDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(webpFile);
        });

        newItems.push({
          id: `img-staged-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url: previewDataUrl,
          file: webpFile,
          altText: `${name || 'Product'} photo ${images.length + i + 1}`,
          sizeBytes: webpFile.size,
        });

        setMediaUploadProgress(Math.min(90, 20 + Math.round(((i + 1) / files.length) * 70)));
      }

      setImages((prev) => [...prev, ...newItems]);
      setMediaUploadProgress(100);
      showToast(`Added ${files.length} product image(s)`, 'success');
    } catch (err: any) {
      console.error('Image staging error:', err);
      setErrorMsg(err?.message || 'Error processing image uploads');
    } finally {
      setIsUploadingMedia(false);
      setMediaUploadProgress(0);
    }
  };

  const handleUploadNewVideo = async (file: File) => {
    setErrorMsg('');
    setIsUploadingMedia(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      const newVideo: StagedVideoItem = {
        id: `vid-staged-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: previewUrl,
        file: file,
        title: file.name,
        sizeBytes: file.size,
        isPrimary: videos.length === 0,
      };
      setVideos((prev) => [...prev, newVideo]);
      showToast('Video added to staging', 'success');
    } catch (err: any) {
      console.error('Video upload error:', err);
      setErrorMsg('Failed to stage video file');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleImageReplace = async (index: number, newFile: File) => {
    try {
      const webpFile = await convertImageToWebP(newFile);
      const reader = new FileReader();
      const previewDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(webpFile);
      });

      setImages((prev) =>
        prev.map((item, idx) =>
          idx === index
            ? {
                ...item,
                url: previewDataUrl,
                file: webpFile,
                sizeBytes: webpFile.size,
              }
            : item
        )
      );

      showToast(`Image #${index + 1} replaced`, 'success');
    } catch (err: any) {
      console.error('Failed to replace image', err);
      setErrorMsg('Failed to replace image');
    }
  };

  const handleImageDelete = async (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    showToast(`Image #${index + 1} removed`, 'info');
  };

  const handleVideoReplace = async (index: number, newFile: File) => {
    try {
      const previewUrl = URL.createObjectURL(newFile);
      setVideos((prev) =>
        prev.map((v, idx) =>
          idx === index
            ? {
                ...v,
                url: previewUrl,
                file: newFile,
                title: newFile.name,
                sizeBytes: newFile.size,
              }
            : v
        )
      );
      showToast('Video replaced', 'success');
    } catch (err: any) {
      console.error('Failed to replace video', err);
    }
  };

  const handleVideoDelete = async (index: number) => {
    setVideos((prev) => prev.filter((_, idx) => idx !== index));
    showToast('Video removed', 'info');
  };

  // ----------------------------------------------------
  // SUBMIT / CREATE PRODUCT
  // ----------------------------------------------------
  const handleSaveProduct = async (overrideStatus?: ProductPublishStatus) => {
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    setCategoryError('');
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!category || !String(category).trim()) {
      setCategoryError('Please select a valid product category.');
      setErrorMsg('Please select a valid product category.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid selling price.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a full product description.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Separate raw Files from existing remote URLs
      const filesToUpload: File[] = [];
      const finalImageUrls: string[] = [];

      for (const img of images) {
        if (img.file) {
          filesToUpload.push(img.file);
        } else if (img.url && !img.url.startsWith('blob:') && !img.url.startsWith('data:')) {
          finalImageUrls.push(img.url);
        }
      }

      // Videos to upload
      const videoFilesToUpload: File[] = [];
      const finalVideoItems: ProductVideoItem[] = [];

      for (const vid of videos) {
        if (vid.file) {
          videoFilesToUpload.push(vid.file);
        } else if (vid.url && !vid.url.startsWith('blob:')) {
          finalVideoItems.push({
            id: vid.id,
            url: vid.url,
            title: vid.title,
            durationSeconds: vid.durationSeconds,
            sizeBytes: vid.sizeBytes,
            isPrimary: vid.isPrimary,
          });
        }
      }

      // Sku Fallback
      const finalSku =
        sku.trim() ||
        generateUniqueSku({
          name,
          category,
          brand,
          sizeOrVariant,
          existingProducts,
        });

      // Calculate profit margin
      const numCost = parseFloat(costPrice) || 0;
      const profitMarginVal =
        numCost > 0 && parsedPrice > 0
          ? Number((((parsedPrice - numCost) / parsedPrice) * 100).toFixed(2))
          : undefined;

      // Effective target status
      const targetPublishStatus = overrideStatus || productStatus;
      const targetIsActive = targetPublishStatus === 'active' ? true : false;

      // Package dimensions
      const dimObj = {
        length: parseFloat(shippingLength) || 20,
        width: parseFloat(shippingWidth) || 15,
        height: parseFloat(shippingHeight) || 10,
      };

      // Alt texts map
      const altTextsMap: Record<string, string> = {};
      images.forEach((img, idx) => {
        if (img.altText) {
          altTextsMap[`img_${idx}`] = img.altText;
        }
      });

      const productPayload: Partial<Product> = {
        name: name.trim(),
        brand: brand.trim() || 'KUD Store',
        category,
        subCategory: subCategory.trim() || undefined,
        productType,
        shortDescription: shortDescription.trim() || undefined,
        description: description.trim(),
        tags,
        price: parsedPrice,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        costPrice: numCost > 0 ? numCost : undefined,
        profitMargin: profitMarginVal,
        stock: parseInt(stock, 10) || 0,
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
        trackInventory,
        allowBackorders,
        sku: finalSku,
        sizeOrVariant: sizeOrVariant.trim() || undefined,
        condition,
        productStatus: targetPublishStatus,
        scheduledAt: scheduledAt || undefined,
        isActive: targetIsActive,
        isFeatured,
        images: finalImageUrls,
        videos: finalVideoItems,
        variants,
        categoryAttributes,
        weight: parseFloat(weight) || 0.5,
        dimensions: dimObj,
        shippingClass,
        isFreeShipping,
        requiresShipping,
        seoTitle: seoTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        slug: slug.trim() || undefined,
        focusKeywords,
        imageAltTexts: altTextsMap,
      };

      console.log('[AdminAddProductPage] Submitting product payload:', productPayload);

      const result = await adminService.createProduct(
        productPayload,
        filesToUpload,
        videoFilesToUpload
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create product in database.');
      }

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_LOCAL_STORAGE_KEY);

      showToast(`Product "${result.data.name}" created successfully!`, 'success');
      setSuccessMsg(`Product created successfully! Redirecting to products list...`);

      setTimeout(() => {
        navigate('/admin/products');
      }, 1200);
    } catch (err: any) {
      console.error('Error creating product:', err);
      setErrorMsg(err?.message || 'Error saving product. Please check your inputs.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 pb-24">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
              title="Back to Products"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400">Products</span>
                <span className="text-[11px] text-gray-400">/</span>
                <span className="text-[11px] font-bold text-[#ff6452]">Add New Product</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                {name.trim() || 'Untitled New Product'}
              </h1>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveProduct()}
              className="px-5 py-2 bg-[#ff6452] hover:bg-[#e05342] text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Publishing...' : 'Publish Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Form Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Restorable Draft Banner */}
        {hasRestorableDraft && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 font-medium">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Unsaved draft from <strong>{draftTimestamp}</strong> was found. Would you like to restore your progress?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Left Column (Form Sections) */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Basic Information */}
            <ProductBasicInfoSection
              name={name}
              setName={setName}
              brand={brand}
              setBrand={setBrand}
              category={category}
              setCategory={(cat) => {
                setCategory(cat);
                setCategoryError('');
              }}
              categoryError={categoryError}
              subCategory={subCategory}
              setSubCategory={setSubCategory}
              productType={productType}
              setProductType={setProductType}
              sku={sku}
              setSku={setSku}
              sizeOrVariant={sizeOrVariant}
              setSizeOrVariant={setSizeOrVariant}
              condition={condition}
              setCondition={setCondition}
              shortDescription={shortDescription}
              setShortDescription={setShortDescription}
              description={description}
              setDescription={setDescription}
              tags={tags}
              setTags={setTags}
              categories={categories}
              existingProducts={existingProducts}
            />

            {/* 2. Media Manager (Images & Videos with Drag & Drop) */}
            <ProductMediaManager
              images={images}
              setImages={setImages}
              videos={videos}
              setVideos={setVideos}
              productName={name}
              onImageReplace={handleImageReplace}
              onImageDelete={handleImageDelete}
              onVideoReplace={handleVideoReplace}
              onVideoDelete={handleVideoDelete}
              onUploadNewImages={handleUploadNewImages}
              onUploadNewVideo={handleUploadNewVideo}
              isUploading={isUploadingMedia}
              uploadProgress={mediaUploadProgress}
              errorMsg={errorMsg}
            />

            {/* 3. Pricing & Inventory */}
            <ProductPricingInventorySection
              price={price}
              setPrice={setPrice}
              originalPrice={originalPrice}
              setOriginalPrice={setOriginalPrice}
              costPrice={costPrice}
              setCostPrice={setCostPrice}
              stock={stock}
              setStock={setStock}
              lowStockThreshold={lowStockThreshold}
              setLowStockThreshold={setLowStockThreshold}
              trackInventory={trackInventory}
              setTrackInventory={setTrackInventory}
              allowBackorders={allowBackorders}
              setAllowBackorders={setAllowBackorders}
            />

            {/* 4. Product Variants Manager */}
            <ProductVariantsManager
              variants={variants}
              setVariants={setVariants}
              basePrice={parseFloat(price) || 0}
              baseSku={sku}
              baseStock={parseInt(stock, 10) || 0}
            />

            {/* 5. Category-Specific Specifications */}
            <ProductCategoryFields
              category={category}
              attributes={categoryAttributes}
              setAttributes={setCategoryAttributes}
            />

            {/* 6. Shipping & Logistics */}
            <ProductShippingSection
              weight={weight}
              setWeight={setWeight}
              length={shippingLength}
              setLength={setShippingLength}
              width={shippingWidth}
              setWidth={setShippingWidth}
              height={shippingHeight}
              setHeight={setShippingHeight}
              shippingClass={shippingClass}
              setShippingClass={setShippingClass}
              isFreeShipping={isFreeShipping}
              setIsFreeShipping={setIsFreeShipping}
              requiresShipping={requiresShipping}
              setRequiresShipping={setRequiresShipping}
            />

            {/* 7. SEO & Search Snippets */}
            <ProductSeoSection
              productName={name}
              seoTitle={seoTitle}
              setSeoTitle={setSeoTitle}
              metaDescription={metaDescription}
              setMetaDescription={setMetaDescription}
              slug={slug}
              setSlug={setSlug}
              focusKeywords={focusKeywords}
              setFocusKeywords={setFocusKeywords}
              fullDescription={description}
              imagesCount={images.length}
            />
          </div>

          {/* Right Sticky Sidebar (Publishing, Status & Cover Preview) */}
          <div className="lg:col-span-4 sticky top-20 space-y-6">
            <ProductEditorSidebar
              isEditMode={false}
              productStatus={productStatus}
              setProductStatus={setProductStatus}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              isActive={isActive}
              setIsActive={setIsActive}
              isFeatured={isFeatured}
              setIsFeatured={setIsFeatured}
              primaryImageUrl={images[0]?.url || ''}
              price={price}
              stock={stock}
              sku={sku}
              isSaving={isSaving}
              onSave={handleSaveProduct}
              onOpenPreview={() => setIsPreviewOpen(true)}
              lastSavedAt={lastSavedAt}
            />
          </div>
        </div>
      </div>

      {/* Live Storefront Preview Modal */}
      <ProductLivePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        name={name}
        brand={brand}
        price={price}
        originalPrice={originalPrice}
        category={category}
        subCategory={subCategory}
        condition={condition}
        shortDescription={shortDescription}
        description={description}
        images={images.map((img) => img.url)}
        stock={stock}
        sku={sku}
        variants={variants}
        shippingClass={shippingClass}
        isFreeShipping={isFreeShipping}
        categoryAttributes={categoryAttributes}
      />
    </div>
  );
};
