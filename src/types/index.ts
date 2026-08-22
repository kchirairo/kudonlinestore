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

export type PaymentGatewayMode = 'test' | 'sandbox' | 'live';

export interface PaymentGatewayItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  mode: PaymentGatewayMode;
  configured: boolean;
  publicKey?: string;
  clientId?: string;
  merchantId?: string;
  siteCode?: string;
  entityId?: string;
  webhookUrl?: string;
  metadata?: Record<string, any>;
  lastUpdated?: string;
}

export interface PaymentGatewaysMap {
  yoco?: PaymentGatewayItem;
  card?: PaymentGatewayItem;
  cod?: PaymentGatewayItem;
  paypal?: PaymentGatewayItem;
  payfast?: PaymentGatewayItem;
  ozow?: PaymentGatewayItem;
  peach_payments?: PaymentGatewayItem;
  [key: string]: PaymentGatewayItem | undefined;
}

export interface SettingsData {
  payment_gateways?: PaymentGatewaysMap;
  store_branding?: StoreBrandingConfig;
  banner_config?: PromoBannerConfig;
  coupons_config?: CouponsConfig;
  general_settings?: GeneralStoreSettings;
  [key: string]: any;
}

export interface SettingsTableRow {
  id: string;
  store_name?: string | null;
  currency_symbol?: string | null;
  store_description?: string | null;
  delivery_fee?: number | null;
  free_shipping_threshold?: number | null;
  support_email?: string | null;
  support_phone?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  settings_data: SettingsData | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaymentGatewayConfig {
  activeProvider?: 'yoco' | 'card' | 'cod' | 'paypal' | 'payfast' | 'ozow' | 'peach_payments' | 'all' | string;
  yoco?: {
    enabled: boolean;
    mode: 'test' | 'live';
    publicKey?: string;
    secretKey?: string;
    integrationMethod?: 'sdk' | 'hosted' | 'hybrid';
    enable3DS?: boolean;
    configured?: boolean;
  };
  card?: {
    enabled: boolean;
    mode: 'test' | 'live';
    publicKey?: string;
    configured?: boolean;
  };
  cod?: {
    enabled: boolean;
    instructions?: string;
    configured?: boolean;
  };
  paypal?: {
    enabled: boolean;
    mode: 'sandbox' | 'live';
    clientId?: string;
    configured?: boolean;
  };
  payfast?: {
    enabled: boolean;
    mode: 'sandbox' | 'live' | 'test';
    merchantId?: string;
    merchantKey?: string;
    passphrase?: string;
    configured?: boolean;
  };
  ozow?: {
    enabled: boolean;
    mode?: 'sandbox' | 'live';
    siteCode?: string;
    privateKey?: string;
    configured?: boolean;
  };
  peach_payments?: {
    enabled: boolean;
    mode: 'test' | 'live';
    entityId?: string;
    configured?: boolean;
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

export type CouponDiscountType = 'percentage' | 'fixed' | 'free_shipping';

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number; // percentage (e.g. 10) or fixed amount (e.g. 50)
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  isActive: boolean;
  expiryDate?: string;
  usageLimit?: number;
  usageCount?: number;
  applicableCategory?: ProductCategory | 'All';
  createdAt: string;
}

export interface CouponsConfig {
  coupons: Coupon[];
  allowStacking?: boolean;
  lastUpdated?: string;
}

export interface GeneralStoreSettings {
  storeName: string;
  currency: string;
  deliveryFee: number;
  expressDeliveryFee?: number;
  freeDeliveryThreshold: number;
  enableFreeDeliveryThreshold?: boolean;
  estimatedStandardDays?: string;
  estimatedExpressDays?: string;
  shippingNotes?: string;
  contactEmail: string;
  contactPhone: string;
  storeDescription: string;
  lastUpdated?: string;
}

export type GatewayHealthStatus = 'healthy' | 'warning' | 'unreachable' | 'not_configured' | 'checking';

export interface GatewayHealthItem {
  gatewayId: string;
  gatewayName?: string;
  status: GatewayHealthStatus;
  reachable: boolean;
  credentialsValid: boolean;
  latencyMs?: number;
  message: string;
  checkedAt: string;
  httpStatus?: number;
  environmentMode?: 'test' | 'live' | 'sandbox' | string;
  endpointUrl?: string;
}

export interface GatewayHealthCheckReport {
  success: boolean;
  timestamp: string;
  totalChecked: number;
  healthyCount: number;
  warningCount: number;
  unreachableCount: number;
  results: Record<string, GatewayHealthItem>;
}

