import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Save,
  AlertCircle,
  Trash2,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Product, ProductCategory, ProductCondition } from '../../types';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { convertImageToWebP } from '../../utils/imageUpload';
import { SkuGeneratorWidget } from '../../components/admin/SkuGeneratorWidget';
import { generateUniqueSku } from '../../utils/skuGenerator';

export const AdminEditProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [categories, setCategories] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [category, setCategory] = useState<string>('Beauty');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('0');
  const [sku, setSku] = useState<string>('');
  const [sizeOrVariant, setSizeOrVariant] = useState<string>('');
  const [condition, setCondition] = useState<ProductCondition>('Brand New');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Gallery & Image Management State
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deletedStorageUrls, setDeletedStorageUrls] = useState<string[]>([]);

  // Replacement State
  const [replacingExistingIndex, setReplacingExistingIndex] = useState<number | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAllFileInputRef = useRef<HTMLInputElement | null>(null);

  // New Staged Uploads State
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState<string>('');
  const [replacingNewFileIndex, setReplacingNewFileIndex] = useState<number | null>(null);
  const replaceNewFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;

    async function loadProductData() {
      setIsLoading(true);
      const [product, cats, allProducts] = await Promise.all([
        adminService.getProductById(id!),
        adminService.getCategories(),
        adminService.getProducts(),
      ]);

      setCategories(cats.map((c) => c.name));
      setExistingProducts(allProducts);

      if (product) {
        setName(product.name || '');
        setBrand(product.brand || '');
        setCategory(product.category || 'Beauty');
        setDescription(product.description || '');
        setPrice(product.price ? String(product.price) : '0');
        setOriginalPrice(product.originalPrice ? String(product.originalPrice) : '');
        setStock(product.stock !== undefined ? String(product.stock) : '0');
        setSku(product.sku || '');
        setSizeOrVariant(product.sizeOrVariant || '');
        setCondition(product.condition || 'Brand New');
        setIsFeatured(Boolean(product.isFeatured));
        setIsActive(product.isActive !== false);
        setExistingImages(product.images || ((product as any).imageUrl ? [(product as any).imageUrl] : []));
      }
      setIsLoading(false);
    }

    loadProductData();
  }, [id]);

  // Handle incoming multiple files for new uploads
  const handleFilesSelected = (files: FileList | File[]) => {
    const validFiles: File[] = [];

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload valid image files (PNG, JPG, WEBP, AVIF).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds the 10MB limit.`);
        return;
      }
      validFiles.push(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewImagePreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      setErrorMsg('');
      setNewImageFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  // Replace a specific existing image in inventory
  const handleTriggerReplaceExisting = (index: number) => {
    setReplacingExistingIndex(index);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceExistingFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingExistingIndex === null || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    try {
      const optimizedWebP = await convertImageToWebP(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const oldUrl = existingImages[replacingExistingIndex];
          if (oldUrl && !deletedStorageUrls.includes(oldUrl)) {
            setDeletedStorageUrls((prev) => [...prev, oldUrl]);
          }

          // Convert into a new staged file
          setNewImageFiles((prev) => [...prev, optimizedWebP]);
          setNewImagePreviews((prev) => [...prev, reader.result as string]);

          // Remove the replaced existing image from the existing array
          setExistingImages((prev) => prev.filter((_, i) => i !== replacingExistingIndex));
          showToast('Image replaced. New image staged for save.', 'info');
        }
      };
      reader.readAsDataURL(optimizedWebP);
    } catch (err) {
      console.warn('Image replacement error:', err);
    } finally {
      setReplacingExistingIndex(null);
    }
  };

  // Replace all existing images with brand new selections
  const handleTriggerReplaceAll = () => {
    if (replaceAllFileInputRef.current) {
      replaceAllFileInputRef.current.value = '';
      replaceAllFileInputRef.current.click();
    }
  };

  const handleReplaceAllFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    // Stage all current existing images for deletion
    setDeletedStorageUrls((prev) => [...prev, ...existingImages]);
    setExistingImages([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);

    handleFilesSelected(e.target.files);
    showToast('All existing images cleared and replaced with new files.', 'info');
  };

  // Delete a single existing image
  const handleDeleteExistingImage = (index: number) => {
    const urlToDelete = existingImages[index];
    if (urlToDelete && !deletedStorageUrls.includes(urlToDelete)) {
      setDeletedStorageUrls((prev) => [...prev, urlToDelete]);
    }
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    showToast('Image removed from gallery.', 'info');
  };

  // Delete all existing images
  const handleDeleteAllExistingImages = () => {
    if (existingImages.length === 0) return;
    setDeletedStorageUrls((prev) => [...prev, ...existingImages]);
    setExistingImages([]);
    showToast('All existing images deleted from product.', 'info');
  };

  // Set as primary image (promotes to position 0)
  const handleSetPrimaryExisting = (index: number) => {
    if (index === 0 || index >= existingImages.length) return;
    const target = existingImages[index];
    const rest = existingImages.filter((_, i) => i !== index);
    setExistingImages([target, ...rest]);
    showToast('Primary cover image updated.', 'success');
  };

  // Reorder existing images
  const handleMoveExisting = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= existingImages.length) return;

    const copy = [...existingImages];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;
    setExistingImages(copy);
  };

  // Staged New Uploads controls
  const handleRemoveNewFile = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTriggerReplaceNewFile = (index: number) => {
    setReplacingNewFileIndex(index);
    if (replaceNewFileInputRef.current) {
      replaceNewFileInputRef.current.value = '';
      replaceNewFileInputRef.current.click();
    }
  };

  const handleReplaceNewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingNewFileIndex === null || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    try {
      const optimized = await convertImageToWebP(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const idx = replacingNewFileIndex;
          setNewImageFiles((prev) => prev.map((f, i) => (i === idx ? optimized : f)));
          setNewImagePreviews((prev) => prev.map((p, i) => (i === idx ? (reader.result as string) : p)));
        }
      };
      reader.readAsDataURL(optimized);
    } finally {
      setReplacingNewFileIndex(null);
    }
  };

  const handleAddNewImageUrl = () => {
    const trimmed = newImageUrlInput.trim();
    if (trimmed) {
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        setErrorMsg('Please enter a valid image URL starting with http:// or https://');
        return;
      }
      setExistingImages((prev) => [...prev, trimmed]);
      setNewImageUrlInput('');
      setErrorMsg('');
      showToast('Image URL added to gallery.', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    if (!price || Number(price) < 0) {
      setErrorMsg('Price must be greater than or equal to 0.');
      return;
    }

    if (!stock || Number(stock) < 0) {
      setErrorMsg('Stock must be greater than or equal to 0.');
      return;
    }

    setIsSaving(true);

    try {
      const finalImages = [...existingImages];
      if (newImageUrlInput.trim() && !finalImages.includes(newImageUrlInput.trim())) {
        finalImages.push(newImageUrlInput.trim());
      }

      const finalSku =
        sku.trim() ||
        generateUniqueSku({
          name: name.trim() || 'Product',
          category,
          brand,
          sizeOrVariant,
          existingProducts,
          currentProductId: id,
        });

      const result = await adminService.updateProduct(
        id,
        {
          name: name.trim(),
          brand: brand.trim(),
          category: category as ProductCategory,
          description: description.trim(),
          price: Number(price),
          originalPrice: originalPrice ? Number(originalPrice) : undefined,
          stock: Number(stock),
          sku: finalSku,
          sizeOrVariant: sizeOrVariant.trim(),
          condition,
          isFeatured,
          isActive,
          images: finalImages,
        },
        newImageFiles.length > 0 ? newImageFiles : undefined,
        deletedStorageUrls.length > 0 ? deletedStorageUrls : undefined
      );

      setIsSaving(false);

      if (result.success) {
        showToast(`Product "${name}" updated successfully`, 'success');
        navigate('/admin/products');
      } else {
        setErrorMsg(result.error || 'Failed to update product.');
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.message || 'An error occurred while updating the product.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/4" />
        <div className="h-96 bg-gray-200 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden File Pickers for In-Place Replacement */}
      <input
        type="file"
        accept="image/*"
        ref={replaceFileInputRef}
        onChange={handleReplaceExistingFileChange}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        multiple
        ref={replaceAllFileInputRef}
        onChange={handleReplaceAllFileChange}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={replaceNewFileInputRef}
        onChange={handleReplaceNewFileChange}
        className="hidden"
      />

      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/products')}
        className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-2xl transition-all shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Products</span>
      </button>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Edit Product</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Update specifications, images, replace or delete photos, pricing, and stock levels.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">
                    Price ({STORE_CONFIG.STORE_CURRENCY})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Original Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>
              </div>

              {/* Stock, Variant & Condition */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">
                    Stock Inventory <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Variant / Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 30ml, M"
                    value={sizeOrVariant}
                    onChange={(e) => setSizeOrVariant(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-800">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ProductCondition)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Like New">Like New</option>
                    <option value="Refurbished">Refurbished</option>
                    <option value="Vintage">Vintage</option>
                    <option value="Good">Good</option>
                  </select>
                </div>
              </div>

              {/* Automated SKU Generator Tool */}
              <div className="pt-1">
                <SkuGeneratorWidget
                  sku={sku}
                  onChange={setSku}
                  name={name}
                  category={category}
                  brand={brand}
                  sizeOrVariant={sizeOrVariant}
                  existingProducts={existingProducts}
                  currentProductId={id}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-[#ff6452]"
                  />
                  <span>Product Active</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-[#ff6452]"
                  />
                  <span>Featured Product</span>
                </label>
              </div>
            </div>

            {/* Right Column: Complete Image Management with Replace & Delete Options */}
            <div className="space-y-4">
              {/* Existing Product Images */}
              <div className="space-y-2.5 bg-gray-50/70 p-4 rounded-3xl border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#ff6452]" />
                    <label className="text-xs font-black text-gray-900">
                      Existing Product Images ({existingImages.length})
                    </label>
                  </div>

                  {existingImages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTriggerReplaceAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all shadow-2xs"
                        title="Select new images to replace all existing images"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Replace All</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAllExistingImages}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs"
                        title="Remove all existing images"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete All</span>
                      </button>
                    </div>
                  )}
                </div>

                {existingImages.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white space-y-1">
                    <p className="text-xs font-semibold text-gray-500">No active images in gallery.</p>
                    <p className="text-[11px] text-gray-400">Upload or add photos below to populate this product.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
                    {existingImages.map((img, idx) => {
                      const isPrimary = idx === 0;
                      return (
                        <div
                          key={`existing-img-${idx}`}
                          className={`relative group rounded-2xl overflow-hidden border bg-white aspect-square shadow-2xs transition-all ${
                            isPrimary ? 'border-2 border-[#ff6452] ring-2 ring-rose-100' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Product image ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=600&q=80';
                            }}
                          />

                          {/* Primary Cover Badge */}
                          <div className="absolute top-1.5 left-1.5 pointer-events-none">
                            {isPrimary ? (
                              <span className="flex items-center gap-1 bg-[#ff6452] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                <Star className="w-2.5 h-2.5 fill-white" /> Primary
                              </span>
                            ) : (
                              <span className="bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs backdrop-blur-xs">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Interactive Overlay with Replace, Reorder, and Delete buttons */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            {/* Reorder and Primary Actions */}
                            <div className="flex items-center justify-between gap-1">
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryExisting(idx)}
                                  className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                                  title="Set as primary cover image"
                                >
                                  <Star className="w-3 h-3 fill-white" />
                                  <span className="text-[9px]">Make Primary</span>
                                </button>
                              )}
                              <div className="flex items-center gap-1 ml-auto">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExisting(idx, 'left')}
                                    className="p-1 bg-white/80 hover:bg-white text-gray-800 rounded-lg text-[10px] transition-colors"
                                    title="Move image left"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {idx < existingImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveExisting(idx, 'right')}
                                    className="p-1 bg-white/80 hover:bg-white text-gray-800 rounded-lg text-[10px] transition-colors"
                                    title="Move image right"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Bottom Actions: Replace Specific & Delete */}
                            <div className="flex items-center gap-1.5 justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => handleTriggerReplaceExisting(idx)}
                                className="flex-1 py-1 px-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                                title="Replace this specific image with another photo"
                              >
                                <RefreshCw className="w-2.5 h-2.5" />
                                <span>Replace</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteExistingImage(idx)}
                                className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-colors"
                                title="Delete this image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upload / Add Images (Drag & Drop Zone) */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800">Upload Photos (Supabase Storage)</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-500" /> WebP Auto-Optimized
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Collision-Proof UUID
                    </span>
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  className={`border-2 border-dashed transition-all rounded-3xl p-5 text-center space-y-3 ${
                    isDragging
                      ? 'border-[#ff6452] bg-rose-50/60 scale-[1.01]'
                      : 'border-gray-200 hover:border-[#ff6452] bg-gray-50/50'
                  }`}
                >
                  {newImagePreviews.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold text-gray-700">
                          Staged New Uploads ({newImagePreviews.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewImageFiles([]);
                            setNewImagePreviews([]);
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:underline"
                        >
                          Clear Staged
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                        {newImagePreviews.map((preview, idx) => {
                          const fileObj = newImageFiles[idx];
                          return (
                            <div key={`new-file-prev-${idx}`} className="relative group rounded-2xl overflow-hidden border border-emerald-300 bg-white aspect-square shadow-2xs">
                              <img
                                src={preview}
                                alt={`New upload ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                                New +
                              </span>

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <span className="text-[9px] font-bold text-white bg-black/60 px-1 py-0.5 rounded truncate max-w-full">
                                  {fileObj ? fileObj.name : `File ${idx + 1}`}
                                </span>

                                <div className="flex items-center gap-1 justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerReplaceNewFile(idx)}
                                    className="p-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-0.5"
                                    title="Replace this staged file"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>Replace</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNewFile(idx)}
                                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold"
                                    title="Delete staged file"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-1 flex items-center justify-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageFileChange}
                          className="hidden"
                          id="edit-product-image-upload-more"
                        />
                        <label
                          htmlFor="edit-product-image-upload-more"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-800 rounded-xl cursor-pointer transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#ff6452]" />
                          <span>Add More Files</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          Drag & drop photos or click to browse
                        </p>
                        <p className="text-[11px] text-gray-400">
                          PNG, JPG, WEBP, AVIF up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="edit-product-image-upload"
                      />
                      <label
                        htmlFor="edit-product-image-upload"
                        className="inline-block px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-800 rounded-xl cursor-pointer transition-colors shadow-2xs"
                      >
                        Browse Image Files
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-1 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 block">
                    Or append direct image URL:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={newImageUrlInput}
                      onChange={(e) => setNewImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewImageUrl();
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewImageUrl}
                      disabled={!newImageUrlInput.trim()}
                      className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-bold rounded-2xl transition-colors"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Description</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              disabled={isSaving}
              className="px-5 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-[#ff6452] hover:bg-[#ff4935] text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Updating...' : 'Update Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
