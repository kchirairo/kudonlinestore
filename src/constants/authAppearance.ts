import { AuthAppearanceConfig, AuthBackgroundImage, CinematicPreset } from '../types';

export const DEFAULT_AUTH_BACKGROUND_IMAGES: AuthBackgroundImage[] = [
  {
    id: 'auth-bg-1',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80',
    title: 'Minimalist Boutique & Lifestyle',
    altText: 'Modern curated retail showcase',
    isActive: true,
    order: 0,
    is_default: true,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'auth-bg-2',
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1920&q=80',
    title: 'Urban Marketplace Storefront',
    altText: 'Warm boutique interior showcase',
    isActive: true,
    order: 1,
    is_default: false,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'auth-bg-3',
    url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1920&q=80',
    title: 'Curated Essentials & Electronics',
    altText: 'Premium merchandise display',
    isActive: true,
    order: 2,
    is_default: false,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'auth-bg-4',
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1920&q=80',
    title: 'Modern South African Retail',
    altText: 'Dynamic fashion and shopping lifestyle',
    isActive: true,
    order: 3,
    is_default: false,
    uploadedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_CINEMATIC_PRESETS: CinematicPreset[] = [
  {
    id: 'cinematic-luxury',
    name: 'Cinematic Boutique',
    description: 'Ken Burns subtle zoom, dark soft vignette, and frosted glass card',
    previewUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
    isVisibleOnFrontend: true,
    config: {
      animation_type: 'ken-burns',
      transitionEffect: 'zoom-fade',
      image_display_duration: 6,
      rotationIntervalSeconds: 6,
      transition_duration: 1.2,
      transitionDurationMs: 1200,
      zoom_intensity: 1.08,
      pan_enabled: true,
      animation_enabled: true,
      enableMotion: true,
      overlay_opacity: 0.5,
      overlayDarkness: 50,
      overlayBlur: 1,
      overlayGradient: 'soft',
      cardBlur: 'xl',
      card_opacity: 0.82,
      cardOpacity: 82,
      card_border_radius: 24,
      card_position: 'center',
      cardBorderIntensity: 'subtle',
      login_title: 'Welcome to KUD Store',
      login_subtitle: 'Discover premium lifestyle essentials, electronics, and exclusive South African marketplace deals.',
      signup_title: 'Create Your Account',
      signup_subtitle: 'Join South Africa’s premier marketplace for lifestyle & electronics.',
    },
  },
  {
    id: 'golden-lifestyle',
    name: 'Warm African Sunset',
    description: 'Slow horizontal glide, warm atmospheric radial overlay, and gentle blur',
    previewUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    isVisibleOnFrontend: true,
    config: {
      animation_type: 'pan',
      transitionEffect: 'pan',
      image_display_duration: 7,
      rotationIntervalSeconds: 7,
      transition_duration: 1.5,
      transitionDurationMs: 1500,
      zoom_intensity: 1.05,
      pan_enabled: true,
      animation_enabled: true,
      enableMotion: true,
      overlay_opacity: 0.45,
      overlayDarkness: 45,
      overlayBlur: 0,
      overlayGradient: 'radial',
      cardBlur: 'lg',
      card_opacity: 0.78,
      cardOpacity: 78,
      card_border_radius: 28,
      card_position: 'center',
      cardBorderIntensity: 'high',
      login_title: 'Welcome to the Family',
      login_subtitle: 'Access your curated wishlists, reward credits, and member pricing.',
      signup_title: 'Unlock Exclusive Perks',
      signup_subtitle: 'Create an account to track delivery status and earn referral commissions.',
    },
  },
  {
    id: 'urban-modern',
    name: 'Urban Minimalism',
    description: 'Clean smooth crossfades, deep contrast vignette, and high-opacity glass',
    previewUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80',
    isVisibleOnFrontend: true,
    config: {
      animation_type: 'fade',
      transitionEffect: 'fade',
      image_display_duration: 8,
      rotationIntervalSeconds: 8,
      transition_duration: 1.0,
      transitionDurationMs: 1000,
      zoom_intensity: 1.0,
      pan_enabled: false,
      animation_enabled: true,
      enableMotion: true,
      overlay_opacity: 0.6,
      overlayDarkness: 60,
      overlayBlur: 2,
      overlayGradient: 'dark',
      cardBlur: '2xl',
      card_opacity: 0.9,
      cardOpacity: 90,
      card_border_radius: 20,
      card_position: 'center',
      cardBorderIntensity: 'medium',
      login_title: 'Sign In to Your Account',
      login_subtitle: 'Welcome back! Please enter your details to access your account and orders.',
      signup_title: 'Get Started with KUD',
      signup_subtitle: 'Experience seamless shopping and rapid nationwide door-to-door delivery.',
    },
  },
  {
    id: 'minimal-noir',
    name: 'Midnight Noir',
    description: 'Deep frosted dark mode glass with subtle border illumination and high contrast',
    previewUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=600&q=80',
    isVisibleOnFrontend: false,
    config: {
      animation_type: 'slide',
      transitionEffect: 'slide',
      image_display_duration: 5,
      rotationIntervalSeconds: 5,
      transition_duration: 0.9,
      transitionDurationMs: 900,
      zoom_intensity: 1.0,
      pan_enabled: false,
      animation_enabled: true,
      enableMotion: true,
      overlay_opacity: 0.65,
      overlayDarkness: 65,
      overlayBlur: 0,
      overlayGradient: 'vignette',
      cardBlur: 'xl',
      card_opacity: 0.88,
      cardOpacity: 88,
      card_border_radius: 16,
      card_position: 'left',
      cardBorderIntensity: 'high',
      login_title: 'Marketplace Sign In',
      login_subtitle: 'Fast, secure checkout and verified authentication.',
      signup_title: 'Join KUD Marketplace',
      signup_subtitle: 'Create an account in less than a minute.',
    },
  },
];

export const DEFAULT_AUTH_APPEARANCE: AuthAppearanceConfig = {
  enabled: true,
  images: DEFAULT_AUTH_BACKGROUND_IMAGES,
  
  // Animation settings
  rotationIntervalSeconds: 6,
  transitionEffect: 'zoom-fade',
  transitionDurationMs: 1200,
  enableMotion: true,
  
  // Page customization
  welcomeHeadline: 'Welcome to KUD Store',
  welcomeSubtext: 'Discover premium lifestyle essentials, electronics, and exclusive South African marketplace deals.',
  overlayDarkness: 50, // 50% darkness
  overlayBlur: 1, // 1px subtle soft blur
  overlayGradient: 'soft',
  
  // Glassmorphism card styling
  cardBlur: 'xl',
  cardOpacity: 82, // 82% background opacity
  cardBorderIntensity: 'subtle',
  
  // Branding display
  showLogoBadge: true,
  showFeaturesPill: true,

  // Active preset tracking
  active_preset_id: 'cinematic-luxury',
  active_preset_name: 'Cinematic Boutique',
  show_preset_name_on_frontend: true,
  
  lastUpdated: new Date().toISOString(),
};

export const AUTH_APPEARANCE_STORAGE_KEY = 'kud_store_auth_appearance_config';
export const AUTH_PRESETS_STORAGE_KEY = 'kud_store_cinematic_presets';

export function getCinematicPresets(): CinematicPreset[] {
  if (typeof window === 'undefined') return DEFAULT_CINEMATIC_PRESETS;
  try {
    const raw = localStorage.getItem(AUTH_PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_CINEMATIC_PRESETS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CINEMATIC_PRESETS;

    return DEFAULT_CINEMATIC_PRESETS.map((def) => {
      const match = parsed.find((p: any) => p.id === def.id);
      if (match) {
        return {
          ...def,
          ...match,
          isVisibleOnFrontend:
            match.isVisibleOnFrontend !== undefined ? match.isVisibleOnFrontend : def.isVisibleOnFrontend,
          config: { ...def.config, ...(match.config || {}) },
        };
      }
      return def;
    });
  } catch (e) {
    return DEFAULT_CINEMATIC_PRESETS;
  }
}

export function saveCinematicPresets(presets: CinematicPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_PRESETS_STORAGE_KEY, JSON.stringify(presets));
    window.dispatchEvent(new CustomEvent('kud_auth_presets_updated', { detail: presets }));
  } catch (e) {
    console.error('Failed to save cinematic presets:', e);
  }
}

