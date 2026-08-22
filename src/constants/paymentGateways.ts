import { PaymentGatewaysMap, PaymentGatewayItem, PaymentGatewayMode } from '../types';

export interface GatewayMetadata {
  id: string;
  name: string;
  description: string;
  category: 'card' | 'eft' | 'wallet' | 'all-in-one';
  badge: string;
  brandColor: string;
  bgLight: string;
  accentBorder: string;
  supportedModes: Array<{ label: string; value: PaymentGatewayMode }>;
  defaultMode: PaymentGatewayMode;
  websiteUrl: string;
  docUrl: string;
  publicIdentifierLabel: string;
  publicIdentifierPlaceholder: string;
  publicIdentifierKey: 'publicKey' | 'clientId' | 'merchantId' | 'siteCode' | 'entityId';
  secretKeyEnvName: string;
  guideNotes: string;
  features: string[];
}

/**
 * Default Payment Gateways Data Structure as stored in public.settings.settings_data.payment_gateways
 */
export const DEFAULT_PAYMENT_GATEWAYS: PaymentGatewaysMap = {
  yoco: {
    id: 'yoco',
    name: 'Yoco',
    description: 'South African card and online payment gateway',
    enabled: false,
    mode: 'test',
    configured: false,
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal online payments',
    enabled: false,
    mode: 'sandbox',
    configured: false,
  },
  payfast: {
    id: 'payfast',
    name: 'PayFast',
    description: 'South African online payment gateway',
    enabled: false,
    mode: 'sandbox',
    configured: false,
  },
  ozow: {
    id: 'ozow',
    name: 'Ozow',
    description: 'Instant EFT payments from South African banks',
    enabled: false,
    mode: 'sandbox',
    configured: false,
  },
  peach_payments: {
    id: 'peach_payments',
    name: 'Peach Payments',
    description: 'Online payment processing',
    enabled: false,
    mode: 'test',
    configured: false,
  },
};

/**
 * Registry of Supported Payment Gateways for the Admin Dashboard UI.
 * To add a new gateway in the future, simply add its configuration here.
 * No PostgreSQL table structure changes are required!
 */
export const SUPPORTED_PAYMENT_GATEWAYS: GatewayMetadata[] = [
  {
    id: 'yoco',
    name: 'Yoco',
    description: 'South African card and online payment gateway',
    category: 'card',
    badge: 'Card & 3D Secure',
    brandColor: '#0052FF',
    bgLight: 'bg-blue-50/60',
    accentBorder: 'border-blue-200',
    supportedModes: [
      { label: 'Test Mode', value: 'test' },
      { label: 'Live Mode', value: 'live' },
    ],
    defaultMode: 'test',
    websiteUrl: 'https://www.yoco.com',
    docUrl: 'https://developer.yoco.com',
    publicIdentifierLabel: 'Yoco Public Key',
    publicIdentifierPlaceholder: 'pk_test_... or pk_live_...',
    publicIdentifierKey: 'publicKey',
    secretKeyEnvName: 'YOCO_SECRET_KEY',
    guideNotes:
      'Live credit & debit card processing in South Africa. Set YOCO_SECRET_KEY in your Supabase Edge Function Secrets or server environment.',
    features: ['Visa & Mastercard', '3D Secure 2.0 Auth', 'Instant ZAR Settlement', 'Web SDK Integration'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal online payments',
    category: 'wallet',
    badge: 'Global Wallet & Cards',
    brandColor: '#003087',
    bgLight: 'bg-indigo-50/60',
    accentBorder: 'border-indigo-200',
    supportedModes: [
      { label: 'Sandbox Mode', value: 'sandbox' },
      { label: 'Live Mode', value: 'live' },
    ],
    defaultMode: 'sandbox',
    websiteUrl: 'https://www.paypal.com',
    docUrl: 'https://developer.paypal.com',
    publicIdentifierLabel: 'PayPal Client ID',
    publicIdentifierPlaceholder: 'e.g. AY... (REST App Client ID)',
    publicIdentifierKey: 'clientId',
    secretKeyEnvName: 'PAYPAL_CLIENT_SECRET',
    guideNotes:
      'International checkout supporting USD, EUR, GBP, and multi-currency wallets. Configure PAYPAL_CLIENT_SECRET in Supabase Edge Functions.',
    features: ['PayPal Balance & Cards', 'International Buyers', 'Buyer Protection', 'Smart Payment Buttons'],
  },
  {
    id: 'payfast',
    name: 'PayFast',
    description: 'South African online payment gateway',
    category: 'all-in-one',
    badge: 'EFT, Cards & Mobicred',
    brandColor: '#D32F2F',
    bgLight: 'bg-red-50/60',
    accentBorder: 'border-red-200',
    supportedModes: [
      { label: 'Sandbox Mode', value: 'sandbox' },
      { label: 'Live Mode', value: 'live' },
    ],
    defaultMode: 'sandbox',
    websiteUrl: 'https://www.payfast.co.za',
    docUrl: 'https://developers.payfast.co.za',
    publicIdentifierLabel: 'PayFast Merchant ID',
    publicIdentifierPlaceholder: 'e.g. 10000100 (Merchant ID)',
    publicIdentifierKey: 'merchantId',
    secretKeyEnvName: 'PAYFAST_PASSPHRASE & PAYFAST_MERCHANT_KEY',
    guideNotes:
      'PayFast Passphrase and Merchant Key must be stored safely in Supabase Edge Functions environment secrets.',
    features: ['Instant EFT (Capitec, FNB, etc.)', 'Masterpass & Debit Cards', 'Store Value & Subscriptions'],
  },
  {
    id: 'ozow',
    name: 'Ozow',
    description: 'Instant EFT payments from South African banks',
    category: 'eft',
    badge: 'Automated Bank EFT',
    brandColor: '#00A859',
    bgLight: 'bg-emerald-50/60',
    accentBorder: 'border-emerald-200',
    supportedModes: [
      { label: 'Sandbox Mode', value: 'sandbox' },
      { label: 'Live Mode', value: 'live' },
    ],
    defaultMode: 'sandbox',
    websiteUrl: 'https://ozow.com',
    docUrl: 'https://developer.ozow.com',
    publicIdentifierLabel: 'Ozow Site Code',
    publicIdentifierPlaceholder: 'e.g. KUD-SA-01',
    publicIdentifierKey: 'siteCode',
    secretKeyEnvName: 'OZOW_PRIVATE_KEY',
    guideNotes:
      'Instant bank EFT across all major South African banks. Store OZOW_PRIVATE_KEY in Supabase Edge Functions.',
    features: ['Zero Chargebacks', 'Instant Notification (Instant EFT)', 'No Card Required', 'South African Banks'],
  },
  {
    id: 'peach_payments',
    name: 'Peach Payments',
    description: 'Online payment processing',
    category: 'all-in-one',
    badge: 'Enterprise Gateway',
    brandColor: '#F25C05',
    bgLight: 'bg-orange-50/60',
    accentBorder: 'border-orange-200',
    supportedModes: [
      { label: 'Test Mode', value: 'test' },
      { label: 'Live Mode', value: 'live' },
    ],
    defaultMode: 'test',
    websiteUrl: 'https://www.peachpayments.com',
    docUrl: 'https://developer.peachpayments.com',
    publicIdentifierLabel: 'Peach Payments Entity ID',
    publicIdentifierPlaceholder: 'e.g. 8a8294174b7e... (Entity ID)',
    publicIdentifierKey: 'entityId',
    secretKeyEnvName: 'PEACH_PAYMENTS_SECRET_KEY',
    guideNotes:
      'Enterprise payment orchestration for high volume merchants. Store PEACH_PAYMENTS_SECRET_KEY / Access Token in Supabase Edge Functions.',
    features: ['Checkout Hosted & Embedded', 'Multi-currency Support', 'Robust Fraud Engine', 'Tokenization'],
  },
];
