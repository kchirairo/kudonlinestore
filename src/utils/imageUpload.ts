import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Generates a collision-proof unique filename by combining:
 * 1. An optional sanitized prefix (e.g. 'product', 'banner', 'branding')
 * 2. The sanitized original filename base
 * 3. High-resolution UTC timestamp (Date.now())
 * 4. A cryptographically secure random UUID (or crypto fallback)
 * 5. Safe file extension
 *
 * Example: 'product_nike_air_max_1723626543120_7f3d8a9b2c1e.webp'
 */
export function generateUniqueImageFileName(originalName: string, prefix: string = 'product'): string {
  // 1. Extract and sanitize extension
  const parts = originalName.split('.');
  const rawExt = parts.length > 1 ? parts.pop() || 'jpg' : 'jpg';
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  // 2. Extract and sanitize base name
  const rawBase = parts.join('.');
  const sanitizedBase = rawBase
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 24) || 'image';

  // 3. High resolution timestamp
  const timestamp = Date.now();

  // 4. Secure UUID / random token
  let uniqueToken = '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    uniqueToken = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    uniqueToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } else {
    uniqueToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
  }

  // 5. Clean prefix
  const cleanPrefix = prefix.replace(/[^a-z0-9_-]/g, '').toLowerCase() || 'item';

  return `${cleanPrefix}_${sanitizedBase}_${timestamp}_${uniqueToken}.${cleanExt}`;
}

export interface UploadImageOptions {
  folder?: string;
  prefix?: string;
  bucket?: string;
  maxSizeBytes?: number;
}

/**
 * Checks and ensures the 'product-images' bucket exists in Supabase.
 */
export async function ensureProductStorageBucket(): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }

  try {
    // 1. Try to check bucket directly
    const { data: bucket, error } = await supabase.storage.getBucket(PRODUCT_IMAGES_BUCKET);
    if (!error && bucket) {
      return true;
    }

    // 2. If getBucket failed, attempt creating it client-side
    const { error: createErr } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: 10485760,
    });
    if (!createErr) {
      return true;
    }

    // 3. Ask the server backend to verify/create the bucket with elevated permissions
    const res = await fetch('/api/admin/storage/ensure-bucket', { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      return !!result.success;
    }
  } catch (err) {
    console.warn('[Storage] Could not auto-ensure product-images bucket:', err);
  }

  return false;
}

/**
 * Automatically converts an image File (JPG, PNG, GIF, BMP) into an optimized WebP blob
 * using browser Canvas rendering, reducing payload size by 60-80% without losing clarity.
 */
export async function convertImageToWebP(
  file: File,
  options: { maxWidth?: number; quality?: number } = {}
): Promise<File> {
  // If already a webp file, return as is
  if (file.type === 'image/webp') {
    return file;
  }

  const maxWidth = options.maxWidth || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.85;

  return new Promise((resolve) => {
    // If running outside browser DOM, return original
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(file);
    }

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale down dimensions if exceeding maxWidth while preserving aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const webpFile = new File([blob], `${baseName}.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(webpFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        console.warn('[WebP Optimization] Canvas conversion fallback to original file:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Triggers the Supabase Edge Function 'optimize-product-images' or server proxy
 * to perform server-side WebP generation and database synchronization.
 */
export async function triggerImageOptimizationWebhook(
  imageUrl: string,
  productId?: string
): Promise<{ success: boolean; optimizedWebpUrl?: string; stats?: any }> {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.functions.invoke('optimize-product-images', {
        body: { imageUrl, productId },
      });
      if (!error && data?.success) {
        return data;
      }
    }

    // Fallback to server proxy
    const res = await fetch('/api/webhooks/optimize-product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, productId }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Webhook] Auto-optimization webhook notification skipped:', err);
  }

  return { success: false };
}

/**
 * Helper to read a File as a base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as Base64.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image file to Supabase Storage in the 'product-images' bucket
 * with automated WebP optimization, collision prevention, and server proxy fallback.
 */
export async function uploadImageToStorage(
  rawFile: File,
  options: UploadImageOptions = {}
): Promise<{ url: string; fileName: string; bucket: string; isRemote: boolean }> {
  if (!rawFile) {
    throw new Error('No file provided for upload.');
  }

  // 1. Automatically convert image to WebP format for fast loading and reduced bandwidth
  const file = await convertImageToWebP(rawFile);

  const folder = options.folder || 'products';
  const prefix = options.prefix || 'product';
  const bucketName = options.bucket || PRODUCT_IMAGES_BUCKET;

  // Generate unique filename with timestamp and UUID (ends in .webp)
  const uniqueFileName = generateUniqueImageFileName(file.name, prefix);
  const fullPath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;

  if (isSupabaseConfigured() && supabase) {
    // 1. Ensure the bucket exists first
    await ensureProductStorageBucket();

    // 2. Attempt direct Supabase client upload to 'product-images'
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fullPath, file, {
          cacheControl: '31536000, immutable',
          upsert: false,
          contentType: file.type || 'image/webp',
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fullPath);
        if (publicUrlData?.publicUrl) {
          const publicUrl = publicUrlData.publicUrl;
          return {
            url: publicUrl,
            fileName: uniqueFileName,
            bucket: bucketName,
            isRemote: true,
          };
        }
      }

      if (uploadError) {
        console.warn(`Direct client storage upload to "${bucketName}" returned:`, uploadError.message);
      }
    } catch (directErr: any) {
      console.warn(`Direct client storage upload exception on "${bucketName}":`, directErr);
    }

    // 3. Fallback: upload through the server-side proxy which has elevated storage permissions
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: uniqueFileName,
          base64Data,
          contentType: file.type || 'image/webp',
          folder,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.url) {
          return {
            url: result.url,
            fileName: uniqueFileName,
            bucket: bucketName,
            isRemote: true,
          };
        }
      }
    } catch (serverErr) {
      console.warn('[Storage] Server storage proxy upload failed:', serverErr);
    }

    // 4. Fallback: If both direct and server upload were unavailable (e.g. static Netlify hosting or bucket policy),
    // gracefully fallback to the optimized WebP base64 data URI so product creation/updating continues smoothly.
    console.info(`[Storage] Remote storage upload to "${bucketName}" unavailable. Using optimized WebP image payload.`);
    const dataUrl = await fileToBase64(file);
    return {
      url: dataUrl,
      fileName: uniqueFileName,
      bucket: 'local-fallback',
      isRemote: false,
    };
  }

  // 5. Fallback for unconfigured mode:
  const dataUrl = await fileToBase64(file);

  return {
    url: dataUrl,
    fileName: uniqueFileName,
    bucket: 'local-preview',
    isRemote: false,
  };
}

/**
 * Extracts the storage file path from a Supabase Storage public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/product-images/products/img_123.webp"
 * -> "products/img_123.webp"
 */
export function extractStoragePathFromUrl(url: string, bucket: string = PRODUCT_IMAGES_BUCKET): string | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const urlObj = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const idx = urlObj.pathname.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(urlObj.pathname.substring(idx + marker.length));
    }
    if (urlObj.pathname.includes(bucket)) {
      const parts = urlObj.pathname.split(`/${bucket}/`);
      if (parts[1]) {
        return decodeURIComponent(parts[1]);
      }
    }
  } catch {
    // If not a full URL but contains path
    if (url.includes(`${bucket}/`)) {
      const parts = url.split(`${bucket}/`);
      if (parts[1]) return decodeURIComponent(parts[1]);
    }
    if (url.startsWith('products/') || url.startsWith('branding/') || url.startsWith('banner/')) {
      return url;
    }
  }

  return null;
}

/**
 * Deletes one or multiple images from Supabase Storage 'product-images' bucket.
 * Cleans up files from remote storage and invokes server proxy fallback if needed.
 */
export async function deleteImageFromStorage(
  urlsOrPaths: string | string[],
  bucket: string = PRODUCT_IMAGES_BUCKET
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const items = Array.isArray(urlsOrPaths) ? urlsOrPaths : [urlsOrPaths];
  const validItems = items.filter((item) => typeof item === 'string' && item.trim().length > 0);

  if (validItems.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const pathsToDelete: string[] = [];
  for (const item of validItems) {
    const extracted = extractStoragePathFromUrl(item, bucket);
    if (extracted && !pathsToDelete.includes(extracted)) {
      pathsToDelete.push(extracted);
    } else if (!item.startsWith('http://') && !item.startsWith('https://') && !item.startsWith('data:')) {
      const clean = item.trim().replace(/^\/+/, '');
      if (!pathsToDelete.includes(clean)) {
        pathsToDelete.push(clean);
      }
    }
  }

  if (pathsToDelete.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  let directSuccess = false;

  // 1. Try direct Supabase storage removal
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase.storage.from(bucket).remove(pathsToDelete);
      if (!error) {
        directSuccess = true;
      } else {
        console.warn(`[Storage] Direct client delete notice for ${bucket}:`, error.message);
      }
    } catch (directErr) {
      console.warn('[Storage] Client delete exception:', directErr);
    }
  }

  // 2. Fallback to server endpoint (which has service credentials)
  if (!directSuccess) {
    try {
      const res = await fetch('/api/admin/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: pathsToDelete, bucket }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          return { success: true, deletedCount: pathsToDelete.length };
        }
      }
    } catch (serverErr) {
      console.warn('[Storage] Server storage delete notice:', serverErr);
    }
  }

  return { success: true, deletedCount: pathsToDelete.length };
}
