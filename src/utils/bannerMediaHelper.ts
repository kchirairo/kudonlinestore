import { PromotionalBannerItem, BannerStatusType, BannerBadgeType, BannerAspectRatio } from '../types';

/**
 * Aspect Ratio Presets configuration
 */
export interface AspectRatioPreset {
  id: BannerAspectRatio;
  label: string;
  name: string;
  sublabel: string;
  description: string;
  recommendedResolution: string;
  aspectClass: string;
  iconWidth: string;
  iconHeight: string;
  ratioValue: number;
}

export const BANNER_ASPECT_RATIOS: AspectRatioPreset[] = [
  {
    id: '1:1',
    label: '1:1',
    name: '1:1 Square',
    sublabel: 'Split showcase & balanced product focus',
    description: 'Split showcase & balanced product focus',
    recommendedResolution: '1080 × 1080 px',
    aspectClass: 'aspect-square',
    iconWidth: 'w-6',
    iconHeight: 'h-6',
    ratioValue: 1,
  },
  {
    id: '4:3',
    label: '4:3',
    name: '4:3 Standard',
    sublabel: 'Classic photo balance & catalog display',
    description: 'Classic photo balance & catalog display',
    recommendedResolution: '1440 × 1080 px',
    aspectClass: 'aspect-[4/3]',
    iconWidth: 'w-7',
    iconHeight: 'h-5',
    ratioValue: 4 / 3,
  },
  {
    id: '16:9',
    label: '16:9',
    name: '16:9 Widescreen',
    sublabel: 'Cinematic landscape & wide hero showcases',
    description: 'Cinematic landscape & wide hero showcases',
    recommendedResolution: '1920 × 1080 px',
    aspectClass: 'aspect-[16/9]',
    iconWidth: 'w-8',
    iconHeight: 'h-4.5',
    ratioValue: 16 / 9,
  },
];

export const BANNER_ASPECT_RATIOS_MAP: Record<string, AspectRatioPreset> = {
  '1:1': BANNER_ASPECT_RATIOS[0],
  '4:3': BANNER_ASPECT_RATIOS[1],
  '16:9': BANNER_ASPECT_RATIOS[2],
};

/**
 * Computes the real-time status of a promotional banner based on
 * its flags (isDraft, isEnabled) and start/end schedule dates.
 */
export function getBannerStatus(banner: PromotionalBannerItem): BannerStatusType {
  if (banner.isDraft) {
    return 'draft';
  }
  if (banner.isEnabled === false) {
    return 'disabled';
  }

  const now = new Date().getTime();

  if (banner.startDate) {
    const startTime = new Date(banner.startDate).getTime();
    if (!isNaN(startTime) && startTime > now) {
      return 'scheduled';
    }
  }

  if (banner.endDate) {
    const endTime = new Date(banner.endDate).getTime();
    if (!isNaN(endTime) && endTime < now) {
      return 'expired';
    }
  }

  return 'active';
}

/**
 * Checks if a banner is actively eligible to be displayed to customers on the storefront.
 */
export function isBannerActive(banner: PromotionalBannerItem): boolean {
  return getBannerStatus(banner) === 'active';
}

/**
 * Predefined badge color options with contrasting text
 */
export const BADGE_PRESETS: { type: BannerBadgeType; label: string; bg: string; text: string }[] = [
  { type: 'HOT DEAL', label: 'HOT DEAL 🔥', bg: '#ff6452', text: '#ffffff' },
  { type: 'SALE', label: 'MEGA SALE 🏷️', bg: '#ef4444', text: '#ffffff' },
  { type: 'NEW', label: 'NEW ARRIVAL ✨', bg: '#3b82f6', text: '#ffffff' },
  { type: 'LIMITED OFFER', label: 'LIMITED OFFER ⏳', bg: '#f59e0b', text: '#ffffff' },
  { type: 'EXCLUSIVE', label: 'EXCLUSIVE VIP 👑', bg: '#8b5cf6', text: '#ffffff' },
  { type: 'FLASH SALE', label: 'FLASH SALE ⚡', bg: '#ec4899', text: '#ffffff' },
  { type: 'DISCOUNT', label: 'SPECIAL DISCOUNT 🎁', bg: '#10b981', text: '#ffffff' },
  { type: 'CUSTOM', label: 'CUSTOM BADGE', bg: '#ff6452', text: '#ffffff' },
];

/**
 * Validates promotional media files (size & format).
 * Returns validation outcome and error message if any.
 */
export function validateBannerMediaFile(file: File): {
  isValid: boolean;
  mediaType: 'image' | 'video' | 'invalid';
  error?: string;
} {
  if (!file) {
    return { isValid: false, mediaType: 'invalid', error: 'No file selected.' };
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return {
      isValid: false,
      mediaType: 'invalid',
      error: 'Unsupported format. Please upload an image (JPG, PNG, WebP) or video (MP4, WebM).',
    };
  }

  // Size constraints: Images max 15MB, Videos max 60MB
  if (isImage && file.size > 15 * 1024 * 1024) {
    return {
      isValid: false,
      mediaType: 'image',
      error: 'Image file exceeds maximum 15MB limit.',
    };
  }

  if (isVideo && file.size > 60 * 1024 * 1024) {
    return {
      isValid: false,
      mediaType: 'video',
      error: 'Video file exceeds maximum 60MB limit. Consider compressing the video.',
    };
  }

  return {
    isValid: true,
    mediaType: isVideo ? 'video' : 'image',
  };
}

/**
 * Extracts a high-quality video poster / thumbnail frame from a video File or URL
 * by rendering a frame at ~0.5s to an HTML Canvas and exporting as a data URL.
 */
export async function extractVideoPosterFrame(videoFileOrUrl: File | string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('Browser DOM required for video frame extraction.'));
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const sourceUrl = typeof videoFileOrUrl === 'string'
      ? videoFileOrUrl
      : URL.createObjectURL(videoFileOrUrl);

    let isResolved = false;

    const cleanup = () => {
      if (typeof videoFileOrUrl !== 'string') {
        URL.revokeObjectURL(sourceUrl);
      }
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      // Seek to 0.5s or 10% of duration
      video.currentTime = Math.min(0.5, Math.max(0.1, video.duration * 0.1 || 0.5));
    };

    video.onseeked = () => {
      if (isResolved) return;
      try {
        const width = video.videoWidth || 1080;
        const height = video.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1080, width);
        canvas.height = Math.min(1080, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return resolve('');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.85);

        isResolved = true;
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        console.warn('[Video Poster] Frame capture failed:', err);
        cleanup();
        resolve('');
      }
    };

    video.onerror = () => {
      cleanup();
      resolve('');
    };

    // Timeout safety net (3 seconds)
    setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        resolve('');
      }
    }, 3000);

    video.src = sourceUrl;
  });
}

/**
 * Optimizes an uploaded promotional image to the specified aspect ratio resolution
 * (1:1 -> 1080x1080, 4:3 -> 1440x1080, 16:9 -> 1920x1080)
 * while preserving high fidelity and exporting as optimized WebP format.
 */
export async function optimizeBannerImage(
  file: File,
  aspectRatio: BannerAspectRatio = '1:1',
  quality: number = 0.88
): Promise<File> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve(file);
    }

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    // Compute target dimensions based on aspect ratio
    let targetWidth = 1080;
    let targetHeight = 1080;
    let ratioTag = '1x1';

    if (aspectRatio === '4:3') {
      targetWidth = 1440;
      targetHeight = 1080;
      ratioTag = '4x3';
    } else if (aspectRatio === '16:9') {
      targetWidth = 1920;
      targetHeight = 1080;
      ratioTag = '16x9';
    }

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        // Fill background with soft neutral
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Center and cover crop matching the target aspect ratio
        const targetRatio = targetWidth / targetHeight;
        const imgRatio = imgW / imgH;

        let cropW = imgW;
        let cropH = imgH;
        let sx = 0;
        let sy = 0;

        if (imgRatio > targetRatio) {
          // Source image is wider than target
          cropW = imgH * targetRatio;
          cropH = imgH;
          sx = (imgW - cropW) / 2;
          sy = 0;
        } else {
          // Source image is taller than target
          cropW = imgW;
          cropH = imgW / targetRatio;
          sx = 0;
          sy = (imgH - cropH) / 2;
        }

        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const optimizedFile = new File([blob], `${baseName}_${ratioTag}_${targetWidth}x${targetHeight}.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(optimizedFile);
            } else {
              resolve(file);
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        console.warn('[Banner Optimize] Fallback to original image:', err);
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
 * Calculates click-through rate (CTR %) safe from division by zero
 */
export function calculateCtr(clicks?: number, impressions?: number): number {
  const c = clicks || 0;
  const i = impressions || 0;
  if (i <= 0) return 0;
  return Number(((c / i) * 100).toFixed(1));
}

/**
 * Formats a remaining duration for countdown timer into { days, hours, minutes, seconds }
 */
export function calculateTimeRemaining(targetDateStr?: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  if (!targetDateStr) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const target = new Date(targetDateStr).getTime();
  if (isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}
