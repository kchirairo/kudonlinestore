import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Trash2,
  RefreshCw,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { ProductCategory, ProductCondition, Product } from '../../types';
import { useShop } from '../../context/ShopContext';
import { STORE_CONFIG } from '../../constants/config';
import { convertImageToWebP } from '../../utils/imageUpload';
import { SkuGeneratorWidget } from '../../components/admin/SkuGeneratorWidget';
import { generateUniqueSku } from '../../utils/skuGenerator';

export const AdminAddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useShop();

  const [categories, setCategories] = useState<string[]>([]);
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [category, setCategory] = useState<string>('Beauty');
  const [description, setDescription] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('20');
  const [sku, setSku] = useState<string>('');
  const [sizeOrVariant, setSizeOrVariant] = useState<string>('');
  const [condition, setCondition] = useState<ProductCondition>('Brand New');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Image Upload State
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [extraImageUrls, setExtraImageUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Replacement State
  const [replacingFileIndex, setReplacingFileIndex] = useState<number | null>(null);
  const replaceSingleFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAllFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    adminService.getCategories().then((res) => {
      setCategories(res.map((c) => c.name));
    });
    adminService.getProducts().then((res) => {
      setExistingProducts(res);
    });
  }, []);

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
          setImagePreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      setErrorMsg('');
      setImageFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  // Replace a specific staged file
  const handleTriggerReplaceFile = (index: number) => {
    setReplacingFileIndex(index);
    if (replaceSingleFileInputRef.current) {
      replaceSingleFileInputRef.current.value = '';
      replaceSingleFileInputRef.current.click();
    }
  };

  const handleReplaceSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (replacingFileIndex === null || !e.target.files || e.target.files.length === 0) return;
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
          const idx = replacingFileIndex;
          setImageFiles((prev) => prev.map((f, i) => (i === idx ? optimized : f)));
          setImagePreviews((prev) => prev.map((p, i) => (i === idx ? (reader.result as string) : p)));
          showToast('Image replaced successfully.', 'info');
        }
      };
      reader.readAsDataURL(optimized);
    } finally {
      setReplacingFileIndex(null);
    }
  };

  // Replace All Staged Images
  const handleTriggerReplaceAll = () => {
    if (replaceAllFileInputRef.current) {
      replaceAllFileInputRef.current.value = '';
      replaceAllFileInputRef.current.click();
    }
  };

  const handleReplaceAllFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setImageFiles([]);
    setImagePreviews([]);
    setExtraImageUrls([]);
    handleFilesSelected(e.target.files);
    showToast('Gallery replaced with newly selected images.', 'info');
  };

  // Remove single file
  const handleRemoveFile = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    showToast('Image removed from staging.', 'info');
  };

  // Clear all staged images
  const handleClearAllStaged = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setExtraImageUrls([]);
    showToast('All staged images removed.', 'info');
  };

  // Make Primary File
  const handleMakePrimaryFile = (index: number) => {
    if (index === 0 || index >= imageFiles.length) return;
    const targetFile = imageFiles[index];
    const targetPrev = imagePreviews[index];

    const restFiles = imageFiles.filter((_, i) => i !== index);
    const restPrevs = imagePreviews.filter((_, i) => i !== index);

    setImageFiles([targetFile, ...restFiles]);
    setImagePreviews([targetPrev, ...restPrevs]);
    showToast('Primary cover image updated.', 'success');
  };

  // Move Staged File Left/Right
  const handleMoveFile = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= imageFiles.length) return;

    const copyFiles = [...imageFiles];
    const copyPrevs = [...imagePreviews];

    const tempF = copyFiles[index];
    copyFiles[index] = copyFiles[newIdx];
    copyFiles[newIdx] = tempF;

    const tempP = copyPrevs[index];
    copyPrevs[index] = copyPrevs[newIdx];
    copyPrevs[newIdx] = tempP;

    setImageFiles(copyFiles);
    setImagePreviews(copyPrevs);
  };

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (trimmed) {
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        setErrorMsg('Please enter a valid image URL starting with http:// or https://');
        return;
      }
      setExtraImageUrls((prev) => [...prev, trimmed]);
      setImageUrlInput('');
      setErrorMsg('');
      showToast('Image URL added.', 'info');
    }
  };

  const handleRemoveExtraUrl = (index: number) => {
    setExtraImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }

    if (!price || Number(price) < 0) {
      setErrorMsg('Price must be a valid number greater than or equal to 0.');
      return;
    }

    if (!stock || Number(stock) < 0) {
      setErrorMsg('Stock quantity must be greater than or equal to 0.');
      return;
    }

    if (!category) {
      setErrorMsg('Please select a product category.');
      return;
    }

    setIsSaving(true);

    try {
      const allUrls = [...extraImageUrls];
      if (imageUrlInput.trim() && !allUrls.includes(imageUrlInput.trim())) {
        allUrls.push(imageUrlInput.trim());
      }

      const finalSku =
        sku.trim() ||
        generateUniqueSku({
          name: name.trim() || 'Product',
          category,
          brand,
          sizeOrVariant,
          existingProducts,
        });

      const result = await adminService.createProduct(
        {
          name: name.trim(),
          brand: brand.trim() || 'KUD Store',
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
          images: allUrls,
        },
        imageFiles.length > 0 ? imageFiles : undefined
      );

      setIsSaving(false);

      if (result.success) {
        showToast(`Product "${name}" created successfully`, 'success');
        navigate('/admin/products');
      } else {
        setErrorMsg(result.error || 'Failed to save product to database.');
      }
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err?.message || 'An error occurred while uploading product images or saving.');
    }
  };

  const totalImageCount = imagePreviews.length + extraImageUrls.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hidden File Inputs for Replacement */}
      <input
        type="file"
        accept="image/*"
        ref={replaceSingleFileInputRef}
        onChange={handleReplaceSingleFileChange}
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add New Product</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Create a new product listing for the KUD Store storefront catalog.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Core Fields */}
            <div className="space-y-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hydrating Glow Serum 30ml"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. KUD Skin"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">
                    Category <span className="text-rose-500">*</span>
                  </label>
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

              {/* Price & Original Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">
                    Price ({STORE_CONFIG.STORE_CURRENCY}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="35000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:border-[#ff6452]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800">Original Price (Slash Price)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="45000"
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
                    Stock <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="25"
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
                />
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#ff6452] rounded-md focus:ring-[#ff6452]"
                  />
                  <span>Product Active (Visible in Store)</span>
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

            {/* Right Column: Image Upload & Description with Replace & Delete Tools */}
            <div className="space-y-4">
              {/* Product Image Upload */}
              <div className="space-y-2.5 bg-gray-50/70 p-4 rounded-3xl border border-gray-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#ff6452]" />
                    <label className="text-xs font-black text-gray-900">
                      Product Images ({totalImageCount})
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {totalImageCount > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleTriggerReplaceAll}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all shadow-2xs"
                          title="Replace entire gallery"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Replace All</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllStaged}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-2xs"
                          title="Delete all images"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Drag and Drop Zone */}
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
                      : 'border-gray-200 hover:border-[#ff6452] bg-white'
                  }`}
                >
                  {/* Previews List with Controls */}
                  {totalImageCount > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-1">
                        {imagePreviews.map((preview, idx) => {
                          const fileObj = imageFiles[idx];
                          const isPrimary = idx === 0;
                          return (
                            <div
                              key={`file-prev-${idx}`}
                              className={`relative group rounded-2xl overflow-hidden border bg-white aspect-square shadow-2xs transition-all ${
                                isPrimary ? 'border-2 border-[#ff6452] ring-2 ring-rose-100' : 'border-gray-200'
                              }`}
                            >
                              <img
                                src={preview}
                                alt={`Upload ${idx + 1}`}
                                className="w-full h-full object-cover"
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

                              {/* Interactive Overlay */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex items-center justify-between gap-1">
                                  {!isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => handleMakePrimaryFile(idx)}
                                      className="p-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-bold flex items-center gap-0.5 shadow-xs"
                                      title="Make primary cover"
                                    >
                                      <Star className="w-2.5 h-2.5 fill-white" />
                                      <span>Make Primary</span>
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 ml-auto">
                                    {idx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveFile(idx, 'left')}
                                        className="p-1 bg-white/80 hover:bg-white text-gray-800 rounded-lg text-[10px]"
                                        title="Move left"
                                      >
                                        <ChevronLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {idx < imagePreviews.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleMoveFile(idx, 'right')}
                                        className="p-1 bg-white/80 hover:bg-white text-gray-800 rounded-lg text-[10px]"
                                        title="Move right"
                                      >
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerReplaceFile(idx)}
                                    className="flex-1 py-1 px-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs"
                                    title="Replace this image"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>Replace</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(idx)}
                                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-xs"
                                    title="Delete image"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {extraImageUrls.map((url, idx) => (
                          <div key={`url-prev-${idx}`} className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-white aspect-square shadow-2xs">
                            <img
                              src={url}
                              alt={`URL ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                              <span className="text-[9px] font-bold text-white bg-black/60 px-1 py-0.5 rounded truncate max-w-full">
                                Remote URL
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraUrl(idx)}
                                className="self-end p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageFileChange}
                          className="hidden"
                          id="product-image-upload-more"
                        />
                        <label
                          htmlFor="product-image-upload-more"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-800 rounded-xl cursor-pointer transition-colors shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#ff6452]" />
                          <span>Add More Files</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#ff6452] mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">
                          Drag & drop or click to upload photos
                        </p>
                        <p className="text-[11px] text-gray-400">
                          PNG, JPG, WEBP, AVIF up to 10MB • Auto-converted to optimized WebP
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <label
                        htmlFor="product-image-upload"
                        className="inline-block px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-xs font-bold text-gray-800 rounded-xl cursor-pointer transition-colors shadow-2xs"
                      >
                        Browse Files
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
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#ff6452]"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      disabled={!imageUrlInput.trim()}
                      className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-bold rounded-2xl transition-colors"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800">Product Description</label>
                <textarea
                  rows={5}
                  placeholder="Describe the features, specifications, and benefits of the product..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#ff6452]"
                />
              </div>
            </div>
          </div>

          {/* Form Action */}
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
              <span>{isSaving ? 'Saving Product...' : 'Publish Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
