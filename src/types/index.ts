export type ProductCategory = 
  | 'Beauty'
  | 'Home'
  | 'Sports & Leisure'
  | 'Technology'
  | 'Books'
  | 'Others';

export type ProductCondition =
  | 'Brand New'
  | 'Used'
  | 'Like New'
  | 'Refurbished'
  | 'Renewed'
  | 'Vintage'
  | 'Good';

export type ProductPublishStatus = 'draft' | 'active' | 'scheduled' | 'archived';

export interface ProductVariantItem {
  id: string;
  title: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  attributes: Record<string, string>; // e.g. { Size: 'M', Color: 'Red' }
  imageUrl?: string;
  videoUrl?: string;
  isActive?: boolean;
}

export interface ProductMediaItem {
  id: string;
  productId?: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  title?: string;
  position: number;
  isPrimary: boolean;
  sizeBytes?: number;
  durationSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
  file?: File;
}

export interface ProductVideoItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  isPrimary?: boolean;
  file?: File;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  costPrice?: number;
  profitMargin?: number;
  category: ProductCategory;
  subCategory?: string;
  productType?: string;
  shortDescription?: string;
  tags?: string[];
  sizeOrVariant?: string;
  condition?: ProductCondition;
  description: string;
  images: string[];
  videos?: ProductVideoItem[];
  mediaItems?: ProductMediaItem[];
  variants?: ProductVariantItem[];
  categoryAttributes?: Record<string, any>;
  inStock: boolean;
  stock?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  allowBackorders?: boolean;
  sku?: string;
  weight?: number; // kg
  dimensions?: {
    length?: number; // cm
    width?: number; // cm
    height?: number; // cm
  };
  shippingClass?: string;
  isFreeShipping?: boolean;
  requiresShipping?: boolean;
  seoTitle?: string;
  metaDescription?: string;
  slug?: string;
  focusKeywords?: string[];
  imageAltTexts?: Record<string, string>;
  productStatus?: ProductPublishStatus;
  scheduledAt?: string;
  isFeatured?: boolean;
  isNewAdded?: boolean;
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt?: string;
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
  vat_amount?: number;
  amount_paid?: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  confirmation_email_sent?: boolean;
  confirmation_email_sent_at?: string;
  confirmation_email_error?: string;
  confirmation_email_resend_count?: number;
  confirmation_email_last_attempt_at?: string;
  yoco_checkout_id?: string;
  paid_at?: string;
}

export type CustomerAccountStatus = 'active' | 'on_hold' | 'disabled';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  addressLine?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  role?: 'customer' | 'admin';
  accountStatus?: CustomerAccountStatus;
  status?: CustomerAccountStatus;
  isDisabled?: boolean;
  is_disabled?: boolean;
  disabledReason?: string;
  disabled_reason?: string;
  disabledAt?: string;
  disabled_at?: string;
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
  accountStatus?: CustomerAccountStatus;
  status?: CustomerAccountStatus;
  isDisabled?: boolean;
  is_disabled?: boolean;
  disabledReason?: string;
  disabled_reason?: string;
  disabledAt?: string;
  disabled_at?: string;
  referralStatus?: 'active' | 'banned';
  isReferralBanned?: boolean;
  isEarningsFrozen?: boolean;
  earningsFrozenReason?: string;
  frozenAt?: string;
  referralCount?: number;
  referralBalance?: number;
  totalReferralEarned?: number;
  hideEarnings?: boolean;
  hideInvites?: boolean;
  hideReferralEarnings?: boolean;
  hideInviteOption?: boolean;
  hideReferralWallet?: boolean;
  referral_rewards_enabled?: boolean; // Per-customer activation for Referral Rewards & Wallet
  referralRewardsEnabled?: boolean;
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

export type InvoiceStatus = 'Pending' | 'Paid' | 'Sent' | 'Failed' | 'Refunded' | 'Cancelled';
export type InvoiceDeliveryStatus = 'not_sent' | 'sent' | 'failed' | 'queued';

export type InvoiceAuditEventType =
  | 'created'
  | 'status_changed'
  | 'auto_sent'
  | 'manual_sent'
  | 'manual_resent'
  | 'pdf_downloaded'
  | 'payment_updated'
  | 'reconciled'
  | 'bulk_action';

export interface InvoiceAuditEvent {
  id: string;
  timestamp: string;
  type: InvoiceAuditEventType;
  actor: string;
  title: string;
  details: string;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    recipientEmail?: string;
    amount?: number;
    vatAmount?: number;
    paymentMethod?: string;
    notes?: string;
    channel?: string;
    trigger?: string;
  };
}

export interface InvoiceSendingLog {
  id: string;
  timestamp: string;
  sentTo: string;
  sentBy: string;
  triggerType: 'auto' | 'manual_admin' | 'resend';
  status: 'delivered' | 'simulated' | 'failed';
  emailId?: string;
  notes?: string;
  errorMessage?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_id: string;
  order_number: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  created_at: string;
  due_date?: string;
  paid_at?: string;
  subtotal_amount: number;
  delivery_fee: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  delivery_status: InvoiceDeliveryStatus;
  sent_count: number;
  last_sent_at?: string;
  sending_history: InvoiceSendingLog[];
  audit_logs?: InvoiceAuditEvent[];
  items: OrderItem[];
  shipping_address: ShippingAddress;
  notes?: string;
}

export interface InvoiceMonthlyAnalyticsData {
  month: string;
  shortMonth: string;
  year: number;
  totalInvoiced: number;
  paidTotal: number;
  outstandingBalance: number;
  vatTotal: number;
  invoiceCount: number;
  paidCount: number;
  unpaidCount: number;
  successRate: number; // percentage 0-100
}

export interface InvoiceSettingsConfig {
  autoSendInvoices: boolean;
  sendCustomerCopy?: boolean;
  senderName?: string;
  allowCustomerDownload: boolean;
  invoicePrefix: string;
  vatNumber?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWhatsapp?: string;
  whatsappSupport?: string;
  taxInvoiceTitle: string;
  invoiceFooterNote?: string;
  invoiceSupportNote?: string;
  sendCopyEmail?: string;
  lastUpdated?: string;
}

export interface SettingsData {
  payment_gateways?: PaymentGatewaysMap;
  store_branding?: StoreBrandingConfig;
  banner_config?: PromoBannerConfig;
  coupons_config?: CouponsConfig;
  general_settings?: GeneralStoreSettings;
  invoice_settings?: InvoiceSettingsConfig;
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

export type BannerMediaType = 'image' | 'video' | 'none';
export type BannerBadgeType = 'SALE' | 'NEW' | 'LIMITED OFFER' | 'HOT DEAL' | 'EXCLUSIVE' | 'DISCOUNT' | 'FLASH SALE' | 'CUSTOM' | 'none';
export type BannerTextPosition = 'overlay-bottom' | 'overlay-left' | 'overlay-center' | 'overlay-right' | 'overlay-top' | 'below-card' | 'beside-split';
export type BannerStatusType = 'draft' | 'scheduled' | 'active' | 'expired' | 'disabled';
export type BannerLinkType = 'custom_url' | 'product' | 'category' | 'search';
export type BannerAspectRatio = '1:1' | '16:9' | '4:3' | 'auto';

export interface BannerVideoMetadata {
  duration?: number; // duration in seconds
  durationSeconds?: number; // duration in seconds
  width?: number; // resolution width in px
  height?: number; // resolution height in px
  resolution?: string; // e.g. '1920×1080'
  fps?: number; // frames per second
  fileSize?: number; // file size in bytes
  sizeBytes?: number; // file size in bytes
  format?: string; // e.g. 'video/mp4', 'video/webm'
  bitrateMbps?: number; // calculated bitrate in Mbps
  aspectRatio?: string; // ratio string
}

export interface PromotionalBannerItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  mediaType: BannerMediaType;
  mediaUrl: string;
  mediaPosterUrl?: string;
  mediaAltText?: string;
  aspectRatio?: BannerAspectRatio; // 1:1 square is the default
  
  // Badges & Offers
  showBadge?: boolean;
  badgeType?: BannerBadgeType;
  badgeCustomText?: string;
  badgeColor?: string;
  
  // Pricing & Discounts
  showDiscount?: boolean;
  discountPercentage?: number;
  promotionalPrice?: number;
  originalPrice?: number;
  
  // Countdown Timer
  showCountdown?: boolean;
  countdownEndDate?: string; // ISO date string
  
  // CTA & Action Links
  showCta?: boolean;
  ctaText?: string;
  ctaStyle?: 'solid-accent' | 'solid-dark' | 'solid-white' | 'outline' | 'glass';
  linkType?: BannerLinkType;
  ctaLink?: string;
  targetProductId?: string;
  targetCategory?: ProductCategory | string;
  
  // Readability & Layout
  textPosition?: BannerTextPosition;
  overlayDimming?: number; // 0 to 100
  overlayStyle?: 'gradient' | 'glass' | 'solid' | 'subtle' | 'none';
  backgroundColor?: string;
  textColor?: 'dark' | 'light' | 'auto';
  
  // Video Playback Controls & Dual-Stream Support (Desktop & Mobile)
  desktopVideoUrl?: string;
  mobileVideoUrl?: string;
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  videoPlaysInline?: boolean;
  showVideoControls?: boolean;
  videoControls?: boolean;
  mobileVideoFocalPosition?: 'left' | 'center' | 'right';
  desktopVideoMeta?: BannerVideoMetadata;
  mobileVideoMeta?: BannerVideoMetadata;
  
  // Publishing, Scheduling & Order
  isDraft?: boolean;
  isEnabled?: boolean;
  isFeatured?: boolean;
  displayOrder: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  
  // Analytics
  impressionsCount?: number;
  clicksCount?: number;
  conversionsCount?: number;
  revenueGenerated?: number;
  
  createdAt: string;
  updatedAt?: string;
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
  promotional_banner_enabled?: boolean;
  layout: 'compact' | 'hero' | 'split' | 'video-focus' | 'slides' | 'square-showcase';
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
  
  // Extended Modern Banners System
  banners?: PromotionalBannerItem[];
  aspectRatio?: BannerAspectRatio; // default '1:1'
  carouselAutoplay?: boolean;
  carouselInterval?: number; // in seconds, default 5
  pauseOnHover?: boolean;
  showNavigationArrows?: boolean;
  showIndicators?: boolean;
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
  whatsappSupport?: string;
  supportHeading?: string;
  supportSubtext?: string;
  storeDescription: string;
  enableGoogleAuth?: boolean;
  isGoogleAuthEnabled?: boolean;
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

export type RedemptionType = 'discount_voucher' | 'wallet_credit';

export interface ReferralRewardRedemption {
  id: string;
  userId: string;
  type: RedemptionType;
  amount: number; // In ZAR e.g. 50, 100
  voucherCode?: string; // e.g. KUD-VOUCH-78X2
  voucherExpiry?: string;
  status: 'active' | 'applied' | 'expired' | 'completed';
  createdAt: string;
  note?: string;
}

export interface AdminReferralAdjustment {
  id: string;
  amount: number; // positive (credit) or negative (debit) in ZAR
  reason: string;
  adminEmail?: string;
  createdAt: string;
  previousBalance: number;
  newBalance: number;
}

export interface UserReferralRewardsState {
  userId: string;
  referralBalance: number; // Available unredeemed referral reward balance in ZAR (e.g. 150)
  totalEarned: number; // Lifetime referral earnings in ZAR (e.g. 250)
  walletBalance: number; // In-store digital wallet credit in ZAR (e.g. 100)
  successfulReferralsCount: number;
  pendingReferralsCount: number;
  vouchers: ReferralRewardRedemption[];
  history: ReferralRewardRedemption[];
  isBanned?: boolean; // When true, user cannot earn or share referral links
  banReason?: string; // Reason for ban e.g. "Suspected fraud"
  isEarningsFrozen?: boolean; // When true, user's existing referral earnings/balance are frozen and cannot be redeemed or used
  frozenReason?: string; // Reason why referral earnings were frozen
  frozenAt?: string;
  hideReferralEarnings?: boolean; // Per-customer toggle to hide earnings from their dashboard
  hideInviteOption?: boolean; // Per-customer toggle to hide invite options from their dashboard
  hideReferralWallet?: boolean; // Per-customer toggle to hide Referral Rewards & Wallet completely
  referral_rewards_enabled?: boolean; // Admin per-customer activation flag (defaults to false for new customers)
  referralRewardsEnabled?: boolean;
  adminAdjustments?: AdminReferralAdjustment[];
  lastUpdated?: string;
}

export interface StoreReferralGlobalConfig {
  isProgramEnabled: boolean; // Global master toggle for referral program
  hideReferralEarningsGlobally: boolean; // Hide earnings metrics on all customer dashboards
  hideInviteOptionGlobally: boolean; // Hide Invite Friends buttons/options on customer dashboards
  hideReferralWalletGlobally: boolean; // Hide Referral Rewards & Wallet completely from customer profiles
  rewardPerReferral: number; // Amount referrer gets (in ZAR, default 50)
  invitedFriendDiscount: number; // Amount new referred customer gets (in ZAR, default 50)
  minVoucherRedemptionAmount: number; // Minimum amount to redeem (in ZAR, default 50)
  voucherExpiryDays: number; // Validity days for reward vouchers (default 90)
  allowLeaderboardDisplay: boolean; // Whether community leaderboard is shown on dashboard
  minMonthlyPurchasesRequired: number; // A referred client must purchase at least twice in a month for commission allocation (default: 2)
  requireAdminAllocation: boolean; // Referral commissions must be approved and allocated by admin (default: true)
  commissionAmountPerQualifiedReferral: number; // Commission amount allocated per qualified referral (default: 50)
  lastUpdated?: string;
}

export type ReferralCommissionStatus =
  | 'pending_qualification' // Referred client made < 2 purchases in the active monthly evaluation period
  | 'ready_for_allocation'  // Referred client made >= 2 purchases in a month! Ready for admin to allocate
  | 'allocated'             // Admin allocated the commission to the referrer
  | 'declined';             // Admin declined the commission with a reason

export interface ReferralMonthlyOrderSummary {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  itemsSummary?: string;
}

export interface ReferralCommissionRecord {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referredClientId: string;
  referredClientName: string;
  referredClientEmail: string;
  referralCodeUsed?: string;
  createdAt: string; // Date the referral connection was created
  
  // Monthly Purchases Evaluation
  evaluationMonth: string; // e.g. "2026-08" (August 2026)
  monthlyPurchasesCount: number; // Count of valid orders in this month (must be >= 2 to qualify)
  requiredMonthlyPurchases: number; // default: 2
  monthlyOrders: ReferralMonthlyOrderSummary[]; // Orders placed by the referred client in this evaluation month
  
  // Commission & Allocation State
  commissionAmount: number; // In ZAR e.g. 50
  status: ReferralCommissionStatus;
  isQualified: boolean; // monthlyPurchasesCount >= requiredMonthlyPurchases
  
  allocatedAt?: string;
  allocatedByAdmin?: string;
  adminNotes?: string;
  declineReason?: string;
}

export interface ReferralCustomerSettings {
  userId: string;
  isBannedFromReferrals: boolean;
  banReason?: string;
  isEarningsFrozen?: boolean;
  frozenReason?: string;
  hideReferralEarnings: boolean;
  hideInviteOption: boolean;
  customNotes?: string;
  updatedAt?: string;
}

export type LoyaltyTierLevel = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface LoyaltyTierInfo {
  level: LoyaltyTierLevel;
  minReferrals: number;
  maxReferrals: number | null;
  rewardPerReferral: number;
  multiplier: string;
  accentColor: string;
  perks: string[];
  description: string;
}

export type LeaderboardTimeframe = 'all_time' | 'this_month' | 'this_week';

export interface ReferralLeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  referralsCount: number;
  totalEarned: number;
  tier: LoyaltyTierLevel;
  badge?: string;
  isCurrentUser?: boolean;
  change?: 'up' | 'down' | 'same' | 'new';
  changeAmount?: number;
  city?: string;
  monthlyPrize?: string;
}

// ---------------------------------------------------------------------------
// Social Commerce & Marketing Analytics Types
// ---------------------------------------------------------------------------

export type MarketingPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'whatsapp'
  | 'google'
  | 'direct'
  | 'other';

export type MarketingEventType =
  | 'view_product'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'purchase';

export interface MarketingAttribution {
  platform: MarketingPlatform;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  sessionId: string;
  referrer?: string;
  landingUrl?: string;
  firstTouchAt: string;
  lastTouchAt: string;
}

export interface MarketingEventRecord {
  id: string;
  session_id: string;
  event_type: MarketingEventType;
  platform: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  product_id?: string;
  product_name?: string;
  order_id?: string;
  order_number?: string;
  amount?: number;
  currency?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MarketingPixelSettings {
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  meta_conversions_api_token?: string;
  meta_test_event_code?: string;
  tiktok_events_api_token?: string;
  enabled: boolean;
  test_mode?: boolean;
  lastUpdated?: string;
}

export interface MarketingPlatformMetric {
  platform: string;
  displayName: string;
  visitors: number;
  addToCarts: number;
  checkouts: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  topCampaign?: string;
}

export interface MarketingCampaignPerformance {
  campaign: string;
  platform: string;
  medium?: string;
  visitors: number;
  addToCarts: number;
  checkouts: number;
  orders: number;
  revenue: number;
  conversionRate: number;
}

export interface MarketingProductPerformance {
  productId: string;
  productName: string;
  productBrand?: string;
  productImage?: string;
  views: number;
  addToCarts: number;
  orders: number;
  revenue: number;
  conversionRate: number;
}

export interface MarketingAnalyticsSummary {
  visitors: number;
  orders: number;
  conversionRate: number;
  revenue: number;
  platformBreakdown: Record<string, MarketingPlatformMetric>;
  topCampaigns: MarketingCampaignPerformance[];
  topProducts: MarketingProductPerformance[];
  funnel: {
    views: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
  };
  dailyTrend: Array<{
    date: string;
    visitors: number;
    orders: number;
    revenue: number;
    instagramRevenue: number;
    facebookRevenue: number;
    tiktokRevenue: number;
  }>;
}




