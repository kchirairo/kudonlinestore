import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fileToBase64, generateUniqueImageFileName } from './imageUpload';

export const CUSTOMER_CUSTOMIZATIONS_BUCKET = 'customer-customizations';
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export interface UploadValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an image file before upload:
 * - Must be an image file
 * - Supported extensions: .jpg, .jpeg, .png, .webp
 * - Max size: 10 MB
 */
export function validateCustomizationFile(file: File): UploadValidationResult {
  if (!file) {
    return { isValid: false, error: 'Please choose an image file to upload.' };
  }

  // 1. Check MIME type
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!ALLOWED_MIME_TYPES.includes(mime) && !hasValidExt) {
    return {
      isValid: false,
      error: `Unsupported file type "${file.name}". Please upload an image file in JPG, JPEG, PNG, or WEBP format.`,
    };
  }

  // 2. Check file size (10 MB max)
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed upload size is 10 MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Uploads customer's custom design/logo to secure cloud storage.
 * Tries direct storage upload first, and falls back to server proxy /api/customizations/upload.
 */
export async function uploadCustomerDesign(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string; sizeBytes: number }> {
  const validation = validateCustomizationFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file.');
  }

  onProgress?.(15);

  const cleanName = generateUniqueImageFileName(file.name, 'custom_design');
  const folder = 'customer-designs';
  const fullPath = `${folder}/${cleanName}`;

  // 1. Direct Supabase Storage attempt
  if (isSupabaseConfigured() && supabase) {
    try {
      onProgress?.(40);
      const { data, error } = await supabase.storage
        .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/png',
        });

      if (!error && data) {
        onProgress?.(90);
        const { data: urlData } = supabase.storage
          .from(CUSTOMER_CUSTOMIZATIONS_BUCKET)
          .getPublicUrl(fullPath);

        if (urlData?.publicUrl) {
          onProgress?.(100);
          return {
            url: urlData.publicUrl,
            fileName: file.name,
            sizeBytes: file.size,
          };
        }
      }
    } catch (directErr: any) {
      console.warn('[CustomizationUpload] Direct client upload skipped to proxy fallback:', directErr?.message);
    }
  }

  // 2. Server proxy fallback via /api/customizations/upload
  onProgress?.(50);
  const base64Data = await fileToBase64(file);
  onProgress?.(70);

  const response = await fetch('/api/customizations/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: cleanName,
      originalName: file.name,
      base64Data,
      contentType: file.type || 'image/png',
      sizeBytes: file.size,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson?.error || 'Failed to upload your design. Please try again.');
  }

  const result = await response.json();
  onProgress?.(100);

  if (!result.success || !result.url) {
    throw new Error(result.error || 'Server could not complete upload.');
  }

  return {
    url: result.url,
    fileName: file.name,
    sizeBytes: file.size,
  };
}
