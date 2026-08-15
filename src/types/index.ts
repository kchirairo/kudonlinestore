export type ProductCategory = 
  | 'Beauty'
  | 'Home'
  | 'Sports & Leisure'
  | 'Technology'
  | 'Books'
  | 'Others';

export type ProductCondition = 'Brand New' | 'Like New' | 'Refurbished' | 'Vintage' | 'Good';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  category: ProductCategory;
  sizeOrVariant?: string;
  condition?: ProductCondition;
  description: string;
  images: string[];
  inStock: boolean;
  stock?: number;
  sku?: string;
  isFeatured?: boolean;
  isNewAdded?: boolean;
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSizeOrVariant?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'unpaid'
  | 'partially_refunded'
  | 'cancelled'
  | 'Pending'
  | 'Paid'
  | 'Failed'
  | 'Refunded'
  | 'Unpaid'
  | 'Partially Refunded';

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  product_brand: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant?: string;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface Order {
  id: string;
  order_number?: string;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  created_at: string;
  total_amount: number;
  subtotal_amount: number;
  delivery_fee: number;
  discount_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'customer' | 'admin';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
}

export interface Customer {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role: 'customer' | 'admin';
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface AdminStats {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  totalCustomers: number;
  activeProducts: number;
}

export interface SalesDataPoint {
  date: string;
  sales: number;
  ordersCount: number;
}

export interface FilterOptions {
  category?: ProductCategory | 'All';
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition | 'All';
  inStockOnly?: boolean;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
}

export interface PaymentGatewayConfig {
  activeProvider: 'yoco' | 'payfast' | 'ozow' | 'all';
  yoco: {
    enabled: boolean;
    mode: 'test' | 'live';
    publicKey: string;
    secretKey: string;
    integrationMethod: 'sdk' | 'hosted' | 'hybrid';
    enable3DS: boolean;
  };
  payfast: {
    enabled: boolean;
    mode: 'test' | 'live';
    merchantId: string;
    merchantKey: string;
    passphrase: string;
  };
  ozow: {
    enabled: boolean;
    siteCode: string;
    privateKey: string;
  };
  cod: {
    enabled: boolean;
    instructions: string;
  };
  lastUpdated?: string;
}

export interface StoreBrandingConfig {
  storeName: string;
  tagline: string;
  logoType: 'badge' | 'image' | 'both';
  logoText: string;
  logoImageUrl?: string;
  logoHeight?: number;
  accentColor?: string;
  showTagline: boolean;
  lastUpdated?: string;
}

export interface PromoBannerSlide {
  id: string;
  headline: string;
  subtext: string;
  badgeText?: string;
  mediaType: 'image' | 'video' | 'none';
  mediaUrl: string;
  mediaAltText?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundColor?: string;
  overlayPosition?: 'left' | 'center' | 'right' | 'bottom-left' | 'top-left';
  overlayDimming?: number;
}

export interface PromoBannerConfig {
  enabled: boolean;
  layout: 'compact' | 'hero' | 'split' | 'video-focus' | 'slides';
  headline: string;
  subtext: string;
  badgeText: string;
  showBadge: boolean;
  ctaText: string;
  ctaLink: string;
  showCta: boolean;
  mediaType: 'none' | 'image' | 'video';
  mediaUrl: string;
  mediaPosterUrl?: string;
  mediaAltText?: string;
  videoAutoplay: boolean;
  videoMuted: boolean;
  videoLoop: boolean;
  videoControls: boolean;
  backgroundColor: string;
  textColor: 'dark' | 'light';
  accentBadgeColor?: string;
  // Text Overlay Specific Customizations
  overlayPosition?: 'left' | 'center' | 'right' | 'bottom-left' | 'top-left';
  overlayDimming?: number; // 0 to 100 opacity percentage
  overlayBackgroundStyle?: 'gradient' | 'glass' | 'solid' | 'subtle' | 'none';
  bannerHeight?: number; // custom pixel height for hero / showcase layouts
  textAlignment?: 'left' | 'center' | 'right';
  titleFontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  customOverlayColor?: string;
  slides?: PromoBannerSlide[];
  lastUpdated?: string;
}

