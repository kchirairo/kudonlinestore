import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Trash2,
  RefreshCw,
  Star,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Play,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Film,
  Edit2,
  X,
  Layers,
} from 'lucide-react';
import { ProductVideoItem } from '../../../types';
import { DeleteMediaConfirmModal } from './DeleteMediaConfirmModal';

export interface StagedImageItem {
  id: string;
  url: string;
  file?: File;
  altText?: string;
  title?: string;
  sizeBytes?: number;
  isRemote?: boolean;
}

export interface StagedVideoItem extends ProductVideoItem {
  file?: File;
}

interface ProductMediaManagerProps {
  images: StagedImageItem[];
  setImages: React.Dispatch<React.SetStateAction<StagedImageItem[]>>;
  videos: StagedVideoItem[];
  setVideos: React.Dispatch<React.SetStateAction<StagedVideoItem[]>>;
  productName: string;
  onImageReplace: (index: number, newFile: File) => Promise<void>;
  onImageDelete: (index: number) => Promise<void>;
  onVideoReplace: (index: number, newFile: File) => Promise<void>;
  onVideoDelete: (index: number) => Promise<void>;
  onUploadNewImages: (files: File[]) => Promise<void>;
  onUploadNewVideo: (file: File) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  errorMsg?: string;
}

export const ProductMediaManager: React.FC<ProductMediaManagerProps> = ({
  images,
  setImages,
  videos,
  setVideos,
  productName,
  onImageReplace,
  onImageDelete,
  onVideoReplace,
  onVideoDelete,
  onUploadNewImages,
  onUploadNewVideo,
  isUploading = false,
  uploadProgress = 0,
  errorMsg,
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'images' | 'videos'>('images');

  // Drag & drop state for images
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  // Drag & drop state for videos
  const [draggedVideoIndex, setDraggedVideoIndex] = useState<number | null>(null);
  const [dragOverVideoIndex, setDragOverVideoIndex] = useState<number | null>(null);

  // Dropzone drag-over state
  const [isDropzoneActive, setIsDropzoneActive] = useState<boolean>(false);

  // Individual file input refs
  const multipleImageInputRef = useRef<HTMLInputElement | null>(null);
  const singleImageReplaceRef = useRef<HTMLInputElement | null>(null);
  const targetReplaceImageIndexRef = useRef<number | null>(null);

  const singleVideoInputRef = useRef<HTMLInputElement | null>(null);
  const singleVideoReplaceRef = useRef<HTMLInputElement | null>(null);
  const targetReplaceVideoIndexRef = useRef<number | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    mediaType: 'image' | 'video';
    index: number;
    url: string;
  } | null>(null);
  const [isExecutingDelete, setIsExecutingDelete] = useState<boolean>(false);

  // Alt Text Editor Popover/Modal State
  const [editingAltIndex, setEditingAltIndex] = useState<number | null>(null);
  const [tempAltText, setTempAltText] = useState<string>('');

  // Video URL state
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [videoTitleInput, setVideoTitleInput] = useState<string>('');

  // Image URL state
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageUrlAlt, setImageUrlAlt] = useState<string>('');

  // Video Player Modal State
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // ----------------------------------------------------
  // DRAG & DROP REORDERING HANDLERS FOR IMAGES
  // ----------------------------------------------------
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverImageIndex !== index) {
      setDragOverImageIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) {
      setDraggedImageIndex(null);
      setDragOverImageIndex(null);
      return;
    }

    setImages((prev) => {
      const items = [...prev];
      const [draggedItem] = items.splice(draggedImageIndex, 1);
      items.splice(targetIndex, 0, draggedItem);
      return items;
    });

    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  // ----------------------------------------------------
  // DRAG & DROP REORDERING HANDLERS FOR VIDEOS
  // ----------------------------------------------------
  const handleVideoDragStart = (e: React.DragEvent, index: number) => {
    setDraggedVideoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleVideoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverVideoIndex !== index) {
      setDragOverVideoIndex(index);
    }
  };

  const handleVideoDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedVideoIndex === null || draggedVideoIndex === targetIndex) {
      setDraggedVideoIndex(null);
      setDragOverVideoIndex(null);
      return;
    }

    setVideos((prev) => {
      const items = [...prev];
      const [draggedItem] = items.splice(draggedVideoIndex, 1);
      items.splice(targetIndex, 0, draggedItem);
      return items.map((item, idx) => ({
        ...item,
        isPrimary: idx === 0,
      }));
    });

    setDraggedVideoIndex(null);
    setDragOverVideoIndex(null);
  };

  // ----------------------------------------------------
  // INDIVIDUAL IMAGE CARD ACTIONS
  // ----------------------------------------------------
  const handleSetPrimaryImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    setImages((prev) => {
      const items = [...prev];
      const [target] = items.splice(index, 1);
      return [target, ...items];
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIdx];
      copy[newIdx] = temp;
      return copy;
    });
  };

  const handleTriggerReplaceImage = (index: number) => {
    targetReplaceImageIndexRef.current = index;
    if (singleImageReplaceRef.current) {
      singleImageReplaceRef.current.value = '';
      singleImageReplaceRef.current.click();
    }
  };

  const handleSingleImageReplaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = targetReplaceImageIndexRef.current;
    if (file && index !== null && index >= 0 && index < images.length) {
      await onImageReplace(index, file);
    }
    targetReplaceImageIndexRef.current = null;
  };

  const handlePromptDeleteImage = (index: number) => {
    const item = images[index];
    if (!item) return;
    setDeleteModalState({
      isOpen: true,
      mediaType: 'image',
      index,
      url: item.url,
    });
  };

  // ----------------------------------------------------
  // INDIVIDUAL VIDEO CARD ACTIONS
  // ----------------------------------------------------
  const handleSetPrimaryVideo = (index: number) => {
    setVideos((prev) =>
      prev.map((v, i) => ({
        ...v,
        isPrimary: i === index,
      }))
    );
  };

  const handleTriggerReplaceVideo = (index: number) => {
    targetReplaceVideoIndexRef.current = index;
    if (singleVideoReplaceRef.current) {
      singleVideoReplaceRef.current.value = '';
      singleVideoReplaceRef.current.click();
    }
  };

  const handleSingleVideoReplaceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const index = targetReplaceVideoIndexRef.current;
    if (file && index !== null && index >= 0 && index < videos.length) {
      await onVideoReplace(index, file);
    }
    targetReplaceVideoIndexRef.current = null;
  };

  const handlePromptDeleteVideo = (index: number) => {
    const item = videos[index];
    if (!item) return;
    setDeleteModalState({
      isOpen: true,
      mediaType: 'video',
      index,
      url: item.url,
    });
  };

  // ----------------------------------------------------
  // CONFIRM DELETION
  // ----------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteModalState) return;
    setIsExecutingDelete(true);
    try {
      if (deleteModalState.mediaType === 'image') {
        await onImageDelete(deleteModalState.index);
      } else {
        await onVideoDelete(deleteModalState.index);
      }
      setDeleteModalState(null);
    } finally {
      setIsExecutingDelete(false);
    }
  };

  // ----------------------------------------------------
  // ADD BY URL HANDLERS
  // ----------------------------------------------------
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
      alert('Please enter a valid image URL (e.g. https://images.unsplash.com/...)');
      return;
    }

    const newId = `img-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const suggestedAlt = imageUrlAlt.trim() || `${productName || 'Product'} photo ${images.length + 1}`;

    setImages((prev) => [
      ...prev,
      {
        id: newId,
        url: trimmed,
        altText: suggestedAlt,
        isRemote: true,
      },
    ]);

    setImageUrlInput('');
    setImageUrlAlt('');
  };

  const handleAddVideoUrl = () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      alert('Please enter a valid video URL (e.g. YouTube or MP4 link)');
      return;
    }

    const newId = `vid-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newVideo: StagedVideoItem = {
      id: newId,
      url: trimmed,
      title: videoTitleInput.trim() || `${productName || 'Product'} Video ${videos.length + 1}`,
      isPrimary: videos.length === 0,
    };

    setVideos((prev) => [...prev, newVideo]);
    setVideoUrlInput('');
    setVideoTitleInput('');
  };

  // ----------------------------------------------------
  // DROPZONE FOR MULTIPLE FILES
  // ----------------------------------------------------
  const handleDropzoneFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter((f) => f.type.startsWith('image/'));
    const videoFiles = fileArray.filter((f) => f.type.startsWith('video/'));

    if (imageFiles.length > 0) {
      await onUploadNewImages(imageFiles);
    }
    if (videoFiles.length > 0) {
      for (const v of videoFiles) {
        await onUploadNewVideo(v);
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
      {/* Hidden File Inputs */}
      <input
        type="file"
        accept="image/*"
        multiple
        ref={multipleImageInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleDropzoneFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        accept="image/*"
        ref={singleImageReplaceRef}
        onChange={handleSingleImageReplaceChange}
        className="hidden"
      />
      <input
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        ref={singleVideoInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadNewVideo(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        ref={singleVideoReplaceRef}
        onChange={handleSingleVideoReplaceChange}
        className="hidden"
      />

      {/* Section Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] flex items-center justify-center font-bold border border-rose-100 dark:border-rose-900/60">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                Product Media Manager
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                {images.length} {images.length === 1 ? 'Image' : 'Images'}
                {videos.length > 0 ? ` • ${videos.length} Video` : ''}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Drag &amp; drop to reorder. Position #1 automatically serves as the primary cover photo.
            </p>
          </div>
        </div>

        {/* Media Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveMediaTab('images')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMediaTab === 'images'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-[#ff6452]" />
            <span>Images ({images.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMediaTab('videos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMediaTab === 'videos'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-4 h-4 text-purple-500" />
            <span>Videos ({videos.length})</span>
          </button>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-800 dark:text-slate-200">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#ff6452]" />
              <span>Uploading &amp; Optimizing Media with WebP Engine...</span>
            </span>
            <span>{uploadProgress > 0 ? `${uploadProgress}%` : 'Processing...'}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#ff6452] h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(15, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. PRODUCT IMAGES SECTION WITH DRAG & DROP & INDIVIDUAL CONTROLS */}
      {/* ============================================================ */}
      {activeMediaTab === 'images' && (
        <div className="space-y-6">
          {/* Unified Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropzoneActive(true);
            }}
            onDragLeave={() => setIsDropzoneActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropzoneActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleDropzoneFiles(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
              isDropzoneActive
                ? 'border-[#ff6452] bg-rose-50/50 dark:bg-rose-950/30 scale-[1.01]'
                : 'border-gray-200 dark:border-slate-700 hover:border-[#ff6452] dark:hover:border-[#ff6452] bg-gray-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#ff6452] mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Drag &amp; drop product images here, or click to upload
            </h4>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">
              Supports PNG, JPG, WEBP, AVIF up to 10MB • Auto-converted to high-clarity WebP
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => multipleImageInputRef.current?.click()}
                disabled={isUploading}
                className="px-5 py-2.5 bg-[#ff6452] hover:bg-[#e05342] text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Select Image Files</span>
              </button>
            </div>
          </div>

          {/* Direct Image URL Option */}
          <div className="p-4 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-200/80 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                <span>Add Image from Web URL</span>
              </span>
              <span className="text-[11px] text-gray-400">CDN / Unsplash / Direct link</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
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
                className="sm:col-span-7 px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
              />
              <input
                type="text"
                placeholder="Optional Alt text (e.g. Front view)"
                value={imageUrlAlt}
                onChange={(e) => setImageUrlAlt(e.target.value)}
                className="sm:col-span-3 px-3.5 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!imageUrlInput.trim()}
                className="sm:col-span-2 px-4 py-2 bg-gray-900 dark:bg-slate-700 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 cursor-pointer text-center"
              >
                Add URL
              </button>
            </div>
          </div>

          {/* Image Cards Grid with Individual Controls & Drag-Drop Sorting */}
          {images.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Image Gallery ({images.length})
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <GripVertical className="w-3.5 h-3.5" /> Drag cards to rearrange order
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((item, idx) => {
                  const isPrimary = idx === 0;
                  const isDragged = draggedImageIndex === idx;
                  const isDragOver = dragOverImageIndex === idx;

                  return (
                    <div
                      key={item.id || `img-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`group relative bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden flex flex-col justify-between transition-all select-none shadow-xs ${
                        isPrimary
                          ? 'border-2 border-[#ff6452] ring-2 ring-rose-500/10'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                      } ${isDragged ? 'opacity-30 scale-95' : ''} ${
                        isDragOver ? 'border-dashed border-[#ff6452] bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Top Header Card Info: Primary Badge + Order Index + Delete Button + Drag Grip */}
                      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1">
                          {isPrimary ? (
                            <span className="bg-[#ff6452] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" /> Primary
                            </span>
                          ) : (
                            <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                              #{idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Top Action Buttons (Delete + Drag) */}
                        <div className="flex items-center gap-1 pointer-events-auto">
                          {/* Quick Delete Icon Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptDeleteImage(idx);
                            }}
                            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-90 text-white backdrop-blur-xs transition-all cursor-pointer shadow-md hover:scale-105"
                            title="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Drag Grip Handle */}
                          <div className="p-1 rounded-lg bg-black/50 text-white backdrop-blur-xs cursor-grab active:cursor-grabbing hover:bg-black/70">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Image Thumbnail Preview */}
                      <div className="relative w-full aspect-square bg-gray-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center">
                        <img
                          src={item.url}
                          alt={item.altText || `${productName || 'Product'} image ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=400&q=80';
                          }}
                        />

                        {/* Quick Hover Controls Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-auto">
                          {/* Top Row inside hover: Move arrows */}
                          <div className="flex items-center justify-between gap-1 pt-6">
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, 'left')}
                                  className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-xs transition-transform active:scale-90 cursor-pointer shadow-xs"
                                  title="Move left"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {idx < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, 'right')}
                                  className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-xs transition-transform active:scale-90 cursor-pointer shadow-xs"
                                  title="Move right"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Set Primary Button */}
                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                title="Set as primary product photo"
                              >
                                <Star className="w-3 h-3 fill-white" />
                                <span>Set Primary</span>
                              </button>
                            )}
                          </div>

                          {/* Bottom Row inside hover: Individual Replace & Delete */}
                          <div className="flex items-center gap-1.5 justify-between">
                            <button
                              type="button"
                              onClick={() => handleTriggerReplaceImage(idx)}
                              className="flex-1 py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Replace ONLY this image"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Replace</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteImage(idx)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                              title="Delete ONLY this image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Alt Text snippet & Quick edit button */}
                      <div className="p-2.5 bg-gray-50/90 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-700 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 dark:text-slate-400 font-bold uppercase text-[9px]">
                            Alt Text:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAltIndex(idx);
                              setTempAltText(item.altText || '');
                            }}
                            className="text-[10px] font-bold text-[#ff6452] hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Edit Alt</span>
                          </button>
                        </div>
                        <p className="text-gray-700 dark:text-slate-300 font-medium truncate" title={item.altText || 'Default alt text'}>
                          {item.altText || `${productName || 'Product'} (Photo ${idx + 1})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                No product images added yet
              </p>
              <p className="text-[11px] text-gray-400">
                Upload photos or paste direct image URLs above.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. DEDICATED PRODUCT VIDEOS SECTION */}
      {/* ============================================================ */}
      {activeMediaTab === 'videos' && (
        <div className="space-y-6">
          {/* Upload or Link Video Box */}
          <div className="p-6 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white dark:from-purple-950/30 dark:via-slate-800 dark:to-slate-800/80 rounded-3xl border border-purple-200/80 dark:border-purple-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-purple-950 dark:text-purple-200">
                    Product Video Showcase
                  </h4>
                  <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                    Add high-converting video demonstrations (MP4, WebM, or YouTube embed)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => singleVideoInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Video File</span>
              </button>
            </div>

            {/* Video URL Adder */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
              <input
                type="url"
                placeholder="Paste video URL (e.g. https://youtube.com/watch?v=... or https://example.com/demo.mp4)"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                className="sm:col-span-7 px-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/80 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-purple-600"
              />
              <input
                type="text"
                placeholder="Video Title (e.g. Unboxing &amp; Demo)"
                value={videoTitleInput}
                onChange={(e) => setVideoTitleInput(e.target.value)}
                className="sm:col-span-3 px-3.5 py-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/80 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-purple-600"
              />
              <button
                type="button"
                onClick={handleAddVideoUrl}
                disabled={!videoUrlInput.trim()}
                className="sm:col-span-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 cursor-pointer text-center"
              >
                Add Video
              </button>
            </div>
          </div>

          {/* Videos Grid */}
          {videos.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Configured Product Videos ({videos.length})
                </span>
                <span className="text-[11px] text-gray-400">
                  Click preview to play video
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {videos.map((vid, vIdx) => {
                  const isPrimary = vid.isPrimary || vIdx === 0;

                  return (
                    <div
                      key={vid.id || `vid-${vIdx}`}
                      draggable
                      onDragStart={(e) => handleVideoDragStart(e, vIdx)}
                      onDragOver={(e) => handleVideoDragOver(e, vIdx)}
                      onDrop={(e) => handleVideoDrop(e, vIdx)}
                      className={`bg-white dark:bg-slate-800 rounded-2xl border p-3.5 space-y-3 relative overflow-hidden transition-all ${
                        isPrimary
                          ? 'border-2 border-purple-600 ring-2 ring-purple-500/10'
                          : 'border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isPrimary ? (
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-full shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-white" /> Primary Video
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-[10px] font-bold rounded-full">
                              Video #{vIdx + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryVideo(vIdx)}
                              className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromptDeleteVideo(vIdx);
                            }}
                            className="p-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Delete video"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Video Player Box / Thumbnail */}
                      <div
                        onClick={() => setPlayingVideoUrl(vid.url)}
                        className="relative w-full h-36 bg-black rounded-xl overflow-hidden cursor-pointer group flex items-center justify-center"
                      >
                        {vid.url.includes('youtube.com') || vid.url.includes('youtu.be') ? (
                          <div className="text-center p-4 text-white">
                            <Video className="w-8 h-8 text-rose-500 mx-auto mb-1" />
                            <span className="text-xs font-bold">YouTube Video</span>
                          </div>
                        ) : (
                          <video
                            src={vid.url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        )}

                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 ml-0.5 fill-current" />
                          </div>
                        </div>
                      </div>

                      {/* Video Details */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {vid.title || `Product Video ${vIdx + 1}`}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                          {vid.sizeBytes ? <span>Size: {formatFileSize(vid.sizeBytes)}</span> : null}
                          <span className="truncate font-mono">{vid.url}</span>
                        </div>
                      </div>

                      {/* Actions: Replace ONLY this video & Delete ONLY this video */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleTriggerReplaceVideo(vIdx)}
                          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Replace only this video file"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Replace</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePromptDeleteVideo(vIdx)}
                          className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Delete only this video"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 space-y-2">
              <Film className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                No product videos configured
              </p>
              <p className="text-[11px] text-gray-400">
                Videos are optional, but significantly boost shopper engagement &amp; conversion!
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ALT TEXT EDITOR MODAL */}
      {/* ============================================================ */}
      {editingAltIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ff6452]" />
                <h3 className="text-sm font-black text-gray-900 dark:text-white">
                  Edit Image SEO Alt Text (#{editingAltIndex + 1})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAltIndex(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-20 h-20 mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
              <img
                src={images[editingAltIndex]?.url}
                alt="Editing Alt"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                Accessible Alt Text (Descriptive keyword for search engines):
              </label>
              <input
                type="text"
                value={tempAltText}
                onChange={(e) => setTempAltText(e.target.value)}
                placeholder={`e.g. ${productName || 'Product'} angled view`}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-hidden focus:border-[#ff6452]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingAltIndex(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 text-gray-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setImages((prev) =>
                    prev.map((img, i) =>
                      i === editingAltIndex ? { ...img, altText: tempAltText.trim() } : img
                    )
                  );
                  setEditingAltIndex(null);
                }}
                className="px-4 py-2 bg-[#ff6452] hover:bg-[#e05342] text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                Save Alt Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIDEO PLAYER PREVIEW MODAL */}
      {/* ============================================================ */}
      {playingVideoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPlayingVideoUrl(null)}
        >
          <div
            className="bg-black rounded-3xl overflow-hidden max-w-3xl w-full relative shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="aspect-video w-full flex items-center justify-center bg-black">
              {playingVideoUrl.includes('youtube.com') || playingVideoUrl.includes('youtu.be') ? (
                <iframe
                  src={playingVideoUrl.replace('watch?v=', 'embed/')}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <video
                  src={playingVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalState && (
        <DeleteMediaConfirmModal
          isOpen={deleteModalState.isOpen}
          mediaType={deleteModalState.mediaType}
          thumbnailUrl={deleteModalState.url}
          isDeleting={isExecutingDelete}
          onClose={() => setDeleteModalState(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
